#!/usr/bin/env node
/*
  set-verify-key.mjs — generate a strong VERIFY_API_KEYS value and write it into backend/.env.

  The external verification API (/verify/v1) is gated by `x-api-key`. This script:
    - generates a fresh random key (unless one is passed via VERIFY_KEY env),
    - upserts the VERIFY_API_KEYS line in the gitignored backend/.env (backing it up first),
    - prints the key ONCE so you can copy it to the partner project + Vercel.

  Usage:
    node backend/scripts/set-verify-key.mjs            # generate a new key
    VERIFY_KEY='my-existing-key' node .../set-verify-key.mjs   # install a specific key

  .env is gitignored, so the key is never committed. Give the printed key to the OTHER project;
  it sends it as `x-api-key: <key>`.
*/

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { randomBytes } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const ENV_PATH = resolve(here, '..', '.env');

if (!existsSync(ENV_PATH)) {
  console.error(`ERROR: ${ENV_PATH} not found. Create backend/.env first.`);
  process.exit(1);
}

const key = (process.env.VERIFY_KEY || '').trim() || `dedecel_verify_${randomBytes(24).toString('hex')}`;

copyFileSync(ENV_PATH, `${ENV_PATH}.bak`);
let text = readFileSync(ENV_PATH, 'utf8');

const line = `VERIFY_API_KEYS=${key}`;
const re = /^\s*VERIFY_API_KEYS\s*=.*$/m;
if (re.test(text)) {
  text = text.replace(re, line);
} else {
  // Append with a small header so the file stays readable.
  const block = `\n# --- External verify API (/verify/v1) ---------------------------------------\n# Comma-separated allowlist of x-api-key values partners must send. Keep secret.\n${line}\n`;
  text = text.endsWith('\n') ? text + block : text + '\n' + block;
}
writeFileSync(ENV_PATH, text);

console.log('Wrote VERIFY_API_KEYS to backend/.env');
console.log('\n  API KEY (copy this to the partner project + Vercel):\n');
console.log('    ' + key + '\n');
console.log(`Backup saved to ${ENV_PATH}.bak`);
