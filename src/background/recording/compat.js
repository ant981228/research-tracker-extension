/**
 * v1 compatibility layer — the old recorder's vocabulary implemented on
 * the v2 engine. The popup, IndexedDB session archive, exporters, and
 * visualizer all speak the legacy session shape ({events, searches,
 * pageVisits} with notes); this module builds that shape from the v2
 * append-only record log, so none of them change. The new provenance
 * fields (attribution, parentVisitId, refinementOf, revisits, results)
 * ride along additively.
 *
 * Loaded via importScripts AFTER adapter.js; background.js provides
 * researchTrackerDB and the badge helpers at call time.
 */

/* global rt2Start, rt2Stop, rt2ReadLog, rt2AppendRecords, RT2_KEYS */

var RT2_COMPAT_KEYS = {
  PREFIX: 'rt2_resume_prefix', // storage.local: legacy session being resumed
  PAUSED: 'rt2_paused', // storage.session
};

async function rt2IsRecording() {
  var g = await chrome.storage.session.get([RT2_KEYS.RECORDING]);
  return !!g[RT2_KEYS.RECORDING];
}

async function rt2IsPaused() {
  var g = await chrome.storage.session.get([RT2_COMPAT_KEYS.PAUSED]);
  return !!g[RT2_COMPAT_KEYS.PAUSED];
}

// ── legacy session construction ─────────────────────────────────────

function rt2BuildLegacyEvents(log) {
  var searchesById = {};
  var visitsById = {};
  var events = [];
  var searches = [];
  var pageVisits = [];
  var notesByUrl = {}; // latest note per URL (v1: one note per item)

  log.forEach(function (r) {
    if (r.t === 'search') {
      var domain = '';
      try {
        domain = new URL(r.url).hostname;
      } catch (e) {
        /* keep empty */
      }
      var searchObj = {
        type: 'search',
        engine: r.engine,
        domain: domain,
        query: r.query,
        params: r.params || {},
        url: r.url,
        timestamp: new Date(r.ts).toISOString(),
        tabId: r.tabId,
        notes: [],
      };
      if (r.refinementOf != null) searchObj.refinementOf = r.refinementOf;
      if (r.preexisting) searchObj.preexisting = true;
      if (r.openedFrom != null) searchObj.openedFrom = r.openedFrom;
      searchObj.rtId = r.id;
      searchesById[r.id] = searchObj;
      searches.push(searchObj);
      events.push(searchObj);
    } else if (r.t === 'visit') {
      var att = r.attribution || { method: 'none' };
      var src = att.searchId != null ? searchesById[att.searchId] : null;
      var visitObj = {
        type: 'pageVisit',
        url: r.url,
        title: r.title || '',
        timestamp: new Date(r.ts).toISOString(),
        tabId: r.tabId,
        sourceSearch: src
          ? { engine: src.engine, query: src.query, url: src.url, timestamp: src.timestamp }
          : null,
        attribution: att,
        transition: r.transition,
        notes: [],
        revisits: [],
      };
      if (att.parentVisitId != null) visitObj.parentVisitId = att.parentVisitId;
      if (r.preexisting) visitObj.preexisting = true;
      visitObj.rtId = r.id;
      visitsById[r.id] = visitObj;
      pageVisits.push(visitObj);
      events.push(visitObj);
    } else if (r.t === 'title_update') {
      if (visitsById[r.of]) visitsById[r.of].title = r.title;
    } else if (r.t === 'visit_redirected') {
      if (visitsById[r.of]) visitsById[r.of].finalUrl = r.finalUrl;
    } else if (r.t === 'revisit') {
      if (visitsById[r.of]) {
        visitsById[r.of].revisits.push({
          timestamp: new Date(r.ts).toISOString(),
          reload: r.reload || false,
        });
      }
    } else if (r.t === 'results_seen') {
      // What the user SAW on the SERP — additive, useful to the
      // visualizer for showing unclicked results.
      if (r.searchId != null && searchesById[r.searchId]) {
        searchesById[r.searchId].results = r.results || [];
      }
    } else if (r.t === 'note') {
      notesByUrl[r.url] = { content: r.content, timestamp: new Date(r.ts).toISOString() };
    }
  });

  // Attach notes: search first (v1 precedence), then latest visit of
  // that URL, else an orphaned note event.
  Object.keys(notesByUrl).forEach(function (url) {
    var noteObj = notesByUrl[url];
    var target = null;
    for (var i = searches.length - 1; i >= 0; i--) {
      if (searches[i].url === url) {
        target = searches[i];
        break;
      }
    }
    if (!target) {
      for (var j = pageVisits.length - 1; j >= 0; j--) {
        if (pageVisits[j].url === url) {
          target = pageVisits[j];
          break;
        }
      }
    }
    if (target) {
      target.notes = [noteObj];
      target.has_notes = true;
    } else {
      events.push({
        type: 'note',
        url: url,
        content: noteObj.content,
        timestamp: noteObj.timestamp,
        orphaned: true,
      });
    }
  });

  return { events: events, searches: searches, pageVisits: pageVisits };
}

