// Production extraction provider — Azure AI Document Intelligence (OCR/layout for
// binary PDFs & scanned images). This is the PORT: the agent core never changes;
// only this adapter does. Swap for GCP Document AI / Textract by writing a sibling.
//
// Wiring (when credentials are present): POST the document bytes to the
// prebuilt-invoice / layout model, get back text + key-value pairs, return text
// for the parser (or pre-parsed fields). Kept as a clearly-marked port so the
// architecture is provable without a key.
export const id = 'docintel';
export async function extract(req) {
  const endpoint = process.env.AZURE_DOCINTEL_ENDPOINT, key = process.env.AZURE_DOCINTEL_KEY;
  if (!endpoint || !key) {
    const e = new Error('Document Intelligence provider not configured. Set AZURE_DOCINTEL_ENDPOINT and AZURE_DOCINTEL_KEY, or use provider:"text" for offline text/OCR-output.');
    e.code = 'PROVIDER';
    throw e;
  }
  // Real implementation would call:
  //   POST {endpoint}/documentintelligence/documentModels/prebuilt-invoice:analyze
  //   header: Ocp-Apim-Subscription-Key: {key}; body: {base64Source: req.document.bytes_base64}
  //   → poll operation → read .content (text) + .fields
  // then return { text: result.content, channel: req.channel || 'pdf', provider: id, fields: result.fields }
  throw new Error('docintel.extract: live call not executed in this environment');
}
