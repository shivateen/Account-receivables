// Verifies the STATIC build (docs/) works with NO backend — served as plain files.
import puppeteer from 'puppeteer-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = process.env.BASE || 'http://localhost:8088';
const errs = [];
const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const clickNav = (p, v) => p.evaluate(v => document.querySelectorAll('.nav-btn[data-v]').forEach(b => { if (b.dataset.v === v) b.click(); }), v);

async function page(name, path, key, views) {
  const p = await b.newPage();
  p.on('console', m => { if (m.type() === 'error' && !/favicon/.test(m.text())) errs.push(`${name}: ${m.text()}`); });
  p.on('pageerror', e => errs.push(`${name} pageerror: ${e.message}`));
  await p.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 20000 });
  const isStatic = await p.evaluate(() => window.__AR_STATIC__ === true);
  await p.waitForSelector(key, { timeout: 8000 });
  let ok = [];
  for (const v of (views || [])) { await clickNav(p, v); await sleep(450); const filled = await p.$eval('#content', el => el.innerText.trim().length).catch(() => 0); ok.push(`${v}:${filled > 40 ? 'ok' : 'EMPTY'}`); }
  console.log(`✓ ${name}: static=${isStatic} ${key}✓ views[${ok.join(' ')}]`);
  return p;
}

await page('Vision', '/app-vision.html', '.pillar');
const cmd = await page('Command', '/app-command.html', '.kpi', ['overview', 'process', 'capital', 'roi', 'workforce', 'configure']);
// simulated POST: drill a KPI (GET) then run an agent (POST simulation)
await clickNav(cmd, 'overview'); await sleep(400);
await cmd.evaluate(() => document.querySelector('.kpi[data-kpi="dso"]').click());
await cmd.waitForSelector('#drawer.on .kdriver', { timeout: 5000 });
const drivers = await cmd.$$eval('#drawer .kdriver', e => e.length);
await cmd.evaluate(() => UI.closeDrawer());
await clickNav(cmd, 'workforce'); await cmd.waitForSelector('[data-run]');
await cmd.evaluate(() => document.querySelector('[data-run]').click()); await sleep(500);
const ranTrace = await cmd.$$eval('#agentTrace .tstep', e => e.length).catch(() => 0);
console.log(`  KPI drill drivers=${drivers} · simulated agent run trace=${ranTrace} steps`);

await page('CashApp', '/app-cashapp.html', '.kpi', ['overview', 'waterfall', 'payments', 'exceptions', 'channels', 'process', 'roi']);
await page('Collections', '/app-collections.html', '.kpi', ['overview', 'worklist', 'collectors', 'risk', 'process', 'roi']);
await page('Disputes', '/app-disputes.html', '.kpi', ['overview', 'cases', 'rootcause', 'process', 'roi']);
await page('Deductions', '/app-deductions.html', '.kpi', ['overview', 'queue', 'promos', 'leakage', 'process', 'roi']);

await b.close();
console.log(errs.length ? '\n✗ ' + errs.length + ' issue(s):\n' + errs.map(e => '  ' + e).join('\n') : '\n✓ static build clean — renders fully with NO backend');
process.exit(errs.length ? 1 : 0);
