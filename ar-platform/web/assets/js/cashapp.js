// cashapp.js — Cash Application cockpit
(function(){
const $=(id)=>document.getElementById(id);
let SUM=null, VIEW='overview', FILTER='';
const NAV=[
  {id:'overview',name:'Overview',ic:'home'},
  {id:'waterfall',name:'Matching Waterfall',ic:'layers'},
  {id:'payments',name:'Payment Queue',ic:'cash'},
  {id:'exceptions',name:'Exceptions',ic:'alert'},
  {id:'channels',name:'Channel Coverage',ic:'grid'},
  {id:'process',name:'Process Map',ic:'layers'},
  {id:'roi',name:'ROI',ic:'dollar'},
];
const CHAN_IC={email:'mail',EDI:'file',lockbox:'cash',ACH:'dollar',wire:'zap',portal:'grid',check:'file'};
const CHAN_AUTO={email:'Fully automated · AI OCR/NLP',EDI:'Fully automated · parser',lockbox:'Automated · OCR + MICR',
  ACH:'Automated · NACHA parser',wire:'Automated · SWIFT parser',portal:'Automated · RPA bots',check:'Semi-automated · AI OCR'};

function confBar(c){ const cls=c>=0.9?'':c>=0.7?'mid':'lo'; return `<span class="conf-bar ${cls}"><i style="width:${Math.round(c*100)}%"></i></span> <span class="mono" style="font-size:10.5px">${(c*100).toFixed(0)}%</span>`; }

async function renderOverview(){
  const m=await API.metrics();
  const st={}; SUM.byStatus.forEach(s=>st[s.status]=s.n);
  const donut=UI.donut([
    {v:st.posted||0,color:'var(--ok)'},{v:st.matched||0,color:'var(--info)'},
    {v:st.exception||0,color:'var(--warn)'},{v:st.unmatched||0,color:'var(--risk)'}],128,18);
  const chanMax=Math.max(...SUM.byChannel.map(c=>c.n));
  $('content').innerHTML=`
    <div class="crumb">Cash Application / Overview</div>
    <div class="view-h">Straight-through cash posting</div>
    <div class="view-s">${SUM.posted} of ${SUM.total} payments posted to SAP this cycle · ${UI.fmt$(SUM.unapplied)} unapplied awaiting resolution.</div>
    <div class="grid g4">
      <div class="kpi clickable" data-kpi="autoMatchRate"><div class="l">${UI.icon('zap','sm')} Auto-match rate${UI.dchev()}</div><div class="kpi-v"><span data-cu="${m.kpis.autoMatchRate.val}">0</span><span class="u">%</span></div><div class="meta"><span class="tgt">target 85%</span></div><div class="bar"><i style="width:${m.kpis.autoMatchRate.val/85*100}%"></i></div></div>
      <div class="kpi clickable" data-kpi="matchRate"><div class="l">${UI.icon('check','sm')} Posted to SAP${UI.dchev()}</div><div class="kpi-v"><span data-cu="${SUM.posted}">0</span></div><div class="meta">of ${SUM.total} payments</div></div>
      <div class="kpi clickable" data-kpi="unappliedCash"><div class="l">${UI.icon('cash','sm')} Unapplied cash${UI.dchev()}</div><div class="kpi-v">${UI.fmt$(SUM.unapplied)}</div><div class="meta"><span class="tgt">target &lt;3%</span></div></div>
      <div class="kpi clickable" data-kpi="openExceptions"><div class="l">${UI.icon('alert','sm')} Exceptions${UI.dchev()}</div><div class="kpi-v"><span data-cu="${m.exceptions.open}">0</span></div><div class="meta">${UI.fmt$(m.exceptions.value)} value</div></div>
    </div>
    <div class="grid g2 mt14" style="grid-template-columns:.8fr 1.2fr">
      <div class="card"><div class="card-h">${UI.icon('cash','sm')}<span class="t">Payment disposition</span></div>
        <div class="flex" style="gap:20px"><div style="position:relative">${donut}
          <div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center">
            <div style="font-size:22px;font-weight:600;font-family:var(--mono)">${SUM.matchRate}%</div><div style="font-size:10px;color:var(--ink-3)">matched</div></div></div>
          <div style="flex:1">
            ${[['posted','Posted','ok'],['matched','Matched (review)','info'],['exception','Exception','warn'],['unmatched','Unmatched','risk']].map(([k,l,c])=>
              `<div class="kv"><span class="k">${UI.pill(l,c,true)}</span><span class="v">${st[k]||0}</span></div>`).join('')}
          </div></div></div>
      <div class="card"><div class="card-h">${UI.icon('grid','sm')}<span class="t">Inbound by channel</span><span class="x">${SUM.byChannel.length} channels</span></div>
        ${SUM.byChannel.map(c=>`<div class="hbar"><div class="lab">${UI.cap(c.channel)}</div><div class="track"><i style="width:${c.n/chanMax*100}%"></i></div><div class="val">${c.n} · ${UI.fmt$(c.val)}</div></div>`).join('')}</div>
    </div>
    <div class="card mt14"><div class="card-h">${UI.icon('layers','sm')}<span class="t">Matching waterfall</span><span class="x">how the ${SUM.total} payments resolved</span></div>
      ${waterfallHtml(true)}</div>`;
  document.querySelectorAll('[data-cu]').forEach(el=>UI.countUp(el,+el.dataset.cu));
  UI.wireKpis();
}

function waterfallHtml(compact){
  const wf=SUM.waterfall, max=Math.max(...wf.map(w=>w.inflow||0))||1;
  return `<div class="wfall">${wf.map(w=>`<div class="wf-row ${w.layer==='X'?'exc':''}">
    <div class="wf-lab"><div class="n">${w.layer==='X'?'':'L'+w.layer+' · '}${w.name}</div><div class="d">${w.desc}</div></div>
    <div class="wf-track"><div class="wf-fill" style="width:${Math.max(6,(w.n/max)*100)}%">${w.n} resolved</div></div>
    <div class="wf-n">${w.n}</div></div>`).join('')}</div>`;
}

function renderWaterfall(){
  const total=SUM.total, posted=SUM.posted;
  $('content').innerHTML=`
    <div class="crumb">Cash Application / Matching Waterfall</div>
    <div class="view-h">Five-layer matching engine</div>
    <div class="view-s">Each payment cascades through deterministic → fuzzy → ML → hierarchy → agent layers. Confidence thresholds and tolerances are configurable in the Command Center.</div>
    <div class="card">${waterfallHtml()}</div>
    <div class="grid g5 mt14">
      ${[['Layer 1','Deterministic','Exact invoice + amount + value-date. Handles the bulk of clean EDI/ACH.'],
         ['Layer 2','Fuzzy','PO/SO cross-refs, amount tolerance ±2%, date window ±5d.'],
         ['Layer 3','ML Pattern','Gradient-boosted model trained on your clearing history — timing diffs & splits.'],
         ['Layer 4','Hierarchy','Parent-child, cross-entity and multi-subsidiary payments.'],
         ['Layer 5','Agent','LLM investigates residual unmatched items before exception queue.']].map(([l,n,d])=>
        `<div class="card tight"><div class="tag">${l}</div><div style="font-weight:600;margin:8px 0 5px">${n}</div><div style="font-size:11.5px;color:var(--ink-3);line-height:1.5">${d}</div></div>`).join('')}</div>`;
}

async function renderPayments(){
  const rows=await API.cashapp.payments(FILTER||undefined);
  const counts={}; SUM.byStatus.forEach(s=>counts[s.status]=s.n);
  const seg=['','posted','matched','exception','unmatched'].map(s=>
    `<button class="${FILTER===s?'on':''}" data-f="${s}">${s===''?'All':UI.cap(s)} ${s&&counts[s]?`(${counts[s]})`:''}</button>`).join('');
  $('content').innerHTML=`
    <div class="crumb">Cash Application / Payment Queue</div>
    <div class="between"><div><div class="view-h">Payment queue</div><div class="view-s">${rows.length} payments · click any row to inspect the match chain and post to SAP.</div></div>
      <div class="seg">${seg}</div></div>
    <div class="card" style="padding:0;overflow:hidden">
      <table><thead><tr><th>Payment</th><th>Customer</th><th>Channel</th><th class="r">Amount</th><th>Layer</th><th>Confidence</th><th>Status</th><th>SAP Doc</th></tr></thead>
      <tbody>${rows.map(p=>`<tr class="click" data-id="${p.id}">
        <td><b>${p.id}</b><div class="mono" style="font-size:10px;color:var(--ink-3)">${p.bank_ref}</div></td>
        <td>${p.customer_name||'<span class="muted">Unidentified</span>'}</td>
        <td>${UI.pill(UI.cap(p.channel),'')}</td>
        <td class="r mono">${UI.fmt$full(p.amount)}</td>
        <td class="mono">${p.match_layer?'L'+p.match_layer:'—'}</td>
        <td>${p.confidence!=null?confBar(p.confidence):'—'}</td>
        <td>${UI.statusPill(p.status)}</td>
        <td class="mono" style="font-size:11px">${p.sap_doc||'—'}</td></tr>`).join('')}</tbody></table></div>`;
  document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{FILTER=b.dataset.f;renderPayments();});
  document.querySelectorAll('tr[data-id]').forEach(r=>r.onclick=()=>openPayment(r.dataset.id));
}

async function openPayment(id){
  const p=await API.cashapp.payment(id);
  const inv=p.invoices||[];
  UI.openDrawer(`
    <div class="drawer-h"><div class="li" style="width:34px;height:34px;border-radius:9px;background:var(--orange-tint);color:var(--orange-soft);display:flex;align-items:center;justify-content:center">${UI.icon('cash')}</div>
      <div><div style="font-weight:600">${p.id}</div><div class="mono" style="font-size:11px;color:var(--ink-3)">${p.bank_ref} · ${UI.cap(p.channel)}</div></div>
      <span class="x" onclick="UI.closeDrawer()">${UI.icon('x')}</span></div>
    <div class="drawer-b">
      <div class="flex between"><div style="font-size:26px;font-weight:600;font-family:var(--mono)">${UI.fmt$full(p.amount)}</div>${UI.statusPill(p.status)}</div>
      <div><div class="kv"><span class="k">Customer</span><span class="v">${p.customer_name||'Unidentified payer'}</span></div>
        <div class="kv"><span class="k">Value date</span><span class="v">${p.value_date}</span></div>
        <div class="kv"><span class="k">Match layer</span><span class="v">${p.match_layer?'Layer '+p.match_layer:'—'}</span></div>
        <div class="kv"><span class="k">Confidence</span><span class="v">${p.confidence!=null?(p.confidence*100).toFixed(0)+'%':'—'}</span></div>
        ${p.sap_doc?`<div class="kv"><span class="k">SAP clearing doc</span><span class="v mono">${p.sap_doc}</span></div>`:''}</div>
      <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3);margin-bottom:6px">Raw remittance</div>
        <div class="remit">${p.remittance_raw||'(none captured)'}</div></div>
      ${inv.length?`<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3);margin-bottom:6px">Matched invoices</div>
        ${inv.map(i=>`<div class="kv"><span class="k mono">${i.id} · ${i.doc_number}</span><span class="v">${UI.fmt$full(i.open_amount)}</span></div>`).join('')}</div>`:''}
      <div id="traceBox"></div>
    </div>
    <div class="drawer-f">
      <button class="btn agent" id="matchBtn">${UI.icon('play','sm')} Run match agent</button>
      <button class="btn pri" id="postBtn" ${p.status==='posted'?'disabled':''}>${UI.icon('sap','sm')} ${p.status==='posted'?'Posted':'Post to SAP'}</button>
    </div>`);
  $('matchBtn').onclick=async()=>{ $('matchBtn').disabled=true;
    const r=await API.cashapp.match(id); $('traceBox').innerHTML=`<div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--agent);margin-bottom:6px">Invoice Match Agent</div>`+UI.trace(r.steps);
    $('matchBtn').disabled=false; pumpFeed(); };
  $('postBtn').onclick=async()=>{ $('postBtn').disabled=true;
    const r=await API.cashapp.post(id); UI.toast('Posted to SAP · doc '+r.sap_doc);
    $('postBtn').innerHTML=UI.icon('check','sm')+' Posted'; await refreshSummary(); pumpFeed();
    setTimeout(()=>{UI.closeDrawer(); if(VIEW==='payments')renderPayments();},700); };
}

