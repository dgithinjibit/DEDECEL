# ZK Verification on NEAR — Research Findings (2026)

Source: deep-research workflow (25 claims survived 3-vote adversarial verification).
Salvaged from the run even though the final synthesis agent was interrupted — the verified
claims were recovered from the agent transcripts. Confidence noted per finding.

## Executive summary

> The most practical path in 2026 is **circom + snarkjs** producing **Groth16** proofs over the
> **BN254 / alt_bn128** curve, verified on-chain by a **Rust near-sdk contract**. NEAR natively
> supports this: since **nearcore 1.28.0 (July 2022)** it stabilized three alt_bn128 host
> functions — `alt_bn128_pairing_check`, `alt_bn128_g1_multiexp`, `alt_bn128_g1_sum` — exactly
> the primitives a Groth16 verifier needs. A reference crate (`near_groth16_verifier`) exists.

## Key verified findings

### On-chain verification IS possible on NEAR (HIGH confidence)
- NEAR exposes `alt_bn128_pairing_check`, `alt_bn128_g1_multiexp`, `alt_bn128_g1_sum` as host
  functions (BN254 curve, per Ethereum EIP-196). **Stabilized in nearcore 1.28** (PR #6813,
  ~mid-2022; originally PRs #2842/#3971) — live on mainnet, not a nightly feature.
- Exposed via `near-sdk` (confirmed in **5.29.0**). A Groth16 verifier calls these to check the
  pairing equation.
- Reference implementation: **`near_groth16_verifier`** crate (crates.io), whose `pairing.rs`
  does `use near_sdk::sys::{alt_bn128_g1_multiexp, alt_bn128_g1_sum, alt_bn128_pairing_check}`
  and `alt_bn128_pairing_check(value_len, value_ptr) != 0`.
- NEAR also has **BLS12-381** host functions (incl. `bls12381_pairing_check`) as a second option.
- CAVEAT: one older claim said alt_bn128 lived on a *feature branch* of nearcore/near-sdk-rs.
  That reflected an old repo README; the stabilization claims (nearcore 1.28, near-sdk 5.29.0)
  are newer and win. Verify the installed near-sdk version exposes the `env`/`sys` functions.

### Gas reality (MEDIUM confidence)
- Pairing check base cost ~**9685.5 Ggas** + ~**5102.4 Ggas per 192-byte element**. Groth16's
  constant-size proof keeps this bounded (~a few hundred k gas equiv in EVM terms). Feasible.

### Tooling: circom+snarkjs vs Noir (HIGH confidence)
- **circom + snarkjs = recommended** for a $0 TS/Node + React/Vite dApp. Groth16 over BN254.
- Both **snarkjs and Noir** support in-browser (WASM) proving; **Rapidsnark and Gnark do not**.
- **Noir's on-chain verify is ~6-7x more gas** than snarkjs/Rapidsnark Groth16
  (2,396,575 vs 347,665 gas). Noir WASM proving is 3.5-4x slower than native.
- circom friction: you must define/assign all constraints yourself (a footgun — under-constrained
  circuits are the classic ZK bug). Mitigate with well-reviewed circomlib components + tests.

### Hash choice: switch cert commitment to Poseidon (HIGH confidence)
- **SHA-256 in-circuit ≈ 25,000–31,699 constraints** (circom). **Poseidon ≈ 240 constraints per
  hash — ~100x cheaper.** Primary benchmark: IACR ePrint 2023/681 "Benchmarking ZK-Circuits in
  Circom". ZoKrates: Poseidon ~20x faster than SHA-256 in-circuit.
- Poseidon is field-native (GF(p)); SHA-256 is bitwise (XOR/AND/rotations) → expensive to
  emulate in a prime-field circuit. Poseidon was designed specifically to fix this.
- Real-world precedent: Galxe/BabyZK uses **BN254 + Groth16 + Poseidon commitments** for ZK
  identity — the exact stack we're choosing.
- CAVEAT: Poseidon is newer, less battle-tested than SHA-256. Keep the existing SHA-256
  `cert_hash` for the on-chain anchor + explorer; add Poseidon as a SEPARATE, ZK-only commitment.

## Chosen architecture (order: foundation → circuit → on-chain)

1. **Foundation (slice 3):** add a **Poseidon commitment** alongside the existing salted SHA-256
   `cert_hash`, so records become ZK-ready without disturbing the current anchor/explorer flow.
2. **Circuit (slice 1):** one circom circuit proving knowledge of a cert preimage that hashes
   (Poseidon) to the committed value, WITHOUT revealing it. Prove with snarkjs (Node first),
   verify off-chain in the backend, exposed at `/verify/v1/proof/:id`.
3. **On-chain (slice 2):** a Rust NEAR verifier contract using the alt_bn128 precompiles (model
   on `near_groth16_verifier`), deployed to testnet.

Trusted setup: **use a public powers-of-tau (phase 1)**, do only the phase-2 circuit
contribution locally. Label keys clearly; a real ceremony is required before mainnet.

## Open questions (were not fully answered before the run was stopped)
- Exact `near-sdk` API surface for the alt_bn128 functions in the version we'll pin.
- Concrete end-to-end gas cost of verifying our specific circuit on NEAR testnet.
- Whether to verify on-chain per-proof (expensive) or verify in backend + anchor a boolean.
