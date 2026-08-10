/*
  REGISTRY SERVICE INTERFACE — the seam between the UI and the backend.

  WHY THIS FILE EXISTS
  --------------------
  Our roadmap builds the frontend (Track A) and the real backend (Track B — NEAR contract
  + off-chain database) at the same time. To let them proceed without waiting on each other,
  the UI never talks to NEAR or a database directly. It only calls THIS interface.

  Today we ship a `mock` implementation (backed by the existing in-browser simulated ledger
  feel). Later, Phase 2/3 adds a `real` implementation that:
    - stores all PII in a deletable off-chain database, and
    - anchors ONLY a salted hash on NEAR.
  Swapping `mock` -> `real` won't require changing any UI component.

  PRIVACY CONTRACT (from docs/research/onchain-vs-offchain-privacy.md — non-negotiable):
    - Only a salted/keyed HASH ever goes on-chain. Never raw PII.
    - The secret salt/pepper lives OFF-chain and is never returned to the browser.
    - "Erasure" = delete the off-chain record + destroy its salt.
  The interface below is intentionally shaped so a caller CANNOT accidentally send PII
  on-chain: the anchor call takes a already-computed hash + certificate id, nothing else.
*/

import { apiUrl } from './apiBase';

/** A certificate domain. Mirrors the app's Birth/Death split. */
export type CertDomain = 'BIRTH' | 'DEATH';

/** Result of anchoring a hash on-chain. */
export interface AnchorResult {
  certId: string;
  /** The hash that was anchored (hex string). */
  hash: string;
  /** Chain transaction id, when a real chain is used. Null for the mock. */
  txId: string | null;
  /** When it was anchored (ISO string). */
  anchoredAt: string;
}

/** Result of verifying a certificate against the chain. */
export interface VerifyResult {
  certId: string;
  /** True if the supplied hash matches what is anchored on-chain for this certId. */
  isValid: boolean;
  /** The hash currently anchored on-chain, or null if nothing is anchored for this certId. */
  anchoredHash: string | null;
}

/** Minimal record returned by a cross-ledger birth lookup (NO PII — just proof pointers). */
export interface BirthHashLookup {
  found: boolean;
  nationalId: string;
  birthHash: string | null;
  registrationId: string | null;
}

/**
 * The operations the UI needs from a certificate registry backend.
 * Implementations: `mockRegistry` (now) and a real NEAR+DB one (later).
 */
export interface RegistryService {
  /**
   * Anchor a certificate's salted hash on-chain.
   * IMPORTANT: `saltedHash` must already be computed off-chain (the caller/back end
   * mixes in the secret salt). This function must NEVER be handed raw PII.
   */
  anchorHash(domain: CertDomain, certId: string, saltedHash: string): Promise<AnchorResult>;

  /** Check a certificate's hash against what's anchored on-chain. */
  verify(domain: CertDomain, certId: string, saltedHash: string): Promise<VerifyResult>;

  /** Cross-ledger: given a national id, return the anchored birth hash (proof only, no PII). */
  lookupBirthHash(nationalId: string): Promise<BirthHashLookup>;
}

/* ------------------------------------------------------------------ */
/* MOCK IMPLEMENTATION                                                 */
/* Keeps a map of certId -> hash so the UI behaves the same shape it   */
/* will with the real backend. This is NOT a chain, but it IS now      */
/* persisted to the browser's localStorage so anchored records survive */
/* a page refresh — the "database is localStorage for now" mode. When  */
/* Supabase is wired in later, swap to the real registry via env flag  */
/* and this store is simply ignored (see the seam at the bottom).      */
/* ------------------------------------------------------------------ */

/**
 * A Map<string, T> that transparently mirrors itself into localStorage under `storageKey`.
 * Falls back to a plain in-memory Map when localStorage is unavailable (e.g. SSR, private
 * mode, or a security policy) — the app keeps working, it just won't persist.
 */
class PersistentMap<T> {
  private mem: Map<string, T>;

  constructor(private storageKey: string) {
    this.mem = new Map(this.load());
  }

  /** Read + parse the backing store. Any corruption/absence yields an empty list. */
  private load(): Array<[string, T]> {
    try {
      const raw = typeof localStorage !== 'undefined' ? localStorage.getItem(this.storageKey) : null;
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as Array<[string, T]>) : [];
    } catch {
      return [];
    }
  }

  /** Serialize the current entries back to localStorage (best-effort; ignores quota/errors). */
  private save() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.setItem(this.storageKey, JSON.stringify([...this.mem.entries()]));
    } catch {
      /* localStorage full or blocked — keep the in-memory copy, just don't persist. */
    }
  }

  get(k: string): T | undefined {
    return this.mem.get(k);
  }

  set(k: string, v: T): void {
    this.mem.set(k, v);
    this.save();
  }
}

