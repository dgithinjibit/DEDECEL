import React, { useState } from 'react';
import { DeathCertificate, UserPersona } from '../../types';
import { CryptoEngine } from '../../services/cryptoEngine';
import { NearAnchorBadge } from '../NearAnchorBadge';
import { AnchorOutcome } from '../../services/deathRegistry';

interface AgencyVerifierProps {
  persona: UserPersona;
  certificates: DeathCertificate[];
  onOpenExplorer: () => void;
  isChainValid: boolean;
  /** Phase 4: real backend hooks. Present only when VITE_USE_REAL_BACKEND=true. */
  backendEnabled?: boolean;
  /** Recompute the salted hash on the server and compare (tamper-evidence). */
  onRealVerify?: (cert: DeathCertificate) => Promise<{ isValid: boolean; anchoredHash: string | null }>;
  /** GDPR erasure: hard-delete the off-chain PII + salt. */
  onErase?: (cert: DeathCertificate) => Promise<boolean>;
  /** Task #3: NEAR anchoring result per cert id, for the on-chain / NearBlocks badge. */
  anchorOutcomes?: Record<string, AnchorOutcome>;
}

export const AgencyVerifier: React.FC<AgencyVerifierProps> = ({
  persona,
  certificates,
  onOpenExplorer,
  isChainValid,
  backendEnabled = false,
  onRealVerify,
  onErase,
  anchorOutcomes = {},
}) => {
  const [query, setQuery] = useState('');
  const [scannedResult, setScannedResult] = useState<DeathCertificate | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hideMedicalCause, setHideMedicalCause] = useState(true);

  // Phase 4 real-backend action state.
  const [backendBusy, setBackendBusy] = useState(false);
  const [backendMsg, setBackendMsg] = useState<string | null>(null);

  // Only privileged roles may erase (mirrors the registrar/auditor/admin revoke rule).
  const canErase = ['REGISTRAR', 'SYSTEM_AUDITOR', 'ADMIN'].includes(persona.role);

  const handleRealVerify = async () => {
    if (!scannedResult || !onRealVerify) return;
    setBackendBusy(true);
    setBackendMsg(null);
    try {
      const res = await onRealVerify(scannedResult);
      setBackendMsg(
        res.isValid
          ? `On-chain/off-chain hash VERIFIED. Anchored hash: ${res.anchoredHash ?? '(none)'}`
          : `NOT VERIFIED — no matching hash on the backend (record may have been erased or never anchored).`
      );
    } catch (e) {
      setBackendMsg(`Verify failed: ${(e as Error).message}`);
    } finally {
      setBackendBusy(false);
    }
  };

  const handleErase = async () => {
    if (!scannedResult || !onErase) return;
    if (!confirm(`GDPR erasure: permanently delete the off-chain PII + salt for ${scannedResult.id}? The on-chain hash will remain but can no longer be reproduced/verified.`)) {
      return;
    }
    setBackendBusy(true);
    setBackendMsg(null);
    try {
      const erased = await onErase(scannedResult);
      setBackendMsg(
        erased
          ? `Erased. The off-chain record + salt are gone; its hash is now unreproducible.`
          : `Nothing erased (record not found off-chain).`
      );
    } catch (e) {
      setBackendMsg(`Erase failed: ${(e as Error).message}`);
    } finally {
      setBackendBusy(false);
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const match = certificates.find(c => 
      c.id.toLowerCase() === query.trim().toLowerCase() ||
      c.blockchainTxHash?.toLowerCase() === query.trim().toLowerCase() ||
      c.ipfsCid.toLowerCase() === query.trim().toLowerCase() ||
      c.nationalId.toLowerCase() === query.trim().toLowerCase()
    );

    if (match) {
      setScannedResult(match);
    } else {
      alert('Certificate Hash or ID not found on blockchain ledger.');
      setScannedResult(null);
    }
  };

  const handleSimulateQrScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      const randomCert = certificates[0];
      if (randomCert) {
        setQuery(randomCert.id);
        setScannedResult(randomCert);
      }
      setIsScanning(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 font-bold text-xs">
            QR
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Authorized Agency & Public Verification Portal</h1>
            <p className="text-xs text-slate-400 mt-1">
              Verify death certificate authenticity via On-Chain State, IPFS CID, or Zero-Knowledge Proofs.
            </p>
          </div>
        </div>

        <button
          onClick={handleSimulateQrScan}
          disabled={isScanning}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2.5 rounded-none text-xs transition shadow-lg shadow-cyan-500/20 flex items-center gap-2"
        >
          <span>{isScanning ? 'Scanning QR Code…' : 'Simulate Camera QR Scan'}</span>
        </button>
      </div>

      {/* Query Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white">Verify Certificate Hash or QR Code</h2>
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <input
              type="text"
              required
              placeholder="Paste Tx Hash, IPFS CID, or Certificate ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-6 py-2.5 rounded-none text-xs transition shrink-0"
          >
            Verify On-Chain State
          </button>
        </form>
      </div>

      {/* Verification Result Card */}
      {scannedResult ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
          
          {/* Status Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              {scannedResult.status === 'SEALED_ONCHAIN' && isChainValid ? (
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 font-bold text-sm">
                  OK
                </div>
              ) : scannedResult.status === 'REVOKED' ? (
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold text-lg">
                  ×
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-bold text-lg">
                  !
                </div>
              )}

              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">
                    {scannedResult.status === 'SEALED_ONCHAIN' && isChainValid ? 'VERIFIED AUTHENTIC' : 'VERIFICATION ALERT'}
                  </h2>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    scannedResult.status === 'SEALED_ONCHAIN' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}>
                    {scannedResult.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">Smart Contract Ledger Match: Block #{scannedResult.blockNumber || 1}</p>
              </div>
            </div>

            {/* Zero Knowledge Toggle */}
            <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-700 cursor-pointer">
              <span>Zero-Knowledge Selective Privacy</span>
              <input
                type="checkbox"
                checked={hideMedicalCause}
                onChange={(e) => setHideMedicalCause(e.target.checked)}
                className="rounded border-slate-700 text-cyan-500 focus:ring-0 ml-1"
              />
            </label>
          </div>

          {/* Record Data Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Deceased Subject</p>
              <p className="text-sm font-bold text-white mt-1">
                {scannedResult.firstName ? [scannedResult.firstName, scannedResult.secondName, scannedResult.lastName].filter(Boolean).join(' ') : scannedResult.deceasedName}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">National ID: {scannedResult.nationalId}</p>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Date of Occurrence</p>
              <p className="text-sm font-bold text-white mt-1">{scannedResult.dateOfDeath}</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Place: {scannedResult.placeOfDeath}</p>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Medical Diagnosis</p>
              {hideMedicalCause ? (
                <div className="mt-1 flex items-center gap-1.5 text-slate-400 italic font-mono text-[11px]">
                  <span>[ZK-Redacted for Privacy]</span>
                </div>
              ) : (
                <p className="text-sm font-bold text-cyan-300 mt-1">{scannedResult.causeOfDeathICD10}</p>
              )}
              <p className="text-[11px] text-slate-400 mt-0.5">MD: {scannedResult.attendingPhysicianName}</p>
            </div>
          </div>

          {/* Cryptographic Verification Details */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Zero-Knowledge Proof (ZK-SNARK):</span>
              <span className="text-emerald-400">{scannedResult.zeroKnowledgeProof}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">IPFS Encrypted Payload CID:</span>
              <span className="text-slate-300">{scannedResult.ipfsCid}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Transaction Hash:</span>
              <button onClick={onOpenExplorer} className="text-cyan-400 underline hover:text-cyan-300 flex items-center gap-1">
                <span>{scannedResult.blockchainTxHash} ›</span>
              </button>
            </div>
          </div>

          {/* Phase 4: real backend actions (verify against the off-chain store + NEAR; GDPR erase). */}
          {backendEnabled && (
            <div className="bg-slate-950 p-4 rounded-xl border border-brand-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-brand-400 font-semibold uppercase tracking-wider">
                  Real Backend · On-Chain Notary
                </p>
                <span className="text-[10px] text-slate-500">/v2/death/records</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleRealVerify}
                  disabled={backendBusy || !onRealVerify}
                  className="bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
                >
                  {backendBusy ? 'Working…' : 'Verify on Real Backend'}
                </button>
                {canErase && (
                  <button
                    onClick={handleErase}
                    disabled={backendBusy || !onErase}
                    className="bg-rose-700 hover:bg-rose-600 disabled:opacity-50 text-white font-semibold px-4 py-2 rounded-lg text-xs transition-colors"
                  >
                    Erase (GDPR)
                  </button>
                )}
              </div>
              {backendMsg && (
                <p className="text-[11px] text-slate-300 font-mono leading-relaxed break-all">{backendMsg}</p>
              )}
              {/* Task #3: independent on-chain proof — link this cert's anchor tx to NearBlocks. */}
              <div className="pt-2 border-t border-slate-800/80">
                <NearAnchorBadge txId={anchorOutcomes[scannedResult.id]?.txId ?? null} compact />
              </div>
            </div>
          )}

        </div>
      ) : (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          Click "Simulate Camera QR Scan" or paste a Certificate ID above to perform a cryptographic check.
        </div>
      )}

    </div>
  );
};
