# Tiger O2C · AR Accelerator

An enterprise-class **Order-to-Cash / Accounts Receivable** transformation platform, built as a
client-facing demo of the Tiger Analytics O2C Accelerator. SAP S/4HANA–shaped data, AI-agent
execution, and real posting actions — running on a **real backend** (Node + SQLite) with a static
front-end suite.

**Client context:** the synthetic data is modelled on **Accuray (NASDAQ: ARAY)** — a radiation-oncology
capital-equipment business (CyberKnife, Radixact, TomoTherapy systems + service & parts) selling to
cancer centers, academic medical centers, health systems, government and distributors across
Americas / EMEA / APAC / Japan / China. ~$78M open AR, DSO ~69→50, capital-equipment economics. The
accelerator *name* and module structure are generic; the *data and dollars* are Accuray-relevant.

**Every module also includes** an **ROI** view (live, configurable benefit model), a **Process Map**
(SAP swimlane by persona showing where AI agents intervene), and the **AI Workforce** roster where each
agent opens a full profile (how it works, SAP touchpoints, run trace).

This is the AR counterpart to the FinTran finance platform: same multi-app, shell-hosted structure,
skinned in the Tiger dark / orange design system.

---

## Quick start

```bash
cd ar-platform
npm install
npm start
# → open http://localhost:3100
```

On first run the SQLite database (`server/data/ar.db`) is created and seeded automatically with a
coherent synthetic AR book. To reset to a pristine demo state at any time: `npm run seed`
(or click **Reset demo data** in the Command Center → Configure).

**Requirements:** Node ≥ 22 (uses the built-in `node:sqlite` — no native build step, no external DB).

---

## What's in the suite

A persistent app-switcher bar (⌘1–⌘4) hosts five surfaces in iframes:

| # | Surface | What it does |
|---|---------|--------------|
| 1 | **Vision** | The transformation narrative — four maturity pillars, the org-design shift, the working-capital prize, the phased roadmap. Pulls live KPIs from the backend. |
| 2 | **AR Command Center** | Receivables control tower: live KPI towers (DSO, CEI, auto-match, unapplied cash…), AR aging, module launchers, the **AI Workforce** roster (46 agents), a configurable **settings** surface, and an on-device **AR Copilot**. Persona switcher (CFO / AR Controller / Collections Lead / Cash App Lead). |
| 3 | **Cash Application** | Remittance capture by channel, the **5-layer matching waterfall**, the payment queue with live **match agent** runs and one-click **post to SAP**, and an AI-routed exception queue. |
| 4 | **Collections** | The AI-prioritized **smart worklist**, a full **customer-360** case drawer (priority-factor breakdown, delinquency prediction, dunning history, promises, call logs), live **smart-dunning** sends, and aging / delinquency risk views. |
| 5 | **Dispute Management** | Case queue, the **evidence-assembly** drawer (relevance-scored docs from ERP/logistics/CLM), **outcome prediction**, approve/partial/deny resolution, and **root-cause** analytics. SAP FSCM-DM. |
| 6 | **Deductions Management** | Validity-predicted deduction queue, **trade-promotion SKU matching**, the TPM promotion register, write-off vs dispute resolution, and **revenue-leakage** analytics. SAP FSCM-DM + SD-TPM. |

---

## Architecture

```
ar-platform/
├── server/                     ← Node + Express + node:sqlite (the backend)
│   ├── index.js                ← Express app: REST API + static web host
│   ├── db.js                   ← SQLite schema + connection
│   ├── seed.js                 ← deterministic synthetic AR data generator
│   ├── agents.js               ← AR agent catalog + simulated reasoning engine
│   ├── routes/                 ← metrics · cashapp · collections · disputes · deductions · customers · agents · settings
│   └── data/ar.db              ← the database (generated, git-ignored)
├── web/                        ← static front-end suite (served by Express)
│   ├── index.html              ← shell / app-switcher
│   ├── app-vision.html
│   ├── app-command.html
│   ├── app-cashapp.html
│   ├── app-collections.html
│   ├── app-disputes.html
│   ├── app-deductions.html
│   └── assets/{css,js}         ← shared design system + api client + per-app logic
└── tests/                      ← headless (puppeteer) smoke + interaction tests
```

