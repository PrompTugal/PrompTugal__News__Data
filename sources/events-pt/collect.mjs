// Events in Portugal, by place: schema.org Event records read from public agendas. Code, no model.
// Sources (see card.json and the gaps in latest.json):
//   agendalx   Agenda Cultural de Lisboa (Camara Municipal de Lisboa), its public WordPress REST route /wp-json/agendalx/v1/events
//   lagos      Camara Municipal de Lagos, the events list page https://www.cm-lagos.pt/municipio/eventos (HTML, parsed)
//   figuras    Teatro das Figuras (Faro, municipal theatre), the agenda page https://teatrodasfiguras.pt/agenda (events are in the page's own server-rendered data)
//   tavira     Camara Municipal de Tavira, the public Events Calendar REST route /site/wp-json/tribe/events/v1/events (advertised in the page head)
// Each host's robots.txt is read first and a disallow for the path is respected. A refusal is recorded as a gap, never worked around.
// Only events that are on now or start within 60 days. An event whose place is not known is dropped (counted).

const DAY = 86400000, WINDOW_DAYS = 60
import path from 'node:path'
import { ROOT, readJson } from '../../collect/lib.mjs'
const AGENDALX = 'https://www.agendalx.pt/wp-json/agendalx/v1/events?per_page=50'
const LAGOS = 'https://www.cm-lagos.pt/municipio/eventos'
const FIGURAS = 'https://teatrodasfiguras.pt/agenda'
const TAVIRA = 'https://cm-tavira.pt/site/wp-json/tribe/events/v1/events'
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

