// Strictly Come Dancing, series 1 to 15 (2004 to 2017): every performance with each judge's score, from Four Tens'
// strictly-come-dancing-results (CC0 1.0), pinned to commit 80e85ae (22 Aug 2018, the repository's last). Dinis, 22 Nov 2026:
// the Strictly brief (board/team/data-d/briefs/2026-11-22-dinis-strictly-and-more-sources.md) and "let's build ... this football and
// strictly data point". Code, no model. data.d@PrompTugal.dinis.
// Rules from the brief: keep each judge's score and the published total; a judge who did not sit is null, never 0 (the CSV writes
// 0); averages are separate fields with their denominator; coverage is published. A judge who scored fewer than half of a
// series' performances is flagged as a guest or stand-in, to be checked against another source (the Wikipedia feed).
const COMMIT = '80e85ae60488ab0299e7b7443acc5ffda9ca6a65'
const RAW = `https://raw.githubusercontent.com/four-tens/strictly-come-dancing-results/${COMMIT}`
const JUDGES = { craig: 'Craig Revel Horwood', arlene: 'Arlene Phillips', len: 'Len Goodman', bruno: 'Bruno Tonioli', alesha: 'Alesha Dixon', darcey: 'Darcey Bussell', jennifer: 'Jennifer Grey', donny: 'Donny Osmond', shirley: 'Shirley Ballas' }
const HYPE = /\b(revolutionary|cutting[- ]edge|seamless(?:ly)?|world[- ]class|game[- ]changing)\b/i
let dropped = 0
const txt = s => { const t = String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 120); if (!t) return null; if (t.includes('—') || HYPE.test(t)) { dropped++; return null } return t }
// a small CSV reader: quoted fields with doubled quotes, commas and newlines inside quotes
export function csv(s) {
    const rows = []; let row = [], f = '', q = false
    for (let i = 0; i < s.length; i++) { const c = s[i]
        if (q) { if (c === '"') { if (s[i + 1] === '"') { f += '"'; i++ } else q = false } else f += c }
        else if (c === '"') q = true; else if (c === ',') { row.push(f); f = '' } else if (c === '\n' || c === '\r') { if (c === '\r' && s[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = '' } else f += c }
    if (f || row.length) { row.push(f); rows.push(row) }
    const [head, ...rest] = rows.filter(r => r.length > 1 || r[0]); return rest.map(r => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ''])))
}
const int = v => /^\d+$/.test(String(v).trim()) ? +v : null

export default async function (run) {
    dropped = 0
    const get = async n => { const r = await run.get(n, `${RAW}/${n}.csv`, { timeout: 30000 }); if (r.ok) r.ext = 'csv'; return r.ok ? csv(r.bytes.toString('utf8')) : null }
    const results = await get('results'), celebs = await get('celebrities'), pros = await get('professionals')
    if (!results || !celebs || !pros) return null
    const celeb = new Map(celebs.map(c => [c.id, { id: `c${c.id}`, name: txt(c.name), occupation: txt(c.occupation), age_at_series: int(c.age) }]))
    const pro = new Map(pros.map(p => [p.id, { id: `p${p.id}`, name: txt(p.name) }]))
    const perf = results.map((r, i) => {
        const scores = {}; for (const j of Object.keys(JUDGES)) { const v = int(r[`score_${j}`]); scores[j] = v ? v : null }   // 0 means "did not sit"
        const sat = Object.values(scores).filter(v => v != null), total = int(r.total)
        return { id: `s${r.series}-w${r.week}-${i}`, series: int(r.series), week: int(r.week), running_order: int(r.running_order), celebrity: `c${r.celebrity_id}`, professional: `p${r.professional_id}`,
            dance: txt(r.dance), song: txt(r.song), scores, judges_sat: sat.length, total, maximum_possible: sat.length ? sat.length * 10 : null, sum_matches_total: sat.reduce((a, b) => a + b, 0) === total }
    })
    const series = [...new Set(perf.map(p => p.series))].sort((a, b) => a - b).map(n => {
        const ps = perf.filter(p => p.series === n), sat = Object.fromEntries(Object.keys(JUDGES).map(j => [j, ps.filter(p => p.scores[j] != null).length]))
        const panel = Object.keys(JUDGES).filter(j => sat[j] >= ps.length / 2), guests = Object.keys(JUDGES).filter(j => sat[j] > 0 && sat[j] < ps.length / 2)
        const couples = [...new Set(ps.map(p => `${p.celebrity}|${p.professional}`))].map(k => { const [c, p] = k.split('|'); const mine = ps.filter(x => x.celebrity === c && x.professional === p)
            const pct = mine.filter(x => x.maximum_possible && x.total != null).map(x => x.total / x.maximum_possible); return { celebrity: c, professional: p, performances: mine.length, last_week: Math.max(...mine.map(x => x.week)), average_percent: pct.length ? Math.round(pct.reduce((a, b) => a + b, 0) / pct.length * 1000) / 10 : null, performances_without_judges: mine.length - pct.length } })
            .sort((a, b) => b.last_week - a.last_week || b.average_percent - a.average_percent)
        return { series: n, year: 2003 + n, year_note: 'from the series number: series 1 was broadcast in 2004', performances: ps.length, weeks: Math.max(...ps.map(p => p.week)),
            panel: panel.map(j => JUDGES[j]), occasional_judges: guests.map(j => ({ judge: JUDGES[j], performances_scored: sat[j], note: 'fewer than half of this series\' performances: a guest or stand-in, to check against another source' })),
            couples, average_percent_method: 'each performance\'s total divided by 10 times the judges who sat, then averaged over the couple\'s performances' }
    })
    const flags = series.flatMap(s => s.occasional_judges.map(g => ({ series: s.series, ...g })))
    return { source: run.id, title: run.card.title, read_at: run.started, country: 'GB', place: 'london',
        provenance: run.prov({ commit: COMMIT, files: ['results.csv', 'celebrities.csv', 'professionals.csv'].map(f => `${RAW}/${f}`) }),
        about: 'Strictly Come Dancing series 1 to 15 (2004 to 2017): each performance with each judge\'s score and the published total, the couples and the judging panel of each series. A judge who did not sit is null. Series 16 onwards, weekly results, eliminations and broadcast dates are not in this source: they are to come from the Wikipedia feed and TVmaze.',
        attribution: 'Data: Four Tens, strictly-come-dancing-results, public domain (CC0 1.0)',
        coverage: { series_from: series[0]?.series, series_to: series.at(-1)?.series, missing: ['series 16 onwards (2018 to now)', 'weekly results and eliminations', 'final placements', 'broadcast dates'],
            totals_checked: perf.length, totals_matching: perf.filter(p => p.sum_matches_total).length, performances_without_judges: perf.filter(p => !p.judges_sat).length,
            celebrities_without_performances: [...celeb.values()].filter(c => !perf.some(p => p.celebrity === c.id)).map(c => c.name), celebrities_without_performances_note: 'listed in celebrities.csv with no row in results.csv (likely the series 16 line-up, 2018, announced before the data stopped)' },
        counts: { series: series.length, performances: perf.length, celebrities: celeb.size, professionals: pro.size, flags: flags.length, fields_dropped_wording: dropped },
        judges: Object.entries(JUDGES).map(([id, name]) => ({ id, name })), flags, series,
        celebrities: [...celeb.values()], professionals: [...pro.values()], performances: perf }
}
