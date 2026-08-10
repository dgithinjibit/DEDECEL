/*
  Tiny self-contained test for the hashing service. Run: npm run test:hash
  (Sets a throwaway pepper so it runs without external config.)
*/
process.env.DEDECEL_HASH_PEPPER ||= 'test-pepper-please-change-in-prod';

import { generateSalt, hashCertificate, verifyCertificate, canonicalize } from './hashing.js';

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

const record = {
  id: 'REG-2026-0001',
  childFirstName: 'Amara',
  childLastName: 'Okoro',
  dateOfBirth: '2026-02-14',
  motherNationalId: 'KE-33445566',
};

const salt = generateSalt();
const h1 = hashCertificate(record, salt);

// 1. Deterministic: same record + salt → same hash.
check('deterministic for same input', hashCertificate(record, salt) === h1);

// 2. Key order doesn't matter (canonicalization).
const reordered = {
  motherNationalId: 'KE-33445566',
  dateOfBirth: '2026-02-14',
  childLastName: 'Okoro',
  childFirstName: 'Amara',
  id: 'REG-2026-0001',
};
check('stable under key reordering', hashCertificate(reordered, salt) === h1);
check('canonicalize sorts keys', canonicalize(record) === canonicalize(reordered));

// 3. Different salt → different hash (defeats cross-record brute force).
check('salt changes the hash', hashCertificate(record, generateSalt()) !== h1);

// 4. Tamper detection: change one field → hash no longer verifies.
const tampered = { ...record, dateOfBirth: '2026-02-15' };
check('verify passes for original', verifyCertificate(record, salt, h1) === true);
check('verify fails for tampered', verifyCertificate(tampered, salt, h1) === false);

// 5. Output shape.
check('hash is 0x + 64 hex chars', /^0x[0-9a-f]{64}$/.test(h1));

// 6. Salt is 64 hex chars (256 bits).
check('salt is 256-bit hex', /^[0-9a-f]{64}$/.test(salt));

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
