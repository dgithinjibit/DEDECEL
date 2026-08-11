import React from 'react';
import { useWallet } from './WalletContext';

/*
  LANDING PAGE + WALLET LOGIN — letters only, no icons or images.

  This is the first screen a visitor sees. It is a proper landing page (hero headline, what the
  system does, how it works, live trust chips) with the wallet Connect/Sign-in card placed BELOW
  the hero. The guide/substance is adapted from the birth-side faculty hero, rewritten for BIDECEL
  (birth AND death certificates, anchored on NEAR).

  REAL NEAR WALLET ONLY. Two steps:
    1. "Connect Wallet"  -> opens the NEAR wallet-selector modal (HOT, MyNearWallet, etc.).
    2. "Sign in"         -> once a wallet is connected, a click signs the backend challenge
                            (NEP-413). The click is required so the browser doesn't block the
                            wallet popup ("Popup window blocked").
  There is NO demo/stub form: you cannot get past this screen without a real wallet + signature.
  Connecting a wallet IS both sign-up and log-in on NEAR.
*/

// The three-step lifecycle, written as letters/numbers only (no icons per the project rule).
const LIFECYCLE: { step: string; title: string; body: string }[] = [
  {
    step: '01',
    title: 'Attest off-chain',
    body: 'A hospital or civil registrar records a birth or death. The private details (names, dates, IDs) stay in a private database — never on the public chain.',
  },
  {
    step: '02',
    title: 'Anchor a fingerprint',
    body: 'A salted hash of the record is written to a NEAR smart contract. It proves the record exists and has not been altered, while revealing nothing about the person.',
  },
  {
    step: '03',
    title: 'Verify with zero-knowledge',
    body: 'Anyone can confirm a certificate is genuine and anchored — or prove a fact like "registered deceased" — using a Groth16 zero-knowledge proof, without seeing the underlying data.',
  },
];

// Short trust chips. Facts about the architecture, stated in plain letters.
const TRUST_CHIPS: string[] = [
  'NEAR testnet',
  'Groth16 zero-knowledge',
  'Salted hash on-chain',
  'PII stays off-chain',
  'Wallet-only login',
  '$0 environment',
];

