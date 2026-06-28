// command.js — AR Command Center
(function(){
const $ = (id) => document.getElementById(id);
let M = null, ROSTER = [], PERSONA = 'cfo', VIEW = 'overview';
const CACHE = {};

const NAV = [
  { id:'overview', name:'Overview', ic:'home' },
  { id:'process', name:'AR Process Map', ic:'layers' },
  { id:'capital', name:'Working Capital', ic:'trend' },
  { id:'roi', name:'ROI', ic:'dollar' },
  { id:'workforce', name:'AI Workforce', ic:'bot' },
  { id:'configure', name:'Configure', ic:'settings' },
];
const MODULES = [
  { app:'cashapp', mod:'cashapp', name:'Cash Application', ic:'cash', desc:'Remittance capture · 5-layer matching · SAP posting', live:true },
  { app:'collections', mod:'collections', name:'Collections', ic:'collect', desc:'AI worklist · smart dunning · promise-to-pay', live:true },
  { app:'disputes', mod:'dispute', name:'Dispute Management', ic:'dispute', desc:'Auto-classification · evidence assembly · root cause', live:true },
  { app:'deductions', mod:'deductions', name:'Deductions', ic:'deduct', desc:'Validity prediction · trade-promo matching', live:true },
];
// which KPIs each persona leads with
const PERSONA_KPIS = {
  cfo:  ['dso','cei','pastDuePct','autoMatchRate','disputeResolution','autoValidation'],
  arc:  ['dso','pastDuePct','openExceptions','unappliedCash','autoClassification','autoValidation'],
  col:  ['cei','pastDuePct','delinquencyRisk','dso','openExceptions','autoMatchRate'],
  cash: ['autoMatchRate','matchRate','unappliedCash','openExceptions','dso','cei'],
};
const KLABEL = { dso:'DSO', cei:'Collection Effectiveness', autoMatchRate:'Auto-Match Rate', matchRate:'Match Rate',
  unappliedCash:'Unapplied Cash', openExceptions:'Open Exceptions', pastDuePct:'Past-Due Ratio', delinquencyRisk:'Delinquency Risk',
  disputeResolution:'Dispute Resolution', autoClassification:'Auto-Classification', autoValidation:'Deduction Auto-Validation' };
const KICON = { dso:'clock', cei:'target', autoMatchRate:'zap', matchRate:'check', unappliedCash:'cash',
  openExceptions:'alert', pastDuePct:'trend', delinquencyRisk:'alert',
  disputeResolution:'dispute', autoClassification:'zap', autoValidation:'deduct' };

function kpiCard(key, k){
  const down = k.dir === 'down-good';
  const good = down ? k.delta < 0 : k.delta > 0;
  const fill = down ? Math.min(100, (k.target / Math.max(k.val,0.01)) * 100) : Math.min(100, (k.val / Math.max(k.target,0.01)) * 100);
  const dv = (k.delta>0?'+':'') + k.delta + (k.unit==='%'||k.unit==='days'?'':'');
  return `<div class="kpi clickable" data-kpi="${key}">
    <div class="l">${UI.icon(KICON[key],'sm')} ${KLABEL[key]}<span style="margin-left:auto;color:var(--ink-4)" title="Drill into contributing sub-metrics">${UI.icon('chevR','sm')}</span></div>
    <div class="kpi-v"><span data-cu="${k.val}" data-dp="${k.unit==='%'&&!Number.isInteger(k.val)?1:0}">${k.val}</span><span class="u">${k.unit}</span></div>
    <div class="meta"><span class="delta ${good?'good':'bad'}">${UI.icon(k.delta<0?'down':'up','sm')}${dv}</span>
      <span title="${M.period?`${M.period.basis}: ${M.period.current} vs ${M.period.prior} month-end`:''}">${M.period?M.period.label:'vs last period'}</span><span class="tgt">target ${k.target}${k.unit}</span></div>
    <div class="bar"><i style="width:${fill}%"></i></div></div>`;
}

function renderOverview(){
  const keys = PERSONA_KPIS[PERSONA];
  const ag = M.aging;
  const maxA = Math.max(...Object.values(ag));
  const order = ['current','1-30','31-60','61-90','90+'];
  const cls = { '61-90':'warn', '90+':'risk' };
  const agingBars = order.map(b=>`<div class="b ${cls[b]||''}">
    <div class="v">${UI.fmt$(ag[b])}</div>
    <div class="col" style="height:${Math.max(3,(ag[b]/maxA)*100)}%"></div>
    <div class="lab">${b==='current'?'Current':b+'d'}</div></div>`).join('');

  const launchers = MODULES.map(mo=>{
    const r = ROSTER.find(x=>x.module===mo.mod) || {n:0,active:0,runs:0};
    const stats = mo.app==='cashapp' ? [[M.cashapp.posted,'posted'],[M.cashapp.open,'in queue'],[r.active,'agents on']]
      : mo.app==='collections' ? [[M.collections.cases,'cases'],[UI.fmt$(M.collections.pastDue),'past due'],[r.active,'agents on']]
      : mo.app==='disputes' ? [[M.dispute.open,'open cases'],[M.dispute.resolutionDays+'d','avg resolve'],[r.active,'agents on']]
      : mo.app==='deductions' ? [[M.deductions.open,'open'],[M.deductions.autoValidation+'%','auto-valid'],[r.active,'agents on']]
      : [[r.n,'agents'],['Q2/Q3','GA'],['—','']];
    return `<div class="launch ${mo.live?'':'soon'}" ${mo.live?`data-app="${mo.app}"`:''}>
      <div class="lh"><div class="li">${UI.icon(mo.ic,'lg')}</div>
        <div><div class="ln">${mo.name} ${mo.live?'':UI.pill('Phase 2','')}</div><div class="ld">${mo.desc}</div></div></div>
      <div class="lstats">${stats.map(([v,l])=>`<div class="lstat"><div class="v">${v}</div><div class="l">${l}</div></div>`).join('')}</div>
    </div>`;
  }).join('');

  $('content').innerHTML = `
    <div class="crumb">AR Command Center / Overview · <span class="mono">as of ${M.asOf}</span></div>
    <div class="between"><div><div class="view-h">Receivables control tower</div>
      <div class="view-s">Total open AR <b style="color:var(--ink)">${UI.fmt$full(M.totalAR)}</b> · past due <b style="color:var(--warn)">${UI.fmt$full(M.pastDue)}</b> · live from SAP FI-AR.</div></div>
      <button class="btn" id="refreshBtn">${UI.icon('refresh','sm')} Refresh</button></div>
    <div class="muted" style="font-size:11px;margin-bottom:11px;display:flex;align-items:center;gap:6px">${UI.icon('clock','sm')} KPI deltas are <b style="color:var(--ink-2)">${M.period.basis.toLowerCase()}</b> — <b style="color:var(--ink-2)">${M.period.current}</b> vs <b style="color:var(--ink-2)">${M.period.prior}</b> month-end · <span class="mono">target</span> = transformation goal</div>
    <div class="grid g3" id="kpiGrid">${keys.map(k=>kpiCard(k,M.kpis[k])).join('')}</div>
    <div class="grid g2 mt14" style="grid-template-columns:1.1fr .9fr">
      <div class="card"><div class="card-h">${UI.icon('trend','sm')}<span class="t">AR Aging</span><span class="x">open balance by bucket</span></div>
        <div class="aging-bars">${agingBars}</div></div>
      <div class="card"><div class="card-h">${UI.icon('target','sm')}<span class="t">Transformation targets</span></div>
        ${targetRows()}</div>
    </div>
    <div class="view-h mt14" style="font-size:15px;margin-bottom:12px">Launch a module</div>
    <div class="grid g2">${launchers}</div>`;

  document.querySelectorAll('.kpi-v [data-cu]').forEach(el=>UI.countUp(el, +el.dataset.cu, {dp:+el.dataset.dp}));
  document.querySelectorAll('.kpi[data-kpi]').forEach(c=>c.onclick=()=>openKPI(c.dataset.kpi));
  document.querySelectorAll('.launch[data-app]').forEach(l=>l.onclick=()=>parent.postMessage({__navTo:l.dataset.app},'*'));
  $('refreshBtn').onclick = load;
}

function targetRows(){
  const rows = [
    ['DSO', M.kpis.dso.val+'d', M.kpis.dso.target+'d', M.kpis.dso.val, M.kpis.dso.target, true],
    ['Auto-match', M.kpis.autoMatchRate.val+'%', M.kpis.autoMatchRate.target+'%', M.kpis.autoMatchRate.val, M.kpis.autoMatchRate.target, false],
    ['CEI', M.kpis.cei.val+'%', M.kpis.cei.target+'%', M.kpis.cei.val, M.kpis.cei.target, false],
    ['Unapplied cash', M.kpis.unappliedCash.val+'%', M.kpis.unappliedCash.target+'%', M.kpis.unappliedCash.val, M.kpis.unappliedCash.target, true],
  ];
  return rows.map(([l,cur,tgt,v,t,down])=>{
    const prog = down ? Math.min(100,(t/v)*100) : Math.min(100,(v/t)*100);
    return `<div class="hbar"><div class="lab">${l}</div><div class="track"><i style="width:${prog}%"></i></div>
      <div class="val">${cur} → <span style="color:var(--ok)">${tgt}</span></div></div>`;
  }).join('');
}

const openKPI=(key)=>UI.openKPI(key);

function renderProcess(){
  if(!M) return;
  const r=(mod)=>ROSTER.find(x=>x.module===mod)||{n:0,active:0};
  const flow=[
    { edge:true, ic:'file', name:'Billing / Invoice', sub:'SAP SD → FI-AR' },
    { app:'collections', mod:'collections', ic:'collect', stage:'Engage & Collect', name:'Collections',
      acts:['Refresh aging & prioritize worklist','Predict 30-day delinquency','Smart dunning + AI call assist','Promise-to-pay & escalation'],
      stat:()=>`${M.collections.cases} open cases · ${UI.fmt$(M.collections.pastDue)} past due` },
    { app:'cashapp', mod:'cashapp', ic:'cash', stage:'Receive & Apply Cash', name:'Cash Application',
      acts:['Capture remittance (all channels)','5-layer matching waterfall','Resolve short-pays & exceptions','Post & clear to SAP'],
      stat:()=>`${M.kpis.matchRate.val}% matched · ${M.kpis.autoMatchRate.val}% auto` },
    { app:'disputes', mod:'dispute', ic:'dispute', stage:'Resolve Disputes', name:'Dispute Management',
      acts:['Capture & classify case','Assemble evidence (ERP/logistics)','Predict win/loss outcome','Credit / deny + root cause'],
      stat:()=>`${M.dispute.open} open · ${M.dispute.resolutionDays}d avg` },
    { app:'deductions', mod:'deductions', ic:'deduct', stage:'Resolve Deductions', name:'Deductions',
      acts:['Capture claim + backup docs','Predict validity (valid/invalid)','Match GPO / rebate programme','Write-off / dispute invalid'],
      stat:()=>`${M.deductions.open} open · ${M.deductions.autoValidation}% auto-valid` },
    { edge:true, ic:'trend', name:'AR Analytics', sub:'Working capital & close' },
  ];
  const nodeHtml=(n)=>{
    if(n.edge) return `<div class="o2c-node edge"><div class="ni">${UI.icon(n.ic,'lg')}</div><div style="font-weight:600;font-size:12px">${n.name}</div><div class="muted" style="font-size:10px">${n.sub}</div></div>`;
    const ag=r(n.mod);
    return `<div class="o2c-node mod" data-app="${n.app}">
      <div class="o2c-stage">${n.stage}</div>
      <div class="nm"><span class="ni">${UI.icon(n.ic,'lg')}</span>${n.name}</div>
      <ul class="o2c-acts">${n.acts.map(a=>`<li><span>${a}</span></li>`).join('')}</ul>
      <div class="o2c-foot"><div class="st">${n.stat()}</div>
        <div class="between"><span class="muted" style="font-size:10.5px">${UI.icon('bot','sm')} ${ag.n} agents · ${ag.active} live</span>
        <span class="lk">View process map ${UI.icon('arrow','sm')}</span></div></div></div>`;
  };
  const chain=flow.map(nodeHtml).join(`<div class="o2c-arrow">${UI.icon('arrow','lg')}</div>`);
  $('content').innerHTML=`
    <div class="crumb">AR Command Center / AR Process Map</div>
    <div class="view-h">End-to-end order-to-cash process</div>
    <div class="view-s">The receivables lifecycle across all four modules, on one SAP FI-AR data spine. Each module is run by its AI agent workforce with humans in the loop. <b>Click any module to open its detailed, step-level process map.</b></div>
    <div class="card" style="overflow:hidden;margin-bottom:14px"><div class="o2c">${chain}</div></div>
    <div class="grid g3">
      <div class="card tight"><div class="flex" style="gap:7px;margin-bottom:6px">${UI.icon('zap','sm')}<b style="font-size:12px">Cross-module flows</b></div>
        <div style="font-size:11.5px;color:var(--ink-2);line-height:1.6">Cash Application detects <b>short-pays</b> → auto-creates <b>Deductions</b>; invalid deductions and collection disputes flow into <b>Dispute Management</b>; resolutions post back to SAP FI-AR.</div></div>
      <div class="card tight"><div class="flex" style="gap:7px;margin-bottom:6px">${UI.icon('sap','sm')}<b style="font-size:12px">One SAP data spine</b></div>
        <div style="font-size:11.5px;color:var(--ink-2);line-height:1.6">FI-AR open items, FSCM-COL, FSCM-DM and SD-TPM stay in sync via the SAP Sync agent — every module reads and writes the same system of record.</div></div>
      <div class="card tight"><div class="flex" style="gap:7px;margin-bottom:6px">${UI.icon('bot','sm')}<b style="font-size:12px">Agentic workforce</b></div>
        <div style="font-size:11.5px;color:var(--ink-2);line-height:1.6">46 agents span the lifecycle. Open any module's process map to see the agent / human-in-the-loop overlay on its detailed activities.</div></div>
    </div>`;
  document.querySelectorAll('.o2c-node.mod').forEach(n=>n.onclick=()=>parent.postMessage({__navTo:n.dataset.app,__view:'process'},'*'));
}

async function renderCapital(){
  const [ca, co] = await Promise.all([API.cashapp.summary(), API.collections.summary()]);
  CACHE.ca = ca; CACHE.co = co;
  const ag = M.aging;
  const recover = M.pastDue * 0.62; // illustrative recoverable within targets
  const dsoGap = M.kpis.dso.val - M.kpis.dso.target;
  const wcUnlock = (M.totalAR / Math.max(M.kpis.dso.val,1)) * dsoGap; // daily AR * days released
  $('content').innerHTML = `
    <div class="crumb">AR Command Center / Working Capital</div>
    <div class="view-h">Working capital intelligence</div>
    <div class="view-s">What the receivables book is tying up — and what the accelerator's targets release.</div>
    <div class="grid g3">
      <div class="kpi"><div class="l">${UI.icon('dollar','sm')} Cash trapped in AR</div><div class="kpi-v">${UI.fmt$(M.totalAR)}</div><div class="meta">open receivables</div></div>
      <div class="kpi"><div class="l">${UI.icon('zap','sm')} DSO reduction prize</div><div class="kpi-v" style="color:var(--orange-soft)">${UI.fmt$(wcUnlock)}</div><div class="meta">${dsoGap} days × daily AR released</div></div>
      <div class="kpi"><div class="l">${UI.icon('target','sm')} Recoverable past-due</div><div class="kpi-v">${UI.fmt$(recover)}</div><div class="meta">within collection targets</div></div>
    </div>
    <div class="grid g2 mt14">
      <div class="card"><div class="card-h">${UI.icon('cash','sm')}<span class="t">Cash Application health</span></div>
        <div class="kv"><span class="k">Payments posted straight-through</span><span class="v">${ca.posted} / ${ca.total}</span></div>
        <div class="kv"><span class="k">Match rate</span><span class="v">${ca.matchRate}%</span></div>
        <div class="kv"><span class="k">Unapplied / on-account</span><span class="v" style="color:var(--warn)">${UI.fmt$(ca.unapplied)}</span></div>
        <div class="kv mb0"><span class="k">Exceptions in queue</span><span class="v">${M.exceptions.open}</span></div>
      </div>
      <div class="card"><div class="card-h">${UI.icon('collect','sm')}<span class="t">Collections health</span></div>
        <div class="kv"><span class="k">Open collection cases</span><span class="v">${co.cases}</span></div>
        <div class="kv"><span class="k">SLA breached / at-risk</span><span class="v" style="color:var(--risk)">${co.breached} / ${co.at_risk}</span></div>
        <div class="kv"><span class="k">Promise-to-pay conversion</span><span class="v">${co.promises.conversion}%</span></div>
        <div class="kv mb0"><span class="k">Dunning response rate</span><span class="v">${co.dunning.responseRate}%</span></div>
      </div>
    </div>
    <div class="card mt14"><div class="card-h">${UI.icon('trend','sm')}<span class="t">Aging concentration</span></div>
      ${['current','1-30','31-60','61-90','90+'].map(b=>{const mx=Math.max(...Object.values(ag));
        return `<div class="hbar"><div class="lab">${b==='current'?'Current':b+' days'}</div>
        <div class="track"><i style="width:${(ag[b]/mx)*100}%;background:${b==='90+'?'var(--risk)':b==='61-90'?'var(--warn)':'var(--orange)'}"></i></div>
        <div class="val">${UI.fmt$(ag[b])}</div></div>`;}).join('')}
    </div>`;
}

async function renderWorkforce(){
  const agents = await API.agents();
  CACHE.agents = agents;
  const byMod = {};
  agents.forEach(a=>(byMod[a.module] ||= []).push(a));
  const modName = { cashapp:'Cash Application', collections:'Collections', dispute:'Dispute Management', deductions:'Deductions', platform:'Platform' };
  const blocks = Object.keys(modName).filter(m=>byMod[m]).map(m=>{
    const list = byMod[m];
    return `<div class="card"><div class="card-h">${UI.icon('bot','sm')}<span class="t">${modName[m]}</span>
      <span class="x">${list.length} agents · ${list.filter(a=>a.state==='active').length} active</span></div>
      <table><thead><tr><th></th><th>Agent</th><th>Type</th><th>Release</th><th>Reuse</th><th>Approval</th><th class="r">Conf.</th><th></th></tr></thead>
      <tbody>${list.map(a=>`<tr class="click" data-agent="${a.id}">
        <td><span class="agent-cell" style="border:none;padding:0;background:none"><span class="ad ${a.state}"></span></span></td>
        <td><b>${a.name}</b><div class="at" style="font-size:9.5px;color:var(--ink-3)">${a.fn}</div></td>
        <td>${UI.pill(a.type, a.type==='Autonomous'?'ok':a.type==='Assisted'?'info':'')}</td>
        <td><span class="mono" style="font-size:10px">${a.version}</span> ${UI.pill(a.maturity,a.maturity==='GA'?'ok':'warn')}</td>
        <td><span class="mono" style="font-size:10px;color:var(--ink-3)" title="${a.prebuilt}% pre-built · deployed across ${a.deployments} engagements">${a.prebuilt}% built · ${a.deployments}×</span></td>
        <td><span class="tag">${a.approval_class}</span></td>
        <td class="r mono">${(a.confidence*100).toFixed(0)}%</td>
        <td class="r"><button class="btn sm" data-run="${a.id}">${UI.icon('play','sm')}</button></td>
      </tr>`).join('')}</tbody></table></div>`;
  }).join('');
  const avgPre = Math.round(agents.reduce((s,a)=>s+(a.prebuilt||60),0)/agents.length);
  const maxDep = Math.max(...agents.map(a=>a.deployments||0));
  const ga = agents.filter(a=>a.maturity==='GA').length;
  const stat=(v,l)=>`<div><div style="font-size:20px;font-weight:600;font-family:var(--mono)">${v}</div><div style="font-size:10px;color:var(--ink-3);text-transform:uppercase;letter-spacing:.4px">${l}</div></div>`;
  $('content').innerHTML = `
    <div class="crumb">AR Command Center / AI Workforce</div>
    <div class="view-h">The AI workforce</div>
    <div class="view-s">${agents.length} agents across the O2C estate. Autonomous agents act within policy; assisted agents draft for human approval; background agents learn continuously.</div>
    <div class="card" style="margin-bottom:14px;display:flex;gap:30px;flex-wrap:wrap;align-items:center">
      ${stat('~'+avgPre+'%','pre-built · 60/40 model')}${stat(ga+'/'+agents.length,'GA-released')}${stat(maxDep+'+','engagements reused')}${stat('6','industries proven')}
      <div style="flex:1;min-width:240px;font-size:11.5px;color:var(--ink-2);line-height:1.55">Every agent is a <b>versioned, configurable component</b> — pre-built on day one, tuned to you in the 40% layer. Click any agent for its packaging, config knobs, I/O contract and benchmarks. Client owns the IP — no recurring SaaS licence.</div>
    </div>
    <div class="grid" style="gap:14px">${blocks}</div>`;
  document.querySelectorAll('tr[data-agent]').forEach(r=>r.onclick=()=>openAgent(r.dataset.agent));
  document.querySelectorAll('[data-run]').forEach(b=>b.onclick=async(e)=>{
    e.stopPropagation(); b.disabled=true; const r = await API.runAgent(b.dataset.run);
    openAgent(b.dataset.run, r); b.disabled=false; pumpFeed();
  });
}

async function openAgent(id, runResult){
  const a = await API.get(`/api/agents/${id}`);
  const typePill = UI.pill(a.type, a.type==='Autonomous'?'ok':a.type==='Assisted'?'info':'');
  const lastRun = runResult || (a.runs && a.runs[0]);
  const m = a.meta || {};
  UI.openDrawer(`
    <div class="drawer-h"><div class="li" style="width:36px;height:36px;border-radius:9px;background:var(--agent-tint);color:var(--agent);display:flex;align-items:center;justify-content:center">${UI.icon('bot')}</div>
      <div><div style="font-weight:600">${a.name}</div><div class="mono" style="font-size:11px;color:var(--ink-3)">${a.id} · ${UI.cap(a.module)} · ${m.version||''}</div></div>
      <span class="x" onclick="UI.closeDrawer()">${UI.icon('x')}</span></div>
    <div class="drawer-b">
      <div class="flex" style="gap:7px;flex-wrap:wrap">${typePill}${m.maturity?UI.pill(m.version+' · '+m.maturity,m.maturity==='GA'?'ok':'warn'):''}<span class="tag">approval: ${a.approval_class}</span><span class="pill ${a.state==='active'?'ok':a.state==='learning'?'agent':''}">${UI.cap(a.state)}</span></div>
      <div style="font-size:13.5px;line-height:1.6;color:var(--ink)">${a.detail}</div>
      <div class="grid g3" style="gap:10px">
        <div class="card tight"><div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.5px">Confidence</div><div class="mono" style="font-size:20px;font-weight:600">${(a.confidence*100).toFixed(0)}%</div></div>
        <div class="card tight"><div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.5px">Runs today</div><div class="mono" style="font-size:20px;font-weight:600">${a.runs_today}</div></div>
        <div class="card tight"><div class="muted" style="font-size:10px;text-transform:uppercase;letter-spacing:.5px">Type</div><div style="font-size:13px;font-weight:600;margin-top:5px">${a.type}</div></div>
      </div>
      <div><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3);margin-bottom:5px">How it works</div>
        <div class="kv"><span class="k">Technology</span><span class="v">${a.technology}</span></div>
        <div class="kv mb0"><span class="k">Function</span><span class="v" style="max-width:300px">${a.fn}</span></div></div>
      <div class="card tight" style="background:var(--accent-tint,var(--panel-2))"><div class="flex" style="gap:7px;margin-bottom:6px">${UI.icon('sap','sm')}<b style="font-size:12px">SAP touchpoints</b></div>
        <div class="mono" style="font-size:11px;color:var(--ink-2);line-height:1.6">${a.sap}</div></div>
      ${m.version?`<div class="card tight" style="border-color:var(--orange-dim)">
        <div class="flex" style="gap:7px;margin-bottom:9px">${UI.icon('layers','sm')}<b style="font-size:12px">Packaging & reusability</b></div>
        <div class="kv"><span class="k">Build model</span><span class="v"><b style="color:var(--orange-soft)">${m.prebuilt}% pre-built</b> · ${m.configured}% configured to client</span></div>
        <div class="kv"><span class="k">Reused across</span><span class="v">${m.deployments} engagements · ${m.industries.join(' · ')}</span></div>
        <div class="kv"><span class="k">Benchmark</span><span class="v">${m.benchmark.accuracy} accuracy · ${m.benchmark.throughput} throughput</span></div>
        <div class="kv"><span class="k">Model upkeep</span><span class="v">${m.retrain}</span></div>
        <div class="kv"><span class="k">Inputs</span><span class="v" style="max-width:300px">${m.io.in}</span></div>
        <div class="kv"><span class="k">Outputs</span><span class="v" style="max-width:300px">${m.io.out}</span></div>
        <div class="kv"><span class="k">Invoke</span><span class="v mono" style="font-size:10.5px">${m.api}</span></div>
        <div class="kv mb0"><span class="k">Owner / IP</span><span class="v">${m.owner} · client-owned</span></div>
        <div style="font-size:10px;text-transform:uppercase;letter-spacing:.5px;color:var(--ink-3);margin:11px 0 6px">Configurable parameters — the 40% layer</div>
        <div style="display:flex;flex-wrap:wrap;gap:5px">${m.config.map(c=>`<span class="tag">${UI.icon('settings','sm')} ${c}</span>`).join('')}</div></div>`:''}
      <div id="agentTrace">${lastRun ? `<div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--agent);margin-bottom:6px">Latest run · reasoning trace</div>${UI.trace(lastRun.steps)}` : ''}</div>
    </div>
    <div class="drawer-f"><button class="btn" onclick="UI.closeDrawer()">Close</button>
      <button class="btn agent" id="runAgentBtn">${UI.icon('play','sm')} Run agent</button></div>`);
  document.getElementById('runAgentBtn').onclick=async(e)=>{ e.target.disabled=true;
    const r=await API.runAgent(id); document.getElementById('agentTrace').innerHTML=`<div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--agent);margin-bottom:6px">Latest run · reasoning trace</div>`+UI.trace(r.steps);
    UI.toast(a.name+' ran'); pumpFeed(); e.target.disabled=false; };
}

