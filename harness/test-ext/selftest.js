/**
 * Recording self-test — verifies IN THE HOST BROWSER that every signal
 * the v2 recorder depends on actually fires. Built for Chromium forks
 * (Dia, Arc, Edge, Brave…) whose navigation plumbing is probably stock
 * but whose shells sometimes deviate: run it once per browser instead
 * of trusting compatibility folklore.
 *
 * Mechanics: opens a self-driving probe page (extension pages, so no
 * network needed) that clicks a same-tab link, comes back, does a
 * pushState, and opens a target=_blank link; capture listeners record
 * which browser events arrive; expectations are evaluated against the
 * capture. Refuses to run while a recording session is active.
 */

/* global RT2_KEYS */

var RT2_PROBE = {
  active: false,
  events: [],
  finish: null,
};

function rt2ProbeUrl(page) {
  return chrome.runtime.getURL('src/diagnostics/' + page);
}

function rt2ProbeRecord(type, data) {
  if (!RT2_PROBE.active) return;
  var e = { type: type, ts: Date.now() };
  Object.keys(data || {}).forEach(function (k) {
    e[k] = data[k];
  });
  RT2_PROBE.events.push(e);
}

// Capture listeners — top-level, near-zero cost while inactive.
chrome.webNavigation.onCommitted.addListener(function (d) {
  if (d.frameId !== 0) return;
  rt2ProbeRecord('commit', {
    url: d.url,
    tabId: d.tabId,
    transitionType: d.transitionType,
    qualifiers: d.transitionQualifiers || [],
  });
});
chrome.webNavigation.onCompleted.addListener(function (d) {
  if (d.frameId !== 0) return;
  rt2ProbeRecord('completed', { url: d.url, tabId: d.tabId });
});
chrome.webNavigation.onCreatedNavigationTarget.addListener(function (d) {
  rt2ProbeRecord('created_target', {
    sourceTabId: d.sourceTabId,
    tabId: d.tabId,
    url: d.url,
  });
});
chrome.webNavigation.onHistoryStateUpdated.addListener(function (d) {
  if (d.frameId !== 0) return;
  rt2ProbeRecord('history_state', { url: d.url, tabId: d.tabId });
});
chrome.tabs.onCreated.addListener(function (tab) {
  rt2ProbeRecord('tab_created', { tabId: tab.id, openerTabId: tab.openerTabId });
});
chrome.tabs.onActivated.addListener(function (info) {
  rt2ProbeRecord('activated', { tabId: info.tabId });
});
chrome.tabs.onUpdated.addListener(function (tabId, changeInfo) {
  if (changeInfo.title) rt2ProbeRecord('title', { tabId: tabId, title: changeInfo.title });
});

chrome.runtime.onMessage.addListener(function (message, _sender, sendResponse) {
  if (!message || typeof message.rt2 !== 'string') return false;
  if (message.rt2 === 'probeDone') {
    if (RT2_PROBE.finish) RT2_PROBE.finish('done');
    sendResponse({ ok: true });
    return false;
  }
  if (message.rt2 === 'selftest') {
    rt2RunSelfTest()
      .then(function (results) {
        sendResponse({ ok: true, results: results });
      })
      .catch(function (e) {
        sendResponse({ ok: false, error: String(e && e.message ? e.message : e) });
      });
    return true;
  }
  return false;
});

