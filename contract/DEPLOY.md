# Deploying the BIDECEL anchor contract to NEAR testnet

This is the **on-chain half** of the project: a tiny program (`src/lib.rs`) that stores
`certificate_id -> fingerprint` on the NEAR blockchain and nothing else. This guide takes you
from a fresh machine to a working, deployed contract you can `anchor` and `verify` against —
step by step, assuming no prior blockchain experience.

> **Cost:** everything here is on **testnet**, which uses free, fake NEAR tokens. It costs $0.
> **Golden rule:** never put names, dates, or IDs on-chain. Only the meaningless fingerprint.

---

## 0. What you already have

- `src/lib.rs` — the contract source (well-commented; read it once).
- `Cargo.toml` — the Rust manifest.
- A compiled artifact at `target/wasm32-unknown-unknown/release/bidecel_anchor.wasm`
  (~192 KB). This `.wasm` file is the thing that gets uploaded to the chain.

If the `.wasm` is missing, rebuild it (step 2).

---

## 1. Install the tools (one time)

You already have Rust (`rustc`, `cargo`) and the wasm target. You still need the **NEAR CLI**,
the command-line tool that talks to the blockchain.

Install the modern Rust-based NEAR CLI:

```bash
# One-line installer (Linux/macOS):
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/near/near-cli-rs/releases/latest/download/near-cli-rs-installer.sh | sh

# Verify:
near --version
```

(Alternative: `npm install -g near-cli-rs`.)

Optionally install `cargo-near`, which knows how to build + deploy in one command:

```bash
cargo install cargo-near
```

---

## 2. Build the deployable `.wasm` (if not already built)

```bash
cd contract
cargo build --target wasm32-unknown-unknown --release
```

The artifact lands at `target/wasm32-unknown-unknown/release/bidecel_anchor.wasm`.

> `cargo test` (no target flag) runs the 5 unit tests against a fake blockchain — do this
> anytime to check the logic without touching the network.

---

## 3. Create a testnet account (this becomes the contract + the owner)

The contract lives *at* a NEAR account. That same account is the **owner** — the only account
allowed to `anchor`. Pick a name; it must end in `.testnet`.

```bash
# Interactive: creates the account and funds it from the testnet faucet (free tokens).
near account create-account sponsor-by-faucet-service registry-demo.testnet \
  autogenerate-new-keypair save-to-keychain \
  network-config testnet create
```

Replace `registry-demo.testnet` with your own unique name. If that name is taken, choose another.

This saves the account's keys to your OS keychain (or `~/.near-credentials/`). **Those keys are
the owner's signing keys** — the backend will need the private key later (step 6).

Check the balance (should have a few test NEAR):

```bash
near account view-account-summary registry-demo.testnet network-config testnet now
```

---

## 4. Deploy the contract AND initialize it in one shot

Deploying uploads the `.wasm`. Initializing runs `new(owner)` once to set the owner and create
the empty table. Doing both together avoids a window where the contract exists but is unset.

```bash
near contract deploy registry-demo.testnet \
  use-file target/wasm32-unknown-unknown/release/bidecel_anchor.wasm \
  with-init-call new json-args '{"owner": "registry-demo.testnet"}' \
  prepaid-gas '100.0 Tgas' attached-deposit '0 NEAR' \
  network-config testnet sign-with-keychain send
```

Here the contract account **and** the owner are the same account (`registry-demo.testnet`),
which is the simplest setup. You can pass a different `owner` if you want a separate signer.

---

## 5. Smoke-test on the live chain

**Anchor a fingerprint** (a write call — must be signed by the owner):

```bash
near contract call-function as-transaction registry-demo.testnet anchor \
  json-args '{"cert_id": "demo-cert-1", "hash": "0xabc123deadbeef"}' \
  prepaid-gas '30.0 Tgas' attached-deposit '0 NEAR' \
  sign-as registry-demo.testnet \
  network-config testnet sign-with-keychain send
```

**Verify it** (a read call — free, no signing):

```bash
near contract call-function as-read-only registry-demo.testnet verify \
  json-args '{"cert_id": "demo-cert-1", "hash": "0xabc123deadbeef"}' \
  network-config testnet now
# -> true

near contract call-function as-read-only registry-demo.testnet verify \
  json-args '{"cert_id": "demo-cert-1", "hash": "0xWRONG"}' \
  network-config testnet now
# -> false
```

**Read the stored hash back:**

```bash
near contract call-function as-read-only registry-demo.testnet get_hash \
  json-args '{"cert_id": "demo-cert-1"}' \
  network-config testnet now
```

You can also see everything in a block explorer: <https://testnet.nearblocks.io/address/registry-demo.testnet>

---

## 6. Hand the details to the backend (Phase 3, step 2)

The backend anchors automatically instead of you typing the `anchor` call. Put these in
`backend/.env` (see `backend/.env.example`):

```bash
NEAR_NETWORK=testnet
NEAR_CONTRACT_ID=registry-demo.testnet          # where the .wasm is deployed
NEAR_SIGNER_ACCOUNT_ID=registry-demo.testnet    # the owner account that may anchor
NEAR_SIGNER_PRIVATE_KEY=ed25519:...             # that owner's PRIVATE key (see below)
```

Get the private key for the signer account:

```bash
near account export-account registry-demo.testnet \
  using-private-key network-config testnet
```

> **Keep `NEAR_SIGNER_PRIVATE_KEY` secret.** It controls the owner account. It lives only in
> the backend `.env` (server-side), never in the browser or on-chain. For testnet a leak just
> means someone can spend fake tokens; for mainnet it would be real money — rotate keys before
> going to mainnet.

---

## 7. Going to mainnet later (not now)

The exact same `.wasm` deploys to mainnet: swap `network-config testnet` for
`network-config mainnet`, use a `.near` account funded with real NEAR, and set
`NEAR_NETWORK=mainnet`. No code changes.

---

## Contract API reference

| Method | Kind | Who can call | What it does |
|---|---|---|---|
| `new(owner)` | init (once) | deployer | Sets the owner, creates the empty table. |
| `anchor(cert_id, hash)` | write (gas) | owner only | Saves a fingerprint. Refuses to overwrite an existing one. |
| `verify(cert_id, hash) -> bool` | view (free) | anyone | True if the stored fingerprint matches exactly. |
| `get_hash(cert_id) -> string?` | view (free) | anyone | Returns the stored fingerprint, or null. |
| `get_owner() -> account` | view (free) | anyone | Who controls the contract. |
