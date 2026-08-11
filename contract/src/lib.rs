// =============================================================================
// BIDECEL anchor contract  —  the ON-CHAIN half of the project.
//
// WHAT THIS IS (plain language):
//   A tiny program that lives on the NEAR blockchain. Its ONLY job is to act as
//   a public, tamper-proof notary for certificate "fingerprints" (hashes).
//
//   It stores a table:   certificate_id  ->  fingerprint
//   and offers three actions:
//     * anchor(cert_id, hash)  — save a fingerprint (a "change" call, costs gas, must be signed)
//     * verify(cert_id, hash)  — check a fingerprint matches what we stored (a free "view" call)
//     * get_hash(cert_id)      — read back the stored fingerprint, if any (free "view" call)
//
// THE GOLDEN RULE (from our locked privacy design):
//   NOTHING private ever goes in here. No names, no dates, no national IDs.
//   Only the meaningless-looking fingerprint string, e.g. "0x9f3a4c...".
//   Blockchain state is world-readable, so PII on-chain would be a permanent leak.
// =============================================================================

use near_sdk::store::LookupMap;   // an on-chain key->value dictionary
use near_sdk::{env, log, near, AccountId, PanicOnDefault};

// `#[near(contract_state)]` marks this struct as THE contract's saved state.
// Whatever fields live here are what physically persists on the blockchain.
// `PanicOnDefault` means: refuse to run until the contract has been initialized
// via `new()` — this prevents an un-set-up contract from being used by accident.
#[near(contract_state)]
#[derive(PanicOnDefault)]
pub struct Contract {
    // Who is allowed to anchor new fingerprints. Set once at init.
    // (In a real registry only trusted government accounts should anchor.)
    owner: AccountId,

    // The core table: certificate id (String) -> fingerprint (String).
    // LookupMap is NEAR's storage-backed map: it lives on-chain, not in RAM.
    anchors: LookupMap<String, String>,
}

// `#[near]` on the impl block exposes these methods as callable contract functions.
#[near]
impl Contract {
    // ---- INITIALIZER --------------------------------------------------------
    // `#[init]` runs exactly once, right after the contract is first deployed.
    // It sets the owner and creates the (empty) anchors table.
    // The "b\"a\"" is a short storage-prefix key that NEAR uses internally to
    // namespace this map's data; it just has to be unique within the contract.
    #[init]
    pub fn new(owner: AccountId) -> Self {
        Self {
            owner,
            anchors: LookupMap::new(b"a"),
        }
    }

    // ---- ANCHOR (write) -----------------------------------------------------
    // Save a certificate's fingerprint on-chain. This is a "change" method:
    // it mutates state (&mut self), so calling it costs a tiny fee ("gas") and
    // must be signed by a wallet.
    //
    // We reject:
    //   * callers who are not the owner (only the registry may anchor),
    //   * attempts to overwrite an existing anchor (certificates are immutable
    //     once notarized — re-anchoring would defeat the tamper-proof purpose).
    pub fn anchor(&mut self, cert_id: String, hash: String) {
        // env::predecessor_account_id() = the account that called this method.
        assert_eq!(
            env::predecessor_account_id(),
            self.owner,
            "Only the contract owner may anchor certificates"
        );
        assert!(!cert_id.is_empty(), "cert_id must not be empty");
        assert!(!hash.is_empty(), "hash must not be empty");
        assert!(
            !self.anchors.contains_key(&cert_id),
            "This cert_id is already anchored and cannot be changed"
        );

        self.anchors.insert(cert_id.clone(), hash);
        // log! writes a message into the blockchain transaction result — handy
        // for debugging and for apps that watch the chain for events.
        log!("Anchored certificate {}", cert_id);
    }

    // ---- VERIFY (read) ------------------------------------------------------
    // Does the fingerprint we stored for `cert_id` equal the one supplied?
    // This is a "view" method (&self, no mutation): it is FREE and needs no wallet.
    //
    // Returns true only if a fingerprint is stored AND it matches exactly.
    // This is how the app proves a certificate hasn't been tampered with:
    // recompute its fingerprint off-chain, then ask the chain "does this match?".
    pub fn verify(&self, cert_id: String, hash: String) -> bool {
        match self.anchors.get(&cert_id) {
            Some(stored) => stored == &hash,
            None => false,
        }
    }

