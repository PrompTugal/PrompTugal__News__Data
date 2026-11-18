// Events by place: splits data/events-pt/latest.json into data/events/by-place/<place>.json (one file per place) and index.json.
// Served at /api/v1/events/by-place/<place>.json. Same place list as collect/by-place-now.mjs (collect/by-place-map.json) plus
// lisboa, and "algarve" holding every Algarve place's events. Code, no model, no request. data.b@PrompTugal.dinis, 18 November 2026.
import path from 'node:path'
import { ROOT, readJson, writeJson, now } from './lib.mjs'

const src = readJson(path.join(ROOT, 'data/events-pt/latest.json'), {}) || {}
if (!src.places) { console.log('by-place/events: no events-pt/latest.json yet, nothing written'); process.exit(0) }
const MAP = readJson(path.join(ROOT, 'collect/by-place-map.json'), [])
const OUT = path.join(ROOT, 'data/events/by-place')
const BY = 'collect/events-by-place.mjs (code, no model; data.b@PrompTugal.dinis), from data/events-pt/latest.json'
const ids = [...MAP.map(m => m.place), 'lisboa'], algarve = MAP.map(m => m.place)
const note = `Read ${src.read_at} from ${(src.provenance?.sources || []).map(s => s.host).join(' and ')}; sources with no feed or refused are in gaps (https://data.promptugal.news/api/v1/events-pt/latest.json). Terms: ${src.provenance?.terms}`
const about = 'Public events on now or starting within 60 days in this place, as schema.org Event records, each with its source URL and the time read. A dated record, not a ticketing service. An empty list means no source covers this place yet, not that nothing is happening.'
const write = (place, events) => writeJson(path.join(OUT, `${place}.json`), { place, read_at: now(), source_read_at: src.read_at, by: BY, about, source_note: note, count: events.length, events })
const index = []
for (const p of ids) { const ev = src.places[p] || []; write(p, ev); index.push({ place: p, count: ev.length, covered: ev.length > 0 || (src.provenance?.sources || []).some(s => (p === 'lisboa' && s.host.includes('agendalx')) || (p === 'lagos' && s.host.includes('cm-lagos'))) }) }
const al = algarve.flatMap(p => src.places[p] || []).sort((a, b) => a.startDate.localeCompare(b.startDate) || a.name.localeCompare(b.name))
write('algarve', al); index.push({ place: 'algarve', count: al.length, covered: al.length > 0 })
writeJson(path.join(OUT, 'index.json'), { about: 'The places with an events file, how many events each holds, and whether any source covers it.', read_at: now(), source_read_at: src.read_at, by: BY, places: index })
console.log(`by-place/events: ${index.length} files`)
