// ---------------------------------------------------------------------------
// engine.js — parse remittance TEXT (from any channel) into a canonical
// Remittance. Pure, no I/O. The OCR/vision step (binary → text) is the provider
// port; this is the structuring + normalization the agent owns.
// ---------------------------------------------------------------------------

const MONTHS = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };

function parseMoney(s) { if (s == null) return null; const n = parseFloat(String(s).replace(/[^0-9.]/g, '')); return isFinite(n) ? n : null; }

function normDate(s) {
  if (!s) return null;
  let m;
  if ((m = s.match(/\b(\d{4})-(\d{2})-(\d{2})\b/))) return `${m[1]}-${m[2]}-${m[3]}`;
  if ((m = s.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{2,4})\b/))) { const y = m[3].length === 2 ? '20' + m[3] : m[3]; return `${y}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`; }
  if ((m = s.match(/\b(\d{1,2})[ -]([A-Za-z]{3})[ -](\d{4})\b/))) { const mm = MONTHS[m[2].toLowerCase()]; if (mm) return `${m[3]}-${mm}-${String(m[1]).padStart(2, '0')}`; }
  if ((m = s.match(/\b([A-Za-z]{3})[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/))) { const mm = MONTHS[m[1].toLowerCase()]; if (mm) return `${m[3]}-${mm}-${String(m[2]).padStart(2, '0')}`; }
  return null;
}