    // ---- GET_HASH (read) ----------------------------------------------------
    // Return the stored fingerprint for a cert_id, or None if nothing anchored.
    // Also a free view method. Safe to expose: a fingerprint reveals no PII.
    pub fn get_hash(&self, cert_id: String) -> Option<String> {
        self.anchors.get(&cert_id).cloned()
    }

    // ---- OWNER (read) -------------------------------------------------------
    // Convenience view so tools/UI can see who controls this contract.
    pub fn get_owner(&self) -> &AccountId {
        &self.owner
    }

    // ---- VERIFY_PROOF (read) ------------------------------------------------
    // Verify a Groth16 zero-knowledge proof ON-CHAIN for our `cert_commitment`
    // circuit, using NEAR's native alt_bn128 (BN254) host functions.
    //
    // WHY THIS EXISTS (plain language):
    //   The anchor methods above prove "this exact fingerprint was notarized".
    //   This method proves something stronger and private: "the caller knows a
    //   valid witness for our circuit (e.g. that a committed certificate is
    //   well-formed / belongs to a claimed public value) WITHOUT revealing the
    //   private inputs". The chain re-checks the math itself, so nobody has to
    //   trust an off-chain verifier.
    //
    // INPUTS (all produced off-chain by snarkjs, then RE-ENCODED to NEAR's
    // little-endian byte layout — see the encoding notes on the constants below):
    //   * neg_a  — hex string of the NEGATED proof point A, as a 64-byte G1.
    //              (We pre-negate A off-chain because the Groth16 check needs
    //               e(-A, B); negating on-chain would waste gas.)
    //   * b      — hex string of proof point B, as a 128-byte G2.
    //   * c      — hex string of proof point C, as a 64-byte G1.
    //   * public_signals — the circuit's public inputs, each a DECIMAL string
    //              (base-10 big integer). Our circuit has nPublic = 1 today, but
    //              this code handles any N as long as N == IC.len() - 1.
    //
    // RETURNS true iff the proof satisfies the Groth16 pairing equation:
    //   e(-A, B) · e(alpha, beta) · e(vk_x, gamma) · e(C, delta) == 1
    // where vk_x = IC[0] + Σ_i ( public_signal_i · IC[i+1] ), computed on-chain.
    //
    // NOTE ON TESTABILITY: the alt_bn128 host functions only exist inside a real
    // NEAR runtime. In the plain `cargo test` sandbox they are unavailable, so we
    // do NOT unit-test the pairing here (the helper parsers ARE unit-tested).
    pub fn verify_proof(
        &self,
        neg_a: String,
        b: String,
        c: String,
        public_signals: Vec<String>,
    ) -> bool {
        // --- 1. Decode the three proof points from hex into raw LE bytes. ------
        // hex_point enforces the exact fixed size (panics on a malformed proof).
        let neg_a = hex_point(&neg_a, G1_SIZE); // 64-byte G1
        let b = hex_point(&b, G2_SIZE); //         128-byte G2
        let c = hex_point(&c, G1_SIZE); //          64-byte G1

        // The number of public signals must match the verification key: there is
        // exactly one IC entry per public signal, plus IC[0] (the constant term).
        assert_eq!(
            public_signals.len(),
            IC.len() - 1,
            "wrong number of public signals for this circuit"
        );

        // --- 2. Compute vk_x on-chain. ---------------------------------------
        // vk_x = IC[0] + Σ_i ( signal_i · IC[i+1] )
        //
        // We do the variable part (the Σ) with alt_bn128_g1_multiexp: it takes a
        // packed list of (G1 point, Fr scalar) pairs and returns their weighted
        // sum as a single G1 point. Then we add the constant IC[0] with
        // alt_bn128_g1_sum. Doing the sum on-chain from BAKED-IN IC constants —
        // rather than trusting a caller-supplied vk_x — is the whole point of
        // on-chain verification: the caller cannot smuggle in a forged vk_x.
        //
        // multiexp element layout (per element, 96 bytes):
        //     G1 point (64 bytes LE)  ‖  Fr scalar (32 bytes LE)
        let vk_x = if public_signals.is_empty() {
            // Degenerate case: no public inputs => vk_x is just IC[0].
            g1_const_bytes(&IC[0])
        } else {
            let mut multiexp_input: Vec<u8> = Vec::with_capacity(public_signals.len() * 96);
            for (i, signal) in public_signals.iter().enumerate() {
                // IC[i + 1] is the point that multiplies the i-th public signal.
                multiexp_input.extend_from_slice(&g1_const_bytes(&IC[i + 1]));
                // Parse the decimal public signal into a 32-byte LE scalar (shared crate).
                let scalar = zk_encoding::decimal_to_le32(signal)
                    .expect("public signal: invalid decimal");
                multiexp_input.extend_from_slice(&scalar);
            }
            // Σ_i ( signal_i · IC[i+1] )  ->  a single 64-byte G1 point.
            let variable_part = env::alt_bn128_g1_multiexp(&multiexp_input);
            debug_assert_eq!(variable_part.len(), G1_SIZE);

            // Now add the constant term IC[0] with alt_bn128_g1_sum.
            //
            // g1_sum element layout (per element, 65 bytes):
            //     sign byte (1 byte: 0 = add, 1 = subtract)  ‖  G1 point (64 bytes LE)
            // We verified this 1-byte-sign layout against the near-sdk 5.x source
            // (`(is_negative: bool, G1)`; the crate's own test buffer is 65 bytes).
            // Both terms use sign 0 (plain addition).
            let mut sum_input: Vec<u8> = Vec::with_capacity(2 * 65);
            sum_input.push(0u8); // add IC[0]
            sum_input.extend_from_slice(&g1_const_bytes(&IC[0]));
            sum_input.push(0u8); // add the variable part
            sum_input.extend_from_slice(&variable_part);
            env::alt_bn128_g1_sum(&sum_input)
        };
        debug_assert_eq!(vk_x.len(), G1_SIZE);

        // --- 3. Assemble the 4-pair pairing buffer. --------------------------
        // pairing_check takes a packed list of (G1, G2) pairs, each 192 bytes
        // (64-byte G1 ‖ 128-byte G2), and returns true iff the product of the
        // pairings equals 1. The four pairs are exactly the Groth16 equation:
        //     (-A,  B)          <- proof
        //     (alpha, beta)     <- verification key
        //     (vk_x, gamma)     <- verification key + public inputs
        //     (C,   delta)      <- proof + verification key
        let mut pairing_input: Vec<u8> = Vec::with_capacity(4 * (G1_SIZE + G2_SIZE));

        // pair 1: (-A, B)
        pairing_input.extend_from_slice(&neg_a);
        pairing_input.extend_from_slice(&b);
        // pair 2: (alpha_g1, beta_g2)
        pairing_input.extend_from_slice(&g1_const_bytes(&VK_ALPHA_1));
        pairing_input.extend_from_slice(&g2_const_bytes(&VK_BETA_2));
        // pair 3: (vk_x, gamma_g2)
        pairing_input.extend_from_slice(&vk_x);
        pairing_input.extend_from_slice(&g2_const_bytes(&VK_GAMMA_2));
        // pair 4: (C, delta_g2)
        pairing_input.extend_from_slice(&c);
        pairing_input.extend_from_slice(&g2_const_bytes(&VK_DELTA_2));

        // --- 4. Native pairing check. true iff the proof is valid. -----------
        env::alt_bn128_pairing_check(&pairing_input)
    }
}

