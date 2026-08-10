import React, { useState, useEffect } from 'react';
import { offlineEngine } from '../lib/offlineStore';

interface NavbarProps {
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  blockHeight: number;
  pendingCount: number;
  queuedOfflineCount: number;
  onSyncOfflineQueue: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  isOnline,
  setIsOnline,
  blockHeight,
  pendingCount,
  queuedOfflineCount,
  onSyncOfflineQueue
}) => {
  const [isSyncing, setIsSyncing] = useState(false);

  const toggleNetwork = () => {
    const nextStatus = !isOnline;
    setIsOnline(nextStatus);
    offlineEngine.setOnlineSimulated(nextStatus);
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    await onSyncOfflineQueue();
    setTimeout(() => setIsSyncing(false), 800);
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-lg">
      {/* Top System Status Banner */}
      <div className="bg-slate-950 px-4 py-1.5 border-b border-slate-800/80 text-xs font-mono text-slate-400 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              DEBICEL B2G CORE NODE #01
            </span>
          <span className="hidden sm:inline-block text-slate-600">|</span>
          <span className="flex items-center gap-1 text-slate-300">
            Block #{blockHeight.toLocaleString()}
          </span>
          <span className="hidden sm:inline-block text-slate-600">|</span>
          <span className="flex items-center gap-1 text-slate-300">
            9/9 BFT Nodes (100% Sync)
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-slate-400">
            AES-256-GCM + ZK-Groth16
          </span>
          
          {/* Offline Queue Badge */}
          {queuedOfflineCount > 0 && (
            <button 
              onClick={handleManualSync}
              disabled={!isOnline || isSyncing}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold ${
                isOnline 
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer' 
                  : 'bg-slate-800 text-slate-400 border border-slate-700'
              }`}
            >
              {isSyncing && <span>…</span>}
              {queuedOfflineCount} Queued Offline
            </button>
          )}

          {/* Network Switch Toggle */}
          <button
            onClick={toggleNetwork}
            className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-xs font-medium transition-all ${
              isOnline
                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 hover:bg-emerald-900'
                : 'bg-amber-950/80 text-amber-300 border-amber-500/50 hover:bg-amber-900'
            }`}
            title="Click to simulate low-bandwidth or offline rural clinic state"
          >
            {isOnline ? (
              <span>ONLINE MODE</span>
            ) : (
              <span>RURAL OFFLINE MODE</span>
            )}
          </button>
        </div>
      </div>

      {/* Main Branding Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-blue-600 via-indigo-600 to-slate-900 p-0.5 shadow-md flex items-center justify-center">
            <div className="h-full w-full bg-slate-900 rounded-[7px] flex items-center justify-center">
              <span className="text-blue-400 font-bold text-sm">DB</span>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                DEBICEL
                <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 font-mono font-normal">
                  v1.4 B2G
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400">
              Decentralized Birth Certificate Ledger & Dual-Key Attestation Network
            </p>
          </div>
        </div>

        {/* Badges / Metrics */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-3 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/80">
            <div className="flex items-center gap-1.5 text-slate-300">
              <span>Host Node: <strong>FAC-NY-7701 (Mt. Sinai)</strong></span>
            </div>
            <span className="text-slate-600">|</span>
            <div className="flex items-center gap-1.5 text-slate-300">
              <span>Dual-Key: <strong>Active</strong></span>
            </div>
          </div>

          {pendingCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 text-amber-300 px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              {pendingCount} Pending Registrar Seal
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
