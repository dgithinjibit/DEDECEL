/*
  NEAR BLOCK EXPLORER LINKS (NearBlocks)

  NearBlocks (https://nearblocks.io) is NEAR's public block explorer — the equivalent of
  Etherscan for Ethereum. Anyone can paste a transaction hash or account name and see the
  real, permanent on-chain record. We use it so a certificate's anchoring is independently
  verifiable by anyone, without trusting our app.

  These are PURE functions (no React, no network) so they're trivial to unit-test.

  A note on "txId": our backend returns either
    - a REAL NEAR transaction hash (looks like a base58 string), once the contract is deployed
      and anchoring runs for real, OR
    - a placeholder starting with "local:" when NEAR is not configured (nothing is really
      on-chain yet). `isRealTxId` distinguishes them so the UI never links to a fake tx.
*/

export type NearNetwork = 'testnet' | 'mainnet';

/** The env-configured network, defaulting to testnet. Used when a caller doesn't pass one. */
export const CONFIGURED_NETWORK: NearNetwork =
  (import.meta.env.VITE_NEAR_NETWORK as NearNetwork) === 'mainnet' ? 'mainnet' : 'testnet';

/** The configured anchor contract account (empty until one is deployed). */
export const CONFIGURED_CONTRACT_ID: string = import.meta.env.VITE_NEAR_CONTRACT_ID || '';

/** The NearBlocks base URL for a network. testnet has its own subdomain. */
function explorerBase(network: NearNetwork): string {
  return network === 'mainnet' ? 'https://nearblocks.io' : 'https://testnet.nearblocks.io';
}

/**
 * True when `txId` is a real on-chain transaction hash (not our "local:" placeholder or empty).
 * Only real ids should be turned into clickable explorer links.
 */
export function isRealTxId(txId: string | null | undefined): txId is string {
  return !!txId && txId.length > 0 && !txId.startsWith('local:');
}

/**
 * A NearBlocks link to a transaction, or null if the id isn't a real on-chain tx.
 * e.g. https://testnet.nearblocks.io/txns/<hash>
 */
export function txExplorerUrl(
  txId: string | null | undefined,
  network: NearNetwork = CONFIGURED_NETWORK,
): string | null {
  if (!isRealTxId(txId)) return null;
  return `${explorerBase(network)}/txns/${encodeURIComponent(txId)}`;
}

/**
 * A NearBlocks link to an account/contract page (shows its balance, calls, and stored state),
 * or null if no account id is given.
 * e.g. https://testnet.nearblocks.io/address/<account>
 */
export function accountExplorerUrl(
  accountId: string | null | undefined,
  network: NearNetwork = CONFIGURED_NETWORK,
): string | null {
  if (!accountId) return null;
  return `${explorerBase(network)}/address/${encodeURIComponent(accountId)}`;
}

/** A short, human-friendly display of a long hash: first 6 + last 6 chars. */
export function shortHash(value: string | null | undefined, keep = 6): string {
  if (!value) return '';
  if (value.length <= keep * 2 + 1) return value;
  return `${value.slice(0, keep)}…${value.slice(-keep)}`;
}
