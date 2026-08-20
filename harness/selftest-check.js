// Validate the self-test ITSELF: run it in headless Chromium via the
// diagnostics page and require every signal row to pass.
const path = require('path');
const puppeteer = require('puppeteer');
(async () => {
  const EXT = path.join(__dirname, 'test-ext');
  const browser = await puppeteer.launch({
    headless: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox'],
  });
  const swTarget = await browser.waitForTarget((t) => t.type() === 'service_worker');
  const extId = new URL(swTarget.url()).host;
  const page = await browser.newPage();
  await page.goto(`chrome-extension://${extId}/src/diagnostics/diagnostics.html`);
  await page.click('#run');
  await page.waitForSelector('#results:not([hidden])', { timeout: 30000 });
  const rows = await page.$$eval('#results tbody tr', (trs) =>
    trs.map((tr) => Array.from(tr.children).map((td) => td.textContent)),
  );
  let failures = 0;
  for (const [name, result, detail] of rows) {
    const ok = result !== 'FAIL';
    if (!ok) failures++;
    console.log(`  ${result === 'PASS' ? 'ok  ' : result === 'INFO' ? 'info' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  }
  const status = await page.$eval('#status', (el) => el.textContent);
  console.log(`\n${status}`);
  await browser.close();
  process.exit(failures > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
