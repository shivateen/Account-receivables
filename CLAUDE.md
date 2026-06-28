# O2C Accelerator — AR Transformation Platform

## Project Overview
This is Tiger Analytics' O2C (Order-to-Cash) Accelerator — a 60% pre-built / 40% customizable platform for enterprise AR transformation. SAP S/4HANA-first, targeting Fortune 500 and mid-market ($500M–$5B) clients.

## What Exists

### Active Build — `ar-platform/`  ⭐ THE APP
The AR Accelerator is a **real-backend, multi-app suite** under [`ar-platform/`](ar-platform/). Built to mirror the FinTran platform's structure (shell + iframe app-switcher), skinned in the FinTran dark / Tiger-orange design system. **This is the live product — not a single HTML file.**

- **Backend:** Node + Express + built-in `node:sqlite` (a real SQLite database at `server/data/ar.db`, no native deps). REST API under `/api/*`; serves the static front-end. Port 3100.
- **Run:** `cd ar-platform && npm install && npm start` → http://localhost:3100. First run auto-seeds the DB; `npm run seed` resets it.
- **All four modules built:** Cash Application, Collections, Dispute Management, Deductions Management cockpits + AR Command Center + Vision. (Phase 1 = Cash App + Collections; Phase 2 = Disputes + Deductions, now complete.)
- **Client demo = Accuray (NASDAQ: ARAY).** Synthetic data is modelled on Accuray's radiation-oncology capital-equipment business (CyberKnife/Radixact/TomoTherapy systems, service, parts; cancer centers / academic medical centers / health systems / government / distributors; Americas·EMEA·APAC·Japan·China; ~$78M AR, DSO ~69→50). Deductions are medical-relevant (GPO admin fee, rebates, distributor, demo, parts shortage, pricing, warranty, freight, uptime SLA); "trade promotions" reframed as **Rebate & GPO Programs**. Accelerator name/modules stay generic. All in `server/seed.js`.
- **Cross-module features:** every module has an **ROI** view (live benefit model from `/api/roi`, configurable assumptions in settings category `roi`), a **Process Map**, and rich **agent profiles** (`AGENT_DETAIL`/`MODULE_SAP` in `server/agents.js`, surfaced in the AI Workforce drawer). Shared renderers `UI.renderROI` / `UI.renderProcessMap` in `common.js`.
- **Process Map** = detailed AS-IS process (10–13 granular activities per module) in **persona swimlanes**, with a **process-stage band** + an **AI/HITL overlay band** on top: overarching boxes span the activities each agent owns; HITL steps amber; manual/external dashed. Data in `PROCESS_MAPS` (mode: `auto`/`hitl`/`manual`); overlay segments auto-derived by grouping consecutive same agent/mode. Goal: client recognises "this is my process, redefined by agents + HITL".
- **Process Map as-is ↔ AI toggle:** a segmented control flips the map between the pure manual baseline (single grey "performed manually" bar, neutral steps) and the AI-agent + HITL overlay — a reveal moment. State in `pmapMode` / localStorage `ar-pmap`.
- **Command Center → AR Process Map view:** an end-to-end O2C flow (Billing → Collections → Cash App → Disputes → Deductions → Analytics) with key activities + live stats; each module card deep-links into that module's detailed process map. Deep-link uses `postMessage({__navTo, __view})` → shell forwards `{__setView}` to the target iframe (each cockpit listens in boot).
- **KPI drill-down:** Command Center overview KPI cards are clickable → `openKPI()` drawer showing contributing sub-metrics (drivers) computed live from `/api/kpi/:key` ([server/routes/kpi.js](ar-platform/server/routes/kpi.js)), each expandable to a breakdown + an amber **root-cause** narrative. Each driver and the KPI itself carry a `link` ({app,view}) → drawer shows "Investigate in {Module}" buttons + a footer "Open in {Module}" that deep-links into the relevant individual app/view (closes the Command Center → app loop). KPI deltas are labelled month-over-month (`metrics.period`, "vs May 2026").
- **Backup documents / evidence** carry full synthetic metadata (filename, ref, source system, date, size, kind); both the **deduction** backup-docs and the **dispute** evidence rows open a faux "paper" preview (`UI.docPreview` / modal in `common.js`) with type-appropriate contents (per-type field builders `docFields` in deductions.js / `evDoc` in disputes.js).
- **Agent reusability metadata** (`agentMeta()` in `server/agents.js`, surfaced in the AI Workforce table + profile drawer): each agent carries a version, GA/Beta maturity, pre-built % vs configured % (60/40 model), reuse count across engagements + industries, accuracy/throughput benchmark, MLOps retrain cadence, I/O contract, invoke API, client-owned IP, and the list of configurable parameters (the 40% layer). The Workforce view also shows a roster-level reusability summary strip. These signal "reusable accelerator component", not bespoke code.
- **KPI drill-down is shared** (`UI.openKPI` + `UI.dchev`/`UI.wireKpis` in `common.js`): the Command Center overview AND each cockpit's overview KPI cards (`.kpi.clickable[data-kpi]`) open the same drill-down drawer (drivers → breakdown → root cause → "Investigate in {Module}" / "Open in {Module}" deep-links).
- **Collapsible panels:** left nav (→ icon-only) and right rail (→ hidden + reveal chevron) both collapse, persisted in localStorage and synced across iframes. `UI.initPanels()` injects the toggles; called in each app's boot.
- **Theme:** light default with dark toggle (synced across iframes via `storage` event).
- Seed is deterministic — `seed()` resets the PRNG, so fresh-seed and reseed produce identical data.
- See [`ar-platform/README.md`](ar-platform/README.md) for full architecture, API contract, and the demo script.

