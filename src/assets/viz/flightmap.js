// The Storm Charles flight map: airline flights over the Lisbon area or Madeira with the wind on top and a time control over
// the measured frames. A port, for data.promptugal.news, of app/design/flightmap/flightmap.js in PrompTugal__News__Storm-Charles
// (Apache-2.0, commit fdac6ed; incident.designer@web-summit.dinis, rounds 65 to 75). Differences: no panel, frame or site
// framework; one compact file per area instead of one file per snapshot (made by scripts/storm-flights-map.mjs); positions are
// only the measured ones (nothing is drawn between two frames); the crosswind and departures panels are left out.
// Vanilla JS, no libraries, no outside request; colours come from the page's CSS variables (flightmap.css). Apache-2.0.
// Mount (viz.js does not know this name; this file finds it itself):
//   <figure class="viz" data-viz="storm-flightmap" data-area="lisbon|madeira" data-base="/api/v1/storm/charles/flights-map/">
//     <div class="viz-fallback">...</div></figure>
(function () {
  'use strict'
  var NS = 'http://www.w3.org/2000/svg', W = 800
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  var PLANE = 'M0 -11 L2 -3 L10 2 L10 4 L2 2 L1.5 8 L4 10 L4 11.5 L0 10.5 L-4 11.5 L-4 10 L-1.5 8 L-2 2 L-10 4 L-10 2 L-2 -3 Z'
  var AREAS = {
    lisbon: { icao: 'LPPT', name: 'the Lisbon area', place: 'Lisbon airport (LPPT)', left: ['Lisbon'],
      views: [{ label: 'Wide: 250 nm round Lisbon', bbox: [-14.6, 34.5, -3.8, 43.0], base: 'base-lisbon-wide.json', wind: 'wide', grat: 2, km: 100, wide: true, thin: 1 },
        { label: 'Close: Lisbon and the estuary', bbox: [-10.0, 38.3, -8.5, 39.3], base: 'base-lisbon.json', wind: 'close', grat: 0.25, km: 10 }] },
    madeira: { icao: 'LPMA', name: 'Madeira', place: 'Madeira airport (LPMA)', left: [],
      views: [{ label: 'Wide: 150 nm round Funchal', bbox: [-19.9, 30.2, -13.8, 35.3], base: 'base-madeira-wide.json', wind: 'wide', grat: 1, km: 50, wide: true, thin: 0.5 },
        { label: 'Close: Madeira', bbox: [-17.4, 32.45, -16.2, 33.15], base: 'base-madeira.json', wind: 'close', grat: 0.25, km: 10 }] }
  }
  var uid = 0
  function esc (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] }) }
  function H (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e }
  function link (href, txt) { var a = H('a', '', txt || href); a.href = /^(https?:\/\/|\/)/i.test(href) ? href : '#'; return a }
  function p2 (n) { return n < 10 ? '0' + n : String(n) }
  function when (t) { var d = new Date(Date.parse(t)); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) + ' UTC' }
  function get (u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u + ' ' + r.status); return r.json() }) }
  function phase (r) { return r.g ? 'on the ground' : r.vr == null ? 'unknown' : r.vr > 300 ? 'climbing' : r.vr < -300 ? 'descending' : (r.alt != null && r.alt >= 10000) ? 'cruising' : 'level' }
  var PCLS = { 'on the ground': 'g', climbing: 'c', descending: 'd', cruising: 'l', level: 'l', unknown: 'l' }

  function mount (fig) {
    var key = fig.getAttribute('data-area') || 'lisbon', A = AREAS[key]
    var base = fig.getAttribute('data-base') || '/api/v1/storm/charles/flights-map/'
    if (base.slice(-1) !== '/') base += '/'
    var fb = fig.querySelector('.viz-fallback'), body = H('div', 'viz-body fm')
    function fail (why) {
      var e = H('div', 'viz-error'); e.setAttribute('role', 'status')
      e.appendChild(document.createTextNode('Could not load the data: ')); e.appendChild(link(base, base)); if (why) e.appendChild(document.createTextNode(' (' + why + ')'))
      if (body.parentNode) body.parentNode.removeChild(body)
      var f = fig.querySelector('.viz-fallback'); if (f && f.parentNode) f.parentNode.replaceChild(e, f); else fig.insertBefore(e, fig.firstChild)
    }
    if (!A) { fail('no area named ' + key); return }
    var flightsUrl = base + key + '-flights.json'
    Promise.all([get(flightsUrl), get(base + key + '-wind-wide.json'), get(base + key + '-wind-close.json').catch(function () { return null }), get(base + 'airports.json').catch(function () { return null }), get(base + A.views[0].base)]).then(function (r) {
      if (fb && fb.parentNode) fb.parentNode.replaceChild(body, fb); else fig.insertBefore(body, fig.firstChild)
      var old = fig.querySelector('figcaption'); if (old) old.parentNode.removeChild(old)
      run(fig, body, A, base, flightsUrl, r)
    }).catch(function (e) { fail(e && e.message); if (window.console) console.warn('flightmap: ' + (e && e.message)) })
  }

  function run (fig, body, A, base, flightsUrl, r) {
    var D = r[0], winds = { wide: r[1], close: r[2] }, ap = r[3] && r[3].airports && r[3].airports[A.icao], bases = {}, vi = 0, sel = null, timer = null
    bases[A.views[0].base] = r[4]
    var id = 'fm' + (++uid), fields = D.fields, frames = D.frames, rows0 = {}
    // measured rows, each linked to the same flight's row in the frame before (for the trail)
    var last = {}, fr = frames.map(function (f, fi) {
      var rows = f.rows.map(function (a) {
        var o = { ac: a[0], lat: a[1], lon: a[2], alt: a[3], gs: a[4], trk: a[5], vr: a[6], g: a[7], fi: fi, prev: last[a[0]] || null }; return o
      })
      rows.forEach(function (o) { last[o.ac] = o })
      return { t: f.t, ms: Date.parse(f.t), kind: f.kind, rows: rows, other: f.n_other }
    })
    if (!fr.length) { body.appendChild(H('p', 'viz-empty', 'No frames in the data file.')); return }
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches

    // ----- the page for this figure
    var views = H('div', 'viz-btns'); views.setAttribute('role', 'group'); views.setAttribute('aria-label', 'Map view')
    A.views.forEach(function (v, j) { var b = H('button', '', v.label); b.type = 'button'; b.setAttribute('aria-pressed', String(j === 0)); b.onclick = function () { setView(j) }; views.appendChild(b) })
    var ctl = H('div', 'fm-ctl'), play = H('button', 'fm-play', 'Play'), now = H('output', 'fm-now'), lab = H('label', 'fm-t'), rng = H('input')
    play.type = 'button'; if (reduce) { play.disabled = true; play.title = 'Play is off because your system asks for reduced motion; use the slider' }
    rng.type = 'range'; rng.min = 0; rng.max = fr.length - 1; rng.step = 1; rng.value = fr.length - 1; rng.id = id + '-t'
    lab.htmlFor = id + '-t'; var sr = H('span', 'fm-sr', 'Time, UTC'); lab.appendChild(sr); lab.appendChild(rng)
    ctl.appendChild(play); ctl.appendChild(lab); ctl.appendChild(now)
    var mapBox = H('div', 'fm-mapbox'), info = H('p', 'fm-info'), item = H('p', 'fm-item')
    info.setAttribute('aria-live', 'polite'); item.setAttribute('aria-live', 'polite')
    var key = H('ul', 'fm-key')
    key.innerHTML = '<li><svg width="18" height="18" aria-hidden="true"><path class="fm-pl fm-c" transform="translate(9 9) scale(.7)" d="' + PLANE + '"/></svg> climbing</li>'
      + '<li><svg width="18" height="18" aria-hidden="true"><path class="fm-pl fm-d" transform="translate(9 9) scale(.7)" d="' + PLANE + '"/></svg> descending</li>'
      + '<li><svg width="18" height="18" aria-hidden="true"><path class="fm-pl fm-l" transform="translate(9 9) scale(.7)" d="' + PLANE + '"/></svg> level or cruising</li>'
      + '<li><svg width="18" height="18" aria-hidden="true"><path class="fm-pl fm-g" transform="translate(9 9) scale(.7)" d="' + PLANE + '"/></svg> on the ground</li>'
      + '<li><svg width="26" height="14" aria-hidden="true"><circle class="fm-pt" cx="5" cy="7" r="3"/><circle class="fm-pt" cx="15" cy="7" r="3"/></svg> its earlier measured positions</li>'
      + '<li><svg width="18" height="18" aria-hidden="true"><line class="fm-wl" x1="9" y1="15" x2="9" y2="3"/><path class="fm-wh" d="M9 1 l-3.5 6 h7 z"/></svg> wind (model), pointing where it blows to</li>'
    var det = H('details', 'fm-det'), sm = H('summary', '', 'The flights in view, as a table'), wrap = H('div', 'fm-wrap'), tb = H('table'), th = H('thead'), tbd = H('tbody')
    th.innerHTML = '<tr><th scope="col">Callsign</th><th scope="col">Airline</th><th scope="col">Type</th><th scope="col">Altitude (ft)</th><th scope="col">Speed (kt)</th><th scope="col">Track</th><th scope="col">Phase</th></tr>'
    tb.appendChild(th); tb.appendChild(tbd); wrap.appendChild(tb); det.appendChild(sm); det.appendChild(wrap)
    body.appendChild(views); body.appendChild(mapBox); body.appendChild(ctl); body.appendChild(info); body.appendChild(item); body.appendChild(key); body.appendChild(det)
    fig.appendChild(caption())

    function caption () {
      var c = H('figcaption'), cad = D.cadence_min
      c.appendChild(document.createTextNode('Airline flights by callsign over ' + A.name + ', every ' + (cad || 5) + ' minutes from ' + when(fr[0].t) + ' to ' + when(fr[fr.length - 1].t) + ' (before the first wide frame, the data has a smaller area for Lisbon). Only measured positions are drawn; nothing is drawn between two frames. Private aircraft and every other aircraft are left out and not kept, only counted. Not a warning service: your airline decides whether your flight runs. Aircraft: adsb.lol (ODbL 1.0) via the Storm Charles site. Wind: Open-Meteo (CC BY 4.0), model data, not observations. Base map: Natural Earth (public domain). Runways: OurAirports (public domain). Drawn in your browser from '))
      c.appendChild(link(flightsUrl, flightsUrl)); c.appendChild(document.createTextNode('.')); return c
    }

    // ----- the map for the view
    function setView (j) {
      vi = j; var bs = views.querySelectorAll('button'); for (var q = 0; q < bs.length; q++) bs[q].setAttribute('aria-pressed', String(q === j))
      var b = A.views[j].base
      if (bases[b]) { build(); show(+rng.value) } else get(base + b).then(function (m) { bases[b] = m; build(); show(+rng.value) }).catch(function () { bases[b] = {}; build(); show(+rng.value) })
    }
    var bb, k, Hh, X, Y, inb, gW, gAc, gTr, gWi, kk = 2
    function build () {
      var V = A.views[vi], m = bases[V.base] || {}
      bb = V.bbox; k = Math.cos((bb[1] + bb[3]) / 2 * Math.PI / 180); Hh = Math.round(W * (bb[3] - bb[1]) / ((bb[2] - bb[0]) * k))
      X = function (lon) { return (lon - bb[0]) / (bb[2] - bb[0]) * W }; Y = function (lat) { return (bb[3] - lat) / (bb[3] - bb[1]) * Hh }
      inb = function (lon, lat) { return lon >= bb[0] && lon <= bb[2] && lat >= bb[1] && lat <= bb[3] }
      var pl = function (l) { return l.map(function (p) { return X(p[0]).toFixed(1) + ',' + Y(p[1]).toFixed(1) }).join(' ') }
      var s = '<svg class="fm-map" viewBox="0 0 ' + W + ' ' + Hh + '" role="img" aria-label=""><title></title>'
      s += '<g class="fm-land">' + (m.land || []).map(function (q) { return '<polygon points="' + pl(q) + '"/>' }).join('') + '</g>'
      s += '<g class="fm-urban">' + (m.urban || []).map(function (q) { return '<polygon points="' + pl(q) + '"/>' }).join('') + '</g>'
      s += '<g class="fm-dist">' + (m.districts || []).map(function (q) { return '<polyline points="' + pl(q) + '"/>' }).join('') + '</g>'
      s += '<g class="fm-river">' + (m.rivers || []).map(function (q) { return '<polyline points="' + pl(q.line) + '"/>' }).join('') + '</g>'
      s += '<g class="fm-coast">' + (m.coast || []).map(function (q) { return '<polyline points="' + pl(q) + '"/>' }).join('') + '</g>'
      var gs = V.grat, gd = gs >= 1 ? 0 : 2, gr = '<g class="fm-grat">'
      for (var gx = Math.ceil((bb[0] + gs / 20) / gs) * gs; gx < bb[2]; gx += gs) gr += '<line x1="' + X(gx).toFixed(1) + '" x2="' + X(gx).toFixed(1) + '" y1="0" y2="' + Hh + '"/>' + (X(gx) > W - 70 ? '' : '<text class="fm-t1" x="' + (X(gx) + 4).toFixed(1) + '" y="' + (Hh - 8) + '">' + Math.abs(gx).toFixed(gd) + '°W</text>')
      for (var gy = Math.ceil((bb[1] + gs / 20) / gs) * gs; gy < bb[3] - gs / 3; gy += gs) gr += '<line y1="' + Y(gy).toFixed(1) + '" y2="' + Y(gy).toFixed(1) + '" x1="0" x2="' + W + '"/><text class="fm-t1" x="' + (W - 6) + '" y="' + (Y(gy) - 4).toFixed(1) + '" text-anchor="end">' + gy.toFixed(gd) + '°N</text>'
      s += gr + '</g>'
      var rw = ap && ap.runways || []
      s += '<g class="fm-rw">' + rw.map(function (q) { var e = q.ends || []; if (e.length < 2) return ''; return '<line x1="' + X(e[0].lon).toFixed(1) + '" y1="' + Y(e[0].lat).toFixed(1) + '" x2="' + X(e[1].lon).toFixed(1) + '" y2="' + Y(e[1].lat).toFixed(1) + '"><title>Runway ' + esc(q.id) + '</title></line>' }).join('') + '</g>'
      s += '<g class="fm-towns">' + (m.places || []).filter(function (p) { return inb(p.lon, p.lat) }).map(function (p) {
        var left = p.lon > bb[2] - (bb[2] - bb[0]) * 0.25 || A.left.indexOf(p.name) >= 0
        return '<circle cx="' + X(p.lon).toFixed(1) + '" cy="' + Y(p.lat).toFixed(1) + '" r="4"/><text class="fm-t2" x="' + (X(p.lon) + (left ? -9 : 9)).toFixed(1) + '" y="' + (Y(p.lat) + 4).toFixed(1) + '"' + (left ? ' text-anchor="end"' : '') + '>' + esc(p.name) + '</text>' }).join('') + '</g>'
      if (rw[0] && rw[0].ends && !V.wide) { var a0 = rw[0].ends[1] || rw[0].ends[0]; s += '<text class="fm-place fm-t2" x="' + (X(a0.lon) + 12).toFixed(1) + '" y="' + (Y(a0.lat) - 6).toFixed(1) + '">' + esc(A.place) + '</text>' }
      var km = V.km / (111.32 * k) / (bb[2] - bb[0]) * W
      s += '<g class="fm-scale"><line x1="16" y1="' + (Hh - 26) + '" x2="' + (16 + km).toFixed(1) + '" y2="' + (Hh - 26) + '"/><line x1="16" x2="16" y1="' + (Hh - 32) + '" y2="' + (Hh - 20) + '"/><line x1="' + (16 + km).toFixed(1) + '" x2="' + (16 + km).toFixed(1) + '" y1="' + (Hh - 32) + '" y2="' + (Hh - 20) + '"/><text class="fm-t1" x="16" y="' + (Hh - 36) + '">' + V.km + ' km</text></g>'
      s += '<g class="fm-wind"></g><g class="fm-trails"></g><g class="fm-ac"></g></svg>'
      mapBox.innerHTML = s
      var svg = mapBox.firstChild; gWi = svg.querySelector('.fm-wind'); gTr = svg.querySelector('.fm-trails'); gAc = svg.querySelector('.fm-ac')
      curWind = null; gAc.addEventListener('click', function (e) { var el = e.target.closest ? e.target.closest('.fm-plane') : null; if (el) pick(+el.getAttribute('data-ac')) })
      fit()
    }
    function fit () { var w = mapBox.getBoundingClientRect().width; if (w) { kk = W / w; mapBox.style.setProperty('--fm-k', kk.toFixed(3)) } }

    // ----- one frame
    var curWind = null
    function windAt (t) {
      var V = A.views[vi], wf = winds[V.wind] || winds.wide, h = null
      wf.hours.forEach(function (x) { if (x.t <= t) h = x }); return { f: wf, h: h || wf.hours[0] }
    }
    function drawWind (w) {
      var V = A.views[vi], g = w.f.grids[w.h.g], s = '', n = 0
      g.lat.forEach(function (la, a) {
        g.lon.forEach(function (lo, b) {
          if (!inb(lo, la)) return
          if (V.thin && !(g.step_deg >= V.thin - 1e-6) && (Math.abs(la / V.thin - Math.round(la / V.thin)) > 0.02 || Math.abs(lo / V.thin - Math.round(lo / V.thin)) > 0.02)) return
          var q = a * g.lon.length + b, sp = w.h.spd[q], dir = w.h.dir[q], gu = w.h.gust[q]; if (sp == null || dir == null) return
          var L = Math.min(60, 12 + sp * 1.3) * (V.wide ? 0.8 : 1) * kk * 0.9, hs = (kk * 0.55).toFixed(2)
          s += '<g transform="translate(' + X(lo).toFixed(1) + ' ' + Y(la).toFixed(1) + ') rotate(' + ((dir + 180) % 360) + ')"><line class="fm-wl" y1="' + (L / 2).toFixed(1) + '" y2="' + (-L / 2).toFixed(1) + '"/><path class="fm-wh" transform="translate(0 ' + (-L / 2).toFixed(1) + ') scale(' + hs + ')" d="M0 -3 l-4 8 h8 z"/><title>Wind from ' + dir + '°, ' + sp + ' kt' + (gu ? ', gusts ' + gu + ' kt' : '') + ' (model)</title></g>'; n++
        })
      })
      gWi.innerHTML = s
    }
    var here = []
    function show (i) {
      var f = fr[i], V = A.views[vi]; here = []
      now.textContent = when(f.t); rng.setAttribute('aria-valuetext', when(f.t))
      var tr = '', ac = '', gnd = 0
      f.rows.forEach(function (o) {
        if (!inb(o.lon, o.lat)) return
        o.ph = phase(o); here.push(o); if (o.g) gnd++
        var on = sel === o.ac, p = o, pts = [], n = 0
        while (p && n < 6 && f.ms - fr[p.fi].ms <= 30 * 60000) { pts.push(p); p = p.prev; n++ }
        if (pts.length > 1) tr += '<polyline class="fm-join' + (on ? ' on' : '') + '" points="' + pts.map(function (q) { return X(q.lon).toFixed(1) + ',' + Y(q.lat).toFixed(1) }).join(' ') + '"/>'
        if (on) tr += pts.slice(1).map(function (q) { return '<circle class="fm-pt on" cx="' + X(q.lon).toFixed(1) + '" cy="' + Y(q.lat).toFixed(1) + '" r="' + (3 * kk).toFixed(1) + '"/>' }).join('')
        var sc = (kk * 0.72).toFixed(2), cs = D.ac[o.ac]
        ac += '<g class="fm-plane fm-' + PCLS[o.ph] + (on ? ' on' : '') + '" data-ac="' + o.ac + '" transform="translate(' + X(o.lon).toFixed(1) + ' ' + Y(o.lat).toFixed(1) + ') rotate(' + (o.g ? 0 : (o.trk || 0)) + ') scale(' + sc + ')"><path d="' + PLANE + '"/><title>' + esc(cs[0]) + ', ' + esc(D.airlines[cs[1]] || cs[1]) + ', ' + o.ph + (o.alt != null ? ', ' + o.alt.toLocaleString('en-GB') + ' ft' : '') + '</title></g>'
      })
      gTr.innerHTML = tr; gAc.innerHTML = ac
      var w = windAt(f.t); if (w.h !== curWind) { curWind = w.h; drawWind(w) }
      var air = here.length - gnd, m = metar(f.t)
      info.textContent = when(f.t) + ': ' + here.length + ' airline flight' + (here.length === 1 ? '' : 's') + ' in view (' + air + ' in the air, ' + gnd + ' on the ground)' + (f.other != null ? '; ' + f.other + ' other aircraft in the wider area, not drawn' : '') + '. '
        + (m ? A.icao + ' METAR ' + m.t.slice(11, 16) + ': wind from ' + m.dir + '° at ' + m.kt + ' kt' + (m.gust ? ', gusts ' + m.gust + ' kt' : '') + '. ' : '')
        + 'Wind arrows: ' + w.h.t.slice(11, 13) + ':00 UTC' + (w.h.forecast ? ', a model forecast made earlier' : ', model analysis') + '.'
      var svg = mapBox.firstChild; if (svg) { var lb = 'Map of ' + A.name + ' at ' + when(f.t) + ': ' + here.length + ' airline flights and the wind'; svg.setAttribute('aria-label', lb); svg.querySelector('title').textContent = lb }
      list(); detail()
    }
    function metar (t) { var m = null; if (!ap || !ap.metar) return null; ap.metar.forEach(function (x) { if (x.t <= t) m = x }); return m && Date.parse(t) - Date.parse(m.t) <= 90 * 60000 ? m : null }
    function list () {
      var rows = here.slice().sort(function (a, b) { return D.ac[a.ac][0] < D.ac[b.ac][0] ? -1 : 1 }).slice(0, 80)
      tbd.innerHTML = rows.map(function (o) { var cs = D.ac[o.ac]
        return '<tr' + (sel === o.ac ? ' class="on"' : '') + '><td><button type="button" class="fm-row" data-ac="' + o.ac + '">' + esc(cs[0]) + '</button></td><td>' + esc(D.airlines[cs[1]] || cs[1]) + '</td><td>' + esc(cs[2] || '') + '</td><td>' + (o.alt == null ? '' : o.alt.toLocaleString('en-GB')) + '</td><td>' + (o.gs == null ? '' : o.gs) + '</td><td>' + (o.trk == null ? '' : o.trk + '°') + '</td><td>' + o.ph + '</td></tr>' }).join('')
      if (here.length > 80) tbd.innerHTML += '<tr><td colspan="7">First 80 of ' + here.length + ' in view.</td></tr>'
    }
    tbd.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('.fm-row') : null; if (b) pick(+b.getAttribute('data-ac')) })
    function detail () {
      var o = null; here.forEach(function (x) { if (x.ac === sel) o = x })
      if (!o) { item.textContent = sel == null ? 'Pick a plane or a callsign in the table to light its track.' : D.ac[sel][0] + ' is not in view at this time.'; return }
      var cs = D.ac[o.ac]; item.textContent = cs[0] + ', ' + (D.airlines[cs[1]] || cs[1]) + (cs[2] ? ', ' + cs[2] : '') + ': ' + o.ph + (o.alt != null ? ', ' + o.alt.toLocaleString('en-GB') + ' ft' : '') + (o.gs != null ? ', ' + o.gs + ' kt' : '') + (o.trk != null ? ', track ' + o.trk + '°' : '') + '. Measured at ' + fr[o.fi].t.slice(11, 16) + ' UTC.'
    }
    function pick (a) { sel = sel === a ? null : a; show(+rng.value) }
    function stop () { if (timer) clearInterval(timer); timer = null; play.textContent = 'Play' }
    rng.addEventListener('input', function () { stop(); show(+rng.value) })
    play.addEventListener('click', function () {
      if (timer) { stop(); return }
      if (+rng.value >= fr.length - 1) rng.value = 0
      play.textContent = 'Pause'
      timer = setInterval(function () { var i = +rng.value + 1; if (i >= fr.length) { stop(); return } rng.value = i; show(i) }, 220)
    })
    var rz = null; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(function () { var o = kk; fit(); if (Math.abs(o - kk) > 0.05) { curWind = null; show(+rng.value) } }, 150) })
    build(); show(fr.length - 1)
    if (window.ResizeObserver) { var ro = new ResizeObserver(function () { var o = kk; fit(); if (Math.abs(o - kk) > 0.05) { curWind = null; show(+rng.value) } }); ro.observe(mapBox) }
  }

  function start () { Array.prototype.forEach.call(document.querySelectorAll('figure.viz[data-viz="storm-flightmap"]'), function (f) { try { mount(f) } catch (e) { if (window.console) console.warn('flightmap failed', e) } }) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start()
})()
