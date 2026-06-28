// roi.js — quantified benefit model per module, computed live from the AR book
// and configurable assumptions (settings category 'roi'). Lets clients measure ROI.
import { Router } from 'express';
import { all, get } from '../db.js';

const router = Router();
const S = (k, d) => { const r = get(`SELECT value FROM settings WHERE key=?`, k); if (!r) return d; try { return JSON.parse(r.value); } catch { return d; } };

function base() {
  const openInv = all(`SELECT aging_bucket b, SUM(open_amount) val FROM invoices WHERE status!='paid' GROUP BY aging_bucket`);
  const bmap = {}; let totalAR = 0; openInv.forEach(r => { bmap[r.b] = r.val || 0; totalAR += r.val || 0; });
  const current = bmap['current'] || 0, pastDue = totalAR - current, b90 = bmap['90+'] || 0;
  const dsoRow = get(`SELECT SUM(c.dso*i.bal) s, SUM(i.bal) t FROM customers c
    JOIN (SELECT customer_id, SUM(open_amount) bal FROM invoices WHERE status!='paid' GROUP BY customer_id) i ON i.customer_id=c.id`);
  const dso = dsoRow.t ? Math.round(dsoRow.s / dsoRow.t) : 60;
  const pay = get(`SELECT COUNT(*) total, SUM(amount) val,
    SUM(CASE WHEN status IN ('posted','matched') AND match_layer<=2 THEN 1 ELSE 0 END) auto,
    SUM(CASE WHEN status IN ('exception','unmatched') THEN amount ELSE 0 END) unapplied FROM payments`);
  const exc = get(`SELECT COUNT(*) n FROM exceptions WHERE status!='resolved'`).n;
  const disp = get(`SELECT COUNT(*) n, AVG(amount) avg, AVG(win_prob) win,
    SUM(CASE WHEN status IN ('open','investigating') THEN amount ELSE 0 END) openval FROM disputes`);
  const ded = get(`SELECT COUNT(*) n, AVG(amount) avg, SUM(amount) val,
    SUM(CASE WHEN validity='invalid' THEN 1 ELSE 0 END) invalid FROM deductions`);
  return { totalAR, current, pastDue, b90, dso, pay, exc, disp, ded };
}

