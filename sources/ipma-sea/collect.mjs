// IPMA's daily sea forecast (waves, total sea, sea temperature) for each coastal place, today and the next two days. Code, no model.
import { IPMA } from '../../collect/ipma.mjs'
import { num } from '../../collect/lib.mjs'
export default async function (run) {
    const locs = await run.json('sea-locations', IPMA + 'sea-locations.json')
    const names = new Map((locs || []).map(l => [l.globalIdLocal, { name: l.local, area: l.idAreaAviso }]))
    const days = []
    for (const d of [0, 1, 2]) { const src = `${IPMA}forecast/oceanography/daily/hp-daily-sea-forecast-day${d}.json`; const j = await run.json(`sea-day${d}`, src); if (j) days.push({ d, date: j.forecastDate, source: src, data: j.data || [] }) }
    if (!days.length) return null
    const ids = new Set(days.flatMap(x => x.data.map(y => y.globalIdLocal)))
    const coasts = [...ids].sort((a, b) => a - b).map(id => {
        const first = days.flatMap(x => x.data).find(y => y.globalIdLocal === id)
        return { id, name: names.get(id)?.name || null, area: names.get(id)?.area || null, lat: num(first.latitude), lon: num(first.longitude),
            days: days.map(x => { const s = x.data.find(y => y.globalIdLocal === id); return s ? { date: x.date, waves_min_m: num(s.waveHighMin), waves_max_m: num(s.waveHighMax), wave_period_min_s: num(s.wavePeriodMin), wave_period_max_s: num(s.wavePeriodMax), wave_dir: s.predWaveDir || null, sea_min_m: num(s.totalSeaMin), sea_max_m: num(s.totalSeaMax), sea_temp_min_c: num(s.sstMin), sea_temp_max_c: num(s.sstMax) } : null }).filter(Boolean) }
    })
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ source: IPMA + 'forecast/oceanography/daily/hp-daily-sea-forecast-day{0,1,2}.json' }),
        about: 'IPMA\'s daily sea forecast for each coastal place: significant wave height, wave period and direction, total sea, and sea surface temperature, today and the next two days.',
        files: days.map(({ data, ...x }) => x), counts: { coasts: coasts.length }, coasts }
}
