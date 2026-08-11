/*
  VERCEL SERVERLESS ENTRYPOINT for the BIDECEL backend.

  On Vercel there is no long-running server that calls `app.listen()`. Instead, every matching
  request invokes THIS function, and Vercel hands us Node's raw (req, res). An Express `app` is
  itself a `(req, res) => void` request handler, so we can just re-export it as the handler —
  the exact same routes (/auth, /v2, /api/v1) that run locally on port 4000 now run here.

  We set DEDECEL_NO_LISTEN=1 BEFORE importing the app so server.ts skips its `app.listen(...)`
  (a serverless function must never bind a port — Vercel owns the socket).

  IMPORTANT: the flag is set in ./_no-listen (imported first). ES imports are hoisted above this
  module's body, so setting the env var here in the body would run AFTER server.js is imported —
  too late. Importing _no-listen before server.js guarantees the flag is set first.

  Routing: vercel.json rewrites /auth/*, /v2/*, /api/v1/* to /api, so this one function serves
  the whole backend. It shares the frontend's domain, so there is no CORS and no separate URL.
*/

// MUST be first: sets DEDECEL_NO_LISTEN=1 before server.js is evaluated (see _no-listen.ts).
import './_no-listen.js';
import { app } from '../backend/src/server.js';

// Let Express own body parsing (express.json). Without this, @vercel/node may consume the
// request stream first, so express.json() would see an empty body on POST /auth/verify etc.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;
