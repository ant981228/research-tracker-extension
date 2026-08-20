// Self-driving probe page A: phase 1 clicks a same-tab link (commit,
// transition 'link'); phase 2 (after B sends us back) does a pushState
// (onHistoryStateUpdated) then clicks a target=_blank link
// (onCreatedNavigationTarget + opener lineage).
function rt2ProbeStep() {
  var phase = sessionStorage.getItem('rt2ProbePhase') || '1';
  if (phase === '1') {
    sessionStorage.setItem('rt2ProbePhase', '2');
    setTimeout(function () {
      document.getElementById('to-b').click();
    }, 250);
  } else if (phase === '2') {
    sessionStorage.setItem('rt2ProbePhase', 'done');
    setTimeout(function () {
      history.pushState({}, '', 'probe-a.html?spa=1');
      setTimeout(function () {
        document.getElementById('blank').click();
      }, 250);
    }, 250);
  }
}
window.addEventListener('pageshow', function () {
  setTimeout(rt2ProbeStep, 250);
});
