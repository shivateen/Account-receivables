// collections.js — Collections cockpit API
import { Router } from 'express';
import { all, get, run, logActivity } from '../db.js';
import { runAgent } from '../agents.js';

const router = Router();

router.get('/summary', (req, res) => {
  const totals = get(`SELECT COUNT(*) cases, SUM(total_past_due) past_due, AVG(delinquency_prob) delinq,
    SUM(CASE WHEN sla_status='breached' THEN 1 ELSE 0 END) breached,
    SUM(CASE WHEN sla_status='at_risk' THEN 1 ELSE 0 END) at_risk,
    SUM(CASE WHEN sla_status='on_track' THEN 1 ELSE 0 END) on_track FROM collection_cases`);
  const stages = all(`SELECT stage, COUNT(*) n, SUM(total_past_due) val FROM collection_cases GROUP BY stage`);
  const aging = all(`SELECT i.aging_bucket b, SUM(i.open_amount) val FROM invoices i
    WHERE i.status!='paid' AND i.days_past_due>0 GROUP BY i.aging_bucket`);
  const collectors = all(`SELECT * FROM collectors WHERE id != 'COLL-0' ORDER BY performance DESC`);
  const promises = get(`SELECT COUNT(*) n, SUM(amount) val,
    SUM(CASE WHEN status='kept' THEN 1 ELSE 0 END) kept,
    SUM(CASE WHEN status='broken' THEN 1 ELSE 0 END) broken FROM promises`);
  const dunning = get(`SELECT COUNT(*) sent,
    SUM(CASE WHEN response IN ('replied','promised','paid') THEN 1 ELSE 0 END) responded FROM dunning_history`);
  const highRisk = get(`SELECT COUNT(*) n FROM collection_cases WHERE delinquency_prob > 0.7`).n;
  res.json({
    ...totals, stages, aging, collectors,
    promises: { ...promises, conversion: promises.n ? Math.round(promises.kept / promises.n * 100) : 0 },
    dunning: { ...dunning, responseRate: dunning.sent ? Math.round(dunning.responded / dunning.sent * 100) : 0 },
    highRisk,
  });
});

// Prioritized worklist
router.get('/worklist', (req, res) => {
  res.json(all(`SELECT cc.*, c.name customer_name, c.segment, c.risk_tier, c.region, col.name collector_name
    FROM collection_cases cc
    LEFT JOIN customers c ON c.id=cc.customer_id
    LEFT JOIN collectors col ON col.id=cc.assigned_to
    ORDER BY cc.priority_rank ASC`));
});

router.get('/cases/:id', (req, res) => {
  const cc = get(`SELECT cc.*, c.name customer_name, c.segment, c.risk_tier, c.region, c.contact_name, c.contact_email,
    c.credit_limit, c.credit_used, c.payment_terms, c.dso, c.portal, col.name collector_name
    FROM collection_cases cc LEFT JOIN customers c ON c.id=cc.customer_id
    LEFT JOIN collectors col ON col.id=cc.assigned_to WHERE cc.id=?`, req.params.id);
  if (!cc) return res.status(404).json({ error: 'not found' });
  const invoices = all(`SELECT * FROM invoices WHERE customer_id=? AND status!='paid' AND days_past_due>0 ORDER BY days_past_due DESC`, cc.customer_id);
  const dunning = all(`SELECT * FROM dunning_history WHERE case_id=? ORDER BY step DESC`, cc.id);
  const promises = all(`SELECT * FROM promises WHERE case_id=? ORDER BY created_at DESC`, cc.id);
  const calls = all(`SELECT * FROM call_logs WHERE case_id=? ORDER BY ts DESC`, cc.id);
  res.json({ ...cc, factors: safe(cc.factors), invoices, dunning, promises, calls });
});

function safe(j) { try { return JSON.parse(j); } catch { return {}; } }

// Send a dunning step (runs the Smart Dunning agent)
router.post('/cases/:id/dunning', (req, res) => {
  const cc = get(`SELECT cc.*, c.name customer_name, c.segment FROM collection_cases cc
    LEFT JOIN customers c ON c.id=cc.customer_id WHERE cc.id=?`, req.params.id);
  if (!cc) return res.status(404).json({ error: 'not found' });
  const channel = req.body?.channel || 'email';
  const agent = get(`SELECT * FROM agents WHERE id='AGENT-CO-DUNNING'`);
  const result = runAgent(agent, { case: cc, customer: { segment: cc.segment } });
  const step = (get(`SELECT MAX(step) m FROM dunning_history WHERE case_id=?`, cc.id).m || 0) + 1;
  const dunId = 'DUN-LIVE-' + Date.now();
  run(`INSERT INTO dunning_history (id,case_id,customer_id,step,channel,sent_at,subject,response,outcome)
    VALUES (?,?,?,?,?,?,?,?,?)`, dunId, cc.id, cc.customer_id, step, channel, new Date().toISOString(),
    `Dunning step ${step} — ${channel}`, 'none', 'sent');
  logActivity('collections', agent.id, 'done', `Dunning sent to ${cc.customer_name}`, `step ${step} · ${channel}`);
  res.json({ ok: true, step, trace: result });
});

router.post('/cases/:id/promise', (req, res) => {
  const cc = get(`SELECT * FROM collection_cases WHERE id=?`, req.params.id);
  if (!cc) return res.status(404).json({ error: 'not found' });
  const { amount, promise_date } = req.body || {};
  const pid = 'PROM-LIVE-' + Date.now();
  run(`INSERT INTO promises (id,case_id,customer_id,promise_date,amount,status,captured_from,created_at)
    VALUES (?,?,?,?,?,?,?,?)`, pid, cc.id, cc.customer_id, promise_date || null,
    amount || cc.total_past_due, 'pending', 'call', new Date().toISOString());
  logActivity('collections', 'AGENT-CO-PTP', 'act', `Promise-to-pay logged`, `${cc.id} · ${promise_date || ''}`);
  res.json({ ok: true });
});

// Run delinquency prediction for a case
router.post('/cases/:id/predict', (req, res) => {
  const cc = get(`SELECT * FROM collection_cases WHERE id=?`, req.params.id);
  if (!cc) return res.status(404).json({ error: 'not found' });
  const agent = get(`SELECT * FROM agents WHERE id='AGENT-CO-DELINQ'`);
  res.json(runAgent(agent, { case: cc }));
});

export default router;
