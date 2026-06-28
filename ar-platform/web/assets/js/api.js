// api.js — thin REST client for the AR Accelerator backend
const API = (() => {
  const base = '';
  async function req(method, path, body) {
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
