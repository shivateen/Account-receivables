// collections.js — Collections Management cockpit
(function(){
const $=(id)=>document.getElementById(id);
let SUM=null, VIEW='overview';
const NAV=[
  {id:'overview',name:'Overview',ic:'home'},
  {id:'worklist',name:'Smart Worklist',ic:'collect'},
  {id:'collectors',name:'Collector Desk',ic:'user'},
  {id:'risk',name:'Aging & Delinquency',ic:'alert'},
  {id:'process',name:'Process Map',ic:'layers'},
  {id:'roi',name:'ROI',ic:'dollar'},
];
const FLABEL={invoice_value:'Invoice value',days_past_due:'Days past due',customer_risk:'Customer risk',payment_history:'Payment history',dispute_signal:'Dispute signal'};

function pscore(s){ const cls=s>=70?'hi':s>=50?'mid':''; return `<span class="pscore ${cls}">${Math.round(s)}</span>`; }
function delqColor(p){ return p>0.7?'var(--risk)':p>0.45?'var(--warn)':'var(--ok)'; }

async function renderOverview(){
  const m=await API.metrics();
  const stages=['Prioritize','Engage','Track','Resolve','Escalate'];
  const sMap={}; SUM.stages.forEach(s=>sMap[s.stage]=s);
  const pipe=stages.map(st=>{const s=sMap[st]||{n:0,val:0};
    return `<div class="sp"><div class="l">${st}</div><div class="n">${s.n}</div><div class="v">${UI.fmt$(s.val)}</div></div>`;}).join('');
  const agMax=Math.max(...SUM.aging.map(a=>a.val),1);
  $('content').innerHTML=`
    <div class="crumb">Collections / Overview</div>
    <div class="view-h">Predictive recovery, not reactive chasing</div>
    <div class="view-s">${SUM.cases} open cases · ${UI.fmt$(SUM.past_due)} past due · ${SUM.highRisk} accounts flagged for 30-day delinquency.</div>
    <div class="grid g4">
      <div class="kpi clickable" data-kpi="cei"><div class="l">${UI.icon('target','sm')} CEI${UI.dchev()}</div><div class="kpi-v"><span data-cu="${m.kpis.cei.val}">0</span><span class="u">%</span></div><div class="meta"><span class="tgt">target 90%</span></div><div class="bar"><i style="width:${m.kpis.cei.val/90*100}%"></i></div></div>
      <div class="kpi"><div class="l">${UI.icon('alert','sm')} SLA breached</div><div class="kpi-v" style="color:var(--risk)"><span data-cu="${SUM.breached}">0</span></div><div class="meta">${SUM.at_risk} more at risk</div></div>
      <div class="kpi"><div class="l">${UI.icon('check','sm')} PTP conversion</div><div class="kpi-v"><span data-cu="${SUM.promises.conversion}">0</span><span class="u">%</span></div><div class="meta">${SUM.promises.n} promises tracked</div></div>
      <div class="kpi"><div class="l">${UI.icon('mail','sm')} Dunning response</div><div class="kpi-v"><span data-cu="${SUM.dunning.responseRate}">0</span><span class="u">%</span></div><div class="meta">${SUM.dunning.sent} sent</div></div>
    </div>
    <div class="view-h mt14" style="font-size:14px;margin-bottom:10px">Collection pipeline · Prioritize → Engage → Track → Resolve → Escalate</div>
    <div class="stage-pipe">${pipe}</div>
    <div class="grid g2 mt14">
      <div class="card"><div class="card-h">${UI.icon('alert','sm')}<span class="t">Past-due aging</span></div>
        ${SUM.aging.map(a=>`<div class="hbar"><div class="lab">${a.b} days</div><div class="track"><i style="width:${a.val/agMax*100}%;background:${a.b==='90+'?'var(--risk)':a.b==='61-90'?'var(--warn)':'var(--orange)'}"></i></div><div class="val">${UI.fmt$(a.val)}</div></div>`).join('')}</div>
      <div class="card"><div class="card-h">${UI.icon('user','sm')}<span class="t">Collector performance</span></div>
        ${SUM.collectors.map(c=>`<div class="hbar"><div class="lab" style="width:130px">${c.name}</div><div class="track"><i style="width:${c.performance}%;background:var(--ok)"></i></div><div class="val">${c.performance} · ${c.active_cases} cases</div></div>`).join('')}</div>
    </div>`;
  document.querySelectorAll('[data-cu]').forEach(el=>UI.countUp(el,+el.dataset.cu));
  UI.wireKpis();
}

async function renderWorklist(){
  const rows=await API.collections.worklist();
  $('content').innerHTML=`
    <div class="crumb">Collections / Smart Worklist</div>
    <div class="between"><div><div class="view-h">AI-prioritized worklist</div>
      <div class="view-s">${rows.length} cases scored on 20+ factors and re-ranked daily. Highest priority first — click a row for the full customer 360.</div></div>
      <span class="pill agent">${UI.icon('bot','sm')} Worklist Prioritization Agent · live</span></div>
    <div class="card" style="padding:0;overflow:hidden">
      <table><thead><tr><th class="c">#</th><th>Customer</th><th>Segment</th><th class="r">Past due</th><th class="c">Oldest</th><th>Risk</th><th class="c">Delinq.</th><th>Stage</th><th>SLA</th><th>Pri.</th><th>Collector</th></tr></thead>
      <tbody>${rows.map(c=>`<tr class="click" data-id="${c.id}">
        <td class="rank">${c.priority_rank}</td>
        <td><b>${c.customer_name}</b></td>
        <td><span class="muted" style="font-size:11px">${c.segment}</span></td>
        <td class="r mono">${UI.fmt$full(c.total_past_due)}</td>
        <td class="c mono">${c.oldest_days}d</td>
        <td>${UI.riskPill(c.risk_tier)}</td>
        <td class="c"><span class="mono" style="color:${delqColor(c.delinquency_prob)}">${Math.round(c.delinquency_prob*100)}%</span></td>
        <td>${UI.pill(c.stage,c.stage==='Escalate'?'risk':c.stage==='Resolve'?'warn':'info')}</td>
        <td>${UI.slaPill(c.sla_status)}</td>
        <td>${pscore(c.priority_score)}</td>
        <td><span style="font-size:11px">${c.collector_name||'—'}</span></td></tr>`).join('')}</tbody></table></div>`;
  document.querySelectorAll('tr[data-id]').forEach(r=>r.onclick=()=>openCase(r.dataset.id));
}

async function openCase(id){
  const c=await API.collections.case(id);
  const f=c.factors||{};
  const fmax=Math.max(...Object.values(f).map(Math.abs),1);
  const factorHtml=Object.keys(FLABEL).filter(k=>k in f).map(k=>`<div class="factor"><div class="fl">${FLABEL[k]}</div>
    <div class="ft"><i style="width:${Math.abs(f[k])/fmax*100}%;background:${f[k]<0?'var(--risk)':'var(--orange)'}"></i></div><div class="fv">${f[k]>0?'+':''}${f[k]}</div></div>`).join('');
  const dun=(c.dunning||[]).map(d=>`<div class="tl"><div class="th">${UI.cap(d.channel)} · step ${d.step} ${UI.pill(d.response,d.response==='paid'||d.response==='promised'?'ok':d.response==='disputed'?'risk':'')}</div><div class="td">${d.sent_at?d.sent_at.slice(0,10):''} · ${d.subject||''}</div></div>`).join('')||'<div class="muted" style="font-size:12px">No dunning yet</div>';
  const proms=(c.promises||[]).map(p=>`<div class="kv"><span class="k">${p.promise_date||'—'} · ${UI.cap(p.captured_from)}</span><span class="v">${UI.fmt$full(p.amount)} ${UI.pill(p.status,p.status==='kept'?'ok':p.status==='broken'?'risk':'warn')}</span></div>`).join('')||'<div class="muted" style="font-size:12px">No promises logged</div>';
  const calls=(c.calls||[]).map(cl=>`<div class="card tight"><div class="flex between"><b style="font-size:12px">${cl.collector}</b><span class="muted mono" style="font-size:10px">${cl.ts?cl.ts.slice(0,10):''} · ${Math.round(cl.duration/60)}m</span></div>
    <div style="font-size:12px;color:var(--ink-2);margin-top:5px">${cl.summary}</div><div class="tag mt8">${cl.commitments}</div></div>`).join('');
  UI.openDrawer(`
    <div class="drawer-h"><div class="li" style="width:34px;height:34px;border-radius:9px;background:var(--orange-tint);color:var(--orange-soft);display:flex;align-items:center;justify-content:center">${UI.icon('user')}</div>
      <div><div style="font-weight:600">${c.customer_name}</div><div class="mono" style="font-size:11px;color:var(--ink-3)">${c.id} · ${c.segment} · ${c.region}</div></div>
      <span class="x" onclick="UI.closeDrawer()">${UI.icon('x')}</span></div>
    <div class="drawer-b">
      <div class="flex between"><div><div style="font-size:26px;font-weight:600;font-family:var(--mono)">${UI.fmt$full(c.total_past_due)}</div><div class="muted" style="font-size:11px">past due · oldest ${c.oldest_days} days</div></div>
        <div style="text-align:right">${UI.slaPill(c.sla_status)} ${UI.riskPill(c.risk_tier)}</div></div>
      <div class="card tight" style="background:var(--agent-tint);border-color:var(--agent)">
        <div class="flex between" style="margin-bottom:8px"><div class="flex" style="gap:7px">${UI.icon('bot','sm')}<b style="font-size:12px">Delinquency Predictor</b></div>
          <button class="btn sm" id="predictBtn">${UI.icon('play','sm')} Re-run</button></div>
        <div class="flex between" style="margin-bottom:6px"><span style="font-size:12px">30-day delinquency probability</span><b class="mono" style="color:${delqColor(c.delinquency_prob)}">${Math.round(c.delinquency_prob*100)}%</b></div>
        <div class="delq"><i style="width:${c.delinquency_prob*100}%;background:${delqColor(c.delinquency_prob)}"></i></div></div>
      <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3);margin-bottom:8px">Priority factor breakdown · score ${c.priority_score}</div>${factorHtml}</div>
      <div><div class="kv"><span class="k">Strategy</span><span class="v">${c.strategy}</span></div>
        <div class="kv"><span class="k">Next action</span><span class="v">${c.next_action}</span></div>
        <div class="kv"><span class="k">Credit limit / used</span><span class="v">${UI.fmt$(c.credit_limit)} / ${UI.fmt$(c.credit_used)}</span></div>
        <div class="kv"><span class="k">Terms · DSO</span><span class="v">${c.payment_terms} · ${c.dso}d</span></div>
        <div class="kv"><span class="k">Contact</span><span class="v">${c.contact_name||'—'}</span></div></div>
      <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3);margin-bottom:8px">Past-due invoices (${c.invoices.length})</div>
        ${c.invoices.map(i=>`<div class="kv"><span class="k mono">${i.doc_number} · ${i.aging_bucket}d</span><span class="v">${UI.fmt$full(i.open_amount)}</span></div>`).join('')}</div>
      <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3);margin-bottom:10px">Dunning history</div><div class="timeline">${dun}</div></div>
      <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3);margin-bottom:8px">Promises to pay</div>${proms}</div>
      ${calls?`<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3);margin-bottom:8px">Call log</div><div class="grid" style="gap:8px">${calls}</div></div>`:''}
      <div id="cTrace"></div>
    </div>
    <div class="drawer-f">
      <button class="btn" id="ptpBtn">${UI.icon('check','sm')} Log promise</button>
      <button class="btn agent" id="callBtn">${UI.icon('phone','sm')} Queue call</button>
      <button class="btn pri" id="dunBtn">${UI.icon('mail','sm')} Send dunning</button>
    </div>`);
  $('predictBtn').onclick=async()=>{ $('predictBtn').disabled=true; const r=await API.collections.predict(id);
    $('cTrace').innerHTML=`<div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--agent);margin-bottom:6px">Delinquency Predictor trace</div>`+UI.trace(r.steps); $('predictBtn').disabled=false; };
  $('dunBtn').onclick=async()=>{ $('dunBtn').disabled=true; const r=await API.collections.dun(id,'email');
    UI.toast('Dunning sent · step '+r.step); $('cTrace').innerHTML=`<div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--agent);margin-bottom:6px">Smart Dunning Agent</div>`+UI.trace(r.trace.steps);
    pumpFeed(); $('dunBtn').disabled=false; };
  $('callBtn').onclick=()=>{ UI.toast('Call queued to parallel dialer'); pumpFeed(); };
  $('ptpBtn').onclick=async()=>{ const d=new Date(Date.now()+10*864e5).toISOString().slice(0,10);
    await API.collections.promise(id,{amount:c.total_past_due,promise_date:d}); UI.toast('Promise-to-pay logged · '+d); pumpFeed(); };
}

async function renderCollectors(){
  $('content').innerHTML=`
    <div class="crumb">Collections / Collector Desk</div>
    <div class="view-h">Collector desk & workload</div>
    <div class="view-s">AI balances workload across the team; the auto-collector handles the low-touch long tail.</div>
    <div class="grid g4">${SUM.collectors.map(c=>`<div class="card">
      <div class="flex" style="gap:10px;margin-bottom:10px"><div class="li" style="width:34px;height:34px;border-radius:9px;background:var(--orange-tint);color:var(--orange-soft);display:flex;align-items:center;justify-content:center">${UI.icon(c.name.includes('AI')?'bot':'user')}</div>
        <div><div style="font-weight:600;font-size:13px">${c.name}</div><div class="muted" style="font-size:10.5px">${c.specialization}</div></div></div>
      <div class="kv"><span class="k">Active cases</span><span class="v">${c.active_cases} / ${c.capacity}</span></div>
      <div class="kv"><span class="k">Performance (CEI)</span><span class="v">${c.performance}%</span></div>
      <div class="kv mb0"><span class="k">Recovered MTD</span><span class="v">${UI.fmt$(c.recovered_mtd)}</span></div>
      <div class="bar" style="margin-top:10px"><i style="width:${c.performance}%"></i></div></div>`).join('')}</div>`;
}

async function renderRisk(){
  const rows=await API.collections.worklist();
  const high=rows.filter(c=>c.delinquency_prob>0.6).sort((a,b)=>b.delinquency_prob-a.delinquency_prob);
  const agMax=Math.max(...SUM.aging.map(a=>a.val),1);
  $('content').innerHTML=`
    <div class="crumb">Collections / Aging & Delinquency</div>
    <div class="view-h">Aging concentration & delinquency risk</div>
    <div class="view-s">The Delinquency Predictor scores every account 30 days ahead; accounts above 70% trigger proactive outreach before they roll past due.</div>
    <div class="grid g2">
      <div class="card"><div class="card-h">${UI.icon('trend','sm')}<span class="t">Past-due aging</span></div>
        <div class="aging-bars">${SUM.aging.map(a=>{const cls=a.b==='90+'?'risk':a.b==='61-90'?'warn':'';
          return `<div class="b ${cls}"><div class="v">${UI.fmt$(a.val)}</div><div class="col" style="height:${a.val/agMax*100}%"></div><div class="lab">${a.b}d</div></div>`;}).join('')}</div></div>
      <div class="card"><div class="card-h">${UI.icon('alert','sm')}<span class="t">Delinquency watchlist</span><span class="x">${high.length} accounts > 60%</span></div>
        ${high.slice(0,8).map(c=>`<div class="flex between" style="padding:7px 0;border-bottom:1px solid var(--line)">
          <div><div style="font-weight:500;font-size:12.5px">${c.customer_name}</div><div class="muted" style="font-size:10.5px">${UI.fmt$(c.total_past_due)} · ${c.oldest_days}d</div></div>
          <div style="width:120px"><div class="delq"><i style="width:${c.delinquency_prob*100}%;background:${delqColor(c.delinquency_prob)}"></i></div>
            <div class="mono" style="font-size:10px;text-align:right;color:${delqColor(c.delinquency_prob)};margin-top:3px">${Math.round(c.delinquency_prob*100)}%</div></div></div>`).join('')}</div>
    </div>`;
}

async function pumpFeed(){ try{ const acts=await API.activity(20);
  $('feed').innerHTML=acts.filter(a=>a.module==='collections'||a.module==='platform').slice(0,12).map(a=>UI.feedItem(a)).join(''); }catch{} }

async function paintHead(){ const m=await API.metrics();
  $('hCases').textContent=SUM.cases; $('hPastDue').textContent=UI.fmt$(SUM.past_due); $('hCei').textContent=m.kpis.cei.val+'%';
  $('trustMeta').textContent=`${SUM.breached} breached · ${SUM.highRisk} high-risk · ${SUM.dunning.sent} dunning sent`; }

function renderNav(){ $('nav').innerHTML=`<div class="grp">Collections</div>`+NAV.map(n=>`<div class="nav-btn ${n.id===VIEW?'active':''}" data-v="${n.id}">${UI.icon(n.ic,'sm')} ${n.name}${n.id==='worklist'&&SUM?`<span class="badge">${SUM.cases}</span>`:''}</div>`).join('');
  document.querySelectorAll('.nav-btn[data-v]').forEach(b=>b.onclick=()=>{VIEW=b.dataset.v;renderNav();route();}); }
function route(){ ({overview:renderOverview,worklist:renderWorklist,collectors:renderCollectors,risk:renderRisk,process:()=>UI.renderProcessMap('content','collections'),roi:()=>UI.renderROI('content','collections')}[VIEW])(); }

async function boot(){
  UI.initTheme(); UI.initPanels(); UI.mountThemeToggle($('themeBtn'));
  $('cmdBtn').innerHTML=UI.icon('grid','sm'); $('cmdBtn').onclick=()=>parent.postMessage({__navTo:'command'},'*');
  SUM=await API.collections.summary(); await paintHead(); renderNav(); route(); pumpFeed();
  window.addEventListener('message',e=>{ if(e.data&&e.data.__setView){ VIEW=e.data.__setView; renderNav(); route(); }});
  setInterval(pumpFeed,9000);
}
boot();
})();
