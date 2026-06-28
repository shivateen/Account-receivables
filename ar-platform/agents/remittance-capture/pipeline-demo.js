// ---------------------------------------------------------------------------
// pipeline-demo.js — two reusable agents composed end-to-end:
//   raw remittance text  →  Remittance Capture  →  Invoice Match  →  decision
// Both are standalone packages; this just wires their contracts together.
//   node pipeline-demo.js
// ---------------------------------------------------------------------------
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { capture, toMatchRequest, loadConfig as captureCfg } from './src/index.js';
// the OTHER reusable agent — imported by path (separate package in the same repo)
import { matchPayment, loadConfig as matchCfg } from '../invoice-match/src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(__dirname, 'samples', 'email.txt'), 'utf8');

// The client's open invoices (would come from SAP/Oracle via an adapter)
const open_invoices = [
  { id: 'INV-A', doc_number: '90013100', customer_id: 'CUST-1', open_amount: 120000, currency: 'USD', due_date: '2026-06-20' },
  { id: 'INV-B', doc_number: '90013101', customer_id: 'CUST-1', open_amount: 45000, currency: 'USD', due_date: '2026-06-22' },
  { id: 'INV-C', doc_number: '90099999', customer_id: 'CUST-1', open_amount: 480000, currency: 'USD', due_date: '2026-06-30' },
];

const line = (s) => console.log(s);
line('\n  ── Stage 1 · Remittance Capture ─────────────────────────────');
const remit = await capture({ text: raw }, captureCfg('default'));
line(`  channel ${remit.source_channel} · payer "${remit.payer.name}" · amount ${remit.payment.amount} ${remit.payment.currency}`);
line(`  refs ${JSON.stringify(remit.payment.references)} · lines ${remit.payment.remittance_lines.length} · confidence ${remit.confidence}${remit.reconciled ? ' · reconciles ✓' : ''}`);

line('\n  ── Stage 2 · Invoice Match ──────────────────────────────────');
const req = toMatchRequest(remit, open_invoices, { id: 'PAY-PIPE-1', customer_id: 'CUST-1' });
const res = matchPayment(req, matchCfg('default'));
line(`  status ${res.status.toUpperCase()} · ${res.match_type} (L${res.layer}) · confidence ${res.confidence} · auto-post ${res.auto_post}`);
line(`  matched ${JSON.stringify(res.matched_invoices)} · applied ${res.applied_amount} · residual ${res.residual}`);
line(`  rationale: ${res.rationale.join(' | ')}`);
line('\n  → One email of text became a posted, matched payment — two reusable agents, no UI.\n');
