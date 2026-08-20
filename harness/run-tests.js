/**
 * Headless validation of the v2 recording layer against real Chromium.
 *
 * Drives a scripted "messy researcher" — interleaved tabs, cmd-click
 * chains, typed URLs, redirects, back/forward, SPA, pagination,
 * pre-existing tabs — and asserts the exported session's provenance
 * graph matches what actually happened.
 */
const path = require('path');
const puppeteer = require('puppeteer');
const { start } = require('./server');

const PORT = 8931;
const BASE = `http://localhost:${PORT}`;
const EXT = path.join(__dirname, 'test-ext');

let failures = 0;
let passes = 0;
function check(name, cond, detail) {
  if (cond) {
    passes++;
    console.log(`  ok    ${name}`);
  } else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? ' — ' + detail : ''}`);
  }
}

async function swEval(sw, fn, ...args) {
  return sw.evaluate(fn, ...args);
}

async function main() {
  const server = await start(PORT);
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--no-sandbox',
    ],
  });

  // Find the extension service worker.
  const swTarget = await browser.waitForTarget((t) => t.type() === 'service_worker', {
    timeout: 15000,
  });
  const sw = await swTarget.worker();

  // Register localhost as a search engine (config-driven detection).
  await swEval(
    sw,
    async (port) => {
      await chrome.storage.local.set({
        rt2_engines: [
          {
            engine: 'TESTENGINE',
            hosts: [`localhost:${port}`],
            queryParam: 'q',
            pathPrefixes: ['/search'],
          },
        ],
      });
    },
    PORT,
  );

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  // ── PRE-EXISTING WORLD: open tabs BEFORE recording starts ──
  const preSerp = await browser.newPage();
  await preSerp.goto(`${BASE}/search?q=preexisting`, { waitUntil: 'load' });
  const preArticle = await browser.newPage();
  await preArticle.goto(`${BASE}/article/pre-open`, { waitUntil: 'load' });

  // ── START RECORDING ──
  await swEval(sw, async () => {
    await new Promise((resolve) => chrome.runtime.onMessage.dispatch // noop guard
      ? resolve() : resolve());
  });
  await swEval(sw, async () => { await rt2Start('harness session'); });
  await sleep(300);

  // ── SCENARIO 1: click from the PRE-EXISTING SERP (same tab) ──
  await preSerp.bringToFront();
  await Promise.all([
    preSerp.waitForNavigation({ waitUntil: 'load' }),
    preSerp.click('[data-rt-result] a[href*="preexisting-1"]'),
  ]);
  await sleep(200);

  // ── SCENARIO 2: fresh search, same-tab click ──
  const tabA = await browser.newPage();
  await tabA.goto(`${BASE}/search?q=alpha`, { waitUntil: 'load' });
  await sleep(300); // let armSerp land
  await Promise.all([
    tabA.waitForNavigation({ waitUntil: 'load' }),
    tabA.click('[data-rt-result] a[href*="alpha-1"]'),
  ]);
  await sleep(200);

  // ── SCENARIO 3: interleaving — second search in tab B, then go BACK
  //    to tab A's world and continue clicking (old model would poison
  //    these clicks with the beta search) ──
  const tabB = await browser.newPage();
  await tabB.goto(`${BASE}/search?q=beta`, { waitUntil: 'load' });
  await sleep(300);
  // back in tab A: back to the alpha SERP, click result 2
  await tabA.bringToFront();
  await Promise.all([tabA.waitForNavigation({ waitUntil: 'load' }), tabA.goBack()]);
  await sleep(300);
  await Promise.all([
    tabA.waitForNavigation({ waitUntil: 'load' }),
    tabA.click('[data-rt-result] a[href*="alpha-2"]'),
  ]);
  await sleep(200);

  // ── SCENARIO 4: new-tab result (target=_blank) from beta SERP ──
  await tabB.bringToFront();
  const newTabPromise = new Promise((resolve) =>
    browser.once('targetcreated', (t) => resolve(t)),
  );
  await tabB.click('[data-rt-result] a[target="_blank"]');
  const newTarget = await newTabPromise;
  const blankTab = await newTarget.page();
  if (blankTab) await blankTab.waitForFunction(() => document.readyState === 'complete').catch(() => {});
  await sleep(400);

  // ── SCENARIO 5: typed URL (no attribution expected) ──
  const typedTab = await browser.newPage();
  await typedTab.goto(`${BASE}/article/typed-directly`, { waitUntil: 'load' });
  await sleep(200);

  // ── SCENARIO 6: server-redirect shim from alpha SERP ──
  await tabA.bringToFront();
  await Promise.all([tabA.waitForNavigation({ waitUntil: 'load' }), tabA.goBack()]);
  await sleep(300);
  await Promise.all([
    tabA.waitForNavigation({ waitUntil: 'load' }),
    tabA.click('[data-rt-result] a[href*="/redir"]'),
  ]);
  await sleep(200);

  // ── SCENARIO 7: page → page link (lineage beyond the SERP) ──
  await Promise.all([
    tabA.waitForNavigation({ waitUntil: 'load' }),
    tabA.click('#onward'),
  ]);
  await sleep(200);

  // ── SCENARIO 8: reload + back/forward are revisits, not new visits ──
  await tabA.reload({ waitUntil: 'load' });
  await sleep(200);
  await Promise.all([tabA.waitForNavigation({ waitUntil: 'load' }), tabA.goBack()]);
  await sleep(200);

  // ── SCENARIO 9: SERP pagination = refinement ──
  await tabB.bringToFront();
  await Promise.all([tabB.waitForNavigation({ waitUntil: 'load' }), tabB.click('#next')]);
  await sleep(300);

  // ── SCENARIO 10: SPA pushState ──
  const spaTab = await browser.newPage();
  await spaTab.goto(`${BASE}/spa`, { waitUntil: 'load' });
  await sleep(150);
  await spaTab.click('#go');
  await sleep(300);

  // ── SCENARIO 11: JS (client) redirect folds into one visit ──
  const jsTab = await browser.newPage();
  await jsTab.goto(
    `${BASE}/jsredir?u=${encodeURIComponent(`${BASE}/article/js-target`)}`,
    { waitUntil: 'load' },
  );
  await sleep(500);

  // ── STOP + EXPORT ──
  await swEval(sw, async () => { await rt2Stop(); });
  const session = await swEval(sw, async () => rt2Export());

  // ─────────────────── ASSERTIONS ───────────────────
  const S = session.searches;
  const P = session.contentPages;
  const findSearch = (q) => S.find((s) => s.query === q && !s.refinementOf);
  const visitsOf = (frag) => P.filter((p) => p.url.endsWith(frag) || p.url.includes(frag + '?'));
  const visitOf = (frag) => visitsOf(frag)[0];

  console.log('\n— searches —');
  check('exactly one search per query (no double-logging)',
    S.filter((s) => s.query === 'alpha').length === 1 &&
    S.filter((s) => s.query === 'beta' && !s.refinementOf).length === 1,
    JSON.stringify(S.map((s) => [s.query, s.refinementOf])));
  check('pre-existing SERP became a search node', !!findSearch('preexisting'));
  const pag = S.find((s) => s.query === 'beta' && s.refinementOf);
  check('pagination logged as refinement of beta', !!pag);

  console.log('\n— attribution —');
  const preClick = visitOf('preexisting-1');
  check('click from PRE-EXISTING SERP attributed to it',
    preClick && preClick.sourceSearch && preClick.sourceSearch.query === 'preexisting',
    preClick && JSON.stringify(preClick.attribution));
  const a1 = visitOf('alpha-1');
  check('alpha-1 attributed to alpha', a1 && a1.sourceSearch && a1.sourceSearch.query === 'alpha');
  check('alpha-1 attribution is click-corroborated', a1 && a1.attribution.method === 'click',
    a1 && a1.attribution.method);
  const a2 = visitOf('alpha-2');
  check('INTERLEAVING: alpha-2 clicked AFTER beta search still attributed to alpha',
    a2 && a2.sourceSearch && a2.sourceSearch.query === 'alpha',
    a2 && JSON.stringify(a2.sourceSearch));
  const nt = visitOf('beta-newtab');
  check('new-tab result attributed to beta', nt && nt.sourceSearch && nt.sourceSearch.query === 'beta',
    nt && JSON.stringify(nt.attribution));
  check('new-tab attribution captured via click/opener',
    nt && (nt.attribution.method === 'click' || nt.attribution.method === 'opener'),
    nt && nt.attribution.method);
  const typed = visitOf('typed-directly');
  check('typed URL is an honest orphan', typed && typed.attribution.method === 'none',
    typed && JSON.stringify(typed.attribution));

  console.log('\n— redirects, revisits, lineage —');
  const shim = visitOf('alpha-shimmed');
  const redirVisits = P.filter((p) => p.url.includes('/redir'));
  check('server-redirect shim collapsed to ONE visit at the final URL',
    visitsOf('/article/alpha-shimmed').length === 1 && redirVisits.length === 0,
    `shimmed=${visitsOf('/article/alpha-shimmed').length} redirVisits=${redirVisits.length}`);
  check('shimmed visit still attributed to alpha',
    shim && shim.sourceSearch && shim.sourceSearch.query === 'alpha',
    shim && JSON.stringify(shim.attribution));
  const onward = visitOf('shimmed-linked');
  check('page→page link carries parentVisitId lineage',
    onward && onward.parentVisitId === (shim && shim.id),
    onward && JSON.stringify(onward.attribution));
  check('reload recorded as revisit, not a duplicate visit',
    onward && visitsOf('shimmed-linked').length === 1 && onward.revisits.length >= 1,
    onward && `visits=${visitsOf('shimmed-linked').length} revisits=${onward.revisits.length}`);
  const spaVisit = P.find((p) => p.url.endsWith('/spa/section-2'));
  check('SPA pushState recorded as a visit', !!spaVisit);
  const jsTarget = visitOf('js-target');
  const jsHop = P.filter((p) => p.url.includes('/jsredir'));
  check('client redirect folded (one logical visit)',
    (jsHop.length === 1 && jsHop[0].finalUrl && jsHop[0].finalUrl.includes('js-target')) ||
      (jsHop.length === 0 && !!jsTarget),
    `hops=${jsHop.length} target=${!!jsTarget}`);
  const preOpen = P.find((p) => p.url.includes('pre-open'));
  check('pre-existing article snapshotted', preOpen && preOpen.preexisting === true);

  const urlCounts = {};
  P.forEach((p) => { urlCounts[p.url] = (urlCounts[p.url] || 0) + 1; });
  const dups = Object.entries(urlCounts).filter(([, n]) => n > 1);
  check('no URL logged as two separate visits', dups.length === 0, JSON.stringify(dups));

  console.log(`\n${passes} passed, ${failures} failed`);
  await browser.close();
  server.close();
  process.exit(failures > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
