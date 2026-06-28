// eval/run.js — runs the capture agent over a labelled golden set, prints
// extraction accuracy + average confidence + channel mix.
//   node eval/run.js
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { capture, loadConfig, VERSION, CONTRACT } from '../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const cases = JSON.parse(readFileSync(join(__dirname, 'golden.json'), 'utf8'));
const cfg = loadConfig('default');
const sortedEq = (a, b) => [...a].map(String).sort().join(',') === [...b].map(String).sort().join(',');
const near = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) <= 1);

let correct = 0, confSum = 0; const chan = {}; const fails = [];
for (const c of cases) {
  const r = await capture(c.input, cfg);
  confSum += r.confidence; chan[r.source_channel] = (chan[r.source_channel] || 0) + 1;
  const ok = near(r.payment.amount, c.expect.amount) && r.payment.currency === c.expect.currency &&
    sortedEq(r.payment.references, c.expect.refs) && r.payment.remittance_lines.length === c.expect.lines &&
    r.reconciled === c.expect.reconciled;
  if (ok) correct++; else fails.push({ name: c.name, got: { amount: r.payment.amount, refs: r.payment.references, lines: r.payment.remittance_lines.length, reconciled: r.reconciled }, expect: c.expect });
}
const n = cases.length, pct = (x, y) => y ? (100 * x / y).toFixed(1) + '%' : 'n/a';
console.log(`\n  ${CONTRACT.name}  v${VERSION}   ·   provider: ${cfg.provider}`);
console.log('  ' + '─'.repeat(58));
console.log(`  Documents evaluated    ${n}`);
console.log(`  Correct extraction     ${correct}/${n}   (${pct(correct, n)})`);
console.log(`  Avg confidence         ${(confSum / n).toFixed(2)}`);
console.log(`  Channel mix            ${Object.entries(chan).map(([k, v]) => `${k}:${v}`).join('  ')}`);
console.log('  ' + '─'.repeat(58));
if (fails.length) { console.log(`  ${fails.length} miss(es):`); fails.forEach(f => console.log(`   ✗ ${f.name}\n       got ${JSON.stringify(f.got)}\n       exp ${JSON.stringify(f.expect)}`)); }
else console.log('  ✓ all golden documents extracted correctly');
console.log('');
process.exit(fails.length ? 1 : 0);
