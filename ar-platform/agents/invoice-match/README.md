# @tiger/o2c-invoice-match

A **reusable Cash Application agent** — the deterministic + fuzzy invoice-matching
waterfall — packaged as a standalone, runtime-agnostic, config-driven component of the
Tiger O2C Accelerator. **Zero external services**: pure Node, runs anywhere (local, Azure
Container Apps, GCP Cloud Run, AKS, a Lambda…). This is the *implementation behind* the
"Invoice Match Agent" you see in the AR Accelerator UI — the UI is just a thin client.

> This is what "show me the reusable" looks like: a versioned package, a defined contract,
> a config layer (the 40%), unit tests, and an offline eval that prints a match-rate.

---

## What it is (the five package artifacts)

| Artifact | Where |
|---|---|
| **Versioned code** | `package.json` → `v2.4.0`; `src/` |
| **I/O contract** | `src/contract.js` — canonical `MatchRequest → MatchResult`, ERP-agnostic |
| **Config layer (the 40%)** | `config/default.json`, `config/client-b.json` |
| **Tests + behavioural spec** | `test/engine.test.js` (`node --test`) |
| **Eval harness + golden set** | `eval/run.js`, `eval/golden.json` → prints match-rate |

The agent depends only on **interfaces/data**, never on a cloud SDK — so it's runtime-agnostic
by construction. An ERP **adapter** (SAP/Oracle) maps native data → the canonical `MatchRequest`;
the agent never knows which ERP it's running against.

---

## The matching waterfall

1. **L1 Deterministic** — reference (invoice no / PO) exact match + amount within tolerance (single or multi-invoice).
2. **L2 Fuzzy reference** — normalised refs, edit-distance ≤ config (handles off-by-one / formatting).
3. **L3 Amount + date** — amount within tolerance, ranked by amount then date proximity.
4. **L4 Split** — subset-sum: payment equals the sum of several invoices.
5. **L5 Short-pay** — payment slightly under an invoice within the deduction band → flags a deduction.
6. **Exception** — no confident match → routed to the Exception Classifier.

Every result carries `confidence`, `auto_post` (vs the `auto_post_threshold`), `residual`,
`deduction`, and a human-readable `rationale[]`.

---

## Run it (headless — no UI)

```bash
cd agents/invoice-match

npm test                 # unit tests (node --test)           → behavioural proof
npm run eval             # eval on the golden set (default)    → match-rate + auto-post precision
node eval/run.js client-b   # SAME package, a second client's config → reuse via config
npm run demo             # CLI on a sample payment             → JSON decision + rationale
cat req.json | node cli.js  # pipe a payment in headless
npm run serve            # HTTP API → POST /match · GET /health · GET /contract
```

```bash
# headless via REST — the same call the UI makes
curl -s -X POST http://localhost:4600/match \
  -H 'content-type: application/json' --data @samples/payment-split.json
# add ?config=client-b to run a different client's tuning, same package
```

---

## The config layer (the 40%) — tune, don't fork

Behaviour is driven entirely by config — **no code change, no per-client / per-ERP fork**:

```jsonc
{ "amount_tolerance_pct": 0.02, "amount_tolerance_abs": 50, "date_window_days": 5,
  "short_pay_band_pct": 0.20, "max_split_invoices": 4, "reference_fuzzy_max_distance": 1,
  "auto_post_threshold": 0.95, "layer_confidence": { "exact": 0.99, ... } }
```

`config/client-b.json` is the *same agent* with tighter tolerances — proof that reuse is a
config decision, not a second product. (Run `node eval/run.js client-b`: the borderline
rounding case correctly routes to exception under the stricter tuning.)

---

## Client demo script — "show me the reusable"

Run this engineering-to-engineering, decoupled from the UI:

1. **It exists & is engineered** — `npm test` (10 tests green), open `src/`, show `package.json` version.
2. **The numbers** — `npm run eval` → *100% on the golden set, 100% auto-post precision*, layer mix printed.
3. **Headless invocation** — `npm run serve`, then `curl POST /match` with a payment the client hands you → a decision + rationale, **no UI in the loop**.
4. **Config, not code** — re-run with `?config=client-b` (or `node eval/run.js client-b`): same package, different tuning, different decision.
5. **Tie back** — "the screen you saw just calls this endpoint." The intelligence lives in the package, not the UI.

That sequence proves the time-to-implement claim: the agent is **pre-built**; deployment =
write the ERP adapter + set config + connect data.

---

*Part of the Tiger O2C Accelerator · client-owned IP · `cash-application.invoice-match` capability*
