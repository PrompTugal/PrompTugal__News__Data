// The places' coordinates, from Wikidata (CC0 1.0): each municipality matched on its DICO code (Wikidata P6324), the same code
// collect/by-place-map.json carries; Quarteira (in Loulé) by its own item, located in Loulé (P131 Q586722). Asked by live.b@PrompTugal.dinis (18 Nov
// 2026, 19:05 UTC). Written to register/places.json, in git: run by hand when a place is added, not every hour. Code, no model.
// data.b@PrompTugal.dinis.
//   node collect/places-coords.mjs
import path from 'node:path'
import { ROOT, readJson, writeJson, now } from './lib.mjs'

const SPARQL = 'https://query.wikidata.org/sparql', UA = 'PrompTugal.news data collector (https://data.promptugal.news/)'
const MAP = readJson(path.join(ROOT, 'collect/by-place-map.json'), [])
const want = new Map(MAP.filter(m => m.place !== 'quarteira').map(m => [m.dico, m.place])); want.set('1106', 'lisboa')
const q = `SELECT ?m ?mLabel ?coord ?dico WHERE { ?m wdt:P31 wd:Q13217644; wdt:P6324 ?dico; wdt:P625 ?coord. VALUES ?dico { ${[...want.keys()].map(d => `"${d}"`).join(' ')} } SERVICE wikibase:label { bd:serviceParam wikibase:language "pt". } }`
const qq = 'SELECT ?m ?mLabel ?coord WHERE { ?m rdfs:label "Quarteira"@pt; wdt:P131 wd:Q586722; wdt:P625 ?coord. SERVICE wikibase:label { bd:serviceParam wikibase:language "pt". } }'
const ask = async query => { const r = await fetch(`${SPARQL}?query=${encodeURIComponent(query)}`, { headers: { accept: 'application/sparql-results+json', 'user-agent': UA }, signal: AbortSignal.timeout(60000) }); if (!r.ok) throw new Error(`Wikidata answered ${r.status}`); return (await r.json()).results.bindings }
const pt = s => { const m = /^Point\((-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)\)$/.exec(String(s)); return m ? { lon: +(+m[1]).toFixed(5), lat: +(+m[2]).toFixed(5) } : null }
const qid = u => /\/entity\/(Q\d+)$/.exec(String(u))?.[1] || null
const at = now(), places = {}
const add = (place, b, dico) => { const c = pt(b.coord.value), id = qid(b.m.value); if (!c || !id || places[place]) return
    places[place] = { place, name: b.mLabel.value, dico: dico || null, lat: c.lat, lon: c.lon, wikidata: `https://www.wikidata.org/wiki/${id}`, source: `https://www.wikidata.org/wiki/Special:EntityData/${id}.json`, property: 'P625 (coordinate location)', license: { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', holder: 'Wikidata contributors' }, read_at: at } }
for (const b of await ask(q)) add(want.get(b.dico.value), b, b.dico.value)
const quart = await ask(qq); if (quart[0]) add('quarteira', quart[0], '0808')
// places beyond Portugal, by their Wikidata item (Dinis, 18 Nov 2026 ~22:20 UTC: London first)
const BEYOND = { london: 'Q84' }
for (const [place, id] of Object.entries(BEYOND)) { const r = await ask(`SELECT ?m ?mLabel ?coord WHERE { VALUES ?m { wd:${id} } ?m wdt:P625 ?coord. SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`); if (r[0]) add(place, r[0], null) }
const missing = [...want.values(), 'quarteira', 'london'].filter(p => !places[p])
writeJson(path.join(ROOT, 'register/places.json'), { about: 'Each place\'s coordinates (the municipality\'s, or the parish\'s for Quarteira), as Wikidata gives them (P625), matched on the DICO code. A point for maps, not a boundary.', read_at: at, by: 'collect/places-coords.mjs (code, no model; run by data.b@PrompTugal.dinis)', source: SPARQL, license: { name: 'CC0 1.0', url: 'https://creativecommons.org/publicdomain/zero/1.0/', holder: 'Wikidata contributors' }, missing, places })
console.log(`places: ${Object.keys(places).length} with coordinates; missing: ${missing.join(', ') || 'none'}`)