function traceDrawer(r){
  return `<div class="drawer-h"><div class="li" style="width:34px;height:34px;border-radius:9px;background:var(--agent-tint);color:var(--agent);display:flex;align-items:center;justify-content:center">${UI.icon('bot')}</div>
    <div><div style="font-weight:600">${r.agent.name}</div><div class="mono" style="font-size:11px;color:var(--ink-3)">${r.agent.id} · ${r.agent.type}</div></div>
    <span class="x" onclick="UI.closeDrawer()">${UI.icon('x')}</span></div>
    <div class="drawer-b"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3)">Reasoning trace</div>
    ${UI.trace(r.steps)}
    <div class="card tight"><div style="font-size:11px;text-transform:uppercase;letter-spacing:.6px;color:var(--ink-3);margin-bottom:8px">Output</div>
      <pre class="mono" style="font-size:11px;color:var(--ink-2);white-space:pre-wrap">${JSON.stringify(r.output,null,2)}</pre></div></div>`;
}

async function renderConfigure(){
  const s = await API.settings();
  CACHE.settings = s;
  const catName = { matching:'Cash Application · Matching', exceptions:'Exceptions', collections:'Collections', erp:'SAP / ERP Integration', general:'General', roi:'ROI Assumptions' };
  const blocks = Object.keys(s).map(cat=>{
    const rows = s[cat].map(r=>{
      let control;
      if (typeof r.value === 'boolean') control = `<div class="switch ${r.value?'on':''}" data-key="${r.key}" data-type="bool"><i></i></div>`;
      else if (typeof r.value === 'number') control = `<input class="num" data-key="${r.key}" data-type="num" value="${r.value}">`;
      else if (Array.isArray(r.value)) control = `<input class="num" style="width:180px;text-align:left" data-key="${r.key}" data-type="arr" value="${r.value.join(', ')}">`;
      else if (typeof r.value === 'object') control = `<span class="tag">${Object.entries(r.value).filter(([,v])=>v).map(([k])=>k).join(' · ')}</span>`;
      else control = `<input class="num" style="width:160px;text-align:left" data-key="${r.key}" data-type="str" value="${r.value}">`;
      return `<div class="set-row"><div class="si"><div class="sl">${r.label}</div><div class="sk">${r.key}</div></div>${control}</div>`;
    }).join('');
    return `<div class="card"><div class="card-h">${UI.icon('settings','sm')}<span class="t">${catName[cat]||cat}</span></div>${rows}</div>`;
  }).join('');
  $('content').innerHTML = `
    <div class="crumb">AR Command Center / Configure</div>
    <div class="between"><div><div class="view-h">Platform configuration</div>
      <div class="view-s">The 40% that's yours. Matching tolerances, exception SLAs, dunning policy and ERP mapping — changes persist to the backend immediately.</div></div>
      <button class="btn" id="reseedBtn">${UI.icon('refresh','sm')} Reset demo data</button></div>
    <div class="grid g2" style="align-items:start">${blocks}</div>`;
  document.querySelectorAll('.switch[data-key]').forEach(sw=>sw.onclick=async()=>{
    const on=!sw.classList.contains('on'); sw.classList.toggle('on',on);
    await API.setSetting(sw.dataset.key,on); UI.toast('Saved · '+sw.dataset.key);
  });
  document.querySelectorAll('input[data-key]').forEach(inp=>inp.onchange=async()=>{
    let v=inp.value; if(inp.dataset.type==='num')v=+v; if(inp.dataset.type==='arr')v=v.split(',').map(x=>x.trim());
    await API.setSetting(inp.dataset.key,v); UI.toast('Saved · '+inp.dataset.key);
  });
  $('reseedBtn').onclick=async()=>{ if(!confirm('Reset all demo data to seed state?'))return;
    await API.reseed(); UI.toast('Demo data reset'); load(); };
}

