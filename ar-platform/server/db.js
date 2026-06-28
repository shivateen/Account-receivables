// ---------------------------------------------------------------------------
// db.js — SQLite (node:sqlite, built-in) schema + connection for the AR platform
// One real database file at server/data/ar.db. No native deps.
// ---------------------------------------------------------------------------
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdirSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, 'data');
mkdirSync(DATA_DIR, { recursive: true });

export const DB_PATH = join(DATA_DIR, 'ar.db');
export const db = new DatabaseSync(DB_PATH);

db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// ---------------------------------------------------------------------------
// Schema — created once if absent. Complex/variable fields stored as JSON text.
// ---------------------------------------------------------------------------
export function initSchema() {
  db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    sap_id       TEXT,
    segment      TEXT,            -- Enterprise / Mid-Market / SMB
    industry     TEXT,
    region       TEXT,
    risk_tier    TEXT,            -- Low / Medium / High / Critical
    risk_score   INTEGER,         -- 0-100
    credit_limit REAL,
    credit_used  REAL,
    payment_terms TEXT,           -- NET30 etc
    dso          INTEGER,
    parent_id    TEXT,
    contact_name TEXT,
    contact_email TEXT,
    portal       TEXT,            -- Ariba / Coupa / Tungsten / none
    created_at   TEXT
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id            TEXT PRIMARY KEY,
    doc_number    TEXT,
    customer_id   TEXT REFERENCES customers(id),
    amount        REAL,
    open_amount   REAL,
    currency      TEXT,
    issue_date    TEXT,
    due_date      TEXT,
    status        TEXT,           -- open / partial / paid / disputed
    aging_bucket  TEXT,           -- current / 1-30 / 31-60 / 61-90 / 90+
    days_past_due INTEGER,
    company_code  TEXT,
    business_area TEXT,
    po_number     TEXT
  );

  CREATE TABLE IF NOT EXISTS payments (
    id            TEXT PRIMARY KEY,
    bank_ref      TEXT,
    customer_id   TEXT REFERENCES customers(id),
    customer_hint TEXT,           -- raw payer string before identification
    amount        REAL,
    currency      TEXT,
    value_date    TEXT,
    channel       TEXT,           -- email / EDI / lockbox / ACH / wire / portal / check
    remittance_raw TEXT,          -- raw remittance text/snippet
    status        TEXT,           -- unmatched / matched / exception / posted
    match_layer   INTEGER,        -- 1..5 which waterfall layer resolved it (null if unresolved)
    confidence    REAL,           -- 0..1
    matched_invoices TEXT,        -- JSON array of invoice ids
    sap_doc       TEXT,           -- SAP clearing doc once posted
    posted_at     TEXT,
    received_at   TEXT
  );

  CREATE TABLE IF NOT EXISTS exceptions (
    id            TEXT PRIMARY KEY,
    payment_id    TEXT REFERENCES payments(id),
    customer_id   TEXT REFERENCES customers(id),
    type          TEXT,           -- short_pay / missing_remittance / deduction / data_mismatch / overpayment
    severity      TEXT,           -- low / medium / high
    amount        REAL,
    assigned_to   TEXT,
    sla_due       TEXT,
    status        TEXT,           -- open / in_progress / resolved
    recommendation TEXT,
    resolution    TEXT,
    created_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS collection_cases (
    id             TEXT PRIMARY KEY,
    customer_id    TEXT REFERENCES customers(id),
    total_past_due REAL,
    oldest_days    INTEGER,
    risk_score     INTEGER,
    priority_rank  INTEGER,
    priority_score REAL,
    assigned_to    TEXT,
    strategy       TEXT,          -- dunning strategy id/name
    stage          TEXT,          -- Prioritize/Engage/Track/Resolve/Escalate
    sla_status     TEXT,          -- on_track / at_risk / breached
    next_action    TEXT,
    next_action_due TEXT,
    delinquency_prob REAL,        -- 30-day predicted delinquency probability
    factors        TEXT,          -- JSON: scoring factor breakdown
    created_at     TEXT
  );

  CREATE TABLE IF NOT EXISTS dunning_history (
    id          TEXT PRIMARY KEY,
    case_id     TEXT REFERENCES collection_cases(id),
    customer_id TEXT REFERENCES customers(id),
    step        INTEGER,
    channel     TEXT,             -- email / call / sms / portal / letter
    sent_at     TEXT,
    subject     TEXT,
    response    TEXT,             -- none / opened / replied / promised / paid / disputed
    outcome     TEXT
  );

  CREATE TABLE IF NOT EXISTS promises (
    id           TEXT PRIMARY KEY,
    case_id      TEXT REFERENCES collection_cases(id),
    customer_id  TEXT REFERENCES customers(id),
    promise_date TEXT,
    amount       REAL,
    status       TEXT,            -- pending / kept / broken / partial
    captured_from TEXT,           -- call / email
    created_at   TEXT
  );

  CREATE TABLE IF NOT EXISTS call_logs (
    id          TEXT PRIMARY KEY,
    case_id     TEXT REFERENCES collection_cases(id),
    customer_id TEXT REFERENCES customers(id),
    collector   TEXT,
    ts          TEXT,
    duration    INTEGER,          -- seconds
    summary     TEXT,
    commitments TEXT,
    sentiment   TEXT
  );

  CREATE TABLE IF NOT EXISTS collectors (
    id            TEXT PRIMARY KEY,
    name          TEXT,
    active_cases  INTEGER,
    capacity      INTEGER,
    specialization TEXT,
    performance   INTEGER,        -- 0-100 CEI-like score
    recovered_mtd REAL
  );

  CREATE TABLE IF NOT EXISTS agents (
    id          TEXT PRIMARY KEY,
    module      TEXT,             -- cashapp / collections / dispute / deductions / platform
    name        TEXT,
    type        TEXT,             -- Autonomous / Assisted / Background
    fn          TEXT,             -- function description
    technology  TEXT,
    state       TEXT,             -- idle / active / learning
    confidence  REAL,
    runs_today  INTEGER,
    approval_class TEXT           -- auto / review / hitl
  );

  CREATE TABLE IF NOT EXISTS agent_runs (
    id        TEXT PRIMARY KEY,
    agent_id  TEXT REFERENCES agents(id),
    ts        TEXT,
    input     TEXT,
    steps     TEXT,               -- JSON array of reasoning steps
    output    TEXT,               -- JSON result
    status    TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key        TEXT PRIMARY KEY,
    value      TEXT,              -- JSON
    category   TEXT,
    label      TEXT,
    updated_at TEXT
  );

  CREATE TABLE IF NOT EXISTS activity (
    id      INTEGER PRIMARY KEY AUTOINCREMENT,
    ts      TEXT,
    module  TEXT,
    actor   TEXT,                 -- agent id or user
    kind    TEXT,                 -- info / act / flag / done
    message TEXT,
    detail  TEXT
  );

  -- ===== Phase 2: Dispute Management =====
  CREATE TABLE IF NOT EXISTS disputes (
    id            TEXT PRIMARY KEY,
    customer_id   TEXT REFERENCES customers(id),
    invoice_id    TEXT REFERENCES invoices(id),
    type          TEXT,           -- pricing / shipping / quality / billing / unauthorized_deduction / compliance
    severity      TEXT,           -- low / medium / high
    status        TEXT,           -- open / investigating / resolved / denied
    stage         TEXT,           -- Capture / Classify / Investigate / Resolve / Analyze
    amount        REAL,
    source        TEXT,           -- email / short_pay / portal / call / deduction
    assigned_to   TEXT,
    sla_due       TEXT,
    sla_status    TEXT,           -- on_track / at_risk / breached
    win_prob      REAL,           -- predicted win probability
    predicted     TEXT,           -- recommended resolution (approve/deny/partial)
    classify_conf REAL,           -- auto-classification confidence
    root_cause    TEXT,           -- cause code/category
    resolution    TEXT,
    resolved_amount REAL,
    created_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS dispute_evidence (
    id          TEXT PRIMARY KEY,
    dispute_id  TEXT REFERENCES disputes(id),
    doc_type    TEXT,             -- invoice / POD / BOL / contract / price_list / correspondence / QA_report
    source      TEXT,             -- SAP SD / Logistics / CLM / Email
    ref         TEXT,
    relevance   REAL,             -- 0..1 relevance score
    status      TEXT              -- pulled / pending
  );

  -- ===== Phase 2: Deductions Management =====
  CREATE TABLE IF NOT EXISTS deductions (
    id            TEXT PRIMARY KEY,
    customer_id   TEXT REFERENCES customers(id),
    invoice_id    TEXT REFERENCES invoices(id),
    category      TEXT,           -- trade / non-trade
    type          TEXT,           -- promo_allowance / rebate / coop_ad / slotting / shortage / pricing_variance / quality / freight / otif
    reason_code   TEXT,
    gl_account    TEXT,
    amount        REAL,
    validity      TEXT,           -- valid / invalid / review
    confidence    REAL,           -- validity prediction confidence
    status        TEXT,           -- open / validating / matched / resolved / disputed
    stage         TEXT,           -- Capture / Classify / Validate / Match / Resolve / Analyze
    source        TEXT,           -- portal / email / remittance / EDI
    assigned_to   TEXT,
    promo_id      TEXT,           -- linked trade promotion (trade only)
    promo_match   TEXT,           -- matched / mismatch / no_promo / n/a
    sku           TEXT,
    backup_docs   TEXT,           -- JSON array of captured backup doc types
    resolution    TEXT,
    recovered     REAL,           -- amount recovered (invalid deductions denied)
    created_at    TEXT
  );

  CREATE TABLE IF NOT EXISTS trade_promotions (
    id            TEXT PRIMARY KEY,
    customer_id   TEXT REFERENCES customers(id),
    name          TEXT,
    skus          TEXT,           -- JSON array
    start_date    TEXT,
    end_date      TEXT,
    agreed_amount REAL,
    accrued       REAL,
    accrual_status TEXT,          -- open / settled / over-accrued
    status        TEXT            -- active / expired
  );
  `);
}

// Convenience helpers --------------------------------------------------------
export const all  = (sql, ...p) => db.prepare(sql).all(...p);
export const get  = (sql, ...p) => db.prepare(sql).get(...p);
export const run  = (sql, ...p) => db.prepare(sql).run(...p);

export function logActivity(module, actor, kind, message, detail = '') {
  run(
    `INSERT INTO activity (ts, module, actor, kind, message, detail) VALUES (?,?,?,?,?,?)`,
    new Date().toISOString(), module, actor, kind, message, typeof detail === 'string' ? detail : JSON.stringify(detail)
  );
}

export function isSeeded() {
  try {
    const r = get(`SELECT COUNT(*) AS n FROM customers`);
    return r && r.n > 0;
  } catch { return false; }
}
