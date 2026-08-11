#!/usr/bin/env node
/*
  build.mjs — compile the circuit and run the Groth16 trusted setup.

  Steps (all outputs land in circuits/build/):
    1. circom compile cert_commitment.circom -> r1cs + wasm (+ sym)
    2. fetch a PUBLIC powers-of-tau (phase 1 ceremony output) if not cached
    3. groth16 setup: r1cs + ptau -> initial zkey
    4. phase-2 contribution (adds local entropy) -> final zkey
    5. export the verification key -> verification_key.json

  TRUST NOTE: we use a real public phase-1 ceremony (Hermez/Perpetual Powers of Tau) and add our
  own phase-2 contribution locally. For a testnet dApp this is acceptable. For MAINNET you'd run a
  multi-party phase-2 ceremony. The generated zkey/vkey are committed for reproducibility of the
  DEMO; regenerate for production.

  Requires: circom on PATH, and `npm install` in circuits/ (snarkjs). Network needed once to fetch
  the ptau (~a few MB for our tiny circuit; power 12 is plenty for ~240 constraints).
*/
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const build = resolve(root, 'build');
const src = resolve(root, 'src');
mkdirSync(build, { recursive: true });

const CIRCUIT = 'cert_commitment';
// Poseidon(3) is ~240 constraints; 2^12 = 4096 is far more than enough. Small ptau => fast fetch.
const PTAU_POWER = 12;
const PTAU_FILE = resolve(build, `pot${PTAU_POWER}_final.ptau`);
// Hermez perpetual powers of tau (public, widely used). Small files hosted by the snarkjs project.
const PTAU_URL = `https://storage.googleapis.com/zkevm/ptau/powersOfTau28_hez_final_${PTAU_POWER}.ptau`;

function run(cmd, args, opts = {}) {
  console.log(`\n$ ${cmd} ${args.join(' ')}`);
  execFileSync(cmd, args, { stdio: 'inherit', cwd: build, ...opts });
}

// 1) Compile the circuit. -l points at circomlib's circuits dir so `include "poseidon.circom"` works.
const circomlibCircuits = resolve(root, 'node_modules', 'circomlib', 'circuits');
run('circom', [
  resolve(src, `${CIRCUIT}.circom`),
  '--r1cs',
  '--wasm',
  '--sym',
  '-l',
  circomlibCircuits,
  '-o',
  build,
]);

// 2) Fetch the public powers-of-tau once.
if (!existsSync(PTAU_FILE)) {
  console.log(`\nDownloading public powers-of-tau (power ${PTAU_POWER})...`);
  run('curl', ['-L', '--fail', '-o', PTAU_FILE, PTAU_URL]);
} else {
  console.log(`\nUsing cached ptau: ${PTAU_FILE}`);
}

// snarkjs CLI (from circuits/node_modules).
const snarkjs = resolve(root, 'node_modules', '.bin', 'snarkjs');

// 3) Groth16 setup -> initial zkey.
run(snarkjs, ['groth16', 'setup', `${CIRCUIT}.r1cs`, PTAU_FILE, `${CIRCUIT}_0000.zkey`]);

// 4) Phase-2 contribution (local entropy). --name + -e make it non-interactive/deterministic-ish.
run(snarkjs, [
  'zkey',
  'contribute',
  `${CIRCUIT}_0000.zkey`,
  `${CIRCUIT}_final.zkey`,
  '--name=bidecel-dev-contribution',
  '-e=bidecel-dev-entropy-not-for-mainnet',
]);

// 5) Export verification key.
run(snarkjs, ['zkey', 'export', 'verificationkey', `${CIRCUIT}_final.zkey`, 'verification_key.json']);

console.log('\nBuild complete. Artifacts in circuits/build/:');
console.log(`  ${CIRCUIT}.r1cs, ${CIRCUIT}_js/${CIRCUIT}.wasm, ${CIRCUIT}_final.zkey, verification_key.json`);
