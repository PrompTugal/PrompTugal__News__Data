// Environment Agency real-time flood-monitoring API (Open Government Licence v3.0): current flood warnings and alerts around
// London, and the latest river and tidal levels at the Thames stations in London. Code, no model.
// Decision by Dinis (18 Nov 2026, about 22:20 UTC; PrompTugal__News__Website board/guidance/2026-11-18-london.md): London is the
// first place beyond Portugal. data.b.dev@PrompTugal.dinis for data.b@ (WS-177).
// The place and its coordinates are the card's (card.place), not fixed here: another place is another card.
// Reads: one list of warnings (lat/long and dist), one list of stations (same point, parameter=level), then one call per Thames
// station for its latest readings, then (data.b.dev@, WS-177) one call per rainfall gauge (at most max_rain_gauges). All with the polite reader (2.5 seconds between requests).
const BASE = 'https://environment.data.gov.uk/flood-monitoring'
import path from 'node:path'
import { ROOT, readJson } from '../../collect/lib.mjs'
const KEEP_DAYS = 14
const DAYKEY = /^\d{4}-\d{2}-\d{2}$/, HHMM = /^\d{2}:\d{2}$/
const r1 = v => Math.round(v * 10) / 10
const ID = /^[0-9A-Za-z_-]{1,40}$/, ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
const txt = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) || null : null
// a field holding an em dash (which the site's wording check refuses) is dropped, never altered, and counted
let droppedFields = 0
const keep = (s, n) => { const t = txt(s, n); if (t && t.includes('—')) { droppedFields++; return null } return t }
const numOrNull = v => Number.isFinite(+v) && v !== null && v !== '' ? +v : null
const lastSeg = u => typeof u === 'string' ? u.split('/').pop() : ''
const time = s => typeof s === 'string' && ISO.test(s) ? s.slice(0, 20) : null

export default async function (run) {
    droppedFields = 0
    const { lat, lon, dist_km_warnings, dist_km_stations, river_match, max_stations } = run.card.place
    const q = d => `lat=${lat}&long=${lon}&dist=${d}`
    const fl = await run.json('floods', `${BASE}/id/floods?${q(dist_km_warnings)}`)
    const st = await run.json('stations', `${BASE}/id/stations?${q(dist_km_stations)}&parameter=level`)
    if (!fl || !Array.isArray(fl.items) || !st || !Array.isArray(st.items)) return null
    const warnings = fl.items.filter(w => w && ID.test(String(w.floodAreaID))).map(w => ({
        id: w.floodAreaID, severity: txt(w.severity, 40), severity_level: [1, 2, 3, 4].includes(+w.severityLevel) ? +w.severityLevel : null,
        area: keep(w.description, 120), river_or_sea: keep(w.floodArea?.riverOrSea, 160), county: keep(w.floodArea?.county, 120), tidal: w.isTidal === true,
        ea_area: keep(w.eaAreaName, 80), time_raised: time(w.timeRaised), time_severity_changed: time(w.timeSeverityChanged),
        url: `https://check-for-flooding.service.gov.uk/target-area/${w.floodAreaID}`, api: `${BASE}/id/floods/${w.floodAreaID}` }))
    warnings.sort((a, b) => (a.severity_level ?? 9) - (b.severity_level ?? 9) || a.id.localeCompare(b.id))
    const re = new RegExp(river_match, 'i')
    const picked = st.items.filter(s => s && ID.test(String(s.notation)) && re.test(String(s.riverName || '')) && Number.isFinite(+s.lat) && Number.isFinite(+s.long))
        .sort((a, b) => String(a.notation).localeCompare(String(b.notation))).slice(0, max_stations)
    const stations = []
    for (const s of picked) {
        const r = await run.json(`readings-${s.notation}`, `${BASE}/id/stations/${s.notation}/readings?latest`)
        const seen = new Set(), readings = []
        for (const x of (r?.items || [])) {
            if (!x || numOrNull(x.value) === null) continue
            const m = lastSeg(x.measure); if (seen.has(m)) continue
            seen.add(m)
            const parts = m.split('-'), unit = parts.at(-1), qualifier = parts[2] || null
            readings.push({ qualifier: txt(qualifier, 30), unit: /^[A-Za-z]{1,8}$/.test(unit) ? unit : null, value: numOrNull(x.value), time: time(x.dateTime) })
        }
        stations.push({ id: s.notation, label: keep(s.label, 80), river: keep(s.riverName, 60), town: keep(s.town, 60), lat: +(+s.lat).toFixed(5), long: +(+s.long).toFixed(5),
            readings, url: s.RLOIid && /^\d{1,8}$/.test(String(s.RLOIid)) ? `https://check-for-flooding.service.gov.uk/station/${s.RLOIid}` : null, api: `${BASE}/id/stations/${s.notation}` })
    }
    const rain = await rainfall(run, q)
    const by = {}; for (const w of warnings) by[w.severity || 'unknown'] = (by[w.severity || 'unknown'] || 0) + 1
    return {
        source: run.id, title: run.card.title, place: run.card.place.id, country: run.card.country, read_at: run.started,
        provenance: run.prov({ attribution: 'this uses Environment Agency flood and river level data from the real-time data API (Beta)', licence: 'Open Government Licence v3.0 (http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/)', centre: { lat, lon }, warnings_radius_km: dist_km_warnings, stations_radius_km: dist_km_stations }),
        about: `Flood warnings and alerts the Environment Agency has in force within ${dist_km_warnings} km of ${run.card.place.name}, and the latest water or tidal level at each ${river_match} station within ${dist_km_stations} km, as read. Not a warning service: follow the Environment Agency (check-for-flooding.service.gov.uk).`,
        counts: { warnings: warnings.length, by_severity: by, stations: stations.length, readings: stations.reduce((n, s) => n + s.readings.length, 0), ...(rain ? rain.counts : {}), fields_dropped_em_dash: droppedFields },
        warnings, stations,
        ...(rain ? rain.out : {}),
    }
}

