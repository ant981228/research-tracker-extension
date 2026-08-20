/**
 * Fake research web for the recording harness: a "search engine" and a
 * mesh of article pages with every navigation shape the real web
 * throws at the recorder — same-tab links, target=_blank links,
 * server-redirect hops, client (JS) redirects, SPA pushState, and
 * pagination.
 */
const http = require('http');

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
}

function page(title, body) {
  return `<!doctype html><html><head><title>${esc(title)}</title></head><body>${body}</body></html>`;
}

function serp(q, pageNo, port) {
  const base = `http://localhost:${port}`;
  const results = [];
  for (let i = 1; i <= 5; i++) {
    const n = (pageNo - 1) * 5 + i;
    results.push(
      `<div data-rt-result><a href="${base}/article/${esc(q)}-${n}">Result ${n} for ${esc(q)}</a></div>`,
    );
  }
  // One result behind a server-redirect shim, one that opens a new tab.
  results.push(
    `<div data-rt-result><a href="${base}/redir?u=${encodeURIComponent(
      `${base}/article/${q}-shimmed`,
    )}">Shimmed result for ${esc(q)}</a></div>`,
  );
  results.push(
    `<div data-rt-result><a target="_blank" href="${base}/article/${esc(
      q,
    )}-newtab">New-tab result for ${esc(q)}</a></div>`,
  );
  const nav = `<a id="next" href="${base}/search?q=${encodeURIComponent(q)}&page=${
    pageNo + 1
  }">Next page</a>`;
  return page(`Search: ${q}`, results.join('\n') + nav);
}

function article(slug, port) {
  const base = `http://localhost:${port}`;
  return page(
    `Article ${slug}`,
    `<h1>Article ${esc(slug)}</h1>
     <p>Body of ${esc(slug)}.</p>
     <a id="onward" href="${base}/article/${esc(slug)}-linked">Onward link</a>
     <a id="onward-blank" target="_blank" href="${base}/article/${esc(slug)}-blanklinked">Onward (new tab)</a>`,
  );
}

function spa(port) {
  return page(
    'SPA root',
    `<h1 id="h">SPA root</h1>
     <button id="go" onclick="history.pushState({}, '', '/spa/section-2'); document.getElementById('h').textContent='Section 2';">go</button>`,
  );
}

function clientRedirect(target) {
  return page('redirecting…', `<script>location.replace(${JSON.stringify(target)});</script>`);
}

function start(port) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    const send = (html, code = 200, headers = {}) => {
      res.writeHead(code, { 'content-type': 'text/html; charset=utf-8', ...headers });
      res.end(html);
    };
    if (url.pathname === '/search') {
      const q = url.searchParams.get('q') || '';
      const pageNo = parseInt(url.searchParams.get('page') || '1', 10);
      return send(serp(q, pageNo, port));
    }
    if (url.pathname === '/redir') {
      // two-hop server redirect: /redir → /redir2 → target
      return send('', 302, { location: `http://localhost:${port}/redir2?u=${encodeURIComponent(url.searchParams.get('u') || '/')}` });
    }
    if (url.pathname === '/redir2') {
      return send('', 302, { location: url.searchParams.get('u') || '/' });
    }
    if (url.pathname === '/jsredir') {
      return send(clientRedirect(url.searchParams.get('u') || '/'));
    }
    if (url.pathname.startsWith('/article/')) {
      return send(article(url.pathname.slice('/article/'.length), port));
    }
    if (url.pathname.startsWith('/spa')) {
      return send(spa(port));
    }
    return send(page('home', `<a href="/search?q=hello">search hello</a>`));
  });
  return new Promise((resolve) => server.listen(port, () => resolve(server)));
}

module.exports = { start };
