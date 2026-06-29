// ---------------------------------------------------------------------------
// seed.js — deterministic synthetic AR data for the accelerator demo.
// Idempotent: clears and re-inserts. Anchored to a fixed "today" for stability.
// Run directly:  node server/seed.js
// ---------------------------------------------------------------------------
import { db, initSchema, run } from './db.js';
import { AGENT_CATALOG } from './agents.js';

const NOW = new Date('2026-06-28T09:00:00Z');
const iso = (d) => d.toISOString();
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000);
const daysAhead = (n) => new Date(NOW.getTime() + n * 86400000);
const fmtDate = (d) => d.toISOString().slice(0, 10);

// Deterministic PRNG (mulberry32) so the demo data never shifts between runs.
let _s = 0x9e3779b9;
function rnd() { _s |= 0; _s = (_s + 0x6D2B79F5) | 0; let t = Math.imul(_s ^ (_s >>> 15), 1 | _s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ri = (lo, hi) => Math.floor(rnd() * (hi - lo + 1)) + lo;
const rf = (lo, hi, dp = 2) => +(rnd() * (hi - lo) + lo).toFixed(dp);
const id = (p, n) => `${p}-${String(n).padStart(4, '0')}`;
const money = (lo, hi) => +(rnd() * (hi - lo) + lo).toFixed(2);

// ---------------------------------------------------------------------------
// Accuray (ARAY) customer base — radiation-oncology capital equipment buyers:
// cancer centers, academic medical centers, health systems, government, distributors.
// [name, segment, industry, region, riskTier, portal]
const CUSTOMERS = [
  ['MD Anderson Cancer Center',         'Cancer Center',          'Radiation Oncology', 'Americas', 'Low',    'GHX'],
  ['Memorial Sloan Kettering',          'Cancer Center',          'Radiation Oncology', 'Americas', 'Low',    'GHX'],
  ['Mayo Clinic',                       'Academic Medical Center','Academic / Research','Americas', 'Low',    'Vizient'],
  ['Cleveland Clinic',                  'Health System',          'Oncology Network',   'Americas', 'Low',    'Vizient'],
  ['Johns Hopkins Medicine',            'Academic Medical Center','Academic / Research','Americas', 'Low',    'GHX'],
  ['Kaiser Permanente',                 'Health System',          'Integrated Health',  'Americas', 'Medium', 'Premier'],
  ['HCA Healthcare',                    'Hospital Network',       'Hospital Network',   'Americas', 'Medium', 'GHX'],
  ['US Dept of Veterans Affairs',       'Government',             'Government Health',  'Americas', 'Low',    'none'],
  ['Dana-Farber Cancer Institute',      'Cancer Center',          'Radiation Oncology', 'Americas', 'Low',    'Vizient'],
  ['City of Hope',                      'Cancer Center',          'Radiation Oncology', 'Americas', 'Medium', 'GHX'],
  ['Charité Berlin',                    'Academic Medical Center','Academic / Research','EMEA',     'Low',    'none'],
  ['Royal Marsden NHS Trust',           'Cancer Center',          'Radiation Oncology', 'EMEA',     'Medium', 'none'],
  ['Gustave Roussy',                    'Cancer Center',          'Radiation Oncology', 'EMEA',     'Medium', 'none'],
  ['Karolinska University Hospital',    'Academic Medical Center','Academic / Research','EMEA',     'Low',    'none'],
  ['Istituto Europeo di Oncologia',     'Cancer Center',          'Radiation Oncology', 'EMEA',     'Medium', 'none'],
  ['Hospital Universitario La Paz',     'Hospital Network',       'Hospital Network',   'EMEA',     'High',   'none'],
  ['National Cancer Center Japan',      'Cancer Center',          'Radiation Oncology', 'Japan',    'Low',    'none'],
  ['Chiyoda Medical (Japan Distributor)','Distributor',           'Distribution',       'Japan',    'Medium', 'none'],
  ['Apollo Hospitals',                  'Hospital Network',       'Hospital Network',   'APAC',     'High',   'none'],
  ['Samsung Medical Center',            'Academic Medical Center','Academic / Research','APAC',     'Medium', 'none'],
  ['National University Hospital SG',   'Hospital Network',       'Hospital Network',   'APAC',     'Medium', 'none'],
  ['CNNC Accuray (China JV)',           'Distributor',            'Distribution',       'China',    'High',   'none'],
  ['Peking Union Medical College Hosp', 'Academic Medical Center','Academic / Research','China',    'High',   'none'],
  ['Fudan University Cancer Center',    'Cancer Center',          'Radiation Oncology', 'China',    'High',   'none'],
];
// Larger institutions carry bigger credit lines / capital orders
const LARGE = new Set(['Academic Medical Center', 'Health System', 'Hospital Network', 'Government']);
const CC = { Americas: '1000', EMEA: '2000', APAC: '3000', Japan: '4000', China: '5000' };

// Accuray product lines [name, lo, hi, weight] — systems are rare but huge; service/parts frequent
const PRODUCTS = [
  ['CyberKnife S7 System',     3500000, 6200000, 0.06],
  ['Radixact X9 System',       2800000, 5000000, 0.07],
  ['TomoTherapy System',       1500000, 3000000, 0.05],
  ['Software & Upgrades',       200000, 1200000, 0.14],
  ['Installation & Training',    80000,  420000, 0.10],
  ['Service Contract',          150000,  900000, 0.32],
  ['Parts & Accessories',         5000,  160000, 0.26],
];
function pickProduct() { let r = rnd(); for (const p of PRODUCTS) { r -= p[3]; if (r <= 0) return p; } return PRODUCTS[PRODUCTS.length - 1]; }

const TERMS = ['NET45', 'NET60', 'NET90', 'NET30'];
const FIRST = ['James', 'Maria', 'David', 'Priya', 'Chen', 'Sarah', 'Omar', 'Elena', 'Tom', 'Aisha', 'Luis', 'Nina'];
const LAST = ['Carter', 'Nguyen', 'Patel', 'OBrien', 'Rossi', 'Khan', 'Mueller', 'Garcia', 'Lee', 'Novak', 'Reyes', 'Abbas'];

function agingBucket(dpd) {
  if (dpd <= 0) return 'current';
  if (dpd <= 30) return '1-30';
  if (dpd <= 60) return '31-60';
  if (dpd <= 90) return '61-90';
  return '90+';
}

function seed() {
  initSchema();
  _s = 0x9e3779b9; // reset PRNG so every (re)seed yields identical, deterministic data
  // Clear (children first)
  for (const t of ['agent_runs', 'activity', 'dispute_evidence', 'disputes', 'deductions', 'trade_promotions',
                   'dunning_history', 'promises', 'call_logs',
                   'exceptions', 'matches', 'payments', 'collection_cases', 'invoices',
                   'agents', 'collectors', 'customers', 'settings']) {
    try { run(`DELETE FROM ${t}`); } catch {}
  }

  const insCust = db.prepare(`INSERT INTO customers
    (id,name,sap_id,segment,industry,region,risk_tier,risk_score,credit_limit,credit_used,payment_terms,dso,contact_name,contact_email,portal,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insInv = db.prepare(`INSERT INTO invoices
    (id,doc_number,customer_id,amount,open_amount,currency,issue_date,due_date,status,aging_bucket,days_past_due,company_code,business_area,po_number)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);

  const custIds = [];
  const invByCust = {};
  CUSTOMERS.forEach((c, i) => {
    const [name, segment, industry, region, riskTier, portal] = c;
    const cid = id('CUST', i + 1);
    custIds.push(cid);
    const riskScore = { Low: ri(8, 28), Medium: ri(30, 58), High: ri(60, 82), Critical: ri(83, 96) }[riskTier];
    const creditLimit = LARGE.has(segment) ? ri(20, 90) * 1e6 : ri(6, 30) * 1e6;
    const dso = ri(74, 99); // Accuray-scale: capital-equipment + international → high DSO (~85 wtd)
    const fn = pick(FIRST), ln = pick(LAST);
    const terms = pick(TERMS);
    insCust.run(cid, name, `0001${String(100000 + i)}`, segment, industry, region, riskTier, riskScore,
      creditLimit, +(creditLimit * rf(0.25, 0.78)).toFixed(0), terms, dso,
      `${fn} ${ln}`, `${fn.toLowerCase()}.${ln.toLowerCase()}@${name.split(/[ .]/)[0].toLowerCase()}.com`,
      portal, iso(daysAgo(ri(400, 1400))));

    // Invoices — more per account to reach Accuray-scale AR (~$105M open book)
    const nInv = ri(6, 13);
    invByCust[cid] = [];
    const termDays = parseInt(terms.replace(/\D+/g, '').slice(-2)) || 45;
    for (let k = 0; k < nInv; k++) {
      const iid = id('INV', i * 100 + k + 1);
      // Bias issue dates toward recent so the book is current-heavy with a past-due tail
      const issue = daysAgo(Math.floor(Math.pow(rnd(), 2.2) * 165) + 2);
      const due = new Date(issue.getTime() + termDays * 86400000);
      const dpd = Math.round((NOW - due) / 86400000);
      const prod = pickProduct();
      const amount = Math.round(money(prod[1], prod[2]) * 1.25); // scale to Accuray-scale book (~$100M AR ⇒ ~$446M implied revenue)
      // Payment likelihood rises with invoice age and lower customer risk
      const lowRisk = riskTier === 'Low' || riskTier === 'Medium';
      const paidProb = 0.28 + (dpd > 0 ? 0.24 : 0.05) + (lowRisk ? 0.14 : 0);
      let status = 'open', open = amount;
      const r = rnd();
      if (r < paidProb) { status = 'paid'; open = 0; }
      else if (r < paidProb + 0.06) { status = 'disputed'; }
      else if (r < paidProb + 0.18) { status = 'partial'; open = +(amount * rf(0.3, 0.8)).toFixed(2); }
      const dn = `90${String(ri(1000000, 9999999))}`;
      insInv.run(iid, dn, cid, amount, open, 'USD', fmtDate(issue), fmtDate(due), status,
        agingBucket(dpd), dpd, CC[region] || '1000', prod[0], `45${ri(100000, 999999)}`);
      invByCust[cid].push({ iid, amount, open, dpd, status, due });
    }
  });

  // ----- Collectors -------------------------------------------------------
  const insCol = db.prepare(`INSERT INTO collectors (id,name,active_cases,capacity,specialization,performance,recovered_mtd) VALUES (?,?,?,?,?,?,?)`);
  const COLLECTORS = [
    ['Worklist (Unassigned)', 0, 0, 'Auto-pool', 0, 0],
    ['Dana Whitfield', 0, 45, 'Americas / Health Systems', 91, 0],
    ['Marcus Bell', 0, 45, 'EMEA / Cancer Centers', 84, 0],
    ['Sofia Almeida', 0, 40, 'APAC / Japan / China', 88, 0],
    ['AI Auto-Collector', 0, 999, 'Long-tail / Low-touch', 96, 0],
  ];
  const collectorIds = [];
  COLLECTORS.forEach((c, i) => { const cid = id('COLL', i); collectorIds.push(cid); insCol.run(cid, ...c); });
  const assignableCollectors = collectorIds.slice(1);

  // ----- Payments + matches + exceptions ----------------------------------
  const insPay = db.prepare(`INSERT INTO payments
    (id,bank_ref,customer_id,customer_hint,amount,currency,value_date,channel,remittance_raw,status,match_layer,confidence,matched_invoices,sap_doc,posted_at,received_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insExc = db.prepare(`INSERT INTO exceptions
    (id,payment_id,customer_id,type,severity,amount,assigned_to,sla_due,status,recommendation,resolution,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`);

  const CHANNELS = ['email', 'EDI', 'lockbox', 'ACH', 'wire', 'portal', 'check'];
  const EXC_TYPES = ['short_pay', 'missing_remittance', 'deduction', 'data_mismatch', 'overpayment'];
  const EXC_RECS = {
    short_pay: 'Deduction code DA-12 detected — route to Deductions; post on-account balance.',
    missing_remittance: 'Trigger Customer Follow-up Agent to request remittance advice.',
    deduction: 'Trade promo reference found — auto-create deduction case for validation.',
    data_mismatch: 'Invoice ref off by 1 digit — fuzzy candidate at 0.86; confirm and clear.',
    overpayment: 'Overpayment vs open items — apply to oldest, park residual on-account.',
  };

  let payN = 0, excN = 0;
  for (let p = 0; p < 66; p++) {
    payN++;
    const cust = pick(custIds);
    const invs = invByCust[cust].filter(x => x.open > 0);
    const channel = pick(CHANNELS);
    const recv = daysAgo(ri(0, 9));
    let status, layer = null, conf = null, matched = '[]', amount, sapDoc = null, posted = null;
    const roll = rnd();
    const target = invs[0];
    const baseAmt = target ? target.open : money(8000, 250000);

    if (roll < 0.62 && target) {
      // matched & posted (various layers)
      layer = pick([1, 1, 1, 2, 2, 3, 4]);
      conf = layer === 1 ? rf(0.97, 0.999, 3) : layer === 2 ? rf(0.88, 0.96, 3) : layer === 3 ? rf(0.80, 0.92, 3) : rf(0.74, 0.88, 3);
      amount = baseAmt;
      matched = JSON.stringify([target.iid]);
      status = 'posted';
      sapDoc = `14${ri(10000000, 99999999)}`;
      posted = iso(daysAgo(ri(0, 6)));
    } else if (roll < 0.79 && target) {
      // matched not yet posted (in review)
      layer = pick([3, 4]);
      conf = rf(0.72, 0.86, 3);
      amount = baseAmt;
      matched = JSON.stringify([target.iid]);
      status = 'matched';
    } else if (roll < 0.93 && target) {
      // exception
      status = 'exception';
      const type = pick(EXC_TYPES);
      amount = type === 'short_pay' || type === 'deduction' ? +(baseAmt * rf(0.80, 0.97)).toFixed(2)
        : type === 'overpayment' ? +(baseAmt * rf(1.05, 1.2)).toFixed(2) : baseAmt;
      conf = rf(0.40, 0.69, 3);
    } else {
      // unmatched (fresh in queue) — typically smaller stragglers
      status = 'unmatched';
      amount = money(6000, 75000);
      conf = rf(0.10, 0.45, 3);
    }

    const pid = id('PAY', payN);
    const custName = (CUSTOMERS[custIds.indexOf(cust)] || ['?'])[0];
    const hint = channel === 'lockbox' || channel === 'check'
      ? custName.toUpperCase().slice(0, 14) : custName;
    const rem = target
      ? `REMITTANCE ${target.iid} AMT ${amount} ${channel === 'EDI' ? 'BAI2 ADDENDA' : ''}`.trim()
      : `UNIDENTIFIED PAYER REF ${ri(10000, 99999)}`;
    insPay.run(pid, `BR${ri(1000000, 9999999)}`, status === 'unmatched' ? null : cust, hint,
      amount, 'USD', fmtDate(recv), channel, rem, status, layer, conf, matched, sapDoc, posted, iso(recv));

    if (status === 'exception') {
      excN++;
      const type = EXC_TYPES[Math.floor(rnd() * EXC_TYPES.length)];
      const sev = amount > 150000 ? 'high' : amount > 40000 ? 'medium' : 'low';
      insExc.run(id('EXC', excN), pid, cust, type, sev, amount,
        pick(['Analyst Queue', 'A. Rivera', 'K. Sato', 'Auto-resolve']),
        iso(daysAhead(ri(0, 3))), pick(['open', 'open', 'in_progress']),
        EXC_RECS[type], null, iso(recv));
    }
  }

  // ----- Collection cases (for customers with material past-due) ----------
  const insCase = db.prepare(`INSERT INTO collection_cases
    (id,customer_id,total_past_due,oldest_days,risk_score,priority_rank,priority_score,assigned_to,strategy,stage,sla_status,next_action,next_action_due,delinquency_prob,factors,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insDun = db.prepare(`INSERT INTO dunning_history (id,case_id,customer_id,step,channel,sent_at,subject,response,outcome) VALUES (?,?,?,?,?,?,?,?,?)`);
  const insProm = db.prepare(`INSERT INTO promises (id,case_id,customer_id,promise_date,amount,status,captured_from,created_at) VALUES (?,?,?,?,?,?,?,?)`);
  const insCall = db.prepare(`INSERT INTO call_logs (id,case_id,customer_id,collector,ts,duration,summary,commitments,sentiment) VALUES (?,?,?,?,?,?,?,?,?)`);

  const STRATEGIES = ['Capital / Health System', 'Standard Institutional', 'Long-tail Automated', 'Pre-Legal Escalation'];
  const STAGES = ['Prioritize', 'Engage', 'Track', 'Resolve', 'Escalate'];
  const cases = [];
  let caseN = 0, dunN = 0, promN = 0, callN = 0;

  custIds.forEach((cid, idx) => {
    const cust = CUSTOMERS[idx];
    const pastDue = invByCust[cid].filter(x => x.open > 0 && x.dpd > 0);
    if (pastDue.length === 0) return;
    const total = +pastDue.reduce((s, x) => s + x.open, 0).toFixed(2);
    if (total < 20000) return;
    caseN++;
    const oldest = Math.max(...pastDue.map(x => x.dpd));
    const riskScore = { Low: ri(8, 28), Medium: ri(30, 58), High: ri(60, 82) }[cust[4]] ?? 40;
    // priority score: value(40%) + age(30%) + risk(30%)
    const valN = Math.min(total / 1500000, 1);
    const ageN = Math.min(oldest / 120, 1);
    const riskN = riskScore / 100;
    const score = +(valN * 40 + ageN * 30 + riskN * 30).toFixed(1);
    const delinq = +Math.min(0.97, 0.25 + riskN * 0.45 + ageN * 0.3).toFixed(2);
    const factors = JSON.stringify({
      invoice_value: Math.round(valN * 40), days_past_due: Math.round(ageN * 30),
      customer_risk: Math.round(riskN * 30),
      payment_history: ri(-6, 8), dispute_signal: pastDue.some(x => x.status === 'disputed') ? -5 : 0,
    });
    const stage = oldest > 90 ? 'Escalate' : oldest > 60 ? 'Resolve' : pick(['Engage', 'Track']);
    const sla = oldest > 90 ? 'breached' : oldest > 55 ? 'at_risk' : 'on_track';
    const strategy = LARGE.has(cust[1]) ? STRATEGIES[0] : oldest > 90 ? STRATEGIES[3] : cust[4] === 'High' ? STRATEGIES[3] : STRATEGIES[1];
    const assigned = LARGE.has(cust[1]) ? collectorIds[1] : total < 120000 ? collectorIds[4] : pick(assignableCollectors);
    const nextAct = stage === 'Escalate' ? 'Final notice + pre-legal review'
      : stage === 'Resolve' ? 'Confirm promise-to-pay / partial settlement'
      : 'Dunning step ' + ri(2, 4) + ' (' + pick(['email', 'call']) + ')';
    const cId = id('CASE', caseN);
    insCase.run(cId, cid, total, oldest, riskScore, 0, score, assigned, strategy, stage, sla,
      nextAct, iso(daysAhead(ri(0, 4))), delinq, factors, iso(daysAgo(ri(2, 40))));
    cases.push({ cId, cid, score, total, assigned });

    // dunning history
    const steps = ri(1, 4);
    for (let s = 1; s <= steps; s++) {
      dunN++;
      const ch = s === 1 ? 'email' : pick(['email', 'call', 'portal']);
      insDun.run(id('DUN', dunN), cId, cid, s, ch, iso(daysAgo(steps - s + 2 + ri(0, 3))),
        s === 1 ? 'Friendly reminder — invoice past due' : ch === 'call' ? 'Outbound collection call' : `Dunning step ${s}`,
        pick(['none', 'opened', 'replied', 'promised', 'none']), pick(['', 'no response', 'promised payment', 'partial', 'disputed line']));
    }
    // promises (~40%)
    if (rnd() < 0.4) {
      promN++;
      insProm.run(id('PROM', promN), cId, cid, fmtDate(daysAhead(ri(2, 18))),
        +(total * rf(0.4, 1)).toFixed(2), pick(['pending', 'pending', 'kept', 'broken']),
        pick(['call', 'email']), iso(daysAgo(ri(1, 10))));
    }
    // call logs (~35%)
    if (rnd() < 0.35) {
      callN++;
      insCall.run(id('CALL', callN), cId, cid, assigned === collectorIds[4] ? 'AI Auto-Collector' : 'Dana Whitfield',
        iso(daysAgo(ri(1, 12))), ri(95, 540),
        'AP confirmed invoices in approval queue; committed to release batch this week.',
        'Promise-to-pay ' + fmtDate(daysAhead(ri(3, 14))), pick(['cooperative', 'neutral', 'evasive']));
    }
  });

  // rank cases by priority score
  cases.sort((a, b) => b.score - a.score);
  const upRank = db.prepare(`UPDATE collection_cases SET priority_rank=? WHERE id=?`);
  cases.forEach((c, i) => upRank.run(i + 1, c.cId));
  // collector active case counts
  const upCol = db.prepare(`UPDATE collectors SET active_cases=(SELECT COUNT(*) FROM collection_cases WHERE assigned_to=collectors.id), recovered_mtd=? WHERE id=?`);
  collectorIds.forEach(cid => upCol.run(+(rnd() * 1.8e6).toFixed(0), cid));

  // ----- Contract & rebate programs (GPO / distributor / service) ----------
  const insPromo = db.prepare(`INSERT INTO trade_promotions (id,customer_id,name,skus,start_date,end_date,agreed_amount,accrued,accrual_status,status) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  const PROMO_NAMES = ['Vizient GPO Agreement', 'Premier Inc Rebate Program', 'HealthTrust Contract', 'Multi-System Volume Program', 'Service Loyalty Rebate', 'Distributor Margin Program', 'Government GSA Schedule', 'Academic Consortium Pricing'];
  const SKUS = ['CK-S7', 'RX-X9', 'TOMO-HDA', 'CK-M6', 'RX-X7', 'RAY-PLAN', 'iDMS', 'SYNCHRONY'];
  const promos = [];
  let promoN = 0;
  custIds.forEach((cid, idx) => {
    if (rnd() < 0.55) {
      const n = ri(1, 2);
      for (let j = 0; j < n; j++) {
        promoN++;
        const start = daysAgo(ri(40, 160)), end = daysAhead(ri(-30, 40));
        const agreed = money(120000, 2400000);
        const accrued = +(agreed * rf(0.5, 1.15)).toFixed(2);
        const pid = id('PROMO', promoN);
        insPromo.run(pid, cid, pick(PROMO_NAMES), JSON.stringify([pick(SKUS), pick(SKUS)]),
          fmtDate(start), fmtDate(end), agreed, accrued,
          accrued > agreed ? 'over-accrued' : rnd() < 0.4 ? 'settled' : 'open',
          end > NOW ? 'active' : 'expired');
        promos.push({ pid, cid });
      }
    }
  });

  // ----- Disputes ---------------------------------------------------------
  const insDisp = db.prepare(`INSERT INTO disputes (id,customer_id,invoice_id,type,severity,status,stage,amount,source,assigned_to,sla_due,sla_status,win_prob,predicted,classify_conf,root_cause,resolution,resolved_amount,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  const insEvid = db.prepare(`INSERT INTO dispute_evidence (id,dispute_id,doc_type,source,ref,relevance,status) VALUES (?,?,?,?,?,?,?)`);
  const DISPUTE_TYPES = {
    pricing:    { evid: [['quote_contract', 'SAP SD'], ['price_list', 'SAP SD'], ['invoice', 'SAP FI-AR']], root: 'Quote/contract price mismatch vs PO', pred: 'partial' },
    shipping:   { evid: [['installation_report', 'SAP CS'], ['delivery_note', 'SAP MM'], ['acceptance_cert', 'Field Service']], root: 'System delivery / install milestone dispute', pred: 'approve' },
    quality:    { evid: [['service_report', 'SAP CS'], ['return_auth', 'SAP SD'], ['field_inspection', 'Field Service']], root: 'System / parts defect — field service', pred: 'approve' },
    billing:    { evid: [['invoice', 'SAP FI-AR'], ['order_confirmation', 'SAP SD'], ['milestone_log', 'SAP PS']], root: 'Duplicate or mis-timed milestone billing', pred: 'approve' },
    unauthorized_deduction: { evid: [['gpo_contract', 'SAP SD'], ['rebate_agreement', 'Vistex'], ['correspondence', 'Email']], root: 'GPO fee / rebate taken without agreement', pred: 'deny' },
    compliance: { evid: [['service_contract', 'SAP CS'], ['uptime_report', 'iDMS / RDS']], root: 'Service-level / uptime penalty contested', pred: 'partial' },
  };
  const DISP_HANDLERS = ['Dispute Queue', 'A. Rivera', 'K. Sato', 'M. Bell'];
  const dtypeKeys = Object.keys(DISPUTE_TYPES);
  let dispN = 0, evidN = 0;
  custIds.forEach((cid, idx) => {
    const seg = CUSTOMERS[idx][1];
    const n = rnd() < 0.55 ? ri(1, 2) : 0;
    for (let j = 0; j < n; j++) {
      dispN++;
      const inv = pick(invByCust[cid]);
      const tkey = pick(dtypeKeys);
      const T = DISPUTE_TYPES[tkey];
      const amount = +(inv.amount * rf(0.15, 0.65)).toFixed(2);
      const sev = amount > 120000 ? 'high' : amount > 35000 ? 'medium' : 'low';
      const roll = rnd();
      const status = roll < 0.34 ? 'resolved' : roll < 0.45 ? 'denied' : roll < 0.72 ? 'investigating' : 'open';
      const stage = status === 'resolved' ? 'Analyze' : status === 'denied' ? 'Resolve' : status === 'investigating' ? 'Investigate' : pick(['Capture', 'Classify']);
      const winProb = +Math.min(0.96, Math.max(0.18, (tkey === 'unauthorized_deduction' ? 0.78 : 0.5) + rf(-0.2, 0.25))).toFixed(2);
      const ageDays = ri(2, 28);
      const sla = ageDays > 18 ? 'breached' : ageDays > 11 ? 'at_risk' : 'on_track';
      const did = id('DISP', dispN);
      insDisp.run(did, cid, inv.iid, tkey, sev, status, stage, amount,
        pick(['email', 'short_pay', 'portal', 'call', 'deduction']),
        LARGE.has(seg) ? DISP_HANDLERS[1] : pick(DISP_HANDLERS),
        iso(daysAhead(ri(-4, 6))), sla, winProb, T.pred, +rf(0.72, 0.97, 2),
        T.root, status === 'resolved' ? T.pred + ' — credit memo posted' : status === 'denied' ? 'denied with evidence' : null,
        status === 'resolved' ? (T.pred === 'approve' ? amount : T.pred === 'partial' ? +(amount * 0.5).toFixed(2) : 0) : null,
        iso(daysAgo(ageDays)));
      // evidence
      T.evid.forEach(([dt, src], k) => {
        evidN++;
        const pulled = status === 'open' ? (k === 0) : true;
        insEvid.run(id('EVID', evidN), did, dt, src, `${src.split(' ')[0]}-${ri(100000, 999999)}`,
          +rf(0.55, 0.98, 2), pulled ? 'pulled' : 'pending');
      });
    }
  });

  // ----- Deductions -------------------------------------------------------
  const insDed = db.prepare(`INSERT INTO deductions (id,customer_id,invoice_id,category,type,reason_code,gl_account,amount,validity,confidence,status,stage,source,assigned_to,promo_id,promo_match,sku,backup_docs,resolution,recovered,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  // Medical-device deductions: contract/program-based ("trade") vs operational ("non-trade")
  const DED_TYPES = {
    gpo_admin_fee:     { cat: 'trade', rc: 'GPO-101', gl: '500100', docs: ['claim_doc', 'gpo_agreement'] },
    volume_rebate:     { cat: 'trade', rc: 'REB-110', gl: '500110', docs: ['claim_doc', 'rebate_contract'] },
    distributor_rebate:{ cat: 'trade', rc: 'DST-120', gl: '500120', docs: ['claim_doc', 'distributor_agreement'] },
    demo_credit:       { cat: 'trade', rc: 'DMO-130', gl: '500130', docs: ['claim_doc', 'eval_agreement'] },
    parts_shortage:    { cat: 'non-trade', rc: 'NT-201', gl: '410200', docs: ['claim_doc', 'packing_list', 'POD'] },
    pricing_variance:  { cat: 'non-trade', rc: 'NT-210', gl: '410210', docs: ['claim_doc', 'PO', 'price_list'] },
    warranty:          { cat: 'non-trade', rc: 'NT-220', gl: '410220', docs: ['claim_doc', 'service_report'] },
    freight:           { cat: 'non-trade', rc: 'NT-230', gl: '410230', docs: ['claim_doc', 'carrier_invoice'] },
    sla_penalty:       { cat: 'non-trade', rc: 'NT-240', gl: '410240', docs: ['claim_doc', 'uptime_report'] },
  };
  const dedKeys = Object.keys(DED_TYPES);
  const DED_HANDLERS = ['Auto-resolve', 'Deduction Queue', 'J. Park', 'L. Gomez'];
  // Backup-document metadata templates (filename base, ref prefix, source system, file kind)
  const DOC_META = {
    claim_doc:             { fn: 'Deduction_Claim',        code: 'CLM', src: 'Customer Portal', kind: 'PDF' },
    gpo_agreement:         { fn: 'GPO_Admin_Agreement',    code: 'GPO', src: 'SAP SD / Vistex', kind: 'PDF' },
    rebate_contract:       { fn: 'Rebate_Contract',        code: 'REB', src: 'SAP SD / Vistex', kind: 'PDF' },
    distributor_agreement: { fn: 'Distributor_Agreement',  code: 'DST', src: 'CLM', kind: 'PDF' },
    eval_agreement:        { fn: 'Eval_Loaner_Agreement',  code: 'EVL', src: 'CLM', kind: 'PDF' },
    packing_list:          { fn: 'Packing_List',           code: 'PKL', src: 'SAP MM', kind: 'PDF' },
    POD:                   { fn: 'Proof_of_Delivery',      code: 'POD', src: 'Logistics', kind: 'PDF' },
    PO:                    { fn: 'Purchase_Order',         code: 'PO',  src: 'SAP MM', kind: 'PDF' },
    price_list:            { fn: 'Contract_Price_List',    code: 'PRC', src: 'SAP SD', kind: 'XLSX' },
    service_report:        { fn: 'Field_Service_Report',   code: 'FSR', src: 'SAP CS', kind: 'PDF' },
    carrier_invoice:       { fn: 'Carrier_Invoice',        code: 'FRT', src: 'Logistics', kind: 'PDF' },
    uptime_report:         { fn: 'System_Uptime_Report',   code: 'UPT', src: 'iDMS / RDS', kind: 'PDF' },
  };
  const buildDocs = (types, did) => types.map(dt => {
    const m = DOC_META[dt] || { fn: dt, code: 'DOC', src: 'SAP', kind: 'PDF' };
    return { type: dt, name: `${m.fn}_${did}.${m.kind === 'XLSX' ? 'xlsx' : 'pdf'}`,
      ref: `${m.code}-${ri(100000, 999999)}`, date: fmtDate(daysAgo(ri(2, 45))), source: m.src, kind: m.kind, size: `${ri(90, 2200)} KB` };
  });
  let dedN = 0;
  custIds.forEach((cid, idx) => {
    const n = rnd() < 0.75 ? ri(1, 3) : 0;
    const custPromos = promos.filter(p => p.cid === cid);
    for (let j = 0; j < n; j++) {
      dedN++;
      const inv = pick(invByCust[cid]);
      const tkey = pick(dedKeys);
      const D = DED_TYPES[tkey];
      const amount = +(inv.amount * rf(0.02, 0.18)).toFixed(2);
      const isTrade = D.cat === 'trade';
      const promo = isTrade && custPromos.length ? pick(custPromos) : null;
      const promoMatch = !isTrade ? 'n/a' : promo ? pick(['matched', 'matched', 'mismatch']) : 'no_promo';
      // validity prediction
      let validity, conf;
      if (isTrade) { validity = promoMatch === 'matched' ? 'valid' : promoMatch === 'mismatch' ? 'invalid' : 'review'; }
      else { validity = pick(['valid', 'invalid', 'review', 'invalid']); }
      conf = validity === 'review' ? +rf(0.5, 0.69, 2) : +rf(0.78, 0.97, 2);
      const roll = rnd();
      let status = roll < 0.30 ? 'resolved' : roll < 0.42 ? 'disputed' : roll < 0.6 ? 'matched' : roll < 0.78 ? 'validating' : 'open';
      if (validity === 'review') status = pick(['validating', 'open']);
      const stage = status === 'resolved' ? 'Resolve' : status === 'disputed' ? 'Resolve' : status === 'matched' ? 'Match' : status === 'validating' ? 'Validate' : pick(['Capture', 'Classify']);
      const recovered = (status === 'resolved' && validity === 'invalid') ? amount : 0;
      const did = id('DED', dedN);
      insDed.run(did, cid, inv.iid, D.cat, tkey, D.rc, D.gl, amount, validity, conf, status, stage,
        pick(['portal', 'email', 'remittance', 'EDI']),
        validity === 'valid' && conf > 0.9 ? 'Auto-resolve' : pick(DED_HANDLERS),
        promo ? promo.pid : null, promoMatch, isTrade ? pick(SKUS) : null,
        JSON.stringify(buildDocs(D.docs, did)), status === 'resolved' ? (validity === 'valid' ? 'approved — write-off posted' : 'denied — disputed on portal') : null,
        recovered, iso(daysAgo(ri(1, 30))));
    }
  });

  // ----- Agents -----------------------------------------------------------
  const insAgent = db.prepare(`INSERT INTO agents (id,module,name,type,fn,technology,state,confidence,runs_today,approval_class) VALUES (?,?,?,?,?,?,?,?,?,?)`);
  AGENT_CATALOG.forEach(a => insAgent.run(a.id, a.module, a.name, a.type, a.fn, a.technology,
    a.state || 'idle', a.confidence ?? rf(0.82, 0.98, 2), a.runs_today ?? ri(8, 240), a.approval_class || 'auto'));

  // ----- Settings ---------------------------------------------------------
  const insSet = db.prepare(`INSERT INTO settings (key,value,category,label,updated_at) VALUES (?,?,?,?,?)`);
  const S = (k, v, cat, label) => insSet.run(k, JSON.stringify(v), cat, label, iso(NOW));
  S('match.autopost_threshold', 0.95, 'matching', 'Auto-post confidence threshold');
  S('match.fuzzy_amount_tolerance', 0.02, 'matching', 'Fuzzy amount tolerance (%)');
  S('match.fuzzy_date_window_days', 5, 'matching', 'Fuzzy value-date window (days)');
  S('match.layers_enabled', { deterministic: true, fuzzy: true, ml: true, hierarchy: true, agent: true }, 'matching', 'Matching waterfall layers');
  S('exceptions.sla_hours', 24, 'exceptions', 'Exception resolution SLA (hours)');
  S('exceptions.auto_route', true, 'exceptions', 'Auto-route exceptions to analysts');
  S('collections.priority_weights', { value: 40, age: 30, risk: 30 }, 'collections', 'Worklist priority weights');
  S('collections.delinquency_alert', 0.7, 'collections', 'Delinquency alert threshold');
  S('collections.dunning_strategy', 'segment', 'collections', 'Default dunning strategy basis');
  S('collections.auto_dunning', true, 'collections', 'Enable automated dunning emails');
  S('erp.system', 'SAP S/4HANA', 'erp', 'Primary ERP');
  S('erp.client', '100', 'erp', 'SAP client');
  S('erp.company_codes', ['1000 Americas', '2000 EMEA', '3000 APAC', '4000 Japan', '5000 China'], 'erp', 'Company codes');
  S('erp.posting_bapi', 'BAPI_ACC_DOCUMENT_POST', 'erp', 'Posting BAPI');
  S('erp.connection', 'connected', 'erp', 'Connection status');
  S('general.base_currency', 'USD', 'general', 'Base currency');
  S('general.dso_target', 65, 'general', 'DSO target (days)');
  S('general.theme', 'light', 'general', 'UI theme');
  // ROI model assumptions (drive the per-module benefit calculators)
  S('roi.analyst_cost', 95000, 'roi', 'Loaded AR analyst cost ($/yr)');
  S('roi.wacc', 0.09, 'roi', 'Cost of capital / WACC');
  S('roi.program_cost', 1200000, 'roi', 'Accelerator program cost ($)');
  S('roi.annual_payments', 9000, 'roi', 'Annual remittance volume');
  S('roi.annual_disputes', 420, 'roi', 'Annual dispute volume');
  S('roi.annual_deductions', 1600, 'roi', 'Annual deduction volume');
  S('roi.dispute_rate', 0.03, 'roi', 'Disputes as % of revenue');
  S('roi.deduction_rate', 0.015, 'roi', 'Deductions as % of revenue');
  S('roi.bad_debt_rate', 0.015, 'roi', 'Baseline write-off rate (% of AR)');
  S('roi.min_manual_match', 6, 'roi', 'Manual cash-match time (min)');
  S('roi.min_manual_dispute', 180, 'roi', 'Manual evidence assembly (min)');
  S('roi.min_manual_deduction', 75, 'roi', 'Manual deduction research (min)');

  // ----- Activity feed ----------------------------------------------------
  const insAct = db.prepare(`INSERT INTO activity (ts,module,actor,kind,message,detail) VALUES (?,?,?,?,?,?)`);
  const acts = [
    ['cashapp', 'AGENT-CA-INVMATCH', 'done', 'Auto-posted 31 payments to SAP', 'layer-1 deterministic · checksum ✓'],
    ['cashapp', 'AGENT-CA-REMIT', 'act', 'Parsed 14 wire/EDI remittances', 'Vision LLM + OCR · 0 unreadable'],
    ['collections', 'AGENT-CO-WORKLIST', 'act', 'Re-ranked worklist (daily)', 'cases scored on 20+ factors'],
    ['collections', 'AGENT-CO-DUNNING', 'done', 'Sent dunning to cancer centers & distributors', 'optimal send-time window'],
    ['cashapp', 'AGENT-CA-EXCEPTION', 'flag', 'Routed 9 exceptions', 'short-pay · missing remittance'],
    ['collections', 'AGENT-CO-DELINQ', 'flag', '3 accounts flagged 30-day delinquency', 'prob > 0.70'],
    ['dispute', 'AGENT-DI-CLASSIFY', 'act', 'Auto-classified incoming disputes', 'pricing · install milestone · service'],
    ['dispute', 'AGENT-DI-EVIDENCE', 'done', 'Assembled evidence packages', 'SAP SD/CS + field service + contracts'],
    ['deductions', 'AGENT-DE-VALIDITY', 'flag', 'Flagged invalid GPO/rebate deductions', 'confidence > 0.85'],
    ['deductions', 'AGENT-DE-PROMO', 'act', 'Matched contract deductions to programs', 'GPO / rebate reconciliation'],
    ['platform', 'system', 'info', 'AR data sync from SAP FI-AR complete', 'Americas · EMEA · APAC · Japan · China'],
  ];
  acts.forEach((a, i) => insAct.run(new Date(NOW.getTime() - i * 3600000).toISOString(), ...a));

  const counts = {
    customers: custIds.length,
    invoices: db.prepare(`SELECT COUNT(*) n FROM invoices`).get().n,
    payments: db.prepare(`SELECT COUNT(*) n FROM payments`).get().n,
    exceptions: db.prepare(`SELECT COUNT(*) n FROM exceptions`).get().n,
    cases: cases.length,
    disputes: dispN,
    deductions: dedN,
    promotions: promoN,
    agents: AGENT_CATALOG.length,
  };
  return counts;
}

export { seed };

// Run when invoked directly
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1].endsWith('seed.js')) {
  const c = seed();
  console.log('✓ AR database seeded:', JSON.stringify(c));
}
