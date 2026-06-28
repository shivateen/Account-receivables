// ---------------------------------------------------------------------------
// engine.js — deterministic + fuzzy invoice-matching waterfall.
// Pure functions, no I/O, no external services. Behaviour is driven by config.
// ---------------------------------------------------------------------------

// Normalise a reference: upper, alphanumeric only, strip leading zeros.
export function normRef(s) {
  if (s == null) return '';
  const t = String(s).toUpperCase().replace(/[^A-Z0-9]/g, '').replace(/^0+(?=.)/, '');
  return t;
}

// Bounded Levenshtein edit distance.
export function lev(a, b) {
  a = a || ''; b = b || '';
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (Math.abs(m - n) > 3) return 99;
  const dp = Array.from({ length: m + 1 }, (_, i) => i);
  for (let j = 1; j <= n; j++) {
    let prev = dp[0]; dp[0] = j;
    for (let i = 1; i <= m; i++) {
      const tmp = dp[i];
      dp[i] = Math.min(dp[i] + 1, dp[i - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[m];
}

const within = (a, b, pct, abs) => { const d = Math.abs(a - b); return d <= abs || d <= Math.abs(b) * pct; };
const daysBetween = (d1, d2) => { if (!d1 || !d2) return null; return Math.abs((new Date(d1) - new Date(d2)) / 86400000); };

function collectRefs(p) {
  const r = [];
  if (Array.isArray(p.references)) r.push(...p.references);
  if (Array.isArray(p.remittance_lines)) p.remittance_lines.forEach(l => { if (l.invoice_ref) r.push(l.invoice_ref); });
  return r.map(normRef).filter(Boolean);
}

// All subsets of size 2..maxSize (indices), guarded against explosion.
function subsetsUpTo(items, maxSize) {
  const out = [], n = items.length;
  if (n > 14) return out;            // platform routes very large candidate sets differently
  const rec = (start, size, acc) => {
    if (acc.length === size) { out.push(acc.slice()); return; }
    for (let i = start; i < n; i++) { acc.push(items[i]); rec(i + 1, size, acc); acc.pop(); }
  };
  for (let size = 2; size <= Math.min(maxSize, n); size++) rec(0, size, []);
  return out;
}

export function match(req, config) {
  const C = config, P = req.payment;
  const rationale = [];
  const inv = (req.open_invoices || []).filter(i =>
    (!P.currency || !i.currency || i.currency === P.currency) &&
    (!P.customer_id || !i.customer_id || i.customer_id === P.customer_id));
  if ((req.open_invoices || []).length && !inv.length) rationale.push('No candidate invoices after customer/currency scope');
  const refs = collectRefs(P);
  const tolOk = (a, b) => within(a, b, C.amount_tolerance_pct, C.amount_tolerance_abs);

  const build = (invs, type, layer, extra = {}) => {
    const ids = invs.map(i => i.id);
    const sum = invs.reduce((s, i) => s + i.open_amount, 0);
    const residual = +(P.amount - sum).toFixed(2);
    const conf = (C.layer_confidence && C.layer_confidence[layer]) ?? 0.7;
    const status = extra.short_pay ? 'partial' : (Math.abs(residual) <= Math.max(C.amount_tolerance_abs, 0.01) || residual > 0 ? 'matched' : 'partial');
    if (extra.note) rationale.push(extra.note);
    return {
      payment_id: P.id, status, match_type: type, layer, confidence: +conf.toFixed(2),
      matched_invoices: ids, applied_amount: +Math.min(P.amount, sum).toFixed(2), residual,
      short_pay: !!extra.short_pay, deduction: extra.deduction || 0,
      auto_post: conf >= C.auto_post_threshold && status === 'matched', rationale: rationale.slice(),
    };
  };

  // L1 — exact by reference (+ amount)
  const refHits = inv.filter(i => refs.includes(normRef(i.doc_number)) || (i.po_number && refs.includes(normRef(i.po_number))));
  if (refHits.length === 1 && tolOk(P.amount, refHits[0].open_amount)) {
    rationale.push(`L1 exact — reference ${refHits[0].doc_number} matched, amount within tolerance`);
    return build(refHits, 'exact_single', 'exact');
  }
  if (refHits.length > 1) {
    const sum = refHits.reduce((s, i) => s + i.open_amount, 0);
    if (tolOk(P.amount, sum)) { rationale.push(`L1 exact — ${refHits.length} referenced invoices sum to payment`); return build(refHits, 'exact_multi', 'exact'); }
  }

  // L2 — fuzzy reference (edit distance ≤ config) (+ amount)
  for (const i of inv) {
    const d = refs.length ? Math.min(...refs.map(r => lev(r, normRef(i.doc_number)))) : 99;
    if (d <= C.reference_fuzzy_max_distance && tolOk(P.amount, i.open_amount)) {
      rationale.push(`L2 fuzzy — reference ~${i.doc_number} (edit distance ${d}), amount within tolerance`);
      return build([i], 'fuzzy_reference', 'reference');
    }
  }

  // L3 — amount (+ date proximity) single invoice
  const amtHits = inv.filter(i => tolOk(P.amount, i.open_amount));
  if (amtHits.length) {
    amtHits.sort((a, b) => {
      const da = Math.abs(P.amount - a.open_amount) - Math.abs(P.amount - b.open_amount);
      if (da !== 0) return da;
      const ya = daysBetween(P.value_date, a.due_date) ?? 9e9, yb = daysBetween(P.value_date, b.due_date) ?? 9e9;
      return ya - yb;
    });
    const i = amtHits[0], dd = daysBetween(P.value_date, i.due_date);
    rationale.push(`L3 amount+date — invoice ${i.doc_number} amount within tolerance${dd != null ? `, ${Math.round(dd)}d from due date` : ''}`);
    return build([i], 'amount_date', 'amount_date');
  }

  // L4 — split / subset-sum
  let best = null;
  for (const s of subsetsUpTo(inv, C.max_split_invoices)) {
    const sum = s.reduce((a, i) => a + i.open_amount, 0);
    if (tolOk(P.amount, sum) && (!best || s.length < best.length)) best = s;
  }
  if (best) { rationale.push(`L4 split — ${best.length} invoices sum to payment within tolerance`); return build(best, 'split', 'split'); }

  // L5 — short-pay (single invoice slightly under, within band → deduction)
  for (const i of inv) {
    if (P.amount < i.open_amount) {
      const ded = +(i.open_amount - P.amount).toFixed(2);
      if (ded / i.open_amount <= C.short_pay_band_pct) {
        return build([i], 'short_pay', 'short_pay', { short_pay: true, deduction: ded, note: `L5 short-pay — ${ded} deduction on ${i.doc_number} (within ${(C.short_pay_band_pct * 100).toFixed(0)}% band)` });
      }
    }
  }

  // Exception
  rationale.push('No confident match — routed to exception queue (Exception Classifier)');
  return {
    payment_id: P.id, status: 'exception', match_type: 'unmatched', layer: 'X', confidence: 0.2,
    matched_invoices: [], applied_amount: 0, residual: +P.amount.toFixed(2), short_pay: false, deduction: 0,
    auto_post: false, rationale,
  };
}
