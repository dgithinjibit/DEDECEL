import { poseidon3 } from 'poseidon-lite';
import { hashCertificate } from './hashing.js';

/*
  POSEIDON COMMITMENT — the ZK-friendly fingerprint (slice 3 / foundation of the ZK work).

  WHY A SECOND HASH
  -----------------
  The existing salted SHA-256 `cert_hash` (see hashing.ts) is what we anchor on-chain and show on
  the block explorer — keep it, it's battle-tested. But SHA-256 is *very* expensive to prove
  inside a zero-knowledge circuit (~25k–31k constraints per hash). Poseidon is a hash designed to
  be cheap in a circuit (~240 constraints, ~100x cheaper) because it works with field arithmetic
  instead of bit operations. See docs/research/zk-verification-near-2026.md.

  So we ADD a Poseidon commitment ALONGSIDE the SHA-256 hash. A later circom circuit (slice 1) can
  cheaply prove "I know a certificate whose commitment equals this public value" without revealing
  the certificate — the commitment here is exactly what that circuit re-computes.

  HOW IT BINDS TO THE RECORD
  --------------------------
  Poseidon takes FIELD ELEMENTS (numbers below the BN254 prime, ~254 bits), not arbitrary bytes.
  We already have a 256-bit salted+peppered SHA-256 digest of the record. We:
    1. reuse that digest (so the Poseidon commitment is bound to the SAME record + salt + pepper),
    2. split its 256 bits into two 128-bit limbs (each safely below the field prime),
    3. map the salt to a field element,
    4. commitment = Poseidon(saltField, digestHi, digestLo).
  Same record + same salt -> same commitment. Different record -> different commitment.

  poseidon-lite's Poseidon uses the SAME round constants as circomlib's Poseidon, so a circom
  circuit's `Poseidon(3)` will agree with this value bit-for-bit. That compatibility is the whole
  point — it lets the off-chain commitment and the in-circuit hash match.
*/

/** BN254 (alt_bn128) scalar field prime — every Poseidon input/output is reduced mod this. */
export const BN254_FIELD_PRIME =
  21888242871839275222246405745257275088548364400416034343698204186575808495617n;

/**
 * Turn a hex string (with or without 0x) into a bigint. Salts from generateSalt() are always hex,
 * but be defensive: if the input contains non-hex characters (e.g. a legacy/opaque salt), fall
 * back to interpreting its raw UTF-8 bytes as hex, so this never throws.
 */
function hexToBigInt(hex: string): bigint {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (!clean.length) return 0n;
  if (/^[0-9a-fA-F]+$/.test(clean)) return BigInt(`0x${clean}`);
  // Non-hex: hash-free byte encoding — treat each char's byte as two hex digits.
  let out = 0n;
  for (const ch of clean) out = (out << 8n) | BigInt(ch.charCodeAt(0) & 0xff);
  return out;
}

/**
 * Split a 256-bit value into two 128-bit limbs [hi, lo]. Each limb is < 2^128, comfortably below
 * the ~254-bit field prime, so both are valid Poseidon field inputs. Splitting (rather than a
 * single mod-p reduction) keeps ALL 256 bits of the digest bound into the commitment.
 */
function splitTo128BitLimbs(value: bigint): [bigint, bigint] {
  const mask = (1n << 128n) - 1n;
  const lo = value & mask;
  const hi = (value >> 128n) & mask;
  return [hi, lo];
}

/** Reduce an arbitrary bigint into the BN254 field (defensive; salt/limbs are already in range). */
function toField(x: bigint): bigint {
  const r = x % BN254_FIELD_PRIME;
  return r < 0n ? r + BN254_FIELD_PRIME : r;
}

/**
 * Compute the Poseidon commitment for a certificate.
 *
 * It is derived from the SAME salted+peppered SHA-256 digest used by hashCertificate(), so the two
 * fingerprints are bound to the identical record/salt/pepper. Returns the commitment as a decimal
 * string (a BN254 field element) — the canonical form circom/snarkjs public signals use.
 *
 * @param record  full certificate object (PII) — never leaves the server
 * @param salt    the per-record salt (same one passed to hashCertificate)
 */
export function poseidonCommitment(record: unknown, salt: string): string {
  // 1) Reuse the existing salted SHA-256 digest (0x-prefixed hex) as the record binding.
  const sha = hashCertificate(record, salt); // "0x" + 64 hex chars = 256 bits
  const digest = hexToBigInt(sha);
  const [hi, lo] = splitTo128BitLimbs(digest);

  // 2) Map the salt (hex) into the field.
  const saltField = toField(hexToBigInt(salt));

  // 3) Poseidon over exactly three field inputs -> one field element.
  const commitment = poseidon3([saltField, hi, lo]);
  return commitment.toString(); // decimal string (BN254 field element)
}

/**
 * The public inputs a ZK circuit will re-derive and compare against. Exposed so the future circom
 * circuit + the /verify/v1/proof endpoint use one shared definition of "what is public".
 * `commitment` is public; `saltField`/limbs are the PRIVATE witness the prover holds.
 */
export function poseidonWitnessParts(record: unknown, salt: string): {
  commitment: string;
  saltField: string;
  digestHi: string;
  digestLo: string;
} {
  const sha = hashCertificate(record, salt);
  const digest = hexToBigInt(sha);
  const [hi, lo] = splitTo128BitLimbs(digest);
  const saltField = toField(hexToBigInt(salt));
  const commitment = poseidon3([saltField, hi, lo]).toString();
  return {
    commitment,
    saltField: saltField.toString(),
    digestHi: hi.toString(),
    digestLo: lo.toString(),
  };
}
