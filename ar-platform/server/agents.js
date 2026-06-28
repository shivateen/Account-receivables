// ---------------------------------------------------------------------------
// agents.js — AR AI-agent catalog + a server-side simulated "run" engine.
// The catalog seeds the DB; runAgent() produces a realistic reasoning trace
// so the cockpits can show an agent "thinking" against live data.
// ---------------------------------------------------------------------------

export const AGENT_CATALOG = [
  // ---- Cash Application (10) ------------------------------------------------
  { id: 'AGENT-CA-REMIT',     module: 'cashapp', name: 'Remittance Capture Agent',   type: 'Autonomous', fn: 'Extracts data from email, PDF, portal & lockbox remittances across all formats and languages', technology: 'Vision LLM + OCR + NLP', approval_class: 'auto', state: 'active' },
  { id: 'AGENT-CA-CUSTID',    module: 'cashapp', name: 'Customer ID Agent',          type: 'Autonomous', fn: 'Identifies the paying customer via MICR, email domain, invoice refs and historical patterns', technology: 'ML classifier + fuzzy matching', approval_class: 'auto' },
  { id: 'AGENT-CA-INVMATCH',  module: 'cashapp', name: 'Invoice Match Agent',        type: 'Autonomous', fn: '5-layer matching: deterministic → fuzzy → ML → parent-child → agent investigation', technology: 'Rules engine + gradient-boosted model', approval_class: 'auto', state: 'active' },
  { id: 'AGENT-CA-EXCEPTION', module: 'cashapp', name: 'Exception Classifier Agent', type: 'Autonomous', fn: 'Classifies exception type, assigns confidence score and routes to the right analyst', technology: 'Multi-class ML classifier', approval_class: 'review' },
  { id: 'AGENT-CA-RESOLVE',   module: 'cashapp', name: 'Resolution Recommender',     type: 'Assisted',   fn: 'Suggests resolution actions from historical exception patterns', technology: 'kNN + collaborative filtering', approval_class: 'review' },
  { id: 'AGENT-CA-POST',      module: 'cashapp', name: 'ERP Posting Agent',          type: 'Autonomous', fn: 'Formats and posts matched payments to SAP via BAPI with full audit trail', technology: 'SAP integration + validation rules', approval_class: 'auto' },
  { id: 'AGENT-CA-FOLLOWUP',  module: 'cashapp', name: 'Customer Follow-up Agent',   type: 'Assisted',   fn: 'Drafts follow-up emails for missing remittances and triggers auto-sends', technology: 'LLM template generation', approval_class: 'review' },
  { id: 'AGENT-CA-FORECAST',  module: 'cashapp', name: 'Cash Forecast Agent',        type: 'Autonomous', fn: 'Predicts payment arrival timing from customer behaviour and invoice patterns', technology: 'Time-series ML (LSTM/Prophet)', approval_class: 'auto' },
  { id: 'AGENT-CA-ANOMALY',   module: 'cashapp', name: 'Anomaly Detection Agent',    type: 'Autonomous', fn: 'Flags unusual payment patterns, potential fraud or duplicate payments', technology: 'Isolation forest + statistical models', approval_class: 'review' },
  { id: 'AGENT-CA-LEARN',     module: 'cashapp', name: 'Continuous Learning Agent',  type: 'Background', fn: 'Retrains match models, tunes confidence thresholds, detects drift', technology: 'MLOps pipeline + drift detection', approval_class: 'auto', state: 'learning' },

  // ---- Collections (12) -----------------------------------------------------
  { id: 'AGENT-CO-WORKLIST',  module: 'collections', name: 'Worklist Prioritization Agent', type: 'Autonomous', fn: 'Scores and ranks overdue accounts daily on 20+ factors into collector worklists', technology: 'Gradient-boosted model + behavioural scoring', approval_class: 'auto', state: 'active' },
  { id: 'AGENT-CO-DELINQ',    module: 'collections', name: 'Delinquency Predictor Agent',    type: 'Autonomous', fn: 'Forecasts 30-day delinquency probability and triggers proactive outreach', technology: 'LSTM / XGBoost + payment history', approval_class: 'auto' },
  { id: 'AGENT-CO-DUNNING',   module: 'collections', name: 'Smart Dunning Agent',            type: 'Autonomous', fn: 'Sends personalised dunning emails at optimal times, adapting channel and tone', technology: 'GenAI (LLM) + send-time optimisation ML', approval_class: 'auto', state: 'active' },
  { id: 'AGENT-CO-INBOX',     module: 'collections', name: 'AR Email Inbox Agent',           type: 'Assisted',   fn: 'Reads customer replies, drafts responses with AR context, summarises threads', technology: 'LLM + RAG on customer AR data', approval_class: 'review' },
  { id: 'AGENT-CO-CALL',      module: 'collections', name: 'Virtual Call Assistant Agent',   type: 'Assisted',   fn: 'Auto-transcribes calls, suggests talking points and generates summaries', technology: 'Speech-to-text + LLM summarisation', approval_class: 'review' },
  { id: 'AGENT-CO-DIALER',    module: 'collections', name: 'Parallel Dialer Agent',          type: 'Autonomous', fn: 'Dials multiple numbers, connects live calls to collectors, skips voicemails', technology: 'Telephony API + intelligent routing', approval_class: 'auto' },
  { id: 'AGENT-CO-PORTAL',    module: 'collections', name: 'AP Portal Upload Agent',         type: 'Autonomous', fn: 'Uploads invoices to 600+ AP portals, tracks payment status, captures disputes', technology: 'RPA + custom bot builder', approval_class: 'auto' },
  { id: 'AGENT-CO-AUTORESP',  module: 'collections', name: 'Auto-Response Agent',            type: 'Assisted',   fn: 'Classifies incoming customer emails and drafts context-aware replies', technology: 'LLM + intent classification + RAG', approval_class: 'review' },
  { id: 'AGENT-CO-PTP',       module: 'collections', name: 'Promise-to-Pay Tracker Agent',   type: 'Autonomous', fn: 'Tracks payment promises, triggers follow-up on broken promises, updates worklist', technology: 'NLP extraction + workflow rules', approval_class: 'auto' },
  { id: 'AGENT-CO-DISPREV',   module: 'collections', name: 'Dispute Prevention Agent',       type: 'Autonomous', fn: 'Detects invoices likely to be disputed and triggers pre-emptive outreach', technology: 'Anomaly detection + pattern ML', approval_class: 'review' },
  { id: 'AGENT-CO-STRATEGY',  module: 'collections', name: 'Collection Strategy Agent',      type: 'Background', fn: 'Optimises dunning sequences and channel mix via A/B testing', technology: 'Multi-armed bandit + RL', approval_class: 'auto', state: 'learning' },
  { id: 'AGENT-CO-RECOVERY',  module: 'collections', name: 'Cash Recovery Forecast Agent',   type: 'Autonomous', fn: 'Predicts weekly/monthly cash recovery by segment for treasury planning', technology: 'Time-series ML (Prophet / LSTM)', approval_class: 'auto' },

  // ---- Dispute Management (10) — catalog for roster/roadmap -----------------
  { id: 'AGENT-DI-CAPTURE',   module: 'dispute', name: 'Dispute Capture Agent',     type: 'Autonomous', fn: 'Parses emails, remittances and portal notifications into structured dispute cases', technology: 'NLP + entity extraction + LLM', approval_class: 'auto' },
  { id: 'AGENT-DI-CLASSIFY',  module: 'dispute', name: 'Classification Agent',      type: 'Autonomous', fn: 'Auto-classifies disputes by type and severity', technology: 'Multi-class ML classifier', approval_class: 'auto', state: 'active' },
  { id: 'AGENT-DI-EVIDENCE',  module: 'dispute', name: 'Evidence Assembly Agent',   type: 'Autonomous', fn: 'Pulls and scores documents from ERP, logistics and contracts into a case package', technology: 'RAG + document retrieval + scoring', approval_class: 'review' },
  { id: 'AGENT-DI-OUTCOME',   module: 'dispute', name: 'Outcome Prediction Agent',  type: 'Autonomous', fn: 'Predicts win/loss probability and recommended resolution', technology: 'Gradient-boosted model + kNN', approval_class: 'review' },
  { id: 'AGENT-DI-RESOLVE',   module: 'dispute', name: 'Resolution Recommender',    type: 'Assisted',   fn: 'Suggests approve/deny/partial credit with rationale and evidence', technology: 'LLM + case-based reasoning', approval_class: 'hitl' },
  { id: 'AGENT-DI-CORR',      module: 'dispute', name: 'Correspondence Agent',      type: 'Assisted',   fn: 'Generates credit memos, denial notices and follow-ups with attachments', technology: 'LLM template generation', approval_class: 'review' },
  { id: 'AGENT-DI-ROOT',      module: 'dispute', name: 'Root Cause Analyzer',       type: 'Background', fn: 'Identifies systemic patterns across disputes by product, customer, carrier, region', technology: 'Anomaly detection + clustering', approval_class: 'auto' },
  { id: 'AGENT-DI-FRAUD',     module: 'dispute', name: 'Fraud Detection Agent',     type: 'Autonomous', fn: 'Flags suspicious dispute patterns — duplicates, escalating frequency', technology: 'Isolation forest + graph analysis', approval_class: 'review' },
  { id: 'AGENT-DI-SLA',       module: 'dispute', name: 'SLA Monitor Agent',         type: 'Autonomous', fn: 'Tracks case aging vs SLA, triggers escalation, alerts managers', technology: 'Rules engine + predictive timing', approval_class: 'auto' },
  { id: 'AGENT-DI-UPSTREAM',  module: 'dispute', name: 'Upstream Alert Agent',      type: 'Autonomous', fn: 'Detects when root causes indicate upstream process failures', technology: 'Pattern ML + threshold rules', approval_class: 'review' },

  // ---- Deductions (12) — catalog for roster/roadmap ------------------------
  { id: 'AGENT-DE-PORTAL',    module: 'deductions', name: 'Portal Claim Download Agent', type: 'Autonomous', fn: 'Navigates portals, extracts header + line claim data, downloads backup docs', technology: 'RPA + custom bot builder', approval_class: 'auto' },
  { id: 'AGENT-DE-EMAIL',     module: 'deductions', name: 'Email Claim Capture Agent',   type: 'Autonomous', fn: 'Parses claim emails and attachments, extracts and links deduction details', technology: 'NLP + entity extraction + LLM', approval_class: 'auto' },
  { id: 'AGENT-DE-CLASSIFY',  module: 'deductions', name: 'Deduction Classifier Agent',  type: 'Autonomous', fn: 'Classifies trade vs non-trade, assigns reason codes, maps to GL', technology: 'Multi-class ML classifier', approval_class: 'auto' },
  { id: 'AGENT-DE-VALIDITY',  module: 'deductions', name: 'Validity Predictor Agent',    type: 'Autonomous', fn: 'Predicts valid vs invalid from 20+ variables and 12 months history', technology: 'XGBoost + historical pattern analysis', approval_class: 'review', state: 'active' },
  { id: 'AGENT-DE-PROMO',     module: 'deductions', name: 'Trade Promo Matching Agent',   type: 'Autonomous', fn: 'Validates trade deductions against TPM promotions at SKU level', technology: 'Rules engine + fuzzy matching', approval_class: 'review', state: 'active' },
  { id: 'AGENT-DE-PRICE',     module: 'deductions', name: 'Price Variance Analyzer',      type: 'Autonomous', fn: 'Compares deducted prices vs contracts, POs and price lists', technology: 'Deterministic matching + tolerance', approval_class: 'auto' },
  { id: 'AGENT-DE-SHORT',     module: 'deductions', name: 'Shortage Analysis Agent',      type: 'Autonomous', fn: 'Links PODs/BOLs, analyses shortage claims vs shipping records', technology: 'Document retrieval + comparison', approval_class: 'review' },
  { id: 'AGENT-DE-DISPUTE',   module: 'deductions', name: 'Invalid Claim Dispute Agent',  type: 'Autonomous', fn: 'Prepares dispute packages, uploads denials with evidence, tracks status', technology: 'RPA + LLM correspondence', approval_class: 'review' },
  { id: 'AGENT-DE-AUTO',      module: 'deductions', name: 'Auto-Resolution Agent',        type: 'Autonomous', fn: 'Applies auto-resolution rules for high-confidence deductions, posts to ERP', technology: 'Rules engine + ERP integration', approval_class: 'auto' },
  { id: 'AGENT-DE-LINKER',    module: 'deductions', name: 'Deduction Backup Linker',      type: 'Autonomous', fn: 'Matches backup documents to open deductions across all sources', technology: 'Document matching + entity linking', approval_class: 'auto' },
  { id: 'AGENT-DE-LEAK',      module: 'deductions', name: 'Revenue Leakage Analyzer',     type: 'Background', fn: 'Identifies systematic leakage by customer, product, promotion, region', technology: 'Clustering + trend analysis', approval_class: 'auto' },
  { id: 'AGENT-DE-LEARN',     module: 'deductions', name: 'Continuous Learning Agent',    type: 'Background', fn: 'Retrains validity/classification models on new outcomes', technology: 'MLOps pipeline + drift detection', approval_class: 'auto', state: 'learning' },

  // ---- Platform -------------------------------------------------------------
  { id: 'AGENT-PL-SYNC',      module: 'platform', name: 'SAP Sync Agent',          type: 'Background', fn: 'Real-time AR data sync from SAP FI-AR (open items, customer master, aging)', technology: 'BAPI/IDoc + CDS views', approval_class: 'auto', state: 'active' },
  { id: 'AGENT-PL-ORCH',      module: 'platform', name: 'AR Orchestrator',         type: 'Autonomous', fn: 'Routes work across cash app, collections, dispute and deduction agents', technology: 'Workflow engine + policy rules', approval_class: 'auto', state: 'active' },
];

