# @tiger/o2c-remittance-capture

A **reusable Cash Application agent** — remittance capture. Parses remittances from
**email, EDI 820, and lockbox/CSV** into one canonical structure that drops straight into
`@tiger/o2c-invoice-match`. Standalone, runtime-agnostic, config-driven.

**Pluggable extraction provider** (the OCR/vision port):
- `text` (default, **offline, zero deps**) — structures already-text remittances (email body, EDI, OCR output).
- `docintel` — **Azure AI Document Intelligence** adapter for binary PDFs / scanned images (a real port; needs `AZURE_DOCINTEL_*`). Swap for GCP Document AI / Textract by writing a sibling provider — the agent core never changes.

> The genuinely reusable, demonstrable-offline part is the structuring + normalization
> (text → canonical fields + confidence). The binary-OCR step is the provider port.

---

## The five package artifacts

| Artifact | Where |
|---|---|
| Versioned code | `package.json` → `v1.3.0`, `src/` |
| I/O contract | `src/contract.js` — `CaptureRequest → Remittance` (payment block feeds invoice-match) |
| Provider port | `src/providers/{text,docintel}.js` |
| Config | `config/default.json` |
| Tests + eval | `test/`, `eval/run.js` + `eval/golden.json` |

## Run it (headless)

```bash
cd agents/remittance-capture
npm test                # unit tests (7)
npm run eval            # extraction accuracy on the golden set  → 100%, avg conf 0.81
npm run demo            # CLI on samples/email.txt → canonical remittance JSON
node cli.js samples/edi820.txt        # EDI 820
node cli.js samples/lockbox.csv       # lockbox CSV
npm run serve           # HTTP API → POST /capture · GET /health · GET /contract
npm run pipeline        # ⭐ capture → invoice-match, end to end
```

```bash
# headless via REST — raw text in, structured remittance out
curl -s -X POST http://localhost:4601/capture --data-binary @samples/email.txt
```

## ⭐ The two-agent pipeline (`npm run pipeline`)

Composes two standalone reusable agents via their contracts — **no UI**:

```
raw email text → [Remittance Capture] → [Invoice Match] → posted, matched payment
```

```
── Stage 1 · Remittance Capture ──
channel email · payer "MD Anderson Cancer Center" · amount 165000 USD
refs ["90013100","90013101"] · lines 2 · confidence 0.99 · reconciles ✓

── Stage 2 · Invoice Match ──
status MATCHED · exact_multi (Lexact) · confidence 0.99 · auto-post true
matched ["INV-A","INV-B"] · applied 165000 · residual 0
```

That's the live "show me the reusables" demo: one email of text becomes a matched,
auto-postable payment, by two pre-built agents wired only through their contracts.

---

*Part of the Tiger O2C Accelerator · client-owned IP · `cash-application.remittance-capture` capability*
