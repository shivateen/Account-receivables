// disputes.js — Dispute Management cockpit API
import { Router } from 'express';
import { all, get, run, logActivity } from '../db.js';
import { runAgent } from '../agents.js';

const router = Router();

router.get('/summary', (req, res) => {
  const byStatus = all(`SELECT status, COUNT(*) n, SUM(amount) val FROM disputes GROUP BY status`);
  const byType = all(`SELECT type, COUNT(*) n, SUM(amount) val FROM disputes GROUP BY type ORDER BY n DESC`);
  const byStage = all(`SELECT stage, COUNT(*) n FROM disputes GROUP BY stage`);
  const rootCause = all(`SELECT root_cause, type, COUNT(*) n, SUM(amount) val FROM disputes GROUP BY root_cause ORDER BY n DESC`);
  const t = get(`SELECT COUNT(*) total, SUM(amount) val,
    SUM(CASE WHEN status IN ('open','investigating') THEN 1 ELSE 0 END) open,
    SUM(CASE WHEN sla_status='breached' THEN 1 ELSE 0 END) breached,
    SUM(CASE WHEN sla_status='at_risk' THEN 1 ELSE 0 END) at_risk,
    SUM(CASE WHEN classify_conf>=0.7 THEN 1 ELSE 0 END) classified,
    AVG(win_prob) win_prob,
    AVG(CASE WHEN status='resolved' THEN julianday('now')-julianday(created_at) END) avg_days FROM disputes`);
  res.json({
    byStatus, byType, byStage, rootCause,
    total: t.total, value: t.val, open: t.open, breached: t.breached, at_risk: t.at_risk,
    autoClassify: t.total ? Math.round(t.classified / t.total * 100) : 0,
    winRate: Math.round((t.win_prob || 0) * 100),
    resolutionDays: Math.max(7, Math.round(t.avg_days || 14)),
  });
});

router.get('/cases', (req, res) => {
  const where = req.query.status ? `WHERE d.status=?` : '';
  const sql = `SELECT d.*, c.name customer_name, c.segment, i.doc_number FROM disputes d
    LEFT JOIN customers c ON c.id=d.customer_id LEFT JOIN invoices i ON i.id=d.invoice_id ${where}
    ORDER BY (d.sla_status='breached') DESC, d.amount DESC`;
  res.json(req.query.status ? all(sql, req.query.status) : all(sql));
});

router.get('/cases/:id', (req, res) => {
  const d = get(`SELECT d.*, c.name customer_name, c.segment, c.contact_name, i.doc_number, i.amount inv_amount, i.due_date
    FROM disputes d LEFT JOIN customers c ON c.id=d.customer_id LEFT JOIN invoices i ON i.id=d.invoice_id WHERE d.id=?`, req.params.id);
  if (!d) return res.status(404).json({ error: 'not found' });
  const evidence = all(`SELECT * FROM dispute_evidence WHERE dispute_id=? ORDER BY relevance DESC`, d.id);
  res.json({ ...d, evidence });
});

router.post('/cases/:id/:action', (req, res) => {
  const d = get(`SELECT * FROM disputes WHERE id=?`, req.params.id);
  if (!d) return res.status(404).json({ error: 'not found' });
  const map = { classify: 'AGENT-DI-CLASSIFY', evidence: 'AGENT-DI-EVIDENCE', predict: 'AGENT-DI-OUTCOME' };
  const a = req.params.action;
  if (map[a]) {
    const agent = get(`SELECT * FROM agents WHERE id=?`, map[a]);
    const evidenceCount = a === 'evidence' ? (get(`SELECT COUNT(*) n FROM dispute_evidence WHERE dispute_id=?`, d.id).n) : 0;
    if (a === 'evidence') run(`UPDATE dispute_evidence SET status='pulled' WHERE dispute_id=?`, d.id);
    const result = runAgent(agent, { dispute: d, evidenceCount });
    logActivity('dispute', agent.id, 'act', `${agent.name} · ${d.id}`, JSON.stringify(result.output).slice(0, 100));
    return res.json(result);
  }
  if (a === 'resolve') {
    const decision = req.body?.decision || d.predicted || 'partial';
    const resolvedAmt = decision === 'approve' ? d.amount : decision === 'partial' ? +(d.amount * 0.5).toFixed(2) : 0;
    const status = decision === 'deny' ? 'denied' : 'resolved';
    run(`UPDATE disputes SET status=?, stage='Analyze', resolution=?, resolved_amount=? WHERE id=?`,
      status, `${decision} — ${decision === 'deny' ? 'denied with evidence' : 'credit memo posted'}`, resolvedAmt, d.id);
    logActivity('dispute', 'AGENT-DI-CORR', 'done', `Dispute ${d.id} ${status}`, `${decision} · ${resolvedAmt}`);
    return res.json({ ok: true, status, decision, resolved_amount: resolvedAmt });
  }
  res.status(400).json({ error: 'unknown action' });
});

export default router;
