import { Router, RequestHandler } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { CertStore, Domain, StoredCert } from './store.js';
import { poseidonCommitment } from './poseidon.js';
import { zkAvailable, proveCommitment, verifyProof } from './zk.js';
import { encodeProofForNear, toHex } from './near-encoding.js';

/*
  EXTERNAL VERIFICATION API  (prefix /verify/v1)

  WHO THIS IS FOR
  ---------------
  OTHER projects (a partner service, a government verifier, another dApp) that need to confirm a
  BIDECEL certificate is genuine and anchored on-chain — WITHOUT ever seeing the person's private
  data. This is deliberately SEPARATE from the internal /v2 API (which can return full PII to the
  app itself). Everything here is read-only and PII-free by construction.

  WHAT IT NEVER RETURNS
  ---------------------
  - `payload`  (the raw certificate PII)         -> never
  - `salt`     (the per-record hashing secret)   -> never
  Only the on-chain-safe fingerprint (`cert_hash`), the anchor status/tx id, and the record
  status are exposed. Those are the same facts already public on the NEAR explorer.

  AUTH
  ----
  Server-to-server: the caller sends `x-api-key: <secret>` (set VERIFY_API_KEYS to a comma-
  separated allowlist). If VERIFY_API_KEYS is unset, the API is OPEN (dev convenience) and we
  log a warning — set it before exposing this publicly.

  ENDPOINTS
  ---------
    GET  /verify/v1/health
    GET  /verify/v1/cert/:domain/:id          is this cert anchored? (domain = birth|death)
    GET  /verify/v1/by-national-id/:nid       does an anchored DEATH record exist for this id?
    POST /verify/v1/check-hash                does a given hash match an anchored record?
    (later) GET /verify/v1/proof/:domain/:id  a ZK proof the caller can verify (pending research)

  The ZK proof endpoint (#1 "genuine + anchored, no PII") will slot in here once the ZK stack is
  chosen; this router is its natural home because it's already the PII-free, external-facing seam.
*/

/** Parse a "birth"/"death" path segment into the store's Domain, or null if invalid. */
function parseDomain(raw: string): Domain | null {
  const d = (raw || '').toUpperCase();
  return d === 'BIRTH' || d === 'DEATH' ? (d as Domain) : null;
}

/**
 * A PII-free public view of a stored record. This is the ONLY shape this API ever emits for a
 * record, so there is a single, auditable place where we decide what leaves the building.
 */
function toPublicView(row: StoredCert) {
  return {
    id: row.id,
    certHash: row.cert_hash,          // safe: this is what's anchored on-chain
    // ZK-friendly Poseidon commitment of the SAME record (see poseidon.ts). Public + safe: it's a
    // BN254 field element a verifier uses as the public input when checking a ZK proof later. It
    // reveals nothing about the PII (it's derived through the salted+peppered digest).
    poseidonCommitment: poseidonCommitment(row.payload, row.salt),
    anchored: !!row.anchor_tx_id,     // has it been sealed on NEAR?
    anchorTxId: row.anchor_tx_id,     // the NEAR tx id (public on the explorer)
    anchoredAt: row.anchored_at,
    status: row.status,
    // NOTE: intentionally NO payload, NO salt, NO names/ids beyond what the caller already knew.
  };
}

/** Constant-time string compare (avoids leaking the key via response timing). */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

/**
 * Build the API-key gate. Reads VERIFY_API_KEYS (comma-separated) at call time. When unset the
 * gate is OPEN but warns once — safe for local dev, must be set before public exposure.
 */
function makeApiKeyGate(): RequestHandler {
  let warned = false;
  return (req, res, next) => {
    const raw = (process.env.VERIFY_API_KEYS ?? '').trim();
    const allow = raw
      .split(',')
      .map((k) => k.trim())
      .filter(Boolean);

    if (allow.length === 0) {
      if (!warned) {
        console.warn(
          '[verify] VERIFY_API_KEYS not set — external verify API is OPEN. Set it before exposing publicly.'
        );
        warned = true;
      }
      return next();
    }

    const presented = String(req.header('x-api-key') ?? '');
    const ok = allow.some((k) => safeEqual(k, presented));
    if (!ok) {
      return res.status(401).json({ error: 'invalid or missing x-api-key' });
    }
    return next();
  };
}

