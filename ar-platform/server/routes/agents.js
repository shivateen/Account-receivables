// agents.js — agent roster + run engine endpoints
import { Router } from 'express';
import { all, get, run, logActivity } from '../db.js';
import { runAgent, AGENT_DETAIL, MODULE_SAP, agentMeta } from '../agents.js';

const router = Router();

router.get('/', (req, res) => {
  const { module } = req.query;
  const sql = module ? `SELECT * FROM agents WHERE module=? ORDER BY name` : `SELECT * FROM agents ORDER BY module, name`;
  const rows = module ? all(sql, module) : all(sql);
  res.json(rows.map(a => { const m = agentMeta(a); return { ...a, version: m.version, maturity: m.maturity, prebuilt: m.prebuilt, deployments: m.deployments }; }));
});

router.get('/roster', (req, res) => {
  // grouped counts per module for the command center
  res.json(all(`SELECT module, COUNT(*) n,
    SUM(CASE WHEN state='active' THEN 1 ELSE 0 END) active,
    SUM(runs_today) runs FROM agents GROUP BY module`));
});

router.get('/:id', (req, res) => {
  const a = get(`SELECT * FROM agents WHERE id=?`, req.params.id);
  if (!a) return res.status(404).json({ error: 'not found' });
  const runs = all(`SELECT * FROM agent_runs WHERE agent_id=? ORDER BY ts DESC LIMIT 10`, a.id);
  res.json({ ...a, detail: AGENT_DETAIL[a.id] || a.fn, sap: MODULE_SAP[a.module] || MODULE_SAP.platform, meta: agentMeta(a),
    runs: runs.map(r => ({ ...r, steps: safe(r.steps), output: safe(r.output) })) });
});

function safe(j) { try { return JSON.parse(j); } catch { return null; } }

// Generic agent run with optional context (paymentId / caseId / exceptionId)
router.post('/:id/run', (req, res) => {
  const a = get(`SELECT * FROM agents WHERE id=?`, req.params.id);
  if (!a) return res.status(404).json({ error: 'not found' });
  const ctx = {};
  const b = req.body || {};
  if (b.paymentId) ctx.payment = get(`SELECT * FROM payments WHERE id=?`, b.paymentId);
  if (b.caseId) ctx.case = get(`SELECT * FROM collection_cases WHERE id=?`, b.caseId);
  if (b.exceptionId) ctx.exception = get(`SELECT * FROM exceptions WHERE id=?`, b.exceptionId);
  if (b.customerId) ctx.customer = get(`SELECT * FROM customers WHERE id=?`, b.customerId);
  const result = runAgent(a, ctx);
  const runId = 'RUN-' + Date.now();
  run(`INSERT INTO agent_runs (id,agent_id,ts,input,steps,output,status) VALUES (?,?,?,?,?,?,?)`,
    runId, a.id, new Date().toISOString(), JSON.stringify(b), JSON.stringify(result.steps), JSON.stringify(result.output), 'done');
  run(`UPDATE agents SET runs_today=runs_today+1, state=CASE WHEN state='idle' THEN 'active' ELSE state END WHERE id=?`, a.id);
  logActivity(a.module, a.id, 'act', `${a.name} run`, JSON.stringify(result.output).slice(0, 120));
  res.json({ runId, agent: { id: a.id, name: a.name, type: a.type }, ...result });
});

export default router;
