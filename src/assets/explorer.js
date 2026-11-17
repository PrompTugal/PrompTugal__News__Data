// The API explorer: reads this site's own OpenAPI 3.1 documents and lets a reader try every GET address in the browser.
// data@PrompTugal.dinis, 17 November 2026. Written here instead of vendoring Swagger UI: its minified bundle holds text
// the site's wording gate refuses (an em dash, a hype word), and an exception in the gate is Dinis's decision, not ours.
// Every call is a GET to this site. No dependencies.
(function () {
  var root = document.getElementById('explorer');
  if (!root) return;
  var specs = JSON.parse(root.getAttribute('data-specs') || '[]');
  var want = new URLSearchParams(location.search).get('source');
  function E(tag, attrs, kids) { var e = document.createElement(tag); for (var k in (attrs || {})) { if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); } (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }); return e; }
  var pick = E('select', { id: 'explorer-spec', 'aria-label': 'OpenAPI document' });
  specs.forEach(function (s, i) { var o = E('option', { value: String(i), text: s.name }); if (want && s.name === want) o.selected = true; pick.appendChild(o); });
  var info = E('div', { class: 'explorer-info' }), list = E('div', { class: 'explorer-ops' });
  root.textContent = '';
  root.appendChild(E('p', {}, [E('label', { for: 'explorer-spec', text: 'Document: ' }), pick, ' ', E('a', { id: 'explorer-raw', href: '#', text: 'the JSON' })]));
  root.appendChild(info); root.appendChild(list);
  function load() {
    var s = specs[+pick.value]; if (!s) return;
    document.getElementById('explorer-raw').setAttribute('href', s.url);
    info.textContent = 'Loading ' + s.url + ' ...'; list.textContent = '';
    fetch(s.url).then(function (r) { return r.json(); }).then(function (doc) {
      info.textContent = '';
      info.appendChild(E('h2', { text: (doc.info && doc.info.title) || s.name }));
      if (doc.info && doc.info.description) info.appendChild(E('p', { text: doc.info.description }));
      info.appendChild(E('p', { class: 'meta', text: 'OpenAPI ' + doc.openapi + ', version ' + ((doc.info && doc.info.version) || '') + ', ' + Object.keys(doc.paths || {}).length + ' paths' }));
      Object.keys(doc.paths || {}).sort().forEach(function (p) { var op = doc.paths[p].get; if (op) list.appendChild(opView(doc, p, op)); });
    }).catch(function (e) { info.textContent = 'Could not read ' + s.url + ': ' + e; });
  }
  function opView(doc, path, op) {
    var params = (op.parameters || []).filter(function (x) { return x.in === 'path'; });
    var box = E('details', { class: 'explorer-op' });
    box.appendChild(E('summary', {}, [E('code', { class: 'verb', text: 'GET' }), ' ', E('code', { text: path }), op.summary ? ' ' : '', op.summary ? E('span', { class: 'meta', text: op.summary }) : '']));
    if (op.description) box.appendChild(E('p', { text: op.description }));
    var inputs = {};
    params.forEach(function (x) {
      var vals = (x.schema && x.schema.enum) || [], sel;
      if (vals.length) { sel = E('select', { 'aria-label': x.name }); vals.forEach(function (v) { sel.appendChild(E('option', { value: v, text: v })); }); }
      else sel = E('input', { type: 'text', 'aria-label': x.name, value: (x.example || '') });
      inputs[x.name] = sel; box.appendChild(E('p', {}, [E('label', { text: x.name + ': ' }), sel]));
    });
    var curl = E('pre', { class: 'curl' }), out = E('pre', { class: 'out', hidden: '' }), btn = E('button', { type: 'button', text: 'Try it' });
    function url() { var u = path; Object.keys(inputs).forEach(function (k) { u = u.replace('{' + k + '}', encodeURIComponent(inputs[k].value)); }); var base = (doc.servers && doc.servers[0] && doc.servers[0].url) || ''; return { rel: u, abs: base + u }; }
    function showCurl() { curl.textContent = 'curl -s ' + url().abs; }
    Object.keys(inputs).forEach(function (k) { inputs[k].addEventListener('change', showCurl); });
    showCurl();
    btn.addEventListener('click', function () {
      out.hidden = false; out.textContent = 'GET ' + url().rel + ' ...';
      fetch(url().rel).then(function (r) { return r.text().then(function (t) { var body = t; try { body = JSON.stringify(JSON.parse(t), null, 1); } catch (e) {} out.textContent = r.status + ' ' + r.statusText + ', ' + t.length + ' bytes\n\n' + (body.length > 60000 ? body.slice(0, 60000) + '\n... (cut at 60000 characters: open the address for the whole file)' : body); }); })
        .catch(function (e) { out.textContent = 'failed: ' + e; });
    });
    box.appendChild(curl); box.appendChild(E('p', {}, [btn, ' ', E('a', { href: '#', text: 'open the address' })]));
    box.lastChild.lastChild.addEventListener('click', function (ev) { ev.preventDefault(); location.href = url().rel; });
    box.appendChild(out);
    return box;
  }
  pick.addEventListener('change', load);
  load();
})();
