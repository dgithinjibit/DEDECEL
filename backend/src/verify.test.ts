/*
  VERIFY API tests — the external, PII-free verification router (/verify/v1).
  Run: npm run test:verify

  Focus:
    - the API-key gate (open when unset; enforced when VERIFY_API_KEYS is set)
    - the three lookups (cert/:domain/:id, by-national-id/:nid, check-hash)
    - the SECURITY invariant: responses NEVER contain payload or salt.

  We use the in-memory store (no Supabase env set) so this runs with zero setup, and seed it via
  the store interface directly — this tests the router in isolation from HTTP body-parsing quirks.
*/

// Force the in-memory store regardless of any SUPABASE_* in .env (see store.ts for why).
process.env.DEDECEL_FORCE_MEMORY_STORE = '1';

import express from 'express';
import type { AddressInfo } from 'node:net';

// Import AFTER any env we need is set. verify.ts reads VERIFY_API_KEYS at REQUEST time (not load),
// so we can flip it per-test; the store falls back to memory because no SUPABASE_* env is set.
const { createStore } = await import('./store.js');
const { createVerifyRouter } = await import('./verify.js');

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
  const store = createStore();

  // Seed two records: one anchored death cert, one un-anchored birth cert. Each carries a
  // `payload` + `salt` we will assert NEVER appear in any response.
  const SECRET_SALT = 'SALT-must-never-leak';
  const SECRET_PII = { deceasedName: 'Jane Doe', nationalId: 'NID-777', cause: 'SECRET' };
  await store.insert('DEATH', {
    id: 'CERT-DEATH-1',
    payload: SECRET_PII,
    salt: SECRET_SALT,
    cert_hash: 'abc123deathhash',
    status: 'SEALED',
    anchor_tx_id: 'FAKE_NEAR_TX_9',
    anchored_at: '2026-01-01T00:00:00.000Z',
    national_id: 'NID-777',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  });
  await store.insert('BIRTH', {
    id: 'CERT-BIRTH-1',
    payload: { childFirstName: 'Baby', motherNationalId: 'NID-555' },
    salt: 'another-secret-salt',
    cert_hash: 'def456birthhash',
    status: 'Pending_Registrar_Seal',
    anchor_tx_id: null,
    anchored_at: null,
    mother_national_id: 'NID-555',
    created_at: '2026-01-02T00:00:00.000Z',
    updated_at: '2026-01-02T00:00:00.000Z',
  });

  const app = express();
  app.use(express.json());
  app.use('/verify/v1', createVerifyRouter(store));
  const server = app.listen(0);
  await new Promise<void>((r) => server.once('listening', () => r()));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  const req = async (method: string, path: string, body?: unknown, headers?: Record<string, string>) => {
    const res = await fetch(`${base}${path}`, {
      method,
      headers: { ...(body ? { 'Content-Type': 'application/json' } : {}), ...(headers ?? {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json: Record<string, unknown> = {};
    try {
      json = JSON.parse(text);
    } catch {
      /* non-JSON */
    }
    return { status: res.status, json, raw: text };
  };

  // The invariant: no response body may ever contain the salt or raw PII markers.
  const leaksSecrets = (raw: string) =>
    raw.includes(SECRET_SALT) ||
    raw.includes('another-secret-salt') ||
    raw.includes('Jane Doe') ||
    raw.includes('"payload"') ||
    raw.includes('"salt"');

  // ---- health is ungated ----
  const h = await req('GET', '/verify/v1/health');
  check('health 200', h.status === 200);
  check('health reports store', typeof h.json.store === 'string');

  // ---- OPEN mode (VERIFY_API_KEYS unset) ----
  delete process.env.VERIFY_API_KEYS;
  const openCert = await req('GET', '/verify/v1/cert/death/CERT-DEATH-1');
  check('open: cert lookup 200', openCert.status === 200);
  check('open: cert is anchored', openCert.json.anchored === true);
  check('open: cert exposes certHash', openCert.json.certHash === 'abc123deathhash');
  check('open: cert does NOT leak secrets', !leaksSecrets(openCert.raw));

  // ---- key ENFORCED mode ----
  process.env.VERIFY_API_KEYS = 'good-key-1,good-key-2';
  const noKey = await req('GET', '/verify/v1/cert/death/CERT-DEATH-1');
  check('gate: missing key -> 401', noKey.status === 401);
  const badKey = await req('GET', '/verify/v1/cert/death/CERT-DEATH-1', undefined, { 'x-api-key': 'nope' });
  check('gate: wrong key -> 401', badKey.status === 401);
  const goodKey = await req('GET', '/verify/v1/cert/death/CERT-DEATH-1', undefined, { 'x-api-key': 'good-key-2' });
  check('gate: valid key -> 200', goodKey.status === 200);
  check('gate: valid key result correct', goodKey.json.id === 'CERT-DEATH-1');

  const KEY = { 'x-api-key': 'good-key-1' };

  // ---- cert lookup edge cases ----
  const missing = await req('GET', '/verify/v1/cert/death/DOES-NOT-EXIST', undefined, KEY);
  check('cert: missing -> 404 found:false', missing.status === 404 && missing.json.found === false);
  const badDomain = await req('GET', '/verify/v1/cert/marriage/x', undefined, KEY);
  check('cert: bad domain -> 400', badDomain.status === 400);

  const birth = await req('GET', '/verify/v1/cert/birth/CERT-BIRTH-1', undefined, KEY);
  check('cert: un-anchored birth anchored:false', birth.json.anchored === false);
  check('cert: birth does NOT leak secrets', !leaksSecrets(birth.raw));

  // ---- by-national-id ----
  const byNid = await req('GET', '/verify/v1/by-national-id/NID-777', undefined, KEY);
  check('by-nid: found', byNid.status === 200 && byNid.json.found === true);
  check('by-nid: returns hash', byNid.json.certHash === 'abc123deathhash');
  check('by-nid: does NOT leak secrets', !leaksSecrets(byNid.raw));
  const byNidMiss = await req('GET', '/verify/v1/by-national-id/NID-000', undefined, KEY);
  check('by-nid: missing -> 404', byNidMiss.status === 404 && byNidMiss.json.found === false);

  // ---- check-hash ----
  const hMatch = await req('POST', '/verify/v1/check-hash', { certHash: 'abc123deathhash' }, KEY);
  check('check-hash: match true', hMatch.json.matches === true && hMatch.json.domain === 'DEATH');
  const hMiss = await req('POST', '/verify/v1/check-hash', { certHash: 'zzz-not-real' }, KEY);
  check('check-hash: no match', hMiss.json.matches === false);
  const hBirth = await req('POST', '/verify/v1/check-hash', { certHash: 'def456birthhash', domain: 'birth' }, KEY);
  check('check-hash: birth domain scoped match', hBirth.json.matches === true && hBirth.json.domain === 'BIRTH');
  const hNoBody = await req('POST', '/verify/v1/check-hash', {}, KEY);
  check('check-hash: missing hash -> 400', hNoBody.status === 400);
  check('check-hash: does NOT leak secrets', !leaksSecrets(hMatch.raw));

  server.close();
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