export const WalletLogin: React.FC = () => {
  const { connect, signIn, enterDemo, isConnecting, authError, isConnected, accountId: connectedAccount } =
    useWallet();

  const handleConnect = () => {
    void connect();
  };

  const handleSignIn = () => {
    void signIn();
  };

  const handleDemo = () => {
    enterDemo();
  };

  // Once a wallet is connected (account picked) but not yet verified, show the "Sign in" step.
  // Clicking it triggers the wallet signature FROM a user gesture, so the browser doesn't block
  // the popup ("Popup window blocked").
  const showSignInStep = isConnected;

  return (
    <div className="min-h-screen bg-[#28292e] text-white font-sans">
      {/* Slim top wordmark bar — letters only. */}
      <header className="border-b border-slate-800/70">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-4 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight">
            BIDECEL <span className="text-brand-400">Ledger</span>
          </span>
          <span className="text-[11px] tracking-[0.25em] uppercase text-slate-500">
            Decentralized Registry
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8">
        {/* ============================ HERO ============================ */}
        <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-[#232429] via-[#26231f] to-[#232429] mt-8 p-8 sm:p-12 shadow-2xl">
          {/* Soft brand glows (pure CSS, not images). */}
          <div className="pointer-events-none absolute -top-24 -right-24 h-96 w-96 rounded-full bg-brand-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/4 h-80 w-80 rounded-full bg-brand-400/10 blur-3xl" />

          <div className="relative z-10 max-w-3xl space-y-5">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 text-[11px] font-semibold tracking-wide uppercase">
              Birth &amp; Death Certificates · Verifiable on NEAR
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              Decentralized civil records for{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-300 via-brand-400 to-brand-200">
                healthcare and civil authorities
              </span>
            </h1>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              BIDECEL connects accredited hospitals, civil registries, and citizen portals. Every birth
              and death certificate is sealed by a cryptographic signature, anchored as a tamper-proof
              fingerprint on the NEAR blockchain, and verifiable through Groth16 zero-knowledge proofs —
              so authenticity is public while personal data stays private.
            </p>

            {/* Trust chips — letters only. */}
            <div className="flex flex-wrap gap-2 pt-1">
              {TRUST_CHIPS.map((chip) => (
                <span
                  key={chip}
                  className="px-2.5 py-1 rounded-full bg-slate-800/70 border border-slate-700 text-slate-300 text-[11px] font-medium"
                >
                  {chip}
                </span>
              ))}
            </div>

            {/* Primary calls to action. Connect a real wallet, OR jump straight into a read-only
                demo (for reviewers/judges who don't want to set up a testnet wallet first). */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleConnect}
                disabled={isConnecting}
                className="px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-60
                           disabled:cursor-not-allowed text-white font-semibold text-sm transition-colors shadow-lg shadow-brand-600/20"
              >
                {isConnecting ? 'Waiting for wallet…' : 'Connect Wallet'}
              </button>
              <button
                onClick={handleDemo}
                className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600
                           font-semibold text-sm transition-colors"
              >
                Explore the demo — no wallet needed
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed max-w-xl">
              The demo opens the full dashboard read-only so you can see the idea instantly. Creating or
              anchoring real certificates on NEAR still needs a connected wallet.
            </p>
          </div>
        </section>

        {/* ===================== HOW IT WORKS ===================== */}
        <section className="mt-10">
          <h2 className="text-lg font-bold tracking-tight text-white">How BIDECEL works</h2>
          <p className="text-slate-400 text-sm mt-1">
            Three steps, from the clinic to a proof anyone can check.
          </p>

          <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4">
            {LIFECYCLE.map((s) => (
              <div
                key={s.step}
                className="rounded-2xl border border-slate-800 bg-[#232429] p-5 space-y-3"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand-500/15 border border-brand-500/30 text-brand-300 font-mono font-bold text-sm">
                  {s.step}
                </span>
                <h3 className="font-semibold text-white text-sm">{s.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ===================== WALLET CARD (below the hero) ===================== */}
        <section className="mt-10 mb-16 flex justify-center">
          <div className="w-full max-w-md">
            <div className="bg-[#232429] border border-slate-700/70 rounded-2xl shadow-2xl p-7">
              <h2 className="font-semibold text-lg mb-1">
                {showSignInStep ? 'Sign in to continue' : 'Connect your wallet to enter'}
              </h2>
              <p className="text-xs text-slate-400 mb-6 leading-relaxed">
                {showSignInStep ? (
                  <>
                    Connected as{' '}
                    <span className="font-mono text-slate-200">{connectedAccount}</span>. Click below to
                    sign a free message proving this account is yours. No gas, no transaction.
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
                <p className="text-[11px] text-rose-400 mt-3 leading-relaxed">{authError}</p>
              )}

              <p className="text-[11px] text-slate-500 mt-5 leading-relaxed">
                Opens your NEAR wallet (installed wallets appear first). You’ll approve a free signature
                to prove the account is yours — no gas, no transaction.
              </p>

              {/* Read-only demo shortcut, right where a visitor decides how to enter. */}
              {!showSignInStep && (
                <div className="mt-6 pt-5 border-t border-slate-700/60">
                  <button
                    onClick={handleDemo}
                    className="w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-600
                               font-semibold py-3 transition-colors"
                  >
                    Explore the demo — no wallet needed
                  </button>
                  <p className="text-[11px] text-slate-500 mt-2 leading-relaxed">
                    Opens the dashboard read-only. No account, no signing, no personal data.
                  </p>
                </div>
              )}

              {/* No wallet? Offer a way to get one (only before connecting). */}
              {!showSignInStep && (
                <p className="text-[11px] text-slate-500 mt-4 leading-relaxed">
                  Don’t have a NEAR wallet yet?{' '}
                  <a
                    href="https://chromewebstore.google.com/detail/hot-wallet/mpobfbnegdfjnpmojpdfdkdhkmecfhpn"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-400 hover:text-brand-300 underline"
                  >
                    Get the HOT Wallet extension
                  </a>{' '}
                  or{' '}
                  <a
                    href="https://testnet.mynearwallet.com/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-400 hover:text-brand-300 underline"
                  >
                    create a testnet account on MyNearWallet
                  </a>{' '}
                  (no install).
                </p>
              )}
            </div>

            <p className="text-center text-[11px] text-slate-600 mt-6">
              NEAR testnet · $0 environment
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};