async function rt2BuildLegacySession() {
  var meta =
    (await chrome.storage.local.get([RT2_KEYS.META]))[RT2_KEYS.META] || {
      id: 'unknown',
      name: 'unknown',
      startTime: null,
    };
  var log = await rt2ReadLog();
  var built = rt2BuildLegacyEvents(log);
  var session = {
    id: meta.id,
    name: meta.name,
    startTime: meta.startTime,
    endTime: meta.endTime || null,
    isPaused: await rt2IsPaused(),
    events: built.events,
    searches: built.searches,
    pageVisits: built.pageVisits,
  };

  // A resumed session: splice the archived prefix in front, with the
  // v1 session_resumed marker between the halves.
  var prefix = (await chrome.storage.local.get([RT2_COMPAT_KEYS.PREFIX]))[
    RT2_COMPAT_KEYS.PREFIX
  ];
  if (prefix) {
    var marker = {
      type: 'session_resumed',
      timestamp: meta.resumedAt || meta.startTime,
      previousEndTime: prefix.endTime,
    };
    session.startTime = prefix.startTime;
    session.events = (prefix.events || []).concat([marker], session.events);
    session.searches = (prefix.searches || []).concat(session.searches);
    session.pageVisits = (prefix.pageVisits || []).concat(session.pageVisits);
  }
  return session;
}

// ── lifecycle (the old message vocabulary) ──────────────────────────

async function rt2CompatStart(sessionName) {
  if (await rt2IsRecording()) {
    if (await rt2IsPaused()) await rt2CompatResumeRecording();
    return;
  }
  await chrome.storage.local.remove([RT2_COMPAT_KEYS.PREFIX]);
  var w = {};
  w[RT2_COMPAT_KEYS.PAUSED] = false;
  await chrome.storage.session.set(w);
  await rt2Start(sessionName);
}

async function rt2CompatStop() {
  if (!(await rt2IsRecording())) return false;
  await rt2Stop();
  var meta = (await chrome.storage.local.get([RT2_KEYS.META]))[RT2_KEYS.META];
  if (meta && !meta.endTime) meta.endTime = new Date().toISOString();
  var session = await rt2BuildLegacySession();
  session.endTime = meta ? meta.endTime : new Date().toISOString();
  session.isPaused = false;
  session.events = session.events.concat([
    { type: 'session_ended', timestamp: session.endTime },
  ]);

  await researchTrackerDB.saveSession(session);

  // Clear the v2 log + prefix.
  var all = await chrome.storage.local.get(null);
  var stale = Object.keys(all).filter(function (k) {
    return k.indexOf(RT2_KEYS.LOG_PREFIX) === 0;
  });
  stale.push(RT2_KEYS.LOG_SEQ, RT2_KEYS.META, RT2_COMPAT_KEYS.PREFIX);
  await chrome.storage.local.remove(stale);
  chrome.action.setBadgeText({ text: '' });
  return session;
}

async function rt2CompatPause() {
  if (!(await rt2IsRecording())) return;
  var w = {};
  w[RT2_COMPAT_KEYS.PAUSED] = true;
  await chrome.storage.session.set(w);
}

async function rt2CompatResumeRecording() {
  if (!(await rt2IsRecording())) return;
  var w = {};
  w[RT2_COMPAT_KEYS.PAUSED] = false;
  await chrome.storage.session.set(w);
}

async function rt2CompatStatus() {
  var recording = await rt2IsRecording();
  if (!recording) return { isRecording: false, currentSession: null };
  var session = await rt2BuildLegacySession();
  return {
    isRecording: true,
    currentSession: {
      id: session.id,
      name: session.name,
      startTime: session.startTime,
      isPaused: session.isPaused,
      events: session.events.length,
      recentPages: session.pageVisits.slice(-5).reverse(),
      recentSearches: session.searches.slice(-5).reverse(),
    },
  };
}

async function rt2CompatAddNote(url, content) {
  if (!(await rt2IsRecording())) return false;
  await rt2AppendRecords([{ t: 'note', ts: Date.now(), url: url, content: content }]);
  return true;
}

async function rt2CompatGetExistingNote(url) {
  var log = await rt2ReadLog();
  for (var i = log.length - 1; i >= 0; i--) {
    if (log[i].t === 'note' && log[i].url === url) return log[i].content;
  }
  return null;
}

async function rt2CompatRename(newName) {
  var box = await chrome.storage.local.get([RT2_KEYS.META]);
  var meta = box[RT2_KEYS.META];
  if (!meta) return false;
  meta.name = newName;
  var w = {};
  w[RT2_KEYS.META] = meta;
  await chrome.storage.local.set(w);
  return true;
}

async function rt2CompatResumeSession(sessionId) {
  if (await rt2IsRecording()) {
    throw new Error(
      'Cannot resume session while another session is active. Please stop the current session first.',
    );
  }
  var old = await researchTrackerDB.getSession(sessionId);
  if (!old) throw new Error('Session not found');

  // Store the archived half as the prefix BEFORE deleting from the DB
  // (same crash-ordering rule as v1).
  var w = {};
  w[RT2_COMPAT_KEYS.PREFIX] = old;
  await chrome.storage.local.set(w);
  await researchTrackerDB.deleteSession(sessionId);

  var pw = {};
  pw[RT2_COMPAT_KEYS.PAUSED] = false;
  await chrome.storage.session.set(pw);
  var meta = await rt2Start(old.name);
  // Keep the original identity; mark the resume point.
  meta.id = old.id;
  meta.name = old.name;
  meta.resumedAt = new Date().toISOString();
  var mw = {};
  mw[RT2_KEYS.META] = meta;
  await chrome.storage.local.set(mw);
  return true;
}
