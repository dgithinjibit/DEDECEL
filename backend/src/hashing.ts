import { createHash, randomBytes } from 'node:crypto';

/*
  SALTED HASHING SERVICE — the security-critical core of Phase 2.

  Plain-language explanation:
  - A "hash" is a fixed-length fingerprint of some data. Same data in → same fingerprint out;
    change one character and the fingerprint changes completely. You cannot turn the fingerprint
    back into the data.
  - Certificate fields like a birth date or a national ID have FEW possible values, so an attacker
    could hash every possible value and match it against a plain fingerprint. To stop that we mix
    in secrets before hashing:
      * SALT   — a long random value, unique PER RECORD, stored off-chain (in the DB row).
      * PEPPER — one global secret for the whole app, stored ONLY in a server env var (never in the
                 DB, never sent to the browser, never on-chain).
  - The fingerprint we publish on-chain is:  SHA-256( pepper : salt : canonical(record) )
  - To "forget" someone (GDPR erasure) we delete their DB row (and thus their salt); the on-chain
    fingerprint can then never be reproduced or linked back to them.

  Nothing here ever returns the pepper. The salt is returned only so the API layer can persist it
  in the record's own DB row — it must not be exposed to clients.
*/

/** The global pepper. MUST be set in the server environment; refuse to run without it. */
function getPepper(): string {
  const pepper = process.env.DEDECEL_HASH_PEPPER;
  if (!pepper || pepper.length < 16) {
    throw new Error(
      'DEDECEL_HASH_PEPPER env var is missing or too short (need >=16 chars). ' +
        'Set a long random secret; it must be stable (changing it invalidates all existing hashes).'
    );
  }
  return pepper;
}

/** Generate a fresh per-record salt (256 bits, hex). Call once when a record is created. */
export function generateSalt(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Produce a stable, canonical string for an object so the SAME logical record always hashes
 * to the SAME fingerprint regardless of key order. (Deterministic JSON with sorted keys.)
 */
export function canonicalize(value: unknown): string {
  return JSON.stringify(sortDeep(value));
}

function sortDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return Object.keys(obj)
      .sort()
      .reduce<Record<string, unknown>>((acc, k) => {
        acc[k] = sortDeep(obj[k]);
        return acc;
      }, {});
  }
  return value;
}

/**
 * Compute the salted+peppered SHA-256 fingerprint of a certificate record.
 * @param record  the full certificate object (PII) — never leaves the server
 * @param salt    the per-record salt (from generateSalt(), persisted in the DB row)
 * @returns       hex string, prefixed "0x", safe to store on-chain
 */
export function hashCertificate(record: unknown, salt: string): string {
  const pepper = getPepper();
  const canonical = canonicalize(record);
  // Domain-separated, delimiter-joined so fields can't be shifted into each other.
  const input = `bidecel-v1|${pepper}|${salt}|${canonical}`;
  const digest = createHash('sha256').update(input, 'utf8').digest('hex');
  return `0x${digest}`;
}

/**
 * Recompute a record's hash and check it equals the expected one.
 * Used to verify a certificate hasn't been altered (tamper-evidence).
 */
export function verifyCertificate(record: unknown, salt: string, expectedHash: string): boolean {
  const actual = hashCertificate(record, salt);
  // Constant-time-ish compare on equal-length hex strings.
  if (actual.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  return diff === 0;
}
