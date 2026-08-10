import React, { useState, useEffect } from 'react';
import { HeaderNavbar } from './components/HeaderNavbar';
import { NetworkBandwidthBar } from './components/NetworkBandwidthBar';
import { PublicHomepage } from './components/PublicHomepage';
import { MedicalDashboard } from './components/RoleViews/MedicalDashboard';
import { RegistrarDashboard } from './components/RoleViews/RegistrarDashboard';
import { FamilyPortal } from './components/RoleViews/FamilyPortal';
import { AgencyVerifier } from './components/RoleViews/AgencyVerifier';
import { SystemAuditor } from './components/RoleViews/SystemAuditor';
import { AdminPortal } from './components/RoleViews/AdminPortal';
import { BlockExplorerModal } from './components/BlockExplorerModal';
import { FhirInteropModal } from './components/FhirInteropModal';
import { EdgeCasesGrillModal } from './components/EdgeCasesGrillModal';
import { CertificatePDFGenerator } from './components/CertificatePDFGenerator';

import { BlockchainLedger } from './services/blockchain';
import { OfflineSyncEngine } from './services/offlineSync';
import {
  persistDeathRecord,
  anchorDeathRecord,
  verifyDeathRecord,
  eraseDeathRecord,
  deathBackendEnabled,
} from './services/deathRegistry';
import { USER_PERSONAS } from './data/personas';
import { DeathCertificate, FacultyMember, UserPersona, NetworkSpeed, JurisdictionMode, OfflineQueueItem } from './types';
import { useWallet } from './wallet/WalletContext';
import { WalletLogin } from './wallet/WalletLogin';
import { BirthApp } from './birth/BirthApp';

/** Which certificate domain the user is viewing. DEATH is the original app; BIRTH is the folded-in DeBiCeL. */
type CertDomain = 'DEATH' | 'BIRTH';