// =============================================================================
// GROTH16 VERIFIER SUPPORT — constants + pure helpers (no blockchain state).
//
// This section is intentionally self-contained and heavily commented because
// the byte encodings are easy to get subtly wrong.
//
// BN254 / alt_bn128 field sizes, in NEAR's fixed-size LITTLE-ENDIAN layout:
//   * A field element (Fq coordinate, or an Fr scalar) = 32 bytes, little-endian.
//   * A G1 point       = x(32) ‖ y(32)                 = 64 bytes.
//   * A G2 point       = x.c0(32) ‖ x.c1(32) ‖ y.c0(32) ‖ y.c1(32) = 128 bytes,
//                        i.e. c0 BEFORE c1 for each Fq2 coordinate.
//
// snarkjs' verification_key.json gives coordinates as DECIMAL strings in the
// "natural" big-integer form. We store them here as decimal strings too (more
// auditable than opaque byte arrays — you can diff them against the JSON), and
// convert them to little-endian bytes at runtime with `decimal_to_le32`.
//
// IMPORTANT — G2 coordinate order: snarkjs prints each Fq2 as [c0, c1] already
// (its arrays are [[x_c0, x_c1], [y_c0, y_c1], [1, 0]]), which matches NEAR's
// c0-before-c1 layout, so no reordering is needed for the VK constants below.
// (Proof G2 point `b` supplied by the caller must already be re-encoded to this
// same LE / c0-before-c1 layout off-chain.)
// =============================================================================
// (env is already imported at the top of the file: `use near_sdk::{env, ...}`.)

