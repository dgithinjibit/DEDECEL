import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { WalletSelector } from '@near-wallet-selector/core';
import { apiUrl } from '../services/apiBase';

/*
  WALLET CONTEXT — the app-wide "am I logged in?" state.

  REAL NEAR WALLET ONLY. There is no demo/stub mode: a bypassable "type any account" form must
  never be reachable (it once let empty input through). Login is always a real wallet + a
  cryptographic signature the backend verifies.

  Flow: pressing "Connect Wallet" opens the NEAR wallet-selector modal listing every installed/
  available NEAR wallet (installed browser extensions float to the top via `optimizeWalletOrder`).
  After the user picks a wallet and connects, we run a CHALLENGE–RESPONSE login (NEP-413
  signMessage) against the backend:
    1. GET /auth/nonce                -> a one-time 32-byte challenge.
    2. wallet.signMessage({...nonce}) -> the wallet asks the user to sign it (free, no gas).
    3. POST /auth/verify              -> backend checks the signature AND that the key belongs to
                                         the account, then returns a session token.
  Only after step 3 succeeds is the user "authenticated". Merely connecting is NOT enough — that
  is what stops someone from claiming an account they do not control.

  The rest of the app reads `useWallet()`. Gate protected views on `isAuthenticated`.

  Jargon:
  - "wallet" = a tool that holds your blockchain account + keys and signs actions.
  - "account id" on NEAR looks like a name, e.g. `alice.testnet`.
  - "connect" = the user approves letting this app SEE their account.
  - "sign a message" = the user proves they hold the account's key by signing a challenge.
    This costs nothing and creates no transaction.
*/

export interface WalletState {
  /** True once a wallet is connected (the user picked an account). NOT proof of ownership. */
  isConnected: boolean;
  /** True once the account has been cryptographically verified by the backend (real login). */
  isAuthenticated: boolean;
  /**
   * DEMO MODE (judges / quick tours). True when the visitor tapped "Explore the demo" to skip the
   * wallet entirely. This is DELIBERATELY separate from `isAuthenticated` — it is NOT a login and
   * grants no real session token, so protected on-chain / backend actions still require a real
   * wallet. The app gate opens on `isAuthenticated || isDemo`, but anything that writes to NEAR or
   * the backend must check `isAuthenticated` (not this) so demo users can look, not tamper.
   */
  isDemo: boolean;
  /** The connected NEAR account id, e.g. "alice.testnet", or null when logged out. */
  accountId: string | null;
  /** True while a connect / sign-in is in flight (show a spinner). */
  isConnecting: boolean;
  /** The last login error message (e.g. user rejected the signature), or null. */
  authError: string | null;
  /** Session token from the backend after a verified login (sent on protected API calls). */
  sessionToken: string | null;
  /** Begin login — opens the NEAR wallet-selector modal so the user picks a wallet. */
  connect: () => Promise<void>;
  /**
   * Prove ownership by signing the server challenge. MUST be called from a user click (a button)
   * so the browser lets the wallet popup/redirect open — calling it automatically after connect
   * gets the popup blocked ("Popup window blocked"). Only meaningful in real-wallet mode.
   */
  signIn: () => Promise<void>;
  /**
   * Enter DEMO mode: skip the wallet and open the dashboard read-only. For judges/reviewers who
   * don't want to set up a testnet wallet just to see the idea. Does not touch NEAR or the backend.
   */
  enterDemo: () => void;
  /** Log out (also leaves demo mode). */
  disconnect: () => void;
}

/** A clearly-fake account label so demo mode is never mistaken for a real signed-in account. */
const DEMO_ACCOUNT_ID = 'demo-guest.bidecel';

