// deductions.js — Deductions Management cockpit
(function(){
const $=(id)=>document.getElementById(id);
let SUM=null, VIEW='overview', FILTER='';
const NAV=[
  {id:'overview',name:'Overview',ic:'home'},
  {id:'queue',name:'Deduction Queue',ic:'deduct'},
  {id:'promos',name:'Rebate & GPO Programs',ic:'zap'},
  {id:'leakage',name:'Revenue Leakage',ic:'trend'},
  {id:'process',name:'Process Map',ic:'layers'},
  {id:'roi',name:'ROI',ic:'dollar'},
];
const TYPE_LABEL={gpo_admin_fee:'GPO Admin Fee',volume_rebate:'Volume Rebate',distributor_rebate:'Distributor Rebate',demo_credit:'Demo / Eval Credit',parts_shortage:'Parts Shortage',pricing_variance:'Pricing Variance',warranty:'Warranty / Quality',freight:'Freight',sla_penalty:'Uptime SLA Penalty'};
const CAT_LABEL={trade:'Contract',['non-trade']:'Operational'};
const STAGES=['Capture','Classify','Validate','Match','Resolve','Analyze'];
function vBadge(v){return `<span class="vbadge ${v}">${UI.icon(v==='valid'?'check':v==='invalid'?'x':'clock','sm')}${UI.cap(v)}</span>`;}
function matchPill(m){return m==='n/a'?'<span class="muted">—</span>':UI.pill(m==='matched'?'Matched':m==='mismatch'?'Mismatch':'No promo',m==='matched'?'ok':m==='mismatch'?'risk':'warn');}

async function renderOverview(){
  const cat={};SUM.byCategory.forEach(c=>cat[c.category]=c);
  const tradeVal=(cat.trade?.val)||0,ntVal=(cat['non-trade']?.val)||0,tot=tradeVal+ntVal||1;
  const sMap={};SUM.byStage.forEach(s=>sMap[s.stage]=s.n);
  const pipe=STAGES.map(s=>`<div class="sp"><div class="l">${s}</div><div class="n">${sMap[s]||0}</div></div>`).join('');
  const vMap={};SUM.validity.forEach(v=>vMap[v.validity]=v);
  const tmax=Math.max(...SUM.byType.map(t=>t.val),1);
  $('content').innerHTML=`
    <div class="crumb">Deductions Management / Overview</div>
    <div class="view-h">Maximize recovery, minimize leakage</div>
    <div class="view-s">${SUM.open} open deductions · ${UI.fmt$(SUM.value)} in play · ${SUM.autoValidation}% auto-validated, ${UI.fmt$(SUM.recovered)} recovered from invalid claims.</div>
    <div class="grid g4">
      <div class="kpi"><div class="l">${UI.icon('deduct','sm')} Open deductions</div><div class="kpi-v"><span data-cu="${SUM.open}">0</span></div><div class="meta">${UI.fmt$(SUM.value)} value</div></div>
      <div class="kpi clickable" data-kpi="autoValidation"><div class="l">${UI.icon('zap','sm')} Auto-validation${UI.dchev()}</div><div class="kpi-v"><span data-cu="${SUM.autoValidation}">0</span><span class="u">%</span></div><div class="meta"><span class="tgt">target 40%+</span></div><div class="bar"><i style="width:${Math.min(100,SUM.autoValidation/40*100)}%"></i></div></div>
      <div class="kpi"><div class="l">${UI.icon('alert','sm')} Invalid flagged</div><div class="kpi-v" style="color:var(--risk)"><span data-cu="${SUM.invalid}">0</span></div><div class="meta">${UI.fmt$(SUM.invalidVal)} to dispute</div></div>
      <div class="kpi"><div class="l">${UI.icon('dollar','sm')} Recovered</div><div class="kpi-v" style="color:var(--ok)">${UI.fmt$(SUM.recovered)}</div><div class="meta">net recovery</div></div>
    </div>
    <div class="grid g2 mt14">
      <div class="card"><div class="card-h">${UI.icon('layers','sm')}<span class="t">Contract vs operational</span></div>
        <div class="split-bar"><div class="t" style="width:${tradeVal/tot*100}%">Contract ${UI.fmt$(tradeVal)}</div><div class="nt" style="width:${ntVal/tot*100}%">Operational ${UI.fmt$(ntVal)}</div></div>
        <div class="flex" style="gap:20px;margin-top:12px">
          <div><div class="muted" style="font-size:10.5px">VALID</div><div class="mono" style="font-size:18px;color:var(--ok)">${(vMap.valid?.n)||0}</div></div>
          <div><div class="muted" style="font-size:10.5px">REVIEW</div><div class="mono" style="font-size:18px;color:var(--warn)">${(vMap.review?.n)||0}</div></div>
          <div><div class="muted" style="font-size:10.5px">INVALID</div><div class="mono" style="font-size:18px;color:var(--risk)">${(vMap.invalid?.n)||0}</div></div></div></div>
      <div class="card"><div class="card-h">${UI.icon('deduct','sm')}<span class="t">By deduction type</span></div>
        ${SUM.byType.slice(0,6).map(t=>`<div class="hbar"><div class="lab" style="width:140px">${TYPE_LABEL[t.type]||t.type}</div><div class="track"><i style="width:${t.val/tmax*100}%;background:${t.category==='trade'?'var(--orange)':'var(--info)'}"></i></div><div class="val">${UI.fmt$(t.val)}</div></div>`).join('')}</div>
    </div>
    <div class="view-h mt14" style="font-size:14px;margin-bottom:10px">Workflow · Capture → Classify → Validate → Match → Resolve → Analyze</div>
    <div class="stage-pipe">${pipe}</div>`;
  document.querySelectorAll('[data-cu]').forEach(el=>UI.countUp(el,+el.dataset.cu));
  UI.wireKpis();
}

async function renderQueue(){
  const rows=await API.deductions.list(FILTER||undefined);
  const seg=['','trade','non-trade'].map(s=>`<button class="${FILTER===s?'on':''}" data-f="${s}">${s===''?'All':UI.cap(s)}</button>`).join('');
  $('content').innerHTML=`
    <div class="crumb">Deductions Management / Deduction Queue</div>
    <div class="between"><div><div class="view-h">Deduction queue</div><div class="view-s">${rows.length} deductions · validity-predicted; click to validate, match to promotion, and resolve.</div></div>
      <div class="seg">${seg}</div></div>
    <div class="card" style="padding:0;overflow:hidden">
      <table><thead><tr><th>Deduction</th><th>Customer</th><th>Type</th><th>Cat.</th><th class="r">Amount</th><th>Validity</th><th>Promo</th><th>Stage</th><th>Status</th></tr></thead>
      <tbody>${rows.map(d=>`<tr class="click" data-id="${d.id}">
        <td><b>${d.id}</b><div class="mono" style="font-size:10px;color:var(--ink-3)">${d.reason_code}</div></td>
        <td>${d.customer_name||'—'}</td>
        <td>${UI.pill(TYPE_LABEL[d.type]||d.type,'')}</td>
        <td><span class="muted" style="font-size:11px">${CAT_LABEL[d.category]||UI.cap(d.category)}</span></td>
        <td class="r mono">${UI.fmt$full(d.amount)}</td>
        <td>${vBadge(d.validity)} <span class="mono" style="font-size:10px;color:var(--ink-3)">${(d.confidence*100).toFixed(0)}%</span></td>
        <td>${matchPill(d.promo_match)}</td>
        <td>${UI.pill(d.stage,'')}</td>
        <td>${UI.statusPill(d.status)}</td></tr>`).join('')}</tbody></table></div>`;
  document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{FILTER=b.dataset.f;renderQueue();});
  document.querySelectorAll('tr[data-id]').forEach(r=>r.onclick=()=>openDed(r.dataset.id));
}

async function openDed(id){
  const d=await API.deductions.detail(id);
  const resolved=d.status==='resolved'||d.status==='disputed';
  const docs=(d.backup_docs||[]).map((x,ix)=>`<div class="doc-row" data-doc="${ix}">
    <div class="di">${UI.icon('file','sm')}</div>
    <div style="flex:1;min-width:0"><div class="dn">${x.name}</div><div class="dm">${x.ref} · ${x.source} · ${x.date} · ${x.size}</div></div>
    <span class="pill ${x.kind==='XLSX'?'ok':'info'}" style="flex-shrink:0">${x.kind}</span></div>`).join('');
  const promoHtml=d.promo?`<div class="promo-card">
    <div class="flex between" style="margin-bottom:7px"><b style="font-size:12px">${d.promo.name}</b>${matchPill(d.promo_match)}</div>
    <div class="kv"><span class="k">Promotion</span><span class="v mono">${d.promo.id}</span></div>
    <div class="kv"><span class="k">Covered models</span><span class="v mono">${(d.promo.skus||[]).join(', ')}</span></div>
    <div class="kv"><span class="k">Window</span><span class="v">${d.promo.start_date} → ${d.promo.end_date}</span></div>
    <div class="kv mb0"><span class="k">Agreed / accrued</span><span class="v">${UI.fmt$(d.promo.agreed_amount)} / ${UI.fmt$(d.promo.accrued)}</span></div></div>`
    :d.category==='trade'?'<div class="muted" style="font-size:12px">No active contract / program found — flag for review.</div>':'';
  UI.openDrawer(`
    <div class="drawer-h"><div class="li" style="width:34px;height:34px;border-radius:9px;background:var(--orange-tint);color:var(--orange-soft);display:flex;align-items:center;justify-content:center">${UI.icon('deduct')}</div>
      <div><div style="font-weight:600">${d.id} · ${TYPE_LABEL[d.type]||d.type}</div><div class="mono" style="font-size:11px;color:var(--ink-3)">${d.customer_name} · ${d.reason_code} → GL ${d.gl_account}</div></div>
      <span class="x" onclick="UI.closeDrawer()">${UI.icon('x')}</span></div>
    <div class="drawer-b">
      <div class="flex between"><div style="font-size:26px;font-weight:600;font-family:var(--mono)">${UI.fmt$full(d.amount)}</div>${UI.statusPill(d.status)}</div>
      <div class="card tight" style="background:var(--agent-tint);border-color:var(--agent)">
        <div class="flex between" style="margin-bottom:8px"><div class="flex" style="gap:7px">${UI.icon('bot','sm')}<b style="font-size:12px">Validity Predictor</b></div>
          <button class="btn sm" id="valBtn">${UI.icon('play','sm')} Re-run</button></div>
        <div class="flex between"><span style="font-size:12px">Prediction</span><span>${vBadge(d.validity)} <span class="mono" style="font-size:11px">${(d.confidence*100).toFixed(0)}%</span></span></div>
        <div style="font-size:11px;color:var(--ink-2);margin-top:7px">${d.validity==='valid'?'High-confidence valid — eligible for auto-resolution write-off.':d.validity==='invalid'?'Predicted invalid — queue dispute with evidence package.':'Borderline — route to analyst for review.'}</div></div>
      <div><div class="kv"><span class="k">Category</span><span class="v">${UI.cap(d.category)}</span></div>
        <div class="kv"><span class="k">Source</span><span class="v">${UI.cap(d.source)}</span></div>
        <div class="kv"><span class="k">Invoice amount</span><span class="v">${UI.fmt$full(d.inv_amount)}</span></div>
        ${resolved?`<div class="kv"><span class="k">Resolution</span><span class="v">${d.resolution||''}</span></div>`:''}</div>
      ${d.category==='trade'?`<div><div class="flex between" style="margin-bottom:8px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3)">Contract / program match</div>
        <button class="btn sm agent" id="matchBtn">${UI.icon('play','sm')} Match program</button></div>${promoHtml}</div>`:''}
      <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3);margin-bottom:7px">Backup documents captured</div>${docs}</div>
      <div id="deTrace"></div>
    </div>
    ${resolved?'':`<div class="drawer-f">
      <button class="btn" id="disputeBtn">${UI.icon('dispute','sm')} Dispute (invalid)</button>
      <button class="btn pri" id="approveBtn">${UI.icon('check','sm')} Approve write-off</button></div>`}`);
  document.querySelectorAll('.doc-row[data-doc]').forEach(rw=>rw.onclick=()=>{const x=(d.backup_docs||[])[+rw.dataset.doc]; if(x) UI.docPreview({...x,...docFields(x,d)});});
  $('valBtn').onclick=async()=>{$('valBtn').disabled=true;const r=await API.deductions.act(id,'validate');
    $('deTrace').innerHTML=traceBox('Validity Predictor Agent',r);$('valBtn').disabled=false;};
  const mb=$('matchBtn');if(mb)mb.onclick=async()=>{mb.disabled=true;const r=await API.deductions.act(id,'match');
    $('deTrace').innerHTML=traceBox('Trade Promo Matching Agent',r);mb.disabled=false;pumpFeed();};
  if(!resolved){const resolve=async(decision)=>{await API.deductions.act(id,'resolve',{decision});
    UI.toast(decision==='dispute'?'Invalid deduction disputed on portal':'Write-off approved');await refresh();UI.closeDrawer();if(VIEW==='queue')renderQueue();pumpFeed();};
    $('approveBtn').onclick=()=>resolve('approve');$('disputeBtn').onclick=()=>resolve('dispute');}
}
function traceBox(title,r){return `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--agent);margin:4px 0 6px">${title}</div>`+UI.trace(r.steps);}

function docFields(x,d){
  const cust=d.customer_name||'—', amt=UI.fmt$full(d.amount);
  const M={
    claim_doc:{title:'Customer Deduction Claim',fields:[['Customer',cust],['Linked deduction',d.id],['Invoice ref',d.doc_number||'—'],['Reason code',d.reason_code],['Claimed amount',amt]]},
    gpo_agreement:{title:'GPO Administrative Fee Agreement',fields:[['GPO member',cust],['Programme',d.promo?d.promo.name:'GPO programme'],['Admin fee','2.0% of net invoice'],['Effective','2026-01-01 → 2026-12-31'],['Fee claimed',amt]]},
    rebate_contract:{title:'Volume Rebate Contract',fields:[['Customer',cust],['Tier','Tier 2 (≥ $5M annual)'],['Rebate rate','3.5% on qualifying'],['Period','Q2 2026'],['Rebate claimed',amt]]},
    distributor_agreement:{title:'Distributor Margin Agreement',fields:[['Distributor',cust],['Standard margin','12%'],['Covered models',d.sku||'CK-S7 / RX-X9'],['Claimed',amt]]},
    eval_agreement:{title:'Evaluation / Loaner Agreement',fields:[['Site',cust],['Term','90-day clinical evaluation'],['System',d.sku||'Radixact X9'],['Credit',amt]]},
    packing_list:{title:'Packing List',fields:[['Ship-to',cust],['Carrier','FedEx Freight Priority'],['Cartons',String(8+(d.id.charCodeAt(d.id.length-1)%9))],['Status','Shipped complete']]},
    POD:{title:'Proof of Delivery',fields:[['Ship-to',cust],['Carrier','FedEx Freight'],['Delivered',x.date],['Signed by','Receiving dock'],['Condition','Delivered complete']]},
    PO:{title:'Purchase Order',fields:[['Buyer',cust],['PO amount',UI.fmt$full(d.inv_amount||d.amount)],['Payment terms','NET60'],['Ship-to',cust]]},
    price_list:{title:'Contract Price List · 2026',fields:[['CyberKnife S7','$5,400,000'],['Radixact X9','$4,200,000'],['TomoTherapy','$2,300,000'],['Service / yr','$480,000'],['Effective','2026']]},
    service_report:{title:'Field Service Report',fields:[['System','Radixact X9'],['Serial','RX9-'+(x.ref||'').slice(-5)],['Issue','MLC calibration drift'],['Parts replaced','Detector module'],['Resolution','Closed on-site']]},
    carrier_invoice:{title:'Carrier Freight Invoice',fields:[['Carrier','FedEx Freight'],['Shipment',x.ref],['Freight charge',amt],['Terms','Prepaid & add']]},
    uptime_report:{title:'System Uptime / SLA Report',fields:[['System','CyberKnife S7'],['Measured uptime','97.2%'],['SLA target','98.5%'],['Downtime','12.4 hrs'],['Penalty claimed',amt]]},
  };
  return M[x.type]||{title:UI.cap(x.type),fields:[['Customer',cust],['Linked deduction',d.id],['Amount',amt]]};
}

async function renderPromos(){
  const promos=await API.deductions.promotions();
  $('content').innerHTML=`
    <div class="crumb">Deductions Management / Trade Promotions</div>
    <div class="view-h">Rebate & GPO program register</div>
    <div class="view-s">${promos.length} contract / rebate programs synced from SAP SD & Vistex. Contract deductions match against these at system-model level.</div>
    <div class="card" style="padding:0;overflow:hidden">
      <table><thead><tr><th>Program</th><th>Customer</th><th>Models</th><th>Window</th><th class="r">Agreed</th><th class="r">Accrued</th><th>Accrual</th><th>Status</th></tr></thead>
      <tbody>${promos.map(p=>{let skus;try{skus=JSON.parse(p.skus).join(', ');}catch{skus='';}
        return `<tr><td><b>${p.name}</b><div class="mono" style="font-size:10px;color:var(--ink-3)">${p.id}</div></td>
        <td>${p.customer_name||'—'}</td><td class="mono" style="font-size:11px">${skus}</td>
        <td class="mono" style="font-size:11px">${p.start_date} → ${p.end_date}</td>
        <td class="r mono">${UI.fmt$full(p.agreed_amount)}</td>
        <td class="r mono">${UI.fmt$full(p.accrued)}</td>
        <td>${UI.pill(UI.cap(p.accrual_status),p.accrual_status==='over-accrued'?'risk':p.accrual_status==='settled'?'ok':'warn')}</td>
        <td>${UI.pill(UI.cap(p.status),p.status==='active'?'ok':'')}</td></tr>`;}).join('')}</tbody></table></div>`;
}

async function renderLeakage(){
  const lk=SUM.leakage;const max=Math.max(...lk.map(l=>l.val),1);
  $('content').innerHTML=`
    <div class="crumb">Deductions Management / Revenue Leakage</div>
    <div class="view-h">Revenue leakage analysis</div>
    <div class="view-s">The Revenue Leakage Analyzer clusters deduction patterns by customer to surface systematic leakage — feeding trade planning and pricing corrections.</div>
    <div class="card"><div class="card-h">${UI.icon('trend','sm')}<span class="t">Deduction exposure by customer</span><span class="x">top ${lk.length} · invalid highlighted</span></div>
      ${lk.map(l=>`<div class="hbar"><div class="lab" style="width:170px">${l.customer_name}</div>
        <div class="track" style="position:relative"><i style="width:${l.val/max*100}%;background:var(--orange)"></i>
          <i style="position:absolute;top:0;left:0;width:${l.invalid_val/max*100}%;height:100%;background:var(--risk);border-radius:5px"></i></div>
        <div class="val">${l.n} · ${UI.fmt$(l.val)}</div></div>`).join('')}
      <div class="flex" style="gap:18px;margin-top:12px;font-size:11px;color:var(--ink-3)">
        <span class="flex" style="gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--orange);display:inline-block"></span>Total deductions</span>
        <span class="flex" style="gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--risk);display:inline-block"></span>Predicted invalid (recoverable)</span></div></div>`;
}

async function pumpFeed(){try{const a=await API.activity(20);$('feed').innerHTML=a.filter(x=>x.module==='deductions'||x.module==='platform').slice(0,12).map(x=>UI.feedItem(x)).join('');}catch{}}
async function refresh(){SUM=await API.deductions.summary();paintHead();}
function paintHead(){$('hOpen').textContent=SUM.open;$('hValid').textContent=SUM.autoValidation+'%';$('hRec').textContent=UI.fmt$(SUM.recovered);
  $('trustMeta').textContent=`${SUM.open} open · ${SUM.invalid} invalid · ${SUM.autoValidation}% auto-validated`;}
function renderNav(){$('nav').innerHTML=`<div class="grp">Deductions</div>`+NAV.map(n=>`<div class="nav-btn ${n.id===VIEW?'active':''}" data-v="${n.id}">${UI.icon(n.ic,'sm')} ${n.name}${n.id==='queue'&&SUM?`<span class="badge">${SUM.open}</span>`:''}</div>`).join('');
  document.querySelectorAll('.nav-btn[data-v]').forEach(b=>b.onclick=()=>{VIEW=b.dataset.v;renderNav();route();});}
function route(){({overview:renderOverview,queue:renderQueue,promos:renderPromos,leakage:renderLeakage,process:()=>UI.renderProcessMap('content','deductions'),roi:()=>UI.renderROI('content','deductions')}[VIEW])();}
async function boot(){UI.initTheme();UI.initPanels();UI.mountThemeToggle($('themeBtn'));$('cmdBtn').innerHTML=UI.icon('grid','sm');$('cmdBtn').onclick=()=>parent.postMessage({__navTo:'command'},'*');
  SUM=await API.deductions.summary();paintHead();renderNav();route();pumpFeed();
  window.addEventListener('message',e=>{ if(e.data&&e.data.__setView){ VIEW=e.data.__setView; renderNav(); route(); }});
  setInterval(pumpFeed,9000);}
boot();
})();
