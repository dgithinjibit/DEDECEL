# Groth16-on-NEAR Verification for the Certificate Registry — Research Findings (2026)

> **Deep-research report.** Reconstructed from a terminated workflow (`wf_694a50fa`): the final
> synthesis agent hit a tool-call truncation loop and never emitted, so this was rebuilt directly
> from the verified journal — 22 claims that survived 3-vote adversarial verification, 3 explicitly
> refuted claims, plus extraction claims graded by source quality. Same salvage pattern as the two
> earlier reports in this folder. Confidence noted per finding.

These resolve the three open questions left by [zk-verification-near-2026.md](zk-verification-near-2026.md).

## Executive summary

- **Q1 (API surface): fully answered, HIGH.** In near-sdk 5.x (verified vs 5.29.0, published
  2026-07-13) the three host functions live in `near_sdk::env`:
  `alt_bn128_pairing_check(value: impl AsRef<[u8]>) -> bool`,
  `alt_bn128_g1_multiexp(value: impl AsRef<[u8]>) -> Vec<u8>`,
  `alt_bn128_g1_sum(value: impl AsRef<[u8]>) -> Vec<u8>`.
  Byte encoding is **fixed-size little-endian** integers (32-byte scalars, 64-byte points) —
  **NOT** Ethereum EIP-197 big-endian, and **NOT** Borsh in the shipped runtime.
