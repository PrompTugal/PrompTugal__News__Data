// Football results from openfootball's football.json (public domain, CC0 1.0: https://github.com/openfootball/football.json),
// shared by sources/football-england (Premier League, en.1) and sources/football-portugal (Primeira Liga, pt.1).
// Dinis, 22 Nov 2026 about 16:00 UTC, in data.d@'s session: "let's build that Wikipedia data feed, and let's build this football
// and strictly data point, and then see how we can connect the dots". Code, no model. data.d@PrompTugal.dinis.
// One GET per season file from raw.githubusercontent.com, 2.5 s apart (collect/lib.mjs). A season the repository does not hold
// answers 404 and is listed as missing. Standings are computed here from the full-time scores (3 points a win, 1 a draw; ties
// broken by goal difference, then goals scored, then name: the leagues' own tie-breaks differ and are not applied).
export const SEASONS = Array.from({ length: 17 }, (_, i) => `${2010 + i}-${String(11 + i).padStart(2, '0')}`)   // 2010-11 .. 2026-27
const RAW = 'https://raw.githubusercontent.com/openfootball/football.json/master'
const team = s => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80) || null : null
const goals = v => Number.isInteger(v) && v >= 0 && v < 50 ? v : null

export function table(matches) {
    const t = new Map(), row = n => t.get(n) || t.set(n, { team: n, played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 }).get(n)
    for (const m of matches) {
        if (m.home_goals == null || m.away_goals == null) continue
        const h = row(m.home), a = row(m.away)
        h.played++; a.played++; h.for += m.home_goals; h.against += m.away_goals; a.for += m.away_goals; a.against += m.home_goals
        if (m.home_goals > m.away_goals) { h.won++; a.lost++; h.points += 3 } else if (m.home_goals < m.away_goals) { a.won++; h.lost++; a.points += 3 } else { h.drawn++; a.drawn++; h.points++; a.points++ }
    }
    return [...t.values()].map(r => ({ ...r, goal_difference: r.for - r.against }))
        .sort((x, y) => y.points - x.points || y.goal_difference - x.goal_difference || y.for - x.for || x.team.localeCompare(y.team))
        .map((r, i) => ({ position: i + 1, ...r }))
}

export async function collectLeague(run, { code, league, country, place }) {
    const seasons = [], missing = []
    for (const s of SEASONS) {
        const j = await run.json(`${s}-${code}`, `${RAW}/${s}/${code}.json`, { timeout: 30000 })
        if (!j || !Array.isArray(j.matches)) { missing.push(s); continue }
        const matches = j.matches.map(m => ({ round: team(m.round), date: /^\d{4}-\d{2}-\d{2}$/.test(m.date) ? m.date : null, home: team(m.team1), away: team(m.team2),
            home_goals: goals(m.score?.ft?.[0]), away_goals: goals(m.score?.ft?.[1]), half_time: Array.isArray(m.score?.ht) ? m.score.ht.map(goals) : null }))
            .filter(m => m.home && m.away)
        const played = matches.filter(m => m.home_goals != null).length, st = table(matches)
        seasons.push({ season: s, name: team(j.name), matches_listed: matches.length, matches_played: played, complete: played === matches.length && played > 0,
            leader: st[0] ? { team: st[0].team, points: st[0].points, played: st[0].played } : null, last_match_date: matches.filter(m => m.home_goals != null).map(m => m.date).sort().pop() || null, table: st, matches })
    }
    // latest.json keeps every season's table and the matches of the two newest seasons; the older seasons' matches stay in the
    // vault copy of each file (they do not change), so latest.json stays small enough to load in a browser
    const newest = seasons.slice(-2).map(s => s.season)
    const clubs = [...new Set(seasons.flatMap(s => s.table.map(r => r.team)))].sort()
    return { source: run.id, title: run.card.title, read_at: run.started, country, place,
        provenance: run.prov({ files: `${RAW}/<season>/${code}.json` }),
        about: `${league}: every season openfootball holds from 2010-11, with a table computed from the full-time scores, and the matches of the two newest seasons. openfootball is a volunteer project; a season in progress is only as current as its last update (see last_match_date).`,
        attribution: 'Data: openfootball football.json, public domain (CC0 1.0)',
        counts: { seasons: seasons.length, seasons_missing: missing.length, clubs: clubs.length, matches: seasons.reduce((n, s) => n + s.matches_listed, 0), matches_played: seasons.reduce((n, s) => n + s.matches_played, 0) },
        missing_seasons: missing, clubs,
        champions: seasons.filter(s => s.complete).map(s => ({ season: s.season, team: s.leader?.team, points: s.leader?.points })),
        seasons: seasons.map(s => newest.includes(s.season) ? s : { ...s, matches: undefined, matches_note: 'in the vault copy of this season\'s file' }) }
}
