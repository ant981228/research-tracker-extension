/**
 * Recording engine v2 — the causality core.
 *
 * A PURE state machine: `reduceRecording(state, input)` takes the
 * current per-tab state plus one browser-derived input and returns
 * `{ state, records }` — the next state and zero or more append-only
 * session records. No chrome.* calls, no clocks (timestamps ride in on
 * the inputs), no storage: the adapter owns all of that. This is what
 * makes the ordering quirks of real browsers unit-testable.
 *
 * DESIGN PRINCIPLES (from the 2026-08 fragility review):
 *  - Attribution comes from NAVIGATION EVIDENCE (transition types,
 *    opener lineage, result clicks), never from "most recent search
 *    before this timestamp". A page with no evidence is an honest
 *    orphan (`attribution.method === 'none'`), not a guess.
 *  - Every input carries the tabId it concerns; all state is per-tab.
 *  - Records are append-only; nothing is rewritten. The exporter folds
 *    them into the legacy session shape.
 *
 * INPUT KINDS (normalized by the adapter):
 *  { kind:'start', ts, tabs:[{tabId, windowId, url, title, active}] }
 *  { kind:'commit', ts, tabId, windowId, url, transitionType,
 *    qualifiers:[...], search: null | {engine, query, params} }
 *  { kind:'created_target', ts, sourceTabId, tabId, url }
 *      (webNavigation.onCreatedNavigationTarget — cmd/middle-click,
 *       window.open, target=_blank)
 *  { kind:'tab_created', ts, tabId, openerTabId }   (fallback lineage)
 *  { kind:'history_state', ts, tabId, url }          (SPA pushState)
 *  { kind:'result_click', ts, tabId, targetUrl, rank, title }
 *  { kind:'results', ts, tabId, searchUrl, results:[{url,title,rank}] }
 *  { kind:'title', ts, tabId, title }
 *  { kind:'tab_removed', ts, tabId }
 *  { kind:'activated', ts, tabId, windowId }
 *  { kind:'stop', ts }
 *
 * RECORD KINDS (appended to the session log):
 *  session_start, search, visit, revisit, spa_visit, result_click,
 *  results_seen, title_update, tab_activated, session_end
 */

/* eslint-disable no-var */

function emptyRecordingState() {
  return {
    seq: 0, // record id counter
    tabs: {}, // tabId -> node: {kind:'search'|'page', id, url, searchId?}
    // tabId -> map url -> node  (for back/forward restoration; bounded)
    tabHistory: {},
    // tabId -> {node, ts}  — lineage captured at creation time, consumed
    // by that tab's FIRST commit. Captured EAGERLY because the source
    // tab may navigate away before the new tab loads.
    pendingNewTabs: {},
    // recent result clicks awaiting their navigation, matched by URL.
    // [{ts, tabId, targetUrl, rank, title, searchId}]
    pendingClicks: [],
  };
}

var RT2_PENDING_CLICK_TTL_MS = 15000;
var RT2_TAB_HISTORY_CAP = 50;

function rt2NormUrl(u) {
  try {
    var url = new URL(u);
    url.hash = '';
    return url.toString();
  } catch (e) {
    return u;
  }
}