// ---- Feed ----
async function pumpFeed(){
  try{ const acts = await API.activity(14);
    $('feed').innerHTML = acts.map(a=>UI.feedItem(a)).join('');
  }catch{}
}

// ---- Copilot (on-device) ----
const CP_CHIPS = ['What is our DSO?','How much is past due?','Cash app match rate','Collections at risk','Dispute backlog','Deduction leakage'];
function cpRender(){ $('cpChips').innerHTML = CP_CHIPS.map(c=>`<span class="chip-q">${c}</span>`).join('');
  document.querySelectorAll('.chip-q').forEach(c=>c.onclick=()=>{ $('cpInput').value=c.textContent; cpAsk(); }); }
function cpAdd(text,cls){ const d=document.createElement('div'); d.className='cp-msg '+cls; d.innerHTML=text; $('cpMsgs').appendChild(d); $('cpMsgs').scrollTop=1e9; }
async function cpAsk(){
  const q=$('cpInput').value.trim(); if(!q)return; $('cpInput').value=''; cpAdd(q,'user');
  const a = await cpAnswer(q.toLowerCase());
  setTimeout(()=>cpAdd(a,'bot'),250);
}
async function cpAnswer(q){
  const k=M.kpis;
  if(/dso|days sales/.test(q)) return `Current weighted <b>DSO is <span class="mono">${k.dso.val} days</span></b> against a target of ${k.dso.target}. Closing that gap releases roughly <span class="mono">${UI.fmt$((M.totalAR/k.dso.val)*(k.dso.val-k.dso.target))}</span> of working capital.`;
  if(/past due|overdue/.test(q)) return `Past-due AR is <b><span class="mono">${UI.fmt$full(M.pastDue)}</span></b> — ${k.pastDuePct.val}% of the ${UI.fmt$(M.totalAR)} open book.`;
  if(/aging|risk|oldest|90/.test(q)){ const ag=M.aging; return `Oldest tier (90+) holds <b><span class="mono">${UI.fmt$(ag['90+'])}</span></b>; the 61–90 bucket adds ${UI.fmt$(ag['61-90'])}. These are the priority for collections escalation.`; }
  if(/match|cash app|posting|posted/.test(q)){ const ca=CACHE.ca||await API.cashapp.summary(); CACHE.ca=ca;
    return `Cash application is posting <b>${ca.posted}/${ca.total}</b> payments (match rate <span class="mono">${ca.matchRate}%</span>). Auto-match is at ${k.autoMatchRate.val}% vs an 85% target — the matching-waterfall ML layer is where the upside sits.`; }
  if(/exception|unapplied|on-account/.test(q)) return `There are <b>${M.exceptions.open} open exceptions</b> worth ${UI.fmt$(M.exceptions.value)}, and ${k.unappliedCash.val}% of cash is unapplied (target 3%).`;
  if(/dispute/.test(q)) return `<b>${M.dispute.open} open disputes</b> worth ${UI.fmt$(M.dispute.openVal)} · ${M.dispute.autoClassify}% auto-classified, avg resolution <span class="mono">${M.dispute.resolutionDays} days</span> (target 12). Predicted recovery ${M.dispute.winRate}%.`;
  if(/deduction|leakage|validity|trade.?promo/.test(q)) return `<b>${M.deductions.open} open deductions</b> (${UI.fmt$(M.deductions.value)}) · ${M.deductions.autoValidation}% auto-validated. ${M.deductions.invalid} flagged invalid; <span class="mono">${UI.fmt$(M.deductions.recovered)}</span> recovered from invalid claims.`;
  if(/collection|dunning|case|delinqu/.test(q)){ const co=CACHE.co||await API.collections.summary(); CACHE.co=co;
    return `<b>${co.cases} collection cases</b> are open; ${co.breached} have breached SLA and ${co.at_risk} are at risk. Average 30-day delinquency probability is ${(co.delinq*100).toFixed(0)}%.`; }
  if(/cei|effectiveness/.test(q)) return `Collection Effectiveness Index is <b><span class="mono">${k.cei.val}%</span></b> (target 90%).`;
  if(/agent|workforce|ai/.test(q)) return `46 AI agents are deployed across the O2C estate. Open <b>AI Workforce</b> to see each one, its confidence and run count — and trigger a live run.`;
  return `I can answer on DSO, past-due, aging, cash-application match rate, exceptions, and collections SLA. Try one of the suggestions below.`;
}

