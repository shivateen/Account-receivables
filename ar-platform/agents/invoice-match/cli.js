#!/usr/bin/env node
// CLI — headless invocation. Reads a MatchRequest (file or stdin), prints the decision.
//   node cli.js samples/payment-split.json
//   node cli.js --config client-b samples/payment-split.json
//   cat req.json | node cli.js
import { readFileSync } from 'node:fs';
import { matchPayment, loadConfig, VERSION, CONTRACT } from './src/index.js';

const args = process.argv.slice(2);
let configName = 'default', file = null;
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--config') configName = args[++i];
  else if (args[i] === '--version' || args[i] === '-v') { console.log(`${CONTRACT.name} v${VERSION}`); process.exit(0); }
  else file = args[i];
}
const raw = file ? readFileSync(file, 'utf8') : readFileSync(0, 'utf8');
const result = matchPayment(JSON.parse(raw), loadConfig(configName));
console.error(`\n  ${CONTRACT.name} v${VERSION} · config:${configName}  →  ${result.status.toUpperCase()} · ${result.match_type} (L${result.layer}) · conf ${result.confidence} · auto-post ${result.auto_post}`);
console.log(JSON.stringify(result, null, 2));
