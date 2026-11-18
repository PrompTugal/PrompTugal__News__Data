// IPMA's daily forecasts (five days) for each district capital and island, and three more Algarve places. Code, no model.
import { IPMA, places } from '../../collect/ipma.mjs'
import { num } from '../../collect/lib.mjs'
export default async function (run) {
    const P = await places(run)
    const cities = []
    for (const [id, p] of P) {
        const src = `${IPMA}forecast/meteorology/cities/daily/${id}.json`
        const f = await run.json(`city-${id}`, src)
        cities.push({ id, name: p.name, area: p.area, lat: p.lat, lon: p.lon, source: src, read_at: run.reads.at(-1).at, updated: f?.dataUpdate || null,
            days: f ? (f.data || []).map(d => ({ date: d.forecastDate, t_min_c: num(d.tMin), t_max_c: num(d.tMax), rain_prob_pct: num(d.precipitaProb), weather_type: num(d.idWeatherType), wind_dir: d.predWindDir || null, wind_class: num(d.classWindSpeed), rain_class: num(d.classPrecInt) })) : null })
    }
    if (!cities.some(c => c.days)) return null
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ source: cities.find(c => c.days).source, sources: cities.map(c => c.source), source_pattern: IPMA + 'forecast/meteorology/cities/daily/{globalIdLocal}.json' }),   // data.b@, 18 Nov: a concrete source first; each city also keeps its own
        about: 'IPMA\'s daily forecast for each place, five days, each place with its own source address and time read. weather_type is IPMA\'s code (https://api.ipma.pt/open-data/weather-type-classe.json); wind_class and rain_class are IPMA\'s classes.',
        counts: { places: cities.length, read: cities.filter(c => c.days).length }, cities }
}