```
ar-platform/
├── server/   index.js · db.js · seed.js · agents.js · routes/{metrics,cashapp,collections,disputes,deductions,customers,agents,settings}.js
├── web/      index.html (shell) · app-{vision,command,cashapp,collections,disputes,deductions} · assets/{css,js}
└── tests/    smoke.mjs · interact.mjs   (headless puppeteer-core; needs Chrome + server on :3100)
```

### Reusable agent package — `ar-platform/agents/invoice-match/`
A **real, standalone, headless** reusable agent (`@tiger/o2c-invoice-match` v2.4.0) — the deterministic + fuzzy invoice-matching waterfall — built to prove "show me the reusable" to a client. Zero external services (pure Node). Has the five package artifacts: versioned code, an ERP-agnostic **contract** (`src/contract.js`, `MatchRequest → MatchResult`), a **config layer** (`config/default.json` + `config/client-b.json` = reuse-via-config, not a fork), **unit tests** (`node --test`, incl. a config-sensitivity test), and an **eval harness + golden set** (`node eval/run.js` → prints match-rate; 16/16 on default). Invoke headless via **CLI** (`node cli.js samples/payment-split.json`) or **HTTP** (`node server.js` → `POST /match[?config=]`). This is the implementation *behind* the UI's "Invoice Match Agent"; the README has the client demo script. Pattern/template for building the other agents as packages.

A second package, **`ar-platform/agents/remittance-capture/`** (`@tiger/o2c-remittance-capture` v1.3.0), parses email / EDI 820 / lockbox-CSV remittances → canonical structure. Pluggable extraction provider: `text` (offline, zero-dep) + `docintel` (Azure Document Intelligence port stub). Tests `node --test` (7), eval `node eval/run.js` (5/5, avg conf 0.81), CLI/HTTP headless. **`node pipeline-demo.js`** composes the two agents end-to-end (raw email → capture → invoice-match → auto-postable match) — the live two-agent "show me the reusables" demo. The two packages prove the contract-first / runtime-agnostic pattern (capture's `payment{}` output drops into match's `MatchRequest`).

**Build/edit conventions:**
- Front-end is vanilla JS, no build step. Shared design system in `web/assets/css/app.css`; shared helpers in `web/assets/js/{api,common}.js`; one JS module per cockpit.
- The running Node process caches `seed.js` / route modules in memory — **restart the server** after editing backend files (or hit `POST /api/settings/reseed` only for data, which re-runs the in-memory seed).
- Keep synthetic data tuned to realistic current-state KPIs (see Target KPIs below). Verify changes with `npm run test:smoke` / `npm run test:interact`.

### Product Spec Decks (requirements source)
- `Cash_Application_Accelerator_Product_Spec.pptx` — 28-slide Tiger branded deck
- `Collections_Management_Accelerator_Product_Spec.pptx` — 28-slide Tiger branded deck
- `Dispute_Management_Accelerator_Product_Spec.pptx` — 28-slide Tiger branded deck
- `Deductions_Management_Accelerator_Product_Spec.pptx` — 28-slide Tiger branded deck

To extract deck text without python-pptx: unzip the PPTX, read `ppt/slides/slideN.xml`, pull `<a:t>` elements.

### Reference Demos
- `o2c_finance_transformation_v5.html` — original single-page O2C diagnostic prototype (design/interaction reference).
- `ar_accelerator_v1.html` — earlier single-file AR sketch (teal/off-white). Superseded by `ar-platform/`.
- FinTran platform (`e:/TigerCowork/FinTran/`) — the structural blueprint that `ar-platform/` replicates (shell + apps, data layer, agent feed).

### Reference Videos & Datasheets
- `Cash Application/`, `Collections Management/`, `Credit Management/`, `Deductions Management/` — HighRadius datasheets + demo videos for competitive reference.

## Suite Surfaces (`web/`)

