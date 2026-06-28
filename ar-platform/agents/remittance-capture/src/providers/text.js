// Offline extraction provider — the remittance is already text (email body, EDI,
// pasted PDF/OCR output). Zero external services. This is the dev/demo default.
export const id = 'text';
export async function extract(req) {
  return { text: req.text != null ? String(req.text) : '', channel: req.channel || null, provider: id };
}
