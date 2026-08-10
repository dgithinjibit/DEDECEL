/*
  API BASE URL helper (Phase 5 — hosting).

  In DEVELOPMENT the frontend and backend run on different ports, and Vite's dev proxy
  (see vite.config.ts) forwards /api/v1 and /v2 to http://localhost:4000. So a plain
  relative path like "/v2/death/records" just works — VITE_API_BASE_URL is left empty.

  In PRODUCTION the static frontend is hosted separately from the backend (different domains),
  so there is no proxy. We prefix every request with the backend's real URL, provided at build
  time via VITE_API_BASE_URL (e.g. "https://dedecel-api.onrender.com").

  Usage:  fetch(apiUrl('/v2/death/records'))
*/

const RAW_BASE = (import.meta.env.VITE_API_BASE_URL || '').trim();

// Normalize: drop a trailing slash so apiUrl('/v2/...') never produces a double slash.
const BASE = RAW_BASE.replace(/\/+$/, '');

/** Prefix a backend path with the configured API base (empty in dev → relative → uses proxy). */
export function apiUrl(path: string): string {
  // Guarantee a single leading slash on the path.
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${BASE}${p}`;
}

/** True when a separate backend URL is configured (i.e. production cross-origin mode). */
export const apiBaseConfigured = BASE.length > 0;