class MockRegistry implements RegistryService {
  private anchored = new PersistentMap<{ hash: string; anchoredAt: string; domain: CertDomain }>(
    'dedecel:mock:anchored',
  );
  private birthByNationalId = new PersistentMap<{ birthHash: string; registrationId: string }>(
    'dedecel:mock:birthByNationalId',
  );

  async anchorHash(domain: CertDomain, certId: string, saltedHash: string): Promise<AnchorResult> {
    await tick();
    const anchoredAt = nowIso();
    this.anchored.set(key(domain, certId), { hash: saltedHash, anchoredAt, domain });
    return { certId, hash: saltedHash, txId: null, anchoredAt };
  }

  async verify(domain: CertDomain, certId: string, saltedHash: string): Promise<VerifyResult> {
    await tick();
    const entry = this.anchored.get(key(domain, certId));
    return {
      certId,
      isValid: !!entry && entry.hash === saltedHash,
      anchoredHash: entry ? entry.hash : null,
    };
  }

  async lookupBirthHash(nationalId: string): Promise<BirthHashLookup> {
    await tick();
    const rec = this.birthByNationalId.get(nationalId);
    return {
      found: !!rec,
      nationalId,
      birthHash: rec ? rec.birthHash : null,
      registrationId: rec ? rec.registrationId : null,
    };
  }

  /** Test/demo helper (mock only): seed a birth-hash so cross-ledger lookups return something. */
  _seedBirth(nationalId: string, birthHash: string, registrationId: string) {
    this.birthByNationalId.set(nationalId, { birthHash, registrationId });
  }
}

/* small helpers — no Date.now()/Math.random() concerns here, this is app runtime not a workflow */
function key(domain: CertDomain, certId: string) {
  return `${domain}:${certId}`;
}
function nowIso() {
  return new Date().toISOString();
}
function tick() {
  return new Promise((r) => setTimeout(r, 120));
}

/** The mock instance the app uses until the real backend is selected. */
export const mockRegistry = new MockRegistry();

/* ------------------------------------------------------------------ */
/* REAL IMPLEMENTATION                                                 */
/* Talks to the Phase 2 backend over HTTP (/v2/*). The backend owns    */
/* the PII + salt; this client only ever sees hashes/proofs.           */
/* Anchoring the hash on NEAR itself lands in Phase 3 — for now the    */
/* backend records the anchor tx id we pass it.                        */
/* ------------------------------------------------------------------ */

class RealRegistry implements RegistryService {
  // Defaults to the configured production backend base (empty in dev → relative → Vite proxy).
  constructor(private baseUrl = apiUrl('')) {}

  private path(domain: CertDomain, suffix = '') {
    return `${this.baseUrl}/v2/${domain.toLowerCase()}/records${suffix}`;
  }

  async anchorHash(domain: CertDomain, certId: string, saltedHash: string): Promise<AnchorResult> {
    // The BACKEND anchors on NEAR itself (with its server-side owner key) and returns the real
    // tx id — so we send no txId and never recompute the hash here (the backend stored the
    // authoritative one). If NEAR isn't configured the backend replies with a "local:" id.
    const res = await fetch(this.path(domain, `/${encodeURIComponent(certId)}/anchor`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (!res.ok) throw new Error(`anchorHash failed: ${res.status}`);
    const data = await res.json();
    return {
      certId,
      hash: saltedHash,
      txId: data.anchorTxId ?? null,
      anchoredAt: data.anchoredAt ?? new Date().toISOString(),
    };
  }

  async verify(domain: CertDomain, certId: string, _saltedHash: string): Promise<VerifyResult> {
    const res = await fetch(this.path(domain, `/${encodeURIComponent(certId)}/verify`), {
      method: 'POST',
    });
    if (res.status === 404) return { certId, isValid: false, anchoredHash: null };
    if (!res.ok) throw new Error(`verify failed: ${res.status}`);
    const data = await res.json();
    return { certId, isValid: !!data.valid, anchoredHash: data.certHash ?? null };
  }

  async lookupBirthHash(nationalId: string): Promise<BirthHashLookup> {
    const res = await fetch(`${this.baseUrl}/v2/birth-hash/${encodeURIComponent(nationalId)}`);
    if (res.status === 404) return { found: false, nationalId, birthHash: null, registrationId: null };
    if (!res.ok) throw new Error(`lookupBirthHash failed: ${res.status}`);
    const data = await res.json();
    return {
      found: !!data.found,
      nationalId,
      birthHash: data.birthHash ?? null,
      registrationId: data.registrationId ?? null,
    };
  }
}

export const realRegistry = new RealRegistry();

/**
 * The registry the app imports. Selection:
 *   - Set VITE_USE_REAL_BACKEND=true (in DEDECEL/.env) to use the real backend.
 *   - Otherwise the in-memory mock is used (safe default, needs no backend running).
 * Either way the UI code is identical — this is the parallel-work seam.
 */
const useReal = import.meta.env.VITE_USE_REAL_BACKEND === 'true';
export const registry: RegistryService = useReal ? realRegistry : mockRegistry;
