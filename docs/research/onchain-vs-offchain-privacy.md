# On-chain vs Off-chain Privacy for a NEAR Birth/Death Certificate Registry

> **Deep-research report.** Recovered from workflow `wf_88aa16bf-54e` (the final packaging step
> truncated, but the full researched content is preserved here). Every finding below was
> adversarially verified (3-vote); "3-0" means all three verifiers agreed it holds up.
> Date of research: 2026-08-10.

---

## Plain-language glossary (read this first — you're a beginner)

- **Hash / fingerprint** — a short, fixed-length code (e.g. 32 bytes) computed from a file. Change
  one byte of the file and the hash changes completely. It's a one-way street: you can't turn the
  hash back into the file. Used to *prove a document wasn't altered* without revealing its contents.
- **Salt / pepper** — a secret random value mixed into the data *before* hashing. Without it, an
  attacker can guess low-variety data (like a birthdate) by hashing every possibility until one
  matches. A **salt** is per-record; a **pepper** is one global secret. Keeping the salt secret and
  off-chain is what makes the on-chain hash safe.
- **Merkle root** — hash many documents in pairs, then hash the pairs, repeatedly, until you get one
  top hash (the "root"). Storing just that root on-chain proves any document in the batch exists,
  using a short "proof". Lets you anchor thousands of certs for the cost of one hash.
- **On-chain state** — data stored *inside* the blockchain. On NEAR it is **publicly readable by
  anyone** (see Finding 7). Immutable — you cannot delete or edit it.
- **Gas / storage staking** — NEAR charges for storage by making you *lock up* tokens: ~1 NEAR per
  100 KB stored. Delete the data and you get the tokens back. Tiny hashes = nearly free; whole
  documents = expensive.
- **Off-chain** — a normal database you control, *not* on the blockchain. You can delete rows here.

---

## Bottom line (the summary)

For a NEAR-based birth/death certificate registry, the correct and legally safe architecture is to
store **ONLY a cryptographic fingerprint (hash) of each certificate on-chain** and keep **all raw
PII in a deletable off-chain database**. Storing documents directly on-chain is both cost-prohibitive
and legally dangerous, because a public blockchain is immutable and its state is fully readable by
anyone (on NEAR, via the `view_state` RPC with an empty key prefix), which collides head-on with
GDPR's Article 17 right to erasure.

Crucially, regulators (EDPB Guidelines 02/2025, finalized July 2026; CNIL) now hold that **even a
hash or encrypted blob on-chain still counts as personal data**, so the hash must be a **salted or
keyed hash whose secret salt/key lives off-chain**, and low-entropy PII fields (names, dates) must
never be hashed without a secret salt or they can be brute-forced.

Practically: compute a salted SHA-256 hash of each certificate inside the NEAR contract using
`env::sha256_array`, store it in a `LookupMap` keyed by certificate ID (NEAR storage staking costs
~1 NEAR per 100 KB, so hashes are cheap while documents are not), and keep the actual PII in a
free-tier conventional database you fully control and can delete on request. **Avoid public
IPFS/Filecoin for PII** because content-addressed storage cannot guarantee deletion once a CID
propagates.

---

## Findings (each adversarially verified)

### 1. Store only the hash on-chain, raw PII off-chain — the "notarization / hashing-out" pattern `[3-0, high]`
This is the standard textbook architecture. On-chain storage of the document itself is
cost-prohibitive AND legally problematic; off-chain data can be deleted on request.
- AWS Web3: *"We can't store the event documents on blockchain directly… we use blockchain as a
  notary service, storing proofs of documents… document itself is stored off-chain."*
- Peer-reviewed lit review (arXiv 2210.04541): *"The most common technique… is the 'hashing out'
  technique… storing hashes of data on-chain and keeping the actual data off-chain by using a local
  database."*
- Sources: aws.amazon.com/blogs/web3/notarize-documents-on-the-ethereum-blockchain, arXiv 2210.04541, 2201.04374, 2303.06546