// Byte sizes + the encoding primitives (decimal_to_le32, g1_to_le, g2_to_le, hex_to_bytes)
// come from the SHARED `zk-encoding` crate — the single source of truth. The contract does
// NOT re-define them; that duplication was the original footgun.
use zk_encoding::{G1_SIZE, G2_SIZE};

// --- Verification key, copied VERBATIM from ------------------------------
// circuits/build/verification_key.json (protocol groth16, curve bn128,
// nPublic = 1). Each coordinate is the decimal string exactly as it appears
// in that file. The trailing projective "1" (and "0") rows are dropped: these
// are affine points, so only x and y (each Fq2 = [c0, c1] for G2) are stored.

/// vk_alpha_1 — a G1 point: [x, y].
const VK_ALPHA_1: [&str; 2] = [
    "20491192805390485299153009773594534940189261866228447918068658471970481763042",
    "9383485363053290200918347156157836566562967994039712273449902621266178545958",
];

/// vk_beta_2 — a G2 point: [x.c0, x.c1, y.c0, y.c1].
const VK_BETA_2: [&str; 4] = [
    "6375614351688725206403948262868962793625744043794305715222011528459656738731",
    "4252822878758300859123897981450591353533073413197771768651442665752259397132",
    "10505242626370262277552901082094356697409835680220590971873171140371331206856",
    "21847035105528745403288232691147584728191162732299865338377159692350059136679",
];

/// vk_gamma_2 — a G2 point: [x.c0, x.c1, y.c0, y.c1].
const VK_GAMMA_2: [&str; 4] = [
    "10857046999023057135944570762232829481370756359578518086990519993285655852781",
    "11559732032986387107991004021392285783925812861821192530917403151452391805634",
    "8495653923123431417604973247489272438418190587263600148770280649306958101930",
    "4082367875863433681332203403145435568316851327593401208105741076214120093531",
];

/// vk_delta_2 — a G2 point: [x.c0, x.c1, y.c0, y.c1].
const VK_DELTA_2: [&str; 4] = [
    "11253541580789046276872253437244655743949005416667486125574942275487041055673",
    "11120625850793757037070186707082968564903570891303437591534992530783465231680",
    "18616795851336081904006245004426581058527553485584328470718248281132939277142",
    "3898727655646116110486312833413625974997531378321290337287812698304914307292",
];

/// IC — one G1 point per (public signal + 1). IC[0] is the constant term; IC[1]
/// multiplies the single public signal. Each entry is [x, y].
const IC: [[&str; 2]; 2] = [
    [
        "9532815111231312886615808631508304054332792894998605183015422727057364333430",
        "9046947770936776504909363441578977042301530006009505005141616335964203827268",
    ],
    [
        "21149786954743675304486206776677052623498375223358062519634949725957179102053",
        "10402361093671524570388915138242044166548442557572202909393662870025380082075",
    ],
];

/// Turn a G1 constant ([x, y] decimal strings) into its 64-byte LE encoding,
/// using the shared crate so the layout matches the off-chain re-encoder exactly.
fn g1_const_bytes(point: &[&str; 2]) -> Vec<u8> {
    zk_encoding::g1_to_le(point[0], point[1])
        .expect("VK G1 coord: invalid decimal")
        .to_vec()
}

/// Turn a G2 constant ([x.c0, x.c1, y.c0, y.c1] decimal strings) into its
/// 128-byte LE encoding (c0-before-c1). Shared-crate backed.
fn g2_const_bytes(point: &[&str; 4]) -> Vec<u8> {
    zk_encoding::g2_to_le(point[0], point[1], point[2], point[3])
        .expect("VK G2 coord: invalid decimal")
        .to_vec()
}

/// Decode a fixed-size hex point (no 0x prefix) into an owned Vec of exactly `n` bytes.
/// Thin wrapper over the shared crate's `hex_to_bytes`, panicking on malformed input.
fn hex_point(s: &str, n: usize) -> Vec<u8> {
    let s = s.strip_prefix("0x").or_else(|| s.strip_prefix("0X")).unwrap_or(s);
    let mut buf = vec![0u8; n];
    let written = zk_encoding::hex_to_bytes(s, &mut buf).expect("proof point: invalid hex");
    assert_eq!(written, n, "proof point: wrong byte length");
    buf
}

