# DEDECEL + DeBiCeL — Project Roadmap

> **One-line goal:** Merge DeBiCeL (birth certs) into DEDECEL (death certs) as a single app, put a
> **real NEAR backend** under it (hash-on-chain, PII off-chain), get **HOT Wallet** login working,
> and host it for **$0**. Built by a beginner, taught step by step.

Last updated: 2026-08-10.

---

## North-star architecture (locked, from research)

See `docs/research/onchain-vs-offchain-privacy.md` for the full cited report. The rules that shape
everything below:

1. **On-chain = only a salted hash** of each certificate (cert-ID → 32-byte hash in a NEAR
   `LookupMap`). Nothing else.
2. **Off-chain = all real PII**, in a normal deletable database we control (free tier).
3. **Secret salt/pepper lives off-chain.** Low-entropy fields (names, dates) must never be hashed
   without it. Deleting the DB row + destroying the salt = effective "right to erasure".
4. **NEAR state is world-readable** (`view_state` RPC) — never put a secret or PII in contract state,
   even "privately". Same on testnet and mainnet.
5. **No public IPFS/Filecoin for PII** (can't guarantee deletion).

---

## Design decisions (locked 2026-08-10)

| Decision | Choice |
|---|---|
| Merge shape | **One app** — DeBiCeL folded into DEDECEL as a "Birth" section. DEDECEL is primary. |
| Recolor | **Whole-app theme now** — replace all bluish accents (`cyan-*`, `indigo-*`, `blue-*`) with **`#BA8C63`** (warm tan/bronze) via a Tailwind v4 theme token. |
| Auth | **Wallet-connect only** (HOT Wallet / NEAR) — no passwords for now. |
| Chain | **NEAR testnet** first (free test tokens), deploy to mainnet unchanged later. |
| Stack | Both apps already React 19 + Vite 6 + Tailwind v4 — merge is clean. |

---

## Two tracks, built in parallel

The work splits into two independent tracks so nothing blocks the other:

- **Track A — Frontend / merge / theme / wallet UI.** (Starts now, Phase 1.)
- **Track B — Backend / NEAR contract / off-chain DB / real hashing.** (Can start in parallel; the
  frontend talks to it through a thin service layer with a mock fallback so neither track waits.)

The bridge between them is a small **service interface** (e.g. `src/services/registry.ts`) with two
implementations: a **mock** (today's simulated ledger) and a **real** (NEAR + off-chain DB). The UI
only ever calls the interface, so Track A can build against the mock while Track B builds the real one.

---

## Phases

### Phase 0 — Research & groundwork ✅ DONE
- [x] Deep-research on-chain vs off-chain privacy → `docs/research/onchain-vs-offchain-privacy.md`
- [x] Structural map of both apps
- [x] This roadmap

### Phase 1 — Frontend merge + theme + wallet login  ✅ DONE (2026-08-10)
Track A. Goal: one running app, recolored, with a wallet-connect login page. No real chain yet.
All five sub-steps complete; `tsc --noEmit` and `vite build` both pass. See sub-steps below (all ✅).

1. **Scaffold the merged app.** Keep DEDECEL as the base app. Add a top-level section concept:
   `Death` (existing) and `Birth` (new). Decide the navigation surface (extend the existing
   state-based view switcher in `DEDECEL/src/App.tsx` with a `domain: 'DEATH' | 'BIRTH'` axis).
2. **Whole-app recolor to `#BA8C63`.** Tailwind v4, no config file today — define a theme token in
   `DEDECEL/src/index.css` (`@theme { --color-brand-*: … }`) and replace bluish accent classes
   (`cyan-*`, `indigo-*`) app-wide. This is a large but mechanical find/replace across JSX.
3. **Port DeBiCeL's birth components** into the merged app under a `Birth/` area: DoctorEntryPortal,
   RegistrarPortal (birth), FamilyPortal (birth), AuditorPortal, DedecelSimulator, the certificate &
   ZK modals, velocity analytics. Recolor them to `#BA8C63` too (they use `blue-*`/`slate-*`).
4. **Wallet-connect login/sign-up page.** New route/view: "Connect Wallet" (HOT Wallet / NEAR). For
   Phase 1 this can be UI + a stub connector so the two tracks proceed; real wallet wiring lands in
   Phase 3. Gate the portals behind "connected" state.
5. **Introduce the service interface** (`registry.ts`) with the mock implementation wired to today's
   simulated ledger, so Phase 2/3 can swap in the real backend without touching the UI.

**Done when:** one app runs, all-tan themed, birth + death sections both reachable, a wallet-connect
login page gates entry (stub ok), and the UI talks only through the service interface.

### Phase 2 — Off-chain backend (the PII store)  ✅ DONE (2026-08-10)
Track B. The deletable database + hashing service. Built in `backend/`: Supabase schema, salted
hashing (8/8 tests), Express API (`/v2/*` + `/api/v1/*` compat), Vite proxy, registry real impl.
Runs on in-memory store with zero setup; flip to Supabase via env vars. Real Supabase project + NEAR
anchoring still pending (anchoring = Phase 3).
1. Pick a free-tier DB (Supabase / Neon / Firebase — verify current free limits & EU residency).
2. Schema for birth + death certificates (all PII lives here).
3. **Hashing service:** compute a **salted/keyed hash** of each certificate; store the secret
   salt/pepper server-side, never sent to the client or chain.
4. Real API endpoints (replacing DeBiCeL's mock `server.ts`), incl. the cross-ledger
   `birth-hash/:nationalId` lookup, plus hard-delete for erasure.

### Phase 3 — NEAR smart contract + real wallet  ⏳ MOSTLY DONE (2026-08-10)
Track B + the real half of Track A's wallet. Code is complete and all green (contract 5/5 tests,
backend + frontend typecheck + build). The one remaining step is the manual on-chain deploy, which
needs the NEAR CLI + a funded testnet account (see `contract/DEPLOY.md`).
1. ✅ Rust contract in `contract/src/lib.rs`: `LookupMap<String,String>` of certId→hash, methods
   `new(owner)` / `anchor(cert_id,hash)` (owner-only, no overwrite) / `verify` / `get_hash` /
   `get_owner`. 5 unit tests pass; release wasm builds (~192 KB) at
   `contract/target/wasm32-unknown-unknown/release/dedecel_anchor.wasm`. **No PII in state.**
2. ⬜ Deploy to **NEAR testnet** (manual): follow `contract/DEPLOY.md` — install `near` CLI, create
   + faucet-fund a `.testnet` account, `deploy … with-init-call new`, smoke-test anchor/verify.
3. ✅ Wire **HOT Wallet** (NEAR wallet-selector) into the Phase 1 login page: `WalletContext.tsx`
   now runs the real selector + HOT Wallet module when `VITE_USE_REAL_WALLET=true` (lazy-imported),
   with the demo stub as the zero-setup default. Login popup + sign-out both work.
   *Anchor txns are signed server-side by the backend owner key, not the browser wallet.*
4. ✅ Real service impl anchors for real: backend `src/near.ts` (near-api-js) calls the contract's
   `anchor()` and stores the real tx id; `/v2/:domain/records/:id/anchor` does the on-chain write
   itself (no client-supplied txId), plus a new `/onchain` verify route. Disabled-mode fallback
   returns a `local:` id + `onChain:false` so the app runs with zero blockchain setup. Env:
   `NEAR_NETWORK / NEAR_CONTRACT_ID / NEAR_SIGNER_ACCOUNT_ID / NEAR_SIGNER_PRIVATE_KEY`.

**To finish Phase 3:** run the deploy in `contract/DEPLOY.md`, then set the `NEAR_*` vars in
`backend/.env` and `VITE_USE_REAL_WALLET=true` + `VITE_NEAR_CONTRACT_ID` in `DEDECEL/.env`.

### Phase 4 — Integration, verification, polish  ✅ DONE (2026-08-10)
Death flow rewired to the real backend + automated tests added. All green: contract 5/5, backend
51/51 (hash 8 + store 15 + api 28), frontend tsc + vite build. Death lifecycle verified end-to-end
via curl against the running backend.
1. ✅ End-to-end: the death UI now calls the real backend. `src/services/deathRegistry.ts` bridges
   CREATE→`POST /v2/death/records` (PII off-chain + server salted hash), APPROVE→`registry.anchorHash`
   (backend anchors on NEAR), VERIFY→`registry.verify`, ERASE→`DELETE …`. Wired into `App.tsx`
   handlers (create/approve/sync-queue) + a new "Real Backend · On-Chain Notary" panel in
   `AgencyVerifier` (Verify + role-gated GDPR Erase). Non-breaking: mock when VITE_USE_REAL_BACKEND≠true.
2. ✅ Immutability/erasure story proven: re-anchor→409; DELETE→ verify returns 404 (hash no longer
   reproducible). Covered by `api.test.ts` and confirmed by manual curl run.
3. ✅ Cross-ledger check: `GET /v2/birth-hash/:nationalId` returns proof pointers only (no PII),
   tested incl. the after-erasure "not found" case.

**Tests added (zero-framework tsx, matching hashing.test.ts):** `backend/src/store.test.ts`,
`backend/src/api.test.ts`; scripts `test:store` / `test:api` / `test:all`. Server gained a
`DEDECEL_NO_LISTEN` guard so tests import `app` and bind an ephemeral port.

**Still requires the real chain** (Phase 3 step 2, manual): until the contract is deployed + `NEAR_*`
set, anchoring returns a `local:` placeholder (`onChain:false`). Everything else is real.

### Phase 5 — $0 hosting & docs  ✅ DONE (2026-08-10)
All hosting config + beginner docs added; frontend tsc+build (incl. a prod-env build that bakes the
backend URL into the bundle) and backend 51/51 tests green.
1. ✅ Static frontend host config: `DEDECEL/vercel.json` + `DEDECEL/netlify.toml` (build cmd,
   publish `dist`, SPA fallback rewrite). Off-chain API host config: `backend/render.yaml` (free web
   service, healthCheck `/v2/health`, env var stubs) + `backend/Procfile`. Backend now binds
   `process.env.PORT` (host-injected) and has an env-driven CORS allowlist (`CORS_ORIGINS`).
   Prod/dev API split: new `DEDECEL/src/services/apiBase.ts` `apiUrl()` helper + `VITE_API_BASE_URL`;
   every `/api/v1` + `/v2` fetch (registry, deathRegistry, BirthApp, DedecelSimulator) routed through
   it — empty in dev (Vite proxy), full backend URL in prod. `tsx` moved to backend deps so a
   dev-dep-pruning host can still `npm start`. Both `.env.example`s updated.
2. ✅ Contract unchanged — stays on NEAR (testnet free; same wasm → mainnet later). Deploy still the
   one manual step (`contract/DEPLOY.md`).
3. ✅ Beginner docs: top-level `HOW-IT-FITS.md` (architecture in plain language + jargon decoder +
   life-of-a-certificate) and `DEPLOY.md` ($0 step-by-step: Render backend → Vercel/Netlify frontend
   → close the CORS loop → optional testnet contract, with a cost table + troubleshooting).

**Project build-complete.** Only remaining real-world step: the manual NEAR testnet deploy
(`contract/DEPLOY.md`) to move anchoring from `local:` placeholder to a real on-chain tx.

---

## Open questions to resolve before mainnet (not blocking Phase 1)
- Does the registry fall under GDPR / another regime? Do **statutory record-retention laws** conflict
  with erasure?
- Is a public chain right for a government registry vs. a permissioned ledger?
- Which free-tier DB (volume, EU residency, guaranteed hard-delete, doesn't pause inactive projects)?
- Key-management plan for the off-chain salt/pepper (rotation, backup, per-record vs global).

---

## Parallelism map (so no one waits)
```
Phase 1 (Track A, frontend)  ──┐
                               ├─► service interface (registry.ts) is the seam
Phase 2 (Track B, off-chain) ──┤
Phase 3 (Track B, NEAR)      ──┘
```
Track A builds against the **mock**; Track B builds the **real** backend; they meet at the service
interface. Recolor + merge + login (Phase 1) need nothing from the chain, so they start immediately.
