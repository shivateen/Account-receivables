// common.js — shared UI helpers: icons, formatters, components, charts
const UI = (() => {
  // ---- Inline SVG icon set (Lucide/Feather paths) ----
  const ICONS = {
    dollar:'<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
    cash:'<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 12h.01M18 12h.01"/>',
    collect:'<path d="M3 3v18h18"/><rect x="7" y="11" width="3" height="7"/><rect x="12" y="7" width="3" height="11"/><rect x="17" y="13" width="3" height="5"/>',
    dispute:'<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    deduct:'<rect x="3" y="3" width="18" height="18" rx="2"/><line x1="8" y1="12" x2="16" y2="12"/>',
    home:'<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>',
    grid:'<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    bot:'<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4"/><line x1="8" y1="16" x2="8" y2="16"/><line x1="16" y1="16" x2="16" y2="16"/>',
    layers:'<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    alert:'<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
    check:'<polyline points="20 6 9 17 4 12"/>',
    clock:'<circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/>',
    mail:'<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    phone:'<path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/>',
    file:'<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/>',
    user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    trend:'<polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/>',
    sap:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M7 8h4a2 2 0 0 1 0 4H7zM7 8v8"/><path d="M14 16l2-8 2 8"/>',
    settings:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    arrow:'<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    down:'<line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/>',
    up:'<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    x:'<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    zap:'<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    target:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    refresh:'<polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>',
    play:'<polygon points="6 3 20 12 6 21 6 3"/>',
    send:'<line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>',
    sun:'<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.2" y1="4.2" x2="5.6" y2="5.6"/><line x1="18.4" y1="18.4" x2="19.8" y2="19.8"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.2" y1="19.8" x2="5.6" y2="18.4"/><line x1="18.4" y1="5.6" x2="19.8" y2="4.2"/>',
    moon:'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    search:'<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    sparkles:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
    menu:'<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
    chevR:'<polyline points="9 18 15 12 9 6"/>',
    chevL:'<polyline points="15 18 9 12 15 6"/>',
  };
  const icon = (n, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24">${ICONS[n] || ''}</svg>`;

  // ---- Formatters ----
  const fmt$ = (n, dp = 0) => {
    n = +n || 0; const a = Math.abs(n);
    if (a >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (a >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
    if (a >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n.toLocaleString('en-US', { maximumFractionDigits: dp });
  };
  const fmt$full = (n) => '$' + (+n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const fmtN = (n) => (+n || 0).toLocaleString('en-US');
  const pct = (n, dp = 0) => (+n || 0).toFixed(dp) + '%';
  const cap = (s) => (s || '').replace(/(^|[_\s])([a-z])/g, (m, a, b) => (a === '_' ? ' ' : a) + b.toUpperCase());
  const ago = (iso) => {
    if (!iso) return ''; const d = (new Date('2026-06-28T09:00:00Z') - new Date(iso)) / 1000;
    if (d < 3600) return Math.max(1, Math.round(d / 60)) + 'm ago';
    if (d < 86400) return Math.round(d / 3600) + 'h ago';
    return Math.round(d / 86400) + 'd ago';
  };

  // ---- Components ----
  const pill = (text, kind = '', dot = false) => `<span class="pill ${kind}">${dot ? '<span class="d"></span>' : ''}${text}</span>`;
  const riskPill = (tier) => pill(tier, { Low: 'ok', Medium: 'info', High: 'warn', Critical: 'risk' }[tier] || '');
  const slaPill = (s) => pill(cap(s), { on_track: 'ok', at_risk: 'warn', breached: 'risk' }[s] || '');
  const statusPill = (s) => pill(cap(s), { posted: 'ok', matched: 'info', exception: 'warn', unmatched: 'risk', open: 'info', resolved: 'ok', in_progress: 'warn', paid: 'ok', disputed: 'risk', partial: 'warn' }[s] || '');

  // ---- SVG sparkline ----
  function spark(vals, w = 90, h = 26, color = 'var(--orange)') {
    if (!vals || !vals.length) return '';
    const mn = Math.min(...vals), mx = Math.max(...vals), rng = mx - mn || 1;
    const pts = vals.map((v, i) => `${(i / (vals.length - 1)) * w},${h - ((v - mn) / rng) * (h - 4) - 2}`).join(' ');
    return `<svg class="spark" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }

  // ---- Donut ----
  function donut(segments, size = 120, stroke = 16) {
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, cx = size / 2;
    const total = segments.reduce((s, x) => s + x.v, 0) || 1; let off = 0;
    const arcs = segments.map(s => {
      const len = (s.v / total) * c;
      const el = `<circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="${s.color}" stroke-width="${stroke}" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-off}" transform="rotate(-90 ${cx} ${cx})"/>`;
      off += len; return el;
    }).join('');
    return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><circle cx="${cx}" cy="${cx}" r="${r}" fill="none" stroke="var(--panel-3)" stroke-width="${stroke}"/>${arcs}</svg>`;
  }

  // ---- Toast ----
  let toastEl;
  function toast(msg, ic = 'check') {
    if (!toastEl) { toastEl = document.createElement('div'); toastEl.className = 'toast'; document.body.appendChild(toastEl); }
    toastEl.innerHTML = icon(ic, '') + `<span>${msg}</span>`;
    toastEl.classList.add('on');
    clearTimeout(toastEl._t); toastEl._t = setTimeout(() => toastEl.classList.remove('on'), 2600);
  }

  // ---- Drawer ----
  function ensureDrawer() {
    if (document.getElementById('scrim')) return;
    const s = document.createElement('div'); s.id = 'scrim'; s.className = 'scrim';
    const d = document.createElement('div'); d.id = 'drawer'; d.className = 'drawer';
    s.onclick = closeDrawer; document.body.append(s, d);
  }
  function openDrawer(html) { ensureDrawer(); document.getElementById('drawer').innerHTML = html;
    document.getElementById('drawer').classList.add('on'); document.getElementById('scrim').classList.add('on'); }
  function closeDrawer() { const d = document.getElementById('drawer'); if (d) d.classList.remove('on');
    const s = document.getElementById('scrim'); if (s) s.classList.remove('on'); }

  // ---- Agent trace renderer ----
  function trace(steps) {
    return `<div class="trace">${steps.map(s => `<div class="tstep ${s.status === 'skip' ? 'skip' : ''}">
      <div class="l">${s.label}</div><div class="d">${s.detail || ''}</div></div>`).join('')}</div>`;
  }

  // ---- Feed item ----
  function feedItem(a) {
    return `<div class="fitem"><div class="top"><span class="agent">${a.actor || a.agent || 'system'}</span>
      <span class="kind ${a.kind}">${a.kind}</span></div>
      <div class="msg">${a.message}</div>${a.detail ? `<div class="det">${a.detail}</div>` : ''}</div>`;
  }

  // ---- count-up animation ----
  function countUp(el, to, opts = {}) {
    const dur = opts.dur || 700, dp = opts.dp || 0, pre = opts.pre || '', suf = opts.suf || '', money = opts.fmt === 'money';
    const t0 = performance.now(), from = 0;
    function step(t) { const p = Math.min(1, (t - t0) / dur); const e = 1 - Math.pow(1 - p, 3); const val = from + (to - from) * e;
      el.textContent = money ? fmt$(val) : pre + val.toLocaleString('en-US', { maximumFractionDigits: dp }) + suf;
      if (p < 1) requestAnimationFrame(step); }
    requestAnimationFrame(step);
  }

  // ---- Theme (light is the default) ----
  function applyTheme() {
    const t = localStorage.getItem('ar-theme') || 'light';
    document.documentElement.classList.toggle('light', t === 'light');
    return t;
  }
  function syncThemeButtons() {
    const light = document.documentElement.classList.contains('light');
    document.querySelectorAll('[data-theme-btn]').forEach(b => b.innerHTML = icon(light ? 'moon' : 'sun', 'sm'));
  }
  function initTheme() {
    applyTheme();
    // keep every iframe in sync when the theme is toggled anywhere in the suite
    window.addEventListener('storage', e => { if (e.key === 'ar-theme') { applyTheme(); syncThemeButtons(); } });
  }
  function toggleTheme() {
    const light = document.documentElement.classList.toggle('light');
    localStorage.setItem('ar-theme', light ? 'light' : 'dark');
    return light;
  }
  function mountThemeToggle(btn) {
    if (!btn) return;
    btn.setAttribute('data-theme-btn', '');
    btn.title = 'Toggle light / dark';
    syncThemeButtons();
    btn.onclick = () => { toggleTheme(); syncThemeButtons(); };
  }

  // ---- ROI (shared across all modules) ----
  const ROI_META = {
    cashapp:     { name: 'Cash Application', assum: ['roi.annual_payments', 'roi.analyst_cost', 'roi.wacc'] },
    collections: { name: 'Collections',      assum: ['general.dso_target', 'roi.analyst_cost', 'roi.wacc', 'roi.bad_debt_rate'] },
    dispute:     { name: 'Dispute Management',assum: ['roi.dispute_rate', 'roi.annual_disputes', 'roi.analyst_cost', 'roi.min_manual_dispute'] },
    deductions:  { name: 'Deductions',        assum: ['roi.deduction_rate', 'roi.annual_deductions', 'roi.analyst_cost', 'roi.min_manual_deduction'] },
  };
  function assumBlock(keys, data) {
    const items = keys.map(k => data.assumptions.find(a => a.key === k)).filter(Boolean);
    return `<div class="card mt14"><div class="card-h">${icon('settings', 'sm')}<span class="t">Assumptions</span><span class="x">edit any value to recompute the benefit live</span></div>
      <div class="grid g4">${items.map(a => { const disp = a.kind === 'pct' ? +(a.value * 100).toFixed(2) : a.value; const pre = a.kind === 'money' ? '$' : ''; const suf = a.kind === 'pct' ? '%' : '';
        return `<div class="assum"><div class="al">${a.label}</div><div class="ai">${pre}<input data-akey="${a.key}" data-kind="${a.kind}" value="${disp}">${suf}</div></div>`; }).join('')}</div></div>`;
  }
  function roiModuleHtml(mod, data) {
    const m = data.modules[mod], meta = ROI_META[mod];
    const rows = m.lines.map(l => `<tr><td><b>${l.label}</b></td><td class="muted">${l.baseline}</td><td>${l.accelerator}</td><td class="r mono" style="color:var(--ok)">${fmt$(l.benefit)}</td></tr>`).join('');
    return `<div class="crumb">${meta.name} / ROI</div>
      <div class="view-h">Return on investment</div>
      <div class="view-s">Annualized benefit for ${meta.name.toLowerCase()}, computed live from the AR book. Adjust the assumptions below to model your own numbers.</div>
      <div class="grid ${m.oneTime ? 'g2' : ''}">
        <div class="kpi"><div class="l">${icon('dollar', 'sm')} Annual benefit</div><div class="kpi-v" style="color:var(--ok)"><span data-cu="${m.annual}" data-fmt="money">0</span></div><div class="meta">recurring, per year</div></div>
        ${m.oneTime ? `<div class="kpi"><div class="l">${icon('cash', 'sm')} ${m.oneTimeLabel}</div><div class="kpi-v" style="color:var(--orange-soft)">${fmt$(m.oneTime)}</div><div class="meta">cash liberated up front</div></div>` : ''}
      </div>
      <div class="card mt14" style="padding:0;overflow:hidden"><table><thead><tr><th>Value lever</th><th>Manual baseline</th><th>With accelerator</th><th class="r">Annual benefit</th></tr></thead>
        <tbody>${rows}<tr style="background:var(--panel-2)"><td colspan="3"><b>Total annual benefit</b></td><td class="r mono"><b style="color:var(--ok)">${fmt$(m.annual)}</b></td></tr></tbody></table></div>
      ${assumBlock(meta.assum, data)}`;
  }
  function roiPlatformHtml(data) {
    const t = data.totals;
    const mods = [['cashapp', 'Cash Application'], ['collections', 'Collections'], ['dispute', 'Dispute Management'], ['deductions', 'Deductions']];
    const max = Math.max(...mods.map(([k]) => data.modules[k].annual), 1);
    return `<div class="crumb">AR Command Center / ROI</div>
      <div class="view-h">Accelerator ROI</div>
      <div class="view-s">Quantified, annualized benefit across all four O2C modules — computed live from the AR book. Adjust assumptions to model the business case for the client.</div>
      <div class="grid g4">
        <div class="kpi"><div class="l">${icon('dollar', 'sm')} Annual benefit</div><div class="kpi-v" style="color:var(--ok)"><span data-cu="${t.annualBenefit}" data-fmt="money">0</span></div><div class="meta">recurring / year</div></div>
        <div class="kpi"><div class="l">${icon('cash', 'sm')} Working capital released</div><div class="kpi-v" style="color:var(--orange-soft)">${fmt$(t.oneTimeCash)}</div><div class="meta">one-time cash</div></div>
        <div class="kpi"><div class="l">${icon('trend', 'sm')} ROI multiple</div><div class="kpi-v">${t.roiMultiple}<span class="u">×</span></div><div class="meta">benefit ÷ program cost</div></div>
        <div class="kpi"><div class="l">${icon('clock', 'sm')} Payback</div><div class="kpi-v">${t.paybackMonths}<span class="u">mo</span></div><div class="meta">to break even</div></div>
      </div>
      <div class="card mt14"><div class="card-h">${icon('grid', 'sm')}<span class="t">Annual benefit by module</span><span class="x">total ${fmt$(t.annualBenefit)}/yr</span></div>
        ${mods.map(([k, n]) => `<div class="hbar"><div class="lab" style="width:160px">${n}</div><div class="track"><i style="width:${data.modules[k].annual / max * 100}%"></i></div><div class="val">${fmt$(data.modules[k].annual)}</div></div>`).join('')}</div>
      ${assumBlock(['roi.program_cost', 'roi.analyst_cost', 'roi.wacc', 'general.dso_target'], data)}`;
  }
  async function renderROI(containerId, moduleKey) {
    const data = await API.get('/api/roi');
    const el = document.getElementById(containerId);
    el.innerHTML = (moduleKey === 'platform') ? roiPlatformHtml(data) : roiModuleHtml(moduleKey, data);
    el.querySelectorAll('.kpi-v [data-cu]').forEach(s => countUp(s, +s.dataset.cu, { fmt: s.dataset.fmt }));
    el.querySelectorAll('input[data-akey]').forEach(inp => inp.onchange = async () => {
      let v = parseFloat(inp.value); if (isNaN(v)) return; if (inp.dataset.kind === 'pct') v = v / 100;
      await API.setSetting(inp.dataset.akey, v); toast('Assumption updated · recomputing'); renderROI(containerId, moduleKey);
    });
  }

  // ---- Process maps: detailed AS-IS activities (swimlane by persona) with an
  //      AI-agent + HITL overlay band on top. mode: auto | hitl | manual.
  const PROCESS_MAPS = {
    cashapp: { name: 'Cash Application',
      lanes: ['Customer / Bank', 'AR Cash-App Analyst', 'SAP S/4HANA (FI-AR)'],
      phases: [{ name: 'Receive', span: [0, 0] }, { name: 'Capture & identify', span: [1, 3] }, { name: 'Match', span: [4, 5] }, { name: 'Exceptions', span: [6, 7] }, { name: 'Post & close', span: [8, 9] }],
      steps: [
        { n: 'Payment + remittance sent', lane: 0, mode: 'manual', sap: 'BAI2 / MT940 / lockbox / email' },
        { n: 'Download & collate remittance backup', lane: 1, mode: 'auto', agent: 'Remittance Capture' },
        { n: 'OCR / extract invoice, amount, date', lane: 1, mode: 'auto', agent: 'Remittance Capture' },
        { n: 'Identify the paying customer', lane: 1, mode: 'auto', agent: 'Customer ID' },
        { n: 'Match payment to open invoices', lane: 1, mode: 'auto', agent: 'Invoice Match' },
        { n: 'Apply tolerance / fuzzy / ML match', lane: 1, mode: 'auto', agent: 'Invoice Match' },
        { n: 'Resolve short-pay / deduction', lane: 1, mode: 'hitl', agent: 'Exception Classifier' },
        { n: 'Investigate unapplied / on-account cash', lane: 1, mode: 'hitl' },
        { n: 'Post & clear payment', lane: 2, mode: 'auto', agent: 'ERP Posting', sap: 'F-28 · BAPI post' },
        { n: 'Update aging & cash forecast', lane: 2, mode: 'auto', agent: 'Cash Forecast' },
      ] },
    collections: { name: 'Collections',
      lanes: ['SAP FSCM-COL', 'AR Collections Analyst', 'Collector', 'Customer'],
      phases: [{ name: 'Identify', span: [0, 0] }, { name: 'Prioritize', span: [1, 4] }, { name: 'Engage', span: [5, 7] }, { name: 'Track', span: [8, 9] }, { name: 'Escalate', span: [10, 11] }],
      steps: [
        { n: 'Refresh AR aging & open items', lane: 0, mode: 'auto', agent: 'SAP Sync', sap: 'FBL5N' },
        { n: 'Segment & risk-tier accounts', lane: 1, mode: 'auto', agent: 'Worklist Prioritization' },
        { n: 'Score & rank overdue accounts', lane: 1, mode: 'auto', agent: 'Worklist Prioritization' },
        { n: 'Build daily collector worklist', lane: 1, mode: 'auto', agent: 'Worklist Prioritization' },
        { n: 'Predict 30-day delinquency', lane: 1, mode: 'auto', agent: 'Delinquency Predictor' },
        { n: 'Send dunning emails', lane: 2, mode: 'auto', agent: 'Smart Dunning' },
        { n: 'Outbound call / negotiate', lane: 2, mode: 'hitl', agent: 'Virtual Call Assistant' },
        { n: 'Customer responds / pays', lane: 3, mode: 'manual' },
        { n: 'Read & respond to AR inbox', lane: 2, mode: 'auto', agent: 'AR Email Inbox' },
        { n: 'Capture & track promise-to-pay', lane: 2, mode: 'auto', agent: 'Promise-to-Pay Tracker' },
        { n: 'Review & decide escalation', lane: 1, mode: 'hitl' },
        { n: 'Dunning run / pre-legal handoff', lane: 0, mode: 'auto', sap: 'F150' },
      ] },
    dispute: { name: 'Dispute Management',
      lanes: ['Source / Customer', 'AR Dispute Handler', 'Logistics / CLM', 'SAP FSCM-DM'],
      phases: [{ name: 'Capture', span: [0, 1] }, { name: 'Classify', span: [2, 3] }, { name: 'Investigate', span: [4, 6] }, { name: 'Resolve', span: [7, 9] }, { name: 'Analyze', span: [10, 10] }],
      steps: [
        { n: 'Dispute raised', lane: 0, mode: 'manual', sap: 'email / portal / short-pay' },
        { n: 'Create case & link invoice', lane: 1, mode: 'auto', agent: 'Dispute Capture', sap: 'UDM_DISPUTE_CREATE' },
        { n: 'Classify type & severity', lane: 1, mode: 'auto', agent: 'Classification' },
        { n: 'Assign handler & set SLA', lane: 1, mode: 'auto', agent: 'Classification' },
        { n: 'Pull evidence (invoice, POD, contract)', lane: 2, mode: 'auto', agent: 'Evidence Assembly' },
        { n: 'Score evidence relevance', lane: 1, mode: 'auto', agent: 'Evidence Assembly' },
        { n: 'Predict win / loss outcome', lane: 1, mode: 'auto', agent: 'Outcome Prediction' },
        { n: 'Decide approve / partial / deny', lane: 1, mode: 'hitl', agent: 'Resolution Recommender' },
        { n: 'Generate credit memo / denial', lane: 1, mode: 'auto', agent: 'Correspondence' },
        { n: 'Post resolution to SAP', lane: 3, mode: 'auto', agent: 'ERP Posting', sap: 'FB75' },
        { n: 'Root-cause + upstream alert', lane: 1, mode: 'auto', agent: 'Root Cause Analyzer' },
      ] },
    deductions: { name: 'Deductions Management',
      lanes: ['Customer / Portal', 'AR Deduction Analyst', 'Logistics', 'SAP FSCM-DM / TPM'],
      phases: [{ name: 'Capture', span: [0, 2] }, { name: 'Classify', span: [3, 4] }, { name: 'Validate', span: [5, 7] }, { name: 'Resolve', span: [8, 10] }, { name: 'Analyze', span: [11, 11] }],
      steps: [
        { n: 'Claim / short-pay received', lane: 0, mode: 'manual', sap: 'portal / email / remittance' },
        { n: 'Download claim + backup docs', lane: 1, mode: 'auto', agent: 'Portal Claim Download' },
        { n: 'Parse & extract claim data', lane: 1, mode: 'auto', agent: 'Email Claim Capture' },
        { n: 'Classify trade / non-trade + reason', lane: 1, mode: 'auto', agent: 'Deduction Classifier' },
        { n: 'Map to GL account', lane: 1, mode: 'auto', agent: 'Deduction Classifier' },
        { n: 'Predict validity (valid / invalid)', lane: 1, mode: 'auto', agent: 'Validity Predictor' },
        { n: 'Match to GPO / rebate programme', lane: 3, mode: 'auto', agent: 'Trade Promo Matching', sap: 'SD-TPM / Vistex' },
        { n: 'Check price / contract variance', lane: 2, mode: 'auto', agent: 'Price Variance Analyzer' },
        { n: 'Review borderline cases', lane: 1, mode: 'hitl' },
        { n: 'Auto-resolve valid → write-off', lane: 3, mode: 'auto', agent: 'Auto-Resolution', sap: 'FB75 · CO' },
        { n: 'File dispute for invalid claims', lane: 1, mode: 'auto', agent: 'Invalid Claim Dispute' },
        { n: 'Revenue-leakage analytics', lane: 1, mode: 'auto', agent: 'Revenue Leakage Analyzer' },
      ] },
  };
  function pmModeBadge(m) { return m === 'auto' ? pill('Automated', 'agent') : m === 'hitl' ? pill('Human-in-loop', 'warn') : pill('Manual', ''); }
  let pmapMode = (typeof localStorage !== 'undefined' && localStorage.getItem('ar-pmap')) || 'ai';
  function renderProcessMap(containerId, moduleKey) {
    const pm = PROCESS_MAPS[moduleKey]; if (!pm) return;
    const N = pm.steps.length, cols = `132px repeat(${N},minmax(118px,1fr))`, asis = pmapMode === 'asis';
    const auto = pm.steps.filter(s => s.mode === 'auto').length, hitl = pm.steps.filter(s => s.mode === 'hitl').length, man = pm.steps.filter(s => s.mode === 'manual').length;
    // derive overlay segments: merge consecutive steps that share an agent (auto) or the same non-auto mode
    const segs = []; let i = 0;
    while (i < N) { const s = pm.steps[i], key = s.mode === 'auto' ? 'a:' + (s.agent || '') : s.mode; let j = i + 1;
      while (j < N) { const t = pm.steps[j], k2 = t.mode === 'auto' ? 'a:' + (t.agent || '') : t.mode; if (k2 !== key) break; j++; }
      segs.push({ start: i, end: j - 1, mode: s.mode, agent: s.agent }); i = j; }
    const segLabel = (sg) => sg.mode === 'auto' ? `${icon('bot', 'sm')}<span>${sg.agent || 'AI agent'}${sg.end > sg.start ? ` · ${sg.end - sg.start + 1} steps` : ''}</span>` : sg.mode === 'hitl' ? `${icon('user', 'sm')}<span>Human-in-the-loop</span>` : `${icon('arrow', 'sm')}<span>Manual / external</span>`;
    const phaseRow = `<div class="pmap-row" style="grid-template-columns:${cols}"><div class="pmap-axis">Process stage</div>${pm.phases.map(p => `<div class="pmap-phase" style="grid-column:${2 + p.span[0]} / ${2 + p.span[1] + 1}">${p.name}</div>`).join('')}</div>`;
    const overlayRow = asis
      ? `<div class="pmap-row" style="grid-template-columns:${cols}"><div class="pmap-axis">Today</div><div class="pmap-seg manual" style="grid-column:2 / ${2 + N}">${icon('user', 'sm')}<span>Every activity performed manually by the AR team — no automation</span></div></div>`
      : `<div class="pmap-row" style="grid-template-columns:${cols}"><div class="pmap-axis">AI + HITL overlay</div>${segs.map(sg => `<div class="pmap-seg ${sg.mode}" style="grid-column:${2 + sg.start} / ${2 + sg.end + 1}">${segLabel(sg)}</div>`).join('')}</div>`;
    const laneRows = pm.lanes.map((lane, li) => `<div class="pmap-row" style="grid-template-columns:${cols}"><div class="pmap-axis lane">${lane}</div>${pm.steps.map((s, i) =>
      s.lane === li ? `<div class="pmap-step ${asis ? '' : s.mode}"><div class="sn">STEP ${i + 1}</div><div class="st">${s.n}</div>${s.sap ? `<span class="tag">${s.sap}</span>` : ''}<div>${asis ? pill('Manual', '') : pmModeBadge(s.mode)}</div></div>` : `<div></div>`).join('')}</div>`).join('');
    const intro = asis
      ? `Your ${pm.name} process <b>as it runs today</b> — ${N} activities performed manually by the team across ${pm.lanes.length} roles, with hand-offs into SAP. This is the baseline the accelerator transforms. Switch to <b style="color:var(--agent)">"With AI agents"</b> to reveal the target state.`
      : `The same ${N}-activity ${pm.name} process, <b>redefined by the accelerator</b>. The band on top shows where AI agents take over — an overarching box per agent — and where your team stays in the loop. <b style="color:var(--agent)">${auto} automated</b> · <b style="color:var(--warn)">${hitl} human-in-the-loop</b> · ${man} manual / external.`;
    document.getElementById(containerId).innerHTML = `
      <div class="crumb">${pm.name} / Process Map</div>
      <div class="between" style="align-items:flex-start"><div><div class="view-h">${asis ? 'As-is process map · today' : 'Process map · AI agent &amp; HITL overlay'}</div>
        <div class="view-s" style="max-width:820px">${intro}</div></div>
        <div class="seg pmap-toggle"><button class="${asis ? 'on' : ''}" data-pm="asis">As-is (today)</button><button class="${asis ? '' : 'on'}" data-pm="ai">With AI agents + HITL</button></div></div>
      <div class="flex" style="gap:12px;margin:4px 0 14px">${asis ? pill('Manual / human-run', '') : pill('AI agent — automated', 'agent') + pill('Human-in-the-loop', 'warn') + pill('Manual / external', '')}</div>
      <div class="card" style="overflow:hidden"><div class="pmap ${asis ? 'asis' : 'ai'}">${phaseRow}${overlayRow}${laneRows}</div></div>`;
    document.querySelectorAll(`#${containerId} [data-pm]`).forEach(b => b.onclick = () => { if (b.dataset.pm === pmapMode) return; pmapMode = b.dataset.pm; try { localStorage.setItem('ar-pmap', pmapMode); } catch {} renderProcessMap(containerId, moduleKey); });
  }

  // ---- Collapsible panels (left nav + right rail), persisted & synced across iframes ----
  function applyPanels(app) {
    app.classList.toggle('nav-collapsed', localStorage.getItem('ar-nav') === 'collapsed');
    app.classList.toggle('rail-collapsed', localStorage.getItem('ar-rail') === 'collapsed');
  }
  function initPanels() {
    const app = document.querySelector('.app'); if (!app) return;
    applyPanels(app);
    const setRail = (c) => { localStorage.setItem('ar-rail', c ? 'collapsed' : 'open'); app.classList.toggle('rail-collapsed', c); syncReveal(); };
    const syncReveal = () => { const r = document.querySelector('.rail-reveal'); if (r) r.style.display = app.classList.contains('rail-collapsed') ? 'inline-flex' : 'none'; };
    // nav toggle (in header)
    const head = document.querySelector('.head');
    if (head && !head.querySelector('.nav-toggle')) {
      const b = document.createElement('button'); b.className = 'panel-toggle nav-toggle'; b.title = 'Collapse / expand menu'; b.innerHTML = icon('menu', '');
      b.onclick = () => { const c = !app.classList.contains('nav-collapsed'); localStorage.setItem('ar-nav', c ? 'collapsed' : 'open'); app.classList.toggle('nav-collapsed', c); };
      head.insertBefore(b, head.firstChild);
    }
    // rail collapse (in rail header) + floating reveal when collapsed
    const railH = document.querySelector('.rail .rail-h');
    if (railH && !railH.querySelector('.rail-toggle')) {
      const b = document.createElement('button'); b.className = 'panel-toggle rail-toggle'; b.title = 'Collapse panel'; b.innerHTML = icon('chevR', '');
      b.onclick = () => setRail(true); railH.appendChild(b);
    }
    if (document.querySelector('.rail') && !document.querySelector('.rail-reveal')) {
      const r = document.createElement('button'); r.className = 'panel-toggle rail-reveal'; r.title = 'Show AI panel'; r.innerHTML = icon('chevL', '');
      r.onclick = () => setRail(false); document.body.appendChild(r);
    }
    syncReveal();
    window.addEventListener('storage', e => { if (e.key === 'ar-nav' || e.key === 'ar-rail') { applyPanels(app); syncReveal(); } });
  }

  // ---- Modal + document preview (faux "paper" doc with synthetic contents) ----
  function ensureModal() {
    if (document.getElementById('ar-modal')) return;
    const s = document.createElement('div'); s.id = 'ar-modal'; s.className = 'modal-scrim';
    s.addEventListener('click', e => { if (e.target === s) closeModal(); });
    const m = document.createElement('div'); m.className = 'modal'; m.id = 'ar-modal-body';
    s.appendChild(m); document.body.appendChild(s);
  }
  function openModal(html) { ensureModal(); document.getElementById('ar-modal-body').innerHTML = html; document.getElementById('ar-modal').classList.add('on'); }
  function closeModal() { const s = document.getElementById('ar-modal'); if (s) s.classList.remove('on'); }
  function docPreview(doc) {
    const fields = (doc.fields || []).map(([k, v]) => `<div class="docp-row"><span class="k">${k}</span><span class="v">${v}</span></div>`).join('');
    openModal(`
      <div class="docp-head"><div class="docp-ic">${icon('file', 'lg')}</div>
        <div style="flex:1;min-width:0"><div class="docp-name">${doc.name}</div><div class="docp-meta">${doc.ref} · ${doc.source} · ${doc.date || ''}${doc.size ? ' · ' + doc.size : ''}</div></div>
        <span class="docp-kind">${doc.kind || 'PDF'}</span><span class="docp-x" onclick="UI.closeModal()">${icon('x')}</span></div>
      <div class="docp-page"><div class="docp-title">${doc.title || 'Document'}</div>
        <div class="docp-fields">${fields}</div>
        <div class="docp-stamp">${icon('check', 'sm')} Captured & indexed by AI · synthetic demo document · ${doc.source}</div></div>`);
  }

  // ---- KPI drill-down (sub-metrics → breakdown → root cause → link into module) ----
  const KPI_ICON = { dso: 'clock', cei: 'target', autoMatchRate: 'zap', matchRate: 'check', unappliedCash: 'cash', openExceptions: 'alert', pastDuePct: 'trend', delinquencyRisk: 'alert', disputeResolution: 'dispute', autoClassification: 'zap', autoValidation: 'deduct' };
  const dchev = () => `<span style="margin-left:auto;color:var(--ink-4)" title="Drill into contributing sub-metrics">${icon('chevR', 'sm')}</span>`;
  const wireKpis = (root) => (root || document).querySelectorAll('.kpi[data-kpi]').forEach(c => c.onclick = () => openKPI(c.dataset.kpi));
  async function openKPI(key) {
    const d = await API.kpi(key).catch(() => null); if (!d) return;
    const good = (d.dir === 'down-good') ? d.delta < 0 : d.delta > 0;
    const dv = (d.delta > 0 ? '+' : '') + d.delta;
    const appLabel = (a) => a === 'disputes' ? 'Dispute Mgmt' : a === 'cashapp' ? 'Cash Application' : cap(a);
    const driverHtml = (dr) => {
      const max = Math.max(...dr.breakdown.rows.map(x => +x.value || 0), 1);
      const rows = dr.breakdown.rows.map(r => {
        const num = typeof r.value === 'number'; const w = num ? Math.max(3, (r.value / max) * 100) : 100;
        const right = r.note != null ? r.note : (r.share != null ? r.share + '%' : (num ? fmtN(r.value) : r.value));
        return `<div class="hbar"><div class="lab" style="width:120px">${r.label}</div><div class="track"><i style="width:${w}%"></i></div><div class="val">${right}</div></div>`;
      }).join('');
      return `<div class="kdriver"><div class="kdriver-h">
          <div style="flex:1"><div class="kn">${dr.name}</div><div class="knar">${dr.narrative}</div></div>
          <div class="kval">${typeof dr.value === 'number' ? fmtN(dr.value) : dr.value}${dr.unit || ''}</div>${icon('chevR', 'sm')}</div>
        <div class="kdriver-d"><div class="kbreak">${rows}</div>
          <div class="krc">${icon('alert', 'sm')}<div><b>Root cause</b> — ${dr.rootCause}</div></div>
          ${dr.link ? `<button class="btn sm" data-navapp="${dr.link.app}" data-navview="${dr.link.view}" style="margin-top:9px">${icon('arrow', 'sm')} Investigate in ${appLabel(dr.link.app)}</button>` : ''}</div></div>`;
    };
    openDrawer(`
      <div class="drawer-h"><div class="li" style="width:34px;height:34px;border-radius:9px;background:var(--orange-tint);color:var(--orange-soft);display:flex;align-items:center;justify-content:center">${icon(KPI_ICON[key] || 'target')}</div>
        <div><div style="font-weight:600">${d.name}</div><div class="mono" style="font-size:11px;color:var(--ink-3)">${d.period}</div></div>
        <span class="x" onclick="UI.closeDrawer()">${icon('x')}</span></div>
      <div class="drawer-b">
        <div class="flex between"><div style="font-size:30px;font-weight:600;font-family:var(--mono)">${d.value}<span style="font-size:15px;color:var(--ink-3)">${d.unit || ''}</span></div>
          <div style="text-align:right"><div class="delta ${good ? 'good' : 'bad'}" style="font-weight:600;font-family:var(--mono)">${dv}${d.unit || ''} MoM</div><div class="mono" style="font-size:11px;color:var(--ink-3)">target ${d.target}${d.unit || ''}</div></div></div>
        <div class="card tight" style="background:var(--panel-2)"><div style="font-size:12.5px;line-height:1.6;color:var(--ink)">${d.summary}</div></div>
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3)">Contributing sub-metrics · click to expand</div>
        <div class="kdrivers">${d.drivers.map(driverHtml).join('')}</div>
      </div>
      ${d.link ? `<div class="drawer-f"><span class="muted" style="font-size:11px;margin-right:auto">Drill into the live data</span><button class="btn pri" data-navapp="${d.link.app}" data-navview="${d.link.view}">${icon('grid', 'sm')} ${d.link.label}</button></div>` : ''}`);
    document.querySelectorAll('#drawer .kdriver-h').forEach(h => h.onclick = () => h.parentElement.classList.toggle('open'));
    document.querySelectorAll('#drawer [data-navapp]').forEach(btn => btn.onclick = (e) => { e.stopPropagation(); parent.postMessage({ __navTo: btn.dataset.navapp, __view: btn.dataset.navview }, '*'); closeDrawer(); });
    const first = document.querySelector('#drawer .kdriver'); if (first) first.classList.add('open');
  }

  return { icon, fmt$, fmt$full, fmtN, pct, cap, ago, pill, riskPill, slaPill, statusPill,
    spark, donut, toast, openDrawer, closeDrawer, trace, feedItem, countUp, initTheme, toggleTheme, mountThemeToggle, renderROI, renderProcessMap, initPanels, docPreview, closeModal, openKPI, dchev, wireKpis };
})();
