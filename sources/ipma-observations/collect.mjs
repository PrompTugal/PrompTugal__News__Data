// IPMA's surface station observations: the latest hour for every station, with its name and position. Code, no model.
import { IPMA } from '../../collect/ipma.mjs'
import path from 'node:path'
import { num, readJson, ROOT } from '../../collect/lib.mjs'
// daily low, high and rain per station (weather.b@ asked through conductor.b@, 18 Nov 2026 22:21 UTC, for its forecast-accuracy page):
// every hour in the feed (IPMA gives the last 24) is kept per station for today and yesterday (UTC), carried from the previous
// read, so an hour seen twice counts once; each day's summary is kept for 14 days. data.b@PrompTugal.dinis.
const KEEP_DAYS = 14
export default async function (run) {
    const src = IPMA + 'observation/meteorology/stations/observations.json'
    const st = await run.json('stations', IPMA + 'observation/meteorology/stations/stations.json')
    const obs = await run.json('observations', src)
    if (!obs) return null
    const names = new Map((st || []).map(f => [String(f.properties.idEstacao), { name: f.properties.localEstacao, lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1] }]))
    const hours = Object.keys(obs).sort(), last = hours[hours.length - 1]
    const stations = []
    for (const [id, o] of Object.entries(obs[last] || {})) {
        const n = names.get(id) || {}
        if (!o) { stations.push({ id: +id, name: n.name || null, lat: n.lat ?? null, lon: n.lon ?? null, reading: null }); continue }
        stations.push({ id: +id, name: n.name || null, lat: n.lat ?? null, lon: n.lon ?? null, reading: { temp_c: num(o.temperatura), humidity_pct: num(o.humidade), wind_kmh: num(o.intensidadeVentoKM), wind_dir_id: num(o.idDireccVento), rain_mm: num(o.precAcumulada), pressure_hpa: num(o.pressao), radiation_kj_m2: num(o.radiacao) } })
    }
    stations.sort((a, b) => a.id - b.id)
    const prev = readJson(path.join(ROOT, 'data', run.id, 'latest.json'), null) || {}
    const hourly = prev.hourly_cache || {}   // { 'YYYY-MM-DD': { stationId: { 'HH': [temp_c, rain_mm] } } }
    for (const h of hours) { const day = h.slice(0, 10), hh = h.slice(11, 13); if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !/^\d{2}$/.test(hh)) continue
        for (const [id, o] of Object.entries(obs[h] || {})) { if (!o) continue; const t = num(o.temperatura), r = num(o.precAcumulada); if (t === null && r === null) continue; ((hourly[day] ||= {})[id] ||= {})[hh] = [t, r] } }
    const days = Object.keys(hourly).sort(), keepHourly = days.slice(-2)
    const daily = { ...(prev.daily || {}) }
    for (const day of days) { const out = {}; for (const [id, hs] of Object.entries(hourly[day])) { const v = Object.values(hs), ts = v.map(x => x[0]).filter(x => x !== null), rs = v.map(x => x[1]).filter(x => x !== null && x >= 0)
        out[id] = { low_c: ts.length ? Math.min(...ts) : null, high_c: ts.length ? Math.max(...ts) : null, rain_mm: rs.length ? Math.round(rs.reduce((a, b) => a + b, 0) * 10) / 10 : null, hours: v.length } }
        daily[day] = out }
    const dailyKept = Object.fromEntries(Object.keys(daily).sort().slice(-KEEP_DAYS).map(d => [d, daily[d]]))
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ source: src }),
        about: 'The latest hour IPMA published for each of its surface stations. Missing values (IPMA writes -99) are null; a station that sent nothing that hour has reading null. The hour is UTC.',
        hour_utc: last ? last + ':00Z' : null, hours_in_feed: hours.length, counts: { stations: stations.length, reporting: stations.filter(s => s.reading).length, daily_days: Object.keys(dailyKept).length }, stations,
        daily_about: 'Per UTC day and station id: the lowest and highest hourly temperature (C), the rain summed over the hours (mm), and how many hours of the 24 were seen. A day is complete only when hours is 24; the first and the current day are partial. From the hours in IPMA\'s feed at each read, carried from read to read.',
        daily: dailyKept, hourly_cache: Object.fromEntries(keepHourly.map(d => [d, hourly[d]])) }
}
