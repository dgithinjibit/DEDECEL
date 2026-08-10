import React, { useState, useEffect } from 'react';
import { UserRole, BirthRecord, AuditLogEntry } from './types';
import { INITIAL_BIRTH_RECORDS, INITIAL_AUDIT_LOGS } from './data/mockLedger';
import { offlineEngine } from './lib/offlineStore';
import { RoleNavigation } from './components/RoleNavigation';
import { FacultyLandingDashboard } from './components/FacultyLandingDashboard';
import { DoctorEntryPortal } from './components/DoctorEntryPortal';
import { RegistrarPortal } from './components/RegistrarPortal';
import { FamilyPortal } from './components/FamilyPortal';
import { AuditorPortal } from './components/AuditorPortal';
import { DedecelSimulator } from './components/DedecelSimulator';
import { DigitalCertificateModal } from './components/DigitalCertificateModal';
import { ZkVerifierModal } from './components/ZkVerifierModal';
import { apiUrl } from '../services/apiBase';

/*
  BIRTH APP — DeBiCeL's birth-certificate ledger, ported into the merged DEDECEL app.

  This is DeBiCeL's original top-level App, adapted to run as a SECTION inside DEDECEL:
    - The outer full-screen shell + Navbar + footer were removed (the merged app already
      provides the header, wallet chip, and Death/Birth domain switch around this).
    - Everything else (role router, birth record state, offline sync, modals) is preserved.
    - It still talks to DeBiCeL's /api/v1 endpoints when available and falls back to the
      bundled mock ledger otherwise, so it works today with no backend running.
  Colors are inherited from the app-wide brand theme (blue and slate now render as #BA8C63).
*/