// Teatro das Figuras (Faro): the agenda page is a Next.js page whose event list is in its own server-rendered data
// (self.__next_f), grouped by month. Dates only (the schedule text is kept out: several shows a day).
async function figuras(run, today, horizon, gaps) {
    const g = await allowed(run, 'figuras-robots', 'https://teatrodasfiguras.pt', '/agenda')
    if (!g.ok) { gaps.push({ host: 'teatrodasfiguras.pt', why: g.note, read_at: run.started }); return [] }
    const r = await run.get('figuras-agenda', FIGURAS)
    if (!r.ok) { gaps.push({ host: 'teatrodasfiguras.pt', why: `agenda page HTTP ${r.status}${r.error ? ' ' + r.error : ''}`, read_at: r.at }); return [] }
    raw(run, r, 'html')
    let flight = ''
    for (const m of r.bytes.toString('utf8').matchAll(/self\.__next_f\.push\(\[1,("(?:[^"\\]|\\.)*")\]\)/g)) { try { flight += JSON.parse(m[1]) } catch {} }
    const i = flight.indexOf('"events":{'); if (i < 0) { gaps.push({ host: 'teatrodasfiguras.pt', why: 'agenda page read, but its event data was not found (page changed?)', read_at: r.at }); return [] }
    let j = i + 9, depth = 0, inStr = false
    for (; j < flight.length; j++) { const c = flight[j]; if (inStr) { if (c === '\\') j++; else if (c === '"') inStr = false } else if (c === '"') inStr = true; else if (c === '{') depth++; else if (c === '}') { depth--; if (!depth) break } }
    let months; try { months = JSON.parse(flight.slice(i + 9, j + 1)) } catch { gaps.push({ host: 'teatrodasfiguras.pt', why: 'agenda page read, but its event data could not be parsed', read_at: r.at }); return [] }
    const out = [], urls = new Set()
    for (const e of Object.values(months).flat()) {
        const start = String(e.startDate || '').slice(0, 10), last = String(e.endDate || '').slice(0, 10), end = last && last !== start ? last : null
        if (!e.link || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !inWindow(start, end, today, horizon)) continue
        const url = new URL(e.link, 'https://teatrodasfiguras.pt').href; if (urls.has(url)) continue
        const name = ent(e.title); if (!name) continue
        urls.add(url)
        out.push({ '@type': 'Event', name, startDate: start, endDate: end,
            location: { '@type': 'Place', name: 'Teatro das Figuras', address: null, geo: null }, organizer: null,
            url, source: 'https://teatrodasfiguras.pt/agenda (Teatro das Figuras, Faro, agenda page)', read_at: r.at, place: 'faro' })
    }
    return out
}

// Camara Municipal de Tavira: the public Events Calendar REST route. No robots.txt (404). Everything on it is in the Tavira municipality.
async function tavira(run, today, horizon, gaps) {
    const g = await allowed(run, 'tavira-robots', 'https://cm-tavira.pt', '/site/wp-json/tribe/events/v1/events')
    if (!g.ok) { gaps.push({ host: 'cm-tavira.pt', why: g.note, read_at: run.started }); return [] }
    const out = [], urls = new Set()
    for (let page = 1; page <= 5; page++) {
        const r = await run.get(`tavira-events-p${page}`, `${TAVIRA}?per_page=50&page=${page}&start_date=${today}&end_date=${horizon}`)
        if (!r.ok) { if (page === 1) gaps.push({ host: 'cm-tavira.pt', why: `events route HTTP ${r.status}${r.error ? ' ' + r.error : ''}`, read_at: r.at }); break }
        const d = r.json(); if (!Array.isArray(d?.events)) break
        for (const e of d.events) {
            const m = String(e.start_date || '').match(/^(\d{4}-\d{2}-\d{2}) (\d{2}):(\d{2})/), last = String(e.end_date || '').slice(0, 10)
            if (!m || !e.url || urls.has(e.url)) continue
            const end = last && last !== m[1] ? last : null
            if (!inWindow(m[1], end, today, horizon)) continue
            const name = ent(e.title); if (!name) continue
            urls.add(e.url)
            const org = ent((Array.isArray(e.organizer) ? e.organizer[0]?.organizer : null) || '')
            out.push({ '@type': 'Event', name, startDate: e.all_day || end ? m[1] : `${m[1]}T${m[2]}:${m[3]}`, endDate: end,
                location: { '@type': 'Place', name: ent(e.venue?.venue) || null, address: null, geo: null }, organizer: null,   // data.b@, 18 Nov 2026: Tavira's organiser field is free text that may name a private person; not kept until organisations can be told from people
                url: e.url, source: 'https://cm-tavira.pt/site/evento/ (Camara Municipal de Tavira, Events Calendar route /site/wp-json/tribe/events/v1/events)', read_at: r.at, place: 'tavira' })
        }
        if (page >= (d.total_pages || 1)) break
    }
    return out
}

export default async function (run) {
    const today = run.started.slice(0, 10), horizon = iso(new Date(+new Date(today) + WINDOW_DAYS * DAY))
    const gaps = [
        { host: 'dados.cm-lisboa.pt', why: 'Cloudflare bot check ("Just a moment...") on the open data API; its robots.txt also sets Content-Signal ai-train=no, use=reference. Respected, not worked around.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'www.lisboa.pt', why: 'HTTP 403 on its legal and terms pages (aviso-legal, termos-e-condicoes). Respected.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'visitalgarve.pt, eventos.visitalgarve.pt', why: 'eventos.visitalgarve.pt robots.txt allows all (read 18 Nov 2026), but the agenda is an empty JavaScript page (a React app, no server-rendered list, no feed or sitemap found) over a private POST API (api.visitalgarve.pt/website/Travelplanner/Search/Events) whose robots.txt was unreachable and whose terms were not found. Not used.', read_at: '2026-11-18T18:00:00Z' },
        { host: 'autodromodoalgarve.com', why: 'robots.txt allows /race-calendar/ and the list is plain HTML, but the site terms (Parkalgar, PDF) say the user may not "make available to the public, publish, ... copy ... or distribute the texts, images or other information contained on the Website ... without previous written authorisation". Respected; not read.', read_at: '2026-11-18T18:00:00Z' },
        { host: 'www.portugalmotogp.com', why: 'self-described "not the official Portuguese Grand Prix website ... independent fan guide and reseller" (TicketsGP s.r.o.); only purchase terms published. Not used.', read_at: '2026-11-18T18:00:00Z' },
        { host: '2026.portugaltechweek.com', why: 'robots.txt allows /events/; the festival ran 6 to 15 Nov 2026, so nothing is on in the window; no terms page found. Not used.', read_at: '2026-11-18T18:00:00Z' },
        { host: 'algarveevolution.pt', why: 'connection reset on robots.txt and on /pt/event/ (18 Nov 2026); nothing read, not worked around.', read_at: '2026-11-18T18:00:00Z' },
        { host: 'www.visitlisboa.com', why: 'robots.txt allows all; no machine-readable events feed found in the research. Not used.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'www.cm-faro.pt, www.cm-loule.pt, www.cm-silves.pt', why: 'connection reset on the first request (robots.txt); nothing read.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'www.cm-portimao.pt, www.cm-albufeira.pt', why: 'home pages read; no RSS or iCal feed found, only HTML and a PDF agenda. Not parsed yet.', read_at: '2026-11-18T14:00:00Z' },
        { host: 'eventbrite.*, lu.ma, luma.com, meetup.com, websummit.com', why: 'never machine-read (Dinis, 18 Nov 2026).', read_at: '2026-11-18T14:00:00Z' }
    ]
    const fresh = { 'www.agendalx.pt': await agendalx(run, today, horizon, gaps), 'www.cm-lagos.pt': await lagos(run, today, horizon, gaps),
        'teatrodasfiguras.pt': await figuras(run, today, horizon, gaps), 'cm-tavira.pt': await tavira(run, today, horizon, gaps) }
    // data.b@, 18 Nov 2026: a host that fails this run (Agenda LX answered 403 to the GitHub Actions runner at 14:27 UTC)
    // keeps its last good events for up to 48 hours, each marked stale with the time it was really read; the refusal is
    // recorded in gaps and not worked around. After 48 hours the stale events are dropped.
    const prev = readJson(path.join(ROOT, 'data', run.id, 'latest.json'))
    const stale = []
    for (const [h, list] of Object.entries(fresh)) {
        if (list.length || !prev) continue
        const old = Object.values(prev.places || {}).flat().filter(e => { try { return new URL(e.url).host === h } catch { return false } })
        const keep = old.filter(e => (Date.parse(run.started) - Date.parse(e.read_at)) < 48 * 3600e3 && (e.endDate || e.startDate) >= today)
        if (keep.length) { fresh[h] = keep.map(e => ({ ...e, stale: true })); stale.push({ host: h, events: keep.length, read_at: keep[0].read_at }) }
    }
    const all = Object.values(fresh).flat()
    if (!all.length) return null
    const known = new Set(['lisboa', 'lagos', 'faro', 'tavira']), places = {}; let dropped = 0
    const seen = new Set()
    for (const e of all) {
        if (!known.has(e.place) || seen.has(e.url)) { dropped++; continue }
        seen.add(e.url); (places[e.place] ||= []).push(e)
    }
    for (const p of Object.values(places)) p.sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name))
    const by_source = { 'www.agendalx.pt': 0, 'www.cm-lagos.pt': 0, 'teatrodasfiguras.pt': 0, 'cm-tavira.pt': 0 }
    for (const e of all) if (seen.has(e.url)) by_source[new URL(e.url).host] = (by_source[new URL(e.url).host] || 0) + 1
    return { source: run.id, title: run.card.title, read_at: run.started,
        provenance: run.prov({ source: AGENDALX, sources: [
            { host: 'www.agendalx.pt', what: 'Agenda Cultural de Lisboa (Câmara Municipal de Lisboa)', route: AGENDALX, terms: 'No terms page found. robots.txt (read 18 Nov 2026) allows all paths and sets "Content-Signal: search=yes,ai-train=no,use=reference": reference use with the source named and linked; no AI training.' },
            { host: 'www.cm-lagos.pt', what: 'Câmara Municipal de Lagos, events list', route: LAGOS, terms: 'No terms page found. robots.txt (read 18 Nov 2026) disallows only administrative folders, not /municipio/eventos.' },
            { host: 'teatrodasfiguras.pt', what: 'Teatro das Figuras, Faro (municipal theatre), agenda page', route: FIGURAS, terms: 'No terms of use page found (its information pages are directions, opening hours, privacy and cookies only). robots.txt (read 18 Nov 2026) allows all but /private/. The footer says "Todos os direitos reservados". Titles, dates and links only; each event links to its page.' },
            { host: 'cm-tavira.pt', what: 'Câmara Municipal de Tavira, events (Events Calendar REST route)', route: TAVIRA, terms: 'No terms of use page found (only a privacy policy). No robots.txt (404, read 18 Nov 2026). The route is advertised in the events page head (link to /site/wp-json/tribe/events/v1/). The footer says "Todos os direitos reservados". Titles, dates, venues and organisers only; each event links to its page.' }] }),
        about: `Events on now or starting within ${WINDOW_DAYS} days (to ${horizon}) in the places listed, as schema.org Event records, each with its source URL and the time read. Dates are as the source gives them (Lisbon time; a time is added only where a single start hour is shown); a long-running event shows its first and last day. organizer is null where the source does not name an organiser (the agenda's publisher is in source). A dated record read by code, not a ticketing or booking service: check the organiser before travelling.`,
        counts: { events: Object.values(places).reduce((n, p) => n + p.length, 0), places: Object.keys(places).length, by_source, dropped_duplicates_or_unknown_place: dropped },
        ...(stale.length ? { stale_note: 'These hosts could not be read this run; their events are from the last good read (each has stale: true and its own read_at), kept for at most 48 hours.', stale } : {}),
        places, gaps }
}
