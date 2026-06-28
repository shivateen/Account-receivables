// deductions.js — Deductions Management cockpit API
import { Router } from 'express';
import { all, get, run, logActivity } from '../db.js';
import { runAgent } from '../agents.js';

const router = Router();

router.get('/summary', (req, res) => {
  const byStatus = all(`SELECT status, COUNT(*) n, SUM(amount) val FROM deductions GROUP BY status`);
  const byCategory = all(`SELECT category, COUNT(*) n, SUM(amount) val FROM deductions GROUP BY category`);
  const byType = all(`SELECT type, category, COUNT(*) n, SUM(amount) val FROM deductions GROUP BY type ORDER BY val DESC`);
  const byStage = all(`SELECT stage, COUNT(*) n FROM deductions GROUP BY stage`);
  const validity = all(`SELECT validity, COUNT(*) n, SUM(amount) val FROM deductions GROUP BY validity`);
  const leakage = all(`SELECT c.name customer_name, SUM(d.amount) val, COUNT(*) n,
    SUM(CASE WHEN d.validity='invalid' THEN d.amount ELSE 0 END) invalid_val FROM deductions d
    LEFT JOIN customers c ON c.id=d.customer_id GROUP BY d.customer_id ORDER BY val DESC LIMIT 8`);
  const t = get(`SELECT COUNT(*) total, SUM(amount) val,
    SUM(CASE WHEN status!='resolved' THEN 1 ELSE 0 END) open,
    SUM(CASE WHEN validity!='review' AND confidence>=0.85 THEN 1 ELSE 0 END) autovalid,
    SUM(CASE WHEN validity='invalid' THEN 1 ELSE 0 END) invalid,
    SUM(CASE WHEN validity='invalid' THEN amount ELSE 0 END) invalid_val,
    SUM(recovered) recovered FROM deductions`);
  res.json({
    byStatus, byCategory, byType, byStage, validity, leakage,
    total: t.total, value: t.val, open: t.open, invalid: t.invalid, invalidVal: t.invalid_val, recovered: t.recovered || 0,
    autoValidation: t.total ? Math.round(t.autovalid / t.total * 100) : 0,
  });
});

router.get('/list', (req, res) => {
  const where = req.query.category ? `WHERE d.category=?` : '';
  const sql = `SELECT d.*, c.name customer_name, i.doc_number FROM deductions d
    LEFT JOIN customers c ON c.id=d.customer_id LEFT JOIN invoices i ON i.id=d.invoice_id ${where}
    ORDER BY d.amount DESC`;
  res.json(req.query.category ? all(sql, req.query.category) : all(sql));
});

router.get('/promotions', (req, res) => {
  res.json(all(`SELECT p.*, c.name customer_name FROM trade_promotions p
    LEFT JOIN customers c ON c.id=p.customer_id ORDER BY p.end_date DESC`));
});

router.get('/:id', (req, res) => {
  const d = get(`SELECT d.*, c.name customer_name, c.segment, i.doc_number, i.amount inv_amount FROM deductions d
    LEFT JOIN customers c ON c.id=d.customer_id LEFT JOIN invoices i ON i.id=d.invoice_id WHERE d.id=?`, req.params.id);
  if (!d) return res.status(404).json({ error: 'not found' });
  let promo = null;
  if (d.promo_id) promo = get(`SELECT * FROM trade_promotions WHERE id=?`, d.promo_id);
  res.json({ ...d, backup_docs: safe(d.backup_docs), promo: promo ? { ...promo, skus: safe(promo.skus) } : null });
});

function safe(j) { try { return JSON.parse(j); } catch { return []; } }

router.post('/:id/:action', (req, res) => {
  const d = get(`SELECT * FROM deductions WHERE id=?`, req.params.id);
  if (!d) return res.status(404).json({ error: 'not found' });
  const map = { validate: 'AGENT-DE-VALIDITY', match: 'AGENT-DE-PROMO', classify: 'AGENT-DE-CLASSIFY' };
  const a = req.params.action;
  if (map[a]) {
    const agent = get(`SELECT * FROM agents WHERE id=?`, map[a]);
    const result = runAgent(agent, { deduction: d });
    logActivity('deductions', agent.id, 'act', `${agent.name} · ${d.id}`, JSON.stringify(result.output).slice(0, 100));
    return res.json(result);
  }
  if (a === 'resolve') {
    const decision = req.body?.decision || (d.validity === 'invalid' ? 'dispute' : 'approve');
    const status = decision === 'dispute' ? 'disputed' : 'resolved';
    const recovered = decision === 'dispute' ? d.amount : 0;
    run(`UPDATE deductions SET status=?, stage='Resolve', resolution=?, recovered=? WHERE id=?`,
      status, decision === 'dispute' ? 'denied — disputed on portal' : 'approved — write-off posted', recovered, d.id);
    logActivity('deductions', decision === 'dispute' ? 'AGENT-DE-DISPUTE' : 'AGENT-DE-AUTO', 'done',
      `Deduction ${d.id} ${status}`, `${decision} · ${recovered ? 'recovering ' + recovered : 'write-off'}`);
    return res.json({ ok: true, status, decision, recovered });
  }
  res.status(400).json({ error: 'unknown action' });
});

export default router;