router.get('/', (req, res) => {
  const b = base();
  const A = {
    analyst_cost: S('roi.analyst_cost', 95000), wacc: S('roi.wacc', 0.09), program_cost: S('roi.program_cost', 1200000),
    annual_payments: S('roi.annual_payments', 9000), annual_disputes: S('roi.annual_disputes', 420), annual_deductions: S('roi.annual_deductions', 1600),
    dispute_rate: S('roi.dispute_rate', 0.03), deduction_rate: S('roi.deduction_rate', 0.015),
    bad_debt_rate: S('roi.bad_debt_rate', 0.015), min_manual_match: S('roi.min_manual_match', 6),
    min_manual_dispute: S('roi.min_manual_dispute', 180), min_manual_deduction: S('roi.min_manual_deduction', 75),
    dso_target: S('general.dso_target', 50),
  };
  const hourly = A.analyst_cost / 2080;
  const r0 = (n) => Math.max(0, Math.round(n));
  // Derive annual revenue from the book: Revenue = AR / DSO × 365 (≈ matches Accuray scale)
  const annualRevenue = b.dso ? (b.totalAR / b.dso) * 365 : b.totalAR * 5;

  // ---- Cash Application ----
  const autoCur = b.pay.total ? b.pay.auto / b.pay.total : 0;
  const autoTgt = 0.85;
  const touchlessLabor = A.annual_payments * Math.max(0, autoTgt - autoCur) * (A.min_manual_match / 60) * hourly;
  const unappliedPct = b.pay.val ? b.pay.unapplied / b.pay.val : 0;
  const unappliedReduced = b.pay.unapplied * Math.max(0, (unappliedPct - 0.03) / (unappliedPct || 1));
  const unappliedCarry = unappliedReduced * A.wacc;
  const cashapp = {
    annual: r0(touchlessLabor + unappliedCarry),
    lines: [
      { label: 'Touchless cash posting (labor)', baseline: `${Math.round(autoCur * 100)}% auto-match`, accelerator: `${autoTgt * 100}% auto-match`, benefit: r0(touchlessLabor) },
      { label: 'Unapplied cash carrying cost', baseline: `${(unappliedPct * 100).toFixed(0)}% unapplied`, accelerator: '3% unapplied', benefit: r0(unappliedCarry) },
    ],
  };

  // ---- Collections ----
  const cashRelease = (b.totalAR / Math.max(b.dso, 1)) * Math.max(0, b.dso - A.dso_target);
  const wcCarry = cashRelease * A.wacc;
  const humanCollectors = get(`SELECT COUNT(*) n FROM collectors WHERE id NOT IN ('COLL-0','COLL-4')`).n || 3;
  const collectorProd = humanCollectors * 0.30 * A.analyst_cost;
  const baseWriteoff = b.totalAR * A.bad_debt_rate;
  const badDebtAvoided = baseWriteoff * 0.25;
  const collections = {
    annual: r0(wcCarry + collectorProd + badDebtAvoided),
    oneTime: r0(cashRelease), oneTimeLabel: 'Working capital released (one-time)',
    lines: [
      { label: 'Working-capital carrying cost', baseline: `DSO ${b.dso}d`, accelerator: `DSO ${A.dso_target}d`, benefit: r0(wcCarry) },
      { label: 'Collector productivity (+30%)', baseline: `${humanCollectors} FTE`, accelerator: `${humanCollectors} FTE + AI`, benefit: r0(collectorProd) },
      { label: 'Bad-debt write-off avoided', baseline: `${(A.bad_debt_rate * 100).toFixed(1)}% of AR`, accelerator: '−25%', benefit: r0(badDebtAvoided) },
    ],
  };

  // ---- Disputes ---- (recovery bounded to a realistic annual disputed-$ base)
  const disputedAnnual = annualRevenue * A.dispute_rate;
  const evLabor = A.annual_disputes * Math.max(0, (A.min_manual_dispute - 15) / 60) * hourly;
  const winRecovery = disputedAnnual * 0.15;                 // +15 pts win rate on disputed $
  const dispWC = (b.disp.openval || 0) * (3 / 365) * A.wacc; // 3 days faster on open disputed AR
  const dispute = {
    annual: r0(evLabor + winRecovery + dispWC),
    lines: [
      { label: 'Win-rate recovery (+15 pts)', baseline: `${Math.round((b.disp.win || 0) * 100)}% win`, accelerator: `+15 pts of ${(A.dispute_rate * 100).toFixed(1)}% rev disputed`, benefit: r0(winRecovery) },
      { label: 'Evidence assembly (labor)', baseline: `${A.min_manual_dispute} min/case`, accelerator: '<15 min', benefit: r0(evLabor) },
      { label: 'Faster resolution (working capital)', baseline: '15 days', accelerator: '12 days', benefit: r0(dispWC) },
    ],
  };

  // ---- Deductions ---- (recovery on the invalid share of a realistic deduction-$ base)
  const invalidShare = b.ded.n ? b.ded.invalid / b.ded.n : 0.3;
  const deductionAnnual = annualRevenue * A.deduction_rate;
  const netRecovery = deductionAnnual * invalidShare * 0.30; // +30% net recovery on invalid deductions
  const validationLabor = A.annual_deductions * 0.40 * Math.max(0, (A.min_manual_deduction - 5) / 60) * hourly;
  const deductions = {
    annual: r0(netRecovery + validationLabor),
    lines: [
      { label: 'Net recovery (+30%)', baseline: `${Math.round(invalidShare * 100)}% invalid of ${(A.deduction_rate * 100).toFixed(1)}% rev`, accelerator: '+30% recovered', benefit: r0(netRecovery) },
      { label: 'Auto-validation (labor)', baseline: '0% auto-validated', accelerator: '40%+ auto', benefit: r0(validationLabor) },
    ],
  };

  const annualBenefit = cashapp.annual + collections.annual + dispute.annual + deductions.annual;
  const roiMultiple = A.program_cost ? +(annualBenefit / A.program_cost).toFixed(2) : 0;
  const paybackMonths = annualBenefit ? Math.max(1, Math.round(A.program_cost / annualBenefit * 12)) : null;

  // assumption descriptors for the editable panels
  const assumptions = [
    { key: 'roi.analyst_cost', label: 'Loaded analyst cost', value: A.analyst_cost, kind: 'money' },
    { key: 'roi.wacc', label: 'Cost of capital (WACC)', value: A.wacc, kind: 'pct' },
    { key: 'roi.program_cost', label: 'Program cost', value: A.program_cost, kind: 'money' },
    { key: 'roi.annual_payments', label: 'Annual remittance volume', value: A.annual_payments, kind: 'num' },
    { key: 'roi.annual_disputes', label: 'Annual dispute volume', value: A.annual_disputes, kind: 'num' },
    { key: 'roi.annual_deductions', label: 'Annual deduction volume', value: A.annual_deductions, kind: 'num' },
    { key: 'roi.dispute_rate', label: 'Disputes (% of revenue)', value: A.dispute_rate, kind: 'pct' },
    { key: 'roi.deduction_rate', label: 'Deductions (% of revenue)', value: A.deduction_rate, kind: 'pct' },
    { key: 'roi.bad_debt_rate', label: 'Baseline write-off rate', value: A.bad_debt_rate, kind: 'pct' },
    { key: 'roi.min_manual_dispute', label: 'Manual evidence time (min)', value: A.min_manual_dispute, kind: 'num' },
    { key: 'roi.min_manual_deduction', label: 'Manual deduction research (min)', value: A.min_manual_deduction, kind: 'num' },
    { key: 'general.dso_target', label: 'Target DSO (days)', value: A.dso_target, kind: 'num' },
  ];

  res.json({
    modules: { cashapp, collections, dispute, deductions },
    totals: { annualBenefit, oneTimeCash: collections.oneTime, programCost: A.program_cost, roiMultiple, paybackMonths },
    assumptions,
  });
});

export default router;