async function renderExceptions(){
  const rows=await API.cashapp.exceptions();
  $('content').innerHTML=`
    <div class="crumb">Cash Application / Exceptions</div>
    <div class="view-h">Exception queue</div>
    <div class="view-s">${rows.length} open exceptions, AI-classified and routed. Each carries a recommended resolution from the historical pattern model.</div>
    <div class="card" style="padding:0;overflow:hidden">
      <table><thead><tr><th>Exception</th><th>Customer</th><th>Type</th><th>Severity</th><th class="r">Amount</th><th>SLA</th><th>Assigned</th></tr></thead>
      <tbody>${rows.map(e=>`<tr class="click" data-id="${e.id}">
        <td><b>${e.id}</b></td><td>${e.customer_name||'—'}</td>
        <td>${UI.pill(UI.cap(e.type),'')}</td>
        <td>${UI.pill(UI.cap(e.severity),e.severity==='high'?'risk':e.severity==='medium'?'warn':'')}</td>
        <td class="r mono">${UI.fmt$full(e.amount)}</td>
        <td class="mono" style="font-size:11px">${e.sla_due?e.sla_due.slice(0,10):'—'}</td>
        <td>${e.assigned_to}</td></tr>`).join('')}</tbody></table></div>`;
  document.querySelectorAll('tr[data-id]').forEach(r=>r.onclick=()=>openException(r.dataset.id,rows.find(x=>x.id===r.dataset.id)));
}

