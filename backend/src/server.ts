import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createStore, Domain, StoredCert } from './store.js';
import { generateSalt, hashCertificate, verifyCertificate } from './hashing.js';
import { createV1Router } from './v1compat.js';
import { createNearClient } from './near.js';
import { createAuthRouter } from './auth.js';
import { createVerifyRouter } from './verify.js';

/*
  FRESH API LAYER (Phase 2.3).

  A clean backend that owns the real off-chain data + hashing. It is separate from the old
  DeBiCeL mock server; Phase 2.4 wires the existing /api/v1/* routes to call this.

  Endpoints (prefix /v2):
    GET    /v2/health
    POST   /v2/:domain/records          create a cert (computes salted hash, stores PII)
    GET    /v2/:domain/records          list (PII-free summaries)
    GET    /v2/:domain/records/:id      full record (PII) by id
    DELETE /v2/:domain/records/:id      HARD delete (GDPR erasure)
    POST   /v2/:domain/records/:id/verify   recompute + compare hash (tamper check)
    POST   /v2/:domain/records/:id/anchor   record the NEAR tx id after anchoring (Phase 3)
    GET    /v2/birth-hash/:nationalId   cross-ledger birth lookup (proof only, no PII)

  :domain is "birth" or "death".
*/

const store = createStore();
const near = createNearClient();
const app = express();

// CORS: in production the frontend is on a different domain, so lock the API to known origins.
// Set CORS_ORIGINS to a comma-separated allowlist (e.g. "https://dedecel.vercel.app"). If unset,
// allow all origins — convenient for local dev, but set it once the frontend is deployed.
const corsOrigins = (process.env.CORS_ORIGINS ?? '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);
app.use(cors(corsOrigins.length > 0 ? { origin: corsOrigins } : undefined));
app.use(express.json({ limit: '10mb' }));

// Backwards-compatible /api/v1/* routes for the merged app's Birth section.
app.use('/api/v1', createV1Router(store));

// Wallet login (NEP-413 challenge/verify): GET /auth/nonce, POST /auth/verify.
app.use('/auth', createAuthRouter());

// External, PII-free verification API for OTHER projects (API-key gated): /verify/v1/*.
app.use('/verify/v1', createVerifyRouter(store));

function parseDomain(raw: string): Domain | null {
  const d = raw.toUpperCase();
  return d === 'BIRTH' || d === 'DEATH' ? (d as Domain) : null;
}

/** A response-safe view of a stored cert: NO salt, NO full payload. */
function toSummary(row: StoredCert) {
  return {
    id: row.id,
    status: row.status,
    certHash: row.cert_hash,
    anchorTxId: row.anchor_tx_id,
    anchoredAt: row.anchored_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

app.get('/v2/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'dedecel-backend',
    version: '0.1.0',
    store: store.backendName(),
    near: near.status(),
    pepperConfigured: !!process.env.DEDECEL_HASH_PEPPER,
    timestamp: new Date().toISOString(),
  });
});

