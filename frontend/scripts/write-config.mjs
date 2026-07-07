#!/usr/bin/env node
/**
 * Writes public/config.json before build/serve.
 * Set CHAINPROOF_API_URL in .env or the environment.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const out = resolve(root, 'public/config.json');

function loadDotEnv() {
  const envPath = resolve(root, '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadDotEnv();

const isProd = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
// Dev: empty apiUrl → same-origin requests proxied to :8080 (no CORS issues).
const apiUrl = process.env.CHAINPROOF_API_URL ?? (isProd ? '' : '');

const config = { apiUrl };
writeFileSync(out, JSON.stringify(config, null, 2) + '\n');
console.log(`Wrote ${out}: apiUrl=${apiUrl === '' ? '(same origin)' : apiUrl}`);