export const BirthApp: React.FC = () => {
  const [activeRole, setActiveRole] = useState<UserRole>('Faculty_Overview');
  const [records, setRecords] = useState<BirthRecord[]>(INITIAL_BIRTH_RECORDS);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>(INITIAL_AUDIT_LOGS);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [blockHeight, setBlockHeight] = useState<number>(1851093);
  const [queuedOfflineCount, setQueuedOfflineCount] = useState<number>(0);

  // Modals
  const [certModalRecord, setCertModalRecord] = useState<BirthRecord | null>(null);
  const [zkModalRecord, setZkModalRecord] = useState<BirthRecord | null>(null);

  // 1. Initial Load from Backend API (falls back to bundled mock data on failure)
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [resRecords, resLogs, resHealth] = await Promise.all([
          fetch(apiUrl('/api/v1/records')),
          fetch(apiUrl('/api/v1/audit-logs')),
          fetch(apiUrl('/api/v1/health')),
        ]);

        if (resRecords.ok) {
          const data = await resRecords.json();
          if (data.records) setRecords(data.records);
        }
        if (resLogs.ok) {
          const data = await resLogs.json();
          if (data.logs) setAuditLogs(data.logs);
        }
        if (resHealth.ok) {
          const health = await resHealth.json();
          if (health.blockHeight) setBlockHeight(health.blockHeight);
        }
      } catch (err) {
        console.warn('Birth API fetch fallback to local initial state:', err);
      }
    };
    fetchData();
  }, []);

  // 2. Offline Sync Engine Subscription
  useEffect(() => {
    offlineEngine.init().then(() => {
      updateOfflineQueueCount();
    });

    const unsubscribe = offlineEngine.subscribeStatus((status) => {
      setIsOnline(status);
      if (status) {
        handleSyncOfflineQueue();
      }
    });

    return () => unsubscribe();
  }, []);

  const updateOfflineQueueCount = async () => {
    try {
      const q = await offlineEngine.getQueue();
      setQueuedOfflineCount(q.length);
    } catch (err) {
      console.error(err);
    }
  };

  // Add new birth record handler
  const handleAddRecord = async (record: BirthRecord) => {
    if (!isOnline) {
      await offlineEngine.queueOfflineRecord(record);
      await updateOfflineQueueCount();
      setRecords((prev) => [record, ...prev]);

      const offlineAudit: AuditLogEntry = {
        id: `LOG-OFFLINE-${Date.now().toString().slice(-4)}`,
        timestamp: new Date().toISOString(),
        actor: `${record.attendingPhysicianName} (${record.attendingPhysicianLicense})`,
        role: 'Doctor_Midwife',
        action: 'QUEUED_OFFLINE_RURAL_CLINIC',
        recordId: record.id,
        details: `Offline birth registration queued in IndexedDB. AES-256 encrypted at rest.`,
        hash: `0xoffline_hash_${Date.now()}`,
        ipAddress: 'Offline Local Store',
      };
      setAuditLogs((prev) => [offlineAudit, ...prev]);
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/v1/records'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
      if (response.ok) {
        const data = await response.json();
        setRecords((prev) => [data.record, ...prev.filter((r) => r.id !== data.record.id)]);
      } else {
        setRecords((prev) => [record, ...prev]);
      }
    } catch (err) {
      console.error('POST record failed, queuing offline:', err);
      await offlineEngine.queueOfflineRecord(record);
      await updateOfflineQueueCount();
      setRecords((prev) => [record, ...prev]);
    }
  };

  // Sync offline queue when coming back online
  const handleSyncOfflineQueue = async () => {
    try {
      const queue = await offlineEngine.getQueue();
      if (queue.length === 0) return;

      for (const item of queue) {
        const record = { ...item.record, syncState: 'Synced' as const };
        await fetch(apiUrl('/api/v1/records'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record),
        });
      }

      await offlineEngine.clearQueue();
      await updateOfflineQueueCount();

      const res = await fetch(apiUrl('/api/v1/records'));
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records);
      }
    } catch (err) {
      console.error('Failed to auto-sync queue:', err);
    }
  };

  // Civil Registrar Seal record handler
  const handleSealRecord = async (recordId: string, registrarName: string, sealId: string) => {
    try {
      const res = await fetch(apiUrl('/api/v1/seal'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId, registrarName, registrarSealId: sealId }),
      });

      if (res.ok) {
        const data = await res.json();
        setRecords((prev) => prev.map((r) => (r.id === recordId ? data.record : r)));
        setBlockHeight((prev) => prev + 1);

        const resLogs = await fetch(apiUrl('/api/v1/audit-logs'));
        if (resLogs.ok) {
          const logsData = await resLogs.json();
          setAuditLogs(logsData.logs);
        }
      }
    } catch (err) {
      console.error('Seal error:', err);
    }
  };

  const pendingSealCount = records.filter((r) => r.status === 'Pending_Registrar_Seal').length;

  return (
    <div>
      {/* Role Navigation Bar (birth roles) */}
      <RoleNavigation
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        pendingSealCount={pendingSealCount}
      />

      {/* Main View Router */}
      <div className="pt-4">
        {activeRole === 'Faculty_Overview' && (
          <FacultyLandingDashboard
            records={records}
            blockHeight={blockHeight}
            pendingSealCount={pendingSealCount}
            setActiveRole={setActiveRole}
            onOpenCertificateModal={(r) => setCertModalRecord(r)}
          />
        )}

        {activeRole === 'Doctor_Midwife' && (
          <DoctorEntryPortal
            onAddRecord={handleAddRecord}
            isOnline={isOnline}
            queuedCount={queuedOfflineCount}
          />
        )}

        {activeRole === 'Civil_Registrar' && (
          <RegistrarPortal
            records={records}
            onSealRecord={handleSealRecord}
            onOpenCertificateModal={(r) => setCertModalRecord(r)}
            onOpenZkModal={(r) => setZkModalRecord(r)}
          />
        )}

        {activeRole === 'Family_Certificate' && (
          <FamilyPortal
            records={records}
            onOpenCertificateModal={(r) => setCertModalRecord(r)}
            onOpenZkModal={(r) => setZkModalRecord(r)}
          />
        )}

        {activeRole === 'Judicial_Auditor' && (
          <AuditorPortal
            records={records}
            auditLogs={auditLogs}
            blockHeight={blockHeight}
            onOpenZkModal={(r) => setZkModalRecord(r)}
          />
        )}

        {activeRole === 'DEBICEL_Simulator' && <DedecelSimulator records={records} />}
      </div>

      {/* Modals */}
      <DigitalCertificateModal record={certModalRecord} onClose={() => setCertModalRecord(null)} />
      <ZkVerifierModal record={zkModalRecord} onClose={() => setZkModalRecord(null)} />
    </div>
  );
};
