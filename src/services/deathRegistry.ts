/*
  DEATH-CERT BACKEND BRIDGE (Phase 4)

  The death section historically ran a purely in-browser blockchain simulation
  (services/blockchain.ts). Phase 4 wires the REAL certificate lifecycle through the backend
  + NEAR, while keeping that simulation as the on-screen visual.

  This module is the thin async side-channel the App handlers call:

    CREATE  -> persistDeathRecord():  POST /v2/death/records  (PII stored off-chain, server
               computes the salted hash and returns it — no salt ever comes back).
    APPROVE -> anchorDeathRecord():   registry.anchorHash(...)  (the backend writes ONLY the
               salted hash to NEAR and returns the real tx id; disabled mode -> local: id).
    VERIFY  -> verifyDeathRecord():   registry.verify(...)  (recompute + compare).
    ERASE   -> eraseDeathRecord():    DELETE /v2/death/records/:id  (GDPR hard delete).

  IMPORTANT (privacy contract): PII goes to the off-chain store only. The chain receives just
  the hash. When VITE_USE_REAL_BACKEND is not "true", the app still uses the mock registry and
  these persist/erase calls are skipped, so nothing breaks with zero setup.
*/

import { DeathCertificate } from '../types';
import { registry } from './registry';
import { apiUrl } from './apiBase';

const USE_REAL_BACKEND = import.meta.env.VITE_USE_REAL_BACKEND === 'true';

/** Result of persisting a death cert's PII off-chain. */
export interface PersistResult {
  /** True if it went to the real backend (vs skipped in mock mode). */
  persisted: boolean;
  /** The authoritative salted hash computed server-side, or null when skipped. */
  certHash: string | null;
}

/** Build the PII payload the backend stores. The server derives `national_id` from `nationalId`. */
function toPayload(cert: DeathCertificate): Record<string, unknown> {
  // Send the whole cert as the record; `id` and `nationalId` are the keys the backend indexes.
  return { ...cert };
}

/**
 * CREATE: store the death cert's PII off-chain and get back the server-computed salted hash.
 * Idempotent-ish: if the record already exists (409) we fetch its existing hash instead of failing.
 */
export async function persistDeathRecord(cert: DeathCertificate): Promise<PersistResult> {
  if (!USE_REAL_BACKEND) return { persisted: false, certHash: null };

  const res = await fetch(apiUrl('/v2/death/records'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(cert)),
  });

  if (res.status === 409) {
    // Already stored (e.g. re-broadcast from the offline queue). Read the existing hash back.
    const existing = await fetch(apiUrl(`/v2/death/records/${encodeURIComponent(cert.id)}`));
    if (existing.ok) {
      const data = await existing.json();
      return { persisted: true, certHash: data.certHash ?? null };
    }
    return { persisted: true, certHash: null };
  }
  if (!res.ok) throw new Error(`persistDeathRecord failed: ${res.status}`);
  const data = await res.json();
  return { persisted: true, certHash: data.certHash ?? null };
}

/** Result of anchoring a death cert's hash on-chain. */
export interface AnchorOutcome {
  anchored: boolean;
  txId: string | null;
  /** True only if it hit the real chain (false for the local: placeholder or mock). */
  onChain: boolean;
}

/**
 * APPROVE/seal: anchor the record's salted hash on NEAR via the registry. The backend performs
 * the on-chain write itself, so we never touch PII here.
 */
export async function anchorDeathRecord(cert: DeathCertificate, certHash: string): Promise<AnchorOutcome> {
  const result = await registry.anchorHash('DEATH', cert.id, certHash);
  const txId = result.txId;
  return {
    anchored: true,
    txId,
    onChain: !!txId && !txId.startsWith('local:'),
  };
}

/** VERIFY: recompute the hash from stored PII+salt on the server and compare. */
export async function verifyDeathRecord(cert: DeathCertificate, certHash: string) {
  return registry.verify('DEATH', cert.id, certHash);
}

/** ERASE (GDPR): hard-delete the off-chain row + its salt. On-chain hash becomes unreproducible. */
export async function eraseDeathRecord(certId: string): Promise<boolean> {
  if (!USE_REAL_BACKEND) return false;
  const res = await fetch(apiUrl(`/v2/death/records/${encodeURIComponent(certId)}`), { method: 'DELETE' });
  if (!res.ok) throw new Error(`eraseDeathRecord failed: ${res.status}`);
  const data = await res.json();
  return !!data.erased;
}

export const deathBackendEnabled = USE_REAL_BACKEND;
