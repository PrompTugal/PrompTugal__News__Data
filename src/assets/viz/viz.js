/* PrompTugal data: charts drawn in your browser from this site's own JSON. Vanilla JS, no libraries.
   Mount: <figure class="viz" data-viz="NAME" data-src="/api/v1/..." [data-src2] [data-src3]>. Apache-2.0. */
(function () {
  'use strict'
  var NS = 'http://www.w3.org/2000/svg'
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  var R = {}

  // ---------- small tools
  function H (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e }
  function S (parent, tag, attrs, txt) {
    var e = document.createElementNS(NS, tag), st = ''
    if (attrs) Object.keys(attrs).forEach(function (k) {
      var v = attrs[k]; if (v == null) return
      if (k === 'fill' || k === 'stroke') st += k + ':' + v + ';'
      else if (k === 'style') st += v + ';'
      else e.setAttribute(k, typeof v === 'number' ? (Math.round(v * 100) / 100) : v)
    })
    if (st) e.setAttribute('style', st)
    if (txt != null) e.textContent = txt
    if (parent) parent.appendChild(e)
    return e
  }
  function tip (el, text) { S(el, 'title', null, text); return el }
  function root (w, h, label, cls) {
    var s = document.createElementNS(NS, 'svg')
    s.setAttribute('viewBox', '0 0 ' + Math.round(w) + ' ' + Math.round(h)); s.setAttribute('role', 'img'); s.setAttribute('aria-label', label)
    if (cls) s.setAttribute('class', cls)
    return s
  }
  function T (t) { return typeof t === 'number' ? t : Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(String(t)) ? t : String(t) + 'Z') }
  function p2 (n) { return n < 10 ? '0' + n : String(n) }
  function dmy (ms) { var d = new Date(ms); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] + ' ' + d.getUTCFullYear() }
  function dm (ms) { var d = new Date(ms); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] }
  function hm (ms) { var d = new Date(ms); return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) }
  function stamp (ms) { return dmy(ms) + ', ' + hm(ms) + ' UTC' }
  function wd (ms) { return new Date(ms).toLocaleDateString('en-GB', { weekday: 'short', timeZone: 'UTC' }) }
  function dayLabel (iso) { var ms = T(iso + 'T00:00:00Z'); return wd(ms) + ' ' + dm(ms) }
  function num (v) { var n = typeof v === 'number' ? v : parseFloat(v); return isFinite(n) ? n : null }
  function r1 (n) { return Math.round(n * 10) / 10 }
  function lin (d0, d1, r0, r1_) { var k = d1 === d0 ? 0 : (r1_ - r0) / (d1 - d0); return function (v) { return r0 + (v - d0) * k } }
  function fmtBytes (b) { return b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : b >= 1024 ? (b / 1024).toFixed(1) + ' kB' : b + ' B' }
  function norm (s) { return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase() }
  function ramp (p, v, lo, hi, n) { n = n || 7; var i = hi === lo ? 0 : Math.round((v - lo) / (hi - lo) * (n - 1)); return 'var(--viz-' + p + Math.max(0, Math.min(n - 1, i)) + ')' }
  function cat (i) { return 'var(--viz-c' + (1 + (i % 8)) + ')' }
  var LV = { yellow: 'var(--viz-yellow)', orange: 'var(--viz-orange)', red: 'var(--viz-red)', green: 'var(--viz-green)' }
  var LVTXT = { yellow: '#111', orange: '#111', red: '#fff', green: '#fff' }
  var LVRANK = { green: 0, yellow: 1, orange: 2, red: 3 }
  function ucfirst (s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1) }
  function legend (items) {
    var ul = H('ul', 'viz-legend')
    items.forEach(function (it) { var li = H('li'), i = H('i'); i.style.background = it[0]; li.appendChild(i); li.appendChild(document.createTextNode(it[1])); ul.appendChild(li) })
    return ul
  }
  function note (txt) { return H('p', 'viz-note', txt) }
  function buttons (body, labels, pick, start) {
    var g = H('div', 'viz-btns'), bs = []; g.setAttribute('role', 'group'); g.setAttribute('aria-label', 'Choose')
    labels.forEach(function (l, i) {
      var b = H('button', '', l); b.type = 'button'; b.setAttribute('aria-pressed', String(i === (start || 0)))
      b.onclick = function () { bs.forEach(function (o, j) { o.setAttribute('aria-pressed', String(i === j)) }); pick(i) }
      bs.push(b); g.appendChild(b)
    })
    body.appendChild(g); return g
  }
  function holder (body) { var h = H('div', 'viz-chart'); body.appendChild(h); return h }
  function ticksFor (lo, hi, n) {
    var span = hi - lo || 1, raw = span / n, mag = Math.pow(10, Math.floor(Math.log(raw) / Math.LN10)), f = raw / mag
    var step = (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * mag, a = [], v = Math.ceil(lo / step - 1e-9) * step
    for (; v <= hi + 1e-9; v += step) a.push(Math.round(v / step) * step)
    return a
  }
  function timeTicks (t0, t1, n) {
    var steps = [1, 3, 6, 12, 24, 48, 168].map(function (h) { return h * 36e5 }), st = steps[steps.length - 1]
    for (var i = 0; i < steps.length; i++) if ((t1 - t0) / steps[i] <= n) { st = steps[i]; break }
    var a = []; for (var t = Math.ceil(t0 / st) * st; t <= t1; t += st) a.push(t)
    return { st: st, ticks: a }
  }
  function tlabel (t, st) { return st >= 864e5 ? dm(t) : (new Date(t).getUTCHours() === 0 ? dm(t) : hm(t)) }
  function timeAxis (svg, sx, t0, t1, yTop, yBot, n) {
    var tt = timeTicks(t0, t1, n)
    tt.ticks.forEach(function (t) {
      S(svg, 'line', { x1: sx(t), x2: sx(t), y1: yTop, y2: yBot, class: 'grid' })
      S(svg, 'text', { x: sx(t), y: yBot + 14, 'text-anchor': 'middle', class: 'm' }, tlabel(t, tt.st))
    })
  }
  function empty (body, txt) { body.appendChild(H('p', 'viz-empty', txt)) }
  function setLabel (svg, txt) { svg.setAttribute('aria-label', txt) }

  // ---------- maps
  var PT = { lon0: -9.6, lon1: -6.1, lat0: 36.9, lat1: 42.2 }
  function proj (b, W, ml, mt, mr, mb) {
    var kk = Math.cos((b.lat0 + b.lat1) / 2 * Math.PI / 180), iw = W - ml - mr, sc = iw / ((b.lon1 - b.lon0) * kk), ih = (b.lat1 - b.lat0) * sc
    return { ml: ml, mt: mt, iw: iw, ih: ih, W: W, H: ih + mt + mb, sc: sc, x: function (lon) { return ml + (lon - b.lon0) * kk * sc }, y: function (lat) { return mt + (b.lat1 - lat) * sc }, b: b }
  }
  var uid = 0
  function mapFrame (b, W, coast, tickStep, label, cls) {
    var P = proj(b, W, 46, 8, 8, 22), svg = root(P.W, P.H, label, cls), id = 'vz' + (++uid)
    var defs = S(svg, 'defs'), cp = S(defs, 'clipPath', { id: id }); S(cp, 'rect', { x: P.ml, y: P.mt, width: P.iw, height: P.ih })
    S(svg, 'rect', { x: P.ml, y: P.mt, width: P.iw, height: P.ih, class: 'sea' })
    if (coast && coast.rings) {
      var g = S(svg, 'g', { 'clip-path': 'url(#' + id + ')' }), d = ''
      coast.rings.forEach(function (r) {
        var x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9
        r.forEach(function (q) { if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1] })
        if (x1 < b.lon0 || x0 > b.lon1 || y1 < b.lat0 || y0 > b.lat1) return
        r.forEach(function (q, j) { d += (j ? 'L' : 'M') + Math.round(P.x(q[0]) * 10) / 10 + ',' + Math.round(P.y(q[1]) * 10) / 10 })
        d += 'Z'
      })
      if (d) S(g, 'path', { d: d, class: 'land' })
    }
    for (var lo = Math.ceil(b.lon0 / tickStep) * tickStep; lo <= b.lon1 + 1e-9; lo += tickStep) {
      S(svg, 'line', { x1: P.x(lo), x2: P.x(lo), y1: P.mt + P.ih, y2: P.mt + P.ih + 4, class: 'axis' })
      S(svg, 'text', { x: P.x(lo), y: P.mt + P.ih + 16, 'text-anchor': 'middle', class: 'm' }, Math.abs(Math.round(lo * 10) / 10) + '°' + (lo < 0 ? 'W' : 'E'))
    }
    for (var la = Math.ceil(b.lat0 / tickStep) * tickStep; la <= b.lat1 + 1e-9; la += tickStep) {
      S(svg, 'line', { x1: P.ml - 4, x2: P.ml, y1: P.y(la), y2: P.y(la), class: 'axis' })
      S(svg, 'text', { x: P.ml - 6, y: P.y(la) + 4, 'text-anchor': 'end', class: 'm' }, Math.round(la * 10) / 10 + '°N')
    }
    S(svg, 'rect', { x: P.ml, y: P.mt, width: P.iw, height: P.ih, fill: 'none', stroke: 'var(--viz-axis)' })
    var layer = S(svg, 'g', { 'clip-path': 'url(#' + id + ')' })
    return { svg: svg, P: P, g: layer }
  }
  function onMainland (s) { return s.lon >= PT.lon0 && s.lon <= PT.lon1 && s.lat >= PT.lat0 && s.lat <= PT.lat1 }

  // ---------- flights-now
  var ALT = [['ground', 'On the ground'], ['below 5,000 ft', 'Below 5,000 ft'], ['5,000 to 15,000 ft', '5,000 to 15,000 ft'], ['15,000 to 30,000 ft', '15,000 to 30,000 ft'], ['30,000 ft and above', '30,000 ft and above']]
  var ALTC = ['var(--muted)', 'var(--viz-b1)', 'var(--viz-b3)', 'var(--viz-b4)', 'var(--viz-b6)']
  function altIdx (f) { var a = f.alt_ft; return f.on_ground || a === 0 ? 0 : a == null ? 0 : a < 5000 ? 1 : a < 15000 ? 2 : a < 30000 ? 3 : 4 }
  R['flights-now'] = function (body, d, fig, ctxs) {
    var ap = d.airport, coast = ctxs[1], lat = ap.lat, lon = ap.lon, dl = 0.8, dn = dl / Math.cos(lat * Math.PI / 180)
    var b = { lon0: lon - dn, lon1: lon + dn, lat0: lat - dl, lat1: lat + dl }
    var fl = d.airline || []
    var m = mapFrame(b, 540, coast, 0.5, 'Map around ' + ap.name + ': ' + fl.length + ' airline flights within ' + ap.within_nm + ' nautical miles at the time read.', 'viz-sq')
    var P = m.P, nm = ap.within_nm / 60
    ;[nm, nm / 2].forEach(function (r, i) {
      S(m.g, 'circle', { cx: P.x(lon), cy: P.y(lat), r: r * P.sc, class: 'ring' })
      S(m.svg, 'text', { x: P.x(lon) + 4, y: P.y(lat) - r * P.sc - 3, class: 'm halo' }, Math.round(r * 60) + ' nm')
    })
    S(m.g, 'circle', { cx: P.x(lon), cy: P.y(lat), r: 4, fill: 'var(--ink)' })
    S(m.g, 'text', { x: P.x(lon) + 7, y: P.y(lat) + 15, class: 'halo b' }, ap.icao + ' ' + ap.name.replace(/ airport$/i, ''))
    fl.forEach(function (f) {
      if (f.lat == null || f.lon == null) return
      var i = altIdx(f), g = S(m.g, 'g', { transform: 'translate(' + P.x(f.lon) + ',' + P.y(f.lat) + ')' })
      tip(g, f.callsign + ', ' + (f.type || 'type unknown') + ', ' + (f.on_ground ? 'on the ground' : (f.alt_ft != null ? f.alt_ft + ' ft' : 'altitude unknown')) + ', ' + (f.ground_speed_kt != null ? Math.round(f.ground_speed_kt) + ' kt' : 'speed unknown') + ', track ' + (f.track_deg != null ? Math.round(f.track_deg) + '°' : 'unknown'))
      S(g, 'path', { d: 'M0,-10 L6,7 L0,3 L-6,7 Z', transform: 'rotate(' + (f.track_deg || 0) + ')', fill: ALTC[i], stroke: 'var(--ink)', 'stroke-width': 1 })
      S(g, 'text', { x: 9, y: 4, class: 'halo b' }, f.callsign)
    })
    body.appendChild(m.svg)
    if (!fl.length) empty(body, 'No airline flights seen at the time read.')
    body.appendChild(legend(ALT.map(function (a, i) { return [ALTC[i], a[1]] })))
    var c = d.counts || {}, bands = c.by_altitude_band || {}
    var h = H('p', 'viz-note', 'All aircraft the receivers saw, by altitude (counts only, no identities): ' + (c.airline + c.other_aircraft) + ' in all, of which ' + c.airline + ' with an airline callsign and ' + c.other_aircraft + ' other' + (c.other_on_ground ? ' (' + c.other_on_ground + ' of those on the ground)' : '') + '.')
    body.appendChild(h)
    var keys = ALT.map(function (a) { return a[0] }).concat(Object.keys(bands).filter(function (k) { return !ALT.some(function (a) { return a[0] === k }) }))
    var mx = Math.max(1, Math.max.apply(null, keys.map(function (k) { return bands[k] || 0 })))
    var bs = root(540, keys.length * 22 + 6, 'Bar chart of aircraft by altitude band: ' + keys.map(function (k) { return k + ' ' + (bands[k] || 0) }).join(', ') + '.', 'viz-sq')
    var sx = lin(0, mx, 0, 250)
    keys.forEach(function (k, i) {
      var y = i * 22 + 3, v = bands[k] || 0, ai = ALT.map(function (a) { return a[0] }).indexOf(k)
      S(bs, 'text', { x: 158, y: y + 13, 'text-anchor': 'end' }, k.charAt(0).toUpperCase() + k.slice(1))
      if (v) tip(S(bs, 'rect', { x: 166, y: y, width: Math.max(2, sx(v)), height: 16, rx: 3, fill: ai >= 0 ? ALTC[ai] : 'var(--muted)' }), k + ': ' + v)
      S(bs, 'text', { x: 166 + sx(v) + 5, y: y + 13 }, String(v))
    })
    body.appendChild(bs)
    return { about: 'Airline flights within ' + ap.within_nm + ' nautical miles of ' + ap.name + ' as community receivers saw them, each arrow turned to its track and coloured by altitude.', by: 'adsb.lol',
      table: { head: ['Callsign', 'Type', 'Altitude ft', 'Speed kt', 'Track deg'], rows: fl.map(function (f) { return [f.callsign, f.type || '', f.alt_ft, f.ground_speed_kt, f.track_deg] }) } }
  }

  // ---------- wind-now, temp-now
  function obsStations (d, key) { return (d.stations || []).filter(function (s) { return s.reading && s.reading[key] != null && s.lat != null }) }
  var SPEEDS = [[5, 'Under 5 km/h'], [15, '5 to 15 km/h'], [25, '15 to 25 km/h'], [35, '25 to 35 km/h'], [1e9, '35 km/h and over']]
  function spIdx (v) { for (var i = 0; i < SPEEDS.length; i++) if (v < SPEEDS[i][0]) return i; return 4 }
  var COMPASS = { 1: 'N', 2: 'NE', 3: 'E', 4: 'SE', 5: 'S', 6: 'SW', 7: 'W', 8: 'NW', 9: 'N' }
  R['wind-now'] = function (body, d, fig, ctxs) {
    var all = obsStations(d, 'wind_kmh').filter(function (s) { return s.reading.wind_dir_id != null })
    var st = all.filter(onMainland), off = all.length - st.length
    var m = mapFrame(PT, 400, ctxs[1], 1, 'Map of mainland Portugal with one arrow per weather station showing wind speed and direction: ' + st.length + ' stations at ' + d.hour_utc + '.', 'viz-map')
    var P = m.P
    st.forEach(function (s) {
      var r = s.reading, id = r.wind_dir_id, v = r.wind_kmh, g = S(m.g, 'g', { transform: 'translate(' + P.x(s.lon) + ',' + P.y(s.lat) + ')' })
      var txt = s.name + ': ' + v + ' km/h, ' + (id === 0 ? 'calm' : 'from the ' + COMPASS[id])
      tip(g, txt)
      if (id === 0 || v < 1) { S(g, 'circle', { r: 3, fill: 'none', stroke: 'var(--muted)', 'stroke-width': 1.5 }); return }
      var L = 8 + Math.min(v, 50) * 0.4, to = (((id % 8) || 8) - 1) * 45 + 180, c = 'var(--viz-b' + (2 + spIdx(v)) + ')'
      S(g, 'path', { d: 'M0,' + L / 2 + ' L0,' + -L / 2 + ' M-3.2,' + (-L / 2 + 5) + ' L0,' + -L / 2 + ' L3.2,' + (-L / 2 + 5), transform: 'rotate(' + to + ')', fill: 'none', stroke: c, 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' })
      S(g, 'circle', { r: 1.6, fill: 'var(--ink)' })
    })
    body.appendChild(m.svg)
    if (!st.length) empty(body, 'No station reported wind at the time read.')
    body.appendChild(legend(SPEEDS.map(function (s, i) { return ['var(--viz-b' + (2 + i) + ')', s[1]] }).concat([['transparent', 'Hollow ring: calm']])))
    body.appendChild(note('Each arrow points the way the wind blows to (IPMA reports the direction it comes from). Longer arrows are faster. Hour read: ' + d.hour_utc.replace('T', ' ').replace(':00Z', '') + ' UTC. ' + (off ? off + ' island stations (Azores, Madeira) with wind readings are not drawn.' : '')))
    return { about: 'Wind at IPMA surface stations on the mainland: arrows point where the wind blows to, coloured and sized by speed.', by: 'IPMA',
      table: { head: ['Station', 'Wind km/h', 'From'], rows: st.map(function (s) { return [s.name, s.reading.wind_kmh, s.reading.wind_dir_id === 0 ? 'calm' : COMPASS[s.reading.wind_dir_id]] }) } }
  }
  R['temp-now'] = function (body, d, fig, ctxs) {
    var all = obsStations(d, 'temp_c'), st = all.filter(onMainland), off = all.length - st.length
    var t = st.map(function (s) { return s.reading.temp_c }), lo = Math.floor(Math.min.apply(null, t)), hi = Math.ceil(Math.max.apply(null, t))
    if (!st.length) { empty(body, 'No mainland station reported a temperature at the time read.'); return { about: 'Air temperature at IPMA surface stations.', by: 'IPMA', table: null } }
    var m = mapFrame(PT, 400, ctxs[1], 1, 'Map of mainland Portugal with one dot per weather station coloured by air temperature, from ' + Math.min.apply(null, t) + ' to ' + Math.max.apply(null, t) + ' degrees Celsius, ' + st.length + ' stations.', 'viz-map')
    var P = m.P, mx = st[0], mn = st[0]
    st.forEach(function (s) {
      if (s.reading.temp_c > mx.reading.temp_c) mx = s; if (s.reading.temp_c < mn.reading.temp_c) mn = s
      tip(S(m.g, 'circle', { cx: P.x(s.lon), cy: P.y(s.lat), r: 4.5, fill: ramp('t', s.reading.temp_c, lo, hi), stroke: 'var(--ink)', 'stroke-width': 0.8 }), s.name + ': ' + s.reading.temp_c + ' °C')
    })
    ;[mx, mn].forEach(function (s, i) { var left = P.x(s.lon) > P.W * 0.5; S(m.svg, 'text', { x: P.x(s.lon) + (left ? -8 : 8), y: P.y(s.lat) + 4, 'text-anchor': left ? 'end' : 'start', class: 'halo b' }, (i ? 'Coolest ' : 'Warmest ') + s.reading.temp_c + '° ' + s.name.replace(/ ?[(,/].*/, '').slice(0, 14)) })
    body.appendChild(m.svg)
    var items = []; for (var i = 0; i < 7; i++) { var v = lo + (hi - lo) * i / 6; items.push(['var(--viz-t' + i + ')', r1(v) + ' °C']) }
    body.appendChild(legend(items))
    body.appendChild(note('Air temperature, hour read: ' + d.hour_utc.replace('T', ' ').replace(':00Z', '') + ' UTC. ' + (off ? off + ' island stations (Azores, Madeira) are not drawn.' : '')))
    return { about: 'Air temperature at IPMA surface stations on the mainland, one dot per station.', by: 'IPMA',
      table: { head: ['Station', 'Temperature °C'], rows: st.map(function (s) { return [s.name, s.reading.temp_c] }) } }
  }

  // ---------- warnings-now
  R['warnings-now'] = function (body, d) {
    var act = d.active || []
    if (!act.length) { empty(body, 'No yellow, orange or red warning was active at the time read.'); return { about: 'IPMA weather warnings by area and type.', by: 'IPMA', table: null } }
    var types = [], areas = {}
    act.forEach(function (w) {
      if (types.indexOf(w.type) < 0) types.push(w.type)
      var a = areas[w.area] || (areas[w.area] = { name: w.area_name || w.area, cells: {}, max: 0 })
      var c = a.cells[w.type] || (a.cells[w.type] = { lv: w.level, texts: [] }); if (LVRANK[w.level] > LVRANK[c.lv]) c.lv = w.level
      c.texts.push(w.text); a.max = Math.max(a.max, LVRANK[w.level])
    })
    types.sort()
    var rows = Object.keys(areas).map(function (k) { return areas[k] }).sort(function (a, b) { return b.max - a.max || (a.name < b.name ? -1 : 1) })
    var cw = 62, rh = 24, lw = 104, top = 84, W = Math.max(480, lw + types.length * cw + 70), Hh = top + rows.length * rh + 6
    var svg = root(W, Hh, 'Grid of active IPMA warnings: ' + rows.length + ' areas by ' + types.length + ' warning types. ' + act.length + ' active warnings.', 'viz-sq')
    types.forEach(function (t, j) { S(svg, 'text', { transform: 'translate(' + (lw + j * cw + cw / 2) + ',' + (top - 6) + ') rotate(-40)', 'text-anchor': 'start' }, t) })
    rows.forEach(function (a, i) {
      var y = top + i * rh
      S(svg, 'text', { x: lw - 8, y: y + 16, 'text-anchor': 'end' }, a.name)
      types.forEach(function (t, j) {
        var c = a.cells[t], x = lw + j * cw
        if (!c) { S(svg, 'rect', { x: x + 1, y: y + 1, width: cw - 2, height: rh - 2, rx: 3, fill: 'none', stroke: 'var(--viz-grid)' }); return }
        var g = S(svg, 'g'); tip(g, a.name + ', ' + t + ', ' + c.lv + ': ' + c.texts.join(' / '))
        S(g, 'rect', { x: x + 1, y: y + 1, width: cw - 2, height: rh - 2, rx: 3, fill: LV[c.lv] })
        S(g, 'text', { x: x + cw / 2, y: y + 16, 'text-anchor': 'middle', style: 'fill:' + LVTXT[c.lv], class: 'b' }, ucfirst(c.lv))
      })
    })
    body.appendChild(svg)
    body.appendChild(legend([[LV.yellow, 'Yellow'], [LV.orange, 'Orange'], [LV.red, 'Red']]))
    // time strip
    var ws = act.slice().sort(function (a, b) { return LVRANK[b.level] - LVRANK[a.level] || T(a.start) - T(b.start) })
    var t0 = Math.min.apply(null, ws.map(function (w) { return T(w.start) })), t1 = Math.max.apply(null, ws.map(function (w) { return T(w.end) }))
    var lw2 = 168, W2 = 520, sx = lin(t0, t1, lw2, W2 - 34), rh2 = 17
    var s2 = root(W2, ws.length * rh2 + 34, 'Time strip: when each of the ' + ws.length + ' active warnings starts and ends, from ' + stamp(t0) + ' to ' + stamp(t1) + '.', 'viz-sq')
    timeAxis(s2, sx, t0, t1, 4, ws.length * rh2 + 6, 5)
    ws.forEach(function (w, i) {
      var y = 4 + i * rh2
      S(s2, 'text', { x: lw2 - 6, y: y + 12, 'text-anchor': 'end' }, (w.area_name || w.area) + ', ' + w.type)
      tip(S(s2, 'rect', { x: sx(T(w.start)), y: y + 2, width: Math.max(3, sx(T(w.end)) - sx(T(w.start))), height: 11, rx: 3, fill: LV[w.level] }), w.level + ': ' + w.start + ' to ' + w.end)
    })
    body.appendChild(s2)
    body.appendChild(note('IPMA gives start and end times without a zone; they are drawn as published.'))
    return { about: 'IPMA warnings in force at the time read: one row per area, one column per warning type, then when each starts and ends.', by: 'IPMA',
      table: { head: ['Area', 'Type', 'Level', 'Start', 'End'], rows: act.map(function (w) { return [w.area_name || w.area, w.type, w.level, w.start, w.end] }) } }
  }

  // ---------- fire-now
  var RCM = [['Low', 'var(--viz-rcm1)'], ['Moderate', 'var(--viz-rcm2)'], ['High', 'var(--viz-rcm3)'], ['Very high', 'var(--viz-rcm4)'], ['Maximum', 'var(--viz-rcm5)']]
  R['fire-now'] = function (body, d, fig, ctxs) {
    var ms = (d.municipalities || []).filter(function (m) { return m.lat != null }), main = ms.filter(onMainland), off = ms.length - main.length
    var nd = main.length ? main[0].days.length : 0, dates = main.length ? main[0].days.map(function (x) { return x.date }) : []
    var h = holder(body)
    function draw (di) {
      h.textContent = ''
      var cnt = [0, 0, 0, 0, 0]
      main.forEach(function (m) { var l = m.days[di] && m.days[di].rcm; if (l >= 1 && l <= 5) cnt[l - 1]++ })
      var m = mapFrame(PT, 400, ctxs[1], 1, 'Map of mainland Portugal, one dot per municipality coloured by IPMA fire risk class for ' + dates[di] + ': ' + RCM.map(function (r, i) { return cnt[i] + ' ' + r[0].toLowerCase() }).join(', ') + '.', 'viz-map')
      main.forEach(function (mu) {
        var dd = mu.days[di]; if (!dd) return
        tip(S(m.g, 'circle', { cx: m.P.x(mu.lon), cy: m.P.y(mu.lat), r: 3.2, fill: RCM[dd.rcm - 1] ? RCM[dd.rcm - 1][1] : 'var(--muted)', stroke: 'var(--paper)', 'stroke-width': 0.6 }), 'Municipality ' + mu.dico + ': ' + dd.level + ' (class ' + dd.rcm + ')')
      })
      h.appendChild(m.svg)
      h.appendChild(legend(RCM.map(function (r, i) { return [r[1], r[0] + ': ' + cnt[i] + ' municipalities'] })))
    }
    buttons(body, dates.map(dayLabel), draw, 0); body.insertBefore(body.lastChild, h)
    draw(0)
    body.appendChild(note('IPMA fire risk class (RCM), 1 low to 5 maximum. ' + main.length + ' mainland municipalities drawn' + (off ? '; ' + off + ' island municipalities not drawn' : '') + '. Dots are placed at IPMA\'s own coordinates for each municipality code.'))
    return { about: 'IPMA\'s daily fire risk class for each mainland municipality, for the days it publishes.', by: 'IPMA',
      table: { head: ['Municipality code'].concat(dates), rows: ms.map(function (m) { return [m.dico].concat(m.days.map(function (x) { return x.level })) }) } }
  }

  // ---------- sea-now
  R['sea-now'] = function (body, d) {
    var cs = (d.coasts || []).filter(function (c) { return c.days && c.days.length })
    if (!cs.length) { empty(body, 'No sea forecast was published at the time read.'); return { about: 'IPMA sea forecast.', by: 'IPMA', table: null } }
    cs = cs.slice().sort(function (a, b) { return (b.lat || 0) - (a.lat || 0) })
    var nd = cs[0].days.length, mx = Math.max(2, Math.ceil(Math.max.apply(null, cs.map(function (c) { return Math.max.apply(null, c.days.map(function (x) { return x.waves_max_m || 0 })) }))))
    var lw = 170, W = 540, gh = nd * 9 + 10, sx = lin(0, mx, lw, W - 40)
    var svg = root(W, cs.length * gh + 30, 'Range bars of forecast significant wave height, minimum to maximum in metres, for ' + cs.length + ' coasts over ' + nd + ' days. ' + cs.map(function (c) { return c.name + ' ' + c.days[0].waves_min_m + ' to ' + c.days[0].waves_max_m + ' m today' }).join('; ') + '.', 'viz-sq')
    ticksFor(0, mx, 6).forEach(function (t) { S(svg, 'line', { x1: sx(t), x2: sx(t), y1: 0, y2: cs.length * gh, class: 'grid' }); S(svg, 'text', { x: sx(t), y: cs.length * gh + 14, 'text-anchor': 'middle', class: 'm' }, t + ' m') })
    cs.forEach(function (c, i) {
      var y = i * gh + 4
      S(svg, 'text', { x: lw - 8, y: y + 17, 'text-anchor': 'end' }, c.name.replace(/, Costa$/, ''))
      c.days.forEach(function (x, j) {
        if (x.waves_min_m == null || x.waves_max_m == null) return
        var yy = y + j * 9, w = Math.max(3, sx(x.waves_max_m) - sx(x.waves_min_m))
        tip(S(svg, 'rect', { x: sx(x.waves_min_m), y: yy, width: w, height: 7, rx: 2, fill: 'var(--viz-b' + (6 - j * 2) + ')' }), c.name + ', ' + x.date + ': waves ' + x.waves_min_m + ' to ' + x.waves_max_m + ' m' + (x.wave_dir ? ', from ' + x.wave_dir : '') + (x.sea_temp_min_c != null ? ', sea ' + x.sea_temp_min_c + ' °C' : ''))
        if (j === 0) S(svg, 'text', { x: sx(x.waves_max_m) + 5, y: yy + 7, class: 'm' }, x.waves_min_m + ' to ' + x.waves_max_m + ' m')
      })
    })
    body.appendChild(svg)
    body.appendChild(legend(cs[0].days.map(function (x, j) { return ['var(--viz-b' + (6 - j * 2) + ')', dayLabel(x.date) + (j ? '' : ' (top bar)')] })))
    return { about: 'IPMA\'s forecast range of significant wave height (minimum to maximum, metres) for each coastal place, one thin bar per day.', by: 'IPMA',
      table: { head: ['Coast', 'Date', 'Waves min m', 'Waves max m', 'Wave from', 'Sea temp min C', 'Sea temp max C'], rows: [].concat.apply([], cs.map(function (c) { return c.days.map(function (x) { return [c.name, x.date, x.waves_min_m, x.waves_max_m, x.wave_dir, x.sea_temp_min_c, x.sea_temp_max_c] }) })) } }
  }

  // ---------- uv
  var UVB = [[3, 'Low', '#299501', '#fff'], [6, 'Moderate', '#f7e400', '#111'], [8, 'High', '#f85900', '#111'], [11, 'Very high', '#d8001d', '#fff'], [99, 'Extreme', '#6b49c8', '#fff']]
  function uvBand (v) { for (var i = 0; i < UVB.length; i++) if (v < UVB[i][0]) return UVB[i]; return UVB[4] }
  function uvLegend () { return legend(UVB.map(function (b, i) { return [b[2], b[1] + ' (' + (i ? UVB[i - 1][0] : 0) + (i === 4 ? ' and over' : ' to ' + (b[0] - 0.1).toFixed(1).replace('.0', '')) + ')'] })) }
  R['uv-now'] = function (body, d) {
    var ps = (d.places || []).filter(function (p) { return p.days && p.days.length })
    var dates = []; ps.forEach(function (p) { p.days.forEach(function (x) { if (dates.indexOf(x.date) < 0) dates.push(x.date) }) }); dates.sort()
    var rows = ps.map(function (p) { return { name: p.name || ('Place ' + p.id), p: p } })
    rows.sort(function (a, b) { return a.name < b.name ? -1 : 1 })
    var h = holder(body)
    function draw (di) {
      h.textContent = ''
      var date = dates[di], data = rows.map(function (r) { var v = r.p.days.filter(function (x) { return x.date === date && x.index != null }).map(function (x) { return x.index }); return { name: r.name, v: v.length ? Math.max.apply(null, v) : null } })
      var mx = Math.max(11, Math.ceil(Math.max.apply(null, data.map(function (x) { return x.v || 0 })))), lw = 160, W = 520, sx = lin(0, mx, lw, W - 90), rh = 20
      var svg = root(W, data.length * rh + 26, 'Bars of the forecast UV index for ' + date + ' for ' + data.length + ' places. ' + data.map(function (x) { return x.name + ' ' + (x.v == null ? 'none' : x.v) }).join(', ') + '.', 'viz-sq')
      UVB.slice(0, 4).forEach(function (b) { S(svg, 'line', { x1: sx(b[0]), x2: sx(b[0]), y1: 0, y2: data.length * rh, class: 'grid' }); S(svg, 'text', { x: sx(b[0]), y: data.length * rh + 14, 'text-anchor': 'middle', class: 'm' }, String(b[0])) })
      S(svg, 'text', { x: sx(0), y: data.length * rh + 14, 'text-anchor': 'middle', class: 'm' }, '0')
      data.forEach(function (x, i) {
        var y = i * rh + 2
        S(svg, 'text', { x: lw - 8, y: y + 13, 'text-anchor': 'end' }, x.name)
        if (x.v == null) { S(svg, 'text', { x: lw + 4, y: y + 13, class: 'm' }, 'no value'); return }
        var b = uvBand(x.v)
        tip(S(svg, 'rect', { x: lw, y: y, width: Math.max(3, sx(x.v) - lw), height: 15, rx: 3, fill: b[2], stroke: 'var(--ink)', 'stroke-width': 0.5 }), x.name + ', ' + date + ': UV ' + x.v + ', ' + b[1])
        S(svg, 'text', { x: sx(x.v) + 6, y: y + 12 }, x.v + ' ' + b[1].toLowerCase())
      })
      h.appendChild(svg); h.appendChild(uvLegend())
    }
    buttons(body, dates.map(dayLabel), draw, 0); body.insertBefore(body.lastChild, h)
    draw(0)
    body.appendChild(note('Where a place has several values in one day, the highest is drawn. Bands follow the WHO UV index scale.'))
    return { about: 'IPMA\'s forecast UV index by place for the days it publishes, in WHO colour bands.', by: 'IPMA',
      table: { head: ['Place', 'Date', 'Highest UV index'], rows: [].concat.apply([], rows.map(function (r) { return dates.map(function (dt) { var v = r.p.days.filter(function (x) { return x.date === dt && x.index != null }).map(function (x) { return x.index }); return [r.name, dt, v.length ? Math.max.apply(null, v) : ''] }) })) } }
  }

  // ---------- forecast-now
  R['forecast-now'] = function (body, d) {
    var cs = (d.cities || []).filter(function (c) { return c.days && c.days.length }).sort(function (a, b) { return b.lat - a.lat })
    var dates = cs.length ? cs[0].days.map(function (x) { return x.date }) : []
    var h = holder(body)
    function draw (di) {
      h.textContent = ''
      var rows = cs.map(function (c) { return { c: c, x: c.days.filter(function (x) { return x.date === dates[di] })[0] } }).filter(function (r) { return r.x && r.x.t_min_c != null && r.x.t_max_c != null })
      var lo = Math.floor(Math.min.apply(null, rows.map(function (r) { return r.x.t_min_c })) - 1), hi = Math.ceil(Math.max.apply(null, rows.map(function (r) { return r.x.t_max_c })) + 1)
      var lw = 136, W = 560, sx = lin(lo, hi, lw + 20, W - 100), rh = 19
      var svg = root(W, rows.length * rh + 34, 'Dumbbell chart of forecast minimum and maximum temperature for ' + dates[di] + ' in ' + rows.length + ' places from north to south. ' + rows.map(function (r) { return r.c.name + ' ' + r.x.t_min_c + ' to ' + r.x.t_max_c }).join(', ') + ' degrees Celsius.', 'viz-sq')
      ticksFor(lo, hi, 7).forEach(function (t) { S(svg, 'line', { x1: sx(t), x2: sx(t), y1: 0, y2: rows.length * rh + 14, class: 'grid' }); S(svg, 'text', { x: sx(t), y: rows.length * rh + 26, 'text-anchor': 'middle', class: 'm' }, t + '°') })
      S(svg, 'text', { x: W - 4, y: 12, 'text-anchor': 'end', class: 'm' }, 'rain chance')
      rows.forEach(function (r, i) {
        var y = i * rh + 10 + 8, x = r.x
        S(svg, 'text', { x: lw - 4, y: y + 4, 'text-anchor': 'end' }, r.c.name)
        S(svg, 'line', { x1: sx(x.t_min_c), x2: sx(x.t_max_c), y1: y, y2: y, stroke: 'var(--viz-axis)', 'stroke-width': 3, 'stroke-linecap': 'round' })
        var g = S(svg, 'g'); tip(g, r.c.name + ', ' + dates[di] + ': ' + x.t_min_c + ' to ' + x.t_max_c + ' °C, rain chance ' + (x.rain_prob_pct == null ? 'unknown' : x.rain_prob_pct + '%'))
        S(g, 'circle', { cx: sx(x.t_min_c), cy: y, r: 5, fill: 'var(--viz-c1)', stroke: 'var(--paper)', 'stroke-width': 1.5 })
        S(g, 'circle', { cx: sx(x.t_max_c), cy: y, r: 5, fill: 'var(--viz-c2)', stroke: 'var(--paper)', 'stroke-width': 1.5 })
        S(g, 'text', { x: sx(x.t_min_c) - 9, y: y + 4, 'text-anchor': 'end', class: 'm' }, String(Math.round(x.t_min_c)))
        S(g, 'text', { x: sx(x.t_max_c) + 9, y: y + 4, class: 'm' }, String(Math.round(x.t_max_c)))
        S(svg, 'text', { x: W - 4, y: y + 4, 'text-anchor': 'end' }, x.rain_prob_pct == null ? '' : x.rain_prob_pct + '%')
      })
      h.appendChild(svg)
      h.appendChild(legend([['var(--viz-c1)', 'Lowest temperature'], ['var(--viz-c2)', 'Highest temperature']]))
    }
    buttons(body, dates.map(dayLabel), draw, 0); body.insertBefore(body.lastChild, h)
    draw(0)
    body.appendChild(note('Places run from north (top) to south. Temperatures in degrees Celsius, rain chance as IPMA publishes it.'))
    return { about: 'IPMA\'s forecast low and high temperature for each place, for the day you choose.', by: 'IPMA',
      table: { head: ['Place', 'Date', 'Min C', 'Max C', 'Rain %'], rows: [].concat.apply([], cs.map(function (c) { return c.days.map(function (x) { return [c.name, x.date, x.t_min_c, x.t_max_c, x.rain_prob_pct] }) })) } }
  }

  // ---------- meteoalarm-now
  function levelTimeline (body, items, t0, t1, nowT, labelFn, noun) {
    var rh = 18, lw = 232, W = 600, sx = lin(t0, t1, lw, W - 34)
    var svg = root(W, items.length * rh + 34, 'Timeline of ' + items.length + ' ' + noun + ', from ' + stamp(t0) + ' to ' + stamp(t1) + '.', 'viz-sq')
    timeAxis(svg, sx, t0, t1, 4, items.length * rh + 6, 5)
    if (nowT >= t0 && nowT <= t1) { S(svg, 'line', { x1: sx(nowT), x2: sx(nowT), y1: 2, y2: items.length * rh + 6, stroke: 'var(--ink)', 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }); S(svg, 'text', { x: sx(nowT) + 4, y: 14, class: 'halo b' }, 'time read') }
    items.forEach(function (m, i) {
      var y = 4 + i * rh, a = Math.max(t0, m.a), b = Math.min(t1, m.b)
      S(svg, 'text', { x: lw - 6, y: y + 13, 'text-anchor': 'end' }, labelFn(m))
      tip(S(svg, 'rect', { x: sx(a), y: y + 2, width: Math.max(3, sx(b) - sx(a)), height: 12, rx: 3, fill: LV[m.level] || 'var(--muted)' }), labelFn(m) + ': ' + stamp(m.a) + ' to ' + stamp(m.b))
    })
    body.appendChild(svg)
  }
  R['meteoalarm-now'] = function (body, d) {
    var now = T(d.read_at), ms = (d.messages || []).filter(function (m) { return m.expires_utc && T(m.expires_utc) > now }).map(function (m) { return { m: m, a: T(m.onset_utc || m.sent_utc), b: T(m.expires_utc), level: m.level } })
    if (!ms.length) { empty(body, 'MeteoAlarm showed no message still in force at the time read.'); return { about: 'MeteoAlarm messages for Portugal.', by: 'MeteoAlarm, with IPMA', table: null } }
    ms.sort(function (x, y) { return x.m.area < y.m.area ? -1 : x.m.area > y.m.area ? 1 : x.a - y.a })
    var t0 = Math.min(now, Math.min.apply(null, ms.map(function (x) { return x.a }))), t1 = Math.max.apply(null, ms.map(function (x) { return x.b }))
    levelTimeline(body, ms, t0, t1, now, function (x) { return x.m.area + ', ' + x.m.hazard + ', ' + x.level + (x.m.msg_type && x.m.msg_type !== 'Alert' ? ' (' + x.m.msg_type.toLowerCase() + ')' : '') }, 'MeteoAlarm messages not yet expired')
    body.appendChild(legend([[LV.yellow, 'Yellow'], [LV.orange, 'Orange'], [LV.red, 'Red']]))
    body.appendChild(note('Only messages that had not expired at the time read are drawn. The level is written in each row\'s label.'))
    return { about: 'MeteoAlarm messages for Portugal that had not yet expired, by area, from onset to expiry. The warnings come from IPMA, the national service.', by: 'MeteoAlarm, with IPMA',
      table: { head: ['Area', 'Hazard', 'Level', 'Type', 'Onset UTC', 'Expires UTC'], rows: ms.map(function (x) { return [x.m.area, x.m.hazard, x.level, x.m.msg_type, x.m.onset_utc, x.m.expires_utc] }) } }
  }

  // ---------- raw: obs-raw
  var WANT = ['faro', 'lisboa', 'porto', 'coimbra', 'evora', 'braganca', 'funchal', 'ponta delgada']
  R['obs-raw'] = function (body, d, fig, ctxs) {
    var st = ctxs[1]; if (!st) throw new Error('stations file missing')
    var feats = st.features || st, times = Object.keys(d).sort(), ids = {}
    times.forEach(function (t) { Object.keys(d[t] || {}).forEach(function (k) { ids[k] = 1 }) })
    var names = {}; feats.forEach(function (f) { names[String(f.properties.idEstacao)] = f.properties.localEstacao })
    function tempOf (t, id) { var o = d[t] && d[t][id]; var v = o && o.temperatura; return v == null || v <= -90 ? null : v }
    var series = []
    WANT.forEach(function (w) {
      var best = null, bn = -1
      Object.keys(ids).forEach(function (id) {
        var nm = norm(names[id]); if (!nm || nm.indexOf(w) !== 0 || (w === 'porto' && /^porto (santo|de)/.test(nm))) return
        var n = times.filter(function (t) { return tempOf(t, id) != null }).length
        if (n > bn) { bn = n; best = id }
      })
      if (best && bn > 0) series.push({ id: best, name: names[best], vals: times.map(function (t) { return tempOf(t, best) }) })
    })
    var reporting = Object.keys(ids).filter(function (id) { return times.some(function (t) { return d[t] && d[t][id] }) }).length
    if (!series.length) { empty(body, 'None of the chosen stations had a temperature in the file.'); return { about: 'IPMA raw observations.', by: 'IPMA', table: null } }
    var all = [].concat.apply([], series.map(function (s) { return s.vals.filter(function (v) { return v != null }) }))
    var lo = Math.floor(Math.min.apply(null, all) - 1), hi = Math.ceil(Math.max.apply(null, all) + 1)
    var t0 = T(times[0]), t1 = T(times[times.length - 1]), W = 560, Hh = 320, ml = 34, mr = 120, sx = lin(t0, t1, ml, W - mr), sy = lin(lo, hi, Hh - 28, 8)
    var svg = root(W, Hh, 'Line chart of hourly air temperature in degrees Celsius for ' + series.length + ' stations from ' + stamp(t0) + ' to ' + stamp(t1) + '. ' + series.map(function (s) { var v = s.vals.filter(function (x) { return x != null }); return s.name + ' from ' + Math.min.apply(null, v) + ' to ' + Math.max.apply(null, v) }).join('; ') + '.')
    ticksFor(lo, hi, 6).forEach(function (t) { S(svg, 'line', { x1: ml, x2: W - mr, y1: sy(t), y2: sy(t), class: 'grid' }); S(svg, 'text', { x: ml - 5, y: sy(t) + 4, 'text-anchor': 'end', class: 'm' }, t + '°') })
    timeAxis(svg, sx, t0, t1, 8, Hh - 28, 6)
    var ends = []
    series.forEach(function (s, i) {
      var dd = '', pen = false
      s.vals.forEach(function (v, j) { if (v == null) { pen = false; return } dd += (pen ? 'L' : 'M') + sx(T(times[j])).toFixed(1) + ',' + sy(v).toFixed(1); pen = true })
      tip(S(svg, 'path', { d: dd, class: 'line', stroke: cat(i) }), s.name)
      var li = s.vals.length - 1; while (li >= 0 && s.vals[li] == null) li--
      if (li >= 0) ends.push({ y: sy(s.vals[li]), x: sx(T(times[li])), s: s, i: i })
    })
    ends.sort(function (a, b) { return a.y - b.y })
    for (var k = 1; k < ends.length; k++) if (ends[k].y - ends[k - 1].y < 12) ends[k].y = ends[k - 1].y + 12
    ends.forEach(function (e) { S(svg, 'text', { x: W - mr + 6, y: e.y + 4 }, e.s.name.replace(/ ?[(,/].*/, '')) })
    body.appendChild(svg)
    body.appendChild(legend(series.map(function (s, i) { return [cat(i), s.name] })))
    body.appendChild(note('The raw file holds ' + Object.keys(ids).length + ' stations over ' + times.length + ' hours (' + times[0].replace('T', ' ') + ' to ' + times[times.length - 1].replace('T', ' ') + '); ' + reporting + ' of them reported at least once. IPMA writes -99 for a missing value; those hours are left as gaps. Eight places are drawn.'))
    return { about: 'Hourly air temperature for eight places, read straight from the IPMA observations file.', by: 'IPMA',
      table: { head: ['Hour'].concat(series.map(function (s) { return s.name })), rows: times.map(function (t, j) { return [t].concat(series.map(function (s) { return s.vals[j] == null ? '' : s.vals[j] })) }) } }
  }

  // ---------- raw: warnings-raw
  R['warnings-raw'] = function (body, d) {
    var ws = d.slice().sort(function (a, b) { return T(a.startTime) - T(b.startTime) })
    var by = {}; ws.forEach(function (w) { (by[w.idAreaAviso] || (by[w.idAreaAviso] = [])).push(w) })
    var areas = Object.keys(by).sort(), t0 = Math.min.apply(null, ws.map(function (w) { return T(w.startTime) })), t1 = Math.max.apply(null, ws.map(function (w) { return T(w.endTime) }))
    var lw = 44, W = 560, sx = lin(t0, t1, lw, W - 34), laneH = 5, y = 4, rowsInfo = []
    areas.forEach(function (a) {
      var lanes = []
      by[a].filter(function (w) { return w.awarenessLevelID !== 'green' }).sort(function (p, q) { return T(p.startTime) - T(q.startTime) }).forEach(function (w) {
        var s0 = T(w.startTime), e = T(w.endTime), li = 0
        while (lanes[li] != null && lanes[li] > s0) li++
        lanes[li] = e; w._l = li
      })
      var h = (lanes.length + 1) * laneH + 4
      rowsInfo.push({ a: a, y: y, h: h, nl: lanes.length }); y += h + 6
    })
    var counts = { green: 0, yellow: 0, orange: 0, red: 0 }; ws.forEach(function (w) { counts[w.awarenessLevelID] = (counts[w.awarenessLevelID] || 0) + 1 })
    var svg = root(W, y + 24, 'Gantt chart of all ' + ws.length + ' IPMA warning entries including green, for ' + areas.length + ' areas, from ' + stamp(t0) + ' to ' + stamp(t1) + ': ' + Object.keys(counts).map(function (k) { return counts[k] + ' ' + k }).join(', ') + '.', 'viz-sq')
    timeAxis(svg, sx, t0, t1, 0, y - 4, 6)
    rowsInfo.forEach(function (r) {
      S(svg, 'text', { x: lw - 6, y: r.y + 9, 'text-anchor': 'end' }, r.a)
      by[r.a].forEach(function (w) {
        var a = sx(T(w.startTime)), b = sx(T(w.endTime)), g = w.awarenessLevelID === 'green'
        tip(S(svg, 'rect', { x: a, y: g ? r.y + r.nl * laneH + 2 : r.y + w._l * laneH, width: Math.max(2, b - a), height: laneH - 1.5, rx: 1, fill: LV[w.awarenessLevelID] || 'var(--muted)', style: g ? 'opacity:.45' : null }), r.a + ', ' + w.awarenessTypeName + ', ' + w.awarenessLevelID + ': ' + w.startTime + ' to ' + w.endTime)
      })
    })
    body.appendChild(svg)
    body.appendChild(legend(['green', 'yellow', 'orange', 'red'].map(function (k) { return [LV[k], ucfirst(k) + ': ' + (counts[k] || 0) + ' entries'] })))
    body.appendChild(note('One row per area code; green entries share one pale strip at the bottom of the row; yellow, orange and red stack above it in thin lanes where they overlap. Times are as IPMA published them, without a zone.'))
    return { about: 'Every entry in IPMA\'s warnings file, green included, as a bar from start to end for each area, coloured by awareness level.', by: 'IPMA',
      table: { head: ['Area', 'Type', 'Level', 'Start', 'End'], rows: ws.map(function (w) { return [w.idAreaAviso, w.awarenessTypeName, w.awarenessLevelID, w.startTime, w.endTime] }) } }
  }

  // ---------- raw: fire-raw
  R['fire-raw'] = function (body, d, fig, ctxs) {
    var files = ctxs.filter(Boolean); if (files.length < 1) throw new Error('no file')
    var days = files.map(function (f) { var c = [0, 0, 0, 0, 0, 0]; Object.keys(f.local || {}).forEach(function (k) { var r = f.local[k].data && f.local[k].data.rcm; c[r >= 1 && r <= 5 ? r : 0]++ }); return { date: f.dataPrev, c: c, n: Object.keys(f.local || {}).length } })
    var W = 540, lw = 92, rh = 34, sx = lin(0, Math.max.apply(null, days.map(function (x) { return x.n })), lw, W - 10)
    var svg = root(W, days.length * rh + 10, 'Stacked bars of municipalities per IPMA fire risk class for ' + days.length + ' days. ' + days.map(function (x) { return x.date + ': ' + RCM.map(function (r, i) { return x.c[i + 1] + ' ' + r[0].toLowerCase() }).join(', ') }).join('; ') + '.', 'viz-sq')
    days.forEach(function (x, i) {
      var y = 4 + i * rh, acc = 0
      S(svg, 'text', { x: lw - 8, y: y + 19, 'text-anchor': 'end' }, x.date ? dayLabel(x.date) : 'Day ' + i)
      for (var l = 1; l <= 5; l++) {
        if (!x.c[l]) continue
        var a = sx(acc), b = sx(acc + x.c[l]); acc += x.c[l]
        tip(S(svg, 'rect', { x: a + 1, y: y, width: Math.max(1, b - a - 2), height: 26, rx: 3, fill: RCM[l - 1][1] }), RCM[l - 1][0] + ': ' + x.c[l] + ' municipalities')
        if (b - a > 34) S(svg, 'text', { x: (a + b) / 2, y: y + 18, 'text-anchor': 'middle', style: 'fill:' + (l === 2 || l === 3 ? '#111' : '#fff'), class: 'b' }, String(x.c[l]))
      }
    })
    body.appendChild(svg)
    body.appendChild(legend(RCM.map(function (r) { return [r[1], r[0]] })))
    body.appendChild(note('Counts of municipality codes per class in the raw files. Class 1 is low, 5 is maximum.'))
    return { about: 'How many municipalities IPMA put in each fire risk class, in its three daily files.', by: 'IPMA',
      table: { head: ['Date', 'Low', 'Moderate', 'High', 'Very high', 'Maximum', 'No class'], rows: days.map(function (x) { return [x.date, x.c[1], x.c[2], x.c[3], x.c[4], x.c[5], x.c[0]] }) } }
  }

  // ---------- raw: sea-raw
  R['sea-raw'] = function (body, d) {
    var rows = (d.data || []).map(function (r) { var o = { id: r.globalIdLocal, lat: num(r.latitude) }; ['waveHigh', 'totalSea', 'wavePeriod', 'sst'].forEach(function (k) { o[k + 'Min'] = num(r[k + 'Min']); o[k + 'Max'] = num(r[k + 'Max']) }); o.dir = r.predWaveDir; return o }).sort(function (a, b) { return (b.lat || 0) - (a.lat || 0) })
    if (!rows.length) { empty(body, 'The file holds no sea locations.'); return { about: 'IPMA raw sea forecast.', by: 'IPMA', table: null } }
    var P = [['waveHigh', 'Wave height m'], ['totalSea', 'Total sea m'], ['wavePeriod', 'Wave period s'], ['sst', 'Sea temp C']]
    var lw = 62, cw = 116, W = lw + P.length * cw + 6, rh = 18, top = 34
    var svg = root(W, top + rows.length * rh + 6, 'Dot plot of the raw sea forecast fields for ' + rows.length + ' location ids on ' + (d.forecastDate || 'the day') + ': wave height, total sea, wave period and sea temperature, each from minimum to maximum.', 'viz-sq')
    P.forEach(function (p, j) {
      var vs = [].concat.apply([], rows.map(function (r) { return [r[p[0] + 'Min'], r[p[0] + 'Max']] })).filter(function (v) { return v != null })
      var lo = Math.floor(Math.min.apply(null, vs)), hi = Math.ceil(Math.max.apply(null, vs)); if (hi === lo) hi = lo + 1
      var x0 = lw + j * cw + 8, sx = lin(lo, hi, x0, x0 + cw - 26)
      S(svg, 'text', { x: x0, y: 12, class: 'b' }, p[1])
      S(svg, 'text', { x: x0, y: 26, class: 'm' }, lo); S(svg, 'text', { x: x0 + cw - 26, y: 26, 'text-anchor': 'end', class: 'm' }, hi)
      S(svg, 'line', { x1: x0, x2: x0, y1: top - 4, y2: top + rows.length * rh, class: 'grid' }); S(svg, 'line', { x1: x0 + cw - 26, x2: x0 + cw - 26, y1: top - 4, y2: top + rows.length * rh, class: 'grid' })
      rows.forEach(function (r, i) {
        var a = r[p[0] + 'Min'], b = r[p[0] + 'Max']; if (a == null || b == null) return
        var y = top + i * rh + 8, g = S(svg, 'g'); tip(g, 'Location ' + r.id + ': ' + p[1] + ' ' + a + ' to ' + b)
        S(g, 'line', { x1: sx(a), x2: sx(b), y1: y, y2: y, stroke: 'var(--viz-c1)', 'stroke-width': 2 })
        S(g, 'circle', { cx: sx(a), cy: y, r: 3.5, fill: 'var(--paper)', stroke: 'var(--viz-c1)', 'stroke-width': 2 })
        S(g, 'circle', { cx: sx(b), cy: y, r: 3.5, fill: 'var(--viz-c1)' })
      })
    })
    rows.forEach(function (r, i) { S(svg, 'text', { x: lw - 4, y: top + i * rh + 12, 'text-anchor': 'end' }, String(r.id)) })
    body.appendChild(svg)
    body.appendChild(note('One row per location id (north to south). Hollow dot: minimum. Filled dot: maximum. Each column has its own scale, shown at the top. The raw file gives numbers as text; they are read as numbers here.'))
    return { about: 'The raw fields of IPMA\'s sea forecast for one day, per location id, as the publisher gives them.', by: 'IPMA',
      table: { head: ['Location id', 'Wave from', 'Wave min', 'Wave max', 'Total sea min', 'Total sea max', 'Period min', 'Period max', 'SST min', 'SST max'], rows: rows.map(function (r) { return [r.id, r.dir, r.waveHighMin, r.waveHighMax, r.totalSeaMin, r.totalSeaMax, r.wavePeriodMin, r.wavePeriodMax, r.sstMin, r.sstMax] }) } }
  }

  // ---------- raw: uv-raw
  R['uv-raw'] = function (body, d) {
    var vs = (Array.isArray(d) ? d : d.data || []).map(function (r) { return num(r.iUv) }).filter(function (v) { return v != null })
    if (!vs.length) { empty(body, 'The file holds no UV values.'); return { about: 'IPMA raw UV.', by: 'IPMA', table: null } }
    var nb = Math.max(12, Math.floor(Math.max.apply(null, vs)) + 1), bins = []; for (var i = 0; i < nb; i++) bins.push(0)
    vs.forEach(function (v) { bins[Math.min(nb - 1, Math.floor(v))]++ })
    var mx = Math.max.apply(null, bins), W = 540, Hh = 250, ml = 36, bw = (W - ml - 10) / nb, sy = lin(0, mx, Hh - 30, 18)
    var svg = root(W, Hh, 'Histogram of ' + vs.length + ' raw UV index values, one bar per whole index step: ' + bins.map(function (c, i) { return i + ' to ' + (i + 1) + ': ' + c }).join(', ') + '.', 'viz-sq')
    ticksFor(0, mx, 4).forEach(function (t) { S(svg, 'line', { x1: ml, x2: W - 6, y1: sy(t), y2: sy(t), class: 'grid' }); S(svg, 'text', { x: ml - 5, y: sy(t) + 4, 'text-anchor': 'end', class: 'm' }, String(t)) })
    bins.forEach(function (c, i) {
      var x = ml + i * bw, b = uvBand(i + 0.01)
      S(svg, 'text', { x: x + bw / 2, y: Hh - 14, 'text-anchor': 'middle', class: 'm' }, String(i))
      if (!c) return
      tip(S(svg, 'rect', { x: x + 1, y: sy(c), width: bw - 2, height: sy(0) - sy(c), rx: 3, fill: b[2], stroke: 'var(--ink)', 'stroke-width': 0.5 }), 'UV ' + i + ' to under ' + (i + 1) + ': ' + c + ' values (' + b[1] + ')')
      S(svg, 'text', { x: x + bw / 2, y: sy(c) - 4, 'text-anchor': 'middle' }, String(c))
    })
    S(svg, 'text', { x: ml + (W - ml) / 2, y: Hh - 1, 'text-anchor': 'middle', class: 'm' }, 'iUv, whole steps (lower edge)')
    body.appendChild(svg); body.appendChild(uvLegend())
    body.appendChild(note(vs.length + ' values in the file, from ' + Math.min.apply(null, vs) + ' to ' + Math.max.apply(null, vs) + '. Each value is one place, one day, one period.'))
    return { about: 'How the UV index values in IPMA\'s raw UV file are spread, in WHO colour bands.', by: 'IPMA',
      table: { head: ['UV step', 'Values'], rows: bins.map(function (c, i) { return [i + ' to under ' + (i + 1), c] }) } }
  }

  // ---------- raw: city-raw
  var CITIES = { '1080500': 'Faro' }
  R['city-raw'] = function (body, d, fig) {
    var rows = (d.data || []).map(function (r) { return { date: r.forecastDate, mn: num(r.tMin), mx: num(r.tMax), p: num(r.precipitaProb) } }).sort(function (a, b) { return a.date < b.date ? -1 : 1 })
    var m = /city-(\d+)/.exec(fig.getAttribute('data-src') || ''), nm = m ? (CITIES[m[1]] || 'place ' + m[1]) : 'the place'
    if (!rows.length) { empty(body, 'The file holds no forecast days.'); return { about: 'IPMA raw forecast.', by: 'IPMA', table: null } }
    var lo = Math.floor(Math.min.apply(null, rows.map(function (r) { return r.mn })) - 1), hi = Math.ceil(Math.max.apply(null, rows.map(function (r) { return r.mx })) + 1)
    var W = 540, ml = 40, mr = 20, sx = function (i) { return ml + 30 + i * (W - ml - mr - 60) / Math.max(1, rows.length - 1) }, sy = lin(lo, hi, 190, 16), py = lin(0, 100, 290, 238)
    var svg = root(W, 316, 'Forecast for ' + nm + ' as IPMA\'s raw file gives it. ' + rows.map(function (r) { return r.date + ': ' + r.mn + ' to ' + r.mx + ' degrees, rain chance ' + r.p + ' percent' }).join('; ') + '.', 'viz-sq')
    ticksFor(lo, hi, 5).forEach(function (t) { S(svg, 'line', { x1: ml, x2: W - mr, y1: sy(t), y2: sy(t), class: 'grid' }); S(svg, 'text', { x: ml - 5, y: sy(t) + 4, 'text-anchor': 'end', class: 'm' }, t + '°') })
    var up = '', dn = ''
    rows.forEach(function (r, i) { up += (i ? 'L' : 'M') + sx(i) + ',' + sy(r.mx); dn = 'L' + sx(i) + ',' + sy(r.mn) + dn })
    S(svg, 'path', { d: up + dn + 'Z', fill: 'var(--viz-t1)', style: 'opacity:.35' })
    S(svg, 'path', { d: up, class: 'line', stroke: 'var(--viz-c2)' })
    var dd = ''; rows.forEach(function (r, i) { dd += (i ? 'L' : 'M') + sx(i) + ',' + sy(r.mn) }); S(svg, 'path', { d: dd, class: 'line', stroke: 'var(--viz-c1)' })
    rows.forEach(function (r, i) {
      var g = S(svg, 'g'); tip(g, r.date + ': ' + r.mn + ' to ' + r.mx + ' °C, rain chance ' + r.p + '%')
      S(g, 'circle', { cx: sx(i), cy: sy(r.mx), r: 4, fill: 'var(--viz-c2)', stroke: 'var(--paper)', 'stroke-width': 1.5 }); S(g, 'circle', { cx: sx(i), cy: sy(r.mn), r: 4, fill: 'var(--viz-c1)', stroke: 'var(--paper)', 'stroke-width': 1.5 })
      S(g, 'text', { x: sx(i), y: sy(r.mx) - 9, 'text-anchor': 'middle' }, String(r.mx)); S(g, 'text', { x: sx(i), y: sy(r.mn) + 18, 'text-anchor': 'middle' }, String(r.mn))
      S(g, 'rect', { x: sx(i) - 14, y: py(r.p || 0), width: 28, height: Math.max(1, 290 - py(r.p || 0)), rx: 3, fill: 'var(--viz-b4)' })
      S(g, 'text', { x: sx(i), y: py(r.p || 0) - 4, 'text-anchor': 'middle' }, (r.p == null ? '' : r.p) + '%')
      S(g, 'text', { x: sx(i), y: 308, 'text-anchor': 'middle', class: 'm' }, dayLabel(r.date))
    })
    S(svg, 'text', { x: ml, y: 218, class: 'b' }, 'Rain chance (precipitaProb, %)')
    S(svg, 'text', { x: ml, y: 10, class: 'b' }, 'Temperature (tMax orange, tMin blue)')
    body.appendChild(svg)
    body.appendChild(legend([['var(--viz-c2)', 'tMax'], ['var(--viz-c1)', 'tMin'], ['var(--viz-b4)', 'precipitaProb']]))
    return { about: 'IPMA\'s raw daily forecast for ' + nm + ': lowest and highest temperature and the chance of rain, by forecast date.', by: 'IPMA',
      table: { head: ['forecastDate', 'tMin', 'tMax', 'precipitaProb'], rows: rows.map(function (r) { return [r.date, r.mn, r.mx, r.p] }) } }
  }

  // ---------- raw: meteoalarm-raw
  R['meteoalarm-raw'] = function (body, d) {
    var ms = (d.warnings || []).map(function (w) {
      var a = w.alert || {}, info = (a.info || [])[0] || {}, pr = {}; (info.parameter || []).forEach(function (p) { pr[p.valueName] = p.value })
      var lv = ((pr.awareness_level || '').split(';')[1] || '').trim().toLowerCase(), hz = ((pr.awareness_type || '').split(';')[1] || '').trim()
      return { t: T(a.sent), sent: a.sent, level: lv || 'unknown', hazard: hz || 'unknown', area: ((info.area || [])[0] || {}).areaDesc || '', type: a.msgType }
    }).filter(function (m) { return isFinite(m.t) })
    if (!ms.length) { empty(body, 'The file holds no messages.'); return { about: 'MeteoAlarm raw feed.', by: 'MeteoAlarm', table: null } }
    var hz = {}; ms.forEach(function (m) { hz[m.hazard] = (hz[m.hazard] || 0) + 1 })
    var hs = Object.keys(hz).sort(function (a, b) { return hz[b] - hz[a] || (a < b ? -1 : 1) }), lvs = ['yellow', 'orange', 'red']
    var t0 = Math.min.apply(null, ms.map(function (m) { return m.t })), t1 = Math.max.apply(null, ms.map(function (m) { return m.t })), rh = 32, lw = 120, W = 560, sx = lin(t0, t1 === t0 ? t0 + 36e5 : t1, lw, W - 40)
    var svg = root(W, hs.length * rh + 34, 'Dot chart of ' + ms.length + ' MeteoAlarm messages by hazard and level against the time each was sent, from ' + stamp(t0) + ' to ' + stamp(t1) + '. ' + hs.map(function (h) { return h + ' ' + hz[h] }).join(', ') + '.', 'viz-sq')
    timeAxis(svg, sx, t0, t1 === t0 ? t0 + 36e5 : t1, 4, hs.length * rh + 4, 5)
    hs.forEach(function (h, i) {
      var y = 4 + i * rh
      S(svg, 'text', { x: lw - 8, y: y + 18, 'text-anchor': 'end' }, h + ' (' + hz[h] + ')')
      S(svg, 'line', { x1: lw, x2: W - 40, y1: y + rh - 1, y2: y + rh - 1, class: 'grid' })
      ms.filter(function (m) { return m.hazard === h }).forEach(function (m) {
        var li = Math.max(0, lvs.indexOf(m.level))
        tip(S(svg, 'circle', { cx: sx(m.t), cy: y + 7 + li * 8, r: 3.3, fill: LV[m.level] || 'var(--muted)', stroke: 'var(--ink)', 'stroke-width': 0.6 }), m.area + ', ' + m.hazard + ', ' + m.level + ', ' + (m.type || '') + ', sent ' + m.sent)
      })
    })
    body.appendChild(svg)
    var lc = {}; ms.forEach(function (m) { lc[m.level] = (lc[m.level] || 0) + 1 })
    body.appendChild(legend(lvs.map(function (k) { return [LV[k], ucfirst(k) + ': ' + (lc[k] || 0) + ' messages'] })))
    body.appendChild(note('Within each hazard row the dots sit in three lanes: yellow, orange, red from top to bottom. One dot per message, placed at the time it was sent.'))
    return { about: 'The messages in MeteoAlarm\'s Portugal feed, counted by hazard and level against the time each was sent. The warnings come from IPMA.', by: 'MeteoAlarm, with IPMA',
      table: { head: ['Sent', 'Area', 'Hazard', 'Level', 'Type'], rows: ms.map(function (m) { return [m.sent, m.area, m.hazard, m.level, m.type] }) } }
  }

  // ---------- storm
  R['storm-wind'] = function (body, d, fig, ctxs) {
    if (!window.PTWind) throw new Error('wind.js is not loaded')
    window.PTWind.draw(fig, d, ctxs[1])
    return { about: 'A weather model\'s wind at 10 m and sea-level pressure over the north-east Atlantic during Storm Charles, from the archived field. A model\'s field, not an observation and not a warning.', by: 'Open-Meteo (CC BY 4.0), kept by the Storm Charles archive', srcLink: d.source, table: null,
      read: d.read_utc, plain: true }
  }
  R['storm-datasets'] = function (body, d) {
    var ds = (d.datasets || []).slice(), groups = {}
    ds.forEach(function (x) { var g = x.dataset.split('/')[0]; (groups[g] || (groups[g] = { name: g, items: [], bytes: 0 })).items.push(x); groups[g].bytes += x.bytes })
    var gs = Object.keys(groups).map(function (k) { return groups[k] }).sort(function (a, b) { return b.bytes - a.bytes })
    gs.forEach(function (g) { g.items.sort(function (a, b) { return b.bytes - a.bytes }) })
    var mx = Math.max.apply(null, ds.map(function (x) { return x.bytes })) || 1, lw = 190, W = 560, sx = lin(0, mx, 0, W - lw - 90), rh = 17, y = 4, rows = []
    gs.forEach(function (g) { rows.push({ head: g }); g.items.forEach(function (x) { rows.push({ x: x, g: g }) }) })
    var svg = root(W, rows.length * rh + 12, 'Horizontal bars of bytes per dataset in the Storm Charles archive, grouped by top folder: ' + gs.map(function (g) { return g.name + ' ' + fmtBytes(g.bytes) + ' in ' + g.items.length + (g.items.length === 1 ? ' dataset' : ' datasets') }).join(', ') + '.', 'viz-sq')
    var gi = {}; gs.forEach(function (g, i) { gi[g.name] = i })
    rows.forEach(function (r, i) {
      var yy = y + i * rh
      if (r.head) { S(svg, 'text', { x: 0, y: yy + 12, class: 'b' }, r.head.name + ' (' + fmtBytes(r.head.bytes) + ', ' + r.head.items.length + (r.head.items.length === 1 ? ' dataset)' : ' datasets)')); return }
      S(svg, 'text', { x: lw - 6, y: yy + 12, 'text-anchor': 'end' }, r.x.dataset.split('/').slice(1).join('/') || r.x.dataset)
      tip(S(svg, 'rect', { x: lw, y: yy + 1, width: Math.max(2, sx(r.x.bytes)), height: 12, rx: 3, fill: cat(gi[r.g.name]) }), r.x.dataset + ': ' + fmtBytes(r.x.bytes) + ' in ' + r.x.files + ' files')
      S(svg, 'text', { x: lw + Math.max(2, sx(r.x.bytes)) + 5, y: yy + 12, class: 'm' }, fmtBytes(r.x.bytes))
    })
    body.appendChild(svg)
    body.appendChild(note((d.counts ? d.counts.files + ' files, ' + fmtBytes(d.counts.bytes) + ' in ' + d.counts.datasets + ' datasets. ' : '') + 'Bars show bytes; each top folder has its own colour.'))
    return { about: 'The size of each dataset in the archived Storm Charles data, grouped by top folder.', by: 'storm-charles.promptugal.news',
      table: { head: ['Dataset', 'Files', 'Bytes'], rows: ds.map(function (x) { return [x.dataset, x.files, x.bytes] }) } }
  }

  // ---------- pipeline charts (data.b.design@, 18 Nov): events, claims, social, contracts, gaps
  var PLACES = { lisboa: 'Lisboa', lagos: 'Lagos', tavira: 'Tavira', faro: 'Faro', albufeira: 'Albufeira', alcoutim: 'Alcoutim', aljezur: 'Aljezur', algarve: 'Algarve (region)', 'castro-marim': 'Castro Marim', lagoa: 'Lagoa', loule: 'Loulé', monchique: 'Monchique', olhao: 'Olhão', portimao: 'Portimão', quarteira: 'Quarteira', 'sao-bras-de-alportel': 'São Brás de Alportel', silves: 'Silves', 'vila-do-bispo': 'Vila do Bispo', 'vila-real-de-santo-antonio': 'Vila Real de Santo António' }
  function pname (k) { return PLACES[k] || ucfirst(String(k).replace(/-/g, ' ')) }
  function fmtN (n) { return Number(n).toLocaleString('en-GB') }
  function eur (n) { return '€' + Math.round(n).toLocaleString('en-GB') }
  function eurShort (n) { return n >= 1e6 ? '€' + (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? '€' + Math.round(n / 1e3) + 'k' : '€' + Math.round(n) }
  function dayIso (ms) { return new Date(ms).toISOString().slice(0, 10) }
  function analysis (body, txt) { var p = H('p', 'viz-analysis', txt); body.appendChild(p); return p }
  var CCLIC = { text: 'Licence: counts and drawing CC BY 4.0; the listings behind them keep their publishers\' terms.', url: 'https://creativecommons.org/licenses/by/4.0/' }
  // rows: [{label, segs:[{v, fill, name}], text}]; stacked horizontal bars, one row each
  function hbars (rows, o) {
    var W = o.W || 560, lw = o.lw || 150, rh = o.rh || 22, tw = o.tw || 96, sx
    var mx = Math.max(1, Math.max.apply(null, rows.map(function (r) { return r.segs.reduce(function (a, s) { return a + s.v }, 0) })))
    sx = lin(0, mx, 0, W - lw - tw)
    var gaps = rows.filter(function (r) { return r.gap }).length * 8, svg = root(W, rows.length * rh + 6 + gaps, o.aria, 'viz-sq'), off = 0
    rows.forEach(function (r, i) {
      if (r.gap) off += 8
      var y = i * rh + 3 + off, x = lw, tot = 0, ty = y + (rh - 6) / 2 + 4
      S(svg, 'text', { x: lw - 8, y: ty, 'text-anchor': 'end' }, r.label)
      r.segs.forEach(function (s) {
        if (!(s.v > 0)) return
        var w = Math.max(2, sx(s.v))
        tip(S(svg, 'rect', { x: x, y: y, width: w, height: rh - 6, rx: 2, fill: s.fill }), r.label + (s.name ? ', ' + s.name : '') + ': ' + (s.tip || fmtN(s.v)))
        x += w; tot += s.v
      })
      S(svg, 'text', { x: x + 5, y: ty, class: 'm' }, r.text != null ? r.text : fmtN(tot))
    })
    return svg
  }
  // columns: days[] of {label, segs:[v...]}, series names/colours; vertical stacked columns
  function stackCols (days, series, aria, every) {
    var W = 560, Hh = 230, ml = 34, mr = 6, top = 10, bot = Hh - 26, n = days.length, bw = (W - ml - mr) / n
    var mx = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.segs.reduce(function (a, v) { return a + v }, 0) })))
    var sy = lin(0, mx, bot, top), svg = root(W, Hh, aria, 'viz-sq')
    ticksFor(0, mx, 4).forEach(function (t) { S(svg, 'line', { x1: ml, x2: W - mr, y1: sy(t), y2: sy(t), class: 'grid' }); S(svg, 'text', { x: ml - 5, y: sy(t) + 4, 'text-anchor': 'end', class: 'm' }, String(t)) })
    days.forEach(function (d, i) {
      var x = ml + i * bw, acc = 0
      d.segs.forEach(function (v, k) {
        if (!(v > 0)) return
        tip(S(svg, 'rect', { x: x + 0.5, y: sy(acc + v), width: Math.max(1, bw - 1), height: Math.max(0.5, sy(acc) - sy(acc + v)), fill: series[k].fill }), d.label + ', ' + series[k].name + ': ' + v)
        acc += v
      })
      if (i % every === 0) S(svg, 'text', { x: x + bw / 2, y: Hh - 10, 'text-anchor': 'middle', class: 'm' }, d.short)
    })
    S(svg, 'line', { x1: ml, x2: W - mr, y1: bot, y2: bot, class: 'axis' })
    return svg
  }

  // events-calendar
  R['events-calendar'] = function (body, d) {
    var pl = ['lisboa', 'lagos', 'tavira', 'faro'], ev = d.places || {}, rd = String(d.read_at || '').slice(0, 10), t0 = T(rd + 'T00:00:00Z')
    if (!isFinite(t0)) throw new Error('no read_at')
    var days = [], totals = pl.map(function (p) { return (ev[p] || []).length }), grand = totals.reduce(function (a, b) { return a + b }, 0)
    for (var i = 0; i < 60; i++) {
      var ms = t0 + i * 864e5, iso = dayIso(ms)
      days.push({ iso: iso, label: dayLabel(iso), short: dm(ms), segs: pl.map(function (p) { return (ev[p] || []).filter(function (e) { var s = e.startDate; return s && s <= iso && iso <= (e.endDate || s) }).length }) })
    }
    var series = pl.map(function (p, k) { return { name: pname(p), fill: cat(k) } })
    var best = 0; days.forEach(function (x, i) { var a = x.segs.reduce(function (p, q) { return p + q }, 0), b = days[best].segs.reduce(function (p, q) { return p + q }, 0); if (a > b) best = i })
    var top = 0; totals.forEach(function (v, k) { if (v > totals[top]) top = k })
    var bt = days[best].segs.reduce(function (p, q) { return p + q }, 0)
    body.appendChild(stackCols(days, series, 'Stacked columns of events on each of the next 60 days from ' + dmy(t0) + ', by place: ' + pl.map(function (p, k) { return pname(p) + ' ' + totals[k] + ' events' }).join(', ') + '. Busiest day ' + days[best].label + ' with ' + bt + '.', 10))
    body.appendChild(legend(pl.map(function (p, k) { return [cat(k), pname(p) + ': ' + fmtN(totals[k]) + ' events'] })))
    analysis(body, pname(pl[top]) + ' has the most events (' + fmtN(totals[top]) + ' of ' + fmtN(grand) + '). The busiest day is ' + days[best].label + ', with ' + fmtN(bt) + ' events on.')
    body.appendChild(note('An event counts on every day from its start to its end date, so a long exhibition adds to each of its days. Only the four places with a readable agenda are drawn.'))
    var prov = d.provenance || {}
    return { about: 'Events on each of the next 60 days in Lisboa, Lagos, Tavira and Faro, from the agendas we are allowed to read.', plain: true, by: '', srcLinks: (prov.sources || []).map(function (s) { return [s.host, s.route] }), licence: CCLIC,
      table: { head: ['Date'].concat(pl.map(pname), ['All']), rows: days.map(function (x) { return [x.iso].concat(x.segs, [x.segs.reduce(function (a, b) { return a + b }, 0)]) }) } }
  }

  // events-claims
  R['events-claims'] = function (body, d) {
    var ps = (d.places || []).slice().sort(function (a, b) { return b.claims - a.claims || (a.place < b.place ? -1 : 1) }), shown = ps.filter(function (p) { return p.claims > 0 })
    var C = ['var(--viz-c1)', 'var(--viz-c3)', 'var(--viz-c4)'], tot = { c: 0, k: 0, w: 0 }
    ps.forEach(function (p) { tot.c += p.claims; tot.k += p.confirmed; tot.w += p.withheld })
    if (!shown.length) { empty(body, 'No event claims were found at the time read.'); return { about: 'Event claims by place.', plain: true, by: 'PrompTugal.news', table: null } }
    var rows = []
    shown.forEach(function (p) {
      var nm = pname(p.place)
      rows.push({ label: nm, gap: true, segs: [{ v: p.claims, fill: C[0], name: 'found through Perplexity' }] })
      rows.push({ label: '', segs: [{ v: p.confirmed, fill: C[1], name: 'confirmed' }], text: p.confirmed + ' confirmed' })
      rows.push({ label: '', segs: [{ v: p.withheld, fill: C[2], name: 'details withheld' }], text: p.withheld + ' withheld' })
    })
    var svg = hbars(rows, { aria: 'Bars per place of event claims found through Perplexity, confirmed, and with details withheld, ' + shown.length + ' places. ' + shown.map(function (p) { return pname(p.place) + ' ' + p.claims + ' found, ' + p.confirmed + ' confirmed, ' + p.withheld + ' withheld' }).join('; ') + '.', lw: 170, rh: 18, tw: 90 })
    body.appendChild(svg)
    body.appendChild(legend([[C[0], 'Found through Perplexity'], [C[1], 'Confirmed by a source we may read'], [C[2], 'Details withheld']]))
    analysis(body, tot.k + ' of ' + tot.c + ' claims are confirmed (' + (tot.c ? Math.round(tot.k / tot.c * 100) : 0) + ' per cent); ' + tot.w + ' have their details withheld.')
    body.appendChild(note('A claim is a name, date and place from Perplexity (sonar, through OpenRouter), not a listing. It is confirmed only when a source we may read says the same. Places with no claims are left out of the bars: ' + (ps.length - shown.length) + '.'))
    var lic = d.license || {}
    return { about: 'Event claims per place: found through Perplexity, confirmed, and withheld.', plain: true, by: 'PrompTugal.news discovery and source register', licence: { text: 'Licence: ' + (lic.name || 'CC BY 4.0') + '.', url: lic.url || 'https://creativecommons.org/licenses/by/4.0/' }, read: d.read_at,
      table: { head: ['Place', 'Found through Perplexity', 'Confirmed', 'Details withheld'], rows: ps.map(function (p) { return [pname(p.place), p.claims, p.confirmed, p.withheld] }) } }
  }

  // social-pulse
  R['social-pulse'] = function (body, d) {
    var posts = d.posts || [], rd = String(d.read_at || '').slice(0, 10), t0 = T(rd + 'T00:00:00Z') - 29 * 864e5
    if (!isFinite(t0)) throw new Error('no read_at')
    var orgs = {}; posts.forEach(function (p) { orgs[p.organisation] = (orgs[p.organisation] || 0) + 1 })
    var on = Object.keys(orgs).sort(function (a, b) { return orgs[b] - orgs[a] || (a < b ? -1 : 1) }), idx = {}; on.forEach(function (o, i) { idx[o] = i })
    var days = [], byDay = {}
    for (var i = 0; i < 30; i++) { var iso = dayIso(t0 + i * 864e5); byDay[iso] = days.length; days.push({ iso: iso, label: dayLabel(iso), short: dm(t0 + i * 864e5), segs: on.map(function () { return 0 }) }) }
    var inWin = 0
    posts.forEach(function (p) { var k = byDay[String(p.posted_at).slice(0, 10)]; if (k != null) { days[k].segs[idx[p.organisation]]++; inWin++ } })
    if (!posts.length) { empty(body, 'No public posts were read.'); return { about: 'Posts per day by organisation.', plain: true, by: 'public APIs', table: null } }
    var series = on.map(function (o, i) { return { name: o, fill: cat(i) } })
    var bd = 0; days.forEach(function (x, i) { var a = x.segs.reduce(function (p, q) { return p + q }, 0); if (a > days[bd].segs.reduce(function (p, q) { return p + q }, 0)) bd = i })
    body.appendChild(stackCols(days, series, 'Stacked columns of public posts per day for the last 30 days by organisation: ' + on.map(function (o) { return o + ' ' + orgs[o] }).join(', ') + '. ' + inWin + ' posts in the window.', 5))
    body.appendChild(legend(on.map(function (o, i) { return [cat(i), o + ': ' + orgs[o]] })))
    function tally (key) { var m = {}; posts.forEach(function (p) { (p[key] || []).forEach(function (v) { m[v] = (m[v] || 0) + 1 }) }); return Object.keys(m).sort(function (a, b) { return m[b] - m[a] || (a < b ? -1 : 1) }).slice(0, 8).map(function (k) { return { k: k, v: m[k] } }) }
    var tp = tally('topics'), pl = tally('places')
    body.appendChild(H('p', 'viz-sub', 'Top topics matched'))
    if (tp.length) body.appendChild(hbars(tp.map(function (x) { return { label: x.k.length <= 2 ? x.k.toUpperCase() : ucfirst(x.k.replace(/-/g, ' ')), segs: [{ v: x.v, fill: 'var(--viz-c2)', name: 'posts' }] } }), { aria: 'Bars of the most matched topics: ' + tp.map(function (x) { return x.k + ' ' + x.v }).join(', ') + '.', lw: 150, rh: 20 })); else empty(body, 'No post matched a topic.')
    body.appendChild(H('p', 'viz-sub', 'Top places matched'))
    if (pl.length) body.appendChild(hbars(pl.map(function (x) { return { label: pname(x.k), segs: [{ v: x.v, fill: 'var(--viz-c3)', name: 'posts' }] } }), { aria: 'Bars of the most matched places: ' + pl.map(function (x) { return pname(x.k) + ' ' + x.v }).join(', ') + '.', lw: 150, rh: 20 })); else empty(body, 'No post matched a place.')
    analysis(body, fmtN(inWin) + ' posts from ' + on.length + ' organisations in the last 30 days; ' + on[0] + ' posted the most (' + orgs[on[0]] + '). The busiest day was ' + days[bd].label + '.')
    var latest = posts.slice().sort(function (a, b) { return T(b.posted_at) - T(a.posted_at) }).slice(0, 5)
    var ul = H('ul', 'viz-links'); latest.forEach(function (p) { var li = H('li'); li.appendChild(link(p.url, p.organisation + ', ' + stamp(T(p.posted_at)))); ul.appendChild(li) })
    body.appendChild(H('p', 'viz-sub', 'Latest posts, by link')); body.appendChild(ul)
    body.appendChild(note('Counts only: the data holds links, times, topics and places, no post text. Organisations\' official accounts only.'))
    var prov = d.provenance || {}
    return { about: 'Public posts by the official accounts of organisations, per day for 30 days, with the topics and places we matched.', plain: true, by: '', srcLinks: (prov.sources || []).map(function (s) { return [s.platform, s.api] }), licence: { text: 'Licence: counts and drawing CC BY 4.0; posts stay under the platform\'s terms.', url: 'https://creativecommons.org/licenses/by/4.0/' },
      table: { head: ['Date'].concat(on, ['All']), rows: days.map(function (x) { return [x.iso].concat(x.segs, [x.segs.reduce(function (a, b) { return a + b }, 0)]) }) } }
  }

  // cams-status (data.b@PrompTugal.dinis, 18 Nov 2026): each public camera, whether its operator's page is up, and since when
  R['cams-status'] = function (body, d) {
    var cams = d.cameras || []
    if (!cams.length) { empty(body, 'No camera is registered yet.'); return { about: 'Public cameras and their status.', plain: true, by: 'operators\' pages', table: null } }
    var ST = { up: [cat(2), 'up'], 'page up, no player seen': [cat(4), 'page up, no player seen'], down: [cat(1), 'down'], 'not checked': ['var(--muted, #888)', 'not checked (the host refused us)'] }
    cams = cams.slice().sort(function (a, b) { return (a.place < b.place ? -1 : a.place > b.place ? 1 : 0) || (a.name < b.name ? -1 : 1) })
    body.appendChild(hbars(cams.map(function (c) { var pct = c.checks ? Math.round(100 * (c.up_checks || 0) / c.checks) : 0; return { label: pname(c.place) + ': ' + String(c.name).slice(0, 34), segs: [{ v: Math.max(pct, 1), fill: (ST[c.state] || ST.down)[0], name: c.state, tip: pct + ' per cent of ' + c.checks + ' checks' }], text: pct + '% of ' + c.checks } }), { aria: 'Bars of the share of hourly checks in which each camera\'s page was up: ' + cams.map(function (c) { return c.name + ' ' + c.state }).join('; ') + '.', lw: 250, rh: 22, tw: 80 }))
    body.appendChild(legend(Object.keys(ST).map(function (k) { return [ST[k][0], 'now ' + ST[k][1]] })))
    var chk = cams.filter(function (c) { return c.state !== 'not checked' }), up = chk.filter(function (c) { return c.state !== 'down' }).length
    analysis(body, up + ' of ' + chk.length + ' checked cameras\' pages answered at the last check (' + stamp(T(cams[0].checked_at)) + '), in ' + Object.keys(d.by_place || {}).length + ' places; ' + (cams.length - chk.length) + ' listed by link only, not checked.')
    var ul = H('ul', 'viz-links'); cams.forEach(function (c) { var li = H('li'); li.appendChild(link(c.page, c.name)); li.appendChild(document.createTextNode(', ' + c.operator + ', ' + c.state + ' since ' + stamp(T(c.since)))); ul.appendChild(li) })
    body.appendChild(H('p', 'viz-sub', 'Watch each camera on its operator\'s page')); body.appendChild(ul)
    body.appendChild(note('Status from the operator\'s page only: no frame, picture or stream is fetched, kept or analysed.'))
    return { about: 'Public live cameras: the share of hourly checks in which each operator\'s page answered, and the state now.', plain: true, by: 'each camera\'s operator (register/cams.json)', licence: { text: 'Licence: status and drawing CC BY 4.0; each camera stays under its operator\'s terms.', url: 'https://creativecommons.org/licenses/by/4.0/' },
      table: { head: ['Camera', 'Place', 'Operator', 'State', 'Since', 'Checks', 'Up'], rows: cams.map(function (c) { return [c.name, pname(c.place), c.operator, c.state, c.since, c.checks, c.up_checks] }) } }
  }

  // contracts-by-place
  R['contracts-by-place'] = function (body, d) {
    var pl = d.places || {}, KINDS = [['council', 'Council'], ['municipal company', 'Municipal company'], ['municipal service', 'Municipal service']], all = [], rows = []
    Object.keys(pl).forEach(function (k) { var v = 0, n = 0, by = {}; (pl[k] || []).forEach(function (c) { all.push(c); n++; var p = num(c.price_eur) || 0; v += p; by[c.buyer_kind] = (by[c.buyer_kind] || 0) + p }); rows.push({ k: k, n: n, v: v, by: by }) })
    if (!all.length) { empty(body, 'No contracts were read.'); return { about: 'Public contracts by place.', by: 'Portal BASE', table: null } }
    rows.sort(function (a, b) { return b.v - a.v })
    var total = rows.reduce(function (a, r) { return a + r.v }, 0)
    body.appendChild(hbars(rows.map(function (r) { return { label: pname(r.k), segs: KINDS.map(function (kk, i) { return { v: r.by[kk[0]] || 0, fill: cat(i), name: kk[1].toLowerCase(), tip: eur(r.by[kk[0]] || 0) } }), text: eurShort(r.v) + ', ' + r.n } }), { aria: 'Stacked bars of total contract value per place, split by buyer kind, sorted: ' + rows.map(function (r) { return pname(r.k) + ' ' + eur(r.v) + ' in ' + r.n + ' contracts' }).join('; ') + '.', lw: 170, rh: 22, tw: 120 }))
    body.appendChild(legend(KINDS.map(function (kk, i) { return [cat(i), kk[1]] })))
    var pc = {}; all.forEach(function (c) { var p = c.procedure || 'not stated'; pc[p] = (pc[p] || 0) + 1 })
    var pk = Object.keys(pc).sort(function (a, b) { return pc[b] - pc[a] })
    body.appendChild(H('p', 'viz-sub', 'Contracts by procedure type'))
    body.appendChild(hbars(pk.map(function (k) { return { label: k, segs: [{ v: pc[k], fill: 'var(--viz-c1)', name: 'contracts' }] } }), { aria: 'Bars of contract count by procedure type: ' + pk.map(function (k) { return k + ' ' + pc[k] }).join(', ') + '.', lw: 250, rh: 20, tw: 60 }))
    var buy = {}; all.forEach(function (c) { var n = (c.contracting_entity && c.contracting_entity.name) || 'not stated'; buy[n] = (buy[n] || 0) + (num(c.price_eur) || 0) })
    var bn = Object.keys(buy).sort(function (a, b) { return buy[b] - buy[a] })[0]
    var direct = all.filter(function (c) { return /^ajuste direto/i.test(c.procedure || '') }), dv = direct.reduce(function (a, c) { return a + (num(c.price_eur) || 0) }, 0)
    analysis(body, 'The largest buyer by value is ' + bn + ' (' + eur(buy[bn]) + ', ' + Math.round(buy[bn] / total * 100) + ' per cent of ' + eur(total) + '). Direct awards (ajuste direto) are ' + Math.round(direct.length / all.length * 100) + ' per cent of ' + fmtN(all.length) + ' contracts and ' + Math.round(dv / total * 100) + ' per cent of the value.')
    body.appendChild(note('Prices are the contract price in euros as published. Contractors are not named here; where a contractor is a private individual the data says only "a natural person".'))
    var prov = d.provenance || {}
    return { about: 'Public contracts published on Portal BASE in the last ' + ((d.counts && d.counts.window_days) || 90) + ' days: total value and count per place, by kind of buyer, and by procedure type.', by: 'IMPIC, Portal BASE on dados.gov.pt', licence: { text: 'Licence: contract data Outra (Domínio Público); drawing CC BY 4.0.', url: prov.terms_page || prov.dataset },
      table: { head: ['Place', 'Contracts', 'Total value', 'Council', 'Municipal company', 'Municipal service'], rows: rows.map(function (r) { return [pname(r.k), r.n, eur(r.v), eur(r.by.council || 0), eur(r.by['municipal company'] || 0), eur(r.by['municipal service'] || 0)] }) } }
  }

  // gaps-hosts
  R['gaps-hosts'] = function (body, d) {
    var hs = (d.hosts || []).slice().sort(function (a, b) { return b.claims - a.claims || (a.host < b.host ? -1 : 1) }), top = hs.slice(0, 15), tc = hs.reduce(function (a, h) { return a + h.claims }, 0)
    if (!hs.length) { empty(body, 'No cited host is unread.'); return { about: 'Cited hosts we do not read.', plain: true, by: 'PrompTugal.news', table: null } }
    body.appendChild(hbars(top.map(function (h) { return { label: h.host, segs: [{ v: h.claims, fill: 'var(--viz-c2)', name: 'claims', tip: h.claims + ' claims, ' + (h.places || []).length + ' places' }] } }), { aria: 'Horizontal bars of the ' + top.length + ' hosts cited most for events that we do not read, by claims: ' + top.map(function (h) { return h.host + ' ' + h.claims }).join(', ') + '.', lw: 190, rh: 20, tw: 50 }))
    analysis(body, hs.length + ' cited hosts are not read by us, behind ' + fmtN(tc) + ' claims. ' + top[0].host + ' is cited most (' + top[0].claims + ' claims, ' + (top[0].places || []).length + ' places).')
    body.appendChild(note('Top 15 of ' + hs.length + ' shown. The source register says why each host is not read.'))
    var lic = d.license || {}
    return { about: 'Hosts cited as evidence for events that this site does not read, ranked by the claims that point to them.', plain: true, by: 'PrompTugal.news source register', read: d.read_at, licence: { text: 'Licence: ' + (lic.name || 'CC BY 4.0') + '.', url: lic.url || 'https://creativecommons.org/licenses/by/4.0/' },
      table: { head: ['Host', 'Claims', 'Places'], rows: hs.map(function (h) { return [h.host, h.claims, (h.places || []).length] }) } }
  }

  // ---------- mount
  function link (href, text) { var a = H('a', '', text); a.href = /^(https?:\/\/|\/)/i.test(href) ? href : '#'; a.rel = 'noopener'; return a }
  function host (u) { try { return new URL(u).host } catch (e) { return u } }
  function getJSON (url) {
    // own host only, no credentials, redirects refused (security@'s points for data in the browser, 19 Nov 2026 ~01:30 UTC)
    var u; try { u = new URL(url, location.href) } catch (e) { return Promise.reject(new Error('bad address')) }
    if (u.origin !== location.origin && u.origin !== 'https://data.promptugal.news') return Promise.reject(new Error('not this site'))
    return fetch(u.href, { headers: { Accept: 'application/json' }, credentials: 'omit', redirect: 'error', referrerPolicy: 'no-referrer' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); var lm = r.headers.get('Last-Modified'); return r.json().then(function (j) { return { j: j, lm: lm } }) })
  }
  function caption (fig, spec, res, src) {
    var cap = H('figcaption'), d = res[0].j, prov = d && d.provenance, raw = /\/raw\//.test(src)
    cap.appendChild(document.createTextNode(spec.about + ' '))
    if (spec.by && !spec.plain) {
      cap.appendChild(document.createTextNode('Source: ' + spec.by + ', '))
      var url = prov && prov.source
      if (url && url.indexOf('{') >= 0) url = (d.files && d.files[0] && d.files[0].source) || (d.cities && d.cities[0] && d.cities[0].source) || null
      if (raw) { cap.appendChild(document.createTextNode('api.ipma.pt'.replace('api.ipma.pt', /meteoalarm/i.test(spec.by) ? 'feeds.meteoalarm.org' : 'api.ipma.pt') + ', the publisher\'s own file kept as read: ')); cap.appendChild(link(src, src.split('/').pop())); cap.appendChild(document.createTextNode('. ')) }
      else if (url) { cap.appendChild(link(url, host(url))); if (prov.page) { cap.appendChild(document.createTextNode(' (')); cap.appendChild(link(prov.page, 'publisher\'s page')); cap.appendChild(document.createTextNode(')')) } cap.appendChild(document.createTextNode('. ')) }
      else cap.appendChild(document.createTextNode('see the data file. '))
    } else if (spec.plain) {
      cap.appendChild(document.createTextNode('Source: ')); if (spec.srcLink) cap.appendChild(link(spec.srcLink, spec.by)); else cap.appendChild(document.createTextNode(spec.by))
      if (spec.srcLinks) spec.srcLinks.forEach(function (l, i) { if (i || spec.by) cap.appendChild(document.createTextNode(', ')); cap.appendChild(link(l[1], l[0])) })
      cap.appendChild(document.createTextNode('. '))
    }
    // the licence travels with the loaded data: the chart's own wording, or else the file's license (security@'s low point, 19 Nov 2026)
    var fl = d && d.license
    if (!spec.licence && fl && typeof fl.name === 'string') { cap.appendChild(document.createTextNode('Licence: ' + fl.name + (fl.holder ? ' (' + fl.holder + ')' : '') + (fl.commercial_use ? '; commercial use ' + fl.commercial_use : '') + '. ')); if (fl.url) { cap.appendChild(link(fl.url, 'Licence terms')); cap.appendChild(document.createTextNode('. ')) } }
    if (spec.licence) { cap.appendChild(document.createTextNode(spec.licence.text + ' ')); if (spec.licence.url) { cap.appendChild(link(spec.licence.url, 'Licence terms')); cap.appendChild(document.createTextNode('. ')) } }
    var read = fig.getAttribute('data-read') || spec.read || (d && (d.read_at || (prov && prov.read_at)))
    var ms = read ? T(read) : (res[0].lm ? Date.parse(res[0].lm) : NaN)
    if (isFinite(ms)) cap.appendChild(document.createTextNode((read ? 'Time read: read ' : 'File dated: ') + stamp(ms).replace(/^(\d+ \w+ \d+), /, '$1, ') + '. '))
    cap.appendChild(document.createTextNode('Drawn in your browser from ')); cap.appendChild(link(src, src)); cap.appendChild(document.createTextNode('.'))
    return cap
  }
  function table (spec) {
    var t = spec.table; if (!t || !t.rows || !t.rows.length) return null
    var det = H('details'), sm = H('summary', '', 'The numbers'), wrap = H('div', 'viz-tablewrap'), tb = H('table'), thead = H('thead'), tr = H('tr')
    t.head.forEach(function (h) { var th = H('th', '', h); th.scope = 'col'; tr.appendChild(th) }); thead.appendChild(tr); tb.appendChild(thead)
    var tbody = H('tbody'); t.rows.slice(0, 400).forEach(function (r) { var row = H('tr'); r.forEach(function (c) { row.appendChild(H('td', '', c == null ? '' : String(c))) }); tbody.appendChild(row) })
    tb.appendChild(tbody); wrap.appendChild(tb); det.appendChild(sm); det.appendChild(wrap)
    if (t.rows.length > 400) det.appendChild(note('First 400 of ' + t.rows.length + ' rows; the data file has all of them.'))
    return det
  }
  function mount (fig) {
    var name = fig.getAttribute('data-viz'), src = fig.getAttribute('data-src'), fb = fig.querySelector('.viz-fallback')
    if (name === 'storm-flightmap' || name === 'storm-hours' || name === 'storm-stations' || name === 'storm-models') return   // drawn by flightmap.js and storm-labs.js (data.b@, 18 Nov)
    var body = H('div', 'viz-body')
    function fail (url, why) {
      var e = H('div', 'viz-error'); e.setAttribute('role', 'status')
      e.appendChild(document.createTextNode('Could not load the data: ')); e.appendChild(link(url, url))
      if (why) e.appendChild(document.createTextNode(' (' + why + ')'))
      if (fb && fb.parentNode) fb.parentNode.replaceChild(e, fb); else fig.insertBefore(e, fig.firstChild)
    }
    if (!R[name]) { fail(src || '', 'no chart named ' + name); return }
    if (!src) { fail('', 'no data-src'); return }
    var urls = [src, fig.getAttribute('data-src2'), fig.getAttribute('data-src3')]
    Promise.all(urls.map(function (u, i) { return u ? (i === 0 ? getJSON(u) : getJSON(u).catch(function () { return null })) : Promise.resolve(null) })).then(function (res) {
      var js = res.map(function (r) { return r && r.j })
      if (fb && fb.parentNode) fb.parentNode.replaceChild(body, fb); else fig.insertBefore(body, fig.firstChild)
      var spec = R[name](body, js[0], fig, js)
      var t = table(spec); if (t) body.appendChild(t)
      fig.appendChild(caption(fig, spec, res, src))
    }).catch(function (err) {
      if (body.parentNode) body.parentNode.removeChild(body)
      var old = fig.querySelector('.viz-error'); if (old) old.parentNode.removeChild(old)
      var fb2 = fig.querySelector('.viz-fallback')
      if (fb2) fb = fb2
      fail(src, err && err.message)
      if (window.console) console.warn('viz ' + name + ': ' + (err && err.message))
    })
  }
  function start () { Array.prototype.forEach.call(document.querySelectorAll('figure.viz'), function (f) { try { mount(f) } catch (e) { if (window.console) console.warn('viz failed', e) } }) }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start()
})()
