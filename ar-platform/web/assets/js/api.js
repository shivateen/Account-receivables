// api.js — thin REST client for the AR Accelerator backend.
// STATIC MODE (GitHub Pages / no backend): GETs read pre-baked JSON under
// ./api-static/, action POSTs are simulated client-side. Toggled by a build-
// injected flag (window.__AR_STATIC__) written by scripts/export-static.mjs.
const API = (() => {
  const base = '';
  const STATIC = typeof window !== 'undefined' && window.__AR_STATIC__ === true;

  // map an /api/... path (+query) to its baked static file (must match the exporter)
  function staticFile(path) {
    let [p, q] = path.replace(/^\/api\//, '').split('?');
    if (q) { const parts = q.split('&').filter(kv => !kv.startsWith('limit=')).sort(); if (parts.length) p += '__' + parts.map(kv => kv.replace('=', '_')).join('__'); }
    return './api-static/' + p + '.json';
  }
  const isoNow = () => new Date().toISOString();
  const rid = () => '14' + Math.floor(Math.random() * 9e7 + 1e7);
  const T = {
    match: [{ label: 'Layer 1 · Deterministic', detail: 'Exact invoice + amount + value-date', status: 'done' }, { label: 'Layer 2 · Fuzzy', detail: 'PO/SO refs · amount tolerance ±2%', status: 'done' }, { label: 'Layer 3 · ML pattern', detail: 'Gradient-boosted model on clearing history', status: 'done' }, { label: 'Post', detail: 'BAPI_ACC_DOCUMENT_POST → clearing doc', status: 'done' }],
    agent: [{ label: 'Initialise', detail: 'Agent activated within policy', status: 'done' }, { label: 'Process', detail: 'Reasoning over live AR data', status: 'done' }, { label: 'Complete', detail: 'Result written to AR data store', status: 'done' }],
    dunning: [{ label: 'Select template', detail: 'Segment-tuned tone', status: 'done' }, { label: 'Personalise', detail: 'GenAI + customer context + open items', status: 'done' }, { label: 'Optimal send-time', detail: 'Tue 09:40 local — highest open-rate', status: 'done' }, { label: 'Send', detail: 'Queued via dunning engine', status: 'done' }],
    evidence: [{ label: 'Identify sources', detail: 'SAP SD/CS · logistics · CLM contracts', status: 'done' }, { label: 'Retrieve', detail: 'RAG document pull', status: 'done' }, { label: 'Score relevance', detail: 'Rank by relevance to claim', status: 'done' }, { label: 'Assemble', detail: 'Case package ready', status: 'done' }],
    validity: [{ label: 'Feature build', detail: '20+ vars · history · promo status', status: 'done' }, { label: 'Predict', detail: 'valid / invalid + confidence', status: 'done' }, { label: 'Decision', detail: 'auto-resolve / queue for dispute', status: 'done' }],
  };
  function staticPost(path, body) {
    const d = (body && body.decision) || 'approve';
    if (/\/payments\/.+\/match$/.test(path)) return { steps: T.match, output: { layer: 1, confidence: 0.97, recommendation: 'Auto-post to SAP via BAPI_ACC_DOCUMENT_POST' }, confidence: 0.97 };
    if (/\/payments\/.+\/post$/.test(path)) return { ok: true, sap_doc: rid(), posted_at: isoNow() };
    if (/\/exceptions\/.+\/resolve$/.test(path)) return { ok: true };
    if (/\/cases\/.+\/dunning$/.test(path)) return { ok: true, step: 2, trace: { steps: T.dunning } };
    if (/\/cases\/.+\/promise$/.test(path)) return { ok: true };
    if (/\/cases\/.+\/predict$/.test(path)) return { steps: T.agent, output: { delinquency_prob: 0.7, action: 'outreach' } };
    if (/\/disputes\/cases\/.+\/(classify|evidence|predict)$/.test(path)) return { steps: path.endsWith('evidence') ? T.evidence : T.agent, output: {} };
    if (/\/disputes\/cases\/.+\/resolve$/.test(path)) return { ok: true, status: d === 'deny' ? 'denied' : 'resolved', decision: d, resolved_amount: 0 };
    if (/\/deductions\/.+\/(validate|match|classify)$/.test(path)) return { steps: path.endsWith('validate') ? T.validity : T.agent, output: {} };
    if (/\/deductions\/.+\/resolve$/.test(path)) return { ok: true, status: d === 'dispute' ? 'disputed' : 'resolved', decision: d, recovered: 0 };
    if (/\/agents\/.+\/run$/.test(path)) return { agent: { id: 'agent', name: 'Agent', type: 'Autonomous' }, steps: T.agent, output: { status: 'ok' } };
    return { ok: true };
  }

  async function req(method, path, body) {
    if (STATIC) {
      if (method === 'GET') { const r = await fetch(staticFile(path)); if (!r.ok) throw new Error(`static ${path} → ${r.status}`); return r.json(); }
      return staticPost(path, body);   // simulated action (no backend on GitHub Pages)
    }
    const opt = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opt.body = JSON.stringify(body);
    const r = await fetch(base + path, opt);
    if (!r.ok) throw new Error(`${method} ${path} → ${r.status}`);
    return r.json();
  }
  return {
    get: (p) => req('GET', p),
    post: (p, b) => req('POST', p, b),
    put: (p, b) => req('PUT', p, b),
    // typed helpers
    metrics: () => req('GET', '/api/metrics'),
    activity: (n = 30) => req('GET', `/api/metrics/activity?limit=${n}`),
    agents: (mod) => req('GET', '/api/agents' + (mod ? `?module=${mod}` : '')),
    agentRoster: () => req('GET', '/api/agents/roster'),
    runAgent: (id, ctx) => req('POST', `/api/agents/${id}/run`, ctx || {}),
    kpi: (key) => req('GET', `/api/kpi/${key}`),
    settings: () => req('GET', '/api/settings'),
    setSetting: (k, value) => req('PUT', `/api/settings/${k}`, { value }),
    reseed: () => req('POST', '/api/settings/reseed'),
    customers: () => req('GET', '/api/customers'),
    customer: (id) => req('GET', `/api/customers/${id}`),
    cashapp: {
      summary: () => req('GET', '/api/cashapp/summary'),
      payments: (status) => req('GET', '/api/cashapp/payments' + (status ? `?status=${status}` : '')),
      payment: (id) => req('GET', `/api/cashapp/payments/${id}`),
      exceptions: () => req('GET', '/api/cashapp/exceptions'),
      match: (id) => req('POST', `/api/cashapp/payments/${id}/match`),
      post: (id) => req('POST', `/api/cashapp/payments/${id}/post`),
      resolveExc: (id, resolution) => req('POST', `/api/cashapp/exceptions/${id}/resolve`, { resolution }),
    },
    collections: {
      summary: () => req('GET', '/api/collections/summary'),
      worklist: () => req('GET', '/api/collections/worklist'),
      case: (id) => req('GET', `/api/collections/cases/${id}`),
      dun: (id, channel) => req('POST', `/api/collections/cases/${id}/dunning`, { channel }),
      promise: (id, b) => req('POST', `/api/collections/cases/${id}/promise`, b),
      predict: (id) => req('POST', `/api/collections/cases/${id}/predict`),
    },
    disputes: {
      summary: () => req('GET', '/api/disputes/summary'),
      cases: (status) => req('GET', '/api/disputes/cases' + (status ? `?status=${status}` : '')),
      case: (id) => req('GET', `/api/disputes/cases/${id}`),
      act: (id, action, body) => req('POST', `/api/disputes/cases/${id}/${action}`, body || {}),
    },
    deductions: {
      summary: () => req('GET', '/api/deductions/summary'),
      list: (category) => req('GET', '/api/deductions/list' + (category ? `?category=${category}` : '')),
      promotions: () => req('GET', '/api/deductions/promotions'),
      detail: (id) => req('GET', `/api/deductions/${id}`),
      act: (id, action, body) => req('POST', `/api/deductions/${id}/${action}`, body || {}),
    },
  };
})();
