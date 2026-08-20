/**
 * Recording adapter — wires chrome.* events into the pure engine.
 *
 * MV3 RULES THIS FILE EXISTS TO ENFORCE:
 *  1. Every listener is registered at the TOP LEVEL, unconditionally.
 *     Dynamically-registered listeners die with the service worker and
 *     stop waking it — the old recorder's silent-gap bug. Handlers
 *     no-op cheaply when not recording.
 *  2. NO load-bearing in-memory state. Engine state lives in
 *     chrome.storage.session (survives SW restarts, dies with the
 *     browser — the correct lifetime); the record log appends to
 *     chrome.storage.local. Any handler may find itself in a freshly
 *     woken worker and must behave identically.
 *  3. All handlers funnel through one serialized queue: each does a
 *     read-modify-write of engine state, and interleaving two of those
 *     would drop updates.
 *
 * Search-engine detection is config-driven via RT2_CONFIG (the test
 * harness injects localhost engines through storage; production uses
 * the built-in table).
 */

/* global reduceRecording, emptyRecordingState, assembleSession */

var RT2_KEYS = {
  RECORDING: 'rt2_recording', // storage.session: boolean gate
  STATE: 'rt2_state', // storage.session: engine state
  META: 'rt2_meta', // storage.local: session meta
  LOG_SEQ: 'rt2_log_seq', // storage.local: next log index
  LOG_PREFIX: 'rt2_log_', // storage.local: rt2_log_<n> → record
  ENGINES: 'rt2_engines', // storage.local: extra engine configs (tests)
};

// Mirrors v1's SEARCH_ENGINES incl. proxy tolerance (EZproxy et al.
// mangle hostnames, so hosts also match when the punctuation-stripped
// hostname CONTAINS the stripped domain) and the per-engine path rules.
var RT2_BUILTIN_ENGINES = [
  { engine: 'GOOGLE_SCHOLAR', hosts: ['scholar.google.com'], queryParam: 'q', proxied: true },
  { engine: 'GOOGLE_NEWS', hosts: ['news.google.com'], queryParam: 'q', proxied: true },
  { engine: 'GOOGLE', hosts: ['google.com', 'www.google.com'], queryParam: 'q', proxied: true,
    pathPrefixes: ['/search', '/webhp'] },
  { engine: 'BING', hosts: ['bing.com', 'www.bing.com'], queryParam: 'q', proxied: true,
    pathPrefixes: ['/search'] },
  { engine: 'DUCKDUCKGO', hosts: ['duckduckgo.com'], queryParam: 'q', proxied: true },
  { engine: 'LEXIS',
    hosts: ['advance.lexis.com', 'www.lexis.com', 'lexisnexis.com', 'www.lexisnexis.com'],
    queryParam: 'pdsearchterms', proxied: true, pathIncludes: '/search/',
    decodeQuery: true },
];

// ── serialized dispatch ─────────────────────────────────────────────

var rt2Chain = Promise.resolve();

/** Append records to the persistent log (single writer — call only
 *  from inside the dispatch chain, or for out-of-band records like
 *  notes that never touch engine state). Notifies rt2RecordHook so
 *  the host (background.js) can maintain side stores (metadata). */
async function rt2AppendRecords(records) {
  if (!records || records.length === 0) return;
  var seqBox = await chrome.storage.local.get([RT2_KEYS.LOG_SEQ]);
  var seq = seqBox[RT2_KEYS.LOG_SEQ] || 0;
  var writes = {};
  records.forEach(function (r) {
    writes[RT2_KEYS.LOG_PREFIX + seq] = r;
    seq += 1;
  });
  writes[RT2_KEYS.LOG_SEQ] = seq;
  await chrome.storage.local.set(writes);
  try {
    if (typeof self !== 'undefined' && typeof self.rt2RecordHook === 'function') {
      self.rt2RecordHook(records);
    }
  } catch (e) {
    console.error('rt2RecordHook error:', e);
  }
}

function rt2Dispatch(makeInput) {
  rt2Chain = rt2Chain
    .then(async function () {
      var gate = await chrome.storage.session.get([
        RT2_KEYS.RECORDING,
        RT2_KEYS.STATE,
        'rt2_paused',
      ]);
      if (!gate[RT2_KEYS.RECORDING]) return;
      var input = typeof makeInput === 'function' ? await makeInput() : makeInput;
      if (!input) return;
      // Paused: drop event collection but keep the session alive
      // (stop still passes so the end marker lands).
      if (gate['rt2_paused'] && input.kind !== 'stop') return;
      var state = gate[RT2_KEYS.STATE] || emptyRecordingState();
      var out = reduceRecording(state, input);
      await rt2AppendRecords(out.records);
      await chrome.storage.session.set(
        (function () {
          var o = {};
          o[RT2_KEYS.STATE] = out.state;
          return o;
        })(),
      );
    })
    .catch(function (e) {
      console.error('rt2 dispatch error:', e);
    });
  return rt2Chain;
}

