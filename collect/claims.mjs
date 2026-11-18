// Events, phase 2 ("publish what we may"): every event discovery found becomes a claim with its evidence links, each
// marked readable or not by the sources register; an event's details come only from readable sources. Every cited host
// that is not readable is a gap, counted. At Dinis's word, 18 November 2026, about 14:15 UTC (PrompTugal__News__Website
// board/guidance/2026-11-18-events-in-two-phases.md). Code, no model. data.b@PrompTugal.dinis.
//
//   node collect/claims.mjs
//
// Reads discovery/by-place/<place>/<latest date>.json, register/sources.json, sources/*/card.json and
// data/events/by-place/*.json. Writes discovery/claims/by-place/<place>.json (+ index.json) and discovery/gaps.json (in git, so past claims are kept).
// Claims whose dates have passed are kept (discovery/claims/past/<place>.json): an event is never deleted when it ends.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, readJson, writeJson } from './lib.mjs'

const now = new Date().toISOString().replace(/\.\d+Z$/, 'Z'), today = now.slice(0, 10)
const host = u => { try { return new URL(String(u).replace(/ \(query cut\)$/, '')).hostname.replace(/^www\./, '') } catch { return null } }

// readable hosts: the sources we read (their cards) and register entries marked read or allowed
const readable = new Map()
for (const d of fs.readdirSync(path.join(ROOT, 'sources'))) {
    const c = readJson(path.join(ROOT, 'sources', d, 'card.json')); if (!c) continue
    for (const u of [c.source_home, c.reader_page]) { const h = host(u); if (h) readable.set(h, d) }
}
readable.set('agendalx.pt', 'events-pt'); readable.set('cm-lagos.pt', 'events-pt')
const reg = (readJson(path.join(ROOT, 'register', 'sources.json')) || { entries: [] }).entries
const regByHost = new Map(reg.map(e => [host(e.url), e]).filter(([h]) => h))
for (const e of reg) if (['read', 'allowed'].includes(e.status)) { const h = host(e.url); if (h) readable.set(h, e.id) }

// the events this site has read, by URL, to take details from
const known = new Map()
const evDir = path.join(ROOT, 'data', 'events', 'by-place')
if (fs.existsSync(evDir)) for (const f of fs.readdirSync(evDir).filter(f => f.endsWith('.json') && f !== 'index.json')) for (const e of (readJson(path.join(evDir, f))?.events || [])) if (e.url) known.set(e.url.replace(/\/$/, ''), e)

const gaps = new Map()
const index = []
const dDir = path.join(ROOT, 'discovery', 'by-place')
for (const place of fs.existsSync(dDir) ? fs.readdirSync(dDir).sort() : []) {
    const files = fs.readdirSync(path.join(dDir, place)).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort()
    const d = files.length ? readJson(path.join(dDir, place, files.at(-1))) : null
    if (!d || !d.ok) continue
    const claims = (d.items || []).filter(i => i && i.name && i.start_date).map(i => {
        const evidence = [...new Set(i.urls || [])].map(u => { const h = host(u); return { url: u, host: h, readable: readable.has(h), register: readable.get(h) || (regByHost.get(h) || {}).id || null } })
        const match = evidence.map(e => known.get(String(e.url).replace(/\/$/, ''))).find(Boolean)
        for (const e of evidence.filter(e => !e.readable && e.host)) { const g = gaps.get(e.host) || { host: e.host, claims: 0, places: new Set(), register: (regByHost.get(e.host) || {}).id || null, example: e.url }; g.claims++; g.places.add(place); gaps.set(e.host, g) }
        const base = { '@type': 'Event', name: String(i.name).slice(0, 200), startDate: i.start_date, endDate: i.end_date || null, place, municipality: i.municipality || null, evidence }
        if (match) return { ...base, status: 'confirmed', details_from: match.source, location: match.location, url: match.url, organizer: match.organizer || null }
        const anyReadable = evidence.some(e => e.readable)
        return { ...base, status: anyReadable ? 'to confirm at a readable source' : 'details withheld', details_from: null,
            details_note: anyReadable ? 'A readable source is cited; its details are not yet read.' : `Details withheld: the sources cited (${[...new Set(evidence.map(e => e.host).filter(Boolean))].join(', ') || 'none'}) are not ones whose terms let us copy them. Organiser: send them to us.` }
    })
    const out = { place, read_at: now, discovery: { asked_at: d.asked_at, model: d.model, via: d.via, file: `discovery/by-place/${place}/${files.at(-1)}` },
        about: 'Events claimed for this place, each with every evidence link and whether this site may read that source (the register). Name, date and place come from discovery (Perplexity, through OpenRouter); other details only from a readable source. Not a confirmed listing.',
        counts: { claims: claims.length, confirmed: claims.filter(c => c.status === 'confirmed').length, withheld: claims.filter(c => c.status === 'details withheld').length }, claims }
    // keep past claims: anything ending before today moves to past/, never deleted
    const prevFile = path.join(ROOT, 'discovery', 'claims', 'by-place', `${place}.json`)
    const prev = readJson(prevFile)
    const pastFile = path.join(ROOT, 'discovery', 'claims', 'past', `${place}.json`)
    const past = readJson(pastFile) || { place, about: 'Claims whose dates have passed, kept as the history of each event series.', claims: [] }
    for (const c of (prev?.claims || [])) if ((c.endDate || c.startDate) < today && !past.claims.some(p => p.name === c.name && p.startDate === c.startDate)) past.claims.push(c)
    out.claims = out.claims.filter(c => (c.endDate || c.startDate) >= today)
    out.counts = { claims: out.claims.length, confirmed: out.claims.filter(c => c.status === 'confirmed').length, withheld: out.claims.filter(c => c.status === 'details withheld').length }   // after the past ones moved out (events.b@ saw them not add up)
    writeJson(prevFile, out); if (past.claims.length) writeJson(pastFile, past)
    index.push({ place, claims: out.counts.claims, confirmed: out.counts.confirmed, withheld: out.counts.withheld })
}
// the Algarve as a whole: every Algarve place's claims in one file (events.b@ asked)
const algarve = index.filter(x => x.place !== 'lisboa' && x.place !== 'algarve').flatMap(x => (readJson(path.join(ROOT, 'discovery', 'claims', 'by-place', `${x.place}.json`))?.claims || []))
writeJson(path.join(ROOT, 'discovery', 'claims', 'by-place', 'algarve.json'), { place: 'algarve', read_at: now, about: 'Every Algarve place\'s claims in one file (the places in index.json other than lisboa).', counts: { claims: algarve.length, confirmed: algarve.filter(c => c.status === 'confirmed').length, withheld: algarve.filter(c => c.status === 'details withheld').length }, claims: algarve })
writeJson(path.join(ROOT, 'discovery', 'claims', 'by-place', 'index.json'), { read_at: now, places: index })
const g = [...gaps.values()].map(x => ({ ...x, places: [...x.places].sort() })).sort((a, b) => b.claims - a.claims || a.host.localeCompare(b.host))
writeJson(path.join(ROOT, 'discovery', 'gaps.json'), { read_at: now, about: 'Every host cited as evidence for an event that this site does not read, with how many claims point to it and in which places. Each is a gap in our sources; the register says why we do not read it.', hosts: g })
console.log(`claims: ${index.reduce((s, x) => s + x.claims, 0)} in ${index.length} places (${index.reduce((s, x) => s + x.confirmed, 0)} confirmed); gaps: ${g.length} hosts`)