export function createVerifyRouter(store: CertStore): Router {
  const router = Router();
  const gate = makeApiKeyGate();

  // Health is intentionally UNGATED so partners can check reachability without a key.
  router.get('/health', (_req, res) => {
    res.json({ status: 'ok', api: 'verify/v1', store: store.backendName() });
  });

  // Everything below requires the API key (when configured).
  router.use(gate);

  // Is a specific certificate anchored? Caller must already know the id + domain.
  router.get('/cert/:domain/:id', async (req, res) => {
    const domain = parseDomain(req.params.domain);
    if (!domain) return res.status(400).json({ error: 'domain must be birth or death' });
    try {
      const row = await store.getById(domain, req.params.id);
      if (!row) return res.status(404).json({ found: false });
      res.json({ found: true, domain, ...toPublicView(row) });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Cross-ledger existence check by the deceased's national id (DEATH domain).
  // Returns ONLY whether an anchored record exists + its hash — never the person's details.
  router.get('/by-national-id/:nid', async (req, res) => {
    const nid = (req.params.nid ?? '').trim();
    if (!nid) return res.status(400).json({ error: 'nationalId required' });
    try {
      // The store doesn't index death-by-national-id, so scan the death list for a match.
      // (Death rows carry a denormalized `national_id`.) Birth uses a dedicated helper instead.
      const rows = await store.list('DEATH');
      const match = rows.find(
        (r) => (r.national_id ?? '').toUpperCase() === nid.toUpperCase()
      );
      if (!match) return res.status(404).json({ found: false, nationalId: nid });
      res.json({
        found: true,
        nationalId: nid,
        certHash: match.cert_hash,
        anchored: !!match.anchor_tx_id,
        anchorTxId: match.anchor_tx_id,
        status: match.status,
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Caller submits a hash they hold; we confirm whether it matches a stored, anchored record.
  // Lets a partner verify "the hash I computed / was given is a real anchored BIDECEL cert".
  router.post('/check-hash', async (req, res) => {
    const hash = String(req.body?.certHash ?? req.body?.hash ?? '').trim().toLowerCase();
    const domainRaw = String(req.body?.domain ?? '').trim();
    if (!hash) return res.status(400).json({ error: 'certHash required' });

    // If a domain is given, search just that table; otherwise check both.
    const domains: Domain[] = domainRaw
      ? (parseDomain(domainRaw) ? [parseDomain(domainRaw) as Domain] : [])
      : ['BIRTH', 'DEATH'];
    if (domains.length === 0) {
      return res.status(400).json({ error: 'domain (if given) must be birth or death' });
    }

    try {
      for (const domain of domains) {
        const rows = await store.list(domain);
        const match = rows.find((r) => r.cert_hash.toLowerCase() === hash);
        if (match) {
          return res.json({
            matches: true,
            domain,
            id: match.id,
            anchored: !!match.anchor_tx_id,
            anchorTxId: match.anchor_tx_id,
            status: match.status,
          });
        }
      }
      return res.json({ matches: false });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Is the ZK proof feature available (circuit artifacts built)?
  router.get('/zk/status', (_req, res) => {
    res.json({ zkAvailable: zkAvailable() });
  });

  // Generate a ZK proof that a stored certificate matches its public Poseidon commitment, WITHOUT
  // revealing the cert. Demo/testing convenience: proving happens server-side here. In production
  // the proof would be generated in the user's browser so the witness (PII-derived) never leaves
  // their device — the /verify-proof route below is what a server/NEAR would actually run.
  router.post('/prove/:domain/:id', async (req, res) => {
    if (!zkAvailable()) {
      return res.status(503).json({ error: 'ZK proofs not available (circuit artifacts not built)' });
    }
    const domain = parseDomain(req.params.domain);
    if (!domain) return res.status(400).json({ error: 'domain must be birth or death' });
    try {
      const row = await store.getById(domain, req.params.id);
      if (!row) return res.status(404).json({ found: false });
      const { proof, publicSignals, commitment } = await proveCommitment(row.payload, row.salt);
      // Public output only: the proof + the public commitment. No payload, no salt.
      res.json({ id: row.id, domain, proof, publicSignals, commitment });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Verify a ZK proof a caller submits. Optionally bind it to a known commitment (the caller can
  // pass certId+domain to require the proof be FOR that stored certificate's commitment).
  router.post('/verify-proof', async (req, res) => {
    if (!zkAvailable()) {
      return res.status(503).json({ error: 'ZK proofs not available (circuit artifacts not built)' });
    }
    const { proof, publicSignals, certId, domain: domainRaw } = req.body ?? {};
    if (!proof || !Array.isArray(publicSignals)) {
      return res.status(400).json({ error: 'proof and publicSignals[] are required' });
    }
    try {
      // If the caller names a stored cert, verify the proof is for THAT cert's commitment.
      let expected: string | undefined;
      if (certId) {
        const domain = parseDomain(String(domainRaw ?? ''));
        if (!domain) return res.status(400).json({ error: 'domain must be birth or death when certId is given' });
        const row = await store.getById(domain, String(certId));
        if (!row) return res.status(404).json({ error: 'certId not found' });
        expected = poseidonCommitment(row.payload, row.salt);
      }
      const { valid, commitment } = await verifyProof(proof, publicSignals as string[], expected);
      res.json({ valid, commitment, boundToCert: certId ? !!expected : false });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  // Re-encode a snarkjs proof into the little-endian byte blobs the NEAR contract's `verify_proof`
  // method expects (see backend/src/near-encoding.ts + the LE decision in the research doc). Returns
  // hex args ready to pass straight to the contract call. This is the bridge between our off-chain
  // proving and the on-chain verifier — the deployer/frontend calls this, then calls the contract.
  router.post('/encode-for-chain', (req, res) => {
    const { proof, publicSignals } = req.body ?? {};
    // snarkjs proof shape: { pi_a: [x,y,z], pi_b: [[..],[..],[..]], pi_c: [x,y,z], ... }
    if (!proof?.pi_a || !proof?.pi_b || !proof?.pi_c || !Array.isArray(publicSignals)) {
      return res.status(400).json({ error: 'proof (pi_a/pi_b/pi_c) and publicSignals[] are required' });
    }
    try {
      const enc = encodeProofForNear(
        { pi_a: proof.pi_a, pi_b: proof.pi_b, pi_c: proof.pi_c },
        publicSignals as string[]
      );
      res.json({
        // Args for contract.verify_proof(neg_a, b, c, public_signals):
        neg_a: toHex(enc.negA),
        b: toHex(enc.b),
        c: toHex(enc.c),
        public_signals: publicSignals, // decimal strings; the contract parses them to LE32
      });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  return router;
}