// ---- Nav + boot ----
function renderNav(){
  $('nav').innerHTML = `<div class="grp">Control tower</div>` + NAV.map(n=>`<div class="nav-btn ${n.id===VIEW?'active':''}" data-v="${n.id}">${UI.icon(n.ic,'sm')} ${n.name}</div>`).join('')
    + `<div class="grp">Modules</div>` + MODULES.map(m=>`<div class="nav-btn ${m.live?'':'soon'}" ${m.live?`data-app="${m.app}"`:''} style="${m.live?'':'opacity:.5'}">${UI.icon(m.ic,'sm')} ${m.name}${m.live?'':' '+UI.pill('P2','')}</div>`).join('');
  document.querySelectorAll('.nav-btn[data-v]').forEach(b=>b.onclick=()=>{ VIEW=b.dataset.v; renderNav(); route(); });
  document.querySelectorAll('.nav-btn[data-app]').forEach(b=>b.onclick=()=>parent.postMessage({__navTo:b.dataset.app},'*'));
}
function route(){
  if(VIEW==='overview') renderOverview();
  else if(VIEW==='process') renderProcess();
  else if(VIEW==='capital') renderCapital();
  else if(VIEW==='roi') UI.renderROI('content','platform');
  else if(VIEW==='workforce') renderWorkforce();
  else if(VIEW==='configure') renderConfigure();
}
async function load(){
  [M, ROSTER] = await Promise.all([API.metrics(), API.agentRoster()]);
  const active = ROSTER.reduce((s,r)=>s+r.active,0), runs = ROSTER.reduce((s,r)=>s+r.runs,0);
  $('agentsLive').textContent = `${active} agents active · ${UI.fmtN(runs)} runs today`;
  route(); pumpFeed();
}
function boot(){
  UI.initTheme();
  UI.initPanels();
  UI.mountThemeToggle($('themeBtn'));
  $('persona').onchange=e=>{ PERSONA=e.target.value; $('cpTitle').textContent={cfo:'CFO Copilot',arc:'AR Copilot',col:'Collections Copilot',cash:'Cash App Copilot'}[PERSONA]; if(VIEW==='overview')renderOverview(); };
  $('cpSend').innerHTML=UI.icon('send','sm'); $('cpSend').onclick=cpAsk;
  $('cpInput').addEventListener('keydown',e=>{if(e.key==='Enter')cpAsk();});
  renderNav(); cpRender();
  cpAdd(`Hello — I'm your AR copilot, wired to the live receivables book. Ask me anything about the numbers, or pick a prompt below.`,'bot');
  load();
  setInterval(pumpFeed, 8000);
}
boot();
})();