function openException(id,e){
  UI.openDrawer(`
    <div class="drawer-h"><div class="li" style="width:34px;height:34px;border-radius:9px;background:var(--warn-tint);color:var(--warn);display:flex;align-items:center;justify-content:center">${UI.icon('alert')}</div>
      <div><div style="font-weight:600">${e.id} · ${UI.cap(e.type)}</div><div class="mono" style="font-size:11px;color:var(--ink-3)">${e.customer_name||''}</div></div>
      <span class="x" onclick="UI.closeDrawer()">${UI.icon('x')}</span></div>
    <div class="drawer-b">
      <div class="flex between"><div style="font-size:24px;font-weight:600;font-family:var(--mono)">${UI.fmt$full(e.amount)}</div>${UI.pill(UI.cap(e.severity),e.severity==='high'?'risk':'warn')}</div>
      <div class="kv"><span class="k">Channel</span><span class="v">${UI.cap(e.channel||'—')}</span></div>
      <div class="kv"><span class="k">SLA due</span><span class="v">${e.sla_due?e.sla_due.slice(0,16).replace('T',' '):'—'}</span></div>
      <div class="kv"><span class="k">Routed to</span><span class="v">${e.assigned_to}</span></div>
      <div class="card tight" style="background:var(--agent-tint);border-color:var(--agent)">
        <div class="flex" style="gap:7px;margin-bottom:6px">${UI.icon('bot','sm')}<b style="font-size:12px">Resolution Recommender</b></div>
        <div style="font-size:12.5px;color:var(--ink);line-height:1.5">${e.recommendation}</div></div>
    </div>
    <div class="drawer-f"><button class="btn" onclick="UI.closeDrawer()">Dismiss</button>
      <button class="btn pri" id="resolveBtn">${UI.icon('check','sm')} Apply & resolve</button></div>`);
  $('resolveBtn').onclick=async()=>{ await API.cashapp.resolveExc(id,e.recommendation); UI.toast('Exception resolved');
    await refreshSummary(); UI.closeDrawer(); if(VIEW==='exceptions')renderExceptions(); pumpFeed(); };
}

