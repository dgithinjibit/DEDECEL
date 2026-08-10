/*
  WALLET LOGIN (NEP-413) — proves a browser really controls a NEAR account.

  WHY THIS EXISTS
  ---------------
  "Connecting" a wallet only tells us which account the browser SELECTED — a malicious
  client could claim any account id (this is the hole the old stub gate had). To actually
  authenticate, we use a challenge-response:

    1. GET  /auth/nonce            -> server invents a random 32-byte challenge, remembers it.
    2. (browser) wallet.signMessage({ message, recipient, nonce })  -> a signature.
    3. POST /auth/verify           -> server checks the signature AND that the signing key is
                                      a full-access key of the claimed account, then issues a
                                      short-lived session token.

  We verify using the SAME helpers the official NEAR wallet-selector ships, so there is no
  hand-rolled crypto here:
    - verifySignature(...)            -> is the NEP-413 signature valid for this payload?
    - verifyFullKeyBelongsToUser(...) -> does that public key really belong to the account?
                                         (an on-chain RPC lookup; blocks "I'll just claim
                                          alice.testnet" attacks)

  Jargon:
  - "nonce"  = a one-time random number. Signing it proves the signature is fresh (not replayed).
  - "NEP-413" = the NEAR standard for signing a plain message off-chain (no gas, no transaction).
  - "full-access key" = a key that fully controls an account (vs a limited function-call key).
*/

import { Router } from 'express';
import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { verifySignature, verifyFullKeyBelongsToUser } from '@near-wallet-selector/core';

/** The message the wallet shows the user when signing in. Human-readable on purpose. */
const LOGIN_MESSAGE = 'Log in to DEDECEL';

/**
 * Whether to require the signing key be a FULL-ACCESS key (strict NEP-413).
 * Default OFF, because most NEAR wallets (HOT, etc.) log dApps in with a *function-call* key —
 * requiring full-access would reject normal logins. With it off we still confirm the key BELONGS
 * to the claimed account (any permission), which blocks impersonation; we just don't demand it be
 * full-access. Set AUTH_REQUIRE_FULL_ACCESS_KEY=true for high-security deployments.
 */
const REQUIRE_FULL_ACCESS_KEY = process.env.AUTH_REQUIRE_FULL_ACCESS_KEY === 'true';

/** NEAR RPC endpoint for the configured network (used for the access-key ownership check). */
function rpcUrl(): string {
  return process.env.NEAR_NETWORK === 'mainnet'
    ? 'https://rpc.mainnet.near.org'
    : 'https://rpc.testnet.near.org';
}

/**
 * Confirm `publicKey` is an access key of `accountId` — ANY permission (full-access or
 * function-call). We ask the chain for that exact key via `view_access_key`: if it resolves, the
 * key is on the account (so the signer really controls it); if the node returns an error, the key
 * isn't there (an impersonation attempt) and we reject. This is the relaxed sibling of
 * verifyFullKeyBelongsToUser, which additionally demands permission === "FullAccess".
 */
async function verifyKeyBelongsToUser(publicKey: string, accountId: string): Promise<boolean> {
  try {
    const res = await fetch(rpcUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 'auth',
        method: 'query',
        params: {
          request_type: 'view_access_key',
          finality: 'final',
          account_id: accountId,
          public_key: publicKey,
        },
      }),
    });
    const data = (await res.json()) as { result?: { permission?: unknown }; error?: unknown };
    // A found key returns a `result` with a `permission`. A missing key returns `error`.
    return !!data.result && data.result.permission !== undefined && !data.error;
  } catch {
    return false;
  }
}

/** How long an unused nonce stays valid before we forget it. */
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/** How long a session token is valid after a successful login. */
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * In-memory store of outstanding challenges: nonceHex -> expiry timestamp.
 * Single-use: a nonce is deleted the moment it is verified (success OR failure), so it can
 * never be replayed. In-memory is fine for one server; move to Redis if you run several.
 */
const pendingNonces = new Map<string, number>();

/** Drop expired nonces so the map can't grow without bound. */
function sweepNonces(now: number) {
  for (const [hex, expiry] of pendingNonces) {
    if (expiry <= now) pendingNonces.delete(hex);
  }
}

/**
 * The secret used to sign session tokens. Set AUTH_SECRET in production; otherwise we derive a
 * per-process random one (tokens then simply stop being valid after a restart — safe, if less
 * convenient). NEVER commit a real secret.
 */
const AUTH_SECRET = process.env.AUTH_SECRET || randomBytes(32).toString('hex');

/**
 * A tiny signed token: base64url(payloadJson) + "." + hmac. Not a full JWT, but the same idea —
 * the server can later confirm it issued this token and that it hasn't expired or been edited.
 */
function issueToken(accountId: string, nowMs: number): string {
  const payload = { sub: accountId, exp: nowMs + SESSION_TTL_MS };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', AUTH_SECRET).update(body).digest('base64url');
  return `${body}.${sig}`;
}

