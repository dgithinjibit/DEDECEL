/*
  ZK proof tests — end-to-end through the backend zk module + verify router.
  Run: npm run test:zk

  Requires the circuit artifacts (circuits/build/*). If they're missing, the test SKIPS with a
  clear message rather than failing — so `test:all` still passes on a checkout that hasn't run the
  circuit build. When present, it proves the real Groth16 pipeline works via the module.

  Checks: prove a stored cert -> proof verifies; public commitment == the record's Poseidon
  commitment; a tampered public signal is rejected; binding to the wrong cert fails.
*/
export {}; // module (top-level await)
process.env.DEDECEL_FORCE_MEMORY_STORE = '1';
process.env.DEDECEL_HASH_PEPPER ||= 'test-pepper-please-change-in-prod';

const { zkAvailable, proveCommitment, verifyProof } = await import('./zk.js');
const { poseidonCommitment } = await import('./poseidon.js');

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
  if (!zkAvailable()) {
    console.log('  SKIP zk tests — circuit artifacts not built (run: npm --prefix circuits run build)');
    console.log('\n0 passed, 0 failed (skipped)');
    return;
  }

  const record = { id: 'ZK-CERT-1', deceasedName: 'Grace Hopper', dateOfDeath: '2026-05-05' };
  const salt = 'c0ffee42'.repeat(8);

  const expectedCommitment = poseidonCommitment(record, salt);

  // 1) Prove.
  const { proof, publicSignals, commitment } = await proveCommitment(record, salt);
  check('proof generated', !!proof && Array.isArray(publicSignals) && publicSignals.length === 1);
  check('public commitment matches off-chain Poseidon commitment', commitment === expectedCommitment);

  // 2) Verify (valid).
  const v1 = await verifyProof(proof, publicSignals);
  check('valid proof verifies', v1.valid === true);

  // 3) Verify bound to the correct expected commitment.
  const v2 = await verifyProof(proof, publicSignals, expectedCommitment);
  check('valid proof verifies when bound to correct commitment', v2.valid === true);

  // 4) Bind to a WRONG commitment -> reject.
  const v3 = await verifyProof(proof, publicSignals, '12345');
  check('proof rejected when bound to wrong commitment', v3.valid === false);

  // 5) Tampered public signal -> reject.
  const tampered = [ (BigInt(publicSignals[0]) + 1n).toString() ];
  const v4 = await verifyProof(proof, tampered);
  check('tampered public signal rejected', v4.valid === false);

  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// snarkjs keeps a worker thread alive, so force a clean exit once tests finish.
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
