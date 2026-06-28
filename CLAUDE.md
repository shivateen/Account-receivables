# O2C Accelerator — AR Transformation Platform

## Project Overview
This is Tiger Analytics' O2C (Order-to-Cash) Accelerator — a 60% pre-built / 40% customizable platform for enterprise AR transformation. SAP S/4HANA-first, targeting Fortune 500 and mid-market ($500M–$5B) clients.

## What Exists

### Product Spec Decks (completed)
- `Cash_Application_Accelerator_Product_Spec.pptx` — 28-slide Tiger branded deck
- `Collections_Management_Accelerator_Product_Spec.pptx` — 28-slide Tiger branded deck
- `Dispute_Management_Accelerator_Product_Spec.pptx` — 28-slide Tiger branded deck
- `Deductions_Management_Accelerator_Product_Spec.pptx` — 28-slide Tiger branded deck

### Reference Demo
- `o2c_finance_transformation_v5.html` — **THE REFERENCE APP.** 4,445-line single-page interactive prototype demonstrating the O2C diagnostic accelerator pattern. Study this file carefully — the new AR app must replicate its architecture, design system, and interaction patterns.

### Reference Videos & Datasheets
- `Cash Application/`, `Collections Management/`, `Credit Management/`, `Deductions Management/` — HighRadius datasheets + demo videos for competitive reference

## Current Task: Build the AR Accelerator Interactive App

### Architecture (replicate from o2c_finance_transformation_v5.html)
Single self-contained HTML file (~4,000-5,000 lines) with these surfaces:

| Nav Surface | Content |
|---|---|
| **Vision** | AR transformation future state — 4 maturity pillars (Intelligent Collections, Autonomous Cash Application, Predictive Dispute Resolution, AI-Driven Deductions), org design shift, working capital prize |
| **Diagnose** | Live AR signals with drill-down evidence chains — aging concentration, unapplied cash, delinquency spikes, dispute backlogs, deduction leakage |
| **Metrics** | AR KPI taxonomy — DSO, CEI, ADD, auto-match rate, dispute resolution rate, net recovery rate, deduction validity rate — with sparklines and variance analysis |
| **Agent** | AR-specific execution agents + conversational AI interface |
| **Roadmap** | 4-phase deployment: Trust Foundation → Collections + Cash App → Disputes + Deductions → Autonomous AR |
| **Configure** | SAP AR trust foundation — FI-AR tables, FSCM integration, reconciliation harness |

### Design System (from the reference app)
- Warm off-white background (`#FAFAF7`) with dark mode support
- Hairline borders (0.5px), no shadows, no gradients
- Typography: Fraunces (serif headlines), Inter (sans body), JetBrains Mono (mono/code)
- Single accent color (teal-blue `#1E5F8E`)
- Agent-specific purple (`#6D4B9C`)
- Semantic colors: ok (green), warn (amber), alert (red)
- All icons inline SVG (Lucide/Feather style), never emoji
- Tabular numerics everywhere for financial data
- Cards distinguished by background + hairline outline, never shadow
- Pills/chips for status indicators

### Key Data Structures (follow the same pattern)
```javascript
const STATE = { page, selectedSignal, selectedMetric, theme, conversation }
const VISION = { pillars: [{id, name, desc, currentStage, targetStage, stages, gap}], prize }
const SIGNALS = { 'signal-id': {id, area, eyebrow, headline, body, kpis, evidence, recommendation} }
const ROADMAP = [{ phase, period, title, desc, items, prize }]
const EXECUTION_AGENTS = { 'agent-id': {id, name, desc, state, sapCalls, confidence, approvalClass} }
const METRICS = { areas: [{id, name, metrics: [{id, name, val, delta, spark, target}]}] }
const ORG_DESIGN = { today: {...}, future: {...}, narrative }
```

### AR Module Details

#### Collections Management
- 12 AI agents: Worklist Prioritizer, Dunning Optimizer, Promise-to-Pay Tracker, Virtual Call Assistant, AP Portal Upload Agent, etc.
- 5-stage workflow: Segment → Prioritize → Engage → Track → Escalate
- SAP FSCM-COL integration

#### Cash Application
- 5-layer matching waterfall: Exact → Fuzzy → Remittance Parse → ML Prediction → Exception Queue
- Key agents: Remittance Capture, Lockbox Parser, Multi-Invoice Matcher, Short-Pay Detector, On-Account Resolver
- SAP FI-AR posting (F-28, F-32 equivalents via BAPI)

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

### Target KPIs (for Metrics surface)
- DSO: 45 days → 35 days (-22%)
- CEI (Collection Effectiveness Index): 72% → 90%
- Auto-match rate (Cash App): 35% → 85%
- Dispute resolution time: 25 days → 12 days (-52%)
- Deduction auto-validation: 0% → 40%+
- Net recovery rate: +30% improvement
- Unapplied cash: 12% → 3%
- Touchless invoice rate: 62% → 88%
