import React from 'react';
import { NetworkSpeed, OfflineQueueItem } from '../types';

interface NetworkBandwidthBarProps {
  networkSpeed: NetworkSpeed;
  queueItems: OfflineQueueItem[];
  onTriggerSync: () => void;
  isSyncing: boolean;
}

export const NetworkBandwidthBar: React.FC<NetworkBandwidthBarProps> = ({
  networkSpeed,
  queueItems,
  onTriggerSync,
  isSyncing
}) => {
  const pendingItems = queueItems.filter(i => i.status === 'PENDING' || i.status === 'SYNCING');
  const totalRawSize = pendingItems.reduce((acc, curr) => acc + curr.dataSizeKb, 0);
  const totalCompressedSize = pendingItems.reduce((acc, curr) => acc + curr.compressedSizeKb, 0);
  const compressionSavingsPct = totalRawSize > 0 ? Math.round((1 - totalCompressedSize / totalRawSize) * 100) : 0;

  if (queueItems.length === 0 && networkSpeed === 'ONLINE_5G') {
    return null; // Don't clutter UI when network is fast and queue is empty
  }

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-slate-200 px-4 py-2 text-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Network State indicator */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 font-semibold">
            {networkSpeed === 'OFFLINE' ? (
              <span className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                Offline Mode (Local Storage Encrypted)
              </span>
            ) : networkSpeed === 'EDGE_2G' ? (
              <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                2G Field Network (Low Bandwidth)
              </span>
            ) : networkSpeed === 'LOW_BANDWIDTH_3G' ? (
              <span className="flex items-center gap-1 text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                3G Rural Connection
              </span>
            ) : (
              <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                5G High-Speed Node Connected
              </span>
            )}
          </div>

          {/* Compressed data metric */}
          {pendingItems.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 text-slate-400 text-[11px] font-mono">
              <span>Pending Queue: <strong className="text-white">{pendingItems.length} certs</strong></span>
              <span>•</span>
              <span>Payload: <strong className="text-cyan-400">{totalCompressedSize.toFixed(1)} KB</strong> (Saved {compressionSavingsPct}%)</span>
            </div>
          )}
        </div>

        {/* Sync Trigger Action */}
        <div className="flex items-center gap-3">
          {pendingItems.length > 0 ? (
            <button
              onClick={onTriggerSync}
              disabled={networkSpeed === 'OFFLINE' || isSyncing}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg font-medium text-xs shadow-sm transition ${
                networkSpeed === 'OFFLINE'
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : isSyncing
                  ? 'bg-indigo-600/50 text-indigo-200 cursor-wait'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold'
              }`}
            >
              {isSyncing ? (
                <>
                  <span>Syncing Queue to Blockchain...</span>
                </>
              ) : networkSpeed === 'OFFLINE' ? (
                <>
                  <span>Connect to Network to Broadcast</span>
                </>
              ) : (
                <>
                  <span>Broadcast {pendingItems.length} Off-Chain Items</span>
                </>
              )}
            </button>
          ) : (
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1">
              All offline transactions synced & anchored on-chain
            </span>
          )}
        </div>

      </div>
    </div>
  );
};