// Create a certificate: hash it, store PII + salt + hash off-chain.
app.post('/v2/:domain/records', async (req, res) => {
  const domain = parseDomain(req.params.domain);
  if (!domain) return res.status(400).json({ error: 'domain must be birth or death' });

  const record = req.body as Record<string, unknown>;
  const id = String(record?.id ?? '').trim();
  if (!id) return res.status(400).json({ error: 'record.id is required' });

  try {
    if (await store.getById(domain, id)) {
      return res.status(409).json({ error: `record ${id} already exists` });
    }

    const salt = generateSalt();
    const certHash = hashCertificate(record, salt);
    const now = new Date().toISOString();

    const row: StoredCert = {
      id,
      payload: record,
      salt,
      cert_hash: certHash,
      status: String(record.status ?? (domain === 'BIRTH' ? 'Pending_Registrar_Seal' : 'DRAFT')),
      anchor_tx_id: null,
      anchored_at: null,
      national_id: domain === 'DEATH' ? (record.nationalId as string) ?? null : null,
      mother_national_id: domain === 'BIRTH' ? (record.motherNationalId as string) ?? null : null,
      father_national_id: domain === 'BIRTH' ? (record.fatherNationalId as string) ?? null : null,
      created_at: now,
      updated_at: now,
    };

    const saved = await store.insert(domain, row);
    // Return the hash (safe) but not the salt.
    res.status(201).json({ success: true, id: saved.id, certHash: saved.cert_hash, status: saved.status });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// List summaries (PII-free).
app.get('/v2/:domain/records', async (req, res) => {
  const domain = parseDomain(req.params.domain);
  if (!domain) return res.status(400).json({ error: 'domain must be birth or death' });
  try {
    const rows = await store.list(domain);
    res.json({ total: rows.length, records: rows.map(toSummary) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Full record (PII) by id — the only endpoint that returns payload, still never the salt.
app.get('/v2/:domain/records/:id', async (req, res) => {
  const domain = parseDomain(req.params.domain);
  if (!domain) return res.status(400).json({ error: 'domain must be birth or death' });
  try {
    const row = await store.getById(domain, req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    res.json({ ...toSummary(row), payload: row.payload });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// HARD delete (GDPR erasure): removes the row and its salt. On-chain hash becomes unreproducible.
app.delete('/v2/:domain/records/:id', async (req, res) => {
  const domain = parseDomain(req.params.domain);
  if (!domain) return res.status(400).json({ error: 'domain must be birth or death' });
  try {
    const removed = await store.remove(domain, req.params.id);
    res.json({ success: removed, erased: removed });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Verify: recompute the hash from stored PII + salt and compare (tamper-evidence).
app.post('/v2/:domain/records/:id/verify', async (req, res) => {
  const domain = parseDomain(req.params.domain);
  if (!domain) return res.status(400).json({ error: 'domain must be birth or death' });
  try {
    const row = await store.getById(domain, req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    const valid = verifyCertificate(row.payload, row.salt, row.cert_hash);
    res.json({ id: row.id, valid, certHash: row.cert_hash });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Anchor: notarize the record's fingerprint on NEAR, then record the real tx id.
//
// The backend does the on-chain call itself (with the owner's server-side signing key), so
// only the meaningless cert_hash ever leaves here — never PII, never the salt. If NEAR is not
// configured, near.anchorHash() returns a "local:" placeholder and onChain=false, so the flow
// still completes in dev. Callers may still pass an explicit { txId } to record one manually.
app.post('/v2/:domain/records/:id/anchor', async (req, res) => {
  const domain = parseDomain(req.params.domain);
  if (!domain) return res.status(400).json({ error: 'domain must be birth or death' });
  try {
    const row = await store.getById(domain, req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });

    if (row.anchor_tx_id) {
      // Immutability mirrors the contract: refuse to re-anchor an already-anchored cert.
      return res.status(409).json({ error: 'already anchored', ...toSummary(row) });
    }

    const manualTxId = String(req.body?.txId ?? '').trim();
    let txId: string;
    let onChain: boolean;
    if (manualTxId) {
      txId = manualTxId;
      onChain = !manualTxId.startsWith('local:');
    } else {
      const result = await near.anchorHash(row.id, row.cert_hash);
      txId = result.txId;
      onChain = result.onChain;
    }

    const updated = await store.update(domain, req.params.id, {
      anchor_tx_id: txId,
      anchored_at: new Date().toISOString(),
    });
    if (!updated) return res.status(404).json({ error: 'not found' });
    res.json({ success: true, onChain, ...toSummary(updated) });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// On-chain verify: ask the NEAR contract whether the stored fingerprint matches. This is the
// tamper-proof check (distinct from /verify, which recomputes the hash off-chain from PII).
app.get('/v2/:domain/records/:id/onchain', async (req, res) => {
  const domain = parseDomain(req.params.domain);
  if (!domain) return res.status(400).json({ error: 'domain must be birth or death' });
  try {
    const row = await store.getById(domain, req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    const onChainHash = await near.getHash(row.id);
    const matches = onChainHash !== null && onChainHash === row.cert_hash;
    res.json({
      id: row.id,
      nearEnabled: near.enabled(),
      anchored: !!row.anchor_tx_id,
      anchorTxId: row.anchor_tx_id,
      onChainHash,
      matches,
    });
  } catch (err) {
    res.status(500).json({ error: (err as Error).message });
  }
});

// Cross-ledger birth lookup: returns proof pointers only, never PII.
app.get('/v2/birth-hash/:nationalId', async (req, res) => {
  const nid = req.params.nationalId?.trim();
  if (!nid) return res.status(400).json({ found: false, error: 'nationalId required' });
  try {
    const row = await store.findBirthByNationalId(nid);
    if (!row) {
      return res.status(404).json({ found: false, nationalId: nid, message: 'No birth record found.' });
    }
    res.json({
      found: true,
      nationalId: nid,
      birthHash: row.cert_hash,
      registrationId: row.id,
      status: row.status,
      anchoredOnChain: !!row.anchor_tx_id,
    });
  } catch (err) {
    res.status(500).json({ found: false, error: (err as Error).message });
  }
});

// Auto-start the server, UNLESS a test wants to import `app` and control the port itself
// (set DEDECEL_NO_LISTEN=1). Skipping the listen lets tests boot on an ephemeral port.
if (process.env.DEDECEL_NO_LISTEN !== '1') {
  // Free hosts (Render/Railway/Fly) inject PORT — prefer it, then BACKEND_PORT, then 4000 for dev.
  const PORT = Number(process.env.PORT ?? process.env.BACKEND_PORT ?? 4000);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[dedecel-backend] listening on http://localhost:${PORT}  (store: ${store.backendName()})`);
  });
}

export { app };