function reduceRecording(state, input) {
  var records = [];
  var s = state;

  function nextId() {
    s.seq += 1;
    return s.seq;
  }
  function rememberNode(tabId, node) {
    s.tabs[tabId] = node;
    var hist = s.tabHistory[tabId] || (s.tabHistory[tabId] = {});
    hist[rt2NormUrl(node.url)] = node;
    // Bound the per-tab history map.
    var keys = Object.keys(hist);
    if (keys.length > RT2_TAB_HISTORY_CAP) delete hist[keys[0]];
  }
  function pruneClicks(now) {
    s.pendingClicks = s.pendingClicks.filter(function (c) {
      return now - c.ts < RT2_PENDING_CLICK_TTL_MS;
    });
  }
  function takeClickFor(url, now) {
    pruneClicks(now);
    var norm = rt2NormUrl(url);
    for (var i = 0; i < s.pendingClicks.length; i++) {
      if (rt2NormUrl(s.pendingClicks[i].targetUrl) === norm) {
        return s.pendingClicks.splice(i, 1)[0];
      }
    }
    return null;
  }

  switch (input.kind) {
    case 'start': {
      // Snapshot every open tab. Pre-existing SERPs become live search
      // nodes so their clicks attribute correctly; other pages become
      // pre-existing roots (recorded, honestly parentless).
      var snapshot = [];
      (input.tabs || []).forEach(function (t) {
        if (t.search) {
          var sid = nextId();
          var searchRec = {
            t: 'search',
            id: sid,
            ts: input.ts,
            tabId: t.tabId,
            windowId: t.windowId,
            engine: t.search.engine,
            query: t.search.query,
            params: t.search.params || {},
            url: t.url,
            preexisting: true,
          };
          records.push(searchRec);
          rememberNode(t.tabId, { kind: 'search', id: sid, url: t.url, searchId: sid });
          snapshot.push({ tabId: t.tabId, url: t.url, title: t.title, kind: 'search' });
        } else if (!t.excluded) {
          var vid = nextId();
          records.push({
            t: 'visit',
            id: vid,
            ts: input.ts,
            tabId: t.tabId,
            windowId: t.windowId,
            url: t.url,
            title: t.title || '',
            transition: 'preexisting',
            attribution: { method: 'none' },
            preexisting: true,
          });
          rememberNode(t.tabId, { kind: 'page', id: vid, url: t.url });
          snapshot.push({ tabId: t.tabId, url: t.url, title: t.title, kind: 'page' });
        }
      });
      records.unshift({ t: 'session_start', ts: input.ts, snapshot: snapshot });
      break;
    }

    case 'created_target': {
      // Capture the SOURCE tab's node NOW — it may navigate away before
      // the new tab commits. Also try to claim a pending result click
      // for this URL so new-tab clicks get rank-level attribution.
      var srcNode = s.tabs[input.sourceTabId] || null;
      var claimed = takeClickFor(input.url, input.ts);
      s.pendingNewTabs[input.tabId] = {
        node: srcNode,
        click: claimed,
        ts: input.ts,
      };
      break;
    }

    case 'tab_created': {
      // Fallback lineage via openerTabId — only if onCreatedNavigationTarget
      // didn't already tell us (it's more precise; don't overwrite).
      if (!(input.tabId in s.pendingNewTabs) && input.openerTabId != null) {
        s.pendingNewTabs[input.tabId] = {
          node: s.tabs[input.openerTabId] || null,
          click: null,
          ts: input.ts,
        };
      }
      break;
    }

    case 'result_click': {
      var node = s.tabs[input.tabId];
      pruneClicks(input.ts);
      s.pendingClicks.push({
        ts: input.ts,
        tabId: input.tabId,
        targetUrl: input.targetUrl,
        rank: input.rank,
        title: input.title || '',
        searchId: node && node.kind === 'search' ? node.searchId : null,
      });
      records.push({
        t: 'result_click',
        ts: input.ts,
        tabId: input.tabId,
        targetUrl: input.targetUrl,
        rank: input.rank,
        searchId: node && node.kind === 'search' ? node.searchId : null,
      });
      break;
    }

    case 'results': {
      var n2 = s.tabs[input.tabId];
      records.push({
        t: 'results_seen',
        ts: input.ts,
        tabId: input.tabId,
        searchId: n2 && n2.kind === 'search' ? n2.searchId : null,
        searchUrl: input.searchUrl,
        results: input.results || [],
      });
      break;
    }

    case 'commit': {
      var quals = input.qualifiers || [];
      var isBackForward =
        quals.indexOf('forward_back') >= 0 || input.transitionType === 'back_forward';
      var isReload = input.transitionType === 'reload';
      var isClientRedirect =
        input.transitionType === 'client_redirect' ||
        quals.indexOf('client_redirect') >= 0;
      var cur = s.tabs[input.tabId];

      // ── Search commits ──
      if (input.search) {
        // Every commit consumes the tab's pending lineage — a search
        // opened in a new tab is a root; the entry must never linger to
        // poison a LATER page commit (first-run field find).
        var searchPending = s.pendingNewTabs[input.tabId];
        delete s.pendingNewTabs[input.tabId];
        // The same SERP re-commits on reload / param churn: identical
        // normalized URL → duplicate, drop. A different URL on the same
        // engine (pagination, query tweak) is a refinement, logged below.
        if (
          cur &&
          cur.kind === 'search' &&
          rt2NormUrl(cur.url) === rt2NormUrl(input.url) &&
          !isBackForward
        ) {
          break; // duplicate SERP commit (reload / param echo)
        }
        if (isBackForward) {
          var priorS = (s.tabHistory[input.tabId] || {})[rt2NormUrl(input.url)];
          if (priorS) {
            records.push({
              t: 'revisit',
              ts: input.ts,
              tabId: input.tabId,
              of: priorS.id,
              url: input.url,
            });
            s.tabs[input.tabId] = priorS;
            break;
          }
        }
        var sid2 = nextId();
        // Refinement: previous node in THIS TAB was a search on the same
        // engine — pagination or query tweak, chained under the original.
        var refinementOf =
          cur && cur.kind === 'search' && cur.engine === input.search.engine
            ? cur.searchId
            : null;
        records.push({
          t: 'search',
          id: sid2,
          ts: input.ts,
          tabId: input.tabId,
          windowId: input.windowId,
          engine: input.search.engine,
          query: input.search.query,
          params: input.search.params || {},
          url: input.url,
          refinementOf: refinementOf,
          openedFrom:
            searchPending && searchPending.node ? searchPending.node.id : undefined,
        });
        rememberNode(input.tabId, {
          kind: 'search',
          id: sid2,
          url: input.url,
          searchId: sid2,
          engine: input.search.engine,
          query: input.search.query,
        });
        break;
      }

      // ── Page commits ──
      if (isReload && cur && rt2NormUrl(cur.url) === rt2NormUrl(input.url)) {
        records.push({
          t: 'revisit',
          ts: input.ts,
          tabId: input.tabId,
          of: cur.id,
          url: input.url,
          reload: true,
        });
        break;
      }
      if (isBackForward) {
        var prior = (s.tabHistory[input.tabId] || {})[rt2NormUrl(input.url)];
        if (prior) {
          records.push({
            t: 'revisit',
            ts: input.ts,
            tabId: input.tabId,
            of: prior.id,
            url: input.url,
          });
          s.tabs[input.tabId] = prior;
          break;
        }
        // fall through: back into pre-session history — new honest root
      }
      if (isClientRedirect && cur && cur.kind === 'page') {
        // Meta refresh / JS redirect: fold into the previous visit.
        records.push({
          t: 'visit_redirected',
          ts: input.ts,
          tabId: input.tabId,
          of: cur.id,
          finalUrl: input.url,
        });
        rememberNode(input.tabId, { kind: 'page', id: cur.id, url: input.url });
        break;
      }

      // Attribution, best evidence first. Pending lineage is consumed
      // by EVERY first commit (never allowed to linger), but each rung
      // falls through to the next when it has nothing to say.
      var attribution = { method: 'none' };
      var pending = s.pendingNewTabs[input.tabId];
      delete s.pendingNewTabs[input.tabId];
      var click = takeClickFor(input.url, input.ts);
      var deliberate =
        ['typed', 'auto_bookmark', 'generated', 'keyword', 'start_page'].indexOf(
          input.transitionType,
        ) >= 0;
      var pClick = (pending && pending.click) || click;
      if (deliberate) {
        // The user chose this destination themselves (address bar,
        // bookmark). Any opener is incidental — an honest root.
        attribution = { method: 'none' };
      } else if (pClick && pClick.searchId != null) {
        attribution = {
          method: 'click',
          searchId: pClick.searchId,
          rank: pClick.rank,
          newTab: !!pending,
        };
      } else if (pending && pending.node && pending.node.kind === 'search') {
        attribution = { method: 'opener', searchId: pending.node.searchId, newTab: true };
      } else if (pending && pending.node) {
        attribution = { method: 'opener', parentVisitId: pending.node.id, newTab: true };
      } else if (
        (input.transitionType === 'link' || input.transitionType === 'form_submit') &&
        cur
      ) {
        attribution =
          cur.kind === 'search'
            ? { method: 'navigation', searchId: cur.searchId }
            : { method: 'navigation', parentVisitId: cur.id };
      }

      var vid2 = nextId();
      records.push({
        t: 'visit',
        id: vid2,
        ts: input.ts,
        tabId: input.tabId,
        windowId: input.windowId,
        url: input.url,
        transition: input.transitionType,
        qualifiers: quals,
        serverRedirect: quals.indexOf('server_redirect') >= 0 || undefined,
        attribution: attribution,
      });
      rememberNode(input.tabId, { kind: 'page', id: vid2, url: input.url });
      break;
    }

    case 'history_state': {
      var curNode = s.tabs[input.tabId];
      if (curNode && rt2NormUrl(curNode.url) === rt2NormUrl(input.url)) break; // hash/no-op
      var svid = nextId();
      records.push({
        t: 'visit',
        id: svid,
        ts: input.ts,
        tabId: input.tabId,
        url: input.url,
        transition: 'spa',
        attribution: curNode
          ? curNode.kind === 'search'
            ? { method: 'navigation', searchId: curNode.searchId }
            : { method: 'navigation', parentVisitId: curNode.id }
          : { method: 'none' },
      });
      rememberNode(input.tabId, { kind: 'page', id: svid, url: input.url });
      break;
    }

    case 'title': {
      var tn = s.tabs[input.tabId];
      if (tn && input.title) {
        records.push({ t: 'title_update', of: tn.id, title: input.title, ts: input.ts });
      }
      break;
    }

    case 'activated': {
      records.push({
        t: 'tab_activated',
        ts: input.ts,
        tabId: input.tabId,
        node: s.tabs[input.tabId] ? s.tabs[input.tabId].id : null,
      });
      break;
    }

    case 'tab_removed': {
      delete s.tabs[input.tabId];
      delete s.tabHistory[input.tabId];
      delete s.pendingNewTabs[input.tabId];
      break;
    }

    case 'stop': {
      records.push({ t: 'session_end', ts: input.ts });
      break;
    }
  }

  return { state: s, records: records };
}

