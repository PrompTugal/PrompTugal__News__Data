/* Shared reader for the three variations: fetches the built site's JSON at run time, relative to the page. */
(function () {
  'use strict';
  var API = '../../api/v1/';
  var HOST = 'https://data.promptugal.news/api/v1/';
  var FALLBACK = [
    ['ipma-warnings', 'IPMA weather warnings'], ['ipma-observations', 'IPMA station observations'],
    ['ipma-city-forecasts', 'IPMA daily forecasts by place'], ['ipma-fire-risk', 'IPMA fire risk'],
    ['ipma-uv', 'IPMA UV index'], ['ipma-sea', 'IPMA sea forecast'],
    ['adsb-faro', 'Flights around Faro airport'], ['meteoalarm-pt', 'MeteoAlarm CAP feed for Portugal'],
    ['storm-charles-archive', 'Storm Charles archive']
  ];
  function el(tag, attrs, kids) {
    var e = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]);
    });
    (kids || []).forEach(function (c) { e.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return e;
  }
  function getJSON(url) {
    return fetch(url, { cache: 'no-cache' }).then(function (r) {
      if (!r.ok) throw new Error(String(r.status));
      return r.json();
    });
  }
  function fmtTime(iso) {
    if (!iso) return 'not read yet';
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC';
  }
  function ageMinutes(iso) { var d = new Date(iso); return isNaN(d) ? null : Math.round((Date.now() - d) / 60000); }
  function status(iso, cadence) {
    if (!iso) return { cls: 's-none', text: 'not read yet' };
    var m = ageMinutes(iso);
    var limit = /daily/.test(cadence || '') ? 1560 : 150;
    if (m !== null && m > limit) return { cls: 's-late', text: 'late' };
    return { cls: 's-ok', text: 'ok' };
  }
  /* The headline count for each source: [label, value]. */
  function headline(id, d) {
    var c = (d && d.counts) || {};
    var map = {
      'ipma-warnings': ['active warnings', c.active],
      'ipma-observations': ['stations reporting', c.reporting],
      'ipma-city-forecasts': ['places', c.places],
      'ipma-fire-risk': ['municipalities', c.municipalities],
      'ipma-uv': ['places', c.places],
      'ipma-sea': ['places', c.places],
      'adsb-faro': ['airline flights', c.airline],
      'meteoalarm-pt': ['messages not expired', c.not_expired]
    };
    var m = map[id];
    if (m && m[1] !== undefined) return m;
    var k = Object.keys(c).filter(function (x) { return typeof c[x] === 'number'; })[0];
    return k ? [k.replace(/_/g, ' '), c[k]] : ['', null];
  }
  /* Loads the catalogue (if built) then every source's latest.json. Resolves to an array of records. */
  function load() {
    return getJSON(API + 'index.json').then(function (c) { return { cat: c.sources || [], have: true }; },
      function () { return { cat: FALLBACK.map(function (f) { return { id: f[0], title: f[1] }; }), have: false }; })
      .then(function (r) {
        return Promise.all(r.cat.map(function (s) {
          var url = API + s.id + '/latest.json';
          return getJSON(url).then(function (d) { return { meta: s, data: d, url: url }; },
            function () { return { meta: s, data: null, url: url }; });
        })).then(function (rows) { return { rows: rows, catalogue: r.have }; });
      });
  }
  function find(rows, id) {
    for (var i = 0; i < rows.length; i++) if (rows[i].meta.id === id) return rows[i];
    return null;
  }
  /* A source link line: "Source: <page> · read <time> · JSON". Never a value without these. */
  function srcLine(row) {
    var d = row && row.data, p = d && d.provenance;
    var box = el('span', { 'class': 'src' });
    if (!d) { box.appendChild(document.createTextNode('Source: ')); box.appendChild(el('a', { href: row ? row.url : API }, ['latest.json'])); box.appendChild(document.createTextNode(' · not read yet')); return box; }
    box.appendChild(document.createTextNode('Source: '));
    box.appendChild(el('a', { href: p && p.page ? p.page : row.url }, [(p && p.source ? hostOf(p.source) : row.meta.id)]));
    box.appendChild(document.createTextNode(' · read ' + fmtTime(d.read_at) + ' · '));
    box.appendChild(el('a', { href: row.url }, ['latest.json']));
    return box;
  }
  function hostOf(u) { try { return new URL(u.replace(/[{}]/g, '')).host; } catch (e) { return u; } }
  function notice(parent, catalogue) {
    if (!catalogue) parent.appendChild(el('p', { 'class': 'notice' }, ['The catalogue (api/v1/index.json) is not built yet, so this page uses its own list of sources. Values still come from each source\'s latest.json when that exists.']));
  }
  function copy(btn, text) {
    function done() { var t = btn.textContent; btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = t; }, 1500); }
    try { navigator.clipboard.writeText(text).then(done, function () { btn.textContent = 'Select and copy'; }); } catch (e) { btn.textContent = 'Select and copy'; }
  }
  window.PTD = { API: API, HOST: HOST, el: el, load: load, find: find, fmtTime: fmtTime, status: status, headline: headline, srcLine: srcLine, notice: notice, copy: copy, hostOf: hostOf };
})();