- **Q2 (gas): answered by derivation, not a measured benchmark.** Verified per-function parameters
  (nearcore #6720, matching live `parameters.snap`) → a small proof is **~30–40 Tgas of
  host-function cost, comfortably within the 300 Tgas limit** (raised 200→300 in protocol v52).
  No directly-measured NEAR testnet end-to-end benchmark was found.
- **Q3 (architecture): tradeoffs answered; GDPR direction HIGH.** Regulators (EDPB 2025/2026, CNIL
  2018) converge: **keep personal data off-chain, anchor only a hash/attestation.** For the ZK
  verification step itself, on-chain per-proof = trustless/auditable/composable; off-chain
  verify + anchor-a-boolean = cheaper/batchable but reintroduces backend trust & liveness risk.

## Q1 — near-sdk 5.x alt_bn128 API surface (HIGH, 3-0)

Module path: **`near_sdk::env`** (re-exported from `environment::env`).

```rust
pub fn alt_bn128_pairing_check(value: impl AsRef<[u8]>) -> bool
pub fn alt_bn128_g1_multiexp(value: impl AsRef<[u8]>) -> Vec<u8>
pub fn alt_bn128_g1_sum(value: impl AsRef<[u8]>) -> Vec<u8>
```

- `pairing_check` body: `unsafe { sys::alt_bn128_pairing_check(value.len() as _, value.as_ptr() as _) == 1 }`.
- The other two write into `ATOMIC_OP_REGISTER` and return `Vec<u8>`.
- Raw `sys` FFI form (used by the reference crate): `use near_sdk::sys::{alt_bn128_g1_multiexp, alt_bn128_g1_sum, alt_bn128_pairing_check};`.

Logical operation signatures (nearcore PR #2842):
- `pairing_check: &[(G1, G2)] -> bool`
- `g1_multiexp: &[(G1, Fr)] -> G1`
- `g1_sum: &[(is_negative: bool, G1)] -> G1` (bool ⇒ subtract)

**Input byte encoding:** fixed-size **little-endian** integers; `SCALAR_SIZE = 32`, `POINT_SIZE = 64`;
element count derived from input length (`u128::from_le_bytes`, `split_elements`/`as_chunks_exact`).
Source: `nearcore/runtime/near-vm-runner/src/logic/alt_bn128.rs`.

> **Porting note:** snarkjs/circom proof bytes are EIP-197-style big-endian and must be
> **re-encoded to little-endian** (with G2 Fq2 coordinate reordering) before feeding NEAR —
> analogous to the groth16-solana conversion step.

## Q2 — Gas cost of one small Groth16 proof

Per-function parameters (HIGH, 3-0 — nearcore #6720, cross-checked vs live `parameters.snap`):

| Host function | Base | Per-element |
|---|---|---|
| `alt_bn128_pairing_check` | ~9.69 Tgas (9685.5 Ggas) | ~5.1 Tgas / 192-byte element |
| `alt_bn128_g1_multiexp` | ~0.71 Tgas (713 Ggas) | ~320 Ggas / 96-byte element |
| `alt_bn128_g1_sum` | ~0.003 Tgas (3.18 Ggas) | ~4.95 Ggas / 65-byte element |

Charging = base once per call + per element. Live config corroborates:
`wasm_alt_bn128_pairing_check_base = 9_686_000_000_000`, `_element = 5_102_000_000_000`.

**Aggregate estimate (MEDIUM — single agent's derivation, not vote-verified):** ~**30–40 Tgas**
host-function cost for a small proof. A standard Groth16 verify = one 4-term pairing_check
(~9.69 + 4×5.1 ≈ 30 Tgas) + a few g1_multiexp/g1_sum ops for public-input accumulation. Excludes
generic Wasm/contract execution overhead (not quantified in the run).

**Fit within 300 Tgas (HIGH, 3-0):** yes, comfortably. `max_gas_burnt` raised 200→300 Tgas in
protocol v52, equal to the 300 Tgas prepaid ceiling.

> **Partial-answer caveat:** no directly-measured NEAR testnet end-to-end benchmark was found. The
> `near_groth16_verifier` repo ships no gas numbers. Cross-chain reference only (not NEAR-measured):
> EVM ~200k gas for 3 public inputs; Solana 78k–109k CU for 1–8 inputs.

Reference impl (HIGH, 3-0): **`near_groth16_verifier`** v1.0.1 (repo hideyour-cash/monorepo) —
`Verifier::new(alfa1, beta2, gamma2, delta2, ic)`, `verify(input: Vec<U256>, proof: Proof) -> bool`,
`Proof { a: G1Point, b: G2Point, c: G1Point }`. Verifies snarkjs circom proofs.
**Targets near-sdk 4.0.0 — needs porting to 5.x** (signatures stable across 5.x; code is not).

## Q3 — On-chain per-proof vs off-chain verify + on-chain anchor

**GDPR direction (HIGH — converging regulatory sources):**
- **EDPB** (v2 adopted 2026-07-08; 2025 draft): strongest preferred architecture stores **no
  personal data on-chain** — chain is a proof-of-existence layer holding a hash that points to
  deletable off-chain data.
- Hashed/encrypted data on-chain **still counts as personal data** if linkable; hashing alone
  doesn't exempt it. Immutability is **not** a compliance defense.
- Where unavoidable: encryption with an off-chain key destroyed on erasure = deletion proxy.
- **CNIL (2018):** never cleartext PII on-chain; store commitments/keyed-hash/ciphertext; the
  registrant is the data controller; assess real necessity of using a chain at all.

→ For a birth/death registry (inherently personal data): **keep certificate contents off-chain,
anchor only a hash/attestation/commitment**, designed so it can't reconstruct the data. (Consistent
with the existing salted-SHA-256 anchor + Poseidon ZK commitment in the earlier report.)

**On-chain per-proof verification:** feasible/demonstrated via the alt_bn128 host functions
(pure-Rust arkworks verify is too expensive — must use the native pairing). Right when a contract
must compose the result in the same transaction; fully self-verifying/auditable, no trusted backend;
~30–40 Tgas/proof (well within budget).

**Off-chain verify + on-chain attestation:** saves per-proof gas, suits periodic/latency-tolerant/
batched workloads (batching drops per-proof cost sharply). Reintroduces trust/liveness: a backend
can't forge proofs but can censor/delay/selectively-include, and its outage halts submission;
auditability is weaker (chain records an assertion, not an independently verifiable proof).

> The run's synthesizer never emitted a single "do X" verdict for our registry. The regulatory
> sources clearly favor off-chain PII + on-chain anchoring; the ZK-verification-step choice is a
> genuine tradeoff — on-chain for trustlessness/auditability, off-chain for gas/batching.

## Caveats / refuted claims

- **REFUTED (0-3):** encoding follows Ethereum EIP-197. NEAR is little-endian; EIP-197 is
  big-endian; G2 Fq2 ordering differs → re-encode snarkjs/circom bytes.
- **REFUTED (1-2):** objects are Borsh-serialized. Borsh was proposed in PR #2842 but rejected;
  shipped runtime uses fixed-size LE arrays, length-implicit counts. (The LE-integer half is TRUE.)
- **REFUTED (1-2):** "the crate uses g1_sum for addition" is universal. Implementation-specific:
  older zeropoolnetwork fork has no g1_sum; the published hideyour-cash crate does.
- **No measured NEAR benchmark** — 30–40 Tgas is a parameter-derived estimate, excludes Wasm
  overhead.
- **Version staleness** — reference verifier targets near-sdk 4.0.0 (historical demo pinned 0.11.0
  via a custom `feature/alt_bn128` fork); API answer is for 5.29.0. No fully-5.x verifier located.
- `max_prepaid_gas` is a per-transaction limit (batched calls share it); doesn't change the fit.
- #6720 gas params are from 2022; match current config but exact 2026 mainnet values could differ.

## Sources (as cited in the transcripts)

- **near-sdk/nearcore:** docs.rs `near_sdk::env` (5.29.0); near-sdk-rs `environment/env.rs`;
  nearcore `logic/alt_bn128.rs`, PR #2842, stabilization PR #6813 (nearcore 1.28.0), issue #6720,
  `parameters.snap`; Nomicon gas (300 Tgas, v52); NEP #305; crates.io versions API.
- **verifier/tooling:** crates.io/docs.rs `near_groth16_verifier` (hideyour-cash/monorepo);
  github zeropoolnetwork/near-groth16-verifier (historical); iden3/snarkjs (bn128); EIP-197 (contrast).
- **GDPR/architecture:** EDPB blockchain guidelines (2025 draft; v2 2026-07-08) + 2026 anonymisation
  guidelines; CNIL blockchain & GDPR (2018-10-29); Groth16 on/off-chain + batching blogs;
  cross-chain gas refs (groth16-solana, EVM formula).
