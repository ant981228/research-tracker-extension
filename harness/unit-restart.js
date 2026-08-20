// SW-restart resilience: the engine must produce IDENTICAL output when
// its state is serialized to JSON and back between every event (the
// storage.session round-trip a service-worker death forces).
const { emptyRecordingState, reduceRecording } = require('../rt-rec/src/background/recording/engine.js');

const inputs = [
  { kind: 'start', ts: 1, tabs: [{ tabId: 1, windowId: 1, url: 'http://x/search?q=a', title: 's', search: { engine: 'E', query: 'a', params: {} } }] },
  { kind: 'result_click', ts: 2, tabId: 1, targetUrl: 'http://x/article/1', rank: 1, title: 'r1' },
  { kind: 'commit', ts: 3, tabId: 1, windowId: 1, url: 'http://x/article/1', transitionType: 'link', qualifiers: [], search: null },
  { kind: 'created_target', ts: 4, sourceTabId: 1, tabId: 2, url: 'http://x/article/2' },
  { kind: 'commit', ts: 5, tabId: 2, windowId: 1, url: 'http://x/article/2', transitionType: 'link', qualifiers: [], search: null },
  { kind: 'commit', ts: 6, tabId: 1, windowId: 1, url: 'http://x/search?q=a', transitionType: 'link', qualifiers: ['forward_back'], search: { engine: 'E', query: 'a', params: {} } },
  { kind: 'commit', ts: 7, tabId: 1, windowId: 1, url: 'http://x/article/3', transitionType: 'link', qualifiers: [], search: null },
  { kind: 'stop', ts: 8 },
];

function run(roundTrip) {
  let s = emptyRecordingState();
  const all = [];
  for (const input of inputs) {
    if (roundTrip) s = JSON.parse(JSON.stringify(s)); // "worker died here"
    const out = reduceRecording(s, input);
    s = out.state;
    all.push(...out.records);
  }
  return JSON.stringify(all);
}

const continuous = run(false);
const restarted = run(true);
if (continuous === restarted) {
  console.log('ok    restart-equivalence: identical records with per-event state round-trip');
  // and attribution survived the "restart" between click and commit:
  const recs = JSON.parse(restarted);
  const v1 = recs.find((r) => r.t === 'visit' && r.url.endsWith('/article/1'));
  const v2 = recs.find((r) => r.t === 'visit' && r.url.endsWith('/article/2'));
  const v3 = recs.find((r) => r.t === 'visit' && r.url.endsWith('/article/3'));
  const okAttr = v1.attribution.method === 'click' && v2.attribution.method === 'opener' && v3.attribution.searchId === 1;
  console.log(okAttr ? 'ok    attribution intact across restarts' : 'FAIL  attribution broke: ' + JSON.stringify([v1.attribution, v2.attribution, v3.attribution]));
  process.exit(okAttr ? 0 : 1);
} else {
  console.log('FAIL  restart changed the record stream');
  process.exit(1);
}
