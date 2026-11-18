// Events in Portugal, by place: schema.org Event records read from public agendas. Code, no model.
// Sources (see card.json and the gaps in latest.json):
//   agendalx   Agenda Cultural de Lisboa (Camara Municipal de Lisboa), its public WordPress REST route /wp-json/agendalx/v1/events
//   lagos      Camara Municipal de Lagos, the events list page https://www.cm-lagos.pt/municipio/eventos (HTML, parsed)
// Each host's robots.txt is read first and a disallow for the path is respected. A refusal is recorded as a gap, never worked around.
// Only events that are on now or start within 60 days. An event whose place is not known is dropped (counted).

const DAY = 86400000, WINDOW_DAYS = 60
const AGENDALX = 'https://www.agendalx.pt/wp-json/agendalx/v1/events?per_page=50'
const LAGOS = 'https://www.cm-lagos.pt/municipio/eventos'
const ent = s => String(s ?? '').replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' })[n]).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
const iso = d => d.toISOString().slice(0, 10)
const MONTHS = { jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6, jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12 }

// robots.txt: the group for "*" only (we are not named in any group); returns false when the path is disallowed.
async function allowed(run, name, origin, pathname) {
    const r = await run.get(name, `${origin}/robots.txt`)
    if (!r.ok) return { ok: r.status === 404, note: r.status === 404 ? 'no robots.txt (404)' : `robots.txt not read (${r.status}${r.error ? ' ' + r.error : ''})` }
    raw(run, r, 'txt')
    let star = false, prevUA = false; const rules = []
    for (const line of r.bytes.toString('utf8').split(/\r?\n/)) {
        const m = line.replace(/#.*/, '').trim().match(/^([a-z-]+)\s*:\s*(.*)$/i); if (!m) continue
        const k = m[1].toLowerCase(), v = m[2].trim()
        if (k === 'user-agent') { star = prevUA ? (star || v === '*') : v === '*'; prevUA = true; continue }
        prevUA = false
        if (star && k === 'disallow' && v) rules.push(v)
    }
    const hit = rules.find(p => pathname.startsWith(p.replace(/\*.*$/, '')) && p !== '/')
    return { ok: !hit, note: hit ? `robots.txt disallows ${hit}` : 'robots.txt read: path allowed' }
}
const raw = (run, r, ext) => { r.ext = ext }

const inWindow = (start, end, today, horizon) => (end || start) >= today && start <= horizon

async function agendalx(run, today, horizon, gaps) {
    const g = await allowed(run, 'agendalx-robots', 'https://www.agendalx.pt', '/wp-json/agendalx/v1/events')
    if (!g.ok) { gaps.push({ host: 'www.agendalx.pt', why: g.note, read_at: run.started }); return [] }
    const out = []; let seen = 0
    for (let page = 1; page <= 10; page++) {
        const r = await run.get(`agendalx-events-p${page}`, `${AGENDALX}&page=${page}`)
        if (!r.ok) { if (page === 1) gaps.push({ host: 'www.agendalx.pt', why: `events route HTTP ${r.status}${r.error ? ' ' + r.error : ''}`, read_at: r.at }); break }
        const list = r.json(); if (!Array.isArray(list)) break
        seen += list.length
        for (const e of list) {
            const start = e.StartDate, end = e.LastDate && e.LastDate !== start ? e.LastDate : null
            if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || !inWindow(start, end, today, horizon)) continue
            const v = Object.values(e.venue || {})[0]
            out.push({ '@type': 'Event', name: ent(e.title?.rendered), startDate: start, endDate: end,
                location: { '@type': 'Place', name: v ? ent(v.name) : null, address: null, geo: null }, organizer: null,
                url: e.link, source: 'https://www.agendalx.pt/ (Agenda Cultural de Lisboa, route /wp-json/agendalx/v1/events)', read_at: r.at, place: 'lisboa' })
        }
        if (list.length < 50) break
    }
    return out
}

