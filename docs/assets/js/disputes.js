// disputes.js — Dispute Management cockpit
(function(){
const $=(id)=>document.getElementById(id);
let SUM=null, VIEW='overview', FILTER='';
const NAV=[
  {id:'overview',name:'Overview',ic:'home'},
  {id:'cases',name:'Case Queue',ic:'dispute'},
  {id:'rootcause',name:'Root Cause',ic:'trend'},
  {id:'process',name:'Process Map',ic:'layers'},
  {id:'roi',name:'ROI',ic:'dollar'},
];
const TYPE_LABEL={pricing:'Pricing',shipping:'Delivery / Install',quality:'System / Parts Quality',billing:'Billing',unauthorized_deduction:'Unauthorized Deduction',compliance:'Service / Compliance'};
const STAGES=['Capture','Classify','Investigate','Resolve','Analyze'];
const EV_IC={invoice:'file',quote_contract:'file',price_list:'dollar',correspondence:'mail',installation_report:'check',delivery_note:'file',acceptance_cert:'check',service_report:'alert',return_auth:'file',field_inspection:'alert',order_confirmation:'file',milestone_log:'file',gpo_contract:'file',rebate_agreement:'dollar',service_contract:'file',uptime_report:'trend'};
const winColor=(p)=>p>=0.66?'var(--ok)':p>=0.45?'var(--warn)':'var(--risk)';
function typePill(t){return UI.pill(TYPE_LABEL[t]||t,t==='unauthorized_deduction'||t==='quality'?'risk':t==='pricing'||t==='billing'?'warn':'info');}

async function renderOverview(){
  const m=await API.metrics();
  const st={};SUM.byStatus.forEach(s=>st[s.status]=s);
  const sMap={};SUM.byStage.forEach(s=>sMap[s.stage]=s.n);
  const pipe=STAGES.map(s=>`<div class="sp"><div class="l">${s}</div><div class="n">${sMap[s]||0}</div></div>`).join('');
  const tmax=Math.max(...SUM.byType.map(t=>t.val),1);
  $('content').innerHTML=`
    <div class="crumb">Dispute Management / Overview</div>
    <div class="view-h">Intelligent dispute resolution</div>
    <div class="view-s">${SUM.open} open cases · ${UI.fmt$(SUM.value)} disputed · ${SUM.autoClassify}% auto-classified, evidence assembled in &lt;15 min.</div>
    <div class="grid g4">
      <div class="kpi"><div class="l">${UI.icon('dispute','sm')} Open cases</div><div class="kpi-v"><span data-cu="${SUM.open}">0</span></div><div class="meta">${UI.fmt$(SUM.value)} disputed</div></div>
      <div class="kpi clickable" data-kpi="disputeResolution"><div class="l">${UI.icon('clock','sm')} Avg resolution${UI.dchev()}</div><div class="kpi-v"><span data-cu="${SUM.resolutionDays}">0</span><span class="u">d</span></div><div class="meta"><span class="tgt">target 12d</span></div><div class="bar"><i style="width:${12/SUM.resolutionDays*100}%"></i></div></div>
      <div class="kpi clickable" data-kpi="autoClassification"><div class="l">${UI.icon('zap','sm')} Auto-classification${UI.dchev()}</div><div class="kpi-v"><span data-cu="${SUM.autoClassify}">0</span><span class="u">%</span></div><div class="meta"><span class="tgt">target 80%</span></div></div>
      <div class="kpi"><div class="l">${UI.icon('target','sm')} Predicted recovery</div><div class="kpi-v"><span data-cu="${SUM.winRate}">0</span><span class="u">%</span></div><div class="meta">win probability (avg)</div></div>
    </div>
    <div class="view-h mt14" style="font-size:14px;margin-bottom:10px">Case lifecycle · Capture → Classify → Investigate → Resolve → Analyze</div>
    <div class="stage-pipe">${pipe}</div>
    <div class="grid g2 mt14">
      <div class="card"><div class="card-h">${UI.icon('dispute','sm')}<span class="t">Disputes by type</span></div>
        ${SUM.byType.map(t=>`<div class="hbar"><div class="lab" style="width:150px">${TYPE_LABEL[t.type]||t.type}</div><div class="track"><i style="width:${t.val/tmax*100}%"></i></div><div class="val">${t.n} · ${UI.fmt$(t.val)}</div></div>`).join('')}</div>
      <div class="card"><div class="card-h">${UI.icon('alert','sm')}<span class="t">SLA status</span></div>
        <div class="kv"><span class="k">${UI.pill('Breached','risk',true)}</span><span class="v">${SUM.breached}</span></div>
        <div class="kv"><span class="k">${UI.pill('At risk','warn',true)}</span><span class="v">${SUM.at_risk}</span></div>
        <div class="kv"><span class="k">Resolved (cycle)</span><span class="v">${(st.resolved?.n)||0} · ${UI.fmt$((st.resolved?.val)||0)}</span></div>
        <div class="kv mb0"><span class="k">Denied (won)</span><span class="v">${(st.denied?.n)||0}</span></div>
        <div class="mt14" style="font-size:11px;color:var(--ink-3)">Evidence Assembly Agent pulls from SAP SD, logistics and CLM contracts — assembling case packages in seconds versus hours of manual research.</div></div>
    </div>`;
  document.querySelectorAll('[data-cu]').forEach(el=>UI.countUp(el,+el.dataset.cu));
  UI.wireKpis();
}

async function renderCases(){
  const rows=await API.disputes.cases(FILTER||undefined);
  const counts={};SUM.byStatus.forEach(s=>counts[s.status]=s.n);
  const seg=['','open','investigating','resolved','denied'].map(s=>`<button class="${FILTER===s?'on':''}" data-f="${s}">${s===''?'All':UI.cap(s)} ${s&&counts[s]?`(${counts[s]})`:''}</button>`).join('');
  $('content').innerHTML=`
    <div class="crumb">Dispute Management / Case Queue</div>
    <div class="between"><div><div class="view-h">Dispute case queue</div><div class="view-s">${rows.length} cases · click to inspect evidence, outcome prediction and resolve.</div></div>
      <div class="seg">${seg}</div></div>
    <div class="card" style="padding:0;overflow:hidden">
      <table><thead><tr><th>Case</th><th>Customer</th><th>Type</th><th>Sev.</th><th class="r">Amount</th><th>Source</th><th>Win prob</th><th>Stage</th><th>SLA</th><th>Status</th></tr></thead>
      <tbody>${rows.map(d=>`<tr class="click" data-id="${d.id}">
        <td><b>${d.id}</b><div class="mono" style="font-size:10px;color:var(--ink-3)">${d.doc_number||''}</div></td>
        <td>${d.customer_name||'—'}</td>
        <td>${typePill(d.type)}</td>
        <td>${UI.pill(UI.cap(d.severity),d.severity==='high'?'risk':d.severity==='medium'?'warn':'')}</td>
        <td class="r mono">${UI.fmt$full(d.amount)}</td>
        <td><span class="muted" style="font-size:11px">${UI.cap(d.source)}</span></td>
        <td><span class="mono" style="color:${winColor(d.win_prob)}">${Math.round(d.win_prob*100)}%</span></td>
        <td>${UI.pill(d.stage,'')}</td>
        <td>${UI.slaPill(d.sla_status)}</td>
        <td>${UI.statusPill(d.status)}</td></tr>`).join('')}</tbody></table></div>`;
  document.querySelectorAll('[data-f]').forEach(b=>b.onclick=()=>{FILTER=b.dataset.f;renderCases();});
  document.querySelectorAll('tr[data-id]').forEach(r=>r.onclick=()=>openCase(r.dataset.id));
}

async function openCase(id){
  const d=await API.disputes.case(id);
  const resolved=d.status==='resolved'||d.status==='denied';
  const evHtml=(d.evidence||[]).map((e,ix)=>`<div class="ev-row" data-ev="${ix}" style="cursor:pointer">
    <div class="ev-ic">${UI.icon(EV_IC[e.doc_type]||'file','sm')}</div>
    <div style="flex:1"><div style="font-size:12px;font-weight:500">${UI.cap(e.doc_type)}</div><div class="mono" style="font-size:10px;color:var(--ink-3)">${e.source} · ${e.ref}</div></div>
    <div style="text-align:right"><span class="ev-rel"><i style="width:${e.relevance*100}%"></i></span> <span class="mono" style="font-size:10px">${(e.relevance*100).toFixed(0)}%</span>
      <div style="margin-top:3px">${UI.pill(e.status,e.status==='pulled'?'ok':'')}</div></div></div>`).join('');
  UI.openDrawer(`
    <div class="drawer-h"><div class="li" style="width:34px;height:34px;border-radius:9px;background:var(--orange-tint);color:var(--orange-soft);display:flex;align-items:center;justify-content:center">${UI.icon('dispute')}</div>
      <div><div style="font-weight:600">${d.id} · ${TYPE_LABEL[d.type]||d.type}</div><div class="mono" style="font-size:11px;color:var(--ink-3)">${d.customer_name} · invoice ${d.doc_number||''}</div></div>
      <span class="x" onclick="UI.closeDrawer()">${UI.icon('x')}</span></div>
    <div class="drawer-b">
      <div class="flex between"><div style="font-size:26px;font-weight:600;font-family:var(--mono)">${UI.fmt$full(d.amount)}</div><div>${UI.slaPill(d.sla_status)} ${UI.statusPill(d.status)}</div></div>
      <div><div class="kv"><span class="k">Severity</span><span class="v">${UI.cap(d.severity)}</span></div>
        <div class="kv"><span class="k">Source</span><span class="v">${UI.cap(d.source)}</span></div>
        <div class="kv"><span class="k">Invoice amount</span><span class="v">${UI.fmt$full(d.inv_amount)}</span></div>
        <div class="kv"><span class="k">Assigned to</span><span class="v">${d.assigned_to}</span></div>
        ${resolved?`<div class="kv"><span class="k">Resolution</span><span class="v">${d.resolution||''} · ${UI.fmt$(d.resolved_amount||0)}</span></div>`:''}</div>
      <div class="card tight" style="background:var(--agent-tint);border-color:var(--agent)">
        <div class="flex between" style="margin-bottom:8px"><div class="flex" style="gap:7px">${UI.icon('bot','sm')}<b style="font-size:12px">Outcome Prediction</b></div>
          <button class="btn sm" id="predictBtn">${UI.icon('play','sm')} Predict</button></div>
        <div class="flex between" style="margin-bottom:6px"><span style="font-size:12px">Win probability</span><b class="mono" style="color:${winColor(d.win_prob)}">${Math.round(d.win_prob*100)}%</b></div>
        <div class="win"><i style="width:${d.win_prob*100}%;background:${winColor(d.win_prob)}"></i></div>
        <div style="font-size:11px;color:var(--ink-2);margin-top:8px">Recommended: <b>${UI.cap(d.predicted)}</b> · root cause: ${d.root_cause}</div></div>
      <div><div class="flex between" style="margin-bottom:8px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3)">Evidence package (${(d.evidence||[]).length})</div>
        <button class="btn sm agent" id="evBtn">${UI.icon('play','sm')} Assemble</button></div>${evHtml}</div>
      <div id="dTrace"></div>
    </div>
    ${resolved?'':`<div class="drawer-f">
      <button class="btn" id="denyBtn">${UI.icon('x','sm')} Deny</button>
      <button class="btn" id="partialBtn">Partial credit</button>
      <button class="btn pri" id="approveBtn">${UI.icon('check','sm')} Approve credit</button></div>`}`);
  document.querySelectorAll('.ev-row[data-ev]').forEach(rw=>rw.onclick=()=>{const e=(d.evidence||[])[+rw.dataset.ev]; if(e) UI.docPreview(evDoc(e,d));});
  $('predictBtn').onclick=async()=>{$('predictBtn').disabled=true;const r=await API.disputes.act(id,'predict');
    $('dTrace').innerHTML=traceBox('Outcome Prediction Agent',r);$('predictBtn').disabled=false;};
  $('evBtn').onclick=async()=>{$('evBtn').disabled=true;const r=await API.disputes.act(id,'evidence');
    $('dTrace').innerHTML=traceBox('Evidence Assembly Agent',r);UI.toast('Evidence package assembled');pumpFeed();
    setTimeout(()=>openCase(id),500);};
  if(!resolved){
    const resolve=async(decision)=>{await API.disputes.act(id,'resolve',{decision});UI.toast('Dispute '+(decision==='deny'?'denied':'resolved')+' · '+decision);
      await refresh();UI.closeDrawer();if(VIEW==='cases')renderCases();pumpFeed();};
    $('approveBtn').onclick=()=>resolve('approve');$('partialBtn').onclick=()=>resolve('partial');$('denyBtn').onclick=()=>resolve('deny');
  }
}
function traceBox(title,r){return `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--agent);margin:4px 0 6px">${title}</div>`+UI.trace(r.steps);}

function evDoc(e,d){
  const cust=d.customer_name||'—', amt=UI.fmt$full(d.amount), invAmt=UI.fmt$full(d.inv_amount||d.amount), inv=d.doc_number||'—';
  const F={
    quote_contract:{title:'Quote / Sales Contract',fields:[['Customer',cust],['Quoted price',invAmt],['Payment terms','NET60'],['Disputed amount',amt]]},
    price_list:{title:'Contract Price List · 2026',fields:[['CyberKnife S7','$5,400,000'],['Radixact X9','$4,200,000'],['TomoTherapy','$2,300,000'],['Service / yr','$480,000']]},
    invoice:{title:'AR Invoice',fields:[['Customer',cust],['Invoice',inv],['Invoice amount',invAmt],['Disputed',amt]]},
    installation_report:{title:'Installation / Acceptance Report',fields:[['Site',cust],['System','Radixact X9'],['Install date',(d.created_at||'').slice(0,10)],['Acceptance','Pending clinical sign-off']]},
    delivery_note:{title:'Delivery Note',fields:[['Ship-to',cust],['Carrier','FedEx Freight'],['Status','Delivered to dock']]},
    acceptance_cert:{title:'Acceptance Certificate',fields:[['Site',cust],['System','Radixact X9'],['Clinical sign-off','Disputed']]},
    service_report:{title:'Field Service Report',fields:[['System','CyberKnife S7'],['Issue','Calibration / parts'],['Resolution','On-site']]},
    return_auth:{title:'Return Authorization',fields:[['Customer',cust],['RMA',e.ref],['Reason','Quality / defect']]},
    field_inspection:{title:'Field Inspection Note',fields:[['Site',cust],['Finding','Defect confirmed'],['Action','Replace component']]},
    order_confirmation:{title:'Order Confirmation',fields:[['Customer',cust],['PO ref',inv],['Order amount',invAmt]]},
    milestone_log:{title:'Billing Milestone Log',fields:[['Project',d.id],['Milestone','Acceptance'],['Billed',amt]]},
    gpo_contract:{title:'GPO Contract',fields:[['Member',cust],['Admin fee','2.0%'],['Effective','2026-01-01 → 2026-12-31']]},
    rebate_agreement:{title:'Rebate Agreement',fields:[['Customer',cust],['Rebate rate','3.5%'],['Period','Q2 2026']]},
    service_contract:{title:'Service Contract',fields:[['Customer',cust],['Coverage','Full service + uptime SLA'],['Annual value','$480,000']]},
    uptime_report:{title:'System Uptime / SLA Report',fields:[['System','CyberKnife S7'],['Measured uptime','97.2%'],['SLA target','98.5%'],['Penalty',amt]]},
  };
  const base=F[e.doc_type]||{title:UI.cap(e.doc_type),fields:[['Customer',cust],['Dispute',d.id],['Amount',amt]]};
  return { name:`${e.doc_type}_${d.id}.pdf`, ref:e.ref, source:e.source, date:(d.created_at||'').slice(0,10), kind:'PDF', size:`${((e.ref||'').length*60+260)} KB`,
    title:base.title, fields:[...base.fields,['Evidence relevance',Math.round((e.relevance||0)*100)+'%'],['Status',UI.cap(e.status)]] };
}

async function renderRootCause(){
  const rc=SUM.rootCause;const max=Math.max(...rc.map(r=>r.val),1);
  $('content').innerHTML=`
    <div class="crumb">Dispute Management / Root Cause</div>
    <div class="view-h">Root cause analytics</div>
    <div class="view-s">The Root Cause Analyzer clusters disputes to surface systemic upstream failures — feeding corrective action back into pricing, logistics and quality.</div>
    <div class="card"><div class="card-h">${UI.icon('trend','sm')}<span class="t">Disputes by root cause</span><span class="x">${rc.length} causes · upstream signal</span></div>
      ${rc.map(r=>`<div class="hbar"><div class="lab" style="width:230px">${r.root_cause}</div><div class="track"><i style="width:${r.val/max*100}%;background:${r.type==='unauthorized_deduction'||r.type==='quality'?'var(--risk)':'var(--orange)'}"></i></div><div class="val">${r.n} · ${UI.fmt$(r.val)}</div></div>`).join('')}</div>
    <div class="grid g3 mt14">
      ${rc.slice(0,3).map(r=>`<div class="card tight"><div class="tag">${TYPE_LABEL[r.type]||r.type}</div>
        <div style="font-weight:600;margin:8px 0 5px">${r.root_cause}</div>
        <div style="font-size:11.5px;color:var(--ink-3);line-height:1.5">${r.n} cases · ${UI.fmt$(r.val)} exposure. Upstream Alert Agent flagged this pattern for corrective action.</div></div>`).join('')}</div>`;
}

async function pumpFeed(){try{const a=await API.activity(20);$('feed').innerHTML=a.filter(x=>x.module==='dispute'||x.module==='platform').slice(0,12).map(x=>UI.feedItem(x)).join('');}catch{}}
async function refresh(){SUM=await API.disputes.summary();paintHead();}
function paintHead(){$('hOpen').textContent=SUM.open;$('hDays').textContent=SUM.resolutionDays+'d';$('hWin').textContent=SUM.winRate+'%';
  $('trustMeta').textContent=`${SUM.open} open · ${SUM.breached} SLA breached · ${SUM.autoClassify}% auto-classified`;}
function renderNav(){$('nav').innerHTML=`<div class="grp">Dispute Management</div>`+NAV.map(n=>`<div class="nav-btn ${n.id===VIEW?'active':''}" data-v="${n.id}">${UI.icon(n.ic,'sm')} ${n.name}${n.id==='cases'&&SUM?`<span class="badge">${SUM.open}</span>`:''}</div>`).join('');
  document.querySelectorAll('.nav-btn[data-v]').forEach(b=>b.onclick=()=>{VIEW=b.dataset.v;renderNav();route();});}
function route(){({overview:renderOverview,cases:renderCases,rootcause:renderRootCause,process:()=>UI.renderProcessMap('content','dispute'),roi:()=>UI.renderROI('content','dispute')}[VIEW])();}
async function boot(){UI.initTheme();UI.initPanels();UI.mountThemeToggle($('themeBtn'));$('cmdBtn').innerHTML=UI.icon('grid','sm');$('cmdBtn').onclick=()=>parent.postMessage({__navTo:'command'},'*');
  SUM=await API.disputes.summary();paintHead();renderNav();route();pumpFeed();
  window.addEventListener('message',e=>{ if(e.data&&e.data.__setView){ VIEW=e.data.__setView; renderNav(); route(); }});
  setInterval(pumpFeed,9000);}
boot();
})();
