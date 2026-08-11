# BIDECEL — How it all fits together (a beginner's map)

This project is a **digital birth & death certificate registry** with a twist: it uses a
blockchain as a *tamper-proof notary*, while keeping all the private personal data in an ordinary,
deletable database. This page explains every moving part in plain language. No prior blockchain or
backend knowledge assumed.

---

## The one big idea

> **The blockchain stores only a "fingerprint" (a hash) of each certificate. All the real personal
> data lives in a normal database we control and can delete.**

Why split it this way?

- A blockchain is **permanent and public** — great for *proving* a record existed and wasn't
  altered, terrible for *privacy* (you can never delete it, and everyone can read it).
- A database is **private and deletable** — great for holding names, dates, and national IDs, and
  for honoring "please erase my data" (GDPR) requests.

So we get the best of both: the chain proves authenticity; the database holds the secrets and can
forget them.

**Jargon decoder:**
- **Hash / fingerprint** — a short, fixed-length code computed from data. Change one letter of the
  data and the hash changes completely. You can't work backwards from a hash to the original data.
- **Salt / pepper** — extra secret values mixed in *before* hashing, so nobody can guess the data
  by hashing common values and comparing. The salt/pepper live only in our backend, never on-chain.
- **Anchor** — to write a hash onto the blockchain (our "notary stamp").
- **Wallet** — a browser/mobile tool holding a blockchain account; here it's how you log in.
- **PII** — Personally Identifiable Information (names, dates, IDs). Never goes on-chain.

---

## The three parts (and where they live)

```
   ┌─────────────────────────┐        ┌──────────────────────────┐        ┌───────────────────┐
   │  FRONTEND (the website)  │  HTTP  │  BACKEND (the API)       │  RPC   │  NEAR CONTRACT    │
   │  BIDECEL/                │ ─────► │  backend/                │ ─────► │  contract/        │
   │  React + Vite            │        │  Express + hashing       │        │  Rust "notary"    │
   │  runs in the browser     │ ◄───── │  owns the PII + salt     │ ◄───── │  stores id→hash   │
   └─────────────────────────┘        └──────────────────────────┘        └───────────────────┘
       what people see                  where secrets live                 the public proof
```

1. **Frontend — `BIDECEL/`** (a React website).
   The user interface: birth section, death section, wallet login, verifier, block explorer.
   It never touches the database or the chain directly — it only calls the backend's API. A small
   **service layer** (`src/services/registry.ts`) lets it run against either a fake in-browser
   *mock* or the *real* backend, chosen by an environment flag.

2. **Backend — `backend/`** (a small Express server).
   The trusted middle. It:
   - stores each certificate's **PII in a database** (Supabase, or an in-memory store for dev),
   - computes the **salted hash** (`src/hashing.ts`) and keeps the salt/pepper secret,
   - **anchors** the hash on NEAR (`src/near.ts`) and records the transaction id,
   - can **hard-delete** a record for erasure.
   API routes live under `/v2/*` (and `/api/v1/*` for the birth section's older calls).

3. **NEAR contract — `contract/`** (a tiny Rust program on the blockchain).
   The public notary. It stores a table of `certificate_id → hash` and offers `anchor` (write, must
   be signed by the owner), `verify`, and `get_hash` (free public reads). **No PII ever.**

---

## The life of a certificate (the end-to-end story)

1. **Create.** A doctor/registrar fills in a certificate in the frontend. The frontend sends the PII
   to the backend (`POST /v2/death/records`). The backend saves the PII in the database, generates a
   random **salt**, computes the **salted hash**, and returns just the hash.
2. **Anchor (seal).** On approval, the backend calls the NEAR contract's `anchor(cert_id, hash)`.
   Only the hash goes on-chain. NEAR returns a permanent **transaction id** (the public receipt).
3. **Verify.** Anyone can later check a certificate: the backend recomputes the hash from the stored
   PII + salt and compares it (off-chain check), and the contract's `verify` confirms the on-chain
   copy matches. If either differs, the record was tampered with.
4. **Erase (GDPR).** To honor a deletion request, the backend hard-deletes the database row **and its
   salt**. The hash still sits on-chain forever, but with the salt gone it can never be reproduced or
   linked back to a person — effectively "forgotten".

**Cross-ledger link:** a death certificate can reference a person's birth-certificate hash
(`GET /v2/birth-hash/:nationalId`) to prove the birth record exists — without exposing any PII.

---

## Why is anything "on-chain" at all, then?

Because the chain gives you something a plain database can't: **nobody — not even us — can secretly
alter or back-date a sealed record.** If someone edits the database, the recomputed hash stops
matching the one anchored on-chain, and the tampering is instantly provable. The database holds the
data; the chain holds the *promise that the data hasn't changed*.

---

## Real vs. demo mode (nothing is required to just run it)

Every "real" piece has a safe fallback so the whole thing runs with zero setup:

| Piece            | Demo default                      | Turn on "real" with…                              |
|------------------|-----------------------------------|---------------------------------------------------|
| Backend data     | in-memory (resets on restart)     | `SUPABASE_URL` + `SUPABASE_SERVICE_KEY`           |
| On-chain anchor  | `local:` placeholder id           | `NEAR_CONTRACT_ID` + signer keys (deploy first)   |
| Frontend backend | in-browser mock                   | `VITE_USE_REAL_BACKEND=true` (+ `VITE_API_BASE_URL` in prod) |
| Wallet login     | typed demo account                | `VITE_USE_REAL_WALLET=true` + HOT Wallet          |

To actually deploy it all for **$0**, see **[DEPLOY.md](./DEPLOY.md)**.

---

## Folder cheat-sheet

| Folder / file                    | What it is |
|----------------------------------|------------|
| `BIDECEL/`                       | The React frontend (the website users see). |
| `BIDECEL/src/services/`          | The seam: `registry.ts`, `deathRegistry.ts`, `apiBase.ts`, the mock ledger. |
| `BIDECEL/src/wallet/`            | Wallet login (real HOT Wallet or demo stub). |
| `backend/`                       | The Express API: PII store + hashing + NEAR anchoring. |
| `backend/schema.sql`             | The database tables (run against Supabase for real storage). |
| `contract/`                      | The Rust NEAR contract + its own `DEPLOY.md`. |
| `docs/research/`                 | The privacy research that shaped the architecture. |
| `ROADMAP.md`                     | The phase-by-phase build plan and status. |
