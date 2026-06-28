// ---------------------------------------------------------------------------
// index.js — public API of the Remittance Capture agent.
//   import { capture, loadConfig } from '@tiger/o2c-remittance-capture'
// Provider is pluggable (text | docintel). The agent core is runtime-agnostic;
// only the provider adapter touches an external OCR/vision service.
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, isAbsolute } from 'node:path';
import { parse } from './engine.js';
import { validate, CONTRACT } from './contract.js';
import * as textProvider from './providers/text.js';
import * as docintelProvider from './providers/docintel.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const VERSION = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8')).version;
export { CONTRACT };
const PROVIDERS = { text: textProvider, docintel: docintelProvider };

export function loadConfig(nameOrPath = 'default') {
  const p = isAbsolute(nameOrPath) || nameOrPath.endsWith('.json') ? nameOrPath : join(__dirname, '..', 'config', `${nameOrPath}.json`);
  return JSON.parse(readFileSync(p, 'utf8'));
}

export async function capture(req, config = loadConfig('default')) {
  validate(req);
  const t0 = process.hrtime.bigint();
  const provName = req.provider || config.provider || 'text';
  const provider = PROVIDERS[provName];
  if (!provider) throw new Error('unknown provider: ' + provName);
  const ext = await provider.extract(req);
  const result = parse(ext.text, req.channel || ext.channel);
  result.needs_review = result.confidence < (config.review_below_confidence ?? 0.6);
  result.meta = { agent: CONTRACT.name, version: VERSION, provider: provName, ms: Number(process.hrtime.bigint() - t0) / 1e6 };
  return result;
}

// Shape the capture output as an @tiger/o2c-invoice-match MatchRequest.
export function toMatchRequest(remittance, open_invoices, { id = 'PAY-' + Date.now(), customer_id } = {}) {
  return { payment: { id, customer_id, ...remittance.payment }, open_invoices };
}
