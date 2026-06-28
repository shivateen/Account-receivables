// ---------------------------------------------------------------------------
// export-static.mjs — build a STATIC version of the app for GitHub Pages.
// Bakes every GET API response into docs/api-static/*.json, copies the web/
// front-end into docs/, and injects the static-mode flag. Requires the server
// running on :3100 (the script starts it if needed is the caller's job).
//   node scripts/export-static.mjs
// ---------------------------------------------------------------------------
import { mkdirSync, writeFileSync, cpSync, rmSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const WEB = join(ROOT, 'web');
const DOCS = join(ROOT, '..', 'docs');           // repo-root /docs (served by Pages)
const API = join(DOCS, 'api-static');
const SRV = process.env.SRV || 'http://localhost:3100';

// must mirror staticFile() in web/assets/js/api.js
function fileFor(path) {
  let [p, q] = path.replace(/^\/api\//, '').split('?');
  if (q) { const parts = q.split('&').filter(kv => !kv.startsWith('limit=')).sort(); if (parts.length) p += '__' + parts.map(kv => kv.replace('=', '_')).join('__'); }
  return p + '.json';
}
let count = 0;
async function bake(path) {
  const r = await fetch(SRV + path);
  if (!r.ok) { console.warn('  skip', path, r.status); return null; }
  const data = await r.json();
  const out = join(API, fileFor(path));
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, JSON.stringify(data));
  count++;
  return data;
}

// ---- clean + copy front-end ----
rmSync(DOCS, { recursive: true, force: true });
mkdirSync(API, { recursive: true });
cpSync(WEB, DOCS, { recursive: true });
writeFileSync(join(DOCS, '.nojekyll'), '');       // serve files as-is (underscores etc.)
// inject the static-mode flag before api.js in every page that loads it
writeFileSync(join(DOCS, 'assets', 'js', 'static-flag.js'), 'window.__AR_STATIC__=true;');
const FAVICON = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%23F08C1E'/%3E%3Ctext x='16' y='22' font-family='Arial' font-size='13' font-weight='700' fill='white' text-anchor='middle'%3EAR%3C/text%3E%3C/svg%3E">`;
for (const f of readdirSync(DOCS)) {
  if (!f.endsWith('.html')) continue;
  const p = join(DOCS, f); let html = readFileSync(p, 'utf8'); let changed = false;
  if (html.includes('assets/js/api.js') && !html.includes('static-flag.js')) {
    html = html.replace('<script src="assets/js/api.js"></script>', '<script src="assets/js/static-flag.js"></script>\n<script src="assets/js/api.js"></script>'); changed = true;
  }
  if (!html.includes('rel="icon"')) { html = html.replace('</title>', '</title>\n' + FAVICON); changed = true; }
  if (changed) writeFileSync(p, html);
}

// ---- bake all GET endpoints ----
console.log('Baking API snapshots from', SRV);
await bake('/api/metrics');
await bake('/api/metrics/activity');
await bake('/api/cashapp/summary');
await bake('/api/cashapp/exceptions');
await bake('/api/collections/summary');
await bake('/api/collections/worklist');
await bake('/api/disputes/summary');
await bake('/api/deductions/summary');
await bake('/api/deductions/promotions');
await bake('/api/customers');
await bake('/api/agents');
await bake('/api/agents/roster');
await bake('/api/roi');
await bake('/api/settings');
// query variants used by the UI
const payments = await bake('/api/cashapp/payments');
for (const s of ['posted', 'matched', 'exception', 'unmatched']) await bake(`/api/cashapp/payments?status=${s}`);
const cases = await bake('/api/disputes/cases');
for (const s of ['open', 'investigating', 'resolved', 'denied']) await bake(`/api/disputes/cases?status=${s}`);
const dedList = await bake('/api/deductions/list');
for (const c of ['trade', 'non-trade']) await bake(`/api/deductions/list?category=${c}`);
for (const m of ['cashapp', 'collections', 'dispute', 'deductions', 'platform']) await bake(`/api/agents?module=${m}`);
// per-id detail endpoints (enumerated from the lists)
for (const p of payments || []) await bake(`/api/cashapp/payments/${p.id}`);
for (const c of (await bake('/api/collections/worklist')) || []) await bake(`/api/collections/cases/${c.id}`);
for (const c of cases || []) await bake(`/api/disputes/cases/${c.id}`);
for (const d of dedList || []) await bake(`/api/deductions/${d.id}`);
for (const a of (await bake('/api/agents')) || []) await bake(`/api/agents/${a.id}`);
for (const c of (await bake('/api/customers')) || []) await bake(`/api/customers/${c.id}`);
for (const k of ['dso', 'cei', 'pastDuePct', 'autoMatchRate', 'matchRate', 'unappliedCash', 'openExceptions', 'disputeResolution', 'autoValidation', 'delinquencyRisk', 'autoClassification']) await bake(`/api/kpi/${k}`);

console.log(`\n✓ Static build → docs/  (${count} API snapshots + front-end). Serve /docs on GitHub Pages.`);
