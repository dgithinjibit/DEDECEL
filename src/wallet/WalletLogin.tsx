import React from 'react';
import { useWallet } from './WalletContext';

/*
  WALLET LOGIN / SIGN-UP SCREEN — letters only, no icons or images.

  REAL NEAR WALLET ONLY. Two steps:
    1. "Connect Wallet"  -> opens the NEAR wallet-selector modal (HOT, MyNearWallet, etc.).
    2. "Sign in"         -> once a wallet is connected, a click signs the backend challenge
                            (NEP-413). The click is required so the browser doesn't block the
                            wallet popup ("Popup window blocked").
  There is NO demo/stub form: you cannot get past this screen without a real wallet + signature.
  Connecting a wallet IS both sign-up and log-in on NEAR.
*/

export const WalletLogin: React.FC = () => {
  const { connect, signIn, isConnecting, authError, isConnected, accountId: connectedAccount } =
    useWallet();

  const handleConnect = () => {
    void connect();
  };

  const handleSignIn = () => {
    void signIn();
  };

  // Once a wallet is connected (account picked) but not yet verified, show the "Sign in" step.
  // Clicking it triggers the wallet signature FROM a user gesture, so the browser doesn't block
  // the popup ("Popup window blocked").
  const showSignInStep = isConnected;

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
          <h2 className="font-semibold text-lg mb-1">
            {showSignInStep ? 'Sign in to continue' : 'Connect your wallet'}
          </h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {showSignInStep ? (
              <>
                Connected as <span className="font-mono text-slate-200">{connectedAccount}</span>. Click below
                to sign a free message proving this account is yours. No gas, no transaction.
              </>
            ) : (
              <>
                Your wallet is your login. Connecting proves who you are and lets you sign official
                actions on NEAR. No password, and no personal data is placed on the public chain.
              </>
            )}
          </p>

          {showSignInStep ? (
            <button
              onClick={handleSignIn}
              disabled={isConnecting}
              className="w-full rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60
                         disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors"
            >
              {isConnecting ? 'Waiting for signature…' : 'Sign in'}
            </button>
          ) : (
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="w-full rounded-lg bg-brand-600 hover:bg-brand-500 disabled:opacity-60
                         disabled:cursor-not-allowed text-white font-semibold py-3 transition-colors"
            >
              {isConnecting ? 'Waiting for wallet…' : 'Connect Wallet'}
            </button>
          )}

          {/* Login error (e.g. user rejected the signature, or a network mismatch). */}
          {authError && (
            <p className="text-[11px] text-rose-400 mt-3 leading-relaxed">
              {authError}
            </p>
          )}

          <p className="text-[11px] text-slate-500 mt-5 leading-relaxed">
            Opens your NEAR wallet (installed wallets appear first). You’ll approve a free signature
            to prove the account is yours — no gas, no transaction.
          </p>

          {/* No wallet? Offer a way to get one (only before connecting). */}
          {!showSignInStep && (
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
                href="https://testnet.mynearwallet.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand-400 hover:text-brand-300 underline"
              >
                create a testnet account on MyNearWallet
              </a>
              {' '}(no install).
            </p>
          )}
        </div>

        <p className="text-center text-[11px] text-slate-600 mt-6">
          NEAR testnet · $0 environment
        </p>
      </div>
    </div>
  );
};
