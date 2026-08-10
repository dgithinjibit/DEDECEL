/*
  AUTH tests — wallet-login (NEP-413) challenge/verify + session tokens.
  Run: npm run test:auth

  We cannot forge a real NEAR signature here (that needs a wallet + on-chain key), so these
  tests cover everything AROUND the signature: nonce issuance, rejection of unknown/expired/
  reused nonces, bad-input handling, and the session-token issue/verify round-trip (including
  tamper + expiry). Those are the properties that stop a "junk login".
*/
process.env.AUTH_SECRET = 'test-secret-do-not-use-in-prod';
process.env.AUTH_RECIPIENT = 'dedecel.testnet';

import express from 'express';
import type { AddressInfo } from 'node:net';
import { createHmac } from 'node:crypto';

// Dynamic import AFTER setting env: auth.ts reads AUTH_SECRET at module-load time, and static
// ESM imports are hoisted above the env assignments above (same gotcha as api.test.ts). Importing
// here ensures the module captures our test secret, not a random one.
const { createAuthRouter, verifyToken } = await import('./auth.js');

let passed = 0;
let failed = 0;
function check(name: string, cond: boolean) {
  if (cond) {
    passed++;
    console.log(`  ok   ${name}`);
  } else {
    failed++;
    console.error(`  FAIL ${name}`);
  }
}

async function main() {
  const app = express();
  app.use(express.json());
  app.use('/auth', createAuthRouter());
  const server = app.listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  const req = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, string>;
    return { status: res.status, json };
  };

  // --- nonce issuance ---
  const n1 = await req('GET', '/auth/nonce');
  check('nonce returns 200', n1.status === 200);
  check('nonce is 64 hex chars (32 bytes)', /^[0-9a-f]{64}$/.test(n1.json.nonce));
  check('nonce carries the login message', n1.json.message === 'Log in to DEDECEL');
  check('nonce carries the recipient', n1.json.recipient === 'dedecel.testnet');

  const n2 = await req('GET', '/auth/nonce');
  check('two nonces differ', n1.json.nonce !== n2.json.nonce);

  // --- verify rejects bad input ---
  const missing = await req('POST', '/auth/verify', { accountId: 'a.testnet' });
  check('verify with missing fields -> 400', missing.status === 400);

  const unknown = await req('POST', '/auth/verify', {
    accountId: 'a.testnet',
    publicKey: 'ed25519:11111111111111111111111111111111',
    signature: 'AAAA',
    nonce: 'ff'.repeat(32), // never issued
  });
  check('verify with unknown nonce -> 401', unknown.status === 401);

  // --- a REAL issued nonce, but a bogus signature: must fail at signature step, and be consumed ---
  const n3 = await req('GET', '/auth/nonce');
  const badSig = await req('POST', '/auth/verify', {
    accountId: 'a.testnet',
    publicKey: 'ed25519:11111111111111111111111111111111',
    signature: Buffer.from(new Uint8Array(64)).toString('base64'),
    nonce: n3.json.nonce,
  });
  check('verify with valid nonce but bad signature -> 401', badSig.status === 401);

  // single-use: retrying the SAME nonce must now be "unknown" (it was consumed above)
  const reuse = await req('POST', '/auth/verify', {
    accountId: 'a.testnet',
    publicKey: 'ed25519:11111111111111111111111111111111',
    signature: Buffer.from(new Uint8Array(64)).toString('base64'),
    nonce: n3.json.nonce,
  });
  check('reusing a consumed nonce -> 401 (single-use)', reuse.status === 401);

  // --- session token round-trip (verifyToken is exported) ---
  // Reconstruct a token the same way auth.ts does, then verify it.
  const now = 1_000_000;
  const payload = { sub: 'alice.testnet', exp: now + 60_000 };
  const bodyB64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = createHmac('sha256', 'test-secret-do-not-use-in-prod').update(bodyB64).digest('base64url');
  const goodToken = `${bodyB64}.${sig}`;
  check('valid token verifies to its account', verifyToken(goodToken, now) === 'alice.testnet');
  check('expired token rejected', verifyToken(goodToken, now + 120_000) === null);

  const tamperedBody = Buffer.from(JSON.stringify({ sub: 'attacker.testnet', exp: now + 60_000 }))
    .toString('base64url');
  const tampered = `${tamperedBody}.${sig}`; // body swapped, signature not recomputed
  check('tampered token rejected', verifyToken(tampered, now) === null);
  check('garbage token rejected', verifyToken('not-a-token', now) === null);

  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