| Surface | Content |
|---|---|
| **Vision** (`app-vision`) | AR transformation future state — 4 maturity pillars (Intelligent Collections, Autonomous Cash Application, Predictive Dispute Resolution, AI-Driven Deductions), org design shift, working-capital prize, phased roadmap. Live hero KPIs. |
| **AR Command Center** (`app-command`) | Receivables control tower: live KPI towers, AR aging, working-capital view, module launchers, **AI Workforce** roster (46 agents, runnable), **Configure** (settings persisted to backend), **AR Copilot**. Persona switcher (CFO / AR Controller / Collections Lead / Cash App Lead). |
| **Cash Application** (`app-cashapp`) | Channel coverage, **5-layer matching waterfall**, payment queue → run-match → post-to-SAP, AI-routed exception queue. |
| **Collections** (`app-collections`) | AI **smart worklist**, **customer-360** case drawer (priority factors, delinquency prediction, dunning history, promises, calls), live dunning, aging & delinquency risk. |
| **Dispute Management** (`app-disputes`) | Case queue, **evidence-assembly** drawer (relevance-scored docs from SD/Logistics/CLM), **outcome prediction**, approve/partial/deny resolution, **root-cause** analytics. SAP FSCM-DM. |
| **Deductions Management** (`app-deductions`) | Validity-predicted queue, **trade-promo SKU matching**, TPM register, write-off vs dispute resolution, **revenue-leakage** analytics. SAP FSCM-DM + SD-TPM. |

## Design System (FinTran skin — dark / Tiger-orange)
- Dark default (`--bg #0d0e11`), light theme toggle. Tiger orange accent (`#F08C1E`), agent purple (`#8B6FC9`).
- Typography: Poppins (sans), JetBrains Mono (numerics/code). Hairline borders, no gradients, tabular numerics.
- All icons inline SVG (Lucide/Feather style), never emoji. Cards = background + hairline outline, no shadow. Pills/chips for status.
- Tokens + components live in `web/assets/css/app.css`; reusable JS UI (icons, formatters, charts, drawer, toast, agent-trace) in `web/assets/js/common.js`.

## Backend Data Model (`server/db.js`)
Tables: `customers, invoices, payments, exceptions, collection_cases, dunning_history, promises, call_logs, collectors, agents, agent_runs, settings, activity`. Complex fields stored as JSON text. KPIs are computed live from this data in `routes/metrics.js` (never hard-coded).

## AR Module Details

#### Collections Management
- 12 AI agents: Worklist Prioritizer, Delinquency Predictor, Smart Dunning, Promise-to-Pay Tracker, Virtual Call Assistant, AP Portal Upload Agent, etc.
- 5-stage workflow: Prioritize → Engage → Track → Resolve → Escalate (Segment is implicit upstream).
- SAP FSCM-COL integration; dunning program F150.

#### Cash Application
- 5-layer matching waterfall: Deterministic → Fuzzy → ML Prediction → Hierarchy (parent-child) → Agent investigation → Exception Queue.
- Key agents: Remittance Capture, Customer ID, Invoice Match, Exception Classifier, ERP Posting, Cash Forecast.
- SAP FI-AR posting (F-28, F-32 equivalents via BAPI_ACC_DOCUMENT_POST).

#### Dispute Management
- 5-stage workflow: Capture → Classify → Investigate → Resolve → Analyze
- 10 AI agents including Fraud Detection, Root Cause Analyzer, Upstream Alert Agent
- SAP FSCM-DM integration (UDM_DISPUTE_CREATE, UDM_DISPUTE_CHANGE)

#### Deductions Management
- 6-stage workflow: Capture → Classify → Validate → Match → Resolve → Analyze
- 12 AI agents including Portal Claim Download, Trade Promo Matching, Validity Predictor
- Trade vs. non-trade classification; TPM system integration

### Correct AR Process Order
Invoice → Collections → Customer pays → Cash Application → Disputes/Deductions

### SAP Tables for Configure Screen
Core AR: BSID, BSAD, BKPF, BSEG, KNA1, KNB1, KNKK
Billing: VBRK, VBRP, VBAK, VBAP
Logistics: LIKP, LIPS
Collections: UDM_COLLECTOR, F150 dunning
Disputes: UDM_DISPUTE_CASE
Change docs: CDHDR, CDPOS
Credit: KNKK, UKM_*
Payment terms: T052, T052S

### Competitive Landscape (for context)
Key SaaS players across modules: HighRadius, Billtrust, Esker, Serrala, BlackLine, Versapay, Sidetrade, Quadient, Kolleno, iNymbus, Transformance ClaimIQ

### Target KPIs (current-state → target; data is tuned to these)
- DSO: ~49 days → 35 days
- CEI (Collection Effectiveness Index): ~85% → 90%
- Auto-match rate (Cash App): ~52% → 85%
- Dispute resolution time: 25 days → 12 days (-52%)
- Deduction auto-validation: 0% → 40%+
- Net recovery rate: +30% improvement
- Unapplied cash: ~12–18% → 3%
- Touchless invoice rate: 62% → 88%
