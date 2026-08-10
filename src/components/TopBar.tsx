import React from 'react';
import { NetworkSpeed } from '../types';
import { useWallet } from '../wallet/WalletContext';

/*
  TOP BAR — slim header for the app shell.

  The old horizontal navbar is gone; navigation now lives in the left Sidebar. This bar keeps
  only what belongs at the top of every screen:

    - a big DEDECEL wordmark + slogan (the whole point of freeing the horizontal space)
    - the live network-speed status (with the offline queue count)
    - the connected wallet chip + Disconnect (read straight from useWallet())
    - a chain-integrity warning banner when the ledger was tampered with
    - a "Menu" button on mobile to open the sidebar drawer

  LETTERS ONLY (no icons/images). Brand colour #BA8C63 via `brand-*`.
*/

interface TopBarProps {
  networkSpeed: NetworkSpeed;
  onSelectNetworkSpeed: (speed: NetworkSpeed) => void;
  pendingQueueCount: number;
  isChainValid: boolean;
  onOpenExplorer: () => void; // used by the warning banner's "Inspect" link
  onOpenSidebar: () => void;  // mobile hamburger
}

export const TopBar: React.FC<TopBarProps> = ({
  networkSpeed,
  onSelectNetworkSpeed,
  pendingQueueCount,
  isChainValid,
  onOpenExplorer,
  onOpenSidebar,
}) => {
  // Wallet chip reads directly from context — no props needed (avoids threading through App).
  const { accountId, disconnect } = useWallet();

  return (
    <header className="bg-[#28292e] border-b border-slate-700/80 text-white sticky top-0 z-30 shadow-lg">
      {/* Chain-integrity warning (only when a block was tampered with) */}
      {!isChainValid && (
        <div className="bg-rose-600 text-white px-4 py-1.5 text-xs font-semibold flex items-center justify-between gap-3">
          <span>WARNING: Blockchain ledger integrity compromised! A block was tampered with.</span>
          <button
            onClick={onOpenExplorer}
            className="underline hover:text-slate-200 text-xs font-bold shrink-0"
          >
            Inspect Block Explorer
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 h-16 px-4 sm:px-6">
        {/* Left: mobile hamburger + big wordmark & slogan */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onOpenSidebar}
            className="lg:hidden text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700 transition-colors shrink-0"
            aria-label="Open navigation"
          >
            Menu
          </button>

          <div className="min-w-0">
            <h1 className="font-extrabold tracking-tight text-2xl sm:text-3xl leading-none truncate">
              DEDECEL <span className="text-brand-400">Ledger</span>
            </h1>
            <p className="hidden sm:block text-xs text-slate-400 mt-0.5 truncate">
              Decentralized Birth &amp; Death Certificate Ledger — verifiable on-chain
            </p>
          </div>
        </div>

        {/* Right: network status + wallet chip */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Network speed */}
          <div className="flex items-center gap-1 bg-slate-800 p-1 rounded-lg border border-slate-700">
            {networkSpeed === 'OFFLINE' ? (
              <span className="text-rose-400 ml-1.5 text-[10px] font-bold">OFF</span>
            ) : (
              <span className="text-emerald-400 ml-1.5 text-[10px] font-bold">ON</span>
            )}
            <select
              value={networkSpeed}
              onChange={(e) => onSelectNetworkSpeed(e.target.value as NetworkSpeed)}
              className="bg-transparent text-slate-200 text-xs focus:outline-none cursor-pointer font-medium pr-1"
            >
              <option value="ONLINE_5G" className="bg-slate-900">5G High Speed</option>
              <option value="LOW_BANDWIDTH_3G" className="bg-slate-900">3G Rural Network</option>
              <option value="EDGE_2G" className="bg-slate-900">2G Low Bandwidth</option>
              <option value="OFFLINE" className="bg-slate-900">Offline Field Mode</option>
            </select>
            {pendingQueueCount > 0 && (
              <span className="bg-amber-500 text-slate-950 font-bold text-[10px] px-1.5 py-0.5 rounded-full">
                {pendingQueueCount}
              </span>
            )}
          </div>

          {/* Wallet chip */}
          <span className="hidden md:inline-flex items-center text-xs text-slate-300 bg-[#1f2024] border border-slate-700 rounded-full px-3 py-1 max-w-[180px] truncate">
            {accountId}
          </span>
          <button
            onClick={disconnect}
            className="inline-flex items-center text-xs text-slate-300 hover:text-white border border-slate-700 hover:border-brand-500 rounded-full px-3 py-1 transition-colors"
          >
            Disconnect
          </button>
        </div>
      </div>
    </header>
  );
};