// Rainfall gauges near the point: the nearest max_rain_gauges within rain_dist_km, one request each for the readings since 00:00 UTC
// yesterday (15-minute tipping-bucket totals, mm). Each reading is counted once, by its timestamp: rain_seen (today's and yesterday's
// timestamps by gauge, as HH:MM) is carried in latest.json from the last read, since only latest.json and reads.json are carried between runs.
// daily_rain keeps 14 UTC days, carried from the last read. A gauge whose request fails keeps what it had.
async function rainfall(run, q) {
    const { rain_dist_km, max_rain_gauges } = run.card.place
    if (!rain_dist_km) return null
    const list = await run.json('rain-stations', `${BASE}/id/stations?${q(rain_dist_km)}&parameter=rainfall`)
    if (!list || !Array.isArray(list.items)) return null
    const { lat, lon } = run.card.place
    const dist = s => Math.hypot((+s.lat - lat) * 111.2, (+s.long - lon) * 111.2 * Math.cos(lat * Math.PI / 180))
    const picked = list.items.filter(s => s && ID.test(String(s.notation)) && Number.isFinite(+s.lat) && Number.isFinite(+s.long))
        .sort((a, b) => dist(a) - dist(b) || String(a.notation).localeCompare(String(b.notation))).slice(0, max_rain_gauges)
    const prev = readJson(path.join(ROOT, 'data', run.id, 'latest.json'), null)
    const today = run.started.slice(0, 10), yday = new Date(Date.parse(run.started) - 864e5).toISOString().slice(0, 10)
    const cutoff = new Date(Date.parse(run.started) - KEEP_DAYS * 864e5).toISOString().slice(0, 10)
    const daily = {}, seen = {}   // seen[day][gauge] = Set of HH:MM
    for (const [d, g] of Object.entries(prev?.daily_rain || {})) if (DAYKEY.test(d) && d >= cutoff && g && typeof g === 'object') daily[d] = JSON.parse(JSON.stringify(g))
    for (const [d, g] of Object.entries(prev?.rain_seen || {})) if ((d === today || d === yday) && g && typeof g === 'object') { seen[d] = {}; for (const [id, a] of Object.entries(g)) if (ID.test(id) && Array.isArray(a)) seen[d][id] = new Set(a.filter(t => HHMM.test(t))) }
    const gauges = []; let requests = 1, counted = 0, failed = 0
    for (const s of picked) {
        const r = await run.json(`rain-${s.notation}`, `${BASE}/id/stations/${s.notation}/readings?since=${yday}T00:00:00Z&_limit=500`)
        requests++
        const m = (s.measures || []).find(x => x && x.parameter === 'rainfall') || {}
        const g = { id: s.notation, label: `${keep(s.label, 60) || 'Rainfall station'} ${s.notation}`, lat: +(+s.lat).toFixed(5), long: +(+s.long).toFixed(5), rain_mm: null, period_s: Number.isFinite(+m.period) ? +m.period : null, time: null }
        if (!r || !Array.isArray(r.items)) { failed++; gauges.push(g); continue }
        let lastT = null
        for (const x of r.items) {
            const t = time(x?.dateTime), v = numOrNull(x?.value)
            if (!t || v === null || v < 0 || t.slice(0, 10) < yday) continue
            const day = t.slice(0, 10), hm = t.slice(11, 16)
            if (!lastT || t > lastT.t) lastT = { t, v }
            seen[day] ??= {}; seen[day][s.notation] ??= new Set()
            if (seen[day][s.notation].has(hm)) continue
            seen[day][s.notation].add(hm)
            daily[day] ??= {}; const e = daily[day][s.notation] ??= { rain_mm: 0, readings: 0 }
            e.rain_mm = r1(e.rain_mm + v); e.readings++; counted++
        }
        if (lastT) { g.rain_mm = lastT.v; g.time = lastT.t }
        gauges.push(g)
    }
    const daily_rain = {}; for (const d of Object.keys(daily).sort()) daily_rain[d] = daily[d]
    const rain_seen = {}; for (const d of [yday, today]) if (seen[d]) { rain_seen[d] = {}; for (const [id, set] of Object.entries(seen[d])) rain_seen[d][id] = [...set].sort() }
    return { out: { rain_gauges: gauges, daily_rain, rain_seen, rain_note: 'rain_mm is each gauge\'s latest 15-minute total (mm) as served; daily_rain sums those totals per UTC day for the readings we have seen, each counted once by its timestamp (readings: how many); rain_seen holds the timestamps (HH:MM UTC) of today and yesterday so a reading is never counted twice. A gauge that gave no reading has rain_mm null. Measured values, not a forecast.' },
        counts: { rain_gauges: gauges.length, rain_gauges_with_readings: gauges.filter(g => g.time).length, rain_readings_counted: counted, rain_gauges_failed: failed, rain_days_kept: Object.keys(daily_rain).length, rain_requests: requests } }
}
