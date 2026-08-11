/*
  NEAR ENCODING tests — the snarkjs→NEAR little-endian re-encoding (ZK slice 2).
  Run: npm run test:near-encoding

  Properties checked:
    - field elements encode to 32-byte LITTLE-endian (LSB first), reduced mod the BN254 field
    - LE bytes round-trip back to the same integer
    - G1 = 64 bytes (x‖y), G2 = 128 bytes with c0-before-c1 ordering (the porting footgun)
    - negateG1 computes (x, -y mod q) and is an involution
    - encodeProofForNear emits negA(64)/b(128)/c(64) with A actually negated, and LE32 signals
*/
export {}; // make this a module so top-level await is allowed

const { fieldToLe32, g1ToLe, g2ToLe, negateG1, encodeProofForNear, toHex } = await import(
  './near-encoding.js'
);

const FQ =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

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

function leToBig(le: Uint8Array): bigint {
  let n = 0n;
  for (let i = le.length - 1; i >= 0; i--) n = (n << 8n) | BigInt(le[i]);
  return n;
}

// --- fieldToLe32 ---
check('1 encodes LSB-first as 01 00 00…', (() => {
  const b = fieldToLe32('1');
  return b[0] === 1 && b[1] === 0 && b[2] === 0;
})());
check('256 encodes as 00 01 00…', (() => {
  const b = fieldToLe32('256');
  return b[0] === 0 && b[1] === 1 && b[2] === 0;
})());
check('field element is exactly 32 bytes', fieldToLe32('0').length === 32 && fieldToLe32((FQ - 1n).toString()).length === 32);
check('LE bytes round-trip to the same integer', (() => {
  const v = 123456789012345678901234567890n;
  return leToBig(fieldToLe32(v.toString())) === v;
})());
check('value is reduced mod the field (FQ ≡ 0)', fieldToLe32(FQ.toString()).every((x) => x === 0));
check('accepts 0x-hex input', (() => {
  const a = fieldToLe32('0x100');
  const b = fieldToLe32('256');
  return a.every((x, i) => x === b[i]);
})());

// --- point encoders ---
check('G1 is 64 bytes (x‖y)', g1ToLe(['1', '2', '1']).length === 64);
check('G2 is 128 bytes (x.c0‖x.c1‖y.c0‖y.c1)', g2ToLe([['1', '2'], ['3', '4'], ['1', '0']]).length === 128);
check('G2 lays out c0 before c1', (() => {
  const b = g2ToLe([['1', '2'], ['3', '4'], ['1', '0']]);
  return b[0] === 1 && b[32] === 2 && b[64] === 3 && b[96] === 4;
})());

// --- negateG1 ---
check('negateG1 keeps x and sets y = -y mod q', (() => {
  const p = negateG1(['5', '7', '1']);
  return p[0] === '5' && BigInt(p[1]) === FQ - 7n;
})());
check('negateG1 is an involution', (() => {
  const twice = negateG1(negateG1(['5', '7', '1']));
  return BigInt(twice[1]) === 7n;
})());

// --- encodeProofForNear ---
check('encodeProofForNear shapes + negation', (() => {
  const proof = {
    pi_a: ['5', '7', '1'] as [string, string, string],
    pi_b: [['1', '2'], ['3', '4'], ['1', '0']] as [[string, string], [string, string], [string, string]],
    pi_c: ['9', '11', '1'] as [string, string, string],
  };
  const enc = encodeProofForNear(proof, ['42']);
  const yBytes = enc.negA.slice(32, 64);
  return (
    enc.negA.length === 64 &&
    enc.b.length === 128 &&
    enc.c.length === 64 &&
    enc.publicSignals.length === 1 &&
    enc.publicSignals[0].length === 32 &&
    enc.publicSignals[0][0] === 42 &&
    leToBig(yBytes) === FQ - 7n
  );
})());

// --- toHex ---
check('toHex is lowercase, no 0x, 2 chars/byte', toHex(new Uint8Array([0, 1, 255, 16])) === '0001ff10');

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