function lagosDates(text, today) {
    const parts = [...text.toLowerCase().matchAll(/(\d{1,2})\s*(?:de\s+)?(?:(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)[a-zç]*\.?)?/g)].map(m => ({ d: +m[1], m: m[2] ? MONTHS[m[2]] : null }))
    if (!parts.length || !parts.at(-1).m) return null
    const last = parts.at(-1), first = parts.length > 1 ? parts[0] : last
    const fm = first.m || last.m, ty = +today.slice(0, 4)
    let y = ty; const mk = (yy, mm, dd) => `${yy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    if (new Date(mk(y, last.m, last.d)) < new Date(+new Date(today) - 180 * DAY)) y++
    const end = mk(y, last.m, last.d); let start = mk(y, fm, first.d); if (start > end) start = mk(y - 1, fm, first.d)
    return { start, end: parts.length > 1 && end !== start ? end : null }
}

async function lagos(run, today, horizon, gaps) {
    const g = await allowed(run, 'lagos-robots', 'https://www.cm-lagos.pt', '/municipio/eventos')
    if (!g.ok) { gaps.push({ host: 'www.cm-lagos.pt', why: g.note, read_at: run.started }); return [] }
    const r = await run.get('lagos-eventos', LAGOS)
    if (!r.ok) { gaps.push({ host: 'www.cm-lagos.pt', why: `events page HTTP ${r.status}${r.error ? ' ' + r.error : ''}`, read_at: r.at }); return [] }
    raw(run, r, 'html')
    const html = r.bytes.toString('utf8'), out = [], urls = new Set()
    for (const art of html.split('<article ').slice(1)) {
        const href = art.match(/href="(\/municipio\/eventos\/\d+[^"]*)"/)?.[1]; if (!href) continue
        const url = 'https://www.cm-lagos.pt' + href; if (urls.has(url)) continue
        const name = ent(art.match(/item__details--title[^>]*>([\s\S]*?)<\/div>\s*<div class="item__details--inline/)?.[1])
        const dateText = ent(art.match(/item__details--date[^>]*>([\s\S]*?)<\/div>/)?.[1])
        const hour = art.match(/item__details--hour[^>]*>\s*(\d{1,2})h(\d{2})?/), loc = ent(art.match(/item__details--location[^>]*>([\s\S]*?)<\/div>/)?.[1])
        const d = lagosDates(dateText, today); if (!name || !d || !inWindow(d.start, d.end, today, horizon)) continue
        urls.add(url)
        const startDate = hour && !d.end ? `${d.start}T${hour[1].padStart(2, '0')}:${hour[2] || '00'}` : d.start
        out.push({ '@type': 'Event', name, startDate, endDate: d.end,
            location: { '@type': 'Place', name: loc || null, address: null, geo: null }, organizer: null,
            url, source: 'https://www.cm-lagos.pt/municipio/eventos (Camara Municipal de Lagos, events list page)', read_at: r.at, place: 'lagos' })
    }
    return out
}

export default async function (run) {
    const today = run.started.slice(0, 10), horizon = iso(new Date(+new Date(today) + WINDOW_DAYS * DAY))
    const gaps = [
        { host: 'dados.cm-lisboa.pt', why: 'Cloudflare bot check ("Just a moment...") on the open data API; its robots.txt also sets Content-Signal ai-train=no, use=reference. Respected, not worked around.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'www.lisboa.pt', why: 'HTTP 403 on its legal and terms pages (aviso-legal, termos-e-condicoes). Respected.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'visitalgarve.pt', why: 'robots.txt allows all, but the site is a JavaScript app over a private POST API (api.visitalgarve.pt/website/Travelplanner/Search/Events) with no published feed, no terms read and an unreachable robots.txt on the API host. Not used.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'www.visitlisboa.com', why: 'robots.txt allows all; no machine-readable events feed found in the research. Not used.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'www.cm-faro.pt, www.cm-loule.pt, www.cm-silves.pt', why: 'connection reset on the first request (robots.txt); nothing read.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'www.cm-tavira.pt', why: 'no robots.txt (404); events pages not looked at yet.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'www.cm-portimao.pt, www.cm-albufeira.pt', why: 'home pages read; no RSS or iCal feed found, only HTML and a PDF agenda. Not parsed yet.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'eventbrite.*, lu.ma, luma.com, meetup.com, websummit.com', why: 'never machine-read (Dinis, 18 Nov 2026).', read_at: '2026-11-18T14:00:00Z' }
    ]
    const all = [...await agendalx(run, today, horizon, gaps), ...await lagos(run, today, horizon, gaps)]
    if (!run.reads.some(x => x.status === 200 && /events|eventos/.test(x.name))) return null
    const known = new Set(['lisboa', 'lagos']), places = {}; let dropped = 0
    const seen = new Set()
    for (const e of all) {
        if (!known.has(e.place) || seen.has(e.url)) { dropped++; continue }
        seen.add(e.url); (places[e.place] ||= []).push(e)
    }
    for (const p of Object.values(places)) p.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name))
    const by_source = { 'www.agendalx.pt': 0, 'www.cm-lagos.pt': 0 }
    for (const e of all) if (seen.has(e.url)) by_source[new URL(e.url).host] = (by_source[new URL(e.url).host] || 0) + 1
    return { source: run.id, title: run.card.title, read_at: run.started,
        provenance: run.prov({ source: AGENDALX, sources: [
            { host: 'www.agendalx.pt', what: 'Agenda Cultural de Lisboa (Câmara Municipal de Lisboa)', route: AGENDALX, terms: 'No terms page found. robots.txt (read 18 Nov 2026) allows all paths and sets "Content-Signal: search=yes,ai-train=no,use=reference": reference use with the source named and linked; no AI training.' },
            { host: 'www.cm-lagos.pt', what: 'Câmara Municipal de Lagos, events list', route: LAGOS, terms: 'No terms page found. robots.txt (read 18 Nov 2026) disallows only administrative folders, not /municipio/eventos.' }] }),
        about: `Events on now or starting within ${WINDOW_DAYS} days (to ${horizon}) in the places listed, as schema.org Event records, each with its source URL and the time read. Dates are as the source gives them (Lisbon time; a time is added only where a single start hour is shown); a long-running event shows its first and last day. organizer is null where the source does not name an organiser (the agenda's publisher is in source). A dated record read by code, not a ticketing or booking service: check the organiser before travelling.`,
        counts: { events: Object.values(places).reduce((n, p) => n + p.length, 0), places: Object.keys(places).length, by_source, dropped_unknown_place: dropped },
        places, gaps }
}