### 2. A hash on-chain does NOT remove GDPR obligations `[3-0, high]`
A hash (or encrypted blob) of personal data is still legally "personal data" (pseudonymised, not
anonymised). Blockchain immutability directly conflicts with the right to erasure/rectification.
- arXiv 2210.04541: *"encrypted or hashed data is still personal data… pseudonymised data."*
- EDPB Guidelines 02/2025 (final v2.0, 7 July 2026): *"the hash will also be considered personal
  data"* and *"encryption does not remove the need for GDPR compliance."*
- Sources: arXiv 2210.04541, 2104.09971, EDPB Guidelines 02/2025 PDF

### 3. Use a SECRET, KEYED salt (HMAC) stored off-chain to defeat brute-force `[3-0, high]`
Names, dates, ID numbers have few possible values — a plain hash of them can be brute-forced. You
must mix in a salt. The strongest form is a secret keyed hash (HMAC) whose key lives **off-chain**;
destroying that key makes the on-chain hash non-recoverable. Plain unsalted hashing of low-entropy
fields is explicitly inadequate.
- EDPB Guidelines para 52: *"store only a salted or keyed hash… The unhashed data itself, as well as
  the secret key or the long random salt used, are stored confidentially off the chain… after
  deletion of the secret key or salt, the hash should not be linkable to the original data."*
- ⚠️ A salt you must keep to recompute the hash still enables per-record brute force **unless it is a
  secret off-chain key**.
- Sources: arXiv 2210.04541, 2103.07655, EDPB Guidelines 02/2025

### 4. Merkle roots batch many certificates into one on-chain hash `[3-0, high]`
Storing only the root proves existence of any document in the batch via a short proof, keeping
on-chain cost constant regardless of batch size. NEAR supports both SHA-256 and keccak256.
- Sources: arXiv 2103.07655, AWS Web3 blog

### 5. Compute the hash INSIDE the NEAR contract with `env::sha256_array`; store in a `LookupMap` `[3-0, high]`
`near-sdk`'s `env::sha256_array` hashes bytes into a 32-byte digest (`keccak256_array` also exists).
`LookupMap` is a gas-efficient on-chain key-value store whose keys aren't persisted/iterable — ideal
for cert-ID → hash.
- Sources: docs.rs/near-sdk env & store modules

### 6. NEAR storage is a STAKING model — hashes are ~free, documents are expensive `[3-0, high]`
You must **lock** 10^19 yoctoNEAR per byte (~100 KB per 1 NEAR). Refundable — deleting data unstakes
the tokens. NEAR docs explicitly recommend keeping user content off-chain and using Borsh (binary)
serialization instead of JSON to save bytes.
- NEAR docs: *"1E19 yoctoNEAR per byte, or 100kb per NEAR token"*; *"Store data off-chain (e.g.,
  IPFS/Filecoin), especially for user-generated content."*
- Sources: docs.near.org/protocol/storage/storage-staking, /smart-contracts/anatomy/collections

### 7. NEAR contract state is PUBLICLY READABLE — no read access control `[3-0, high]`
Anyone can dump the entire raw key-value state via the `view_state` RPC with an empty key prefix.
**Secrets and PII must NEVER be placed in contract state, even "privately."** This bypasses any
contract-method access control. **True on both mainnet and testnet** (same protocol) — testnet just
uses valueless test tokens, so it doesn't change the privacy/legal analysis.
- NEAR RPC docs: *"Pass an empty string for prefix_base64 to return the entire state."*
- Sources: docs.near.org/api/rpc/contracts

### 8. Crypto-shredding is only a PARTIAL mitigation `[3-0, high]`
Encrypting data then deleting the off-chain key is accepted by EDPB *only "where on-chain storage is
unavoidable."* CNIL holds it is **not actual erasure** under GDPR. The far safer beginner approach:
**store NO personal data on-chain at all**, so the tension never arises.
- ⚠️ Claims that "off-chain key deletion fully satisfies the right to erasure" were **REFUTED (0-3)**.
- Sources: arXiv 2210.04541, EDPB Guidelines 02/2025