function renderChannels(){
  $('content').innerHTML=`
    <div class="crumb">Cash Application / Channel Coverage</div>
    <div class="view-h">Payment channel coverage</div>
    <div class="view-s">Every inbound channel is captured and normalised into one canonical remittance schema before matching.</div>
    <div class="card">${SUM.byChannel.map(c=>`<div class="chan-row">
      <div class="chan-ic">${UI.icon(CHAN_IC[c.channel]||'cash')}</div>
      <div style="flex:1"><div style="font-weight:600">${UI.cap(c.channel)} remittances</div><div style="font-size:11px;color:var(--ink-3)">${CHAN_AUTO[c.channel]||'Automated'}</div></div>
      <div style="text-align:right"><div class="mono" style="font-weight:600">${c.n} payments</div><div style="font-size:11px;color:var(--ink-3)">${UI.fmt$(c.val)}</div></div>
      <div style="width:120px;text-align:right">${UI.pill('Captured','ok',true)}</div></div>`).join('')}</div>`;
}

// ---- feed ----
async function pumpFeed(){ try{ const acts=await API.activity(20);
  $('feed').innerHTML=acts.filter(a=>a.module==='cashapp'||a.module==='platform').slice(0,12).map(a=>UI.feedItem(a)).join(''); }catch{} }

