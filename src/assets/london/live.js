/* London, live (data.b@PrompTugal.dinis, 21 Nov 2026). Each panel on /london/ holds our once-a-day read; this script asks each
   source for its live figures and replaces the panel's body. Every value is set as text (textContent), never as HTML. If a
   source does not answer, the panel keeps our read and says so. Code Apache-2.0. */
(function () {
  'use strict';
  var T = 15000;
  // the browser keeps each live answer for 10 minutes (Dinis, 21 Nov 2026: "keeping it on the browser local storage for a bit"):
  // a reload within that time shows the kept copy at once and does not ask the source again. Answers are cut down to the fields
  // this page uses before they are kept, so they fit. Kept in this browser only (localStorage pt.live.*); nothing is sent anywhere.
  var TTL = 10 * 60 * 1000, force = false;
  function kept(url) { try { var v = JSON.parse(localStorage.getItem('pt.live.' + url) || 'null'); return v && typeof v.at === 'number' && v.data != null ? v : null; } catch (e) { return null; } }
  function keep(url, data) { try { localStorage.setItem('pt.live.' + url, JSON.stringify({ at: Date.now(), data: data })); } catch (e) { /* full or blocked: the page still works */ } }
  function get(url, sec, reduce) {
    var k = kept(url);
    if (k && !force && Date.now() - k.at < TTL) { if (sec) sec._from = { cached: true, at: k.at }; return Promise.resolve(k.data); }
    var c = typeof AbortController === 'function' ? new AbortController() : null;
    var t = c ? setTimeout(function () { c.abort(); }, T) : null;
    return fetch(url, { headers: { accept: 'application/json' }, signal: c ? c.signal : undefined, credentials: 'omit', referrerPolicy: 'no-referrer' })
      .then(function (r) { if (t) clearTimeout(t); if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { var d = reduce ? reduce(j) : j; keep(url, d); if (sec) sec._from = { cached: false, at: Date.now() }; return d; },
        function (e) { if (k) { if (sec) sec._from = { cached: true, at: k.at, stale: true }; return k.data; } throw e; });
  }
  function pick(o, keys) { var r = {}; keys.forEach(function (k) { if (o && o[k] != null) r[k] = o[k]; }); return r; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = String(text); return e; }
  function hhmm(d) { return d.toISOString().slice(11, 16) + ' UTC'; }
  function when(sec, ok, note) {
    var w = sec.querySelector('[data-when]'); if (!w) return;
    var f = sec._from || { cached: false, at: Date.now() };
    w.textContent = ok ? (f.cached ? (f.stale ? 'The source did not answer, so this shows the copy your browser kept from ' : 'From the copy your browser kept from the source at ') + hhmm(new Date(f.at)) + (f.stale ? '' : ' (kept for 10 minutes)') : 'Live from the source at ' + hhmm(new Date(f.at))) + (note ? ' (' + note + ')' : '') + '. Our once-a-day read is the archive.'
                       : 'The source did not answer (' + note + '), so this panel shows our read: ' + w.textContent.replace(/^From our read at /, '').replace(/ \(the archive\).*$/, '') + '.';
    w.classList.remove('is-live', 'is-archive', 'is-kept'); w.classList.add(ok ? (f.cached ? 'is-kept' : 'is-live') : 'is-archive');
  }
  function sev(s) { return s === 10 ? 'good' : s >= 9 ? 'minor' : s >= 6 ? 'severe' : 'closed'; }
  function table(head, rows) {
    var wrap = el('div', 'scroll'), t = el('table'), th = el('thead'), tr = el('tr');
    head.forEach(function (x) { var c = el('th', null, x); c.scope = 'col'; tr.appendChild(c); }); th.appendChild(tr); t.appendChild(th);
    var tb = el('tbody'); rows.forEach(function (r) { tb.appendChild(r); }); t.appendChild(tb); wrap.appendChild(t); return wrap;
  }
  function replace(sec, node) { var b = sec.querySelector('[data-body]'); if (!b) return; while (b.firstChild) b.removeChild(b.firstChild); b.appendChild(node); }

  var run = {
    'tfl-status': function (sec) {
      return get('https://api.tfl.gov.uk/Line/Mode/tube,overground,elizabeth-line,dlr,tram/Status', sec, function (j) { return Array.isArray(j) ? j.map(function (l) { return { name: l.name, modeName: l.modeName, lineStatuses: (l.lineStatuses || []).map(function (x) { return pick(x, ['statusSeverity', 'statusSeverityDescription', 'reason']); }) }; }) : j; }).then(function (j) {
        if (!Array.isArray(j)) throw new Error('unexpected answer');
        j.sort(function (a, b) { return String(a.modeName).localeCompare(String(b.modeName)) || String(a.name).localeCompare(String(b.name)); });
        var rows = j.map(function (l) {
          var s = (l.lineStatuses || [])[0] || {}, tr = el('tr'), n = el('th', null, l.name); n.scope = 'row'; tr.appendChild(n); tr.appendChild(el('td', null, l.modeName));
          var td = el('td'); td.appendChild(el('span', 'ls ls-' + sev(+s.statusSeverity), (l.lineStatuses || []).map(function (x) { return x.statusSeverityDescription; }).join(', '))); tr.appendChild(td);
          tr.appendChild(el('td', null, s.reason || '')); return tr;
        });
        replace(sec, table(['Line', 'Mode', 'Status', 'TfL’s reason'], rows));
        var good = j.filter(function (l) { return (l.lineStatuses || []).every(function (x) { return +x.statusSeverity === 10; }); }).length;
        return good + ' of ' + j.length + ' lines with good service';
      });
    },
    'tfl-bikepoint': function (sec) {
      return get('https://api.tfl.gov.uk/BikePoint', sec, function (j) { var K = ['NbBikes', 'NbEBikes', 'NbEmptyDocks', 'Installed', 'Locked']; return Array.isArray(j) ? j.map(function (d) { return { additionalProperties: (d.additionalProperties || []).filter(function (x) { return K.indexOf(x.key) >= 0; }).map(function (x) { return { key: x.key, value: x.value }; }) }; }) : j; }).then(function (j) {
        if (!Array.isArray(j)) throw new Error('unexpected answer');
        var n = { bikes: 0, ebikes: 0, empty: 0, live: 0 };
        j.forEach(function (d) { var p = {}; (d.additionalProperties || []).forEach(function (x) { p[x.key] = x.value; });
          n.bikes += +p.NbBikes || 0; n.ebikes += +p.NbEBikes || 0; n.empty += +p.NbEmptyDocks || 0; if (p.Installed === 'true' && p.Locked !== 'true') n.live++; });
        var ul = el('ul', 'ldn-figs');
        [[n.bikes, ' bikes docked'], [n.ebikes, ' of them e-bikes'], [n.empty, ' empty docks'], [n.live, ' of ' + j.length + ' docks in service']].forEach(function (x) { var li = el('li'); li.appendChild(el('b', null, x[0])); li.appendChild(document.createTextNode(x[1])); ul.appendChild(li); });
        replace(sec, ul); return j.length + ' docks';
      });
    },
    'tfl-road-disruptions': function (sec) {
      return get('https://api.tfl.gov.uk/Road/all/Disruption', sec, function (j) { return Array.isArray(j) ? j.map(function (d) { return pick(d, ['severity', 'lastModifiedTime', 'location', 'comments']); }) : j; }).then(function (j) {
        if (!Array.isArray(j)) throw new Error('unexpected answer');
        var by = {}; j.forEach(function (d) { by[d.severity || 'unknown'] = (by[d.severity || 'unknown'] || 0) + 1; });
        var box = el('div'), p = el('p'); p.appendChild(el('b', null, j.length)); p.appendChild(document.createTextNode(' listed: ' + Object.keys(by).map(function (k) { return by[k] + ' ' + k.toLowerCase(); }).join(', ') + '.')); box.appendChild(p);
        var ul = el('ul', 'ldn-roads');
        j.filter(function (d) { return d.severity && !/^(Minimal|No impact)$/.test(d.severity); }).sort(function (a, b) { return String(b.lastModifiedTime).localeCompare(String(a.lastModifiedTime)); }).slice(0, 12)
          .forEach(function (d) { var li = el('li'); li.appendChild(el('span', 'ls ls-minor', d.severity)); li.appendChild(document.createTextNode(' ' + (d.location || '') + ': ' + (d.comments || ''))); ul.appendChild(li); });
        box.appendChild(ul); replace(sec, box); return j.length + ' listed';
      });
    },
    'carbon-intensity-london': function (sec) {
      return get('https://api.carbonintensity.org.uk/regional/regionid/13', sec).then(function (j) {
        var r = j && j.data && j.data[0], d = r && r.data && r.data[0]; if (!d || r.regionid !== 13) throw new Error('unexpected answer');
        var box = el('div'), p = el('p', 'ldn-big'); p.appendChild(el('b', null, d.intensity.forecast)); p.appendChild(document.createTextNode(' gCO₂/kWh, '));
        p.appendChild(el('span', 'ci ci-' + String(d.intensity.index).replace(/\s+/g, '-'), d.intensity.index)); p.appendChild(document.createTextNode(' (' + d.from + ' to ' + d.to + ')')); box.appendChild(p);
        box.appendChild(el('p', null, 'Generation mix: ' + (d.generationmix || []).filter(function (m) { return m.perc > 0; }).sort(function (a, b) { return b.perc - a.perc; }).map(function (m) { return m.fuel + ' ' + m.perc + '%'; }).join(', ') + '.'));
        var old = sec.querySelector('.ldn-spark'); if (old) { box.appendChild(el('p', null, 'The forecast from our read:')); box.appendChild(old.cloneNode(true)); }
        replace(sec, box); return 'the half hour ' + d.from.slice(11, 16) + ' to ' + d.to.slice(11, 16) + ' UTC';
      });
    },
    'ea-thames-tide': function (sec) {
      var rows = sec.querySelectorAll('tr[data-gauge]'), ok = 0;
      return Promise.all(Array.prototype.map.call(rows, function (tr) {
        var id = tr.getAttribute('data-gauge'); if (!/^[0-9A-Za-z_]{1,20}$/.test(id)) return null;
        return get('https://environment.data.gov.uk/flood-monitoring/id/stations/' + id + '/readings?_sorted&_limit=1', sec, function (j) { return { items: (j.items || []).slice(0, 1).map(function (r) { return pick(r, ['value', 'dateTime']); }) }; }).then(function (j) {
          var r = j && j.items && j.items[0]; if (!r) return;
          tr.querySelector('[data-v]').textContent = String(r.value); tr.querySelector('[data-t]').textContent = String(r.dateTime).slice(11, 16) + ' UTC'; ok++;
        }).catch(function () {});
      })).then(function () { if (!ok) throw new Error('no gauge answered'); return ok + ' of ' + rows.length + ' gauges'; });
    }
  };
  function addRefresh() {
    var first = document.querySelector('section[data-live]'); if (!first || document.getElementById('ldn-refresh')) return;
    var p = el('p', 'ldn-refresh'), b = el('button', null, 'Refresh now'); b.type = 'button'; b.id = 'ldn-refresh';
    b.addEventListener('click', function () { force = true; start(); force = false; });
    p.appendChild(b); p.appendChild(document.createTextNode(' Your browser keeps each live answer for 10 minutes; this asks the sources again.'));
    first.parentNode.insertBefore(p, first);
  }
  function start() {
    Array.prototype.forEach.call(document.querySelectorAll('section[data-live]'), function (sec) {
      var f = run[sec.getAttribute('data-live')]; if (!f) return;
      f(sec).then(function (note) { when(sec, true, note); }, function (e) { when(sec, false, (e && e.name === 'AbortError') ? 'no answer in 15 s' : String(e && e.message || e)); });
    });
  }
  function boot() { addRefresh(); start(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot); else boot();
})();