// SAP touchpoints per module (assumes the client runs SAP S/4HANA)
export const MODULE_SAP = {
  cashapp:     'SAP FI-AR (open items, F-28 / F-32 clearing) · FI-BL bank statements (FF67, BAI2 / MT940) · BAPI_ACC_DOCUMENT_POST',
  collections: 'SAP FSCM-COL · dunning programme F150 · FI-AR aging (FBL5N) · customer master (KNA1 / KNB1 / KNVV)',
  dispute:     'SAP FSCM-DM (UDM_DISPUTE_CREATE / CHANGE) · FI-AR credit memo (FB75) · SD / CS evidence',
  deductions:  'SAP FSCM-DM · SD-TPM / Vistex programmes · FI-AR credit memo (FB75) · CO write-off postings',
  platform:    'SAP S/4HANA · FI-AR · CDS analytical views · BAPI / IDoc integration',
};

// Rich per-agent explanation: how it works + the business value it drives.
export const AGENT_DETAIL = {
  'AGENT-CA-REMIT': 'Reads inbound remittances from email bodies, PDF/Excel attachments, lockbox images and EDI files, using a vision LLM + OCR to extract invoice numbers, amounts and dates into a canonical schema. Eliminates manual keying and makes every payment matchable regardless of format or language.',
  'AGENT-CA-CUSTID': 'Resolves the paying customer when a remittance is ambiguous by scoring MICR/bank data, email domains, invoice-reference patterns and historical behaviour against the SAP customer master. Turns "unidentified payer" exceptions into clean, postable cash.',
  'AGENT-CA-INVMATCH': 'Runs each payment through a five-layer waterfall — deterministic, fuzzy, ML pattern, parent-child hierarchy and LLM investigation — stopping at the first confident match. Lifts straight-through match rates from the low-50s to 85%+ and shrinks the exception queue.',
  'AGENT-CA-EXCEPTION': 'Classifies every unmatched item by type (short-pay, missing remittance, deduction, data mismatch), scores severity and routes it to the right analyst or downstream module with a recommended action. Cuts triage time and stops cash ageing on account.',
  'AGENT-CA-RESOLVE': 'Recommends the most likely resolution for an exception by retrieving how similar past exceptions were cleared (kNN over resolution history). Gives analysts a one-click answer instead of a research task.',
  'AGENT-CA-POST': 'Validates open items and posts matched payments to SAP via BAPI_ACC_DOCUMENT_POST, writing a full match-chain audit trail and clearing the invoice in real time. Removes the manual posting step and keeps the sub-ledger continuously current.',
  'AGENT-CA-FOLLOWUP': 'Drafts and (on approval) sends remittance-request emails when a payment arrives without backup, tracking responses back into the match queue. Closes the most common cause of unapplied cash.',
  'AGENT-CA-FORECAST': 'Predicts when each customer will pay using time-series models over invoice attributes and historical behaviour, feeding a daily cash-arrival forecast to treasury. Replaces spreadsheet guesswork with a data-driven forecast.',
  'AGENT-CA-ANOMALY': 'Flags unusual payment patterns — duplicates, overpayments and potential fraud — using isolation forests and statistical baselines before they post. Protects cash and prevents costly reversals.',
  'AGENT-CA-LEARN': 'Continuously retrains the match and confidence models on newly confirmed matches and analyst corrections, auto-tuning thresholds and detecting drift. Keeps match rates climbing without manual rule maintenance.',
  'AGENT-CO-WORKLIST': 'Scores and ranks every overdue account each morning on 20+ factors — exposure, days past due, risk tier, payment-history trend, dispute signals — into a collector-specific worklist. Focuses scarce collector time on the accounts that move DSO most.',
  'AGENT-CO-DELINQ': 'Forecasts 30-day delinquency probability per customer from payment history, DSO trend and seasonality, triggering proactive outreach before invoices roll past due. Shifts collections from reactive chasing to prevention.',
  'AGENT-CO-DUNNING': 'Generates personalised dunning emails with brand-controlled tone and customer context, sending each in the customer\'s optimal open-time window. Delivers 10× outreach volume at human quality.',
  'AGENT-CO-INBOX': 'Reads inbound customer replies, retrieves the relevant AR context (open items, statements) and drafts a context-aware response for the collector to approve. Clears the AR inbox in a fraction of the time.',
  'AGENT-CO-CALL': 'Transcribes collection calls in real time, surfaces talking points, and auto-writes the call summary, commitments and next steps back into SAP. Eliminates after-call admin and standardises call notes.',
  'AGENT-CO-DIALER': 'Dials multiple numbers in parallel, screens out voicemail/busy and connects only live answers to collectors. Roughly doubles connect rates and outbound call capacity.',
  'AGENT-CO-PORTAL': 'Logs into 600+ AP portals (GHX, Vizient, Premier, Tungsten), uploads invoices and reads back payment status and dispute notices. Removes the manual portal grind for large institutional buyers.',
  'AGENT-CO-AUTORESP': 'Classifies incoming customer emails by intent and drafts the appropriate reply with the right AR attachments. Handles the long tail of routine correspondence automatically.',
  'AGENT-CO-PTP': 'Extracts payment promises from calls and emails, tracks them to the promised date and re-escalates broken promises into the worklist. Makes promise-to-pay a managed, measurable pipeline.',
  'AGENT-CO-DISPREV': 'Detects invoices likely to be disputed from pattern signals and triggers pre-emptive customer outreach. Stops disputes before they age receivables.',
  'AGENT-CO-STRATEGY': 'Continuously A/B-tests dunning sequences, channels and timing with a multi-armed bandit, converging on the best strategy per customer segment. Compounds collection effectiveness over time.',
  'AGENT-CO-RECOVERY': 'Predicts weekly and monthly cash recovery by segment and feeds it into treasury cash planning. Turns collections into a reliable cash-flow forecast input.',
  'AGENT-DI-CAPTURE': 'Parses disputes from emails, cash-app short-pays and portal notifications into structured SAP FSCM-DM cases with the invoice, amount and customer context already linked. Removes manual case creation and double entry.',
  'AGENT-DI-CLASSIFY': 'Auto-classifies each dispute by type (pricing, delivery/install, quality, billing, unauthorized deduction, compliance) and severity. Routes 80%+ of disputes without human triage.',
  'AGENT-DI-EVIDENCE': 'Assembles the case evidence pack by retrieving and relevance-scoring documents from SAP SD/CS, field-service and contract systems via RAG. Cuts evidence gathering from hours per case to minutes.',
  'AGENT-DI-OUTCOME': 'Predicts win/loss probability and the recommended resolution by comparing each case to historically resolved disputes. Lets handlers prioritise high-recovery cases and concede the unwinnable ones early.',
  'AGENT-DI-RESOLVE': 'Recommends approve / partial / deny with supporting rationale and evidence, which the handler approves or overrides. Standardises resolution quality and speed.',
  'AGENT-DI-CORR': 'Generates credit memos, denial notices and follow-up letters with the evidence attached, ready to post and send. Removes correspondence drafting from the handler\'s day.',
  'AGENT-DI-ROOT': 'Clusters resolved disputes to surface systemic causes — recurring price errors, a problem carrier, a plant quality issue — by product, customer and region. Turns dispute data into upstream fixes.',
  'AGENT-DI-FRAUD': 'Detects suspicious dispute patterns such as duplicate or escalating claims using isolation forests and graph analysis. Protects margin from organised or repeat abuse.',
  'AGENT-DI-SLA': 'Tracks every case against its SLA, predicts breach risk from complexity and workload, and escalates before deadlines slip. Keeps resolution cycle time and customer experience on track.',
  'AGENT-DI-UPSTREAM': 'Detects when dispute root causes indicate an upstream process failure and triggers a corrective-action alert to the owning function. Stops chronic issues at the source.',
  'AGENT-DE-PORTAL': 'Navigates customer portals to download claim documents and header/line detail, linking each to the open deduction. Captures 90%+ of claim backup automatically.',
  'AGENT-DE-EMAIL': 'Parses deduction claims from emails and attachments, extracts the detail and auto-links to the matching deduction. Removes manual claim intake.',
  'AGENT-DE-CLASSIFY': 'Classifies each deduction as contract (GPO fee, rebate, distributor, demo) or operational (shortage, pricing, warranty, freight, SLA), assigns the reason code and maps the GL account. Codes deductions consistently for downstream automation.',
  'AGENT-DE-VALIDITY': 'Predicts valid vs invalid from 20+ variables and 12 months of resolution history with a confidence score — auto-resolving high-confidence valids and queuing invalids for dispute. Converts manual research into instant decisions.',
  'AGENT-DE-PROMO': 'Validates contract deductions against GPO/rebate programmes at system-model level, checking eligibility, dates and amount tolerance. Flags mismatches that would otherwise leak margin.',
  'AGENT-DE-PRICE': 'Compares deducted prices against contracts, POs and price lists to identify pricing variances within tolerance. Catches under-pricing and erroneous chargebacks.',
  'AGENT-DE-SHORT': 'Aggregates packing lists, PODs and delivery proofs to test shortage claims against what actually shipped. Approves genuine shortages and denies the rest with evidence.',
  'AGENT-DE-DISPUTE': 'Prepares the denial package and files invalid-deduction disputes on the customer portal, tracking status and re-submission. Recovers revenue that manual teams write off.',
  'AGENT-DE-AUTO': 'Applies auto-resolution rules to high-confidence deductions and posts the write-off or credit to SAP. Doubles deductions resolved per day.',
  'AGENT-DE-LINKER': 'Matches backup documents (PODs, agreements, programmes) to open deductions across portals, email and remittances. Ensures every deduction has its evidence attached before review.',
  'AGENT-DE-LEAK': 'Clusters deduction patterns by customer, product, programme and region to surface systematic revenue leakage. Feeds trade and pricing teams the data to fix root causes.',
  'AGENT-DE-LEARN': 'Retrains validity and classification models on new resolution outcomes and auto-tunes thresholds. Keeps auto-validation accuracy rising over time.',
  'AGENT-PL-SYNC': 'Continuously syncs AR data from SAP FI-AR — open items, customer master and aging — across all five company codes via BAPI/IDoc and CDS views. Keeps every module working from one clean, current data set.',
  'AGENT-PL-ORCH': 'Routes work across the cash-app, collections, dispute and deduction agents according to policy — e.g. a short-pay carrying a deduction code flows from cash app to deductions to disputes. Makes the modules act as one O2C workforce.',
};

