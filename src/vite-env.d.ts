/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When "true", the app uses the real Phase 2 backend instead of the in-memory mock. */
  readonly VITE_USE_REAL_BACKEND?: string;
  /**
   * Backend base URL for PRODUCTION (e.g. "https://dedecel-api.onrender.com"). Leave empty in
   * dev so relative paths hit the Vite proxy. See src/services/apiBase.ts.
   */
  readonly VITE_API_BASE_URL?: string;
  /** NEAR network the wallet connects to: "testnet" (default) or "mainnet". */
  readonly VITE_NEAR_NETWORK?: string;
  /** The anchor contract account the wallet signs into, e.g. "registry-demo.testnet". */
  readonly VITE_NEAR_CONTRACT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
