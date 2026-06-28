// ---------------------------------------------------------------------------
// contract.js — Remittance Capture agent I/O contract.
//
// INPUT  CaptureRequest {
//   text?: string,            // remittance text (email body, EDI, pasted PDF/OCR text)
//   channel?: 'email'|'edi'|'lockbox'|'csv'|'text',
//   provider?: 'text'|'docintel'   // extraction provider (default 'text' = offline)
//   document?: { bytes_base64, mime }  // for the docintel/OCR provider (binary PDF/image)
// }
//
// OUTPUT Remittance {
//   source_channel, payer: { name },
//   payment: { amount, currency, value_date, references: string[],
//              remittance_lines: [{ invoice_ref, amount }] },
//   confidence: 0..1, reconciled: bool, fields: {...}, rationale: string[]
// }
//
// The payment{} block is shaped to drop straight into @tiger/o2c-invoice-match.
// ---------------------------------------------------------------------------

export function validate(req) {
  const errs = [];
  if (!req || typeof req !== 'object') errs.push('request must be an object');
  const provider = (req && req.provider) || 'text';
  if (provider === 'text' && (typeof req.text !== 'string' || !req.text.trim())) errs.push('text is required for provider "text"');
  if (provider === 'docintel' && !(req.document && req.document.bytes_base64)) errs.push('document.bytes_base64 is required for provider "docintel"');
  if (errs.length) { const e = new Error('contract validation failed: ' + errs.join('; ')); e.code = 'CONTRACT'; e.errors = errs; throw e; }
  return true;
}

export const CONTRACT = {
  name: '@tiger/o2c-remittance-capture',
  capability: 'cash-application.remittance-capture',
  input: 'CaptureRequest', output: 'Remittance',
  providers: ['text', 'docintel'],
};