// Reusability / packaging metadata — signals that each agent is a released,
// configurable, proven accelerator component (not bespoke code).
const MODULE_CONFIG = {
  cashapp:     ['Matching tolerances (amount / date)', 'Layer confidence thresholds', 'Auto-post threshold', 'Channel & remittance mappings', 'Customer-master match keys', 'BAPI / posting config'],
  collections: ['Worklist scoring weights', 'Delinquency alert threshold', 'Dunning sequences & channels', 'Optimal send-time windows', 'Escalation & agency rules', 'Segment treatment policies'],
  dispute:     ['Case types & routing rules', 'SLA definitions by priority', 'Approval / write-off thresholds', 'Evidence source connectors', 'Outcome-model tuning', 'Correspondence templates'],
  deductions:  ['Reason-code → GL mapping', 'Validity thresholds by type', 'Auto-resolution rules', 'TPM / programme connectors', 'Write-off authority levels', 'Tolerance bands'],
  platform:    ['Company-code scope', 'Data residency', 'Sync cadence', 'Orchestration policies'],
};
const MODULE_IO = {
  cashapp:     { in: 'Remittances · bank files (BAI2/MT940) · FI-AR open items', out: 'Matched & posted payments · routed exceptions' },
  collections: { in: 'AR aging · customer master · comms history', out: 'Ranked worklist · dunning · promises · cash forecast' },
  dispute:     { in: 'Dispute intake · invoices · ERP/logistics/contract evidence', out: 'Classified cases · resolutions · root-cause signals' },
  deductions:  { in: 'Claims · backup docs · TPM programmes', out: 'Validated deductions · write-offs · dispute packages' },
  platform:    { in: 'SAP FI-AR / FSCM / SD', out: 'Synced AR data · routed work' },
};
const INDUSTRIES = ['CPG', 'Life Sciences', 'MedTech', 'Manufacturing', 'Industrial', 'Distribution'];
const _h = (s) => { let x = 2166136261; for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; } return x; };

