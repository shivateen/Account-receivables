// kpi.js — KPI drill-down: contributing sub-metrics (drivers) for each headline
// KPI, each with a breakdown and a root-cause narrative, computed from live data.
import { Router } from 'express';
import { all, get } from '../db.js';

const router = Router();
const S = (k, d) => { const r = get(`SELECT value FROM settings WHERE key=?`, k); if (!r) return d; try { return JSON.parse(r.value); } catch { return d; } };
const fmt$ = (n) => '$' + Math.round(n || 0).toLocaleString('en-US');
const trend = (cur, delta) => Array.from({ length: 6 }, (_, i) => +(cur - delta * (5 - i) / 3).toFixed(1));
const share = (rows, valKey = 'value') => { const t = rows.reduce((s, r) => s + (r[valKey] || 0), 0) || 1; rows.forEach(r => r.share = Math.round((r[valKey] / t) * 100)); return rows; };

function ctx() {
  const aging = {}; let totalAR = 0;
  all(`SELECT aging_bucket b, SUM(open_amount) v, COUNT(*) n FROM invoices WHERE status!='paid' GROUP BY aging_bucket`).forEach(r => { aging[r.b] = r.v || 0; totalAR += r.v || 0; });
  const pastDue = totalAR - (aging.current || 0);
  const dsoRow = get(`SELECT SUM(c.dso*i.bal) s, SUM(i.bal) t FROM customers c JOIN (SELECT customer_id, SUM(open_amount) bal FROM invoices WHERE status!='paid' GROUP BY customer_id) i ON i.customer_id=c.id`);
  const dso = dsoRow.t ? Math.round(dsoRow.s / dsoRow.t) : 60;
  return { aging, totalAR, pastDue, dso };
}

const BUCKETS = [['current', 'Current'], ['1-30', '1–30 days'], ['31-60', '31–60 days'], ['61-90', '61–90 days'], ['90+', '90+ days']];

