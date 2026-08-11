/*
  POSEIDON commitment tests — the ZK-friendly fingerprint (slice 3).
  Run: npm run test:poseidon

  Properties checked:
    - deterministic: same record + same salt -> same commitment
    - binding: changing the record OR the salt changes the commitment
    - in-field: the commitment is a valid BN254 field element (0 <= c < p)
    - witness parts are self-consistent (recomputing Poseidon(saltField,hi,lo) gives commitment)
*/
export {}; // make this a module so top-level await is allowed
process.env.DEDECEL_HASH_PEPPER ||= 'test-pepper-please-change-in-prod';

const { poseidon3 } = await import('poseidon-lite');
const { poseidonCommitment, poseidonWitnessParts, BN254_FIELD_PRIME } = await import('./poseidon.js');
const { generateSalt } = await import('./hashing.js');

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

const recA = { id: 'CERT-1', deceasedName: 'Jane Doe', dateOfDeath: '2026-01-01' };
const recB = { id: 'CERT-1', deceasedName: 'Jane Roe', dateOfDeath: '2026-01-01' }; // one field changed
const salt1 = 'a'.repeat(64);
const salt2 = 'b'.repeat(64);

// deterministic
const c1 = poseidonCommitment(recA, salt1);
const c1again = poseidonCommitment(recA, salt1);
check('deterministic: same record+salt -> same commitment', c1 === c1again);

// key-order independence (canonicalize) — reordering fields must not change the commitment
const recAreordered = { dateOfDeath: '2026-01-01', id: 'CERT-1', deceasedName: 'Jane Doe' };
check('key order does not matter', poseidonCommitment(recAreordered, salt1) === c1);

// binding to record
check('different record -> different commitment', poseidonCommitment(recB, salt1) !== c1);

// binding to salt
check('different salt -> different commitment', poseidonCommitment(recA, salt2) !== c1);

// in-field
const asBig = BigInt(c1);
check('commitment is a valid field element (0 <= c < p)', asBig >= 0n && asBig < BN254_FIELD_PRIME);

// witness parts self-consistency
const w = poseidonWitnessParts(recA, salt1);
check('witness commitment matches', w.commitment === c1);
const recomputed = poseidon3([BigInt(w.saltField), BigInt(w.digestHi), BigInt(w.digestLo)]).toString();
check('recomputing Poseidon(saltField,hi,lo) == commitment', recomputed === c1);

// limbs are within 128 bits
check('digestHi < 2^128', BigInt(w.digestHi) < (1n << 128n));
check('digestLo < 2^128', BigInt(w.digestLo) < (1n << 128n));

// works with a fresh random salt too (no crash, in-field)
const rs = generateSalt();
const cr = poseidonCommitment(recA, rs);
check('random salt: commitment in-field', BigInt(cr) >= 0n && BigInt(cr) < BN254_FIELD_PRIME);

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
