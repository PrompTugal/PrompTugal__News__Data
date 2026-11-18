// Airline flights between the London airports (EGLL, EGKK, EGSS, EGGW, EGLC) and Faro (LPFR), Lisbon (LPPT) and Porto (LPPR),
// from adsb.lol (ODbL 1.0). Code, no model. Decision by Dinis (18 Nov 2026; PrompTugal__News__Website board/guidance/2026-11-18-london.md):
// London, including the UK-Portugal link as data, keyless sources only. data.b.dev@PrompTugal.dinis for data.b@ (WS-177).
// Method: one position request around each of the three Portuguese airports (as adsb-faro does for Faro), then ONE route lookup
// (adsb.lol's routeset, a free path that is not counted against the quota) for every airline callsign seen; a flight is kept only when
// its route links a London airport to LPFR, LPPT or LPPR. Requests per run: 3 positions + 1 routeset = 4.
// Privacy (the storm site's rule, as in sources/adsb-faro): airline flights by callsign only; no hex id, no registration, no
// aircraft that is not an airline flight; positions rounded to 0.01 degree. Nothing raw goes to the vault (run.raw is emptied).
import path from 'node:path'
import { num, readJson, ROOT } from '../../collect/lib.mjs'
const KEEP_DAYS = 14
const LONDON = ['EGLL', 'EGKK', 'EGSS', 'EGGW', 'EGLC'], PT = ['LPFR', 'LPPT', 'LPPR']
const DAYKEY = /^\d{4}-\d{2}-\d{2}$/, ROUTE = /^(EG[A-Z]{2}|LP[A-Z]{2})-(EG[A-Z]{2}|LP[A-Z]{2})$/, CALL = /^[A-Z]{3}\d{1,4}[A-Z]{0,2}$/
const r2 = v => v == null ? null : Math.round(v * 100) / 100
const bandOf = alt => alt == null ? 'unknown' : alt === 0 ? 'ground' : alt < 5000 ? 'below 5,000 ft' : alt < 15000 ? '5,000 to 15,000 ft' : alt < 30000 ? '15,000 to 30,000 ft' : '30,000 ft and above'
// the legs of a route string such as "EGLL-LPFR" or "EGLL-LPPT-LPFR": consecutive pairs that link London and Portugal
export const londonPortugalLegs = codes => {
    const p = String(codes || '').toUpperCase().split('-'); const legs = []
    for (let i = 0; i + 1 < p.length; i++) { const a = p[i], b = p[i + 1]; if ((LONDON.includes(a) && PT.includes(b)) || (PT.includes(a) && LONDON.includes(b))) legs.push([a, b]) }
    return legs
}

