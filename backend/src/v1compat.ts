import { Router } from 'express';
import { CertStore, StoredCert } from './store.js';
import { generateSalt, hashCertificate } from './hashing.js';

/*
  V1 COMPATIBILITY ROUTES.

  The merged app's Birth section (ported from DeBiCeL) still calls the old /api/v1/* endpoints.
  Rather than change the frontend, we serve those paths here but back them with the REAL store +
  salted hashing (birth domain). This is the "connect fresh API to the existing server" step:
  same URLs the frontend already uses, real backend underneath.

  Note: a birth record's on-chain fingerprint (`cert_hash`) now REPLACES the old fake
  `zkProof.birthHash`. We surface it in the response as `zkProof.birthHash` so existing UI keeps
  working, but the value is a genuine salted SHA-256.
*/

export function createV1Router(store: CertStore): Router {
  const router = Router();
  const auditLogs: Array<Record<string, unknown>> = [];
  let blockHeight = 1_851_093;

  const nowIso = () => new Date().toISOString();

  // Reshape a stored row back into the BirthRecord-ish object the frontend expects.
  function toBirthResponse(row: StoredCert) {
    const payload = row.payload as Record<string, unknown>;
    return {
      ...payload,
      id: row.id,
      status: row.status,
      zkProof: {
        ...(payload.zkProof as Record<string, unknown> | undefined),
        birthHash: row.cert_hash, // real salted hash
        verified: true,
      },
      blockchain: row.anchor_tx_id
        ? { txHash: row.anchor_tx_id, sealedAt: row.anchored_at, blockNumber: null }
        : (payload.blockchain ?? undefined),
      certHash: row.cert_hash,
    };
  }

  router.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      system: 'BIDECEL Vital Records Ledger',
      version: '2.0.0',
      blockHeight,
      store: store.backendName(),
      timestamp: nowIso(),
    });
  });

  router.get('/records', async (req, res) => {
    try {
      const rows = await store.list('BIRTH');
      let out = rows.map(toBirthResponse);
      const { status, search } = req.query;
      if (typeof status === 'string') out = out.filter((r) => r.status === status);
      if (typeof search === 'string') {
        const q = search.toLowerCase();
        out = out.filter((r) => JSON.stringify(r).toLowerCase().includes(q));
      }
      res.json({ total: out.length, records: out });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/records', async (req, res) => {
    try {
      const record = req.body as Record<string, unknown>;
      if (!record?.motherNationalId || !record?.childLastName) {
        return res.status(400).json({ error: 'Missing mandatory birth registration fields.' });
      }
      const id = String(record.id ?? `REG-${Date.now()}`);
      const salt = generateSalt();
      const certHash = hashCertificate(record, salt);
      const now = nowIso();

      const existing = await store.getById('BIRTH', id);
      const row: StoredCert = {
        id,
        payload: { ...record, id },
        salt,
        cert_hash: certHash,
        status: String(record.status ?? 'Pending_Registrar_Seal'),
        anchor_tx_id: null,
        anchored_at: null,
        mother_national_id: (record.motherNationalId as string) ?? null,
        father_national_id: (record.fatherNationalId as string) ?? null,
        created_at: existing?.created_at ?? now,
        updated_at: now,
      };
      const saved = existing
        ? (await store.update('BIRTH', id, row)) ?? row
        : await store.insert('BIRTH', row);

      auditLogs.unshift({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        timestamp: now,
        actor: `${record.attendingPhysicianName ?? 'Physician'} (${record.attendingPhysicianLicense ?? ''})`,
        role: 'Doctor_Midwife',
        action: 'BIRTH_RECORD_HASHED_OFFCHAIN',
        recordId: id,
        details: `Birth record stored off-chain; salted hash ${certHash} ready to anchor.`,
      });

      res.status(201).json({ success: true, record: toBirthResponse(saved), message: 'Birth record stored.' });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.post('/seal', async (req, res) => {
    try {
      const { recordId, registrarName, registrarSealId } = req.body ?? {};
      const target = await store.getById('BIRTH', recordId);
      if (!target) return res.status(404).json({ error: 'Record not found' });
      if (target.status === 'Sealed_On_Chain') {
        return res.status(400).json({ error: 'Record is already sealed on-chain.' });
      }
      blockHeight += 1;
      const sealedAt = nowIso();
      const updated = await store.update('BIRTH', recordId, {
        status: 'Sealed_On_Chain',
        // In Phase 3 this becomes the real NEAR tx id; for now record a placeholder seal marker.
        anchor_tx_id: registrarSealId || `SEAL-PENDING-CHAIN`,
        anchored_at: sealedAt,
      });
      auditLogs.unshift({
        id: `LOG-${Date.now().toString().slice(-4)}`,
        timestamp: sealedAt,
        actor: registrarName || 'Civil Registrar',
        role: 'Civil_Registrar',
        action: 'GOVERNMENT_SEAL_AFFIXED',
        recordId,
        details: `Sealed; block #${blockHeight}.`,
      });
      res.json({ success: true, record: toBirthResponse(updated!), message: `Sealed on block #${blockHeight}.` });
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
    }
  });

  router.get('/audit-logs', (_req, res) => {
    res.json({ total: auditLogs.length, logs: auditLogs });
  });

  router.get('/birth-hash/:nationalId', async (req, res) => {
    try {
      const nid = req.params.nationalId?.trim();
      if (!nid) return res.status(400).json({ found: false, error: 'nationalId required' });
      const row = await store.findBirthByNationalId(nid);
      if (!row) return res.status(404).json({ found: false, nationalId: nid, message: 'No birth record found.' });
      res.json({
        found: true,
        nationalId: nid,
        birthHash: row.cert_hash,
        registrationId: row.id,
        status: row.status,
        zkVerified: true,
        queriedAt: nowIso(),
      });
    } catch (err) {
      res.status(500).json({ found: false, error: (err as Error).message });
    }
  });

  return router;
}
