// Probe page B: same-tab visits bounce straight back (back/forward
// qualifiers); the new-tab visit changes its title (tabs.onUpdated)
// and then tells the background the run is complete.
var rt2Params = new URLSearchParams(location.search);
if (rt2Params.get('newtab')) {
  setTimeout(function () {
    document.title = 'RT-PROBE-TITLE';
    setTimeout(function () {
      chrome.runtime.sendMessage({ rt2: 'probeDone' });
    }, 400);
  }, 300);
} else {
  setTimeout(function () {
    history.back();
  }, 300);
}