// ── search detection (config-driven) ────────────────────────────────

var rt2EngineCache = null;
async function rt2Engines() {
  if (rt2EngineCache) return rt2EngineCache;
  var extra = (await chrome.storage.local.get([RT2_KEYS.ENGINES]))[RT2_KEYS.ENGINES] || [];
  rt2EngineCache = RT2_BUILTIN_ENGINES.concat(extra);
  return rt2EngineCache;
}
chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && changes[RT2_KEYS.ENGINES]) rt2EngineCache = null;
});

function rt2HostMatches(url, cfg) {
  var direct = cfg.hosts.some(function (h) {
    return url.hostname === h || url.host === h;
  });
  if (direct) return true;
  if (!cfg.proxied) return false;
  var norm = url.hostname.replace(/[-_.]/g, '').toLowerCase();
  return cfg.hosts.some(function (h) {
    return norm.indexOf(h.replace(/[-_.]/g, '').toLowerCase()) >= 0;
  });
}

async function rt2DetectSearch(urlString) {
  try {
    var url = new URL(urlString);
    var engines = await rt2Engines();
    for (var i = 0; i < engines.length; i++) {
      var cfg = engines[i];
      if (!rt2HostMatches(url, cfg)) continue;
      if (cfg.pathPrefixes && !cfg.pathPrefixes.some(function (p) { return url.pathname.indexOf(p) === 0; })) {
        continue;
      }
      if (cfg.pathIncludes && url.pathname.indexOf(cfg.pathIncludes) < 0) continue;
      var q = url.searchParams.get(cfg.queryParam);
      if (!q) continue;
      if (cfg.decodeQuery) {
        try {
          q = decodeURIComponent(q);
        } catch (e) {
          /* keep raw */
        }
      }
      var params = {};
      url.searchParams.forEach(function (v, k) {
        params[k] = v;
      });
      return { engine: cfg.engine, query: q, params: params };
    }
  } catch (e) {
    /* not a URL we care about */
  }
  return null;
}

// ── top-level listeners (NEVER registered conditionally) ────────────

chrome.webNavigation.onCommitted.addListener(function (details) {
  if (details.frameId !== 0) return;
  if (!/^https?:/.test(details.url)) return;
  rt2Dispatch(async function () {
    var search = await rt2DetectSearch(details.url);
    var windowId = null;
    try {
      var tab = await chrome.tabs.get(details.tabId);
      windowId = tab.windowId;
    } catch (e) {
      /* tab already gone */
    }
    return {
      kind: 'commit',
      ts: Date.now(),
      tabId: details.tabId,
      windowId: windowId,
      url: details.url,
      transitionType: details.transitionType,
      qualifiers: details.transitionQualifiers || [],
      search: search,
    };
  });
});

chrome.webNavigation.onCompleted.addListener(function (details) {
  if (details.frameId !== 0) return;
  // Arm the SERP corroboration script once the page is loaded (the
  // content script is guaranteed injected by onCompleted). Retry once
  // for engines that render results after load.
  rt2DetectSearch(details.url).then(function (search) {
    if (!search) return;
    chrome.storage.session.get([RT2_KEYS.RECORDING]).then(function (g) {
      if (!g[RT2_KEYS.RECORDING]) return;
      var ping = function () {
        chrome.tabs.sendMessage(details.tabId, { rt2: 'armSerp', engine: search.engine }).then(function (res) {
          if (!res || !res.armed) setTimeout(ping2, 800);
        }).catch(function () { setTimeout(ping2, 800); });
      };
      var ping2 = function () {
        chrome.tabs.sendMessage(details.tabId, { rt2: 'armSerp', engine: search.engine }).catch(function () {});
      };
      ping();
    });
  });
});

chrome.webNavigation.onCreatedNavigationTarget.addListener(function (details) {
  rt2Dispatch({
    kind: 'created_target',
    ts: Date.now(),
    sourceTabId: details.sourceTabId,
    tabId: details.tabId,
    url: details.url,
  });
});

chrome.tabs.onCreated.addListener(function (tab) {
  if (tab.openerTabId == null) return;
  rt2Dispatch({
    kind: 'tab_created',
    ts: Date.now(),
    tabId: tab.id,
    openerTabId: tab.openerTabId,
  });
});

chrome.webNavigation.onHistoryStateUpdated.addListener(function (details) {
  if (details.frameId !== 0) return;
  rt2Dispatch({
    kind: 'history_state',
    ts: Date.now(),
    tabId: details.tabId,
    url: details.url,
  });
});

chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  if (!changeInfo.title) return;
  rt2Dispatch({ kind: 'title', ts: Date.now(), tabId: tabId, title: changeInfo.title });
});

chrome.tabs.onActivated.addListener(function (info) {
  rt2Dispatch({
    kind: 'activated',
    ts: Date.now(),
    tabId: info.tabId,
    windowId: info.windowId,
  });
});

chrome.tabs.onRemoved.addListener(function (tabId) {
  rt2Dispatch({ kind: 'tab_removed', ts: Date.now(), tabId: tabId });
});

chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
  if (!message || typeof message.rt2 !== 'string') return false;
  switch (message.rt2) {
    case 'resultClick':
      rt2Dispatch({
        kind: 'result_click',
        ts: Date.now(),
        tabId: sender.tab ? sender.tab.id : -1,
        targetUrl: message.targetUrl,
        rank: message.rank,
        title: message.title,
      });
      sendResponse({ ok: true });
      return false;
    case 'resultsSeen':
      rt2Dispatch({
        kind: 'results',
        ts: Date.now(),
        tabId: sender.tab ? sender.tab.id : -1,
        searchUrl: message.searchUrl,
        results: message.results,
      });
      sendResponse({ ok: true });
      return false;
    case 'start':
      rt2Start(message.name).then(function (meta) {
        sendResponse({ ok: true, meta: meta });
      });
      return true;
    case 'stop':
      rt2Stop().then(function () {
        sendResponse({ ok: true });
      });
      return true;
    case 'export':
      rt2Export().then(function (session) {
        sendResponse({ ok: true, session: session });
      });
      return true;
    case 'status':
      chrome.storage.session.get([RT2_KEYS.RECORDING]).then(function (g) {
        sendResponse({ ok: true, recording: !!g[RT2_KEYS.RECORDING] });
      });
      return true;
  }
  return false;
});

// ── lifecycle ───────────────────────────────────────────────────────

async function rt2Start(name) {
  // Wipe any previous log.
  var old = await chrome.storage.local.get(null);
  var stale = Object.keys(old).filter(function (k) {
    return k.indexOf(RT2_KEYS.LOG_PREFIX) === 0;
  });
  if (stale.length) await chrome.storage.local.remove(stale);

  var meta = {
    id: 'rt2-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8),
    name: name || 'Research Session ' + new Date().toLocaleDateString(),
    startTime: new Date().toISOString(),
  };
  var metaWrite = {};
  metaWrite[RT2_KEYS.META] = meta;
  metaWrite[RT2_KEYS.LOG_SEQ] = 0;
  await chrome.storage.local.set(metaWrite);

  // Snapshot every open tab BEFORE opening the gate, classifying SERPs.
  var tabs = await chrome.tabs.query({});
  var snapshot = [];
  for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    if (!t.url || !/^https?:/.test(t.url)) continue;
    snapshot.push({
      tabId: t.id,
      windowId: t.windowId,
      url: t.url,
      title: t.title || '',
      active: !!t.active,
      search: await rt2DetectSearch(t.url),
    });
  }

  var gateWrite = {};
  gateWrite[RT2_KEYS.RECORDING] = true;
  gateWrite[RT2_KEYS.STATE] = emptyRecordingState();
  await chrome.storage.session.set(gateWrite);
  await rt2Dispatch({ kind: 'start', ts: Date.now(), tabs: snapshot });
  return meta;
}

async function rt2Stop() {
  await rt2Dispatch({ kind: 'stop', ts: Date.now() });
  var gateWrite = {};
  gateWrite[RT2_KEYS.RECORDING] = false;
  await chrome.storage.session.set(gateWrite);
  var meta = (await chrome.storage.local.get([RT2_KEYS.META]))[RT2_KEYS.META];
  if (meta) {
    meta.endTime = new Date().toISOString();
    var w = {};
    w[RT2_KEYS.META] = meta;
    await chrome.storage.local.set(w);
  }
}

async function rt2ReadLog() {
  var seqBox = await chrome.storage.local.get([RT2_KEYS.LOG_SEQ]);
  var seq = seqBox[RT2_KEYS.LOG_SEQ] || 0;
  var keys = [];
  for (var i = 0; i < seq; i++) keys.push(RT2_KEYS.LOG_PREFIX + i);
  var box = await chrome.storage.local.get(keys);
  var log = [];
  for (var j = 0; j < seq; j++) {
    if (box[RT2_KEYS.LOG_PREFIX + j]) log.push(box[RT2_KEYS.LOG_PREFIX + j]);
  }
  return log;
}

async function rt2Export() {
  var meta = (await chrome.storage.local.get([RT2_KEYS.META]))[RT2_KEYS.META] || {
    id: 'unknown',
    name: 'unknown',
    startTime: null,
  };
  var log = await rt2ReadLog();
  return assembleSession(meta, log);
}
