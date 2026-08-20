/**
 * Integration check: the REAL extension (repo root), v2 recorder wired
 * through the legacy compat vocabulary. Drives a session via the same
 * calls the popup makes, then asserts the archived legacy session in
 * IndexedDB — shape, attribution, notes, rename, resume-and-merge.
 */
const path = require('path');
const puppeteer = require('puppeteer');
const { start } = require('./server');

const PORT = 8933;
const BASE = `http://localhost:${PORT}`;
const EXT = path.join(__dirname, '..');

let failures = 0;
function check(name, cond, detail) {
  console.log(`  ${cond ? 'ok  ' : 'FAIL'}  ${name}${!cond && detail ? ' — ' + detail : ''}`);
  if (!cond) failures++;
}

(async () => {
  const server = await start(PORT);
  const browser = await puppeteer.launch({
    headless: true,
    args: [`--disable-extensions-except=${EXT}`, `--load-extension=${EXT}`, '--no-sandbox'],
  });
  const swTarget = await browser.waitForTarget((t) => t.type() === 'service_worker', { timeout: 20000 });
  const sw = await swTarget.worker();
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  await sw.evaluate(async (port) => {
    await chrome.storage.local.set({
      rt2_engines: [{ engine: 'TESTENGINE', hosts: [`localhost:${port}`], queryParam: 'q', pathPrefixes: ['/search'] }],
    });
  }, PORT);

  // ── session 1: search → click → note → rename → stop ──
  await sw.evaluate(async () => { await rt2CompatStart('integration session'); });
  await sleep(300);

  const page = await browser.newPage();
  await page.goto(`${BASE}/search?q=alpha`, { waitUntil: 'load' });
  await sleep(400);
  await Promise.all([page.waitForNavigation({ waitUntil: 'load' }), page.click('[data-rt-result] a[href*="alpha-1"]')]);
  await sleep(300);

  await sw.evaluate(async (url) => { await rt2CompatAddNote(url, 'useful article'); }, `${BASE}/article/alpha-1`);
  const status = await sw.evaluate(async () => rt2CompatStatus());
  check('status: recording with session', status.isRecording && !!status.currentSession);
  check('status: recent pages populated', status.currentSession.recentPages.length >= 1,
    JSON.stringify(status.currentSession.recentPages.length));
  check('status: recent searches populated', status.currentSession.recentSearches.length === 1);
  await sw.evaluate(async () => { await rt2CompatRename('renamed session'); });

  const session = await sw.evaluate(async () => rt2CompatStop());
  check('stop returns a legacy session', !!session && Array.isArray(session.events));
  check('rename stuck', session.name === 'renamed session', session.name);
  check('one search, legacy shape', session.searches.length === 1 &&
    session.searches[0].type === 'search' && session.searches[0].engine === 'TESTENGINE' &&
    session.searches[0].query === 'alpha' && typeof session.searches[0].domain === 'string',
    JSON.stringify(session.searches[0] || null));
  const visit = session.pageVisits.find((p) => p.url.endsWith('/article/alpha-1'));
  check('visit attributed via sourceSearch', visit && visit.sourceSearch && visit.sourceSearch.query === 'alpha',
    visit && JSON.stringify(visit.attribution));
  check('attribution is click-corroborated', visit && visit.attribution.method === 'click',
    visit && visit.attribution.method);
  check('note attached to the visit', visit && visit.notes.length === 1 && visit.notes[0].content === 'useful article',
    visit && JSON.stringify(visit.notes));
  check('search carries results seen', Array.isArray(session.searches[0].results) && session.searches[0].results.length >= 5,
    session.searches[0].results && session.searches[0].results.length);
  check('session_ended event present', session.events.some((e) => e.type === 'session_ended'));
  check('endTime set', !!session.endTime);

  const archived = await sw.evaluate(async (id) => researchTrackerDB.getSession(id), session.id);
  check('archived in IndexedDB', !!archived && archived.id === session.id);

  // ── metadata linkage: the visit's URL got a session-stamped metadata object ──
  const linked = await sw.evaluate(async (url) => {
    const norm = normalizeUrl(url);
    const mid = urlToMetadataIndex[norm];
    const obj = mid ? metadataObjects[mid] : null;
    return obj ? obj.sessions || obj.sessionData || Object.keys(obj) : null;
  }, `${BASE}/article/alpha-1`);
  check('metadata object created + linked for visit', !!linked, JSON.stringify(linked));

  // ── session 2: resume the archived session, add to it, stop ──
  await sw.evaluate(async (id) => { await rt2CompatResumeSession(id); }, session.id);
  await sleep(200);
  const page2 = await browser.newPage();
  await page2.goto(`${BASE}/search?q=beta`, { waitUntil: 'load' });
  await sleep(400);
  const merged = await sw.evaluate(async () => rt2CompatStop());
  check('resume kept identity', merged.id === session.id && merged.startTime === session.startTime,
    JSON.stringify([merged.id, session.id]));
  check('session_resumed marker present', merged.events.some((e) => e.type === 'session_resumed'));
  check('merged session has both searches', merged.searches.length === 2,
    merged.searches.map((s) => s.query).join(','));
  check('old events retained in merge', merged.pageVisits.some((p) => p.url.endsWith('/article/alpha-1')));
  const rearchived = await sw.evaluate(async (id) => researchTrackerDB.getSession(id), session.id);
  check('merged session re-archived once', !!rearchived && rearchived.searches.length === 2);

  console.log(failures === 0 ? '\nINTEGRATION: all green' : `\nINTEGRATION: ${failures} failures`);
  await browser.close();
  server.close();
  process.exit(failures > 0 ? 1 : 0);
})().catch((e) => {
  console.error(e);
  process.exit(2);
});