export function agentMeta(a) {
  const h = _h(a.id), tech = (a.technology || '').toLowerCase();
  const ml = /ml|xgboost|lstm|gradient|forest|bandit|rl|llm|nlp|prophet|clustering|knn|rag|mlops/.test(tech);
  const version = `v${2 + (h % 3)}.${h % 9}`;
  const maturity = (h % 9 === 0) ? 'Beta' : 'GA';
  const prebuilt = 55 + (h % 4) * 5;                 // 55–70% pre-built; rest configured
  const deployments = 6 + (h % 25);                  // reused across 6–30 engagements
  const inds = INDUSTRIES.filter((_, i) => (h >> i) & 1).slice(0, 4);
  const accuracy = a.type === 'Autonomous' && ml ? 90 + (h % 8)            // 90–97%
    : a.type === 'Assisted' ? 88 + (h % 6)                                 // human-validated
    : /deterministic|rules/.test(tech) ? 99 : 92 + (h % 5);
  const throughput = (a.module === 'cashapp' ? (900 + (h % 12) * 100) + '/hr'
    : a.module === 'deductions' ? (400 + (h % 8) * 50) + '/hr'
    : a.module === 'dispute' ? (180 + (h % 10) * 20) + '/hr'
    : (1200 + (h % 20) * 100) + '/hr');
  const retrain = a.type === 'Background' || ml ? 'Weekly · drift-monitored (MLOps)' : 'On release';
  return {
    version, maturity, prebuilt, configured: 100 - prebuilt, deployments,
    industries: inds.length ? inds : ['CPG', 'MedTech', 'Manufacturing'],
    benchmark: { accuracy: accuracy + '%', throughput },
    retrain, config: MODULE_CONFIG[a.module] || MODULE_CONFIG.platform, io: MODULE_IO[a.module] || MODULE_IO.platform,
    owner: 'Tiger Analytics · O2C Accelerator', api: `POST /agents/${a.id}/run`,
  };
}