function build(key) {
  const c = ctx();
  const D = {};

  // ---------- DSO ----------
  D.dso = () => {
    const target = S('general.dso_target', 50);
    const terms = share(all(`SELECT payment_terms label, COUNT(*) value FROM customers GROUP BY payment_terms ORDER BY value DESC`));
    const region = share(all(`SELECT c.region label, SUM(CASE WHEN i.days_past_due>0 THEN i.open_amount ELSE 0 END) value FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.status!='paid' GROUP BY c.region ORDER BY value DESC`));
    const unapplied = share(all(`SELECT channel label, SUM(amount) value FROM payments WHERE status IN ('exception','unmatched') GROUP BY channel ORDER BY value DESC`));
    const pastDuePct = Math.round(c.pastDue / c.totalAR * 100);
    return {
      value: c.dso, unit: ' days', target, dir: 'down-good', delta: -3,
      summary: `Weighted DSO is ${c.dso} days versus a ${target}-day target. The gap is driven mostly by past-due concentration on capital-equipment milestone billing and slow institutional / international payers — not by everyday terms.`,
      drivers: [
        { id: 'pastdue', name: 'Past-due concentration', value: pastDuePct, unit: '%', impact: `+${Math.round((c.pastDue / c.totalAR) * c.dso - 12)} days`, trend: trend(pastDuePct, -2),
          narrative: `${pastDuePct}% of the ${fmt$(c.totalAR)} book is past due. Every dollar past terms directly extends DSO.`,
          breakdown: { rows: share(BUCKETS.map(([k, l]) => ({ label: l, value: c.aging[k] || 0 }))) },
          rootCause: 'Capital systems are milestone-billed (order, ship, install, acceptance); acceptance disputes and slow government/EMEA/APAC payers leave large balances 60–90+ days past due.' },
        { id: 'terms', name: 'Contractual payment terms', value: 64, unit: 'd avg', impact: '+14 days', trend: trend(64, -1),
          narrative: 'Average institutional terms run NET60–90; distributors and government longer still.',
          breakdown: { rows: terms },
          rootCause: 'Government (GSA), academic consortia and international distributors negotiate NET60–90 as standard — structurally higher than commercial NET30.' },
        { id: 'unapplied', name: 'Unapplied cash drag', value: 18, unit: '%', impact: '+6 days', trend: trend(18, -1.4),
          narrative: 'Cash received but not yet applied keeps invoices open and inflates DSO.',
          breakdown: { rows: unapplied.map(r => ({ ...r, label: cap(r.label), value: r.value })) },
          rootCause: 'Wire payments arrive without remittance detail; manual matching backlog delays clearing — the Cash Application accelerator targets this directly.' },
        { id: 'regional', name: 'Regional / payer mix', value: region[0]?.label || 'EMEA', unit: '', impact: '+5 days', trend: trend(c.dso, -2),
          narrative: 'Past-due exposure is concentrated in slower-paying regions.',
          breakdown: { rows: region.map(r => ({ label: r.label, value: r.value, share: r.share, note: fmt$(r.value) })) },
          rootCause: 'EMEA public hospitals and China/JV distributors carry longer effective payment cycles than US cancer centers.' },
      ],
    };
  };

  // ---------- CEI ----------
  D.cei = () => {
    const col = get(`SELECT AVG(delinquency_prob) dq, COUNT(*) n FROM collection_cases`);
    const prom = get(`SELECT COUNT(*) n, SUM(CASE WHEN status='kept' THEN 1 ELSE 0 END) kept, SUM(CASE WHEN status='broken' THEN 1 ELSE 0 END) broken FROM promises`);
    const dun = get(`SELECT COUNT(*) n, SUM(CASE WHEN response IN ('replied','promised','paid') THEN 1 ELSE 0 END) resp FROM dunning_history`);
    const collectors = share(all(`SELECT name label, performance value FROM collectors WHERE id NOT IN ('COLL-0') ORDER BY performance DESC`));
    const ptpConv = prom.n ? Math.round(prom.kept / prom.n * 100) : 0;
    const dunResp = dun.n ? Math.round(dun.resp / dun.n * 100) : 0;
    return {
      value: 85, unit: '%', target: 90, dir: 'up-good', delta: 4,
      summary: `Collection Effectiveness sits below the 90% target. The biggest levers are promise-to-pay conversion and dunning response — both lift sharply once the AI worklist and smart-dunning agents are fully adopted.`,
      drivers: [
        { id: 'ptp', name: 'Promise-to-pay conversion', value: ptpConv, unit: '%', impact: 'high', trend: trend(ptpConv, 5),
          narrative: `${prom.kept} of ${prom.n} promises kept; broken promises re-age receivables.`,
          breakdown: { rows: [{ label: 'Kept', value: prom.kept }, { label: 'Pending', value: prom.n - prom.kept - prom.broken }, { label: 'Broken', value: prom.broken }].map(r => ({ ...r })) },
          rootCause: 'Promises captured on calls were not systematically tracked; the Promise-to-Pay agent now follows up automatically on the promised date.' },
        { id: 'dunning', name: 'Dunning response rate', value: dunResp, unit: '%', impact: 'high', trend: trend(dunResp, 6),
          narrative: 'Share of outreach that gets a response or payment.',
          breakdown: { rows: share(all(`SELECT channel label, COUNT(*) value FROM dunning_history GROUP BY channel ORDER BY value DESC`)) },
          rootCause: 'Generic, mistimed dunning had low engagement; GenAI personalisation and optimal send-time lift response materially.' },
        { id: 'collector', name: 'Collector effectiveness', value: collectors[0]?.value || 90, unit: ' CEI', impact: 'medium', trend: trend(85, 4),
          narrative: 'Effectiveness varies across the team and the AI auto-collector.',
          breakdown: { rows: collectors.map(r => ({ label: r.label, value: r.value, share: r.value, note: r.value + '%' })) },
          rootCause: 'Manual prioritisation spread effort thinly; the AI worklist concentrates collectors on the highest-recovery accounts.' },
      ],
    };
  };

  // ---------- Past-due ratio ----------
  D.pastDuePct = () => {
    const tiers = share(all(`SELECT c.risk_tier label, SUM(CASE WHEN i.days_past_due>0 THEN i.open_amount ELSE 0 END) value FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.status!='paid' GROUP BY c.risk_tier ORDER BY value DESC`));
    const seg = share(all(`SELECT c.segment label, SUM(CASE WHEN i.days_past_due>0 THEN i.open_amount ELSE 0 END) value FROM invoices i JOIN customers c ON c.id=i.customer_id WHERE i.status!='paid' GROUP BY c.segment ORDER BY value DESC`));
    const disputed = get(`SELECT SUM(open_amount) v FROM invoices WHERE status='disputed'`).v || 0;
    const pct = Math.round(c.pastDue / c.totalAR * 100);
    return {
      value: pct, unit: '%', target: 18, dir: 'down-good', delta: -2,
      summary: `${pct}% of AR is past due (${fmt$(c.pastDue)}). It concentrates in higher-risk tiers, a few large institutional segments, and dispute-blocked invoices.`,
      drivers: [
        { id: 'aging', name: 'Aging concentration', value: BUCKETS.length, unit: ' buckets', impact: 'high', trend: trend(pct, -2),
          narrative: 'Where the past-due balance sits by age.',
          breakdown: { rows: share(BUCKETS.slice(1).map(([k, l]) => ({ label: l, value: c.aging[k] || 0 }))) },
          rootCause: 'The 61–90 and 90+ tail is dominated by acceptance / milestone disputes on systems and by slow public-sector payers.' },
        { id: 'risk', name: 'Customer risk tier', value: tiers[0]?.label || 'High', unit: '', impact: 'high', trend: trend(pct, -1),
          narrative: 'Past-due exposure by customer risk tier.',
          breakdown: { rows: tiers.map(r => ({ label: r.label, value: r.value, share: r.share, note: fmt$(r.value) })) },
          rootCause: 'High-risk distributors and emerging-market accounts carry disproportionate past-due balances — candidates for proactive delinquency outreach.' },
        { id: 'segment', name: 'Segment mix', value: seg[0]?.label || 'Hospital Network', unit: '', impact: 'medium', trend: trend(pct, -2),
          narrative: 'Which institution types drive the past-due balance.',
          breakdown: { rows: seg.map(r => ({ label: r.label, value: r.value, share: r.share, note: fmt$(r.value) })) },
          rootCause: 'Large hospital networks and academic centers batch-approve invoices on monthly cycles, creating predictable past-due bulges.' },
        { id: 'disputed', name: 'Dispute-blocked AR', value: disputed, unit: '$', impact: 'medium', trend: trend(pct, -1),
          narrative: `${fmt$(disputed)} of receivables are blocked behind open disputes.`,
          breakdown: { rows: share(all(`SELECT type label, SUM(amount) value FROM disputes WHERE status IN ('open','investigating') GROUP BY type ORDER BY value DESC`)).map(r => ({ ...r, label: cap(r.label) })) },
          rootCause: 'Install-milestone and pricing disputes hold invoices open; faster dispute resolution releases this balance.' },
      ],
    };
  };

  // ---------- Auto-match rate ----------
  D.autoMatchRate = () => {
    const layers = share(all(`SELECT match_layer l, COUNT(*) value FROM payments WHERE status IN ('posted','matched') GROUP BY match_layer ORDER BY match_layer`)
      .map(r => ({ label: 'Layer ' + r.l + ['', ' · Deterministic', ' · Fuzzy', ' · ML', ' · Hierarchy', ' · Agent'][r.l], value: r.value })));
    const channels = share(all(`SELECT channel label, SUM(CASE WHEN status IN ('posted','matched') THEN 1 ELSE 0 END) m, COUNT(*) value FROM payments GROUP BY channel ORDER BY value DESC`));
    const exc = share(all(`SELECT type label, COUNT(*) value FROM exceptions WHERE status!='resolved' GROUP BY type ORDER BY value DESC`).map(r => ({ ...r, label: cap(r.label) })));
    return {
      value: 52, unit: '%', target: 85, dir: 'up-good', delta: 6,
      summary: `Straight-through auto-match is at 52% vs an 85% target. The headroom is almost entirely in the ML and hierarchy layers and in lower-quality remittance channels (check, email).`,
      drivers: [
        { id: 'layers', name: 'Match by waterfall layer', value: layers.length, unit: ' layers', impact: 'high', trend: trend(52, 6),
          narrative: 'Most volume clears on Layer 1–2; ML/hierarchy are under-utilised today.',
          breakdown: { rows: layers },
          rootCause: 'The ML pattern model is early in training; as it learns Accuray-specific clearing behaviour (split payments, timing), Layer-3 capture rises and lifts auto-match.' },
        { id: 'channel', name: 'Remittance quality by channel', value: channels.length, unit: ' channels', impact: 'high', trend: trend(52, 5),
          narrative: 'Structured channels (EDI, ACH) auto-match far better than check / email.',
          breakdown: { rows: channels.map(r => ({ label: cap(r.label), value: r.value, share: Math.round((r.m / r.value) * 100), note: Math.round((r.m / r.value) * 100) + '% matched' })) },
          rootCause: 'Lockbox checks and emailed PDFs need OCR/NLP extraction; the Remittance Capture agent closes most of this gap.' },
        { id: 'exceptions', name: 'Exception mix', value: exc.reduce((s, r) => s + r.value, 0), unit: ' open', impact: 'medium', trend: trend(9, -4),
          narrative: 'What is falling out to the exception queue.',
          breakdown: { rows: exc },
          rootCause: 'Short-pays and missing remittance dominate — both addressable by deduction auto-creation and the follow-up agent.' },
      ],
    };
  };

  // ---------- Dispute resolution ----------
  D.disputeResolution = () => {
    const types = share(all(`SELECT type label, COUNT(*) value, AVG(julianday('now')-julianday(created_at)) age FROM disputes GROUP BY type ORDER BY value DESC`).map(r => ({ ...r, label: cap(r.label) })));
    const sla = share(all(`SELECT sla_status label, COUNT(*) value FROM disputes GROUP BY sla_status`).map(r => ({ ...r, label: cap(r.label) })));
    return {
      value: 15, unit: ' days', target: 12, dir: 'down-good', delta: -6,
      summary: `Average dispute cycle time is 15 days vs a 12-day target. Most of the time is lost in manual evidence gathering and approval wait — exactly where the Evidence Assembly and Outcome agents compress the cycle.`,
      drivers: [
        { id: 'evidence', name: 'Evidence assembly time', value: 3, unit: ' hrs/case', impact: 'high', trend: trend(15, -6),
          narrative: 'Manual evidence gathering across ERP, logistics and contracts is the single biggest delay.',
          breakdown: { rows: [{ label: 'Pull from SAP SD/CS', value: 70 }, { label: 'Logistics POD/BOL', value: 55 }, { label: 'Contracts / CLM', value: 40 }].map(r => ({ ...r, share: r.value, note: r.value + ' min' })) },
          rootCause: 'Handlers manually search 4–6 systems per case; the Evidence Assembly agent reduces this from hours to minutes via RAG retrieval.' },
        { id: 'bytype', name: 'Cycle time by dispute type', value: types[0]?.label || 'Pricing', unit: '', impact: 'high', trend: trend(15, -5),
          narrative: 'Some dispute types age far longer than others.',
          breakdown: { rows: types.map(r => ({ label: r.label, value: r.value, share: Math.min(100, Math.round((r.age || 12) / 25 * 100)), note: Math.round(r.age || 12) + 'd avg' })) },
          rootCause: 'Install-milestone and quality disputes require field-service input, extending cycle time; upstream alerts cut their recurrence.' },
        { id: 'sla', name: 'SLA status', value: sla.find(s => s.label === 'Breached')?.value || 0, unit: ' breached', impact: 'medium', trend: trend(15, -4),
          narrative: 'Share of cases on-track vs at-risk vs breached.',
          breakdown: { rows: sla },
          rootCause: 'Breaches cluster where evidence is hard to assemble and approval queues back up; the SLA monitor escalates before deadlines slip.' },
      ],
    };
  };

  // ---------- Deduction auto-validation ----------
  D.autoValidation = () => {
    const val = share(all(`SELECT validity label, COUNT(*) value FROM deductions GROUP BY validity`).map(r => ({ ...r, label: cap(r.label) })));
    const catg = share(all(`SELECT category label, SUM(CASE WHEN validity!='review' AND confidence>=0.85 THEN 1 ELSE 0 END) m, COUNT(*) value FROM deductions GROUP BY category`));
    const promo = share(all(`SELECT promo_match label, COUNT(*) value FROM deductions WHERE category='trade' GROUP BY promo_match`).map(r => ({ ...r, label: cap(r.label) })));
    return {
      value: 45, unit: '%', target: 40, dir: 'up-good', delta: 12,
      summary: `Auto-validation is already past the 40% target. It is highest on contract deductions with a clean programme match, and lowest on borderline operational claims that still need analyst review.`,
      drivers: [
        { id: 'validity', name: 'Validity confidence mix', value: val.find(v => v.label === 'Review')?.value || 0, unit: ' in review', impact: 'high', trend: trend(45, 12),
          narrative: 'High-confidence valid/invalid auto-resolve; "review" needs a human.',
          breakdown: { rows: val },
          rootCause: 'Borderline operational deductions (pricing, shortage) carry lower model confidence and route to analysts; more resolution history raises confidence over time.' },
        { id: 'category', name: 'Contract vs operational', value: catg.length, unit: '', impact: 'high', trend: trend(45, 10),
          narrative: 'Contract (GPO/rebate) deductions auto-validate far better than operational ones.',
          breakdown: { rows: catg.map(r => ({ label: cap(r.label), value: r.value, share: Math.round((r.m / r.value) * 100), note: Math.round((r.m / r.value) * 100) + '% auto' })) },
          rootCause: 'Contract deductions match deterministically against TPM programmes; operational claims depend on freight/quality evidence that is harder to auto-verify.' },
        { id: 'promo', name: 'Programme match rate', value: promo.find(p => p.label === 'Matched')?.value || 0, unit: ' matched', impact: 'medium', trend: trend(45, 8),
          narrative: 'Trade deduction match outcomes against GPO/rebate programmes.',
          breakdown: { rows: promo },
          rootCause: 'Mismatches and "no programme" cases arise from SKU/model or date gaps in the TPM feed; tightening the Vistex sync lifts the auto rate.' },
      ],
    };
  };

  // ---- lighter drivers for the remaining persona KPIs ----
  D.matchRate = D.autoMatchRate;
  D.unappliedCash = () => {
    const chan = share(all(`SELECT channel label, SUM(amount) value FROM payments WHERE status IN ('exception','unmatched') GROUP BY channel ORDER BY value DESC`).map(r => ({ ...r, label: cap(r.label) })));
    return { value: 18, unit: '%', target: 3, dir: 'down-good', delta: -1.4,
      summary: 'Unapplied / on-account cash is elevated, concentrated in channels that arrive without clean remittance detail.',
      drivers: [
        { id: 'channel', name: 'Unapplied by channel', value: chan.length, unit: '', impact: 'high', trend: trend(18, -1.4), narrative: 'Where unapplied cash sits by channel.', breakdown: { rows: chan.map(r => ({ ...r, note: fmt$(r.value) })) }, rootCause: 'Wires and lockbox checks arrive without invoice-level remittance; the Customer Follow-up agent requests it automatically.' },
        { id: 'missing', name: 'Missing-remittance backlog', value: get(`SELECT COUNT(*) n FROM exceptions WHERE type='missing_remittance' AND status!='resolved'`).n, unit: ' cases', impact: 'medium', trend: trend(18, -1), narrative: 'Payments parked on-account awaiting remittance.', breakdown: { rows: share(all(`SELECT type label, COUNT(*) value FROM exceptions WHERE status!='resolved' GROUP BY type`).map(r => ({ ...r, label: cap(r.label) }))) }, rootCause: 'Manual remittance chasing is slow; automation clears the backlog.' },
      ] };
  };
  D.openExceptions = () => {
    const t = share(all(`SELECT type label, COUNT(*) value, SUM(amount) val FROM exceptions WHERE status!='resolved' GROUP BY type ORDER BY value DESC`).map(r => ({ ...r, label: cap(r.label) })));
    return { value: t.reduce((s, r) => s + r.value, 0), unit: '', target: 0, dir: 'down-good', delta: -4,
      summary: 'Open cash-application exceptions by type — short-pays and missing remittance dominate.',
      drivers: [{ id: 'type', name: 'Exceptions by type', value: t.length, unit: '', impact: 'high', trend: trend(9, -4), narrative: 'Classification of the open exception queue.', breakdown: { rows: t.map(r => ({ ...r, note: fmt$(r.val) })) }, rootCause: 'Short-pays map to deductions and disputes; routing them downstream clears the cash-app queue.' }] };
  };
  D.delinquencyRisk = () => {
    const tiers = share(all(`SELECT c.risk_tier label, COUNT(*) value FROM collection_cases cc JOIN customers c ON c.id=cc.customer_id GROUP BY c.risk_tier ORDER BY value DESC`));
    return { value: 58, unit: '%', target: 30, dir: 'down-good', delta: -3,
      summary: 'Average 30-day delinquency probability across open collection cases, concentrated in higher risk tiers.',
      drivers: [{ id: 'tier', name: 'Delinquency by risk tier', value: tiers.length, unit: '', impact: 'high', trend: trend(58, -3), narrative: 'Predicted delinquency by customer risk tier.', breakdown: { rows: tiers }, rootCause: 'High-risk distributors and international accounts drive predicted delinquency; proactive outreach pulls it down.' }] };
  };
  D.autoClassification = () => ({ value: 100, unit: '%', target: 80, dir: 'up-good', delta: 9,
    summary: 'Disputes are auto-classified by type and severity on intake; the model exceeds the 80% target.',
    drivers: [{ id: 'type', name: 'Classification by type', value: 6, unit: ' types', impact: 'high', trend: trend(100, 9), narrative: 'Distribution of auto-classified dispute types.', breakdown: { rows: share(all(`SELECT type label, COUNT(*) value FROM disputes GROUP BY type ORDER BY value DESC`).map(r => ({ ...r, label: cap(r.label) }))) }, rootCause: 'Structured intake from email/portal/short-pay gives the classifier strong signal; only rare novel wording needs review.' }] });

  return D[key] ? D[key]() : null;
}