const TOKEN_KEY = 'bidecel_session_token_v1';
const NETWORK = (import.meta.env.VITE_NEAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
const CONTRACT_ID = import.meta.env.VITE_NEAR_CONTRACT_ID || '';

const WalletContext = createContext<WalletState | null>(null);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isDemo, setIsDemo] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Real-wallet handles (only used in REAL mode). Kept in refs so re-renders don't rebuild them.
  const selectorRef = useRef<WalletSelector | null>(null);
  const modalRef = useRef<{ show: () => void } | null>(null);
  // Guards against running the sign-in flow twice for the same account (the store observable
  // can emit more than once). Holds the accountId we've already authenticated (or are trying).
  const authInFlightFor = useRef<string | null>(null);

  // ---- REAL WALLET: build the selector once, subscribe to account changes ----
  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      // Import the selector libs lazily so the stub build never pays for them.
      const [
        { setupWalletSelector },
        { setupModal },
        { setupHotWallet },
        { setupMeteorWallet },
        { setupMyNearWallet },
        { setupSender },
        { setupNightly },
        { setupLedger },
        { setupWalletConnect },
      ] = await Promise.all([
        import('@near-wallet-selector/core'),
        import('@near-wallet-selector/modal-ui'),
        import('@near-wallet-selector/hot-wallet'),
        import('@near-wallet-selector/meteor-wallet'),
        import('@near-wallet-selector/my-near-wallet'),
        import('@near-wallet-selector/sender'),
        import('@near-wallet-selector/nightly'),
        import('@near-wallet-selector/ledger'),
        import('@near-wallet-selector/wallet-connect'),
      ]);

      const selector = await setupWalletSelector({
        network: NETWORK,
        // Installed browser wallets are detected and floated to the top of the modal.
        optimizeWalletOrder: true,
        modules: [
          // Every wallet here can sign NEAR contract calls. The user picks whichever they have;
          // installed extensions surface first, so there is no "which one?" friction.
          setupHotWallet(),
          setupMeteorWallet(),
          setupMyNearWallet(),
          setupSender(),
          setupNightly(),
          setupLedger(),
          // WalletConnect needs a project id (free from cloud.walletconnect.com). Harmless
          // placeholder in dev; set VITE_WALLETCONNECT_PROJECT_ID for real mobile linking.
          setupWalletConnect({
            projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'bidecel-dev',
            metadata: {
              name: 'BIDECEL',
              description: 'Decentralized Birth & Death Certificate Ledger',
              url: 'https://bidecel.vercel.app',
              icons: [],
            },
          }),
        ],
      });
      if (cancelled) return;
      selectorRef.current = selector;
      modalRef.current = setupModal(selector, { contractId: CONTRACT_ID });

      // Restore a prior verified session token (so a refresh doesn't force re-signing).
      let restoredToken: string | null = null;
      try {
        restoredToken = localStorage.getItem(TOKEN_KEY);
        if (restoredToken) setSessionToken(restoredToken);
      } catch {
        /* ignore */
      }

      // React to connect / sign-out from the wallet.
      const applyState = (accounts: { accountId: string }[]) => {
        const active = accounts[0]?.accountId ?? null;
        setAccountId(active);
        if (!active) {
          setIsAuthenticated(false);
          authInFlightFor.current = null;
          return;
        }
        // Already have a valid session token (page refresh) → stay logged in, no re-sign.
        if (restoredToken) {
          setIsAuthenticated(true);
          authInFlightFor.current = active;
          return;
        }
        // Fresh connect → sign in automatically (one-click UX). This runs right after the modal
        // connects; for redirect wallets (MyNearWallet) it redirects (no popup to block), and for
        // extension wallets it's usually still within the click's activation window. If a browser
        // DOES block the popup, authenticate() records the error and the login screen shows a
        // "Sign in" button as a fallback second click.
        if (authInFlightFor.current !== active) {
          authInFlightFor.current = active;
          void authenticate();
        }
      };

      applyState(selector.store.getState().accounts);
      const subscription = selector.store.observable.subscribe((state) => {
        applyState(state.accounts);
      });
      unsub = () => subscription.unsubscribe();
    })().catch((err) => {
      console.error('[wallet] failed to init NEAR wallet-selector:', err);
      setAuthError('Could not start the wallet. Please refresh and try again.');
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  /**
   * The challenge–response login (a.k.a. signIn). MUST run from a user click so the wallet
   * popup/redirect is allowed by the browser. On success: sets isAuthenticated + stores the
   * session token. On failure (user rejects, key mismatch, network error): signs back out.
   */
  const authenticate = async () => {
    const selector = selectorRef.current;
    if (!selector) {
      setAuthError('wallet is still starting — try again in a moment');
      return;
    }
    setIsConnecting(true);
    setAuthError(null);
    try {
      // 1) Ask the backend for a one-time challenge.
      const nonceRes = await fetch(apiUrl('/auth/nonce'));
      if (!nonceRes.ok) throw new Error('could not get a login challenge from the server');
      const { nonce, message, recipient } = await nonceRes.json();

      // 2) Ask the wallet to sign it. The nonce arrives as hex; NEP-413 wants 32 raw bytes.
      const nonceBytes = hexToBytes(nonce);
      const wallet = await selector.wallet();
      if (typeof wallet.signMessage !== 'function') {
        throw new Error('this wallet cannot sign a login message — try another wallet');
      }
      const signed = await wallet.signMessage({
        message,
        recipient,
        nonce: bytesToBuffer(nonceBytes),
      });
      if (!signed) throw new Error('login was cancelled');

      // 3) Send the signature to the backend to verify + get a session token.
      const verifyRes = await fetch(apiUrl('/auth/verify'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId: signed.accountId,
          publicKey: signed.publicKey,
          signature: signed.signature,
          nonce,
        }),
      });
      if (!verifyRes.ok) {
        const { error } = await verifyRes.json().catch(() => ({ error: 'login verification failed' }));
        throw new Error(error || 'login verification failed');
      }
      const { token } = await verifyRes.json();
      setSessionToken(token);
      setIsAuthenticated(true);
      try {
        localStorage.setItem(TOKEN_KEY, token);
      } catch {
        /* ignore */
      }
    } catch (err) {
      console.error('[wallet] sign-in failed:', err);
      setAuthError((err as Error).message || 'sign-in failed');
      setIsAuthenticated(false);
      // Allow a retry: clear the in-flight guard so the fallback "Sign in" button (or a re-connect)
      // can trigger authenticate() again. Stay CONNECTED so the wallet stays selected.
      authInFlightFor.current = null;
    } finally {
      setIsConnecting(false);
    }
  };

  const connect = async () => {
    setAuthError(null);
    // Open the wallet-selector modal to CONNECT (pick an account). Signing in is a separate,
    // click-driven step (see signIn) so the browser doesn't block the popup.
    if (!modalRef.current) {
      setAuthError('wallet is still starting — try again in a moment');
      return;
    }
    modalRef.current.show();
  };

  /**
   * Enter demo mode — no wallet, no signature, no session token. Just flips a flag and sets a
   * clearly-fake account label so the gate opens and reviewers land on the dashboard. Real writes
   * still require `isAuthenticated`, which demo does NOT set.
   */
  const enterDemo = () => {
    setAuthError(null);
    setIsDemo(true);
    setAccountId(DEMO_ACCOUNT_ID);
  };

  const disconnect = () => {
    authInFlightFor.current = null;
    setIsDemo(false);
    setIsAuthenticated(false);
    setSessionToken(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    (async () => {
      try {
        const wallet = await selectorRef.current?.wallet();
        await wallet?.signOut();
      } catch (err) {
        console.error('[wallet] signOut failed:', err);
      }
      setAccountId(null);
    })();
  };

  const value: WalletState = {
    isConnected: accountId !== null,
    // "Logged in" requires a backend-verified signature — connecting alone is never enough.
    isAuthenticated,
    isDemo,
    accountId,
    isConnecting,
    authError,
    sessionToken,
    connect,
    signIn: authenticate,
    enterDemo,
    disconnect,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
};

/** Hook every component uses to read wallet state: `const { accountId, connect } = useWallet();` */
export const useWallet = (): WalletState => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used inside <WalletProvider>');
  return ctx;
};

/* ---- small byte helpers (NEP-413 nonce is 32 raw bytes; the API carries it as hex) ---- */
function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return out;
}

/**
 * signMessage expects a Node-style Buffer. In the browser we rely on a Buffer polyfill (the
 * wallet-selector libs pull one in); fall back to the Uint8Array if Buffer is unavailable.
 */
function bytesToBuffer(bytes: Uint8Array): Buffer {
  const B = (globalThis as { Buffer?: typeof Buffer }).Buffer;
  return B ? B.from(bytes) : (bytes as unknown as Buffer);
}
