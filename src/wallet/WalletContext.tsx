import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { WalletSelector } from '@near-wallet-selector/core';

/*
  WALLET CONTEXT — the app-wide "am I logged in?" state.

  Two modes, chosen by the env flag VITE_USE_REAL_WALLET (mirrors the backend's real/mock seam):

    * REAL  (VITE_USE_REAL_WALLET === "true"):
        Uses the NEAR wallet-selector with the HOT Wallet module. `connect()` opens the wallet
        popup; the connected NEAR account id becomes your login. Signing anchor txns is done by
        the backend's owner key, so the browser wallet is used for identity/login here.

    * STUB  (default):
        Fakes a wallet connection so the app runs with zero blockchain setup while developing.
        `connect(desiredAccountId)` just remembers whatever id you type.

  Either way the rest of the app only reads `useWallet()` and never changes.

  Jargon:
  - "wallet" = a browser/mobile tool that holds your blockchain account + keys and signs actions.
  - "account id" on NEAR looks like a name, e.g. `alice.testnet`.
  - "connect" = the user approves letting this app see their account (login).
*/

export interface WalletState {
  /** True once a wallet is connected (the user is "logged in"). */
  isConnected: boolean;
  /** The connected NEAR account id, e.g. "alice.testnet", or null when logged out. */
  accountId: string | null;
  /** True while a connect/disconnect is in flight (show a spinner). */
  isConnecting: boolean;
  /** True when the real NEAR wallet is active (vs the demo stub). */
  isRealWallet: boolean;
  /** Begin login. `desiredAccountId` is only used by the stub; the real wallet ignores it. */
  connect: (desiredAccountId?: string) => Promise<void>;
  /** Log out. */
  disconnect: () => void;
}

const STORAGE_KEY = 'dedecel_wallet_session_v1';
const USE_REAL_WALLET = import.meta.env.VITE_USE_REAL_WALLET === 'true';
const NETWORK = (import.meta.env.VITE_NEAR_NETWORK as 'testnet' | 'mainnet') || 'testnet';
const CONTRACT_ID = import.meta.env.VITE_NEAR_CONTRACT_ID || '';

const WalletContext = createContext<WalletState | null>(null);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [accountId, setAccountId] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Real-wallet handles (only used in REAL mode). Kept in refs so re-renders don't rebuild them.
  const selectorRef = useRef<WalletSelector | null>(null);
  const modalRef = useRef<{ show: () => void } | null>(null);

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
      const [{ setupWalletSelector }, { setupModal }, { setupHotWallet }] = await Promise.all([
        import('@near-wallet-selector/core'),
        import('@near-wallet-selector/modal-ui'),
        import('@near-wallet-selector/hot-wallet'),
      ]);

      const selector = await setupWalletSelector({
        network: NETWORK,
        modules: [setupHotWallet()],
      });
      if (cancelled) return;
      selectorRef.current = selector;
      modalRef.current = setupModal(selector, { contractId: CONTRACT_ID });

      // Seed initial state from any already-signed-in account.
      const applyState = (accounts: { accountId: string }[]) => {
        const active = accounts[0]?.accountId ?? null;
        setAccountId(active);
        setIsConnecting(false);
      };
      applyState(selector.store.getState().accounts);

      // React to sign-in / sign-out happening in the wallet popup.
      const subscription = selector.store.observable.subscribe((state) => {
        applyState(state.accounts);
      });
      unsub = () => subscription.unsubscribe();
    })().catch((err) => {
      console.error('[wallet] failed to init NEAR wallet-selector:', err);
    });

    return () => {
      cancelled = true;
      unsub?.();
    };
  }, []);

  const connect = async (desiredAccountId?: string) => {
    setIsConnecting(true);
    try {
      if (USE_REAL_WALLET) {
        // Open the wallet-selector modal; the account-change subscription updates state.
        // isConnecting is cleared by applyState when an account arrives (or on modal close below).
        if (!modalRef.current) throw new Error('wallet not ready yet');
        modalRef.current.show();
        return;
      }

      // STUB behaviour: fake the wallet round-trip and account id.
      await new Promise((resolve) => setTimeout(resolve, 600));
      const id = (desiredAccountId && desiredAccountId.trim()) || 'demo-user.testnet';
      setAccountId(id);
      try {
        localStorage.setItem(STORAGE_KEY, id);
      } catch {
        /* ignore */
      }
    } finally {
      // In REAL mode the modal is async; leave the spinner to the subscription unless we bailed.
      if (!USE_REAL_WALLET) setIsConnecting(false);
    }
  };

  const disconnect = () => {
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
    accountId,
    isConnecting,
    isRealWallet: USE_REAL_WALLET,
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