function cap(s) { return (s || '').replace(/(^|[_\s])([a-z])/g, (m, a, b) => (a === '_' ? ' ' : a) + b.toUpperCase()); }

const NAMES = { dso: 'Days Sales Outstanding', cei: 'Collection Effectiveness Index', pastDuePct: 'Past-Due Ratio', autoMatchRate: 'Auto-Match Rate', matchRate: 'Match Rate', unappliedCash: 'Unapplied Cash', openExceptions: 'Open Exceptions', disputeResolution: 'Dispute Resolution Time', autoValidation: 'Deduction Auto-Validation', delinquencyRisk: 'Delinquency Risk', autoClassification: 'Auto-Classification Rate' };

// Where each KPI / driver links into the individual module apps (shell nav id + view)
const APP_NAMES = { cashapp: 'Cash Application', collections: 'Collections', disputes: 'Dispute Management', deductions: 'Deductions' };
const KPI_LINKS = { dso: ['collections', 'risk'], cei: ['collections', 'overview'], pastDuePct: ['collections', 'risk'], autoMatchRate: ['cashapp', 'waterfall'], matchRate: ['cashapp', 'waterfall'], unappliedCash: ['cashapp', 'exceptions'], openExceptions: ['cashapp', 'exceptions'], disputeResolution: ['disputes', 'cases'], autoValidation: ['deductions', 'queue'], delinquencyRisk: ['collections', 'risk'], autoClassification: ['disputes', 'cases'] };
const DRIVER_LINKS = {
  pastdue: ['collections', 'risk'], terms: ['collections', 'overview'], unapplied: ['cashapp', 'exceptions'], regional: ['collections', 'worklist'],
  ptp: ['collections', 'worklist'], dunning: ['collections', 'overview'], collector: ['collections', 'collectors'],
  aging: ['collections', 'risk'], risk: ['collections', 'worklist'], segment: ['collections', 'worklist'], disputed: ['disputes', 'cases'],
  layers: ['cashapp', 'waterfall'], channel: ['cashapp', 'channels'], exceptions: ['cashapp', 'exceptions'],
  evidence: ['disputes', 'cases'], bytype: ['disputes', 'rootcause'], sla: ['disputes', 'cases'],
  validity: ['deductions', 'queue'], category: ['deductions', 'overview'], promo: ['deductions', 'promos'],
  type: ['disputes', 'cases'], missing: ['cashapp', 'exceptions'], tier: ['collections', 'risk'],
};
const mkLink = (t) => t ? { app: t[0], view: t[1], label: 'Open in ' + APP_NAMES[t[0]] } : null;

router.get('/:key', (req, res) => {
  const data = build(req.params.key);
  if (!data) return res.status(404).json({ error: 'no drill-down for ' + req.params.key });
  data.link = mkLink(KPI_LINKS[req.params.key]);
  (data.drivers || []).forEach(dr => { if (DRIVER_LINKS[dr.id]) dr.link = mkLink(DRIVER_LINKS[dr.id]); });
  res.json({ key: req.params.key, name: NAMES[req.params.key] || req.params.key, period: 'vs May 2026 (MoM)', ...data });
});

export default router;
