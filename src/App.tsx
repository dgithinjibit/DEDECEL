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
import { USER_PERSONAS } from './data/personas';
import { DeathCertificate, FacultyMember, UserPersona, NetworkSpeed, JurisdictionMode, OfflineQueueItem } from './types';

export default function App() {
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
  const handleCreateCertificate = (cert: DeathCertificate) => {
    if (networkSpeed === 'OFFLINE' || networkSpeed === 'EDGE_2G') {
      syncEngine.enqueueCertificate(cert, 'CREATE');
      alert(`Network connection is ${networkSpeed}. Certificate #${cert.id} saved to encrypted local IndexedDB queue and ready to broadcast.`);
      refreshLedgerState();
    } else {
      ledger.addTransactionAndMine(cert, 'CREATE', currentPersona.licenseOrId, currentPersona.role);
      refreshLedgerState();
    }
  };

  // Handle Civil Registrar Approval & On-Chain Seal for Death Record
  const handleApproveCertificate = (cert: DeathCertificate) => {
    if (networkSpeed === 'OFFLINE') {
      syncEngine.enqueueCertificate(cert, 'APPROVE');
      alert(`Approval queued offline. Will broadcast when back online.`);
      refreshLedgerState();
    } else {
      ledger.addTransactionAndMine(cert, 'APPROVE', currentPersona.licenseOrId, currentPersona.role);
      refreshLedgerState();
    }
  };

  // Handle Revocation
  const handleRevokeCertificate = (cert: DeathCertificate, reason: string) => {
    const updatedCert = { ...cert, amendmentReason: reason };
    ledger.addTransactionAndMine(updatedCert, 'REVOKE', currentPersona.licenseOrId, currentPersona.role);
    refreshLedgerState();
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
    setTimeout(() => {
      const queue = syncEngine.getQueue();
      queue.forEach((item) => {
        try {
          ledger.addTransactionAndMine(item.certificate, item.action, currentPersona.licenseOrId, currentPersona.role);
        } catch (e) {
          console.error("Sync item failed:", e);
        }
      });
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

      {/* Network Bandwidth Status Bar */}
      <NetworkBandwidthBar
        networkSpeed={networkSpeed}
        queueItems={offlineQueue}
        onTriggerSync={handleTriggerSyncQueue}
        isSyncing={isSyncing}
      />

      {/* Main View Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeViewMode === 'PUBLIC' ? (
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