/** Fold the append-only record log into the legacy export shape
 *  (searches / contentPages / chronologicalEvents), with the new
 *  provenance fields riding along additively. */
function assembleSession(meta, log) {
  var byId = {};
  var searches = [];
  var pages = [];
  var chrono = [];
  log.forEach(function (r) {
    if (r.t === 'search') {
      var searchObj = {
        type: 'search',
        id: r.id,
        engine: r.engine,
        domain: r.url ? new URL(r.url).hostname : '',
        query: r.query,
        params: r.params,
        url: r.url,
        timestamp: new Date(r.ts).toISOString(),
        tabId: r.tabId,
        refinementOf: r.refinementOf || undefined,
        preexisting: r.preexisting || undefined,
        notes: [],
      };
      byId[r.id] = searchObj;
      searches.push(searchObj);
      chrono.push(searchObj);
    } else if (r.t === 'visit') {
      var att = r.attribution || { method: 'none' };
      var src = att.searchId != null ? byId[att.searchId] : null;
      var pageObj = {
        type: 'pageVisit',
        id: r.id,
        url: r.url,
        finalUrl: undefined,
        title: r.title || '',
        timestamp: new Date(r.ts).toISOString(),
        tabId: r.tabId,
        transition: r.transition,
        attribution: att,
        sourceSearch: src
          ? { engine: src.engine, query: src.query, url: src.url, timestamp: src.timestamp }
          : null,
        parentVisitId: att.parentVisitId != null ? att.parentVisitId : undefined,
        preexisting: r.preexisting || undefined,
        revisits: [],
        notes: [],
      };
      byId[r.id] = pageObj;
      pages.push(pageObj);
      chrono.push(pageObj);
    } else if (r.t === 'title_update') {
      if (byId[r.of]) byId[r.of].title = r.title;
    } else if (r.t === 'visit_redirected') {
      if (byId[r.of]) byId[r.of].finalUrl = r.finalUrl;
    } else if (r.t === 'revisit') {
      if (byId[r.of] && byId[r.of].revisits) {
        byId[r.of].revisits.push({
          timestamp: new Date(r.ts).toISOString(),
          reload: r.reload || false,
        });
      }
    } else if (r.t === 'session_end') {
      chrono.push({ type: 'session_ended', timestamp: new Date(r.ts).toISOString() });
    }
  });
  return {
    id: meta.id,
    name: meta.name,
    startTime: meta.startTime,
    endTime: meta.endTime || null,
    searches: searches,
    contentPages: pages,
    chronologicalEvents: chrono,
  };
}

if (typeof module !== 'undefined') {
  module.exports = {
    emptyRecordingState: emptyRecordingState,
    reduceRecording: reduceRecording,
    assembleSession: assembleSession,
  };
}