async function rt2RunSelfTest() {
  var gate = await chrome.storage.session.get(['rt2_recording']);
  if (gate['rt2_recording']) {
    throw new Error('Stop the active recording session first.');
  }

  var results = [];
  function expect(name, pass, detail, optional) {
    results.push({ name: name, pass: !!pass, detail: detail || '', optional: !!optional });
  }

  // 1. storage.session round trip (independent of the probe run).
  try {
    await chrome.storage.session.set({ rt2_probe_echo: 'echo' });
    var echo = await chrome.storage.session.get(['rt2_probe_echo']);
    await chrome.storage.session.remove(['rt2_probe_echo']);
    expect('storage.session read/write', echo['rt2_probe_echo'] === 'echo');
  } catch (e) {
    expect('storage.session read/write', false, String(e));
  }

  // 2. Probe run.
  RT2_PROBE.events = [];
  RT2_PROBE.active = true;
  var probeTab = await chrome.tabs.create({ url: rt2ProbeUrl('probe-a.html'), active: true });
  var outcome = await new Promise(function (resolve) {
    var timer = setTimeout(function () {
      resolve('timeout');
    }, 15000);
    RT2_PROBE.finish = function (why) {
      clearTimeout(timer);
      resolve(why);
    };
  });
  // Small grace so trailing events (title, completed) land.
  await new Promise(function (r) {
    setTimeout(r, 600);
  });
  RT2_PROBE.active = false;
  RT2_PROBE.finish = null;

  // Close every probe tab we can find.
  var probeTabIds = {};
  probeTabIds[probeTab.id] = true;
  RT2_PROBE.events.forEach(function (e) {
    if (e.url && e.url.indexOf(rt2ProbeUrl('')) === 0 && e.tabId != null) {
      probeTabIds[e.tabId] = true;
    }
  });
  for (var idStr in probeTabIds) {
    try {
      await chrome.tabs.remove(parseInt(idStr, 10));
    } catch (e) {
      /* already closed */
    }
  }

  // 3. Evaluate.
  var ev = RT2_PROBE.events;
  var probePrefix = rt2ProbeUrl('');
  var commits = ev.filter(function (e) {
    return e.type === 'commit' && e.url && e.url.indexOf(probePrefix) === 0;
  });
  var aCommit = commits.find(function (e) {
    return e.url.indexOf('probe-a.html') >= 0;
  });
  var bSameTab = commits.find(function (e) {
    return e.url.indexOf('probe-b.html') >= 0 && e.url.indexOf('newtab') < 0;
  });
  var backCommit = commits.find(function (e) {
    return (
      e.url.indexOf('probe-a.html') >= 0 &&
      (e.qualifiers.indexOf('forward_back') >= 0 || e.transitionType === 'back_forward')
    );
  });
  var target = ev.find(function (e) {
    return e.type === 'created_target' && e.url && e.url.indexOf('newtab') >= 0;
  });
  var newTabCommit = commits.find(function (e) {
    return e.url.indexOf('newtab') >= 0;
  });
  var opener = ev.find(function (e) {
    return e.type === 'tab_created' && e.openerTabId != null;
  });
  var hist = ev.find(function (e) {
    return e.type === 'history_state' && e.url && e.url.indexOf('spa=1') >= 0;
  });
  var title = ev.find(function (e) {
    return e.type === 'title' && e.title === 'RT-PROBE-TITLE';
  });
  var completed = ev.find(function (e) {
    return e.type === 'completed' && e.url && e.url.indexOf(probePrefix) === 0;
  });
  var activated = ev.find(function (e) {
    return e.type === 'activated';
  });

  expect('probe run finished', outcome === 'done', outcome);
  expect('webNavigation.onCommitted fires', !!aCommit);
  expect(
    "link click commits with transition 'link'",
    bSameTab && bSameTab.transitionType === 'link',
    bSameTab ? bSameTab.transitionType : 'no commit seen',
  );
  expect(
    'back/forward carries forward_back qualifier',
    !!backCommit,
    backCommit ? backCommit.qualifiers.join(',') : 'not observed',
  );
  // The recorder needs new-tab lineage from EITHER signal; some
  // Chromium builds skip onCreatedNavigationTarget for extension-page
  // openers (openerTabId still covers it).
  expect('new-tab lineage available (either signal)', !!target || !!opener,
    target ? 'onCreatedNavigationTarget' : opener ? 'openerTabId' : 'neither');
  expect('onCreatedNavigationTarget fires', !!target,
    target ? '' : 'not delivered for extension-page openers in this browser', true);
  expect('tabs.onCreated exposes openerTabId', !!opener);
  expect('new tab commits its navigation', !!newTabCommit,
    newTabCommit ? newTabCommit.transitionType : 'not observed');
  expect('onHistoryStateUpdated fires (SPA pushState)', !!hist);
  expect('tabs.onUpdated delivers title changes', !!title);
  expect('webNavigation.onCompleted fires', !!completed,
    completed ? '' : 'some browsers skip it for extension pages; recorder only needs it on web pages', true);
  expect('tabs.onActivated fires', !!activated);

  return results;
}