**Backend.** A real REST API over a real SQLite database. Endpoints under `/api/*` compute KPIs,
serve the payment queue / worklist / exceptions, run agents (returning a reasoning trace), post
payments to a simulated SAP, and persist user settings. See the route files for the full contract.

**Front-end.** Vanilla JS (no framework), inline SVG charts, one shared design system. Each cockpit
fetches live from the API and renders on demand. No build step.

**Agents.** 46 agents across Cash Application, Collections, Dispute and Deductions are catalogued in
the database. Running an agent produces a believable step-by-step reasoning trace against live data —
this is where a production deployment would wire in real ML models and Claude reasoning.

---

## REST API (selected)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/metrics` | Full AR KPI taxonomy + aging |
| GET | `/api/metrics/activity` | Live agent activity feed |
| GET | `/api/cashapp/summary` | Match rate, channel & waterfall breakdown |
| GET | `/api/cashapp/payments?status=` | Payment queue |
| POST | `/api/cashapp/payments/:id/match` | Run the Invoice Match Agent |
| POST | `/api/cashapp/payments/:id/post` | Post to SAP (returns clearing doc) |
| GET | `/api/collections/worklist` | AI-prioritized cases |
| GET | `/api/collections/cases/:id` | Customer-360 detail |
| POST | `/api/collections/cases/:id/dunning` | Send a dunning step |
| GET | `/api/disputes/cases` · `/api/disputes/summary` | Dispute queue / KPIs |
| POST | `/api/disputes/cases/:id/{classify,evidence,predict,resolve}` | Run agent / resolve dispute |
| GET | `/api/deductions/list` · `/api/deductions/promotions` | Deduction queue / TPM register |
| POST | `/api/deductions/:id/{validate,match,classify,resolve}` | Run agent / resolve deduction |
| GET | `/api/agents` · `/api/agents/:id/run` | Roster / run an agent |
| GET | `/api/roi` | Per-module + total ROI, computed from the book + assumptions |
| GET | `/api/agents/:id` | Agent profile (detail, SAP touchpoints, run history) |
| GET·PUT | `/api/settings` | Read / update configuration (incl. ROI assumptions) |
| POST | `/api/settings/reseed` | Reset demo data (deterministic) |

---

## Demo script (≈ 8 minutes)

1. **Vision** — open on the narrative; the hero KPIs are live from the book. Click *Open the AR Command Center*.
2. **Command Center** — walk the KPI towers (DSO 49→35, auto-match 52→85%). Switch persona to *CFO* → *Cash App Lead* to re-frame. Open **Working Capital** for the DSO-reduction prize. Open **AI Workforce** and *run* an agent to show the reasoning trace. Ask the **Copilot**: "how much is past due?".
3. **Cash Application** — show the **matching waterfall**, then the **payment queue**. Open an unmatched payment → *Run match agent* (trace) → *Post to SAP* (clearing doc). Show the **exception queue** and resolve one with the recommended action.
4. **Collections** — open the **smart worklist** (ranked on 20+ factors). Open the top case → walk the **priority-factor breakdown**, **delinquency prediction**, dunning history and promises → *Send dunning* (live agent) and *Log promise*.
5. **Disputes** — open a case → *Assemble* the evidence package (relevance-scored docs), *Predict* the outcome, then *Approve / Partial / Deny*. Show **Root Cause** to connect disputes to upstream failures.
6. **Deductions** — open a deduction → *Validity Predictor* (valid/invalid/review), *Match SKU* against the trade promotion, then *Approve write-off* or *Dispute (invalid)*. Show **Revenue Leakage** by customer.
7. **Configure** — change a matching threshold or toggle auto-dunning; note it persists to the backend (the 40% that's the client's).

---

## Testing

```bash
npm run test:smoke      # loads every app, clicks every view, checks for runtime errors
npm run test:interact   # exercises drawers, agent runs, posting, dunning, settings
```
(Headless; expects Google Chrome installed and the server running on :3100.)

---

*Tiger Analytics — O2C Transformation Platform · AR Accelerator v1 · All four modules live (Cash Application · Collections · Disputes · Deductions)*
