// --- Node-compat polyfills for the NEAR wallet-selector libs (browser has no global/Buffer/process)
// These libs were written for Node and reference `global`, `Buffer`, and `process`. We map them
// onto the browser's globalThis BEFORE any wallet code runs, or the selector throws
// "global/process is not defined" on init. Must stay at the very top of the entry file.
import { Buffer } from 'buffer';
const g = globalThis as unknown as {
  global: typeof globalThis;
  Buffer: typeof Buffer;
  process: { env: Record<string, string>; browser: boolean; version: string; nextTick: (cb: () => void) => void };
};
g.global ||= globalThis;
g.Buffer ||= Buffer;
// Minimal process shim: just enough for the wallet libs (they read process.env / process.browser).
g.process ||= { env: {}, browser: true, version: '', nextTick: (cb: () => void) => setTimeout(cb, 0) };

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import {WalletProvider} from './wallet/WalletContext.tsx';
import '@near-wallet-selector/modal-ui/styles.css';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </StrictMode>,
);
