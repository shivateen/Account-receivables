// ---------------------------------------------------------------------------
// contract.js — the agent's I/O contract (the interface a platform integrates).
// Canonical, ERP-agnostic shapes. Adapters (SAP/Oracle) map native data → this.
//
// INPUT  MatchRequest {
//   payment: {
//     id: string, amount: number, currency: string, value_date: 'YYYY-MM-DD',
//     customer_id?: string,
//     references?: string[],                 // any refs parsed from remittance (invoice nos, POs)
//     remittance_lines?: [{ invoice_ref?: string, amount?: number }]
//   },
//   open_invoices: [{
//     id: string, doc_number: string, customer_id?: string,
//     open_amount: number, currency: string, due_date?: 'YYYY-MM-DD', po_number?: string
//   }]
// }
//
// OUTPUT MatchResult {
//   payment_id, status: 'matched'|'partial'|'exception', match_type, layer,
//   confidence: 0..1, matched_invoices: string[], applied_amount, residual,
//   short_pay: bool, deduction: number, auto_post: bool, rationale: string[]
// }
// ---------------------------------------------------------------------------

export function validate(req) {
  const errs = [];
  if (!req || typeof req !== 'object') errs.push('request must be an object');
  const p = req && req.payment;
  if (!p) errs.push('payment is required');
  else {
    if (typeof p.id !== 'string') errs.push('payment.id must be a string');
    if (typeof p.amount !== 'number' || !isFinite(p.amount)) errs.push('payment.amount must be a number');
    if (typeof p.currency !== 'string') errs.push('payment.currency must be a string');
  }
  if (!Array.isArray(req && req.open_invoices)) errs.push('open_invoices must be an array');
  else req.open_invoices.forEach((i, k) => {
    if (typeof i.id !== 'string') errs.push(`open_invoices[${k}].id must be a string`);
    if (typeof i.open_amount !== 'number') errs.push(`open_invoices[${k}].open_amount must be a number`);
  });
  if (errs.length) { const e = new Error('contract validation failed: ' + errs.join('; ')); e.code = 'CONTRACT'; e.errors = errs; throw e; }
  return true;
}

export const CONTRACT = {
  name: '@tiger/o2c-invoice-match',
  capability: 'cash-application.invoice-match',
  input: 'MatchRequest', output: 'MatchResult',
  layers: ['exact', 'reference', 'amount_date', 'split', 'short_pay'],
};
