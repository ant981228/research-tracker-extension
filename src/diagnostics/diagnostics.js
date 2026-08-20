document.getElementById('run').addEventListener('click', function () {
  var status = document.getElementById('status');
  var btn = document.getElementById('run');
  btn.disabled = true;
  status.textContent = 'Running… (probe tabs will open and close)';
  chrome.runtime.sendMessage({ rt2: 'selftest' }, function (res) {
    btn.disabled = false;
    if (!res || !res.ok) {
      status.textContent = 'Self-test failed to run: ' + (res && res.error ? res.error : 'no response');
      return;
    }
    var required = res.results.filter(function (r) { return !r.optional; });
    var passedReq = required.filter(function (r) { return r.pass; }).length;
    status.textContent =
      passedReq + '/' + required.length + ' required signals verified' +
      (passedReq === required.length
        ? ' — this browser fully supports the recorder.'
        : ' — the recorder would MISS data in this browser.');
    var table = document.getElementById('results');
    var tbody = table.querySelector('tbody');
    tbody.textContent = '';
    res.results.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.className = r.pass ? 'pass' : r.optional ? '' : 'fail';
      [r.name, r.pass ? 'PASS' : r.optional ? 'INFO' : 'FAIL', r.detail || ''].forEach(function (cell) {
        var td = document.createElement('td');
        td.textContent = cell;
        tr.appendChild(td);
      });
      tbody.appendChild(tr);
    });
    table.hidden = false;
  });
});
