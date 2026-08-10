// =============================================================================
// DEDECEL anchor contract  —  the ON-CHAIN half of the project.
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
}
