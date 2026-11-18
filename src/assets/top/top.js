/* data.promptugal.news: the masthead chip and the reading graph (data.b@PrompTugal.dinis, 18 November 2026).
 * After PrompTugal__News__Website assets/meter/meter.js (the chip "Pay for what you read · £balance" and the reading
 * graph on the account page), at Dinis's word relayed in board/guidance/2026-11-18-five-sites-on-account-b.md there.
 *
 * This site charges nothing: its pages are built on IPMA data, and IPMA's terms forbid profit-making use, so they stay
 * outside the meter until Dinis decides. The chip therefore shows the reading credit this browser holds for this site
 * (the meter's own storage key, sg.meter.v1) when there is one, and "free here" when there is none. The balance kept on
 * promptugal.news lives in that site's own browser storage, which this site cannot read.
 *
 * The reading graph: each page opened here is noted in this browser only (localStorage pt.data.reads: the path, the
 * title, the minute). Nothing is sent anywhere by this script. Data from storage is only ever set with textContent. */
(function () {
    'use strict'
    var LOG = 'pt.data.reads', METER = 'sg.meter.v1'
    var get = function (k) { try { return localStorage.getItem(k) } catch (e) { return null } }
    var set = function (k, v) { try { localStorage.setItem(k, v) } catch (e) { /* private mode: fine */ } }
    var money = function (p) { var n = Math.abs(p) / 100; return (p < 0 ? '-' : '') + '£' + n.toFixed(2) }

    function note() {
        var log = []
        try { log = JSON.parse(get(LOG) || '[]') } catch (e) { log = [] }
        if (!Array.isArray(log)) log = []
        var path = location.pathname.replace(/index\.html$/, '')
        log.push({ path: path, title: document.title.replace(/: PrompTugal\.news Data$/, '').slice(0, 120), at: new Date().toISOString().slice(0, 16) + 'Z', kind: path === '/' ? 'site' : 'data' })
        set(LOG, JSON.stringify(log.slice(-200)))
        return log
    }

    function chip() {
        var b = document.getElementById('pay-balance'); if (!b) return
        var st = null
        try { st = JSON.parse(get(METER) || 'null') } catch (e) { st = null }
        if (st && typeof st.balance === 'number') { b.textContent = money(st.balance); return }
        b.textContent = 'free here'
    }

    function graph(log) {
        var el = document.getElementById('reading-graph'); if (!el) return
        var NS = 'http://www.w3.org/2000/svg', W = 760, H = 440
        var sv = function (tag, attrs, kids) { var e = document.createElementNS(NS, tag); for (var k in attrs || {}) e.setAttribute(k, attrs[k]); (kids || []).forEach(function (c) { if (c) e.append(c) }); return e }
        var seen = {}, pages = []
        log.slice().reverse().forEach(function (e) { if (!e || !e.path || seen[e.path]) return; seen[e.path] = 1; pages.push(e) })
        pages = pages.reverse().slice(-60)
        var n = document.getElementById('reading-count'); if (n) n.textContent = String(pages.length)
        if (pages.length < 2) { el.textContent = 'Read two or more pages on this site and the graph appears here.'; return }
        var nodes = [], byId = {}, links = []
        var node = function (id, o) { if (!byId[id]) { o.id = id; o.x = W / 2 + (Math.random() - .5) * W * .6; o.y = H / 2 + (Math.random() - .5) * H * .6; o.vx = 0; o.vy = 0; byId[id] = o; nodes.push(o) } return byId[id] }
        var label = function (seg) { try { return decodeURIComponent(seg).replace(/-/g, ' ') } catch (e) { return seg } }
        pages.forEach(function (e, i) {
            var pn = node('p:' + e.path, { type: 'page', title: e.title || e.path, href: e.path, kind: e.kind })
            var segs = String(e.path).replace(/^\/+|\/+$/g, '').split('/').filter(Boolean)
            if (segs.length) {
                var sec = node('s:' + segs[0], { type: 'concept', title: label(segs[0]) }); links.push([pn, sec, 'c'])
                if (segs[1]) { var sub = node('t:' + segs[0] + '/' + segs[1], { type: 'concept', title: label(segs[1]) }); links.push([pn, sub, 'c']); links.push([sub, sec, 'c']) }
            } else { links.push([pn, node('s:home', { type: 'concept', title: 'front page' }), 'c']) }
            if (i > 0) links.push([byId['p:' + pages[i - 1].path], pn, 'r'])
        })
        for (var it = 0; it < 400; it++) {
            var cool = 1 - it / 400
            for (var i = 0; i < nodes.length; i++) for (var j = i + 1; j < nodes.length; j++) {
                var A = nodes[i], B = nodes[j], dx = A.x - B.x, dy = A.y - B.y, d = Math.sqrt(dx * dx + dy * dy) + .1, f = Math.min(8, 2400 / (d * d))
                A.vx += dx / d * f; A.vy += dy / d * f; B.vx -= dx / d * f; B.vy -= dy / d * f
            }
            links.forEach(function (l) { var A = l[0], B = l[1], dx = B.x - A.x, dy = B.y - A.y, d = Math.sqrt(dx * dx + dy * dy) + .1, f = (d - (l[2] === 'r' ? 90 : 60)) * (l[2] === 'r' ? .02 : .06); A.vx += dx / d * f; A.vy += dy / d * f; B.vx -= dx / d * f; B.vy -= dy / d * f })
            nodes.forEach(function (q) { q.vx += (W / 2 - q.x) * .01; q.vy += (H / 2 - q.y) * .01; q.x += Math.max(-10, Math.min(10, q.vx)) * cool; q.y += Math.max(-10, Math.min(10, q.vy)) * cool; q.vx *= .5; q.vy *= .5; q.x = Math.max(40, Math.min(W - 40, q.x)); q.y = Math.max(24, Math.min(H - 28, q.y)) })
        }
        var g = sv('svg', { viewBox: '0 0 ' + W + ' ' + H, class: 'nr-graph', role: 'img', 'aria-label': 'Your reading graph: ' + pages.length + ' pages and what they are about' })
        links.forEach(function (l) { g.append(sv('line', { x1: l[0].x.toFixed(1), y1: l[0].y.toFixed(1), x2: l[1].x.toFixed(1), y2: l[1].y.toFixed(1), class: l[2] === 'r' ? 'g-read' : 'g-link' })) })
        nodes.forEach(function (q) {
            if (q.type === 'concept') {
                var t = sv('text', { x: q.x.toFixed(1), y: (q.y + 20).toFixed(1), 'text-anchor': 'middle', class: 'g-label' }); t.textContent = q.title
                g.append(sv('g', {}, [sv('circle', { cx: q.x.toFixed(1), cy: q.y.toFixed(1), r: 7, class: 'g-concept' }), t]))
            } else {
                var tt = sv('title', {}); tt.textContent = q.title
                g.append(sv('a', { href: q.href }, [sv('circle', { cx: q.x.toFixed(1), cy: q.y.toFixed(1), r: 5, class: 'g-page g-' + (q.kind === 'site' ? 'site' : 'data') }), tt]))
            }
        })
        el.replaceChildren(g)
        var clear = document.getElementById('reading-clear')
        if (clear) { clear.hidden = false; clear.onclick = function () { try { localStorage.removeItem(LOG) } catch (e) { } location.reload() } }
    }

    function ready() { var log = note(); chip(); graph(log) }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready()
})()
