// IPMA's surface station observations: the latest hour for every station, with its name and position. Code, no model.
import { IPMA } from '../../collect/ipma.mjs'
import { num } from '../../collect/lib.mjs'
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
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ source: src }),
        about: 'The latest hour IPMA published for each of its surface stations. Missing values (IPMA writes -99) are null; a station that sent nothing that hour has reading null. The hour is UTC.',
        hour_utc: last ? last + ':00Z' : null, hours_in_feed: hours.length, counts: { stations: stations.length, reporting: stations.filter(s => s.reading).length }, stations }
}
