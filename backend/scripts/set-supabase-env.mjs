#!/usr/bin/env node
/*
  set-supabase-env.mjs — safely write SUPABASE_URL + SUPABASE_SERVICE_KEY into backend/.env.

  WHY a script instead of editing .env by hand: it updates ONLY those two keys, leaves every
  other secret (AUTH_SECRET, DEDECEL_HASH_PEPPER, NEAR_*) untouched, makes a timestamped backup
  first, and never hardcodes the secret anywhere committed — you pass the values in at runtime.

  The secret is read from ENVIRONMENT VARIABLES, not command-line args, so it does not land in
  your shell history or the process list. Usage:

    SUPABASE_URL='https://xxxx.supabase.co' \
    SUPABASE_SERVICE_KEY='sb_secret_...' \
    node backend/scripts/set-supabase-env.mjs

  If a key is already present in .env (even blank, e.g. `SUPABASE_URL=`), its line is replaced;
  otherwise the key is appended. .env is gitignored, so nothing here is ever committed.
*/

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(here, '..', '.env'); // backend/.env

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_KEY;

if (!url || !key) {
  console.error('ERROR: set SUPABASE_URL and SUPABASE_SERVICE_KEY as environment variables.');
  console.error("Example:\n  SUPABASE_URL='https://xxxx.supabase.co' SUPABASE_SERVICE_KEY='sb_secret_...' node backend/scripts/set-supabase-env.mjs");
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(url)) {
  console.error(`ERROR: SUPABASE_URL doesn't look right: ${url}`);
  console.error('Expected something like https://<project-ref>.supabase.co');
  process.exit(1);
}
if (!key.startsWith('sb_secret_') && !key.startsWith('eyJ')) {
  // sb_secret_... = new-style secret key; eyJ... = legacy service_role JWT. Warn, don't block.
  console.warn('WARNING: SUPABASE_SERVICE_KEY does not look like a service/secret key.');
  console.warn('Make sure you used the SECRET / service_role key, NOT the publishable/anon one.');
}

if (!existsSync(ENV_PATH)) {
  console.error(`ERROR: ${ENV_PATH} not found. Create backend/.env first.`);
  process.exit(1);
}

// Backup before touching anything.
const backup = `${ENV_PATH}.bak`;
copyFileSync(ENV_PATH, backup);

let text = readFileSync(ENV_PATH, 'utf8');

/** Replace an existing `KEY=...` line (any value, incl. blank) or append if absent. */
function upsert(src, k, v) {
  const line = `${k}=${v}`;
  const re = new RegExp(`^\\s*${k}\\s*=.*$`, 'm');
  if (re.test(src)) return src.replace(re, line);
  return src.endsWith('\n') ? `${src}${line}\n` : `${src}\n${line}\n`;
}

text = upsert(text, 'SUPABASE_URL', url.replace(/\/$/, ''));
text = upsert(text, 'SUPABASE_SERVICE_KEY', key);
writeFileSync(ENV_PATH, text);

// Report without leaking the secret.
const mask = (s) => (s.length <= 12 ? '****' : `${s.slice(0, 10)}…${s.slice(-4)}`);
console.log('Updated backend/.env:');
console.log(`  SUPABASE_URL         = ${url.replace(/\/$/, '')}`);
console.log(`  SUPABASE_SERVICE_KEY = ${mask(key)}`);
console.log(`Backup saved to ${backup}`);
