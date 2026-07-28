import React, { useState } from 'react';
import { 
  QrCode, 
  Search, 
  ShieldCheck, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Lock, 
  FileCheck2, 
  Camera,
  ExternalLink,
  ShieldAlert
} from 'lucide-react';
import { DeathCertificate, UserPersona } from '../../types';
import { CryptoEngine } from '../../services/cryptoEngine';

interface AgencyVerifierProps {
  persona: UserPersona;
  certificates: DeathCertificate[];
  onOpenExplorer: () => void;
  isChainValid: boolean;
}

export const AgencyVerifier: React.FC<AgencyVerifierProps> = ({
  persona,
  certificates,
  onOpenExplorer,
  isChainValid
}) => {
  const [query, setQuery] = useState('');
  const [scannedResult, setScannedResult] = useState<DeathCertificate | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [hideMedicalCause, setHideMedicalCause] = useState(true);

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
          <div className="w-12 h-12 rounded-2xl bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <QrCode className="w-7 h-7" />
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
          <Camera className="w-4 h-4" />
          <span>{isScanning ? 'Scanning QR Code...' : 'Simulate Camera QR Scan'}</span>
        </button>
      </div>

      {/* Query Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white">Verify Certificate Hash or QR Code</h2>
        <form onSubmit={handleVerify} className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
            <input
              type="text"
              required
              placeholder="Paste Tx Hash, IPFS CID, or Certificate ID..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
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
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
              ) : scannedResult.status === 'REVOKED' ? (
                <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
                  <XCircle className="w-6 h-6" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <AlertTriangle className="w-6 h-6" />
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
              <Lock className="w-3.5 h-3.5 text-cyan-400" />
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
                  <Lock className="w-3.5 h-3.5 text-emerald-400" />
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
                <span>{scannedResult.blockchainTxHash}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-slate-900/50 border border-dashed border-slate-800 rounded-2xl p-12 text-center text-slate-500 text-xs">
          Click "Simulate Camera QR Scan" or paste a Certificate ID above to perform a cryptographic check.
        </div>
      )}

    </div>
  );
};
