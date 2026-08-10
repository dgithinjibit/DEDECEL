/*
  Store tests — exercises the in-memory CertStore (the zero-setup dev backend).
  Run: npm run test:store

  These check the data-layer contract the API relies on: insert, read, list ordering,
  update (anchor fields), HARD delete (GDPR erasure), and the cross-ledger birth lookup.
  We force the memory store by clearing any Supabase env so this never touches a real DB.
*/
delete process.env.SUPABASE_URL;
delete process.env.SUPABASE_SERVICE_KEY;

import { createStore, StoredCert } from './store.js';

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

/** Build a minimal valid row for tests. */
function row(id: string, extra: Partial<StoredCert> = {}): StoredCert {
  const now = new Date().toISOString();
  return {
    id,
    payload: { id, sample: true },
    salt: 'deadbeef'.repeat(8),
    cert_hash: `0x${'a'.repeat(64)}`,
    status: 'DRAFT',
    anchor_tx_id: null,
    anchored_at: null,
    national_id: null,
    mother_national_id: null,
    father_national_id: null,
    created_at: now,
    updated_at: now,
    ...extra,
  };
}

async function main() {
  const store = createStore();
  check('memory store selected (no Supabase env)', store.backendName().startsWith('memory'));

  // --- insert + getById ---
  await store.insert('DEATH', row('D-1', { national_id: 'NID-1' }));
  const got = await store.getById('DEATH', 'D-1');
  check('insert then getById returns the row', got?.id === 'D-1');
  check('getById unknown id returns null', (await store.getById('DEATH', 'nope')) === null);

  // --- domains are isolated ---
  check('birth domain does not see death row', (await store.getById('BIRTH', 'D-1')) === null);

  // --- list ordering: newest first (created_at desc) ---
  await store.insert('DEATH', row('D-2', { created_at: '2999-01-01T00:00:00.000Z' }));
  const list = await store.list('DEATH');
  check('list returns both death rows', list.length === 2);
  check('list is newest-first', list[0].id === 'D-2');

  // --- update: set anchor fields (the anchoring path) ---
  const updated = await store.update('DEATH', 'D-1', {
    anchor_tx_id: 'tx-abc',
    anchored_at: '2026-01-01T00:00:00.000Z',
  });
  check('update returns the patched row', updated?.anchor_tx_id === 'tx-abc');
  check('update bumps updated_at', !!updated && updated.updated_at !== updated.created_at);
  check('update unknown id returns null', (await store.update('DEATH', 'nope', {})) === null);

  // --- cross-ledger birth lookup (case-insensitive on parent national id) ---
  await store.insert(
    'BIRTH',
    row('B-1', { mother_national_id: 'KE-777', father_national_id: 'KE-888' })
  );
  const byMother = await store.findBirthByNationalId('ke-777'); // lowercase on purpose
  check('findBirthByNationalId matches mother (case-insensitive)', byMother?.id === 'B-1');
  const byFather = await store.findBirthByNationalId('KE-888');
  check('findBirthByNationalId matches father', byFather?.id === 'B-1');
  check('findBirthByNationalId miss returns null', (await store.findBirthByNationalId('ZZ')) === null);

  // --- HARD delete = GDPR erasure: row and its secret salt are gone ---
  const removed = await store.remove('DEATH', 'D-1');
  check('remove returns true when a row existed', removed === true);
  check('erased row is unreadable afterwards', (await store.getById('DEATH', 'D-1')) === null);
  check('remove returns false for missing row', (await store.remove('DEATH', 'D-1')) === false);

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
