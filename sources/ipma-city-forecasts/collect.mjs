// IPMA's daily forecasts (five days) for each district capital and island, and three more Algarve places. Code, no model.
import { IPMA, places } from '../../collect/ipma.mjs'
import { num } from '../../collect/lib.mjs'
// what we said: each forecast IPMA issued (its dataUpdate) is kept per city for 30 days, carried from the previous read, so a
// past day's forecast one, two and three days ahead can be shown beside what the station measured (Dinis, 19 Nov 2026 ~01:17 UTC,
// PrompTugal__News__Website board/guidance/2026-11-19-show-the-past.md). data.b@PrompTugal.dinis.
const KEEP_DAYS = 30
export default async function (run, prev) {
    const P = await places(run)
    const cities = []
    for (const [id, p] of P) {
        const src = `${IPMA}forecast/meteorology/cities/daily/${id}.json`
        const f = await run.json(`city-${id}`, src)
        cities.push({ id, name: p.name, area: p.area, lat: p.lat, lon: p.lon, source: src, read_at: run.reads.at(-1).at, updated: f?.dataUpdate || null,
            days: f ? (f.data || []).map(d => ({ date: d.forecastDate, t_min_c: num(d.tMin), t_max_c: num(d.tMax), rain_prob_pct: num(d.precipitaProb), weather_type: num(d.idWeatherType), wind_dir: d.predWindDir || null, wind_class: num(d.classWindSpeed), rain_class: num(d.classPrecInt) })) : null })
    }
    if (!cities.some(c => c.days)) return null
    const hist = { ...(prev?.forecast_history || {}) }   // { cityId: [{ issued, read_at, days: [{date, t_min_c, t_max_c, rain_prob_pct, weather_type}] }] }
    const cutoff = Date.parse(run.started) - KEEP_DAYS * 864e5
    for (const c of cities) {
        if (!c.days) continue
        const issued = c.updated || c.read_at, list = (hist[c.id] || []).filter(h => Date.parse(h.issued) >= cutoff)
        if (!list.some(h => h.issued === issued)) list.push({ issued, read_at: c.read_at, days: c.days.map(d => ({ date: d.date, t_min_c: d.t_min_c, t_max_c: d.t_max_c, rain_prob_pct: d.rain_prob_pct, weather_type: d.weather_type })) })
        hist[c.id] = list.sort((a, b) => String(a.issued).localeCompare(String(b.issued)))
    }
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ source: cities.find(c => c.days).source, sources: cities.map(c => c.source), source_pattern: IPMA + 'forecast/meteorology/cities/daily/{globalIdLocal}.json' }),   // data.b@, 18 Nov: a concrete source first; each city also keeps its own
        about: 'IPMA\'s daily forecast for each place, five days, each place with its own source address and time read. weather_type is IPMA\'s code (https://api.ipma.pt/open-data/weather-type-classe.json); wind_class and rain_class are IPMA\'s classes.',
        counts: { places: cities.length, read: cities.filter(c => c.days).length, forecasts_kept: Object.values(hist).reduce((n, l) => n + l.length, 0) }, cities,
        forecast_history_about: 'Each forecast IPMA issued (issued = its dataUpdate), per city id, kept 30 days from the first read on 19 November 2026; read_at is when we read it.',
        forecast_history: hist }
}