const AMOUNT_RE = /(?:USD|EUR|GBP|\$|€|£)?\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})\b/g;
const REF_LABELLED = /(?:invoice|inv|doc(?:ument)?|ref(?:erence)?)\s*(?:no\.?|num(?:ber)?|#|:)?\s*([A-Z0-9][A-Z0-9-]{4,})/gi;
const REF_BARE = /\b(9\d{7}|[A-Z]{2,4}-\d{3,})\b/g;

function detectChannel(text) {
  if (/ST\*820|RMR\*|ISA\*|TRN\*/.test(text)) return 'edi';
  const first = (text.trim().split(/\r?\n/)[0] || '').trim();
  // a real CSV header: only field-name tokens + commas (no amounts, $, long prose)
  if (/^[a-z][a-z_ ]*(,\s*[a-z][a-z_ ]*)+$/i.test(first) && /invoice|amount|inv|doc/i.test(first)) return 'lockbox';
  if (/^(from:|subject:|dear|hi[ ,]|hello)/im.test(text)) return 'email';
  return 'text';
}

function detectCurrency(text) {
  if (/€|\bEUR\b/.test(text)) return 'EUR';
  if (/£|\bGBP\b/.test(text)) return 'GBP';
  return 'USD';
}

export function parse(text, channelHint) {
  text = String(text || '');
  const channel = channelHint || detectChannel(text);
  const currency = detectCurrency(text);
  const rationale = [`channel: ${channel}`, `currency: ${currency}`];
  const lines = text.split(/\r?\n/);
  const remLines = [];
  const refsAll = [];

  if (channel === 'edi') {
    for (const seg of text.split(/[~\n]/)) {
      const m = seg.match(/^RMR\*\w*\*([A-Z0-9]+)\*\w*\*?([\d.]+)/i);
      if (m) { remLines.push({ invoice_ref: m[1], amount: parseMoney(m[2]) }); refsAll.push(m[1]); }
    }
    rationale.push(`EDI 820: ${remLines.length} RMR remittance segments`);
  } else {
    // CSV: only strip a header row when we actually detected a lockbox/CSV
    const isCsv = channel === 'lockbox';
    const body = isCsv ? lines.slice(1) : lines;
    for (const ln of body) {
      if (!ln.trim()) continue;
      const refM = ln.match(/\b(9\d{7}|[A-Z]{2,4}-\d{3,})\b/) || (REF_LABELLED.exec(ln) && (REF_LABELLED.lastIndex = 0, ln.match(REF_LABELLED)));
      let ref = null;
      const bare = ln.match(/\b(9\d{7}|[A-Z]{2,4}-\d{3,})\b/);
      if (bare) ref = bare[1];
      const amts = [...ln.matchAll(AMOUNT_RE)].map(a => parseMoney(a[1])).filter(v => v != null);
      const amt = amts.length ? amts[amts.length - 1] : null;   // amount usually last token on a line
      if (ref && amt != null) { remLines.push({ invoice_ref: ref, amount: amt }); refsAll.push(ref); }
      else if (ref) refsAll.push(ref);
    }
  }

  // also collect any labelled refs anywhere (dedup)
  let m; while ((m = REF_LABELLED.exec(text))) refsAll.push(m[1]);
  REF_LABELLED.lastIndex = 0;
  // real references contain a digit and are long enough (drops words like "OICES" from "invoices")
  const references = [...new Set(refsAll.map(r => r.toUpperCase()))].filter(r => /\d/.test(r) && r.length >= 4);

  // total amount
  let total = null, totalSrc = '';
  let t;
  if ((t = text.match(/TRN\*\d*\*([\d.]+)/i))) { total = parseMoney(t[1]); totalSrc = 'edi-trn'; }
  if (total == null && (t = text.match(/(?:payment of|payment amount|amount paid|remittance total|total\b[^\n:]*:?)\s*(?:USD|EUR|GBP|\$|€|£)?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2})?|\d+\.\d{2})/i))) { total = parseMoney(t[1]); totalSrc = 'labelled'; }
  const lineSum = +remLines.reduce((s, l) => s + (l.amount || 0), 0).toFixed(2);
  if (total == null && remLines.length) { total = lineSum; totalSrc = 'sum-of-lines'; }
  if (total == null) { const all = [...text.matchAll(AMOUNT_RE)].map(a => parseMoney(a[1])).filter(Boolean); total = all.length ? Math.max(...all) : null; totalSrc = 'largest'; }
  const reconciled = remLines.length > 0 && total != null && Math.abs(lineSum - total) <= 1;
  rationale.push(`total ${total} (${totalSrc})${reconciled ? ' · reconciles to line sum ✓' : ''}`);

  // value date
  let valueDate = null;
  if ((t = text.match(/(?:value date|payment date|paid on|date)\D{0,12}?(\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4})/i))) valueDate = normDate(t[1]);
  if (!valueDate) { const d = text.match(/\b\d{4}-\d{2}-\d{2}\b|\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/); if (d) valueDate = normDate(d[0]); }

  // payer — prefer an explicit remitter/payer/customer label over the email "From:"
  let payer = null, pm;
  if ((pm = text.match(/(?:remitter|payer|customer|bill[- ]?to)\s*:?\s*([A-Z][A-Za-z0-9 .,&'-]{3,60})/i))) payer = pm[1];
  else if ((pm = text.match(/^from\s*:?\s*([A-Z][A-Za-z0-9 .,&'-]{3,60})/im))) payer = pm[1];
  if (payer) { payer = payer.trim().replace(/<.*$/, '').trim().replace(/[ ,.]+$/, ''); if (/@/.test(payer)) payer = null; }

  // confidence
  let c = 0.35;
  if (total != null) c += 0.15;
  if (valueDate) c += 0.15;
  if (references.length) c += 0.10;
  if (payer) c += 0.10;
  if (reconciled) c += 0.20;
  const confidence = +Math.min(0.99, c).toFixed(2);

  return {
    source_channel: channel,
    payer: { name: payer },
    payment: { amount: total, currency, value_date: valueDate, references, remittance_lines: remLines },
    confidence, reconciled,
    fields: {
      amount: { value: total, source: totalSrc },
      date: { value: valueDate },
      references: { count: references.length },
      lines: { count: remLines.length, sum: lineSum },
    },
    rationale,
  };
}
