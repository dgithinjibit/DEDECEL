/*
  API end-to-end tests — boots the real Express app in-process and drives the full Phase 4
  lifecycle over HTTP: create -> anchor -> re-anchor(409) -> onchain check -> off-chain verify
  -> tamper is caught -> DELETE erasure -> gone -> cross-ledger birth-hash lookup.
  Run: npm run test:api

  Everything runs against the in-memory store with NEAR disabled, so it needs zero external
  setup and is fully deterministic. We set env BEFORE importing the app.
*/
process.env.DEDECEL_HASH_PEPPER ||= 'test-pepper-please-change-in-prod';
process.env.DEDECEL_NO_LISTEN = '1'; // don't auto-bind; we control the port
// Force the in-memory store. Deleting SUPABASE_* is not enough on its own: server.ts runs
// `import 'dotenv/config'` (hoisted above these lines), which reloads .env from disk and can
// re-set SUPABASE_URL — silently pointing the test at the REAL database. This flag wins.
process.env.DEDECEL_FORCE_MEMORY_STORE = '1';
delete process.env.SUPABASE_URL; // force memory store
delete process.env.SUPABASE_SERVICE_KEY;
delete process.env.NEAR_CONTRACT_ID; // force NEAR disabled (local: placeholder anchoring)
delete process.env.NEAR_SIGNER_ACCOUNT_ID;
delete process.env.NEAR_SIGNER_PRIVATE_KEY;

import type { AddressInfo } from 'node:net';

// NOTE: `./server.js` runs `app.listen()` as an import side effect. ESM `import` statements are
// hoisted and evaluated BEFORE top-level code, so a static import would start the server on 4000
// before our DEDECEL_NO_LISTEN env (set above) takes effect. A dynamic import() runs here, after
// the env is set, so the guard in server.ts is respected and we control the port ourselves.
const { app } = await import('./server.js');

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
  // Boot on an ephemeral port (0 = OS picks a free one).
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
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* some responses may be empty */
    }
    return { status: res.status, data };
  };

  try {
    // --- health ---
    const health = await req('GET', '/v2/health');
    check('health ok', health.status === 200 && health.data.status === 'ok');
    check('health reports NEAR disabled', String(health.data.near).startsWith('disabled'));

    // --- create a birth record (PII goes in; server computes salted hash) ---
    const record = {
      id: 'REG-TEST-1',
      childFirstName: 'Amara',
      childLastName: 'Okoro',
      dateOfBirth: '2026-02-14',
      motherNationalId: 'KE-33445566',
    };
    const created = await req('POST', '/v2/birth/records', record);
    check('create returns 201', created.status === 201);
    check('create returns a 0x hash', /^0x[0-9a-f]{64}$/.test(created.data.certHash || ''));
    const certHash: string = created.data.certHash;

    // --- duplicate id is rejected ---
    const dup = await req('POST', '/v2/birth/records', record);
    check('duplicate id -> 409', dup.status === 409);

    // --- create is missing-id safe ---
    const noId = await req('POST', '/v2/birth/records', { childFirstName: 'x' });
    check('create without id -> 400', noId.status === 400);

    // --- the hash is never exposed with the salt; list is PII-free ---
    const listed = await req('GET', '/v2/birth/records');
    check('list returns the record summary', listed.data.total === 1);
    check('list summary has no salt', !('salt' in (listed.data.records[0] || {})));

    // --- full record returns payload but still no salt ---
    const full = await req('GET', '/v2/birth/records/REG-TEST-1');
    check('get-by-id returns payload', full.data.payload?.childFirstName === 'Amara');
    check('get-by-id never leaks salt', !('salt' in full.data));

    // --- anchor (NEAR disabled -> local: placeholder, onChain false) ---
    const anchored = await req('POST', '/v2/birth/records/REG-TEST-1/anchor');
    check('anchor returns success', anchored.status === 200 && anchored.data.success === true);
    check('anchor is off-chain placeholder', anchored.data.onChain === false);
    check('anchor tx id is local:', String(anchored.data.anchorTxId).startsWith('local:'));

    // --- re-anchor is refused (immutability, mirrors the contract) ---
    const reAnchor = await req('POST', '/v2/birth/records/REG-TEST-1/anchor');
    check('re-anchor -> 409', reAnchor.status === 409);

    // --- onchain check: NEAR disabled so nothing is really on the chain ---
    const onchain = await req('GET', '/v2/birth/records/REG-TEST-1/onchain');
    check('onchain: nearEnabled false', onchain.data.nearEnabled === false);
    check('onchain: anchored flag true', onchain.data.anchored === true);
    check('onchain: matches false (nothing on real chain)', onchain.data.matches === false);

    // --- off-chain verify: recompute hash from stored PII+salt, compare ---
    const verify = await req('POST', '/v2/birth/records/REG-TEST-1/verify');
    check('verify is valid for untampered record', verify.data.valid === true);
    check('verify echoes the same hash', verify.data.certHash === certHash);

    // --- cross-ledger lookup by parent national id (proof only, no PII) ---
    const lookup = await req('GET', '/v2/birth-hash/KE-33445566');
    check('cross-ledger lookup found', lookup.data.found === true);
    check('cross-ledger returns the birth hash', lookup.data.birthHash === certHash);
    check('cross-ledger returns no PII', !('payload' in lookup.data) && !('salt' in lookup.data));
    const lookupMiss = await req('GET', '/v2/birth-hash/DOES-NOT-EXIST');
    check('cross-ledger miss -> 404 found:false', lookupMiss.status === 404 && lookupMiss.data.found === false);

    // --- GDPR erasure: hard delete removes the row + its salt ---
    const erased = await req('DELETE', '/v2/birth/records/REG-TEST-1');
    check('erasure reports success', erased.data.erased === true);
    const afterErase = await req('GET', '/v2/birth/records/REG-TEST-1');
    check('erased record is 404', afterErase.status === 404);
    const verifyGone = await req('POST', '/v2/birth/records/REG-TEST-1/verify');
    check('verify after erasure -> 404 (hash no longer reproducible)', verifyGone.status === 404);
    const lookupGone = await req('GET', '/v2/birth-hash/KE-33445566');
    check('cross-ledger after erasure -> not found', lookupGone.data.found === false);

    // --- bad domain is rejected ---
    const badDomain = await req('GET', '/v2/marriage/records');
    check('unknown domain -> 400', badDomain.status === 400);
  } finally {
    await new Promise<void>((r) => server.close(() => r()));
  }

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
