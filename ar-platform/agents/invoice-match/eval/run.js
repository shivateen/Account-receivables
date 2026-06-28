// ---------------------------------------------------------------------------
// eval/run.js — runs the agent over a labelled golden set and prints a report
// (match-rate, auto-post precision, per-layer mix). This is the "show me the
// numbers" artifact for a client.
//   node eval/run.js            (default config)
//   node eval/run.js client-b   (a second client's config)
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { matchPayment, loadConfig, VERSION, CONTRACT } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cfgName = process.argv[2] || 'default';
const cfg = loadConfig(cfgName);
const cases = JSON.parse(readFileSync(join(__dirname, 'golden.json'), 'utf8'));
const sorted = (a) => [...a].sort();
const same = (a, b) => sorted(a).join(',') === sorted(b).join(',');

let correct = 0, autoPosted = 0, autoPostCorrect = 0;
const layers = {}; const fails = [];
for (const c of cases) {
  const r = matchPayment(c.input, cfg);
  const ok = r.status === c.expect.status && same(r.matched_invoices, c.expect.matched);
  if (ok) correct++; else fails.push({ name: c.name, expected: c.expect, got: { status: r.status, matched: r.matched_invoices, layer: r.layer } });
  layers[r.layer] = (layers[r.layer] || 0) + 1;
  if (r.auto_post) { autoPosted++; if (ok) autoPostCorrect++; }
}
const n = cases.length;
const pct = (x, y) => y ? (100 * x / y).toFixed(1) + '%' : 'n/a';

console.log(`\n  ${CONTRACT.name}  v${VERSION}   ·   config: ${cfgName}`);
console.log('  ' + '─'.repeat(58));
console.log(`  Cases evaluated        ${n}`);
console.log(`  Correct (status+match) ${correct}/${n}   (${pct(correct, n)})`);
console.log(`  Auto-post eligible     ${autoPosted}   ·   precision ${pct(autoPostCorrect, autoPosted)}`);
console.log(`  Resolution by layer    ${Object.entries(layers).map(([k, v]) => `${k}:${v}`).join('  ')}`);
console.log('  ' + '─'.repeat(58));
if (fails.length) {
  console.log(`  ${fails.length} miss(es):`);
  fails.forEach(f => console.log(`   ✗ ${f.name}\n       expected ${f.expected.status} ${JSON.stringify(f.expected.matched)}  ·  got ${f.got.status} ${JSON.stringify(f.got.matched)} (L${f.got.layer})`));
} else {
  console.log('  ✓ all golden cases passed');
}
console.log('');
process.exit(fails.length ? 1 : 0);
