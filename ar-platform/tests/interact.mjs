// Interaction test — exercises the demo-critical drawers & action buttons.
// Row clicks go through the DOM (sticky table header intercepts coordinate clicks).
import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3100';
const errs = [];
const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clickNav = (page, v) => page.evaluate(v => { document.querySelectorAll('.nav-btn[data-v]').forEach(b => { if (b.dataset.v === v) b.click(); }); }, v);
const clickFirstRow = (page) => page.evaluate(() => document.querySelector('tr[data-id]')?.click());

async function run(name, fn) {
  const page = await browser.newPage();
  page.on('pageerror', e => errs.push(`${name} pageerror: ${e.message}`));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('favicon')) errs.push(`${name} console: ${m.text()}`); });
  try { await fn(page); } catch (e) { errs.push(`${name} FATAL: ${e.message}`); console.log(`✗ ${name}: ${e.message}`); }
  await page.close();
}

await run('CashApp', async (page) => {
  await page.goto(BASE + '/app-cashapp.html', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.nav-btn'); await clickNav(page, 'payments');
  await page.waitForSelector('tr[data-id]'); await clickFirstRow(page);
  await page.waitForSelector('#drawer.on #matchBtn', { timeout: 6000 });
  await page.click('#matchBtn'); await sleep(900);
  const trace = await page.$$eval('#traceBox .tstep', e => e.length);
  const postDisabled = await page.$eval('#postBtn', el => el.disabled);
  let posted = 'already-posted';
  if (!postDisabled) { await page.click('#postBtn'); await sleep(1000); posted = 'posted'; }
  console.log(`✓ CashApp: drawer matchTrace=${trace}steps post=${posted}`);
});

await run('Collections', async (page) => {
  await page.goto(BASE + '/app-collections.html', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.nav-btn'); await clickNav(page, 'worklist');
  await page.waitForSelector('tr[data-id]'); await clickFirstRow(page);
  await page.waitForSelector('#drawer.on #dunBtn', { timeout: 6000 });
  const factors = await page.$$eval('.factor', e => e.length);
  await page.click('#predictBtn'); await sleep(600);
  await page.click('#dunBtn'); await sleep(900);
  const trace = await page.$$eval('#cTrace .tstep', e => e.length);
  await page.click('#ptpBtn'); await sleep(500);
  console.log(`✓ Collections: factors=${factors} dunningTrace=${trace}steps promiseLogged`);
});

await run('Disputes', async (page) => {
  await page.goto(BASE + '/app-disputes.html', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.nav-btn'); await clickNav(page, 'cases');
  await page.waitForSelector('tr[data-id]'); await clickFirstRow(page);
  await page.waitForSelector('#drawer.on #evBtn', { timeout: 6000 });
  await page.click('#predictBtn'); await sleep(600);
  await page.click('#evBtn'); await sleep(900);
  await page.waitForSelector('#drawer.on'); // reopened after assemble
  const ev = await page.$$eval('.ev-row', e => e.length).catch(() => 0);
  // resolve if action buttons present
  const hasResolve = await page.$('#approveBtn');
  if (hasResolve) { await page.click('#approveBtn'); await sleep(800); }
  console.log(`✓ Disputes: evidenceRows=${ev} resolved=${hasResolve ? 'yes' : 'already'}`);
});

await run('Deductions', async (page) => {
  await page.goto(BASE + '/app-deductions.html', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.nav-btn'); await clickNav(page, 'queue');
  await page.waitForSelector('tr[data-id]'); await clickFirstRow(page);
  await page.waitForSelector('#drawer.on #valBtn', { timeout: 6000 });
  await page.click('#valBtn'); await sleep(700);
  const mb = await page.$('#matchBtn'); if (mb) { await page.click('#matchBtn'); await sleep(600); }
  const trace = await page.$$eval('#deTrace .tstep', e => e.length).catch(() => 0);
  const approve = await page.$('#approveBtn'); if (approve) { await page.click('#approveBtn'); await sleep(800); }
  await clickNav(page, 'promos'); await page.waitForSelector('table'); await sleep(300);
  console.log(`✓ Deductions: agentTrace=${trace}steps promoMatch=${mb ? 'yes' : 'n/a'} promosView=ok`);
});

await run('Command', async (page) => {
  await page.goto(BASE + '/app-command.html', { waitUntil: 'networkidle2' });
  await page.waitForSelector('.nav-btn'); await clickNav(page, 'configure');
  await page.waitForSelector('.switch'); await page.click('.switch'); await sleep(400);
  await clickNav(page, 'workforce');
  await page.waitForSelector('tr[data-agent]');
  await page.evaluate(() => document.querySelector('tr[data-agent]').click());  // open agent profile
  await page.waitForSelector('#drawer.on #runAgentBtn', { timeout: 6000 });
  const hasDetail = await page.$eval('#drawer', el => el.innerText.includes('SAP touchpoints'));
  await page.click('#runAgentBtn'); await sleep(700);
  const runTrace = await page.$$eval('#agentTrace .tstep', e => e.length).catch(() => 0);
  await page.evaluate(() => UI.closeDrawer());
  // ROI assumption edit → recompute
  await clickNav(page, 'roi');
  await page.waitForSelector('input[data-akey]');
  const before = await page.$eval('.kpi-v span[data-cu]', el => el.dataset.cu);
  await page.evaluate(() => { const i = document.querySelector('input[data-akey="roi.program_cost"]'); if (i) { i.value = 2400000; i.dispatchEvent(new Event('change')); } });
  await sleep(800);
  const roiOk = await page.$$eval('.assum input', e => e.length);
  console.log(`  agentProfile=${hasDetail ? 'detail+SAP' : 'MISSING'} roiAssumptions=${roiOk}`);
  await clickNav(page, 'overview');
  await page.waitForSelector('#cpInput'); await page.type('#cpInput', 'how much is past due');
  await page.click('#cpSend'); await sleep(500);
  const bot = await page.$$eval('.cp-msg.bot', e => e.length);
  console.log(`✓ Command: settingToggled agentRunTrace=${runTrace}steps copilotReplies=${bot}`);
});

await browser.close();
console.log(errs.length ? '\n✗ ' + errs.length + ' issue(s):\n' + errs.map(e => '  ' + e).join('\n') : '\n✓ all interactions clean — no runtime errors');
process.exit(errs.length ? 1 : 0);
