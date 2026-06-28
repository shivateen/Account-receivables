#!/usr/bin/env node
// CLI — headless. Reads remittance text (file or stdin), prints canonical remittance.
//   node cli.js samples/email.txt
//   cat remittance.txt | node cli.js
import { readFileSync } from 'node:fs';
import { capture, loadConfig, VERSION, CONTRACT } from './src/index.js';

const args = process.argv.slice(2);
let provider, channel, file = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--provider') provider = args[++i];
  else if (args[i] === '--channel') channel = args[++i];
  else if (args[i] === '-v' || args[i] === '--version') { console.log(`${CONTRACT.name} v${VERSION}`); process.exit(0); }
  else file = args[i];
}
const text = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
const r = await capture({ text, provider, channel }, loadConfig('default'));
console.error(`\n  ${CONTRACT.name} v${VERSION}  →  ${r.source_channel} · amount ${r.payment.amount} ${r.payment.currency} · ${r.payment.references.length} refs · conf ${r.confidence}${r.needs_review ? ' · NEEDS REVIEW' : ''}`);
console.log(JSON.stringify(r, null, 2));
