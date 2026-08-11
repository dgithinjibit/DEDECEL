# BIDECEL — Project Status (for the PM)

_Last updated: 2026-08-11. Percentages are grounded in what actually exists on disk + git history,
not plan optimism._

## Headline: **~92% complete**

_Updated after ZK slice 2 (on-chain Groth16 verifier) was built this session._

The product is **feature-complete and builds clean** (`tsc` + `vite build` both pass). What remains
is one real engineering slice (on-chain ZK proof verification) plus going live on-chain (a deploy),
plus committing current in-progress work. Nothing remaining is research-blocked — the last open
questions were resolved this session.

## What "done" means here

Two decisions were **locked today (2026-08-11)** after deep research:
- Build the NEAR verifier on **near-sdk 5.x** (the contract is already on 5.5.0 ✅).
- Handle proof bytes in **little-endian** (snarkjs is big-endian → needs a re-encoding step).

## Status by area

| Area | State | % | Evidence |
|---|---|---|---|
| Research & architecture | ✅ Done | 100% | 3 reports in `docs/research/`; all open Qs resolved |
| Frontend merge + theme + wallet | ✅ Done | 100% | Phases 1–5 in ROADMAP; real NEAR wallet login (NEP-413) |
| Off-chain backend (PII store) | ✅ Done | 100% | `backend/`, tests, `/verify/v1` API |
| ZK circuit (Poseidon commitment) | ✅ Done | 100% | `circuits/` compiled: r1cs/wasm/zkey/ptau/vk present |
| ZK off-chain prove + verify | ✅ Done | 100% | `backend/src/zk.ts` real snarkjs Groth16; `/verify-proof` |
| Onboarding wizard | ✅ Done (uncommitted) | 100% | `src/onboarding/`, App.tsx gate; tsc clean |
| UI polish pass | ✅ Done (uncommitted) | 100% | focus-visible + reduced-motion; radius unification; footer |
| **ZK on-chain verification** | ✅ Code-complete | 90% | `verify_proof` in contract uses alt_bn128; `near-encoding.ts` does LE conversion; builds to wasm, 13+13 tests pass. *Not yet exercised on a live runtime — see caveat.* |
| Contract deployed to testnet | ⏳ Manual step | 0% | code ready; `contract/DEPLOY.md` not yet run |

## The remaining ~15%, in priority order

1. **Commit current WIP** (small, do first) — onboarding + footer + UI pass + the new research doc
   are all working but uncommitted. _Task #4._
2. **ZK slice 2 — on-chain verifier** (the real remaining build): port the `near_groth16_verifier`
   reference from near-sdk 4.0.0 → 5.x, add a `verify_proof` method that calls the alt_bn128 host
   functions. _Task #1._
3. **Little-endian re-encoding** (paired with #2): convert snarkjs/circom proof + vk bytes
   big-endian→little-endian (with G2 Fq2 reordering) so the on-chain verifier can consume our
   existing proofs. _Task #2._
4. **Deploy to testnet** (manual, unblocks "live"): run `contract/DEPLOY.md`, set `NEAR_*` env,
   flip anchoring from mock to real chain. _Task #3._

## ⚠️ Open caveat on the on-chain verifier (must validate on testnet)

The Groth16 verifier (`contract/src/lib.rs::verify_proof`) and the snarkjs→NEAR re-encoder
(`backend/src/near-encoding.ts`) are written, build cleanly, and pass all unit tests. **But the
pairing check itself cannot run in unit tests** — NEAR's `alt_bn128_*` host functions only exist in
a real runtime. Two things therefore remain UNPROVEN until we run one real proof on testnet:

1. **Fq2 coordinate ordering (c0 vs c1).** The research flagged this as the classic porting
   footgun. Both sides currently assume snarkjs's `[c0, c1]` order matches NEAR's — if NEAR expects
   `[c1, c0]`, the verifier will return `false` for valid proofs. First live test will reveal this;
   the fix (if needed) is a one-line swap in `g2ToLe` / `g2_const_bytes`.
2. **g1_sum sign-byte layout** used to compute `vk_x` on-chain.

These are LOW-effort to fix but MUST be validated with a real proof — do NOT treat on-chain verify
as "working" until a testnet proof verifies true (and a tampered one verifies false).

### ✅ Resolved 2026-08-11: wrong field modulus in coordinate negation (was a third latent bug)

The `FQ` constant used to negate G1 coordinates (`-A`, `-y` in the pairing equation) was set to the
BN254 **scalar field r** (`…495617`) instead of the **base field q** (`…208583`) — coordinates live
in Fq, so negation must reduce mod q. Both the Rust crate (`crates/zk-encoding/src/lib.rs::FQ_LE`,
whose bytes were additionally corrupted) and the TS re-encoder (`backend/src/near-encoding.ts`) held
the same wrong value, so their golden vectors agreed and every test passed — the bug was invisible
and would have made **valid proofs reject on-chain**. Fixed on both sides + `near-encoding.test.ts`;
added a `fq_le_is_base_field_q` regression guard that reconstructs q from decimal and pins the bytes.
All suites re-run green (zk-encoding 9/9, near-encoding TS 13/13, ZK e2e 6/6, contract 6/6).

## PM notes / risk

- **On-chain verification is optional for MVP.** Off-chain proof verification already works
  end-to-end; on-chain verify (slice 2) adds trustlessness/auditability but the registry is
  demonstrable without it. If the deadline is tight, ship at ~85% (deploy the anchor contract) and
  treat slice 2 as a fast-follow.
- **No research blockers remain.** near-sdk API surface, gas (~30–40 Tgas, well under the 300 Tgas
  limit), and the on/off-chain tradeoff are all resolved — see
  `docs/research/groth16-on-near-verification-2026.md`.
- **Known gotcha for slice 2:** the reference verifier crate targets near-sdk 4.0.0 and needs
  porting; snarkjs proofs need the LE conversion. Both are scoped, not open-ended.
- **Trusted setup:** current zkey uses a public powers-of-tau + local phase-2 contribution — fine
  for testnet/demo; a real ceremony is required before mainnet.