export default async function (run) {
    const { airports } = run.card
    const prev = readJson(path.join(ROOT, 'data', run.id, 'latest.json'), null)
    const seenAc = new Map()   // callsign -> the airline flight seen near a Portuguese airport (no hex id is read into it)
    let requests = 0, pointsOk = 0, otherAircraft = 0
    for (const a of airports) {
        const j = await run.json(`point-${a.icao.toLowerCase()}`, `https://api.adsb.lol/v2/point/${a.lat}/${a.lon}/${a.nm}`); requests++
        if (!j || !Array.isArray(j.ac)) continue
        pointsOk++
        for (const x of j.ac) {
            const cs = String(x.flight || '').trim()
            if (!CALL.test(cs)) { otherAircraft++; continue }
            const alt = x.alt_baro === 'ground' ? 0 : num(x.alt_baro)
            if (!seenAc.has(cs)) seenAc.set(cs, { callsign: cs, airline_icao: cs.slice(0, 3), type: typeof x.t === 'string' && /^[A-Z0-9]{2,4}$/.test(x.t) ? x.t : null, lat: r2(num(x.lat)), lon: r2(num(x.lon)), alt_ft: alt })
        }
    }
    run.raw = []   // adsb.lol's answers name private aircraft by hex id and position: nothing raw goes to the vault
    if (!pointsOk) {   // keep the last read with its own time, marked stale, rather than nothing
        return prev && prev.read_at ? { ...prev, stale: true, stale_note: `adsb.lol could not be read at ${run.started}; these values are from the last read, at read_at.` } : null
    }
    // one route lookup for every airline callsign with a position (a free path of adsb.lol, not counted against the daily limit)
    const planes = [...seenAc.values()].filter(f => f.lat != null && f.lon != null).map(f => ({ callsign: f.callsign, lat: f.lat, lng: f.lon }))
    const routes = new Map(); let routesetStatus = 'not asked (no airline flights seen)', routesetItems = 0
    if (planes.length) {
        const r = await run.get('routeset', 'https://api.adsb.lol/api/0/routeset', { method: 'POST', body: JSON.stringify({ planes }), headers: { 'content-type': 'application/json', accept: 'application/json' } }); requests++
        run.raw = []
        const body = r.ok ? r.json() : null
        const list = Array.isArray(body) ? body : Array.isArray(body?.routes) ? body.routes : []
        routesetItems = list.length
        routesetStatus = !r.ok ? `refused or failed (HTTP ${r.status})` : list.length ? 'answered' : `HTTP ${r.status} with no routes in the answer`
        for (const it of list) {
            const cs = String(it?.callsign || '').trim(), codes = it?.airport_codes || it?._airport_codes_icao
            if (CALL.test(cs) && typeof codes === 'string') routes.set(cs, { codes: codes.toUpperCase(), plausible: it.plausible !== false })
        }
    }
    const flights = []
    for (const f of seenAc.values()) {
        const rt = routes.get(f.callsign); if (!rt || !rt.plausible) continue
        const leg = londonPortugalLegs(rt.codes)[0]; if (!leg) continue
        flights.push({ callsign: f.callsign, airline_icao: f.airline_icao, type: f.type, from: leg[0], to: leg[1], route: `${leg[0]}-${leg[1]}`, lat: f.lat, lon: f.lon, alt_ft: f.alt_ft, altitude_band: bandOf(f.alt_ft), seen_at: run.started })
    }
    flights.sort((a, b) => a.route.localeCompare(b.route) || a.callsign.localeCompare(b.callsign))
    // per day per route, each flight counted once: seen_flights (today's and yesterday's callsigns by route) is carried in latest.json
    const today = run.started.slice(0, 10), yday = new Date(Date.parse(run.started) - 864e5).toISOString().slice(0, 10)
    const cutoff = new Date(Date.parse(run.started) - KEEP_DAYS * 864e5).toISOString().slice(0, 10)
    const daily = {}, seen = {}
    for (const [d, g] of Object.entries(prev?.daily_routes || {})) if (DAYKEY.test(d) && d >= cutoff && g && typeof g === 'object') daily[d] = { ...g }
    for (const [d, g] of Object.entries(prev?.seen_flights || {})) if ((d === today || d === yday) && g && typeof g === 'object') { seen[d] = {}; for (const [rt, a] of Object.entries(g)) if (ROUTE.test(rt) && Array.isArray(a)) seen[d][rt] = new Set(a.filter(c => CALL.test(c))) }
    let counted = 0
    for (const f of flights) {
        seen[today] ??= {}; const s = seen[today][f.route] ??= new Set()
        if (s.has(f.callsign)) continue
        s.add(f.callsign); daily[today] ??= {}; daily[today][f.route] = (daily[today][f.route] || 0) + 1; counted++
    }
    const daily_routes = {}; for (const d of Object.keys(daily).sort()) daily_routes[d] = daily[d]
    const seen_flights = {}; for (const d of [yday, today]) if (seen[d]) { seen_flights[d] = {}; for (const [rt, s] of Object.entries(seen[d])) seen_flights[d][rt] = [...s].sort() }
    const byRoute = {}; for (const f of flights) byRoute[f.route] = (byRoute[f.route] || 0) + 1
    return { source: run.id, title: run.card.title, read_at: run.started,
        provenance: run.prov({ source: 'https://api.adsb.lol/v2/point/<lat>/<lon>/<nm> (three airports) and https://api.adsb.lol/api/0/routeset', licence: 'ODbL 1.0 (adsb.lol)', requests_this_run: requests, requests_counted_by_adsb_lol_this_run: airports.length, routeset_status: routesetStatus, daily_limit_per_address_without_key: 500 }),
        about: 'Airline flights that adsb.lol\'s community receivers saw within 40 nautical miles of Faro, Lisbon or Porto airport, whose route (from adsb.lol\'s route lookup) links a London airport (Heathrow, Gatwick, Stansted, Luton, London City) to that airport. Airline callsigns only: no other aircraft is listed, and no hex id or registration is kept. Coverage depends on volunteers\' receivers and the route lookup is a best guess by callsign and position: absence here is not proof a flight did not happen. daily_routes counts distinct callsigns seen per UTC day per route, not seats or passengers.',
        airports: airports.map(a => ({ icao: a.icao, name: a.name, lat: a.lat, lon: a.lon, within_nm: a.nm })), london_airports: LONDON,
        counts: { requests, position_requests_ok: pointsOk, airline_flights_seen: seenAc.size, other_aircraft: otherAircraft, routes_answered: routesetItems, london_portugal_flights: flights.length, by_route: byRoute, newly_counted_today: counted, days_kept: Object.keys(daily_routes).length },
        routeset: { status: routesetStatus, note: routesetItems ? null : 'adsb.lol\'s route lookup gave no route for any callsign this run, so no flight could be tied to a London route; this is a gap, not a count of zero flights.' },
        flights, daily_routes, seen_flights }
}