async function refreshSummary(){ SUM=await API.cashapp.summary(); paintHead(); }
async function paintHead(){ const m=await API.metrics();
  $('hMatch').textContent=SUM.matchRate+'%'; $('hUnapplied').textContent=UI.fmt$(SUM.unapplied); $('hExc').textContent=m.exceptions.open;
  $('trustMeta').textContent=`${SUM.posted}/${SUM.total} posted · ${m.kpis.autoMatchRate.val}% auto-match`; }

function renderNav(){ $('nav').innerHTML=`<div class="grp">Cash Application</div>`+NAV.map(n=>`<div class="nav-btn ${n.id===VIEW?'active':''}" data-v="${n.id}">${UI.icon(n.ic,'sm')} ${n.name}${n.id==='exceptions'&&SUM?`<span class="badge">${SUM.byStatus.find(s=>s.status==='exception')?.n||0}</span>`:''}</div>`).join('');
  document.querySelectorAll('.nav-btn[data-v]').forEach(b=>b.onclick=()=>{VIEW=b.dataset.v;renderNav();route();}); }
function route(){ ({overview:renderOverview,waterfall:renderWaterfall,payments:renderPayments,exceptions:renderExceptions,channels:renderChannels,process:()=>UI.renderProcessMap('content','cashapp'),roi:()=>UI.renderROI('content','cashapp')}[VIEW])(); }

async function boot(){
  UI.initTheme(); UI.initPanels(); UI.mountThemeToggle($('themeBtn'));
  $('cmdBtn').innerHTML=UI.icon('grid','sm'); $('cmdBtn').onclick=()=>parent.postMessage({__navTo:'command'},'*');
  SUM=await API.cashapp.summary(); await paintHead(); renderNav(); route(); pumpFeed();
  window.addEventListener('message',e=>{ if(e.data&&e.data.__setView){ VIEW=e.data.__setView; renderNav(); route(); }});
  setInterval(pumpFeed,9000);
}
boot();
})();
