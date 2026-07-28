import React from 'react';
import { 
  Activity, 
  Boxes, 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Database, 
  Cpu, 
  Lock, 
  Globe2, 
  CheckCircle2, 
  AlertOctagon,
  Flame
} from 'lucide-react';
import { Block, DeathCertificate, JurisdictionMode } from '../../types';

interface SystemAuditorProps {
  blocks: Block[];
  certificates: DeathCertificate[];
  jurisdiction: JurisdictionMode;
  onSimulateTamper: (blockIndex: number) => void;
  onResetGenesis: () => void;
  isChainValid: boolean;
  chainValidationMessage: string;
}

export const SystemAuditor: React.FC<SystemAuditorProps> = ({
  blocks,
  certificates,
  jurisdiction,
  onSimulateTamper,
  onResetGenesis,
  isChainValid,
  chainValidationMessage
}) => {
  return (
    <div className="space-y-6">
      
      {/* Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shrink-0">
            <Activity className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white">Smart Contract & Blockchain Security Console</h1>
            <p className="text-xs text-slate-400 mt-1">
              Consensus node state monitor, zero-knowledge verifier, and data sovereignty auditor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onResetGenesis}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-3.5 py-2 rounded-none text-xs font-semibold transition flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Ledger to Genesis State</span>
          </button>
        </div>
      </div>

      {/* Chain Status Card */}
      <div className={`p-6 rounded-2xl border shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 ${
        isChainValid 
          ? 'bg-emerald-950/30 border-emerald-500/40' 
          : 'bg-rose-950/40 border-rose-500/50 animate-pulse'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
            isChainValid ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
          }`}>
            {isChainValid ? <ShieldCheck className="w-7 h-7" /> : <ShieldAlert className="w-7 h-7" />}
          </div>
          <div>
            <h2 className={`text-base font-bold ${isChainValid ? 'text-emerald-300' : 'text-rose-300'}`}>
              {isChainValid ? 'Blockchain Consensus Active & 100% Cryptographically Sound' : 'CRITICAL ALERT: Blockchain Ledger Tampering Detected!'}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">{chainValidationMessage}</p>
          </div>
        </div>

        {/* Security Tamper Simulation Button */}
        <button
          onClick={() => onSimulateTamper(1)}
          className="bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 px-4 py-2.5 rounded-none text-xs font-bold transition flex items-center gap-2 shrink-0"
          title="Corrupt Block #1 payload to test automatic Merkle root hash verification failure"
        >
          <Flame className="w-4 h-4 text-rose-400" />
          <span>Simulate Malicious Tamper Attack (Block #1)</span>
        </button>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Block Height</span>
            <Boxes className="w-4 h-4 text-cyan-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">#{blocks.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">Total Mined Blocks</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Indexed Certificates</span>
            <Database className="w-4 h-4 text-indigo-400" />
          </div>
          <p className="text-2xl font-bold text-white mt-2">{certificates.length}</p>
          <p className="text-[10px] text-slate-500 mt-1">Encrypted Records</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Validator Consensus</span>
            <Cpu className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-2">4 Nodes</p>
          <p className="text-[10px] text-slate-500 mt-1">Byzantine Fault Tolerant</p>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Sovereignty Regime</span>
            <Globe2 className="w-4 h-4 text-amber-400" />
          </div>
          <p className="text-lg font-bold text-amber-300 mt-2 truncate">{jurisdiction}</p>
          <p className="text-[10px] text-slate-500 mt-1">Active Privacy Standard</p>
        </div>
      </div>

      {/* Blocks List */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white">Blocks & Merkle Root Chain Log</h2>
        <div className="space-y-3">
          {blocks.map((block) => (
            <div key={block.index} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold text-cyan-400 text-sm">Block #{block.index}</span>
                <span className="text-[10px] text-slate-500">{new Date(block.timestamp).toLocaleString()}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-500">Block Hash: </span>
                  <span className="text-slate-200 truncate block">{block.hash}</span>
                </div>
                <div>
                  <span className="text-slate-500">Merkle Root: </span>
                  <span className="text-emerald-400 truncate block">{block.merkleRoot}</span>
                </div>
                <div>
                  <span className="text-slate-500">Previous Hash: </span>
                  <span className="text-slate-400 truncate block">{block.previousHash}</span>
                </div>
                <div>
                  <span className="text-slate-500">Validator Node: </span>
                  <span className="text-indigo-400 truncate block">{block.validator}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
};