### 9. July 2026 EDPB guidance HARDENED the rules `[3-0, high]`
Hashed/encrypted on-chain data is personal data whenever it can be linked to a person (via key,
wallet address, correlation with off-chain records, or future cryptanalysis). Anonymisation test:
no record isolation, no linkage, no inference — on-chain hashes typically fail it. **Assume any hash
you publish is regulated personal data** and keep the raw PII + secret salt/key deletable off-chain.
- Sources: EDPB Guidelines 02/2025, TechTimes summary (corroborated by Bird & Bird, Sidley)

### 10. Do NOT use public IPFS/Filecoin for the raw PII `[3-0, high]`
Content-addressed storage makes deletion technically unenforceable (conflicts with Article 17). Once
a CID propagates and any node re-pins the file, unpinning at origin doesn't remove it. Use a
conventional database **you fully control** for the deletable PII store.
- Sources: beigemedia.org/article/ipfs-enterprise-compliance-gap, docs.ipfs.tech/concepts/persistence

### 11. RECOMMENDED PRACTICAL ARCHITECTURE (beginner-safe) `[medium — synthesis]`
1. Keep **ALL raw certificate PII** in a conventional, **deletable off-chain database** on a free
   tier (Supabase/Postgres, Neon, Firebase, PlanetScale, or self-hosted) — you control it and can
   hard-delete rows on an erasure request.
2. Store a **secret pepper/salt (HMAC key) server-side, off-chain**.
3. On the NEAR contract, store **only the salted/keyed SHA-256 hash** of each certificate in a
   `LookupMap` keyed by certificate ID (via `env::sha256_array`, serialized with Borsh).
4. **Never** place names, dates, IDs, or any PII in contract state.
5. Prototype on **NEAR testnet** (free test tokens), deploy to mainnet unchanged.

This satisfies erasure (delete off-chain row + destroy salt), keeps on-chain cost near-zero, and
never leaks PII onto the public chain. *(Free-tier DB product choices are engineering guidance, not
from the research corpus — verify current provider terms.)*

---

## Caveats
- **EU guidance is evolving.** EDPB blockchain Guidelines 02/2025 are FINAL (v2.0, 7 July 2026). The
  related **anonymisation** guidelines (no-isolation/no-linkage/no-inference test) were still DRAFT,
  open for consultation until 30 Oct 2026 — wording may change.
- **NEAR storage price is a live parameter** (1E19 yoctoNEAR/byte now; was 10× higher before). Verify
  the current value via RPC before cost estimates.
- **Two tempting shortcuts were REFUTED:** (a) deleting an off-chain key fully satisfies erasure;
  (b) an on-chain hash pointing to deletable off-chain data is "truly anonymous." Regulators treat
  both as partial mitigations only — hence the "no PII on-chain at all" recommendation.
- keccak256 (AWS example) differs from NIST SHA3-256; NEAR supports both SHA-256 and keccak256 — the
  choice doesn't affect the architecture.

## Open questions to resolve before mainnet
1. Does the registry fall under GDPR (EU data subjects) or another regime — and do **statutory
   retention laws** for government records legally *require* keeping data, possibly conflicting with
   erasure requests?
2. Is a public permissionless chain (NEAR) even right for a government registry vs. a
   permissioned/private ledger, given even salted hashes are regulated data and state is world-readable?
3. Which free-tier DB fits volume, EU data-residency, and guaranteed hard-delete — and does its free
   tier persist long-term (some pause/delete inactive projects)?
4. Concrete key-management plan for the off-chain salt/pepper (rotation, backup, per-record vs global)
   — destroying it enables erasure, but losing it breaks all future hash verification.
