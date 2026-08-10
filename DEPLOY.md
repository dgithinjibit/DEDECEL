# DEDECEL — Deploy it all for $0

This guides you from "it runs on my laptop" to "it's live on the internet, for free", step by step.
New to hosting? That's fine — every step says exactly what to click/type and why.

Read **[HOW-IT-FITS.md](./HOW-IT-FITS.md)** first if you haven't; it explains the three parts
(frontend, backend, contract) this guide deploys.

> **Free-tier reality check:** these hosts cost $0 but have limits. A free backend (Render) *sleeps*
> after ~15 min idle and takes a few seconds to wake on the next request. NEAR testnet is free but
> uses fake tokens. All fine for a demo/portfolio; revisit before real production.

---

## The plan

You'll deploy three things, in this order (each one's URL feeds the next):

1. **Backend API** → Render (free web service). Gives you a URL like `https://dedecel-api.onrender.com`.
2. **Frontend website** → Vercel or Netlify (free static hosting). Gives you `https://dedecel.vercel.app`.
3. **(Optional) NEAR contract** → NEAR testnet, so anchoring is truly on-chain. See
   `contract/DEPLOY.md`. Skip this and anchoring still works in "disabled" mode (a `local:` id).

You need: a GitHub account with this repo pushed to it, and free accounts on Render + Vercel (or
Netlify). No credit card required for the free tiers.

---

## 0. First, run it locally once (sanity check)

```bash
# Terminal 1 — backend
cd backend
cp .env.example .env          # then set DEDECEL_HASH_PEPPER to a long random string
npm install
npm start                     # -> http://localhost:4000  (in-memory store, NEAR disabled)

# Terminal 2 — frontend
cd DEDECEL
npm install
npm run dev                   # -> http://localhost:3000, proxies /api & /v2 to :4000
```

Generate a pepper with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

If the app loads and you can move through the birth/death sections, you're ready to deploy.

---

## 1. Deploy the BACKEND to Render (free)

The repo already includes `backend/render.yaml` (a "blueprint" that tells Render how to run it).

1. Go to <https://render.com>, sign up (free), and connect your GitHub.
2. **New +** → **Blueprint** → pick this repo. Render reads `backend/render.yaml` and proposes a
   web service named `dedecel-backend`.
3. It will ask you to fill the secrets marked `sync: false`. At minimum set:
   - **`DEDECEL_HASH_PEPPER`** — your long random string (the SAME one forever; changing it
     invalidates every existing hash).
   - Leave `SUPABASE_*` empty for now to use the in-memory store, **or** set them for real
     persistence (create a free project at <https://supabase.com>, run `backend/schema.sql` in its
     SQL editor, then copy the Project URL + **service_role** key).
   - Leave the `NEAR_*` empty unless you've deployed the contract (step 3).
   - `CORS_ORIGINS` — leave empty for now; you'll set it in step 2 once you know the frontend URL.
4. Click **Apply / Deploy**. When it goes live, note the URL, e.g. `https://dedecel-api.onrender.com`.
5. Test it: open `https://<your-backend>/v2/health` in a browser — you should see a JSON blob with
   `"status":"ok"`.

---

## 2. Deploy the FRONTEND to Vercel (free)

The repo includes `DEDECEL/vercel.json` (and `DEDECEL/netlify.toml` if you prefer Netlify).

**Vercel:**
1. Go to <https://vercel.com>, sign up, **Add New… → Project**, import this repo.
2. **Root Directory:** set it to `DEDECEL`. (Vercel then auto-detects Vite from `vercel.json`.)
3. **Environment Variables** (Project Settings → Environment Variables). These are read at *build*
   time, so add them before the first build:
   ```
   VITE_USE_REAL_BACKEND = true
   VITE_API_BASE_URL     = https://dedecel-api.onrender.com     # your step-1 backend URL, no trailing slash
   ```
   Optional (only if you did step 3 / real wallet):
   ```
   VITE_USE_REAL_WALLET  = true
   VITE_NEAR_NETWORK     = testnet
   VITE_NEAR_CONTRACT_ID = your-account.testnet
   ```
4. **Deploy.** You'll get a URL like `https://dedecel.vercel.app`.

**Netlify** is equivalent: import the repo, set **Base directory** to `DEDECEL/`, and add the same
environment variables. `netlify.toml` supplies the build command, publish dir, and SPA fallback.

### Now close the CORS loop
Back in Render, set the backend's **`CORS_ORIGINS`** to your frontend URL and redeploy:
```
CORS_ORIGINS = https://dedecel.vercel.app
```
This tells the API to accept requests from your site (and reject others). Without it the browser
will block the frontend's calls with a CORS error.

**Verify the whole thing:** open your Vercel URL, connect a wallet (demo is fine), create a death
certificate, approve it, then in the verifier click **Verify on Real Backend** — it should say
VERIFIED, and **Erase (GDPR)** should make a later verify fail. That's the full story, live.

---

## 3. (Optional) Deploy the NEAR contract so anchoring is real

Until you do this, anchoring works but records a placeholder id (`local:…`, `onChain:false`).
To make it a real on-chain transaction, follow **`contract/DEPLOY.md`** (install the NEAR CLI,
create + fund a free `.testnet` account, deploy the wasm). Then set on Render:
```
NEAR_NETWORK            = testnet
NEAR_CONTRACT_ID        = your-account.testnet
NEAR_SIGNER_ACCOUNT_ID  = your-account.testnet
NEAR_SIGNER_PRIVATE_KEY = ed25519:...          # keep secret — server-side only
```
and (optionally) on Vercel set `VITE_USE_REAL_WALLET=true` + `VITE_NEAR_CONTRACT_ID` for real login.

---

## Cost summary

| Part      | Host              | Cost | Notes |
|-----------|-------------------|------|-------|
| Frontend  | Vercel / Netlify  | $0   | Static files, generous free tier. |
| Backend   | Render free web   | $0   | Sleeps when idle; cold-starts in seconds. |
| Database  | Supabase free     | $0   | Optional; in-memory store works without it (non-persistent). |
| Contract  | NEAR testnet      | $0   | Free faucet tokens; same code deploys to mainnet later. |

---

## Troubleshooting

- **Frontend loads but every action fails / CORS error in the browser console** → set
  `CORS_ORIGINS` on the backend to your exact frontend URL and redeploy.
- **Calls go to the wrong place** → check `VITE_API_BASE_URL` has no trailing slash and points at
  the backend, and that you set `VITE_USE_REAL_BACKEND=true`. These are *build-time*, so redeploy
  the frontend after changing them.
- **First request after a while is very slow** → the free backend was asleep; it wakes on demand.
- **`/v2/health` shows `pepperConfigured: false`** → `DEDECEL_HASH_PEPPER` isn't set on the backend.
- **Anchoring says `onChain: false`** → expected until you complete step 3.
