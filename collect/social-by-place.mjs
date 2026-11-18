// Social signals by place: splits data/social/latest.json into data/social/by-place/<place>.json (one file per place) and index.json.
// Served at /api/v1/social/by-place/<place>.json (the build's job). Same places as collect/events-by-place.mjs: the by-place-map places,
// lisboa, and "algarve" holding every Algarve place's posts. A post is in a place when its text matched the place name (basis "text"),
// or, when it matched none, when the organisation's account lists that place (basis "account"). Links and metadata only; no post text.
// Code, no model, no request. data.b@PrompTugal.dinis, 18 November 2026.
import path from 'node:path'
import { ROOT, readJson, writeJson, now } from './lib.mjs'

const src = readJson(path.join(ROOT, 'data/social/latest.json'), {}) || {}
if (!src.posts) { console.log('by-place/social: no social/latest.json yet, nothing written'); process.exit(0) }
const MAP = readJson(path.join(ROOT, 'collect/by-place-map.json'), [])
const reg = readJson(path.join(ROOT, 'register/social-accounts.json'), { accounts: [] })
const acct = new Map(reg.accounts.map(a => [`${a.platform}:${a.handle}`, a]))
const OUT = path.join(ROOT, 'data/social/by-place')
const BY = 'collect/social-by-place.mjs (code, no model; data.b@PrompTugal.dinis), from data/social/latest.json'
const algarve = MAP.map(m => m.place), ids = [...algarve, 'lisboa']
const about = 'Links to recent public posts by the official accounts of organisations that match this place by name in the post (basis "text") or, when the post names no place, that the organisation covers (basis "account"). Links and metadata only: the post text and media are not stored. A signal to check, not a verified fact. An empty list means no listed account posted about this place, not that nothing is happening.'
const note = `Read ${src.read_at} from the public APIs of ${(src.provenance?.sources || []).map(s => s.platform).join(' and ')}; accounts in register/social-accounts.json; gaps in https://data.promptugal.news/api/v1/social/latest.json. Terms: ${src.provenance?.terms}`
const forPlace = p => src.posts.flatMap(x => {
    const own = acct.get(`${x.platform}:${x.account}`)?.places || []
    const basis = x.places.includes(p) ? 'text' : (!x.places.length && own.includes(p) ? 'account' : null)
    return basis ? [{ ...x, place_basis: basis }] : []
})
const write = (place, posts) => writeJson(path.join(OUT, `${place}.json`), { place, read_at: now(), source_read_at: src.read_at, by: BY, about, source_note: note, count: posts.length, posts })
const index = []
for (const p of ids) { const ps = forPlace(p); write(p, ps); index.push({ place: p, count: ps.length }) }
const al = [...new Map(algarve.flatMap(forPlace).concat(src.posts.flatMap(x => (x.places.includes('algarve') || (!x.places.length && (acct.get(`${x.platform}:${x.account}`)?.places || []).includes('algarve'))) ? [{ ...x, place_basis: x.places.includes('algarve') ? 'text' : 'account' }] : [])).map(x => [x.url, x])).values()].sort((a, b) => b.posted_at.localeCompare(a.posted_at))
write('algarve', al); index.push({ place: 'algarve', count: al.length })
writeJson(path.join(OUT, 'index.json'), { about: 'The places with a social-signals file and how many posts each holds.', read_at: now(), source_read_at: src.read_at, by: BY, places: index })
console.log(`by-place/social: ${index.length} files`)