// =============================================================================
// UNIT TESTS — run locally with `cargo test`. These use a FAKE blockchain
// (the near-sdk test utilities), so nothing here touches the real network.
// =============================================================================
#[cfg(test)]
mod tests {
    use super::*;
    use near_sdk::test_utils::VMContextBuilder;
    use near_sdk::testing_env;

    // Helper: build a fake call context where `predecessor` is the caller account.
    fn context(predecessor: &str) -> VMContextBuilder {
        let mut b = VMContextBuilder::new();
        b.predecessor_account_id(predecessor.parse().unwrap());
        b
    }

    fn owner() -> AccountId {
        "registry.testnet".parse().unwrap()
    }

    #[test]
    fn anchor_then_verify_true() {
        testing_env!(context("registry.testnet").build());
        let mut c = Contract::new(owner());
        c.anchor("cert-1".to_string(), "0xabc123".to_string());

        assert!(c.verify("cert-1".to_string(), "0xabc123".to_string()));
        assert_eq!(c.get_hash("cert-1".to_string()), Some("0xabc123".to_string()));
    }

    #[test]
    fn verify_wrong_hash_is_false() {
        testing_env!(context("registry.testnet").build());
        let mut c = Contract::new(owner());
        c.anchor("cert-1".to_string(), "0xabc123".to_string());

        // A tampered certificate would produce a different fingerprint -> false.
        assert!(!c.verify("cert-1".to_string(), "0xDIFFERENT".to_string()));
    }

    #[test]
    fn verify_unknown_cert_is_false() {
        testing_env!(context("registry.testnet").build());
        let c = Contract::new(owner());
        assert!(!c.verify("never-anchored".to_string(), "0xabc123".to_string()));
        assert_eq!(c.get_hash("never-anchored".to_string()), None);
    }

    #[test]
    #[should_panic(expected = "already anchored")]
    fn cannot_overwrite_existing_anchor() {
        testing_env!(context("registry.testnet").build());
        let mut c = Contract::new(owner());
        c.anchor("cert-1".to_string(), "0xabc123".to_string());
        // Second anchor of the same id must panic (immutability).
        c.anchor("cert-1".to_string(), "0xnewvalue".to_string());
    }

    #[test]
    #[should_panic(expected = "Only the contract owner")]
    fn non_owner_cannot_anchor() {
        // Called by a stranger, not the owner -> must panic.
        testing_env!(context("attacker.testnet").build());
        let mut c = Contract::new(owner());
        c.anchor("cert-1".to_string(), "0xabc123".to_string());
    }

    // ------------------------------------------------------------------------
    // GROTH16 HELPER TESTS
    //
    // These exercise the pure byte-plumbing helpers (decimal->LE32, hex decode,
    // length checks). They do NOT call the alt_bn128 host functions, which only
    // exist inside a real NEAR runtime — so the full pairing cannot run here and
    // is deliberately not tested in this sandbox. (Run the end-to-end proof check
    // against testnet/a real runtime instead.)
    // ------------------------------------------------------------------------

    // NOTE: the low-level encoding primitives (decimal_to_le32, hex_to_bytes, negate,
    // point layout) are now defined and unit-tested in the shared `zk-encoding` crate,
    // so their tests live there (crates/zk-encoding/src/lib.rs). Here we only test the
    // contract's own thin wrappers + baked-in verification-key constants.

    #[test]
    fn vk_constants_encode_to_correct_sizes() {
        // Every baked-in verification-key constant must encode to its fixed size.
        assert_eq!(g1_const_bytes(&VK_ALPHA_1).len(), G1_SIZE);
        assert_eq!(g2_const_bytes(&VK_BETA_2).len(), G2_SIZE);
        assert_eq!(g2_const_bytes(&VK_GAMMA_2).len(), G2_SIZE);
        assert_eq!(g2_const_bytes(&VK_DELTA_2).len(), G2_SIZE);
        for ic in IC.iter() {
            assert_eq!(g1_const_bytes(ic).len(), G1_SIZE);
        }
        // Our circuit is nPublic = 1, so IC has exactly 2 entries.
        assert_eq!(IC.len(), 2);
    }
}
