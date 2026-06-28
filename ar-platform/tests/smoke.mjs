// Headless smoke test — loads each app, clicks every nav view, opens a drawer,
// and reports console errors / page exceptions / empty renders.
import puppeteer from 'puppeteer-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3100';
const errors = [];

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox'] });

async function testPage(name, path, keySel, navClicks = []) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  const local = [];
  page.on('console', m => { if (m.type() === 'error') local.push('console: ' + m.text()); });
  page.on('pageerror', e => local.push('pageerror: ' + e.message));
  page.on('requestfailed', r => { if (!r.url().includes('fonts')) local.push('reqfail: ' + r.url()); });
  try {
    await page.goto(BASE + path, { waitUntil: 'networkidle2', timeout: 15000 });
    await page.waitForSelector(keySel, { timeout: 8000 });
    const keyCount = await page.$$eval(keySel, els => els.length);
    let viewsOk = [];
    for (const sel of navClicks) {
      const btns = await page.$$('.nav-btn[data-v]');
      for (const b of btns) {
        const v = await b.evaluate(el => el.dataset.v);
        if (v === sel) { await b.click(); await new Promise(r => setTimeout(r, 600));
          const filled = await page.$eval('#content', el => el.innerText.trim().length);
          viewsOk.push(`${v}:${filled > 40 ? 'ok' : 'EMPTY'}`); }
      }
    }
    // try opening first table row drawer if present
    let drawer = 'n/a';
    const row = await page.$('tr[data-id], .launch[data-app]');
    if (await page.$('tr[data-id]')) {
      await (await page.$('tr[data-id]')).click();
      await new Promise(r => setTimeout(r, 600));
      drawer = await page.$eval('#drawer', el => el.classList.contains('on') ? 'opened' : 'closed').catch(() => 'none');
    }
    console.log(`✓ ${name}: ${keySel}×${keyCount} | views[${viewsOk.join(' ')}] | drawer:${drawer} | errs:${local.length}`);
  } catch (e) {
    local.push('FATAL: ' + e.message);
    console.log(`✗ ${name}: ${e.message}`);
  }
  local.forEach(l => errors.push(`[${name}] ${l}`));
  await page.close();
}

await testPage('Vision', '/app-vision.html', '.pillar');
await testPage('Command', '/app-command.html', '.kpi', ['overview', 'process', 'capital', 'roi', 'workforce', 'configure']);
await testPage('CashApp', '/app-cashapp.html', '.kpi', ['overview', 'waterfall', 'payments', 'exceptions', 'channels', 'process', 'roi']);
await testPage('Collections', '/app-collections.html', '.kpi', ['overview', 'worklist', 'collectors', 'risk', 'process', 'roi']);
await testPage('Disputes', '/app-disputes.html', '.kpi', ['overview', 'cases', 'rootcause', 'process', 'roi']);
await testPage('Deductions', '/app-deductions.html', '.kpi', ['overview', 'queue', 'promos', 'leakage', 'process', 'roi']);

await browser.close();
console.log('\n--- ' + (errors.length ? errors.length + ' issue(s) ---' : 'no console/runtime errors ---'));
errors.forEach(e => console.log('  ' + e));
process.exit(errors.length ? 1 : 0);
