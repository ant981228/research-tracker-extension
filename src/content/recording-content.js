/**
 * Recording content script v2 — SERP corroboration.
 *
 * On pages the background classifies as search results, this script:
 *  1. extracts the visible result links (url, title, rank) and reports
 *     them (`resultsSeen`) so the session records what the user SAW;
 *  2. listens for clicks (including middle/cmd-click via auxclick and
 *     modified left-clicks) on those links and reports `resultClick`
 *     BEFORE the navigation happens — the second, independent
 *     attribution signal beside the navigation graph.
 *
 * Extraction is selector-driven: production maps each engine to its
 * SEARCH_EXTRACTORS entry; the harness's fake SERP uses
 * [data-rt-result]. Everything is defensive — a page that matches
 * nothing simply reports nothing.
 */

(function () {
  var SELECTORS = [
    '[data-rt-result] a[href], a[data-rt-result]', // harness + generic marker
    '#search a h3', // Google (anchor resolved below)
    '#b_results h2 a', // Bing
    'a[data-testid="result-title-a"]', // DuckDuckGo
    'h3.gs_rt a', // Google Scholar
  ];

  function collectResults() {
    var seen = {};
    var results = [];
    SELECTORS.forEach(function (sel) {
      var nodes;
      try {
        nodes = document.querySelectorAll(sel);
      } catch (e) {
        return;
      }
      nodes.forEach(function (node) {
        var a = node.tagName === 'A' ? node : node.closest('a');
        if (!a || !a.href || !/^https?:/.test(a.href)) return;
        if (seen[a.href]) return;
        seen[a.href] = true;
        results.push({
          url: a.href,
          title: (node.textContent || '').trim().slice(0, 300),
          rank: results.length + 1,
          el: a,
        });
      });
    });
    return results;
  }

  var armed = false;
  var byHref = {};
  var listening = false;

  function report(e) {
    var a = e.target && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    var r = byHref[a.href];
    if (!r) return;
    chrome.runtime.sendMessage({
      rt2: 'resultClick',
      targetUrl: a.href,
      rank: r.rank,
      title: r.title,
    });
  }

  function arm() {
    if (armed) return;
    var results = collectResults();
    if (results.length === 0) {
      return; // retry on next request — the SERP may still be rendering
    }
    armed = true;
    chrome.runtime.sendMessage({
      rt2: 'resultsSeen',
      searchUrl: location.href,
      results: results.map(function (r) {
        return { url: r.url, title: r.title, rank: r.rank };
      }),
    });

    byHref = {};
    results.forEach(function (r) {
      byHref[r.el.href] = r;
    });

    // Document-level listeners are registered ONCE — a bfcache restore
    // re-arms the map, and stacking listeners here triple-fired the
    // click signal (harness field find). mousedown fires before the
    // navigation for left clicks; auxclick covers middle-click.
    if (!listening) {
      listening = true;
      document.addEventListener('mousedown', report, true);
      document.addEventListener('auxclick', report, true);
    }
  }

  chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
    if (message && message.rt2 === 'armSerp') {
      arm();
      sendResponse({ ok: true, armed: armed });
    }
    return false;
  });

  // Self-arm: ask the background whether this page is a SERP is not
  // needed — the background pings armSerp after logging a search. But a
  // SERP restored from bfcache may miss that ping, so re-arm on
  // pageshow if we were armed before.
  window.addEventListener('pageshow', function (e) {
    if (e.persisted && armed) {
      armed = false;
      arm();
    }
  });
})();
