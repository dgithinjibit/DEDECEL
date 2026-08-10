import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { WalletSelector } from '@near-wallet-selector/core';
import { apiUrl } from '../services/apiBase';

/*
  WALLET CONTEXT — the app-wide "am I logged in?" state.

  Two modes, chosen by the env flag VITE_USE_REAL_WALLET (mirrors the backend's real/mock seam):

    * REAL  (VITE_USE_REAL_WALLET === "true"):
        Uses the NEAR wallet-selector. Pressing "Connect Wallet" opens a modal listing every
        installed/available NEAR wallet (installed browser extensions float to the top via
        `optimizeWalletOrder`). After the user picks a wallet and connects, we run a
        CHALLENGE–RESPONSE login (NEP-413 signMessage) against the backend:
          1. GET /auth/nonce                -> a one-time 32-byte challenge.
          2. wallet.signMessage({...nonce}) -> the wallet asks the user to sign it (free, no gas).
          3. POST /auth/verify              -> backend checks the signature AND that the key is a
                                               full-access key of the account, then returns a token.
        Only after step 3 succeeds is the user "authenticated". Merely connecting is NOT enough —
        that is what stops someone from claiming an account they do not control.

    * STUB  (default, local dev only):
        Fakes a connection so the app runs with zero blockchain setup. It is explicitly NOT
        authenticated (isAuthenticated is false) so it can never be mistaken for a real login.

  Either way the rest of the app reads `useWallet()`. Gate protected views on `isAuthenticated`.

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
  /** The connected NEAR account id, e.g. "alice.testnet", or null when logged out. */
  accountId: string | null;
  /** True while a connect / sign-in is in flight (show a spinner). */
  isConnecting: boolean;
  /** True when the real NEAR wallet is active (vs the demo stub). */
  isRealWallet: boolean;
  /** The last login error message (e.g. user rejected the signature), or null. */
  authError: string | null;
  /** Session token from the backend after a verified login (sent on protected API calls). */
  sessionToken: string | null;
  /** Begin login. `desiredAccountId` is only used by the stub; the real wallet ignores it. */
  connect: (desiredAccountId?: string) => Promise<void>;
  /** Log out. */
  disconnect: () => void;
}

const STORAGE_KEY = 'dedecel_wallet_session_v1';
const TOKEN_KEY = 'dedecel_session_token_v1';
const USE_REAL_WALLET = import.meta.env.VITE_USE_REAL_WALLET === 'true';
const NETWORK = (import.meta.env.VITE_NEAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
const CONTRACT_ID = import.meta.env.VITE_NEAR_CONTRACT_ID || '';

const WalletContext = createContext<WalletState | null>(null);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
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
    if (!USE_REAL_WALLET) {
      // STUB: restore a previous demo session so a refresh doesn't log you out.
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) setAccountId(saved);
      } catch {
        /* ignore storage errors */
      }
      return;
    }

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
            projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'dedecel-dev',
            metadata: {
              name: 'DEDECEL',
              description: 'Decentralized Birth & Death Certificate Ledger',
              url: 'https://dedecel.vercel.app',
              icons: [],
            },
          }),
        ],
      });
      if (cancelled) return;
      selectorRef.current = selector;
      modalRef.current = setupModal(selector, { contractId: CONTRACT_ID });

      // Restore a prior verified session token (so a refresh doesn't force re-signing).
      try {
        const savedToken = localStorage.getItem(TOKEN_KEY);
        if (savedToken) setSessionToken(savedToken);
      } catch {
        /* ignore */
      }

      // React to sign-in / sign-out happening in the wallet popup.
      const applyState = async (accounts: { accountId: string }[]) => {
        const active = accounts[0]?.accountId ?? null;
        setAccountId(active);
        if (!active) {
          // Signed out in the wallet.
          setIsAuthenticated(false);
          authInFlightFor.current = null;
          return;
        }
        // Connected. Now prove ownership via signMessage — unless we already did for this account.
        if (authInFlightFor.current === active) return;
        authInFlightFor.current = active;
        await authenticate(selector, active);
      };

      applyState(selector.store.getState().accounts);
      const subscription = selector.store.observable.subscribe((state) => {
        void applyState(state.accounts);
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
   * The challenge–response login. Called right after a wallet connects.
   * On success: sets isAuthenticated + stores the session token.
   * On failure (user rejects, key isn't full-access, network error): signs the user back out.
   */
  const authenticate = async (selector: WalletSelector, activeAccountId: string) => {
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
      authInFlightFor.current = null;
      // Signing failed → don't leave a half-connected state; sign back out of the wallet.
      try {
        const wallet = await selector.wallet();
        await wallet.signOut();
      } catch {
        /* ignore */
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const connect = async (desiredAccountId?: string) => {
    setAuthError(null);
    if (USE_REAL_WALLET) {
      // Open the wallet-selector modal; the account-change subscription handles the rest
      // (including the signMessage login). isConnecting is managed by authenticate().
      if (!modalRef.current) {
        setAuthError('wallet is still starting — try again in a moment');
        return;
      }
      modalRef.current.show();
      return;
    }

    // STUB behaviour: fake the wallet round-trip and account id. NOT authenticated.
    setIsConnecting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const id = (desiredAccountId && desiredAccountId.trim()) || 'demo-user.testnet';
      setAccountId(id);
      setIsAuthenticated(false); // stub can never be a real login
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    authInFlightFor.current = null;
    setIsAuthenticated(false);
    setSessionToken(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch {
      /* ignore */
    }
    if (USE_REAL_WALLET) {
      (async () => {
        try {
          const wallet = await selectorRef.current?.wallet();
          await wallet?.signOut();
        } catch (err) {
          console.error('[wallet] signOut failed:', err);
        }
        setAccountId(null);
      })();
      return;
    }
    setAccountId(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  const value: WalletState = {
    isConnected: accountId !== null,
    // In real mode, "logged in" requires a verified signature. In stub mode there is no backend
    // to verify against, so connecting is treated as access (dev convenience only).
    isAuthenticated: USE_REAL_WALLET ? isAuthenticated : accountId !== null,
    accountId,
    isConnecting,
    isRealWallet: USE_REAL_WALLET,
    authError,
    sessionToken,
    connect,
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
