import React, { useState } from 'react';
import { useWallet } from './WalletContext';

/*
  WALLET LOGIN / SIGN-UP SCREEN — letters only, no icons or images.

  On a real deploy the button opens the HOT Wallet / NEAR wallet-selector popup;
  for now it calls our stub `connect()`. There is no separate "sign up" vs "log in"
  with wallets — connecting a wallet IS both.
*/

export const WalletLogin: React.FC = () => {
  const { connect, isConnecting, isRealWallet, authError } = useWallet();
  const [accountId, setAccountId] = useState('');

  const handleConnect = () => {
    void connect(accountId);
  };

  return (
    <div className="min-h-screen bg-[#28292e] text-white flex items-center justify-center px-4 font-sans">
      <div className="w-full max-w-md">
        {/* Wordmark — letters only, no icon/image */}
        <div className="text-center mb-10">
          <p className="text-[11px] tracking-[0.35em] text-brand-400 font-semibold uppercase mb-3">
            Decentralized Registry
          </p>
          <h1 className="text-4xl font-bold tracking-tight">
            DEDECEL <span className="text-brand-400">Ledger</span>
          </h1>
          <p className="text-sm text-slate-400 mt-3">
            Birth &amp; death certificates, verifiable on-chain.
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#232429] border border-slate-700/70 rounded-2xl shadow-2xl p-7">
          <h2 className="font-semibold text-lg mb-1">Connect your wallet</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            Your wallet is your login. Connecting proves who you are and lets you sign official
            actions on NEAR. No password, and no personal data is placed on the public chain.
          </p>

          {/* Stub-only account field. In real-wallet mode the HOT Wallet popup handles this. */}
          {!isRealWallet && (
            <>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                NEAR account &nbsp;<span className="text-slate-500">testnet · optional for demo</span>
              </label>
              <input
                type="text"
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder="alice.testnet"
                className="w-full rounded-lg bg-[#1b1c20] border border-slate-700 px-3 py-2.5 text-sm
                           text-white placeholder-slate-500 focus:outline-none focus:border-brand-500
                           focus:ring-1 focus:ring-brand-500 mb-5"
              />
            </>
          )}

          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60
                       disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors"
          >
            {isConnecting ? 'Waiting for wallet…' : 'Connect Wallet'}
          </button>

          {/* Login error (e.g. user rejected the signature, or key isn't full-access). */}
          {authError && (
            <p className="text-[11px] text-rose-400 mt-3 leading-relaxed">
              {authError}
            </p>
          )}

          <p className="text-[11px] text-slate-500 mt-5 leading-relaxed">
            {isRealWallet
              ? 'Opens your NEAR wallet (installed wallets appear first). You’ll approve a free signature to prove the account is yours — no gas, no transaction.'
              : 'Demo mode connects a simulated wallet (not a real login). Set VITE_USE_REAL_WALLET=true for real NEAR sign-in.'}
          </p>

          {/* No wallet? Offer a way to get one. Shown only in real mode. */}
          {isRealWallet && (
            <p className="text-[11px] text-slate-500 mt-3 leading-relaxed">
              Don’t have a NEAR wallet yet?{' '}
              <a
                href="https://chromewebstore.google.com/detail/hot-wallet/mpobfbnegdfjnpmojpdfdkdhkmecfhpn"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300 underline"
              >
                Get the HOT Wallet extension
              </a>
              {' '}or{' '}
              <a
                href="https://www.mynearwallet.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300 underline"
              >
                use MyNearWallet
              </a>
              {' '}(no install).
            </p>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          NEAR {isRealWallet ? 'testnet' : 'demo'} · $0 environment
        </p>
      </div>
    </div>
  );
};