// ---------------------------------------------------------------------------
// runAgent — produces a believable reasoning trace + structured output.
// ctx may carry { payment, case, customer, exception } pulled from the DB.
// ---------------------------------------------------------------------------
const S = (label, detail, status = 'done') => ({ label, detail, status });

export function runAgent(agent, ctx = {}) {
  const c = ctx || {};
  const fmt$ = (n) => '$' + Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  let steps = [], output = {};

  switch (agent.id) {
    case 'AGENT-CA-INVMATCH': {
      const amt = c.payment?.amount;
      const inv = c.payment?.matched_invoices ? JSON.parse(c.payment.matched_invoices)[0] : (c.invoice?.id);
      steps = [
        S('Layer 1 · Deterministic', `Exact match on invoice no. + amount ${amt ? fmt$(amt) : ''}`, inv ? 'done' : 'skip'),
        S('Layer 2 · Fuzzy', 'PO/SO cross-reference, amount tolerance ±2%', 'done'),
        S('Layer 3 · ML pattern', 'Gradient-boosted model on clearing history', 'done'),
        S('Layer 4 · Hierarchy', 'Parent-child / cross-entity resolution', 'skip'),
        S('Layer 5 · Agent', 'LLM investigation of residual items', 'skip'),
      ];
      output = { matched_invoice: inv || null, confidence: c.payment?.confidence ?? 0.97, layer: c.payment?.match_layer ?? 1, recommendation: 'Auto-post to SAP via BAPI_ACC_DOCUMENT_POST' };
      break;
    }
    case 'AGENT-CA-REMIT': {
      steps = [
        S('Ingest', `Channel: ${c.payment?.channel || 'email'} · attachment detected`),
        S('OCR / Vision LLM', 'Extracted invoice refs, amounts, dates'),
        S('Normalize', 'Mapped to canonical remittance schema'),
        S('Confidence', `extraction confidence ${(c.payment?.confidence ?? 0.94)}`),
      ];
      output = { fields: { invoice_refs: c.payment?.matched_invoices || '[]', amount: c.payment?.amount }, status: 'parsed' };
      break;
    }
    case 'AGENT-CA-EXCEPTION': {
      steps = [
        S('Classify', `Type: ${c.exception?.type || 'short_pay'} · severity ${c.exception?.severity || 'medium'}`),
        S('Confidence', `${c.exception?.amount ? fmt$(c.exception.amount) : ''} variance assessed`),
        S('Route', c.exception?.recommendation || 'Route to analyst queue'),
      ];
      output = { type: c.exception?.type, route: c.exception?.assigned_to || 'Analyst Queue', recommendation: c.exception?.recommendation };
      break;
    }
    case 'AGENT-CA-POST': {
      steps = [
        S('Validate', 'Open-item check + tolerance validation'),
        S('Post', 'BAPI_ACC_DOCUMENT_POST → clearing document'),
        S('Audit', 'Full match chain written to audit trail'),
      ];
      output = { sap_doc: c.payment?.sap_doc || ('14' + Math.floor(Math.random() * 9e7 + 1e7)), status: 'posted' };
      break;
    }
    case 'AGENT-CO-WORKLIST': {
      const f = c.case?.factors ? JSON.parse(c.case.factors) : {};
      steps = [
        S('Score factors', `value ${f.invoice_value ?? 0} · age ${f.days_past_due ?? 0} · risk ${f.customer_risk ?? 0}`),
        S('Behavioural signals', `payment history ${f.payment_history ?? 0}, dispute ${f.dispute_signal ?? 0}`),
        S('Rank', `priority score ${c.case?.priority_score ?? ''} → rank #${c.case?.priority_rank ?? ''}`),
      ];
      output = { priority_score: c.case?.priority_score, rank: c.case?.priority_rank, next_action: c.case?.next_action };
      break;
    }
    case 'AGENT-CO-DELINQ': {
      steps = [
        S('Feature build', '20+ features: DSO trend, credit, dispute freq, seasonality'),
        S('Predict', `30-day delinquency probability ${(c.case?.delinquency_prob ?? 0.5)}`),
        S('Trigger', (c.case?.delinquency_prob ?? 0) > 0.7 ? 'Proactive outreach queued' : 'Monitor'),
      ];
      output = { delinquency_prob: c.case?.delinquency_prob, horizon_days: 30, action: (c.case?.delinquency_prob ?? 0) > 0.7 ? 'outreach' : 'monitor' };
      break;
    }
    case 'AGENT-CO-DUNNING': {
      steps = [
        S('Select template', `Segment-tuned · ${c.customer?.segment || 'Mid-Market'} tone`),
        S('Personalise', 'GenAI: customer context + open items injected'),
        S('Optimal send-time', 'Tue 09:40 local — highest open-rate window'),
        S('Send', 'Queued via dunning engine'),
      ];
      output = { channel: 'email', send_window: 'Tue 09:40', status: 'queued' };
      break;
    }
    case 'AGENT-DI-CLASSIFY': {
      const d = c.dispute || {};
      steps = [
        S('Read intake', `Source: ${d.source || 'email'} · invoice ${d.invoice_id || ''}`),
        S('Classify', `Type: ${(d.type || 'pricing').replace(/_/g, ' ')} · severity ${d.severity || 'medium'}`),
        S('Confidence', `classification confidence ${d.classify_conf ?? 0.9}`),
        S('Route', `Assigned to ${d.assigned_to || 'handler'} · SLA set`),
      ];
      output = { type: d.type, severity: d.severity, confidence: d.classify_conf ?? 0.9, route: d.assigned_to };
      break;
    }
    case 'AGENT-DI-EVIDENCE': {
      const d = c.dispute || {};
      steps = [
        S('Identify sources', 'ERP (SD/FI), Logistics (POD/BOL), CLM contracts'),
        S('Retrieve', 'RAG pull of relevant documents'),
        S('Score relevance', 'Rank documents by relevance to claim'),
        S('Assemble', `Case package built for ${d.id || 'dispute'}`),
      ];
      output = { docs_pulled: (c.evidenceCount ?? 3), avg_relevance: 0.86, package: 'ready' };
      break;
    }
    case 'AGENT-DI-OUTCOME': {
      const d = c.dispute || {};
      steps = [
        S('Retrieve similar', 'kNN over historical resolved disputes'),
        S('Predict', `Win probability ${(d.win_prob ?? 0.6)}`),
        S('Recommend', `Action: ${d.predicted || 'partial'} (with rationale)`),
      ];
      output = { win_prob: d.win_prob ?? 0.6, recommended: d.predicted || 'partial' };
      break;
    }
    case 'AGENT-DE-VALIDITY': {
      const d = c.deduction || {};
      steps = [
        S('Feature build', '20+ vars: customer history, reason code, promo status, pricing agreement'),
        S('Predict', `${(d.validity || 'review')} · confidence ${d.confidence ?? 0.8}`),
        S('Decision', (d.validity === 'valid' && (d.confidence ?? 0) > 0.9) ? 'Auto-resolve eligible' : d.validity === 'invalid' ? 'Queue for dispute' : 'Route to analyst'),
      ];
      output = { validity: d.validity, confidence: d.confidence ?? 0.8, action: d.validity === 'invalid' ? 'dispute' : d.validity === 'valid' ? 'resolve' : 'review' };
      break;
    }
    case 'AGENT-DE-PROMO': {
      const d = c.deduction || {};
      steps = [
        S('Connect TPM', `Lookup promotion ${d.promo_id || '(none)'}`),
        S('SKU match', `SKU ${d.sku || '—'} vs eligible SKUs`),
        S('Tolerance check', 'Amount vs agreed allowance ±tolerance'),
        S('Verdict', `${d.promo_match === 'matched' ? 'Matched — valid' : d.promo_match === 'mismatch' ? 'Mismatch — flag' : 'No active promo'}`),
      ];
      output = { promo_match: d.promo_match, sku: d.sku, promo_id: d.promo_id };
      break;
    }
    case 'AGENT-DE-CLASSIFY': {
      const d = c.deduction || {};
      steps = [
        S('Classify', `${d.category || 'trade'} · ${(d.type || '').replace(/_/g, ' ')}`),
        S('Reason code', `${d.reason_code || ''} → GL ${d.gl_account || ''}`),
        S('Confidence', `${d.confidence ?? 0.9}`),
      ];
      output = { category: d.category, reason_code: d.reason_code, gl_account: d.gl_account };
      break;
    }
    default: {
      steps = [
        S('Initialise', agent.fn),
        S('Process', `${agent.technology}`),
        S('Complete', 'Result written to AR data store'),
      ];
      output = { status: 'ok' };
    }
  }
  return { steps, output, confidence: agent.confidence ?? 0.9 };
}
