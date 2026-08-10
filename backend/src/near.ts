import { connect, keyStores, KeyPair, Near, Account } from 'near-api-js';

/*
  NEAR ANCHOR CLIENT — the bridge from our backend to the on-chain notary contract.

  What it does: takes a certificate id + its salted fingerprint (hash) and writes them onto
  the NEAR blockchain by calling the contract's `anchor(cert_id, hash)` method. Anchoring
  returns a transaction id — a permanent public receipt that this fingerprint was notarized.
  It can also `verify` and `get_hash` via free read-only view calls.

  GOLDEN RULE (unchanged): only the fingerprint ever leaves this backend for the chain.
  Never the salt, never the payload, never PII.

  Two modes, mirroring the data store's dev fallback:
    * CONFIGURED — NEAR_CONTRACT_ID + signer creds present -> real on-chain calls.
    * DISABLED   — env not set -> anchoring is a no-op that returns a clearly-fake local id,
                   so the whole app still runs with zero blockchain setup while developing.

  Required env (see backend/.env.example and contract/DEPLOY.md):
    NEAR_NETWORK            testnet | mainnet   (default testnet)
    NEAR_CONTRACT_ID        account the .wasm is deployed to
    NEAR_SIGNER_ACCOUNT_ID  the owner account allowed to anchor
    NEAR_SIGNER_PRIVATE_KEY that owner's PRIVATE key, "ed25519:..." (SECRET, server-side only)
*/

export interface AnchorResult {
  /** Real NEAR transaction hash, or a "local:" placeholder when NEAR is disabled. */
  txId: string;
  /** True only if this went to the real chain. */
  onChain: boolean;
}

export interface NearClient {
  enabled(): boolean;
  /** Backend name for the health endpoint. */
  status(): string;
  /** Write: notarize a fingerprint. Returns a real tx id when enabled. */
  anchorHash(certId: string, hash: string): Promise<AnchorResult>;
  /** Read (free): does the on-chain fingerprint match? */
  verifyHash(certId: string, hash: string): Promise<boolean>;
  /** Read (free): the stored fingerprint, or null. */
  getHash(certId: string): Promise<string | null>;
}

const RPC: Record<string, string> = {
  testnet: 'https://rpc.testnet.near.org',
  mainnet: 'https://rpc.mainnet.near.org',
};

// ---------------------------------------------------------------------------
// Real, on-chain client
// ---------------------------------------------------------------------------
class LiveNearClient implements NearClient {
  private near: Near | null = null;
  private account: Account | null = null;

  constructor(
    private network: string,
    private contractId: string,
    private signerId: string,
    private privateKey: string
  ) {}

  enabled() {
    return true;
  }
  status() {
    return `near:${this.network} contract=${this.contractId}`;
  }

  /** Lazily connect on first use, then reuse the connection. */
  private async ensureConnected(): Promise<Account> {
    if (this.account) return this.account;

    const keyStore = new keyStores.InMemoryKeyStore();
    const keyPair = KeyPair.fromString(this.privateKey as `ed25519:${string}`);
    await keyStore.setKey(this.network, this.signerId, keyPair);

    this.near = await connect({
      networkId: this.network,
      keyStore,
      nodeUrl: RPC[this.network] ?? RPC.testnet,
    });
    this.account = await this.near.account(this.signerId);
    return this.account;
  }

  async anchorHash(certId: string, hash: string): Promise<AnchorResult> {
    const account = await this.ensureConnected();
    const outcome = await account.functionCall({
      contractId: this.contractId,
      methodName: 'anchor',
      args: { cert_id: certId, hash },
      gas: 30_000_000_000_000n, // 30 Tgas
      attachedDeposit: 0n,
    });
    // The transaction hash is the permanent public receipt of this anchoring.
    return { txId: outcome.transaction.hash as string, onChain: true };
  }

  async verifyHash(certId: string, hash: string): Promise<boolean> {
    const account = await this.ensureConnected();
    const result = await account.viewFunction({
      contractId: this.contractId,
      methodName: 'verify',
      args: { cert_id: certId, hash },
    });
    return result === true;
  }

  async getHash(certId: string): Promise<string | null> {
    const account = await this.ensureConnected();
    const result = await account.viewFunction({
      contractId: this.contractId,
      methodName: 'get_hash',
      args: { cert_id: certId },
    });
    return (result as string | null) ?? null;
  }
}

// ---------------------------------------------------------------------------
// Disabled client (no blockchain setup) — keeps the app runnable end-to-end
// ---------------------------------------------------------------------------
class DisabledNearClient implements NearClient {
  enabled() {
    return false;
  }
  status() {
    return 'disabled (no NEAR_CONTRACT_ID / signer configured)';
  }
  async anchorHash(certId: string): Promise<AnchorResult> {
    // A clearly-fake, non-chain id so callers can tell this wasn't really notarized.
    return { txId: `local:${certId}`, onChain: false };
  }
  async verifyHash(): Promise<boolean> {
    return false;
  }
  async getHash(): Promise<string | null> {
    return null;
  }
}

/** Build the active NEAR client from env. Live if fully configured, else disabled. */
export function createNearClient(): NearClient {
  const network = process.env.NEAR_NETWORK || 'testnet';
  const contractId = process.env.NEAR_CONTRACT_ID;
  const signerId = process.env.NEAR_SIGNER_ACCOUNT_ID;
  const privateKey = process.env.NEAR_SIGNER_PRIVATE_KEY;

  if (contractId && signerId && privateKey) {
    console.log(`[near] live client -> ${network} contract=${contractId} signer=${signerId}`);
    return new LiveNearClient(network, contractId, signerId, privateKey);
  }
  console.log('[near] NEAR_* env not fully set — anchoring DISABLED (dev). See contract/DEPLOY.md.');
  return new DisabledNearClient();
}
