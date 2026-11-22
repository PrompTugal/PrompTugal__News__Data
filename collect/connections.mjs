#!/usr/bin/env node
// collect/connections.mjs: connect the dots between the Strictly, football and Wikipedia data (Dinis, 22 Nov 2026 about 16:00 UTC,
// in data.d@'s session: "let's build that Wikipedia data feed ... football and strictly ... and then see how we can connect the
// dots"). Reads only this repository's files, no network. Code, no model. data.d@PrompTugal.dinis. Writes data/connections/latest.json.
// What it links today, and what each link still needs, are stated per link, so nothing is presented as joined when it is not.
import fs from 'node:fs'
import path from 'node:path'
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const read = f => { try { return JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')) } catch { return null } }
const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z')

const strictly = read('data/strictly-four-tens/latest.json'), eng = read('data/football-england/latest.json'), por = read('data/football-portugal/latest.json')
const wiki = read('data/wikipedia/index.json'), tracked = read('register/wikipedia-tracked.json')?.articles || []

// 1. sport on Strictly: celebrities whose occupation is a sport, with their series, partner and average
const SPORT = /footballer|rugby|cricket|athlete|boxer|olympic|swimmer|jockey|darts|snooker|tennis|cyclist|diver|gymnast|rower|skater|sport/i
const sportOnStrictly = strictly ? strictly.celebrities.filter(c => c.occupation && SPORT.test(c.occupation)).map(c => {
    const ps = strictly.performances.filter(p => p.celebrity === c.id), s = strictly.series.find(x => x.series === ps[0]?.series), cp = s?.couples.find(x => x.celebrity === c.id)
    return { celebrity: c.name, occupation: c.occupation, series: ps[0]?.series ?? null, scored: ps.length > 0, professional: strictly.professionals.find(p => p.id === cp?.professional)?.name || null, performances: ps.length, last_week: cp?.last_week ?? null, average_percent: cp?.average_percent ?? null }
}).sort((a, b) => ((a.series ?? 99) - (b.series ?? 99)) || a.celebrity.localeCompare(b.celebrity)) : []

// 2. club names that drift between seasons in openfootball: one club, several spellings (the case for Wikidata ids)
const STOP = new Set(['fc', 'afc', 'cf', 'sc', 'sl', 'cd', 'gd', 'sad', 'clube', 'de', 'futebol', 'football', 'club', 'and', 'the'])
const key = n => n.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').split(/[^a-z0-9]+/).filter(w => w && !STOP.has(w)).sort().join(' ')
const drift = (src, league) => { const g = new Map(); for (const c of src?.clubs || []) { const k = key(c); if (!k) continue; g.set(k, [...(g.get(k) || []), c]) }
    return [...g.values()].filter(v => v.length > 1).map(names => ({ league, names })) }
const clubDrift = [...drift(eng, 'Premier League'), ...drift(por, 'Primeira Liga')]

// 3. Wikipedia: which tracked articles are held, their Wikidata items, and the cited hosts that more than one domain shares
const held = Object.values(wiki?.articles || {}).filter(a => a.revid)
const hostsBy = {}
for (const a of held) { const rec = read(`data/wikipedia/${a.file}`); for (const h of rec?.cited_hosts || []) for (const s of a.for || []) { hostsBy[h.host] ||= {}; hostsBy[h.host][s] = (hostsBy[h.host][s] || 0) + h.uses } }
const shared = Object.entries(hostsBy).filter(([, by]) => Object.keys(by).some(s => s.startsWith('football')) && Object.keys(by).some(s => s.startsWith('strictly'))).map(([host, by]) => ({ host, by }))

const out = {
    about: 'Connections between this site\'s Strictly, football and Wikipedia data. Each link says what joins it today and what it still needs.',
    read_at: now(), by: 'collect/connections.mjs (code, no model; run by data.d@PrompTugal.dinis)',
    links: [
        { id: 'sport-on-strictly', what: 'Strictly celebrities whose occupation is a sport', joined_by: 'the occupation field in Four Tens (series 1 to 15)', items: sportOnStrictly,
          footballers: sportOnStrictly.filter(x => /footballer/i.test(x.occupation)).map(x => x.celebrity),
          needs: 'Wikidata (through the Wikipedia feed) for each person\'s clubs: the footballers on Strictly played before 2010, where openfootball starts' },
        { id: 'club-name-drift', what: 'One club written several ways across openfootball seasons', joined_by: 'a name key (lower case, accents and words such as FC or Clube removed)', items: clubDrift,
          needs: 'the clubs\' Wikidata items, from the Wikipedia feed\'s season articles, to join them by id rather than by name' },
        { id: 'wikipedia-articles', what: 'The Wikipedia articles tracked for Strictly and football, and whether the feed holds them yet', joined_by: 'register/wikipedia-tracked.json',
          items: tracked.map(a => ({ title: a.title, for: a.for, held: !!wiki?.articles?.[a.title]?.revid, revision: wiki?.articles?.[a.title]?.revid || null, wikidata: wiki?.articles?.[a.title]?.wikidata || null })),
          needs: held.length ? null : 'the feed\'s first run, which waits on a Wikimedia credential (an OAuth 2 client-credentials app, free; Dinis to register)' },
        { id: 'shared-cited-hosts', what: 'Publishers cited by both the Strictly and the football articles: the shadow sources the two areas share', joined_by: 'the citations the Wikipedia feed extracts', items: shared,
          needs: held.length ? null : 'the feed\'s first run' },
    ],
    counts: { sport_on_strictly: sportOnStrictly.length, footballers_on_strictly: sportOnStrictly.filter(x => /footballer/i.test(x.occupation)).length, club_name_drift: clubDrift.length, wikipedia_tracked: tracked.length, wikipedia_held: held.length, shared_cited_hosts: shared.length },
    licence: { name: 'CC BY 4.0 (this file); the joined data keep their own: Four Tens CC0, openfootball CC0, Wikipedia CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by/4.0/' },
}
fs.mkdirSync(path.join(ROOT, 'data', 'connections'), { recursive: true })
fs.writeFileSync(path.join(ROOT, 'data', 'connections', 'latest.json'), JSON.stringify(out, null, 1) + '\n')
console.log('connections: ' + Object.entries(out.counts).map(([k, v]) => `${k} ${v}`).join(', '))
