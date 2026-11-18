/* PrompTugal data: three Storm Charles charts, drawn in the browser. Apache-2.0. No libraries, no network beyond the data files.
   Ported from PrompTugal__News__Storm-Charles (Apache-2.0), frozen clone at commit fdac6ed. Source files and what was taken:
     storm-hours     app/design/hours.js            input exposure/people-by-hour.json (data-src)
     storm-stations  app/labs/weather.js (stations) inputs weather/stations.json (data-src), weather/warnings.json (data-src2)
     storm-models    app/labs/weather.js (models)   inputs weather/forecast.json (data-src), weather/madeira.json (data-src2),
                                                    weather/lisbon-rain.json (data-src3); app/labs/labs.js helpers re-written here.
   Mount: <figure class="viz" data-viz="storm-hours|storm-stations|storm-models" data-src="..." [data-src2] [data-src3]> holding a
   .viz-fallback. Not a warning service: warnings are IPMA's, forecasts are other people's models, nothing here is our forecast. */
(function () {
  'use strict'
  var NS = 'http://www.w3.org/2000/svg'
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  var HOUR = 3600000, DAY = 86400000
  var CHARTS = { 'storm-hours': hours, 'storm-stations': stations, 'storm-models': models }

  function h(tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e }
  function sv(parent, tag, attrs, txt) {
    var e = document.createElementNS(NS, tag)
    if (attrs) Object.keys(attrs).forEach(function (k) { if (attrs[k] != null) e.setAttribute(k, typeof attrs[k] === 'number' ? Math.round(attrs[k] * 100) / 100 : attrs[k]) })
    if (txt != null) e.textContent = txt
    if (parent) parent.appendChild(e)
    return e
  }
  function title(el, text) { sv(el, 'title', null, text); return el }
  function root(w, ht, label) { var s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 ' + Math.round(w) + ' ' + Math.round(ht)); s.setAttribute('role', 'img'); s.setAttribute('aria-label', label); return s }
  function link(url, txt) { var a = h('a', '', txt || url); a.href = /^(https?:\/\/|\/)/i.test(url) ? url : '#'; return a }
  function T(t) { return typeof t === 'number' ? t : Date.parse(/(Z|[+-]\d\d:?\d\d)$/.test(String(t)) ? t : String(t) + 'Z') }
  function p2(n) { return n < 10 ? '0' + n : String(n) }
  function hm(ms) { var d = new Date(ms); return p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()) }
  function dm(ms) { var d = new Date(ms); return d.getUTCDate() + ' ' + MON[d.getUTCMonth()] }
  function dhm(ms) { return dm(ms) + ' ' + hm(ms) }
  function full(n) { return Number(n).toLocaleString('en-GB') }
  function mil(n) { return (n % 1e6 ? (n / 1e6).toFixed(1) : String(n / 1e6)) + ' M' }
  function num(v) { return typeof v === 'number' && isFinite(v) ? v : null }
  function short(str, n) { str = String(str || ''); return str.length > n ? str.slice(0, n - 1) + '.' : str }
  function width(fig) { return Math.max(300, Math.min(1000, Math.floor(fig.clientWidth || 340))) }
  function path(pts) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1) }).join(' ') }
  function scale(d0, d1, r0, r1) { var k = (r1 - r0) / (d1 - d0); return function (v) { return r0 + (v - d0) * k } }

  // a time axis: grid at each midnight (labelled), lighter ticks at 06, 12 and 18 when there is room
  function timeAxis(g, sc, t0, t1, y0, y1, labelY, W) {
    var first = Math.ceil(t0 / DAY) * DAY, step = (sc(t0 + 6 * HOUR) - sc(t0)) >= 34 ? 6 * HOUR : DAY
    for (var t = Math.ceil(t0 / step) * step; t <= t1; t += step) {
      var x = sc(t), mid = t % DAY === 0
      sv(g, 'line', { x1: x, x2: x, y1: y0, y2: y1, class: mid ? 'day' : 'grid' })
      var lab = mid ? dm(t) : hm(t)
      if (x > 14 && x < W - 14) sv(g, 'text', { x: x, y: labelY, 'text-anchor': 'middle', class: mid ? 'b' : 'm' }, lab)
    }
    return first
  }
  function legend(items) {
    var ul = h('ul', 'sf-legend')
    items.forEach(function (it) {
      var li = h('li'), s = document.createElementNS(NS, 'svg'); s.setAttribute('viewBox', '0 0 28 14'); s.setAttribute('aria-hidden', 'true')
      if (it.k === 'box') sv(s, 'rect', { x: 7, y: 0, width: 14, height: 14, class: it.cls })
      else if (it.k === 'bar') sv(s, 'rect', { x: 9, y: 2, width: 10, height: 12, class: it.cls })
      else sv(s, 'line', { x1: 1, x2: 27, y1: 7, y2: 7, class: it.cls, 'stroke-dasharray': it.dash || null })
      li.appendChild(s); li.appendChild(document.createTextNode(it.text)); ul.appendChild(li)
    })
    return ul
  }
  function table(summary, head, rows) {
    var det = h('details'), wrap = h('div', 'sf-tw'), tb = h('table'), tr = h('tr'), body = h('tbody')
    det.appendChild(h('summary', '', summary))
    head.forEach(function (x) { var th = h('th', '', x); th.scope = 'col'; tr.appendChild(th) })
    var thead = h('thead'); thead.appendChild(tr); tb.appendChild(thead)
    rows.forEach(function (r) { var row = h('tr'); r.forEach(function (c) { row.appendChild(h('td', '', c == null ? '' : String(c))) }); body.appendChild(row) })
    tb.appendChild(body); wrap.appendChild(tb); det.appendChild(wrap); return det
  }
  function caption(shows, sources, srcUrls) {
    var c = h('figcaption'), p = h('p', '', shows); c.appendChild(p)
    var ps = h('p'); ps.appendChild(document.createTextNode('Sources: '))
    sources.forEach(function (s, i) { if (i) ps.appendChild(document.createTextNode('; ')); if (s.url) ps.appendChild(link(s.url, s.text)); else ps.appendChild(document.createTextNode(s.text)) })
    ps.appendChild(document.createTextNode('.')); c.appendChild(ps)
    c.appendChild(h('p', '', 'From the Storm Charles site, frozen record of 10 to 12 November 2026.'))
    var pd = h('p'); pd.appendChild(document.createTextNode('Drawn in your browser from '))
    srcUrls.forEach(function (u, i) { if (i) pd.appendChild(document.createTextNode(' and ')); pd.appendChild(link(u)) })
    pd.appendChild(document.createTextNode('.')); c.appendChild(pd)
    return c
  }

  // ---------- 1. residents under each IPMA level, hour by hour
  var LV = [['red', 'Red'], ['orange', 'Orange'], ['yellow', 'Yellow']]
  function hours(fig, body, js) {
    var d = js[0], hrs = (d.hours || []).filter(function (x) { return x && x.hour_utc })
    if (!hrs.length) { body.appendChild(h('p', 'sf-empty', 'No hours in this read.')); return }
    var tot = function (x) { return (x.red || 0) + (x.orange || 0) + (x.yellow || 0) }
    var max = Math.max.apply(null, hrs.map(tot)) || 1
    var step = max > 8e6 ? 2e6 : max > 3e6 ? 1e6 : 5e5, top = Math.ceil(max / step) * step
    var pk = d.peak || {}, pkh = pk.hour_utc ? hm(T(pk.hour_utc)) : ''
    var worst = pk.red ? ['red', pk.red] : pk.orange ? ['orange', pk.orange] : pk.yellow ? ['yellow', pk.yellow] : null
    body.appendChild(h('p', 'sf-head', worst ? 'About ' + (worst[1] / 1e6).toFixed(1) + ' million residents lived in areas under IPMA ' + worst[0] + ' at ' + pkh + ' UTC (' + dm(T(pk.hour_utc)) + '), the worst hour in this file.' : 'No area is under an IPMA warning in the hours of this read.'))
    var W = width(fig), L = 44, R = 8, Tp = 10, B = 30, H = W < 500 ? 190 : 230, n = hrs.length, cw = (W - L - R) / n
    var y = function (v) { return Tp + H - v / top * H }
    var svg = root(W, Tp + H + B, 'Stacked bars: residents in areas under IPMA red, orange and yellow warnings for each UTC hour from ' + dhm(T(hrs[0].hour_utc)) + ' to ' + dhm(T(hrs[n - 1].hour_utc)) + '. Peak ' + (worst ? 'is ' + worst[0] + ', about ' + (worst[1] / 1e6).toFixed(1) + ' million residents.' : 'is none.'))
    for (var g = 0; g <= top; g += step) {
      sv(svg, 'line', { x1: L, x2: W - R, y1: y(g), y2: y(g), class: 'grid' })
      sv(svg, 'text', { x: L - 5, y: y(g) + 4, 'text-anchor': 'end', class: 'm' }, g ? mil(g) : '0')
    }
    var every = cw >= 22 ? 1 : cw >= 12 ? 2 : 4
    hrs.forEach(function (x, i) {
      var t = T(x.hour_utc), bx = L + i * cw + 1, bw = Math.max(2, cw - 2), base = 0
      LV.forEach(function (lv) {
        var v = x[lv[0]] || 0; if (!v) return
        title(sv(svg, 'rect', { class: 'lv-' + lv[0], x: bx, width: bw, y: y(base + v), height: y(base) - y(base + v) }), hm(t) + ' UTC, ' + dm(t) + ', IPMA ' + lv[1].toLowerCase() + ': ' + full(v) + ' residents')
        base += v
      })
      var mid = new Date(t).getUTCHours() === 0
      if (i % every === 0 || mid) sv(svg, 'text', { x: bx + bw / 2, y: Tp + H + 14, 'text-anchor': 'middle', class: mid ? 'b' : 'm' }, p2(new Date(t).getUTCHours()))
      if (mid) sv(svg, 'text', { x: bx + bw / 2, y: Tp + H + 26, 'text-anchor': 'middle', class: 'b' }, dm(t))
    })
    body.appendChild(svg)
    body.appendChild(legend(LV.map(function (lv) { return { k: 'box', cls: 'lv-' + lv[0], text: 'IPMA ' + lv[1].toLowerCase() } })))
    body.appendChild(h('p', 'sf-note', 'Residents where they sleep (INE census 2021), not people at risk and not visitors. UTC hours. IPMA drops windows that have ended, so hours before the read may be missing: a missing hour is not zero. Read ' + dhm(T(d.read_utc)) + ' UTC. ' + (d.confidence || '')))
    body.appendChild(table('The numbers', ['Hour (UTC)', 'Red', 'Orange', 'Yellow'], hrs.map(function (x) { return [dm(T(x.hour_utc)) + ' ' + hm(T(x.hour_utc)), full(x.red || 0), full(x.orange || 0), full(x.yellow || 0)] })))
    var srcs = [{ text: 'IPMA warnings', url: d.source }]
    ;(d.sources || []).forEach(function (u) { if (/ine\.pt/.test(u)) srcs.push({ text: 'INE census 2021', url: u }) })
    if (d.licence) srcs.push({ text: 'licence: ' + d.licence })
    return caption('Residents living in areas under each IPMA warning level (red, orange, yellow), hour by hour in UTC. It is IPMA\'s warnings as read, multiplied by census residents; it forecasts nothing.', srcs, [fig.getAttribute('data-src')])
  }

  // ---------- 2. warned against observed, every station on one time axis
  var HAZ = { 'Vento': 'Wind', 'Precipitação': 'Rain', 'Agitação Marítima': 'Sea state', 'Trovoada': 'Thunder' }
  function stations(fig, body, js) {
    var d = js[0], w = js[1] || {}, sts = d.stations || []
    var state = null; (w.history || []).forEach(function (x) { if (x.state) state = x })
    var wins = state ? state.state.map(function (a) { return { hz: HAZ[a[0]] || a[0], pt: a[0], lv: a[1], a: T(a[2]), b: T(a[3]), txt: a[4] } }) : []
    var ts = []; sts.forEach(function (st) { st.hourly.forEach(function (r) { ts.push(T(r.time_utc)) }) })
    if (!ts.length) { body.appendChild(h('p', 'sf-empty', 'No station hours in this read.')); return }
    var t0 = Math.min.apply(null, ts) - HOUR / 2, tObs = Math.max.apply(null, ts), t1 = tObs + HOUR / 2
    var W = width(fig), L = 8, R = 8, sc = scale(t0, t1, L, W - R), bw = Math.max(1, (sc(t0 + HOUR) - sc(t0)) - 0.6)
    var maxR = 1, maxW = 1
    sts.forEach(function (st) { st.hourly.forEach(function (r) { maxR = Math.max(maxR, r.rain_mm || 0); maxW = Math.max(maxW, r.wind_mean_kmh || 0) }) })
    var rows = wins.filter(function (x) { return x.b > t0 && x.a < t1 }).sort(function (p, q) { return p.a - q.a })
    var WR = 20, top = 22, SH = 62, y = top
    var H = top + rows.length * WR + (rows.length ? 12 : 0) + sts.length * SH + 6
    body.appendChild(h('p', 'sf-head', sts.length + ' IPMA stations in and next to Lisbon, ' + dhm(t0 + HOUR / 2) + ' to ' + dhm(tObs) + ' UTC. Bars above are IPMA\'s Lisbon warnings for the windows shown; below, the hour-by-hour rain and mean wind each station measured.'))
    var svg = root(W, H, 'Time chart, ' + dm(t0) + ' to ' + dm(t1) + '. ' + rows.length + ' IPMA warning windows for Lisbon, then rain and mean wind for ' + sts.length + ' stations. Peak rain in an hour at any station: ' + maxR + ' mm; peak mean wind: ' + maxW + ' km/h.')
    timeAxis(svg, sc, t0, t1, top - 4, H - 6, 12, W)
    rows.forEach(function (x) {
      var a = Math.max(t0, x.a), b = Math.min(t1, x.b), bx = sc(a), bwid = sc(b) - sc(a), lab = x.hz + ', ' + x.lv + ' ' + hm(x.a) + ' to ' + hm(x.b)
      title(sv(svg, 'rect', { x: bx, y: y + 2, width: Math.max(2, bwid), height: WR - 4, class: x.pt === 'Agitação Marítima' ? 'lv-' + x.lv : 'lv-' + x.lv }), 'IPMA ' + x.lv + ' ' + x.hz.toLowerCase() + ', ' + dhm(x.a) + ' to ' + dhm(x.b) + ' UTC. IPMA\'s words: ' + x.txt)
      var txt = x.hz + ' ' + x.lv, tw = txt.length * 6.3, cls = 'on-' + x.lv
      if (bwid >= tw + 8) sv(svg, 'text', { x: bx + 5, y: y + 14, class: cls }, txt)
      else if (bx + bwid + 6 + tw < W - R) sv(svg, 'text', { x: bx + bwid + 5, y: y + 14, class: 'b' }, txt)
      else sv(svg, 'text', { x: bx - 5, y: y + 14, 'text-anchor': 'end', class: 'b' }, txt)
      y += WR
    })
    if (rows.length) y += 12
    sts.forEach(function (st, i) {
      var base = y + SH - 8, ht = SH - 26, sum = 0, mw = null
      if (i % 2 === 0) sv(svg, 'rect', { x: 0, y: y, width: W, height: SH, class: 'lane' })
      st.hourly.forEach(function (r) { if (r.rain_mm != null) sum += r.rain_mm; if (r.wind_mean_kmh != null) mw = Math.max(mw == null ? 0 : mw, r.wind_mean_kmh) })
      var anyR = st.hourly.some(function (r) { return r.rain_mm != null })
      sv(svg, 'text', { x: 6, y: y + 14, class: 'b' }, short(st.name, W < 500 ? 24 : 60) + (W < 500 ? '' : '  ') + (W < 500 ? '' : (anyR ? sum.toFixed(1) + ' mm in all' : 'rain not reported') + ', ' + (mw == null ? 'wind not reported' : 'max mean wind ' + mw.toFixed(0) + ' km/h')))
      if (W < 500) sv(svg, 'text', { x: 6, y: y + 26, class: 'm' }, (anyR ? sum.toFixed(1) + ' mm in all' : 'rain not reported') + ', ' + (mw == null ? 'wind not reported' : 'max wind ' + mw.toFixed(0) + ' km/h'))
      var bTop = W < 500 ? 30 : 20, hh = base - (y + bTop)
      sv(svg, 'line', { x1: L, x2: W - R, y1: base, y2: base, class: 'base' })
      var pts = []
      st.hourly.forEach(function (r) {
        var x = sc(T(r.time_utc))
        if (r.rain_mm) title(sv(svg, 'rect', { x: x - bw / 2, y: base - r.rain_mm / maxR * hh, width: bw, height: r.rain_mm / maxR * hh, class: 'rain' }), st.name + ', ' + dhm(T(r.time_utc)) + ' UTC: ' + r.rain_mm + ' mm of rain')
        if (r.wind_mean_kmh != null) pts.push([x, base - r.wind_mean_kmh / maxW * hh])
      })
      if (pts.length) sv(svg, 'path', { d: path(pts), class: 'wind' })
      st.hourly.forEach(function (r) { if (r.wind_mean_kmh != null) title(sv(svg, 'circle', { cx: sc(T(r.time_utc)), cy: base - r.wind_mean_kmh / maxW * hh, r: 5, class: 'hit' }), st.name + ', ' + dhm(T(r.time_utc)) + ' UTC: mean wind ' + r.wind_mean_kmh + ' km/h ' + (r.wind_dir || '') + (r.rain_mm != null ? ', rain ' + r.rain_mm + ' mm' : '')) })
      y += SH
    })
    body.appendChild(svg)
    var lg = [{ k: 'bar', cls: 'rain', text: 'rain in the hour, mm (measured)' }, { k: 'line', cls: 'wind', text: 'mean wind, km/h (measured, not gusts)' }]
    ;['red', 'orange', 'yellow'].forEach(function (c) { if (rows.some(function (x) { return x.lv === c })) lg.push({ k: 'box', cls: 'lv-' + c, text: 'IPMA ' + c }) })
    body.appendChild(legend(lg))
    body.appendChild(h('p', 'sf-note', 'Every station uses the same scale: rain up to ' + maxR + ' mm in an hour, mean wind up to ' + maxW + ' km/h. Station data read ' + dhm(T(d.read_utc)) + ' UTC. IPMA\'s hour label is as given; whether it marks the start or end of the hour is not documented.'))
    body.appendChild(h('p', 'sf-note', state ? 'Warnings drawn are IPMA\'s Lisbon warnings as this record last read them with their windows (' + dhm(T(state.at_utc)) + ' UTC). The feed read at ' + dhm(T(w.read_utc)) + ' UTC shows Lisbon at ' + (w.lisbon_peak_level || 'no level') + ' because the windows had ended; later changes in the file\'s history are not drawn.' : 'No warning windows are in the warnings file, so none are drawn.'))
    body.appendChild(table('The numbers', ['Station', 'Rain total (mm)', 'Max mean wind (km/h)', 'Hours kept'], sts.map(function (st) {
      var s2 = 0, m2 = null; st.hourly.forEach(function (r) { s2 += r.rain_mm || 0; if (r.wind_mean_kmh != null) m2 = Math.max(m2 == null ? 0 : m2, r.wind_mean_kmh) })
      return [st.name, s2.toFixed(1), m2 == null ? 'not reported' : m2, st.hourly.length]
    })))
    return caption('Warned against observed: IPMA\'s Lisbon warnings and what each station in and next to Lisbon measured (rain in the hour, mean wind), all on one time axis in UTC.', [{ text: 'IPMA station observations', url: d.source }, { text: 'IPMA warnings (MeteoAlarm feed)', url: w.source }, { text: 'IPMA open data, credit IPMA' }], [fig.getAttribute('data-src'), fig.getAttribute('data-src2')].filter(Boolean))
  }

  // ---------- 3. forecast models side by side
  function lineChart(fig, o) {
    var W = width(fig), L = 38, R = 10, Tp = 12, B = 22, H = W < 500 ? 170 : 220, sc = scale(o.t0, o.t1, L, W - R)
    var step = o.step, mx = o.min
    o.series.forEach(function (s) { s.rows.forEach(function (r) { var t = T(r.time_utc), v = s.val(r); if (t >= o.t0 && t <= o.t1 && v != null) mx = Math.max(mx, v) }) })
    mx = Math.ceil(mx / step) * step
    var y = function (v) { return Tp + H - v / mx * H }
    var svg = root(W, Tp + H + B, o.label)
    for (var v = 0; v <= mx; v += step) { sv(svg, 'line', { x1: L, x2: W - R, y1: y(v), y2: y(v), class: 'grid' }); sv(svg, 'text', { x: L - 5, y: y(v) + 4, 'text-anchor': 'end', class: 'm' }, v) }
    sv(svg, 'text', { x: L, y: Tp - 2, class: 'm' }, o.unit)
    timeAxis(svg, sc, o.t0, o.t1, Tp, Tp + H, Tp + H + 14, W)
    o.series.forEach(function (s) {
      var pts = s.rows.map(function (r) { return [T(r.time_utc), s.val(r), r] }).filter(function (p) { return p[0] >= o.t0 && p[0] <= o.t1 && p[1] != null })
      var bwid = Math.max(1.5, sc(o.t0 + HOUR) - sc(o.t0) - 0.6)
      if (s.bars) pts.forEach(function (p) { title(sv(svg, 'rect', { x: sc(p[0]) - bwid / 2, y: y(Math.min(mx, p[1])), width: bwid, height: Tp + H - y(Math.min(mx, p[1])), class: 'rain' }), s.name + ', ' + dhm(p[0]) + ' UTC: ' + p[1] + ' ' + o.unit) })
      else if (pts.length) {
        sv(svg, 'path', { d: path(pts.map(function (p) { return [sc(p[0]), y(Math.min(mx, p[1]))] })), class: 'ser ' + s.cls, 'stroke-dasharray': s.dash || null })
        pts.forEach(function (p) { title(sv(svg, 'circle', { cx: sc(p[0]), cy: y(Math.min(mx, p[1])), r: 5, class: 'hit' }), s.name + ', ' + dhm(p[0]) + ' UTC: ' + p[1] + ' ' + o.unit) })
      }
    })
    return svg
  }
  function models(fig, body, js) {
    var f = js[0], mad = js[1], lr = js[2] || {}, lstations = lr.stations || []
    var ipma = f.hourly, run0 = (f.hourly_runs || [])[0], om = f.second_models && f.second_models.open_meteo, mn = f.second_models && f.second_models.met_no
    var geo = lstations.filter(function (s) { return /Geof/.test(s.name) })[0] || lstations[0]
    var rainHrs = function (s) { return s.hourly.filter(function (r) { return r.rain_mm != null }).length }
    var rs = lstations.slice().sort(function (a, b) { return rainHrs(b) - rainHrs(a) })[0]
    var t1 = T('2026-11-12T14:00Z'), t0 = geo ? Math.min.apply(null, geo.hourly.map(function (r) { return T(r.time_utc) })) : T('2026-11-10T00:00Z')
    var runName = function (r, pre) { return pre + ' (run ' + String(r.updated_local).slice(5, 16).replace('T', ' ') + ')' }
    var wind = []
    if (ipma && ipma.rows) wind.push({ name: runName(ipma, 'IPMA hourly, latest'), cls: 's-b', dash: '7 3', rows: ipma.rows, val: function (r) { return num(r.wind_mean_kmh) } })
    if (run0 && run0.wed_rows && run0.wed_rows.length) wind.push({ name: runName(run0, 'IPMA hourly, earlier'), cls: 's-d', dash: '2 3', rows: run0.wed_rows, val: function (r) { return num(r.wind_mean_kmh) } })
    if (om && om.rows && om.rows.length) wind.push({ name: 'Open-Meteo (best match)', cls: 's-c', dash: '4 4', rows: om.rows, val: function (r) { return num(r.wind_mean_kmh) } })
    if (geo) wind.push({ name: 'Measured: ' + geo.name, cls: 's-ink', rows: geo.hourly, val: function (r) { return num(r.wind_mean_kmh) } })
    body.appendChild(h('p', 'sf-head', 'Forecast models for Lisbon side by side with what was measured, ' + dhm(t0) + ' to ' + dhm(t1) + ' UTC. Dashed lines are models, a hypothesis about the future that somebody else made; solid is measured. None of it is our forecast.'))
    var lg = function (series) { return legend(series.map(function (s) { return s.bars ? { k: 'bar', cls: 'rain', text: s.name } : { k: 'line', cls: 'ser ' + s.cls, dash: s.dash, text: s.name } })) }
    body.appendChild(h('p', 'sf-sub', 'Mean wind in Lisbon, km/h'))
    body.appendChild(lineChart(fig, { t0: t0, t1: t1, unit: 'km/h', step: 10, min: 40, series: wind, label: 'Line chart of mean wind in Lisbon in km/h. Series: ' + wind.map(function (s) { return s.name }).join('; ') + '.' }))
    body.appendChild(lg(wind))
    var gust = om && om.rows ? [{ name: 'Open-Meteo gusts (model)', cls: 's-c', dash: '4 4', rows: om.rows, val: function (r) { return num(r.gust_kmh) } }] : []
    if (gust.length) {
      body.appendChild(h('p', 'sf-sub', 'Gusts, km/h: the one model here that gives them'))
      body.appendChild(lineChart(fig, { t0: t0, t1: t1, unit: 'km/h', step: 20, min: 60, series: gust, label: 'Line chart of the Open-Meteo model gust forecast for Lisbon in km/h. IPMA station feeds carry no gusts.' }))
      body.appendChild(lg(gust))
    }
    var rain = []
    if (rs) rain.push({ name: 'Measured: ' + rs.name, bars: true, rows: rs.hourly, val: function (r) { return num(r.rain_mm) } })
    if (om && om.rows && om.rows.length) rain.push({ name: 'Open-Meteo (model)', cls: 's-c', dash: '4 4', rows: om.rows, val: function (r) { return num(r.rain_mm) } })
    if (rain.length) {
      body.appendChild(h('p', 'sf-sub', 'Rain in the hour, mm'))
      body.appendChild(lineChart(fig, { t0: t0, t1: t1, unit: 'mm', step: 2, min: 6, series: rain, label: 'Chart of rain in the hour in Lisbon in mm: measured bars at ' + (rs ? rs.name : 'a station') + ' and the Open-Meteo model forecast line.' }))
      body.appendChild(lg(rain))
    }
    var ms = mad && mad.stations ? mad.stations.slice().sort(function (a, b) { return ((b.max_6h_rain || {}).mm || 0) - ((a.max_6h_rain || {}).mm || 0) })[0] : null
    if (ms) {
      var mrain = [{ name: 'Measured: ' + ms.name, bars: true, rows: ms.hourly, val: function (r) { return num(r.rain_mm) } }]
      var mt = ms.hourly.map(function (r) { return T(r.time_utc) })
      body.appendChild(h('p', 'sf-sub', 'Madeira, the wettest station: rain in the hour, mm (measured only)'))
      body.appendChild(lineChart(fig, { t0: Math.min.apply(null, mt) - HOUR / 2, t1: Math.max.apply(null, mt) + HOUR / 2, unit: 'mm', step: 5, min: 10, series: mrain, label: 'Bar chart of measured rain in the hour at ' + ms.name + ' in Madeira, in mm. No model is drawn for Madeira.' }))
      body.appendChild(lg(mrain))
    }
    var gone = []
    if (!mn || !mn.rows || !mn.rows.length) gone.push('MET Norway is in the file but holds no hours, so it is not drawn')
    body.appendChild(h('p', 'sf-note', (gone.length ? gone.join('; ') + '. ' : '') + 'Scales grow to fit the highest value. Lines stop where a model\'s hours stop. Rain is measured at ' + (rs ? rs.name : 'a station') + ', the Lisbon station with the most rain hours reported. IPMA\'s hour label is as given by IPMA. Models read ' + dhm(T(ipma ? ipma.read_utc : f.read_utc || 0)) + ' UTC.'))
    var rowsT = []; if (om && om.rows) om.rows.forEach(function (r) { var t = T(r.time_utc); if (t >= t0 && t <= t1 && t % (3 * HOUR) === 0) rowsT.push([dhm(t), r.wind_mean_kmh, r.gust_kmh, r.rain_mm]) })
    if (rowsT.length) body.appendChild(table('Open-Meteo, every third hour', ['Hour (UTC)', 'Mean wind (km/h)', 'Gust (km/h)', 'Rain (mm)'], rowsT))
    var srcs = [{ text: 'IPMA hourly forecast', url: ipma && ipma.source }]
    if (om) srcs.push({ text: 'Open-Meteo (' + (om.licence || 'CC BY 4.0') + ')', url: om.source })
    srcs.push({ text: 'IPMA station observations', url: geo && geo.source || lr.source }); srcs.push({ text: 'IPMA open data, credit IPMA' })
    return caption('Forecast models side by side: IPMA\'s hourly forecast (two runs) and Open-Meteo for Lisbon against what IPMA stations measured, for mean wind, gusts and rain, plus the wettest Madeira station measured.', srcs.filter(function (s) { return s.text }), [fig.getAttribute('data-src'), fig.getAttribute('data-src2'), fig.getAttribute('data-src3')].filter(Boolean))
  }

  // ---------- mount
  function getJSON(u) { return fetch(u, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json() }) }
  function fail(fig, url, why) {
    var e = h('div', 'sf-error'); e.setAttribute('role', 'status')
    e.appendChild(document.createTextNode('Could not load the data: ')); e.appendChild(link(url, url))
    if (why) e.appendChild(document.createTextNode(' (' + why + ')'))
    var old = fig.querySelector('.viz-fallback, .sf-body'); if (old && old.parentNode) old.parentNode.replaceChild(e, old); else fig.insertBefore(e, fig.firstChild)
  }
  function mount(fig) {
    var name = fig.getAttribute('data-viz'), fn = CHARTS[name]
    var urls = [fig.getAttribute('data-src'), fig.getAttribute('data-src2'), fig.getAttribute('data-src3')].filter(Boolean)
    fig.classList.add('storm-fig')
    var cur = urls[0] || ''
    try {
      Promise.all(urls.map(function (u) { return getJSON(u).catch(function (e) { cur = cur === urls[0] && !fig.__bad ? u : cur; fig.__bad = fig.__bad || u; throw e }) })).then(function (js) {
        var last = 0, lastW = 0
        function draw() {
          try {
            var old = fig.querySelector('.sf-body, .viz-fallback'), cap = fig.querySelector('figcaption'), body = h('div', 'sf-body')
            var c = fn(fig, body, js)
            if (old && old.parentNode) old.parentNode.replaceChild(body, old); else fig.insertBefore(body, fig.firstChild)
            if (cap && cap.parentNode) cap.parentNode.removeChild(cap)
            if (c) fig.appendChild(c)
            lastW = fig.clientWidth
          } catch (e) { fail(fig, urls[0], 'could not draw: ' + (e && e.message)); if (window.console) console.warn('storm-labs ' + name + ': ' + (e && e.message)) }
        }
        draw()
        window.addEventListener('resize', function () { clearTimeout(last); last = setTimeout(function () { if (Math.abs(fig.clientWidth - lastW) > 8) draw() }, 150) })
      }).catch(function (e) { fail(fig, fig.__bad || urls[0], e && e.message) })
    } catch (e) { fail(fig, urls[0] || '', e && e.message) }
  }
  function start() {
    Array.prototype.forEach.call(document.querySelectorAll('figure.viz[data-viz^="storm-"]'), function (f) {
      if (CHARTS[f.getAttribute('data-viz')] && f.getAttribute('data-src')) mount(f)
    })
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start()
})()
