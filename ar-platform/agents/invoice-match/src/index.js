// ---------------------------------------------------------------------------
// index.js — public API of the Invoice Match agent.
//   import { matchPayment, loadConfig } from '@tiger/o2c-invoice-match'
// Runtime-agnostic: no cloud SDKs, no DB. The platform supplies data; this
// returns a decision. Same package runs locally, in Azure, in GCP, anywhere.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';
import { match } from './engine.js';
import { validate, CONTRACT } from './contract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const VERSION = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')).version;
export { CONTRACT };

export function loadConfig(nameOrPath = 'default') {
  const p = isAbsolute(nameOrPath) || nameOrPath.endsWith('.json')
    ? nameOrPath : join(__dirname, '..', 'config', `${nameOrPath}.json`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

// The agent's single entry point. Validates the contract, runs the waterfall.
export function matchPayment(req, config = loadConfig('default')) {
  validate(req);
  const t0 = process.hrtime.bigint();
  const result = match(req, config);
  result.meta = { agent: CONTRACT.name, version: VERSION, ms: Number(process.hrtime.bigint() - t0) / 1e6 };
  return result;
}
