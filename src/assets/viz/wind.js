/* PrompTugal data: the Storm's wind map, drawn in the browser.
   Ported from PrompTugal__News__Storm-Charles, app/broadcast/broadcast.js (map function), commit fdac6ed.
   Licence: Apache-2.0, same organisation. Changes: news panels, chyron, ticker and IPMA area dots removed;
   colours come from this site's CSS variables; the map is mounted inside a figure.viz.
   A model's field (Open-Meteo), not an observation, not a warning, not our forecast. */
(function () {
  'use strict'
  var NS = 'http://www.w3.org/2000/svg'
  function cssv (n) { return getComputedStyle(document.documentElement).getPropertyValue(n).trim() }
  function mk (tag, cls, txt) { var e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e }
  function T (t) { return Date.parse(String(t).replace(/Z?$/, 'Z').replace('ZZ', 'Z')) }
  function stamp (t) { var d = new Date(t); return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }) + ', ' + d.toISOString().slice(11, 16) + ' UTC' }

  function draw (fig, F, C) {
    var body = fig.querySelector('.viz-body') || fig
    if (!F || !F.frames || !F.frames.length) { body.textContent = 'The model field could not be read.'; return }
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches
    var g = F.grid, cols = g.cols, rows = g.rows, W0 = g.lon_west, N0 = g.lat_north, st = g.step_deg
    var E0 = W0 + st * (cols - 1), S0 = N0 - st * (rows - 1)
    var k = 1 / Math.cos(41 * Math.PI / 180)
    var times = F.frames.map(function (f) { return T(f.time_utc) })
    var steps = 6, pos = 0, playing = false

    var views = mk('div', 'viz-btns'); views.setAttribute('role', 'group'); views.setAttribute('aria-label', 'Map view')
    var VIEWS = { atlantic: { n: 'Atlantic', cx: -14, cy: 41, w: 30, h: 20, pcx: -11, pw: 18, ph: 22 }, lisbon: { n: 'Lisbon', cx: -9, cy: 39.2, w: 10, h: 7, pcx: -9, pw: 6, ph: 8 }, madeira: { n: 'Madeira', cx: -16.9, cy: 33, w: 9, h: 5.2, pcx: -16.9, pw: 5, ph: 5.6 } }
    var mapView = 'atlantic', vbtn = {}
    Object.keys(VIEWS).forEach(function (id) {
      var b = mk('button', '', VIEWS[id].n); b.type = 'button'; b.setAttribute('aria-pressed', String(id === mapView)); vbtn[id] = b
      b.onclick = function () { mapView = id; Object.keys(vbtn).forEach(function (o) { vbtn[o].setAttribute('aria-pressed', String(o === id)) }); size(); label(); if (reduce) paint() }
      views.appendChild(b)
    })
    var wrap = mk('div', 'viz-windmap'), cv = mk('canvas')
    cv.setAttribute('role', 'img')
    cv.setAttribute('aria-label', 'Map of the north-east Atlantic and Portugal: a model\'s wind at 10 metres as moving streaks, and sea-level pressure as isobars every 4 hectopascals, for ' + times.length + ' model hours from ' + stamp(times[0]) + ' to ' + stamp(times[times.length - 1]) + '.')
    wrap.appendChild(cv)
    var ctl = mk('div', 'viz-wind-ctl'), pb = mk('button', '', reduce ? 'Still arrows (reduced motion)' : 'Play the model\'s hours'); pb.type = 'button'; pb.setAttribute('aria-pressed', 'false')
    if (reduce) pb.disabled = true
    var slide = mk('input'); slide.type = 'range'; slide.min = '0'; slide.max = String((times.length - 1) * steps); slide.value = '0'; slide.setAttribute('aria-label', 'Model hour')
    if (times.length < 2) { slide.disabled = true; pb.disabled = true }
    ctl.appendChild(pb); ctl.appendChild(slide)
    var status = mk('p', 'viz-wind-time'); status.setAttribute('aria-live', 'polite')
    var key = mk('p', 'viz-key')
    key.textContent = 'Streaks: wind at 10 m (model). Thin lines: sea-level pressure, every 4 hPa (model). Land: Natural Earth.'
    body.appendChild(views); body.appendChild(wrap); body.appendChild(ctl); body.appendChild(status); body.appendChild(key)

    var ctx = cv.getContext('2d'), Wpx = 0, Hpx = 0, dpr = Math.min(2, window.devicePixelRatio || 1), view = { s: 1, cx: 0, cy: 0 }
    var col = {}
    function colours () { ['--ink', '--paper', '--muted', '--rule', '--panel', '--viz-streak'].forEach(function (n) { col[n] = cssv(n) || '#888' }) }
    var bg = null, bgPos = -1, particles = [], trail = null, tctx = null

    function size () {
      var r = wrap.getBoundingClientRect(); Wpx = Math.max(200, r.width); Hpx = Math.max(160, r.height)
      cv.width = Math.round(Wpx * dpr); cv.height = Math.round(Hpx * dpr); cv.style.width = Wpx + 'px'; cv.style.height = Hpx + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      var V = VIEWS[mapView], phone = Wpx / Hpx < 1.1
      var s = Math.max(Wpx / (phone ? V.pw : V.w), Hpx / ((phone ? V.ph : V.h) * k)), cx = phone ? V.pcx : V.cx, cy = V.cy
      s = Math.max(s, Wpx / (E0 - W0), Hpx / ((N0 - S0) * k))
      var hw = Wpx / 2 / s, hh = Hpx / 2 / (k * s)
      cx = Math.min(E0 - hw, Math.max(W0 + hw, cx)); cy = Math.min(N0 - hh, Math.max(S0 + hh, cy))
      view = { s: s, cx: cx, cy: cy }
      colours(); bg = null; particles = seed(); fade(1)
    }
    function X (lon) { return Wpx / 2 + (lon - view.cx) * view.s }
    function Y (lat) { return Hpx / 2 - (lat - view.cy) * k * view.s }
    function LON (x) { return view.cx + (x - Wpx / 2) / view.s }
    function LAT (y) { return view.cy - (y - Hpx / 2) / (k * view.s) }
    function at (keyName, lon, lat, p) {
      var fx = (lon - W0) / st, fy = (N0 - lat) / st
      if (fx < 0 || fy < 0 || fx > cols - 1 || fy > rows - 1) return null
      var i0 = Math.floor(p), i1 = Math.min(times.length - 1, i0 + 1), tt = p - i0
      var x0 = Math.min(cols - 2, Math.floor(fx)), y0 = Math.min(rows - 2, Math.floor(fy)), ax = fx - x0, ay = fy - y0
      function one (arr) {
        var a = arr[y0 * cols + x0], b = arr[y0 * cols + x0 + 1], c = arr[(y0 + 1) * cols + x0], d = arr[(y0 + 1) * cols + x0 + 1]
        if (a == null || b == null || c == null || d == null) return null
        return (a * (1 - ax) + b * ax) * (1 - ay) + (c * (1 - ax) + d * ax) * ay
      }
      var v0 = one(F.frames[i0][keyName]), v1 = one(F.frames[i1][keyName])
      return v0 == null || v1 == null ? null : v0 * (1 - tt) + v1 * tt
    }
    function still () {
      var c = document.createElement('canvas'); c.width = cv.width; c.height = cv.height
      var x = c.getContext('2d'); x.setTransform(dpr, 0, 0, dpr, 0, 0)
      x.fillStyle = col['--panel']; x.fillRect(0, 0, Wpx, Hpx)
      if (C && C.rings) {
        x.fillStyle = col['--paper']; x.strokeStyle = col['--muted']; x.lineWidth = 1.2
        C.rings.forEach(function (r) {
          x.beginPath(); r.forEach(function (q, j) { if (j) x.lineTo(X(q[0]), Y(q[1])); else x.moveTo(X(q[0]), Y(q[1])) })
          x.closePath(); x.fill(); x.globalAlpha = 0.8; x.stroke(); x.globalAlpha = 1
        })
      }
      var n = 4, gx = (cols - 1) * n + 1, gy = (rows - 1) * n + 1, P = new Array(gx * gy), i, j
      for (j = 0; j < gy; j++) for (i = 0; i < gx; i++) P[j * gx + i] = at('p', W0 + i * st / n, N0 - j * st / n, pos)
      var lo = Infinity, li = 0, hiV = -Infinity
      P.forEach(function (v, ii) { if (v != null && v < lo) { lo = v; li = ii } if (v != null && v > hiV) hiV = v })
      x.strokeStyle = col['--muted']; x.globalAlpha = 0.85; x.lineWidth = 1.1; x.font = '600 11px ' + (cssv('--font-meta') || 'monospace'); x.fillStyle = col['--ink']
      function gxLon (a) { return W0 + a * st / n }
      function gyLat (b) { return N0 - b * st / n }
      for (var lev = Math.ceil(lo / 4) * 4; lev <= hiV; lev += 4) {
        x.beginPath(); var lab = null
        for (j = 0; j < gy - 1; j++) for (i = 0; i < gx - 1; i++) {
          var a = P[j * gx + i], b = P[j * gx + i + 1], c2 = P[(j + 1) * gx + i + 1], d = P[(j + 1) * gx + i]
          if (a == null || b == null || c2 == null || d == null) continue
          var pts = []
          var e = function (v1, v2, x1, y1, x2, y2) { if ((v1 < lev) !== (v2 < lev)) { var t = (lev - v1) / (v2 - v1); pts.push([X(gxLon(x1 + (x2 - x1) * t)), Y(gyLat(y1 + (y2 - y1) * t))]) } }
          e(a, b, i, j, i + 1, j); e(b, c2, i + 1, j, i + 1, j + 1); e(c2, d, i + 1, j + 1, i, j + 1); e(d, a, i, j + 1, i, j)
          for (var q = 0; q + 1 < pts.length; q += 2) {
            x.moveTo(pts[q][0], pts[q][1]); x.lineTo(pts[q + 1][0], pts[q + 1][1])
            if (!lab && pts[q][0] > 30 && pts[q][0] < Wpx - 60 && pts[q][1] > 30 && pts[q][1] < Hpx - 30 && (i + j + lev) % 7 === 0) lab = pts[q]
          }
        }
        x.stroke(); if (lab) x.fillText(String(lev), lab[0] + 3, lab[1] - 3)
      }
      x.globalAlpha = 1
      if (lo < 1008) {
        var lx = X(gxLon(li % gx)), ly = Y(gyLat(Math.floor(li / gx)))
        x.fillStyle = col['--ink']; x.font = '800 ' + Math.round(Math.max(20, view.s * 1.2)) + 'px ' + (cssv('--font-interface') || 'sans-serif'); x.textAlign = 'center'; x.textBaseline = 'middle'
        x.fillText('L', lx, ly); x.font = '600 12px ' + (cssv('--font-meta') || 'monospace'); x.fillText(Math.round(lo) + ' hPa', lx, ly + Math.max(18, view.s * 1.0))
        x.textAlign = 'start'; x.textBaseline = 'alphabetic'
      }
      ;[['Lisbon', -9.14, 38.72], ['Funchal', -16.91, 32.65], ['Porto Santo', -16.34, 33.06]].forEach(function (pl) {
        var px = X(pl[1]), py = Y(pl[2]); if (px < 0 || px > Wpx || py < 0 || py > Hpx) return
        x.fillStyle = col['--ink']; x.beginPath(); x.arc(px, py, 3, 0, 7); x.fill()
        x.font = '700 12px ' + (cssv('--font-interface') || 'sans-serif'); x.fillText(pl[0], px + 6, py + 4)
      })
      bg = c; bgPos = Math.round(pos * steps)
    }
    function seed () {
      var n = Math.round(Math.min(2400, Wpx * Hpx / 520)), a = []
      for (var i = 0; i < n; i++) a.push({ x: Math.random() * Wpx, y: Math.random() * Hpx, age: Math.random() * 80 })
      trail = document.createElement('canvas'); trail.width = cv.width; trail.height = cv.height
      tctx = trail.getContext('2d'); tctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      return a
    }
    function fade (all) {
      if (!tctx) return
      tctx.save(); tctx.setTransform(1, 0, 0, 1, 0, 0); tctx.globalCompositeOperation = 'destination-out'
      tctx.fillStyle = 'rgba(0,0,0,' + (all ? 1 : 0.06) + ')'; tctx.fillRect(0, 0, trail.width, trail.height); tctx.restore()
    }
    function step () {
      fade(0)
      tctx.lineWidth = 1.2; tctx.strokeStyle = col['--viz-streak']; tctx.globalAlpha = 0.85; tctx.beginPath()
      var sp = 0.045 * Math.min(view.s, 40) / 10
      particles.forEach(function (q) {
        var u = at('u', LON(q.x), LAT(q.y), pos), v = at('v', LON(q.x), LAT(q.y), pos)
        if (u == null || q.age > 90) { q.x = Math.random() * Wpx; q.y = Math.random() * Hpx; q.age = 0; return }
        var nx = q.x + u * sp, ny = q.y - v * sp * k
        tctx.moveTo(q.x, q.y); tctx.lineTo(nx, ny); q.x = nx; q.y = ny; q.age++
        if (nx < 0 || nx > Wpx || ny < 0 || ny > Hpx) q.age = 999
      })
      tctx.stroke(); tctx.globalAlpha = 1
    }
    function arrows () {
      ctx.strokeStyle = col['--viz-streak']; ctx.lineWidth = 1.5
      for (var y = 20; y < Hpx; y += 34) for (var x = 20; x < Wpx; x += 34) {
        var u = at('u', LON(x), LAT(y), pos), v = at('v', LON(x), LAT(y), pos); if (u == null) continue
        var m = Math.hypot(u, v), L = Math.min(16, 3 + m * 0.8), ux = u / (m || 1), vy = -v / (m || 1)
        ctx.beginPath(); ctx.moveTo(x - ux * L / 2, y - vy * L / 2); ctx.lineTo(x + ux * L / 2, y + vy * L / 2)
        ctx.lineTo(x + ux * L / 2 - (ux * 4 - vy * 3), y + vy * L / 2 - (vy * 4 + ux * 3)); ctx.stroke()
      }
    }
    function label () {
      var i0 = Math.min(times.length - 1, Math.floor(pos)), tt = pos - i0
      var t = times[i0] + ((times[Math.min(times.length - 1, i0 + 1)] - times[i0]) * tt), tl = Math.round(t / 36e5) * 36e5
      var pt = mapView === 'madeira' ? ['Funchal', -16.91, 32.65] : ['Lisbon', -9.14, 38.72]
      var lu = at('u', pt[1], pt[2], pos), lv = at('v', pt[1], pt[2], pos), lp = at('p', pt[1], pt[2], pos)
      status.textContent = 'Model hour ' + stamp(tl) + (lu != null ? '. ' + pt[0] + ' in the model: ' + Math.round(Math.hypot(lu, lv) * 3.6) + ' km/h mean wind, ' + Math.round(lp) + ' hPa.' : '.')
    }
    function paint () {
      if (!bg || bgPos !== Math.round(pos * steps)) still()
      ctx.clearRect(0, 0, Wpx, Hpx); ctx.drawImage(bg, 0, 0, Wpx, Hpx)
      if (reduce) arrows(); else ctx.drawImage(trail, 0, 0, Wpx, Hpx)
    }
    slide.oninput = function () { pos = +slide.value / steps; label(); if (reduce) paint() }
    pb.onclick = function () { playing = !playing; pb.setAttribute('aria-pressed', String(playing)); pb.textContent = playing ? 'Pause' : 'Play the model\'s hours' }
    var last = 0, visible = true
    function loop (ts) {
      if (visible && !document.hidden) {
        if (playing && ts - last > 120) { last = ts; pos += 1 / steps; if (pos > times.length - 1) pos = 0; slide.value = String(Math.round(pos * steps)); label() }
        step(); paint()
      }
      requestAnimationFrame(loop)
    }
    size(); label()
    var rt; window.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(function () { size(); if (reduce) paint() }, 150) })
    if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener('change', function () { colours(); bg = null; if (reduce) paint() })
    new MutationObserver(function () { colours(); bg = null; if (reduce) paint() }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    if ('IntersectionObserver' in window) new IntersectionObserver(function (en) { visible = en[0].isIntersecting }).observe(wrap)
    if (reduce) paint(); else requestAnimationFrame(loop)
  }
  window.PTWind = { draw: draw }
})()