/** Verify a token we issued. Returns the account id if valid + unexpired, else null. */
export function verifyToken(token: string, nowMs: number): string | null {
  const dot = token.indexOf('.');
  if (dot < 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac('sha256', AUTH_SECRET).update(body).digest('base64url');
  // Constant-time compare to avoid leaking the signature via timing.
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (typeof payload.exp !== 'number' || payload.exp <= nowMs) return null;
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

/**
 * The `recipient` bound into the signed payload. The wallet shows it to the user and it becomes
 * part of what they sign, so a signature for another app can't be replayed here. Set
 * AUTH_RECIPIENT to your app/contract id in production (e.g. "dedecel.testnet").
 */
const RECIPIENT = process.env.AUTH_RECIPIENT || 'dedecel.testnet';

/** testnet | mainnet — must match the network the wallet signed on (for the on-chain key check). */
const NETWORK_ID = (process.env.NEAR_NETWORK === 'mainnet' ? 'mainnet' : 'testnet') as
  | 'testnet'
  | 'mainnet';

/**
 * Build the auth router. Uses `now` (a function) so tests can control time; defaults to Date.now.
 */
export function createAuthRouter(now: () => number = () => Date.now()): Router {
  const router = Router();

  // Step 1: hand out a fresh challenge. The browser must sign exactly this nonce + message.
  router.get('/nonce', (_req, res) => {
    const t = now();
    sweepNonces(t);
    const nonce = randomBytes(32); // NEP-413 requires a 32-byte nonce.
    const nonceHex = nonce.toString('hex');
    pendingNonces.set(nonceHex, t + NONCE_TTL_MS);
    res.json({
      nonce: nonceHex, // the browser turns this back into 32 bytes to sign
      message: LOGIN_MESSAGE,
      recipient: RECIPIENT,
    });
  });

  // Step 3: verify the signed challenge and issue a session token.
  router.post('/verify', async (req, res) => {
    const t = now();
    sweepNonces(t);

    const { accountId, publicKey, signature, nonce } = req.body ?? {};
    if (
      typeof accountId !== 'string' ||
      typeof publicKey !== 'string' ||
      typeof signature !== 'string' ||
      typeof nonce !== 'string'
    ) {
      return res.status(400).json({ error: 'accountId, publicKey, signature, nonce are required' });
    }

    // The nonce must be one WE issued and haven't consumed yet. Consume it now (single-use)
    // regardless of the outcome below, so it can never be retried.
    const expiry = pendingNonces.get(nonce);
    pendingNonces.delete(nonce);
    if (!expiry || expiry <= t) {
      return res.status(401).json({ error: 'unknown or expired challenge — request a new nonce' });
    }

    const nonceBuf = Buffer.from(nonce, 'hex');
    if (nonceBuf.length !== 32) {
      return res.status(400).json({ error: 'malformed nonce' });
    }

    // (a) Is the signature itself valid for the exact payload the user was asked to sign?
    let signatureValid = false;
    try {
      signatureValid = verifySignature({
        publicKey,
        signature,
        message: LOGIN_MESSAGE,
        nonce: nonceBuf,
        recipient: RECIPIENT,
      });
    } catch {
      signatureValid = false;
    }
    if (!signatureValid) {
      return res.status(401).json({ error: 'signature does not match the challenge' });
    }

    // (b) Does that public key actually belong to the claimed account? This is the check that
    // stops someone signing with their OWN key but claiming to be someone else. It's an on-chain
    // RPC lookup. By default we accept ANY key on the account (works with HOT & most wallets,
    // which log in with a function-call key). Strict mode additionally demands a full-access key.
    let keyBelongs = false;
    try {
      keyBelongs = REQUIRE_FULL_ACCESS_KEY
        ? await verifyFullKeyBelongsToUser({
            publicKey,
            accountId,
            network: {
              networkId: NETWORK_ID,
              nodeUrl: NETWORK_ID === 'mainnet'
                ? 'https://rpc.mainnet.near.org'
                : 'https://rpc.testnet.near.org',
            } as never,
          })
        : await verifyKeyBelongsToUser(publicKey, accountId);
    } catch {
      keyBelongs = false;
    }
    if (!keyBelongs) {
      // Common cause: a MAINNET wallet (e.g. a HOT `.tg` or a `.near` account) signing into a
      // TESTNET app (or vice-versa). Detect the likely mismatch and say so plainly, instead of
      // the cryptic "key doesn't belong" — the key is real, it's just on the other network.
      const looksMainnet = accountId.endsWith('.tg') || accountId.endsWith('.near');
      const looksTestnet = accountId.endsWith('.testnet');
      const mismatch =
        (NETWORK_ID === 'testnet' && looksMainnet) || (NETWORK_ID === 'mainnet' && looksTestnet);
      if (mismatch) {
        return res.status(401).json({
          error: `This looks like a ${looksMainnet ? 'mainnet' : 'testnet'} account, but the app is on ${NETWORK_ID}. Use a ${NETWORK_ID} account to log in.`,
        });
      }
      return res.status(401).json({
        error: REQUIRE_FULL_ACCESS_KEY
          ? 'that key is not a full-access key of this account'
          : 'that key does not belong to this account',
      });
    }

    // Success: issue a session token the frontend stores and sends on future calls.
    const token = issueToken(accountId, t);
    // A stable, non-reversible id for the account (handy for logs without storing the raw id).
    const accountRef = createHash('sha256').update(accountId).digest('hex').slice(0, 12);
    return res.json({ token, accountId, accountRef, expiresInMs: SESSION_TTL_MS });
  });

  return router;
}
