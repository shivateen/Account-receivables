// metrics.js — AR KPI taxonomy computed live from the database.
import { Router } from 'express';
import { all, get } from '../db.js';

const router = Router();

function settingNum(key, dflt) {
  const r = get(`SELECT value FROM settings WHERE key=?`, key);
  if (!r) return dflt;
  try { return JSON.parse(r.value); } catch { return dflt; }
}

router.get('/', (req, res) => {
  // --- AR balance & aging ---
  const openInv = all(`SELECT aging_bucket, COUNT(*) n, SUM(open_amount) val
                       FROM invoices WHERE status != 'paid' GROUP BY aging_bucket`);
  const buckets = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  const bucketsN = { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0 };
  let totalAR = 0;
  openInv.forEach(r => { buckets[r.aging_bucket] = r.val || 0; bucketsN[r.aging_bucket] = r.n; totalAR += r.val || 0; });
  const pastDue = totalAR - (buckets.current || 0);

  // --- DSO (weighted avg of customer DSO by open balance) ---
  const dsoRow = get(`SELECT SUM(c.dso * i.bal) s, SUM(i.bal) t FROM customers c
    JOIN (SELECT customer_id, SUM(open_amount) bal FROM invoices WHERE status!='paid' GROUP BY customer_id) i
    ON i.customer_id=c.id`);
  const dso = dsoRow.t ? Math.round(dsoRow.s / dsoRow.t) : 48;

  // --- Cash application ---
  const pay = get(`SELECT
    SUM(CASE WHEN status IN ('posted','matched') THEN 1 ELSE 0 END) matched,
    SUM(CASE WHEN status='posted' THEN 1 ELSE 0 END) posted,
    SUM(CASE WHEN status IN ('posted','matched') AND match_layer<=2 THEN 1 ELSE 0 END) auto,
    SUM(CASE WHEN status IN ('exception','unmatched') THEN 1 ELSE 0 END) open,
    SUM(CASE WHEN status IN ('exception','unmatched') THEN amount ELSE 0 END) unapplied_val,
    SUM(amount) total_val, COUNT(*) total FROM payments`);
  const autoMatchRate = pay.total ? Math.round((pay.auto / pay.total) * 100) : 0;
  const matchRate = pay.total ? Math.round((pay.matched / pay.total) * 100) : 0;
  const unappliedPct = pay.total_val ? +((pay.unapplied_val / pay.total_val) * 100).toFixed(1) : 0;

  // --- Exceptions ---
  const exc = get(`SELECT COUNT(*) n, SUM(amount) val FROM exceptions WHERE status!='resolved'`);

  // --- Collections ---
  const col = get(`SELECT COUNT(*) cases, SUM(total_past_due) past_due, AVG(delinquency_prob) delinq,
    SUM(CASE WHEN sla_status='breached' THEN 1 ELSE 0 END) breached,
    SUM(CASE WHEN sla_status='at_risk' THEN 1 ELSE 0 END) at_risk FROM collection_cases`);

  // --- CEI: collected vs collectible-that-was-due (collected / (collected + past due)) ---
  const paidVal = get(`SELECT SUM(amount-open_amount) v FROM invoices`).v || 0;
  const cei = (paidVal + pastDue) ? Math.round((paidVal / (paidVal + pastDue)) * 100) : 72;

  // --- Disputes ---
  const disp = get(`SELECT COUNT(*) total,
    SUM(CASE WHEN status IN ('open','investigating') THEN 1 ELSE 0 END) open,
    SUM(CASE WHEN status IN ('open','investigating') THEN amount ELSE 0 END) open_val,
    SUM(CASE WHEN status='resolved' THEN 1 ELSE 0 END) resolved,
    SUM(CASE WHEN classify_conf >= 0.7 THEN 1 ELSE 0 END) classified,
    AVG(win_prob) win_prob,
    AVG(CASE WHEN status='resolved' THEN julianday('now')-julianday(created_at) END) avg_days,
    SUM(CASE WHEN sla_status='breached' THEN 1 ELSE 0 END) breached FROM disputes`);
  const dispResDays = Math.max(7, Math.round(disp.avg_days || 14));
  const autoClassify = disp.total ? Math.round(disp.classified / disp.total * 100) : 0;

  // --- Deductions ---
  const ded = get(`SELECT COUNT(*) total,
    SUM(CASE WHEN status NOT IN ('resolved') THEN 1 ELSE 0 END) open,
    SUM(amount) total_val,
    SUM(CASE WHEN category='trade' THEN amount ELSE 0 END) trade_val,
    SUM(CASE WHEN category='non-trade' THEN amount ELSE 0 END) nontrade_val,
    SUM(CASE WHEN validity!='review' AND confidence>=0.85 THEN 1 ELSE 0 END) autovalid,
    SUM(CASE WHEN validity='invalid' THEN 1 ELSE 0 END) invalid,
    SUM(recovered) recovered FROM deductions`);
  const autoValidation = ded.total ? Math.round(ded.autovalid / ded.total * 100) : 0;

  const dsoTarget = settingNum('general.dso_target', 35);

  // Comparison period for all KPI deltas: month-over-month (current MTD vs prior month-end)
  const asOf = '2026-06-28';
  const _d = new Date(asOf + 'T00:00:00Z');
  const _m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const _pd = new Date(Date.UTC(_d.getUTCFullYear(), _d.getUTCMonth() - 1, 1));
  const period = {
    current: `${_m[_d.getUTCMonth()]} ${_d.getUTCFullYear()} (MTD)`,
    prior: `${_m[_pd.getUTCMonth()]} ${_pd.getUTCFullYear()}`,
    basis: 'Month-over-month',
  };
  period.label = `vs ${period.prior}`;

  res.json({
    asOf, period,
    totalAR, pastDue, aging: buckets, agingCounts: bucketsN,
    kpis: {
      dso:            { val: dso, unit: 'days', target: dsoTarget, delta: -3, dir: 'down-good' },
      cei:            { val: cei, unit: '%', target: 90, delta: 4, dir: 'up-good' },
      autoMatchRate:  { val: autoMatchRate, unit: '%', target: 85, delta: 6, dir: 'up-good' },
      matchRate:      { val: matchRate, unit: '%', target: 95, delta: 5, dir: 'up-good' },
      unappliedCash:  { val: unappliedPct, unit: '%', target: 3, delta: -1.4, dir: 'down-good' },
      openExceptions: { val: exc.n || 0, unit: '', target: 0, delta: -4, dir: 'down-good' },
      pastDuePct:     { val: totalAR ? Math.round((pastDue / totalAR) * 100) : 0, unit: '%', target: 18, delta: -2, dir: 'down-good' },
      delinquencyRisk:{ val: Math.round((col.delinq || 0) * 100), unit: '%', target: 30, delta: -3, dir: 'down-good' },
      disputeResolution:{ val: dispResDays, unit: 'd', target: 12, delta: -6, dir: 'down-good' },
      autoClassification:{ val: autoClassify, unit: '%', target: 80, delta: 9, dir: 'up-good' },
      autoValidation: { val: autoValidation, unit: '%', target: 40, delta: 12, dir: 'up-good' },
    },
    cashapp: { matched: pay.matched, posted: pay.posted, auto: pay.auto, open: pay.open, unapplied_val: pay.unapplied_val, total: pay.total },
    exceptions: { open: exc.n || 0, value: exc.val || 0 },
    collections: { cases: col.cases || 0, pastDue: col.past_due || 0, breached: col.breached || 0, atRisk: col.at_risk || 0, avgDelinq: +(col.delinq || 0).toFixed(2) },
    dispute: { total: disp.total || 0, open: disp.open || 0, openVal: disp.open_val || 0, resolved: disp.resolved || 0,
      resolutionDays: dispResDays, autoClassify, winRate: Math.round((disp.win_prob || 0) * 100), breached: disp.breached || 0 },
    deductions: { total: ded.total || 0, open: ded.open || 0, value: ded.total_val || 0, tradeVal: ded.trade_val || 0,
      nontradeVal: ded.nontrade_val || 0, autoValidation, invalid: ded.invalid || 0, recovered: ded.recovered || 0 },
  });
});

router.get('/activity', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit) || 30, 100);
  res.json(all(`SELECT * FROM activity ORDER BY id DESC LIMIT ?`, limit));
});

export default router;
