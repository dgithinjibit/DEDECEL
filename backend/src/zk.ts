import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { poseidonWitnessParts } from './poseidon.js';

/*
  ZK PROOF SERVICE — BIDECEL proof #1 (slice 1), backend side.

  Wraps the compiled circom circuit (circuits/cert_commitment) + snarkjs Groth16 so the API can:
    - proveCommitment(record, salt)          -> a ZK proof that a cert matches its public commitment
    - verifyProof(proof, publicSignals)      -> check a proof against the verification key

  The circuit proves "I know (saltField, digestHi, digestLo) whose Poseidon(3) == commitment"
  WITHOUT revealing them (see circuits/src/cert_commitment.circom + poseidon.ts). The commitment is
  the single public signal.

  ARTIFACTS live in circuits/build/ (produced by `npm --prefix circuits run build`):
    - cert_commitment_js/cert_commitment.wasm   (witness generator)
    - cert_commitment_final.zkey                (proving key)
    - verification_key.json                     (verifying key)
  They are resolved relative to this file so it works in dev and on the server. If they're absent
  (e.g. a build that didn't include them), zkAvailable() returns false and the endpoints 503 with
  a clear message instead of crashing.

  NOTE ON PROVING LOCATION: doing the proving here (server-side) is convenient for the demo. In
  production the proof should be generated in the USER'S browser so the witness (which is derived
  from PII) never leaves their device. The verify path is the one that belongs on a server / on
  NEAR. This module keeps both so we can wire the browser prover later without changing the API.
*/

const here = dirname(fileURLToPath(import.meta.url));
// backend/src -> repo root -> circuits/build
const BUILD = resolve(here, '..', '..', 'circuits', 'build');
const WASM = resolve(BUILD, 'cert_commitment_js', 'cert_commitment.wasm');
const ZKEY = resolve(BUILD, 'cert_commitment_final.zkey');
const VKEY_PATH = resolve(BUILD, 'verification_key.json');

/** True if the circuit artifacts are present so proving/verifying can run. */
export function zkAvailable(): boolean {
  return existsSync(WASM) && existsSync(ZKEY) && existsSync(VKEY_PATH);
}

/** Lazily load snarkjs (heavy) + the verification key, only when first needed. */
let _snarkjs: typeof import('snarkjs') | null = null;
let _vkey: unknown = null;
async function load() {
  if (!_snarkjs) _snarkjs = await import('snarkjs');
  if (!_vkey) _vkey = JSON.parse(readFileSync(VKEY_PATH, 'utf8'));
  return { snarkjs: _snarkjs, vkey: _vkey };
}

export interface ZkProof {
  proof: unknown;              // Groth16 proof object
  publicSignals: string[];     // [commitment]
  commitment: string;          // convenience: publicSignals[0]
}

/**
 * Generate a ZK proof that `record` (+ salt) matches its Poseidon commitment, revealing nothing.
 * The witness parts are derived identically to poseidon.ts, so the proof's public signal equals
 * the commitment the /verify API publishes.
 */
export async function proveCommitment(record: unknown, salt: string): Promise<ZkProof> {
  if (!zkAvailable()) throw new Error('ZK circuit artifacts not built (run: npm --prefix circuits run build)');
  const { snarkjs } = await load();
  const w = poseidonWitnessParts(record, salt);
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    { saltField: w.saltField, digestHi: w.digestHi, digestLo: w.digestLo },
    WASM,
    ZKEY
  );
  return { proof, publicSignals, commitment: publicSignals[0] };
}

/**
 * Verify a Groth16 proof against the circuit's verification key. Optionally also require the
 * proof's public commitment to equal an expected value (e.g. the one stored for a cert).
 */
export async function verifyProof(
  proof: unknown,
  publicSignals: string[],
  expectedCommitment?: string
): Promise<{ valid: boolean; commitment: string | null }> {
  if (!zkAvailable()) throw new Error('ZK circuit artifacts not built');
  if (!Array.isArray(publicSignals) || publicSignals.length < 1) {
    return { valid: false, commitment: null };
  }
  const { snarkjs, vkey } = await load();
  const ok = await snarkjs.groth16.verify(vkey as object, publicSignals, proof as object);
  const commitment = publicSignals[0];
  if (!ok) return { valid: false, commitment };
  if (expectedCommitment !== undefined && commitment !== expectedCommitment) {
    // Valid proof, but for a DIFFERENT commitment than the one we care about.
    return { valid: false, commitment };
  }
  return { valid: true, commitment };
}