export default function App() {
  const { isAuthenticated, accountId, disconnect } = useWallet();

  // Domain switch (Death = original DEDECEL; Birth = folded-in DeBiCeL, ported in Phase 1.3).
  const [domain, setDomain] = useState<CertDomain>('DEATH');

  const [ledger] = useState(() => new BlockchainLedger());
  const [syncEngine] = useState(() => new OfflineSyncEngine());

  const [activeViewMode, setActiveViewMode] = useState<'PUBLIC' | 'PORTAL'>('PUBLIC');
  const [currentPersona, setCurrentPersona] = useState<UserPersona>(USER_PERSONAS.MEDICAL_OFFICER);
  const [networkSpeed, setNetworkSpeed] = useState<NetworkSpeed>('ONLINE_5G');
  const [jurisdiction, setJurisdiction] = useState<JurisdictionMode>('KE_PDPA');

  const [blocks, setBlocks] = useState(ledger.getBlocks());
  const [certificates, setCertificates] = useState(ledger.getCertificates());
  const [facultyMembers, setFacultyMembers] = useState(ledger.getFacultyMembers());
  const [offlineQueue, setOfflineQueue] = useState<OfflineQueueItem[]>(syncEngine.getQueue());

  const [isSyncing, setIsSyncing] = useState(false);
  const [isChainValid, setIsChainValid] = useState(true);
  const [chainValidationMessage, setChainValidationMessage] = useState('');

  // Phase 4: server-computed salted hash per death cert id (from the real backend on CREATE).
  // Needed at APPROVE time to anchor the authoritative hash on NEAR. Empty in mock mode.
  const [certHashes, setCertHashes] = useState<Record<string, string>>({});

  // Modals state
  const [showExplorerModal, setShowExplorerModal] = useState(false);
  const [showFhirModal, setShowFhirModal] = useState(false);
  const [showEdgeCasesModal, setShowEdgeCasesModal] = useState(false);
  const [pdfModalCert, setPdfModalCert] = useState<DeathCertificate | null>(null);

  // Validate chain state on mount and update
  const refreshLedgerState = () => {
    setBlocks([...ledger.getBlocks()]);
    setCertificates([...ledger.getCertificates()]);
    setFacultyMembers([...ledger.getFacultyMembers()]);
    setOfflineQueue([...syncEngine.getQueue()]);

    const val = ledger.verifyChainIntegrity();
    setIsChainValid(val.isValid);
    setChainValidationMessage(val.message);
  };

  useEffect(() => {
    refreshLedgerState();
  }, []);

  // Handle creating new death certificate
  const handleCreateCertificate = async (cert: DeathCertificate) => {
    if (networkSpeed === 'OFFLINE' || networkSpeed === 'EDGE_2G') {
      syncEngine.enqueueCertificate(cert, 'CREATE');
      alert(`Network connection is ${networkSpeed}. Certificate #${cert.id} saved to encrypted local IndexedDB queue and ready to broadcast.`);
      refreshLedgerState();
      return;
    }

    // Visual simulation (block explorer, merkle, etc.) — unchanged.
    ledger.addTransactionAndMine(cert, 'CREATE', currentPersona.licenseOrId, currentPersona.role);
    refreshLedgerState();

    // Phase 4: also store the PII off-chain and keep the server-computed salted hash for anchoring.
    if (deathBackendEnabled) {
      try {
        const { certHash } = await persistDeathRecord(cert);
        if (certHash) setCertHashes((prev) => ({ ...prev, [cert.id]: certHash }));
      } catch (e) {
        console.error('Off-chain persist failed:', e);
        alert(`Saved to the visual ledger, but the off-chain backend rejected it: ${(e as Error).message}`);
      }
    }
  };

  // Handle Civil Registrar Approval & On-Chain Seal for Death Record
  const handleApproveCertificate = async (cert: DeathCertificate) => {
    if (networkSpeed === 'OFFLINE') {
      syncEngine.enqueueCertificate(cert, 'APPROVE');
      alert(`Approval queued offline. Will broadcast when back online.`);
      refreshLedgerState();
      return;
    }

    // Visual simulation (seal the block) — unchanged.
    ledger.addTransactionAndMine(cert, 'APPROVE', currentPersona.licenseOrId, currentPersona.role);
    refreshLedgerState();

    // Phase 4: anchor the REAL salted hash on NEAR (backend signs + writes; only the hash goes on-chain).
    if (deathBackendEnabled) {
      try {
        // Prefer the hash from CREATE; otherwise re-persist to obtain the authoritative one.
        let certHash = certHashes[cert.id];
        if (!certHash) {
          certHash = (await persistDeathRecord(cert)).certHash ?? '';
          if (certHash) setCertHashes((prev) => ({ ...prev, [cert.id]: certHash }));
        }
        if (!certHash) throw new Error('no off-chain hash available to anchor');

        const outcome = await anchorDeathRecord(cert, certHash);
        alert(
          outcome.onChain
            ? `Sealed on NEAR. Real transaction: ${outcome.txId}`
            : `Sealed. Anchor recorded (${outcome.txId}). NEAR is disabled — set NEAR_* in backend/.env for a real on-chain tx.`
        );
      } catch (e) {
        console.error('On-chain anchor failed:', e);
        alert(`Sealed in the visual ledger, but on-chain anchoring failed: ${(e as Error).message}`);
      }
    }
  };

  // Handle Revocation
  const handleRevokeCertificate = (cert: DeathCertificate, reason: string) => {
    const updatedCert = { ...cert, amendmentReason: reason };
    ledger.addTransactionAndMine(updatedCert, 'REVOKE', currentPersona.licenseOrId, currentPersona.role);
    refreshLedgerState();
  };

  // Phase 4: verify a death cert against the real backend (recompute salted hash + compare).
  const handleRealVerifyCertificate = async (cert: DeathCertificate) => {
    let certHash = certHashes[cert.id];
    if (!certHash) {
      // Not created this session — ensure it's stored, then use the authoritative hash.
      certHash = (await persistDeathRecord(cert)).certHash ?? '';
      if (certHash) setCertHashes((prev) => ({ ...prev, [cert.id]: certHash }));
    }
    const res = await verifyDeathRecord(cert, certHash);
    return { isValid: res.isValid, anchoredHash: res.anchoredHash };
  };

  // Phase 4: GDPR erasure — hard-delete the off-chain PII + salt, and drop it from the UI state.
  const handleEraseCertificate = async (cert: DeathCertificate) => {
    const erased = await eraseDeathRecord(cert.id);
    if (erased) {
      setCertHashes((prev) => {
        const next = { ...prev };
        delete next[cert.id];
        return next;
      });
    }
    return erased;
  };

  // Faculty Management Handlers
  const handleAddFacultyMember = (member: FacultyMember) => {
    ledger.addOrUpdateFacultyMember(member);
    refreshLedgerState();
  };

  const handleToggleFacultyStatus = (id: string, newStatus: 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED') => {
    ledger.toggleFacultyStatus(id, newStatus);
    refreshLedgerState();
  };

  // Handle Offline Queue Broadcast
  const handleTriggerSyncQueue = () => {
    setIsSyncing(true);
    setTimeout(async () => {
      const queue = syncEngine.getQueue();
      for (const item of queue) {
        try {
          ledger.addTransactionAndMine(item.certificate, item.action, currentPersona.licenseOrId, currentPersona.role);
          // Phase 4: replay the real backend side of each queued action too.
          if (deathBackendEnabled) {
            if (item.action === 'CREATE') {
              const { certHash } = await persistDeathRecord(item.certificate);
              if (certHash) setCertHashes((prev) => ({ ...prev, [item.certificate.id]: certHash }));
            } else if (item.action === 'APPROVE') {
              const { certHash } = await persistDeathRecord(item.certificate);
              if (certHash) await anchorDeathRecord(item.certificate, certHash);
            }
          }
        } catch (e) {
          console.error("Sync item failed:", e);
        }
      }
      syncEngine.clearQueue();
      setIsSyncing(false);
      refreshLedgerState();
      alert(`Broadcasting complete! ${queue.length} off-chain certificates anchored on-chain.`);
    }, 1500);
  };

  // Handle Tamper Attack Simulation
  const handleSimulateTamper = (blockIndex: number) => {
    ledger.simulateTamperAttack(blockIndex);
    refreshLedgerState();
  };

  // Handle Reset to Genesis State
  const handleResetGenesis = () => {
    if (confirm('Are you sure you want to reset the blockchain ledger back to Genesis state?')) {
      ledger.resetToGenesis();
      syncEngine.clearQueue();
      refreshLedgerState();
    }
  };

  // Wallet gate: until the wallet is connected AND verified (real signature), show only the
  // login screen. Merely connecting is not enough — the backend must confirm account ownership.
  if (!isAuthenticated) {
    return <WalletLogin />;
  }

  return (
    <div className="min-h-screen bg-[#28292e] text-[#ffffff] flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Header & Navbar */}
      <HeaderNavbar
        currentPersona={currentPersona}
        onSelectPersona={(persona) => {
          setCurrentPersona(persona);
          setActiveViewMode('PORTAL');
        }}
        networkSpeed={networkSpeed}
        onSelectNetworkSpeed={setNetworkSpeed}
        pendingQueueCount={offlineQueue.filter(q => q.status === 'PENDING').length}
        jurisdiction={jurisdiction}
        onSelectJurisdiction={setJurisdiction}
        onOpenExplorer={() => setShowExplorerModal(true)}
        onOpenFhir={() => setShowFhirModal(true)}
        onOpenEdgeCases={() => setShowEdgeCasesModal(true)}
        isChainValid={isChainValid}
        activeViewMode={activeViewMode}
        onSelectViewMode={setActiveViewMode}
      />

      {/* Domain switch (Birth / Death) + connected-wallet chip */}
      <div className="bg-[#232429] border-b border-slate-700/60">
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-2 flex items-center justify-between gap-3">
          <div className="inline-flex rounded-lg bg-[#1f2024] border border-slate-700 p-0.5">
            <button
              onClick={() => setDomain('DEATH')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                domain === 'DEATH' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Death Certificates
            </button>
            <button
              onClick={() => setDomain('BIRTH')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                domain === 'BIRTH' ? 'bg-brand-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Birth Certificates
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="hidden sm:inline-flex items-center text-slate-300 bg-[#1f2024] border border-slate-700 rounded-full px-3 py-1">
              {accountId}
            </span>
            <button
              onClick={disconnect}
              className="inline-flex items-center text-slate-300 hover:text-white border border-slate-700 hover:border-brand-500 rounded-full px-3 py-1 transition-colors"
            >
              Disconnect
            </button>
          </div>
        </div>
      </div>

      {/* Network Bandwidth Status Bar */}
      <NetworkBandwidthBar
        networkSpeed={networkSpeed}
        queueItems={offlineQueue}
        onTriggerSync={handleTriggerSyncQueue}
        isSyncing={isSyncing}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {domain === 'BIRTH' ? (
          <BirthApp />
        ) : activeViewMode === 'PUBLIC' ? (
          <PublicHomepage
            certificates={certificates}
            blocksCount={blocks.length}
            onSelectRole={(persona) => {
              setCurrentPersona(persona);
              setActiveViewMode('PORTAL');
            }}
            onOpenExplorer={() => setShowExplorerModal(true)}
            onOpenFhir={() => setShowFhirModal(true)}
            onOpenEdgeCases={() => setShowEdgeCasesModal(true)}
            onOpenPdfModal={(cert) => setPdfModalCert(cert)}
            isChainValid={isChainValid}
            jurisdiction={jurisdiction}
          />
        ) : (
          <>
            {currentPersona.role === 'ADMIN' && (
              <AdminPortal
                persona={currentPersona}
                facultyMembers={facultyMembers}
                onAddFacultyMember={handleAddFacultyMember}
                onToggleFacultyStatus={handleToggleFacultyStatus}
                jurisdiction={jurisdiction}
                onJurisdictionChange={setJurisdiction}
                totalDeathsCount={certificates.length}
                totalBlocksCount={blocks.length}
                onResetGenesis={handleResetGenesis}
              />
            )}

            {currentPersona.role === 'MEDICAL_OFFICER' && (
              <MedicalDashboard
                persona={currentPersona}
                certificates={certificates}
                onCreateCertificate={handleCreateCertificate}
                networkSpeed={networkSpeed}
                onImportFhir={(fhirJson) => console.log('FHIR Imported', fhirJson)}
              />
            )}

            {currentPersona.role === 'REGISTRAR' && (
              <RegistrarDashboard
                persona={currentPersona}
                certificates={certificates}
                onApproveCertificate={handleApproveCertificate}
                onRevokeCertificate={handleRevokeCertificate}
                onOpenExplorer={() => setShowExplorerModal(true)}
              />
            )}

            {currentPersona.role === 'FAMILY' && (
              <FamilyPortal
                persona={currentPersona}
                certificates={certificates}
                onOpenPdfModal={(cert) => setPdfModalCert(cert)}
              />
            )}

            {currentPersona.role === 'VERIFIER_AGENCY' && (
              <AgencyVerifier
                persona={currentPersona}
                certificates={certificates}
                onOpenExplorer={() => setShowExplorerModal(true)}
                isChainValid={isChainValid}
                backendEnabled={deathBackendEnabled}
                onRealVerify={handleRealVerifyCertificate}
                onErase={handleEraseCertificate}
              />
            )}

            {currentPersona.role === 'SYSTEM_AUDITOR' && (
              <SystemAuditor
                blocks={blocks}
                certificates={certificates}
                jurisdiction={jurisdiction}
                onSimulateTamper={handleSimulateTamper}
                onResetGenesis={handleResetGenesis}
                isChainValid={isChainValid}
                chainValidationMessage={chainValidationMessage}
              />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-[#28292e] py-6 text-center text-xs text-slate-300">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 DEDECEL - Decentralized Death Certificate Ledger. Built on Immutable Smart Contract Infrastructure.</p>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowExplorerModal(true)} className="hover:text-cyan-400">Block Explorer</button>
            <span>•</span>
            <button onClick={() => setShowFhirModal(true)} className="hover:text-emerald-400">FHIR HL7 Bridge</button>
            <span>•</span>
            <button onClick={() => setShowEdgeCasesModal(true)} className="hover:text-amber-400">Edge Cases Grill</button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showExplorerModal && (
        <BlockExplorerModal
          blocks={blocks}
          onClose={() => setShowExplorerModal(false)}
        />
      )}

      {showFhirModal && (
        <FhirInteropModal
          certificates={certificates}
          onClose={() => setShowFhirModal(false)}
        />
      )}

      {showEdgeCasesModal && (
        <EdgeCasesGrillModal
          onClose={() => setShowEdgeCasesModal(false)}
          onSelectNetworkSpeed={setNetworkSpeed}
          onSimulateTamper={handleSimulateTamper}
        />
      )}

      {pdfModalCert && (
        <CertificatePDFGenerator
          cert={pdfModalCert}
          onClose={() => setPdfModalCert(null)}
        />
      )}

    </div>
  );
}
