#!/usr/bin/env node
/*
  prove-example.mjs — end-to-end proof of the cert_commitment circuit.

  Demonstrates the full ZK flow with a sample certificate:
    1. compute the Poseidon witness parts the SAME way the backend does,
    2. generate a Groth16 proof (snarkjs fullProve) using the wasm + final zkey,
    3. verify it against the verification key,
    4. show that the public signal equals the commitment (and that a WRONG commitment fails).

  Run after `npm run build`. This is the reference the backend's proof endpoint mirrors.
*/
import { poseidon3 } from 'poseidon-lite';
import * as snarkjs from 'snarkjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const build = resolve(here, '..', 'build');
const WASM = resolve(build, 'cert_commitment_js', 'cert_commitment.wasm');
const ZKEY = resolve(build, 'cert_commitment_final.zkey');
const VKEY = JSON.parse(readFileSync(resolve(build, 'verification_key.json'), 'utf8'));

const FIELD =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

// --- mirror backend/src/poseidon.ts witness derivation (kept in sync deliberately) ---
function hexToBig(hex) {
  const c = hex.startsWith('0x') ? hex.slice(2) : hex;
  return c.length ? BigInt(`0x${c}`) : 0n;
}
function witnessParts(record, salt, pepper) {
  const canonical = JSON.stringify(sortDeep(record));
  const sha = '0x' + createHash('sha256').update(`bidecel-v1|${pepper}|${salt}|${canonical}`, 'utf8').digest('hex');
  const digest = hexToBig(sha);
  const mask = (1n << 128n) - 1n;
  const lo = digest & mask;
  const hi = (digest >> 128n) & mask;
  const saltField = hexToBig(salt) % FIELD;
  const commitment = poseidon3([saltField, hi, lo]).toString();
  return { saltField: saltField.toString(), digestHi: hi.toString(), digestLo: lo.toString(), commitment };
}
function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === 'object') return Object.keys(v).sort().reduce((a, k) => ((a[k] = sortDeep(v[k])), a), {});
  return v;
}

async function main() {
  const record = { id: 'CERT-DEMO-1', deceasedName: 'Ada Lovelace', dateOfDeath: '2026-04-04' };
  const salt = 'a1b2c3d4'.repeat(8);
  const pepper = 'demo-pepper-please-change';

  const w = witnessParts(record, salt, pepper);
  console.log('commitment (public):', w.commitment);

  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { saltField: w.saltField, digestHi: w.digestHi, digestLo: w.digestLo },
    WASM,
    ZKEY
  );
  console.log('public signals:', publicSignals);

  const ok = await snarkjs.groth16.verify(VKEY, publicSignals, proof);
  console.log('proof verifies:', ok);

  const signalMatches = publicSignals[0] === w.commitment;
  console.log('public signal == commitment:', signalMatches);

  // Negative check: verifying against a tampered public signal must fail.
  const tampered = [ (BigInt(publicSignals[0]) + 1n).toString() ];
  const bad = await snarkjs.groth16.verify(VKEY, tampered, proof);
  console.log('tampered commitment rejected:', bad === false);

  if (!(ok && signalMatches && bad === false)) {
    console.error('\nFAIL: proof pipeline did not behave as expected');
    process.exit(1);
  }
  console.log('\nOK: end-to-end ZK proof works.');
  // snarkjs keeps worker threads alive; exit explicitly.
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
