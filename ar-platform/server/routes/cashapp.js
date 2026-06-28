// cashapp.js — Cash Application cockpit API
import { Router } from 'express';
import { all, get, run, logActivity } from '../db.js';
import { runAgent } from '../agents.js';

const router = Router();

// Summary: status counts, channel + layer breakdown, match rate, unapplied cash
router.get('/summary', (req, res) => {
  const status = all(`SELECT status, COUNT(*) n, SUM(amount) val FROM payments GROUP BY status`);
  const channels = all(`SELECT channel, COUNT(*) n, SUM(amount) val FROM payments GROUP BY channel ORDER BY n DESC`);
  const layers = all(`SELECT match_layer, COUNT(*) n FROM payments WHERE match_layer IS NOT NULL GROUP BY match_layer ORDER BY match_layer`);
  const totals = get(`SELECT COUNT(*) total, SUM(amount) val,
    SUM(CASE WHEN status IN ('posted','matched') THEN 1 ELSE 0 END) matched,
    SUM(CASE WHEN status='posted' THEN 1 ELSE 0 END) posted,
    SUM(CASE WHEN status IN ('exception','unmatched') THEN amount ELSE 0 END) unapplied
    FROM payments`);
  res.json({
    byStatus: status, byChannel: channels, byLayer: layers,
    total: totals.total, totalVal: totals.val, matched: totals.matched, posted: totals.posted,
    matchRate: totals.total ? Math.round(totals.matched / totals.total * 100) : 0,
    unapplied: totals.unapplied || 0,
    waterfall: buildWaterfall(),
  });
});

function buildWaterfall() {
  // counts resolved at each layer + remaining to exception
  const rows = all(`SELECT match_layer l, COUNT(*) n FROM payments WHERE status IN ('posted','matched') GROUP BY match_layer`);
  const total = get(`SELECT COUNT(*) n FROM payments`).n;
  const map = {}; rows.forEach(r => map[r.l] = r.n);
  const labels = [
    { layer: 1, name: 'Deterministic', desc: 'Exact invoice + amount + date' },
    { layer: 2, name: 'Fuzzy', desc: 'PO/SO refs, amount tolerance' },
    { layer: 3, name: 'ML Pattern', desc: 'Trained on clearing history' },
    { layer: 4, name: 'Hierarchy', desc: 'Parent-child / cross-entity' },
    { layer: 5, name: 'Agent', desc: 'LLM investigation' },
  ];
  let remaining = total;
  const out = labels.map(l => { const n = map[l.layer] || 0; const row = { ...l, n, inflow: remaining }; remaining -= n; return row; });
  const exc = get(`SELECT COUNT(*) n FROM payments WHERE status IN ('exception','unmatched')`).n;
  out.push({ layer: 'X', name: 'Exception Queue', desc: 'Human-in-the-loop', n: exc, inflow: remaining });
  return out;
}

// Payment list (optionally by status), with customer name
router.get('/payments', (req, res) => {
  const { status } = req.query;
  const where = status ? `WHERE p.status = ?` : '';
  const sql = `SELECT p.*, c.name AS customer_name, c.segment FROM payments p
    LEFT JOIN customers c ON c.id=p.customer_id ${where} ORDER BY p.received_at DESC`;
  res.json(status ? all(sql, status) : all(sql));
});

router.get('/payments/:id', (req, res) => {
  const p = get(`SELECT p.*, c.name customer_name, c.segment, c.portal FROM payments p
    LEFT JOIN customers c ON c.id=p.customer_id WHERE p.id=?`, req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  let invs = [];
  try { const ids = JSON.parse(p.matched_invoices || '[]'); if (ids.length) invs = all(`SELECT * FROM invoices WHERE id IN (${ids.map(() => '?').join(',')})`, ...ids); } catch {}
  res.json({ ...p, invoices: invs });
});

router.get('/exceptions', (req, res) => {
  res.json(all(`SELECT e.*, c.name customer_name, p.channel, p.bank_ref FROM exceptions e
    LEFT JOIN customers c ON c.id=e.customer_id LEFT JOIN payments p ON p.id=e.payment_id
    WHERE e.status != 'resolved' ORDER BY e.severity DESC, e.amount DESC`));
});

// Run the match agent against a payment (returns reasoning trace)
router.post('/payments/:id/match', (req, res) => {
  const p = get(`SELECT * FROM payments WHERE id=?`, req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  const agent = get(`SELECT * FROM agents WHERE id='AGENT-CA-INVMATCH'`);
  const result = runAgent(agent, { payment: p });
  logActivity('cashapp', agent.id, 'act', `Match run on ${p.id}`, `layer ${result.output.layer} · conf ${result.output.confidence}`);
  res.json(result);
});

// Post matched payment to "SAP"
router.post('/payments/:id/post', (req, res) => {
  const p = get(`SELECT * FROM payments WHERE id=?`, req.params.id);
  if (!p) return res.status(404).json({ error: 'not found' });
  if (p.status === 'posted') return res.json({ ok: true, already: true, sap_doc: p.sap_doc });
  const sapDoc = '14' + Math.floor(Math.random() * 9e7 + 1e7);
  const postedAt = new Date().toISOString();
  run(`UPDATE payments SET status='posted', sap_doc=?, posted_at=? WHERE id=?`, sapDoc, postedAt, p.id);
  logActivity('cashapp', 'AGENT-CA-POST', 'done', `Posted ${p.id} to SAP`, `clearing doc ${sapDoc}`);
  res.json({ ok: true, sap_doc: sapDoc, posted_at: postedAt });
});

router.post('/exceptions/:id/resolve', (req, res) => {
  const e = get(`SELECT * FROM exceptions WHERE id=?`, req.params.id);
  if (!e) return res.status(404).json({ error: 'not found' });
  const resolution = req.body?.resolution || 'Resolved via recommended action';
  run(`UPDATE exceptions SET status='resolved', resolution=? WHERE id=?`, resolution, e.id);
  logActivity('cashapp', 'AGENT-CA-RESOLVE', 'done', `Exception ${e.id} resolved`, resolution);
  res.json({ ok: true });
});

export default router;
