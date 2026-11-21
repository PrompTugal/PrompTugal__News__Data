/* Explore the streaming lists in the browser: filters, charts, a pivot table and SQL (Dinis, 21 Nov 2026). data.b@PrompTugal.dinis.
   The rows come from the page itself (<script type="application/json" id="st-data">): under TMDB's terms they are not offered as a
   separate file. SQL runs in this browser with sql.js 1.15.2 (SQLite in WebAssembly, MIT), loaded from this site only when first
   used. Every value is set as text (textContent), never as HTML. Code Apache-2.0. */
(function () {
  'use strict';
  var src = document.getElementById('st-data'), root = document.getElementById('st-explore');
  if (!src || !root) return;
  var ROWS; try { ROWS = JSON.parse(src.textContent).rows || []; } catch (e) { return; }
  var SERV_COL = { 'Netflix': '#d1242f', 'Disney+': '#0b5cad', 'Prime Video': '#00a8e1', 'Apple TV+': '#555' };
  var COUNTRY = { GB: 'United Kingdom', PT: 'Portugal' };

  function el(tag, attrs, text) { var e = document.createElement(tag); if (attrs) Object.keys(attrs).forEach(function (k) { if (k === 'class') e.className = attrs[k]; else e.setAttribute(k, attrs[k]); }); if (text != null) e.textContent = String(text); return e; }
  function svgEl(tag, attrs, text) { var e = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.keys(attrs || {}).forEach(function (k) { e.setAttribute(k, attrs[k]); }); if (text != null) e.textContent = String(text); return e; }
  function uniq(a) { return a.filter(function (x, i) { return x != null && x !== '' && a.indexOf(x) === i; }); }
  function select(label, options) {
    var w = el('label', { class: 'st-f' }); w.appendChild(el('span', null, label)); var s = el('select');
    options.forEach(function (o) { var op = el('option', { value: o[0] }, o[1]); s.appendChild(op); }); w.appendChild(s); return { wrap: w, input: s };
  }
  function input(label, type, attrs) { var w = el('label', { class: 'st-f' }); w.appendChild(el('span', null, label)); var i = el('input', Object.assign({ type: type }, attrs || {})); w.appendChild(i); return { wrap: w, input: i }; }
  function table(head, rows) {
    var wrap = el('div', { class: 'scroll' }), t = el('table'), th = el('thead'), tr = el('tr');
    head.forEach(function (h) { tr.appendChild(el('th', { scope: 'col' }, h)); }); th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody'); rows.forEach(function (r) { var row = el('tr'); r.forEach(function (c) { row.appendChild(el('td', null, c == null ? '' : c)); }); tb.appendChild(row); });
    t.appendChild(tb); wrap.appendChild(t); return wrap;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); }
  function section(title, note) { var s = el('section', { class: 'st-sec' }); s.appendChild(el('h3', null, title)); if (note) s.appendChild(el('p', { class: 'small' }, note)); root.appendChild(s); return s; }

  // ---- filters ----
  var genres = uniq([].concat.apply([], ROWS.map(function (r) { return r.genres; }))).sort();
  var fs = section('Filter', ROWS.length + ' list entries: each title as it appears in each country, service and list.');
  var bar = el('div', { class: 'st-bar' });
  var fCountry = select('Country', [['', 'All'], ['GB', 'United Kingdom'], ['PT', 'Portugal']]);
  var fService = select('Service', [['', 'All']].concat(Object.keys(SERV_COL).map(function (s) { return [s, s]; })));
  var fType = select('Type', [['', 'All'], ['film', 'Films'], ['series', 'Series']]);
  var fGenre = select('Genre', [['', 'All']].concat(genres.map(function (g) { return [g, g]; })));
  var fRating = input('Min rating', 'number', { min: '0', max: '10', step: '0.5', value: '0' });
  var fYear = input('From year', 'number', { min: '1900', max: '2100', step: '1', value: '' });
  var fText = input('Search title, cast, director', 'search', { placeholder: 'e.g. Pedro Pascal' });
  [fCountry, fService, fType, fGenre, fRating, fYear, fText].forEach(function (f) { bar.appendChild(f.wrap); f.input.addEventListener('input', update); });
  fs.appendChild(bar);
  var count = el('p', { class: 'st-count' }); fs.appendChild(count);
  var results = el('div'); fs.appendChild(results);
  function filtered() {
    var c = fCountry.input.value, s = fService.input.value, t = fType.input.value, g = fGenre.input.value, mr = +fRating.input.value || 0, y = +fYear.input.value || 0, q = fText.input.value.trim().toLowerCase();
    return ROWS.filter(function (r) {
      return (!c || r.country === c) && (!s || r.service === s) && (!t || r.type === t) && (!g || r.genres.indexOf(g) >= 0) && (r.rating || 0) >= mr && (!y || (r.year || 0) >= y)
        && (!q || [r.title, r.original].concat(r.cast, r.makers).join(' ').toLowerCase().indexOf(q) >= 0);
    });
  }
  var sortKey = 'rating', sortDir = -1;
  function renderResults(rows) {
    clear(results);
    var cols = [['title', 'Title'], ['year', 'Year'], ['country', 'Country'], ['service', 'Service'], ['type', 'Type'], ['rank', 'Rank'], ['rating', 'Rating'], ['votes', 'Votes'], ['length', 'Runtime or seasons'], ['genres', 'Genres']];
    var sorted = rows.slice().sort(function (a, b) { var x = a[sortKey], y = b[sortKey]; if (Array.isArray(x)) x = x.join(); if (Array.isArray(y)) y = y.join(); return (x > y ? 1 : x < y ? -1 : 0) * sortDir; });
    var wrap = el('div', { class: 'scroll st-results' }), t = el('table'), th = el('thead'), tr = el('tr');
    cols.forEach(function (c) { var h = el('th', { scope: 'col' }); var b = el('button', { type: 'button', class: 'st-sort' }, c[1] + (sortKey === c[0] ? (sortDir > 0 ? ' ↑' : ' ↓') : '')); b.addEventListener('click', function () { if (sortKey === c[0]) sortDir = -sortDir; else { sortKey = c[0]; sortDir = c[0] === 'title' ? 1 : -1; } renderResults(rows); }); h.appendChild(b); tr.appendChild(h); });
    th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody');
    sorted.slice(0, 400).forEach(function (r) {
      var row = el('tr'), td = el('td'), a = el('a', { href: 'https://www.themoviedb.org/' + (r.type === 'film' ? 'movie' : 'tv') + '/' + encodeURIComponent(r.id) }, r.title || '(title not shown)'); td.appendChild(a); row.appendChild(td);
      [r.year, r.country, r.service, r.type, r.rank, r.rating, r.votes, r.type === 'film' ? (r.runtime ? r.runtime + ' min' : '') : (r.seasons ? r.seasons + ' seasons' : ''), r.genres.join(', ')].forEach(function (v) { row.appendChild(el('td', null, v == null ? '' : v)); });
      tb.appendChild(row);
    });
    t.appendChild(tb); wrap.appendChild(t); results.appendChild(wrap);
  }

  // ---- charts ----
  var cs = section('Charts', 'Drawn from the filtered rows above.');
  var charts = el('div', { class: 'st-charts' }); cs.appendChild(charts);
  function barChart(title, pairs, fmt, colour) {
    var box = el('figure', { class: 'st-chart' }); box.appendChild(el('figcaption', null, title));
    if (!pairs.length) { box.appendChild(el('p', { class: 'small' }, 'No rows.')); return box; }
    var W = 460, rowH = 20, H = pairs.length * rowH + 8, L = 130, max = Math.max.apply(null, pairs.map(function (p) { return p[1]; })) || 1;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': title, class: 'st-svg' });
    pairs.forEach(function (p, i) {
      var y = 4 + i * rowH, w = Math.max(1, (W - L - 50) * p[1] / max);
      svg.appendChild(svgEl('text', { x: L - 6, y: y + 13, 'text-anchor': 'end', class: 'st-lab' }, p[0]));
      svg.appendChild(svgEl('rect', { x: L, y: y + 2, width: w.toFixed(1), height: rowH - 6, rx: 2, fill: colour ? colour(p[0]) : 'currentColor', 'fill-opacity': colour ? 1 : 0.7 }));
      svg.appendChild(svgEl('text', { x: L + w + 4, y: y + 13, class: 'st-val' }, fmt(p[1])));
    });
    box.appendChild(svg); return box;
  }
  function scatter(rows) {
    var box = el('figure', { class: 'st-chart st-wide' }); box.appendChild(el('figcaption', null, 'Rating by year of release (each dot a list entry; colour by service)'));
    var pts = rows.filter(function (r) { return r.year && r.votes; }); if (!pts.length) { box.appendChild(el('p', { class: 'small' }, 'No rows.')); return box; }
    var W = 940, H = 260, L = 36, B = 24, y0 = Math.min.apply(null, pts.map(function (r) { return r.year; })), y1 = Math.max.apply(null, pts.map(function (r) { return r.year; }));
    if (y1 === y0) y1 = y0 + 1;
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Rating by year', class: 'st-svg' });
    for (var g = 0; g <= 10; g += 2) { var yy = H - B - (H - B - 8) * g / 10; svg.appendChild(svgEl('line', { x1: L, x2: W - 4, y1: yy, y2: yy, class: 'st-grid' })); svg.appendChild(svgEl('text', { x: L - 6, y: yy + 4, 'text-anchor': 'end', class: 'st-lab' }, g)); }
    [y0, Math.round((y0 + y1) / 2), y1].forEach(function (yr) { svg.appendChild(svgEl('text', { x: L + (W - L - 10) * (yr - y0) / (y1 - y0), y: H - 6, 'text-anchor': 'middle', class: 'st-lab' }, yr)); });
    pts.forEach(function (r) { var c = svgEl('circle', { cx: (L + (W - L - 10) * (r.year - y0) / (y1 - y0)).toFixed(1), cy: (H - B - (H - B - 8) * (r.rating || 0) / 10).toFixed(1), r: 3.2, fill: SERV_COL[r.service] || '#888', 'fill-opacity': 0.75 }); c.appendChild(svgEl('title', {}, (r.title || '') + ' (' + r.year + '), ' + r.service + ' ' + r.country + ': ' + r.rating)); svg.appendChild(c); });
    box.appendChild(svg);
    var leg = el('p', { class: 'small st-legend' }); Object.keys(SERV_COL).forEach(function (s) { var k = el('span', { class: 'st-key' }); k.style.background = SERV_COL[s]; leg.appendChild(k); leg.appendChild(document.createTextNode(' ' + s + '  ')); }); box.appendChild(leg);
    return box;
  }
  function renderCharts(rows) {
    clear(charts);
    var byGenre = {}; rows.forEach(function (r) { r.genres.forEach(function (g) { byGenre[g] = (byGenre[g] || 0) + 1; }); });
    charts.appendChild(barChart('List entries by genre', Object.keys(byGenre).map(function (g) { return [g, byGenre[g]]; }).sort(function (a, b) { return b[1] - a[1]; }).slice(0, 12), function (v) { return v; }));
    var bs = {}; rows.forEach(function (r) { if (!r.votes) return; var k = r.service; (bs[k] = bs[k] || []).push(r.rating); });
    charts.appendChild(barChart('Average TMDB rating by service', Object.keys(bs).map(function (k) { return [k, bs[k].reduce(function (a, b) { return a + b; }, 0) / bs[k].length]; }).sort(function (a, b) { return b[1] - a[1]; }), function (v) { return v.toFixed(2); }, function (k) { return SERV_COL[k]; }));
    charts.appendChild(scatter(rows));
  }

  // ---- pivot ----
  var DIMS = [['service', 'Service'], ['country', 'Country'], ['type', 'Type'], ['genre', 'Genre'], ['decade', 'Decade'], ['language', 'Original language'], ['age_rating', 'Age rating']];
  var ps = section('Pivot table', 'Rows by columns, from the filtered rows. A title with several genres counts once in each of its genres.');
  var pbar = el('div', { class: 'st-bar' });
  var pRow = select('Rows', DIMS), pCol = select('Columns', DIMS), pVal = select('Value', [['count', 'Count'], ['rating', 'Average rating'], ['runtime', 'Average runtime (films, min)'], ['votes', 'Total votes']]);
  pRow.input.value = 'genre'; pCol.input.value = 'service';
  [pRow, pCol, pVal].forEach(function (f) { pbar.appendChild(f.wrap); f.input.addEventListener('input', update); });
  ps.appendChild(pbar); var pout = el('div'); ps.appendChild(pout);
  function dimVals(r, d) { if (d === 'genre') return r.genres.length ? r.genres : ['(none)']; if (d === 'decade') return [r.year ? Math.floor(r.year / 10) * 10 + 's' : '(unknown)']; var v = r[d]; return [v == null || v === '' ? '(none)' : v]; }
  function renderPivot(rows) {
    clear(pout);
    var rd = pRow.input.value, cd = pCol.input.value, vm = pVal.input.value, cells = {}, rk = [], ck = [];
    rows.forEach(function (r) { dimVals(r, rd).forEach(function (a) { dimVals(r, cd).forEach(function (b) {
      if (rk.indexOf(a) < 0) rk.push(a); if (ck.indexOf(b) < 0) ck.push(b);
      var k = a + '\u0001' + b, c = cells[k] = cells[k] || { n: 0, s: 0, m: 0 }; c.n++;
      var v = vm === 'rating' ? (r.votes ? r.rating : null) : vm === 'runtime' ? (r.type === 'film' ? r.runtime : null) : vm === 'votes' ? r.votes : null;
      if (v != null) { c.s += v; c.m++; } }); }); });
    rk.sort(); ck.sort();
    var fmt = function (c) { if (!c) return ''; if (vm === 'count') return c.n; if (vm === 'votes') return c.s; return c.m ? (c.s / c.m).toFixed(vm === 'rating' ? 2 : 0) : ''; };
    pout.appendChild(table([DIMS.find(function (d) { return d[0] === rd; })[1]].concat(ck), rk.map(function (a) { return [a].concat(ck.map(function (b) { return fmt(cells[a + '\u0001' + b]); })); })));
  }

  // ---- people: who appears with whom (Dinis, 21 Nov 2026: directors and actors) ----
  var pps = section('People', 'Actors (top five billed) and directors or creators in at least two of the titles matching the filters. A line joins two people who share a title. Dot size is the number of titles; colour is the service they appear on most. Click a person to list their titles.');
  var pinfo = el('div', { class: 'st-pinfo' }), pnet = el('div', { class: 'st-net' }), ptab = el('div');
  pps.appendChild(pnet); pps.appendChild(pinfo); pps.appendChild(el('h4', null, 'On the most titles')); pps.appendChild(ptab);
  function people(rows) {
    var byTitle = {}, P = {};
    rows.forEach(function (r) { var k = r.type + ':' + r.id; var t = byTitle[k] = byTitle[k] || { key: k, title: r.title, year: r.year, type: r.type, id: r.id, people: {}, services: {} };
      t.services[r.service] = 1; r.cast.forEach(function (n) { t.people[n] = t.people[n] || 'cast'; }); r.makers.forEach(function (n) { t.people[n] = r.type === 'film' ? 'director' : 'creator'; }); });
    Object.keys(byTitle).forEach(function (k) { var t = byTitle[k]; Object.keys(t.people).forEach(function (n) {
      var p = P[n] = P[n] || { name: n, titles: [], roles: {}, services: {} }; p.titles.push(t); p.roles[t.people[n]] = 1; Object.keys(t.services).forEach(function (s) { p.services[s] = (p.services[s] || 0) + 1; }); }); });
    return { titles: byTitle, people: Object.keys(P).map(function (n) { return P[n]; }) };
  }
  function topService(p) { return Object.keys(p.services).sort(function (a, b) { return p.services[b] - p.services[a]; })[0]; }
  function showPerson(p) {
    clear(pinfo);
    pinfo.appendChild(el('p', null, p.name + ' (' + Object.keys(p.roles).join(', ') + '): ' + p.titles.length + ' titles.'));
    var ul = el('ul'); p.titles.slice().sort(function (a, b) { return (b.year || 0) - (a.year || 0); }).forEach(function (t) { var li = el('li'); li.appendChild(el('a', { href: 'https://www.themoviedb.org/' + (t.type === 'film' ? 'movie' : 'tv') + '/' + encodeURIComponent(t.id) }, t.title || '(title not shown)')); li.appendChild(document.createTextNode(' (' + (t.year || '?') + ', ' + t.type + '; ' + Object.keys(t.services).join(', ') + ')')); ul.appendChild(li); });
    pinfo.appendChild(ul);
  }
  function renderPeople(rows) {
    clear(pnet); clear(pinfo); clear(ptab);
    var d = people(rows), nodes = d.people.filter(function (p) { return p.titles.length >= 2; }).sort(function (a, b) { return b.titles.length - a.titles.length; }).slice(0, 120);
    ptab.appendChild(table(['Person', 'Role', 'Titles', 'Services'], d.people.sort(function (a, b) { return b.titles.length - a.titles.length || a.name.localeCompare(b.name); }).slice(0, 15).map(function (p) { return [p.name, Object.keys(p.roles).join(', '), p.titles.length, Object.keys(p.services).join(', ')]; })));
    if (nodes.length < 2) { pnet.appendChild(el('p', { class: 'small' }, 'Fewer than two people appear in two or more of the matching titles.')); return; }
    var idx = {}; nodes.forEach(function (n, i) { idx[n.name] = i; });
    var links = [], seen = {};
    Object.keys(d.titles).forEach(function (k) { var ps = Object.keys(d.titles[k].people).filter(function (n) { return n in idx; });
      for (var i = 0; i < ps.length; i++) for (var j = i + 1; j < ps.length; j++) { var a = idx[ps[i]], b = idx[ps[j]], key = Math.min(a, b) + '-' + Math.max(a, b); if (seen[key]) seen[key].w++; else { seen[key] = { a: a, b: b, w: 1 }; links.push(seen[key]); } } });
    // a small force layout: repulsion between all nodes, springs along links, a pull to the centre (deterministic start on a circle)
    var W = 940, H = 560, N = nodes.length;
    nodes.forEach(function (n, i) { var t = 2 * Math.PI * i / N; n.x = W / 2 + Math.cos(t) * 200; n.y = H / 2 + Math.sin(t) * 200; n.vx = 0; n.vy = 0; n.r = 3 + Math.sqrt(n.titles.length) * 2.5; });
    for (var it = 0; it < 300; it++) {
      var alpha = 1 - it / 300;
      for (var i = 0; i < N; i++) for (var j = i + 1; j < N; j++) { var a = nodes[i], b = nodes[j], dx = b.x - a.x, dy = b.y - a.y, d2 = dx * dx + dy * dy + 0.01, f = 900 / d2 * alpha, dd = Math.sqrt(d2); a.vx -= f * dx / dd; a.vy -= f * dy / dd; b.vx += f * dx / dd; b.vy += f * dy / dd; }
      links.forEach(function (l) { var a = nodes[l.a], b = nodes[l.b], dx = b.x - a.x, dy = b.y - a.y, dd = Math.sqrt(dx * dx + dy * dy) || 1, f = (dd - 60) * 0.02 * alpha; a.vx += f * dx / dd; a.vy += f * dy / dd; b.vx -= f * dx / dd; b.vy -= f * dy / dd; });
      nodes.forEach(function (n) { n.vx += (W / 2 - n.x) * 0.004 * alpha; n.vy += (H / 2 - n.y) * 0.006 * alpha; n.x += Math.max(-10, Math.min(10, n.vx)); n.y += Math.max(-10, Math.min(10, n.vy)); n.vx *= 0.6; n.vy *= 0.6; n.x = Math.max(n.r + 2, Math.min(W - n.r - 2, n.x)); n.y = Math.max(n.r + 2, Math.min(H - n.r - 2, n.y)); });
    }
    var svg = svgEl('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img', 'aria-label': 'Network of people who share titles', class: 'st-svg st-netsvg' });
    links.forEach(function (l) { svg.appendChild(svgEl('line', { x1: nodes[l.a].x.toFixed(1), y1: nodes[l.a].y.toFixed(1), x2: nodes[l.b].x.toFixed(1), y2: nodes[l.b].y.toFixed(1), class: 'st-link', 'stroke-width': Math.min(4, l.w) })); });
    nodes.forEach(function (n, i) {
      var g = svgEl('g', { class: 'st-node', tabindex: '0', role: 'button', 'aria-label': n.name + ', ' + n.titles.length + ' titles' });
      g.appendChild(svgEl('circle', { cx: n.x.toFixed(1), cy: n.y.toFixed(1), r: n.r.toFixed(1), fill: SERV_COL[topService(n)] || '#888' }));
      if (i < 25) g.appendChild(svgEl('text', { x: (n.x + n.r + 2).toFixed(1), y: (n.y + 4).toFixed(1), class: 'st-lab' }, n.name));
      g.appendChild(svgEl('title', {}, n.name + ': ' + n.titles.length + ' titles'));
      g.addEventListener('click', function () { showPerson(n); }); g.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); showPerson(n); } });
      svg.appendChild(g);
    });
    pnet.appendChild(svg);
    pnet.appendChild(el('p', { class: 'small' }, nodes.length + ' people, ' + links.length + ' links' + (d.people.filter(function (p) { return p.titles.length >= 2; }).length > nodes.length ? ' (the 120 with the most titles)' : '') + '. Names shown for the 25 with the most titles; hover or click any dot.'));
  }

  // ---- SQL ----
  var ss = section('SQL', 'SQLite, running in this browser (sql.js). Tables: titles (one row per list entry) and title_genres (country, service, type, tmdb_id, genre). Only SELECT is useful here; nothing leaves the page.');
  var EX = [
    ['Highest rated with 1,000+ votes', "SELECT title, year, service, country, rating, votes FROM titles WHERE votes >= 1000 ORDER BY rating DESC LIMIT 20;"],
    ['On the most services', "SELECT title, year, COUNT(DISTINCT service || country) AS lists, GROUP_CONCAT(DISTINCT service) AS services FROM titles GROUP BY tmdb_id, type ORDER BY lists DESC, title LIMIT 20;"],
    ['UK and Portugal compared', "SELECT service, type, ROUND(AVG(CASE WHEN country='GB' THEN rating END),2) AS uk_avg, ROUND(AVG(CASE WHEN country='PT' THEN rating END),2) AS pt_avg FROM titles GROUP BY service, type ORDER BY service, type;"],
    ['Genres per service', "SELECT service, genre, COUNT(*) AS n FROM title_genres GROUP BY service, genre ORDER BY service, n DESC;"],
  ];
  var sbar = el('div', { class: 'st-bar' }); EX.forEach(function (e) { var b = el('button', { type: 'button', class: 'st-btn' }, e[0]); b.addEventListener('click', function () { ta.value = e[1]; run(); }); sbar.appendChild(b); });
  ss.appendChild(sbar);
  var ta = el('textarea', { rows: '5', class: 'st-sql', spellcheck: 'false', 'aria-label': 'SQL query' }); ta.value = EX[0][1]; ss.appendChild(ta);
  var runBtn = el('button', { type: 'button', class: 'st-btn st-run' }, 'Run'); ss.appendChild(runBtn);
  var sout = el('div', { class: 'st-sqlout' }); ss.appendChild(sout);
  var dbp = null;
  function loadDb() {
    if (dbp) return dbp;
    dbp = new Promise(function (ok, bad) {
      var s = document.createElement('script'); s.src = '/assets/vendor/sql.js/1.15.2/sql-wasm.js'; s.onerror = function () { bad(new Error('sql.js did not load')); };
      s.onload = function () {
        window.initSqlJs({ locateFile: function (f) { return '/assets/vendor/sql.js/1.15.2/' + f; } }).then(function (SQL) {
          var db = new SQL.Database();
          db.run('CREATE TABLE titles (country TEXT, service TEXT, type TEXT, rank INTEGER, tmdb_id INTEGER, title TEXT, original TEXT, year INTEGER, rating REAL, votes INTEGER, runtime INTEGER, seasons INTEGER, episodes INTEGER, age_rating TEXT, language TEXT, directors_or_creators TEXT, "cast" TEXT, genres TEXT); CREATE TABLE title_genres (country TEXT, service TEXT, type TEXT, tmdb_id INTEGER, genre TEXT);');
          var st = db.prepare('INSERT INTO titles VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)'), sg = db.prepare('INSERT INTO title_genres VALUES (?,?,?,?,?)');
          ROWS.forEach(function (r) { st.run([r.country, r.service, r.type, r.rank, r.id, r.title, r.original, r.year, r.rating, r.votes, r.runtime, r.seasons, r.episodes, r.age_rating, r.language, r.makers.join(', '), r.cast.join(', '), r.genres.join(', ')]); r.genres.forEach(function (g) { sg.run([r.country, r.service, r.type, r.id, g]); }); });
          st.free(); sg.free(); ok(db);
        }, bad);
      };
      document.head.appendChild(s);
    });
    return dbp;
  }
  function run() {
    clear(sout); sout.appendChild(el('p', { class: 'small' }, 'Running...'));
    loadDb().then(function (db) {
      clear(sout);
      var t0 = performance.now(), res;
      try { res = db.exec(ta.value); } catch (e) { sout.appendChild(el('p', { class: 'st-err' }, String(e.message || e))); return; }
      if (!res.length) { sout.appendChild(el('p', { class: 'small' }, 'No rows.')); return; }
      var r = res[res.length - 1];
      sout.appendChild(el('p', { class: 'small' }, r.values.length + ' row(s) in ' + Math.round(performance.now() - t0) + ' ms' + (r.values.length > 500 ? ', first 500 shown' : '') + '.'));
      sout.appendChild(table(r.columns, r.values.slice(0, 500)));
    }, function (e) { clear(sout); sout.appendChild(el('p', { class: 'st-err' }, String(e.message || e))); });
  }
  runBtn.addEventListener('click', run);
  ta.addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') run(); });

  function update() { var rows = filtered(); count.textContent = rows.length + ' of ' + ROWS.length + ' list entries match.'; renderResults(rows); renderCharts(rows); renderPivot(rows); renderPeople(rows); }
  update();
})();
