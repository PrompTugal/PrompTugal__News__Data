// The tidal Thames through London (Environment Agency, Thames Tideway gauges from Richmond to Erith): the last 24 hours of
// water level at each, every 15 minutes, as the EA published them. For Dinis's London demos (21 Nov 2026, about 09:16 UTC:
// tier 1, collected once a day as the archive; the page reads the live levels in the browser). Code, no model. One GET per
// gauge (seven), 2.5 seconds apart, no key. Open Government Licence v3.0, with the EA's credit. data.b@PrompTugal.dinis.
const BASE = 'https://environment.data.gov.uk/flood-monitoring'
// the Thames Tideway gauges listed by the EA's station search (qualifier Tidal Level, within 30 km of central London), 21 Nov
// 2026 09:17 UTC, upstream to downstream
const GAUGES = [['0009', 'Richmond'], ['0010', 'Hammersmith'], ['0006', 'Westminster'], ['0007', 'Tower Pier'], ['0001', 'Silvertown'], ['0003', 'Charlton'], ['0018', 'Erith Deep Wharf']]
const num = v => Number.isFinite(+v) ? +v : null
const sleep = ms => new Promise(r => setTimeout(r, ms))
export default async function (run) {
    const gauges = []
    for (const [id, name] of GAUGES) {
        const url = `${BASE}/id/stations/${id}/readings?_sorted&_limit=96`
        const j = await run.json(`gauge-${id}`, url, { headers: { accept: 'application/json' }, timeout: 30000 })
        const rows = (j?.items || []).filter(r => r && typeof r.dateTime === 'string' && num(r.value) != null && /Tidal_Level|level/i.test(String(r.measure || '')))
            .map(r => ({ at: r.dateTime.slice(0, 20), m: +(+r.value).toFixed(3) })).sort((a, b) => a.at.localeCompare(b.at))
        gauges.push({ id, name, station: `${BASE}/id/stations/${id}`, readings: rows.length, latest: rows[rows.length - 1] || null,
            high_24h: rows.length ? rows.reduce((a, b) => b.m > a.m ? b : a) : null, low_24h: rows.length ? rows.reduce((a, b) => b.m < a.m ? b : a) : null, series: rows })
        await sleep(2500)
    }
    if (!gauges.some(g => g.readings)) return null
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ api: `${BASE}/id/stations/{id}/readings?_sorted&_limit=96` }), country: 'GB', place: 'london',
        about: 'Water level on the tidal Thames through London, at seven Environment Agency gauges from Richmond to Erith, every 15 minutes over the 24 hours before the read, in metres as the EA published them (its datum per gauge is on the station page). Not a warning service: the EA\'s own flood warnings are in ea-flood. Collected once a day as the archive; the page shows the live levels read in your browser.',
        live: { url: `${BASE}/id/stations/{id}/readings?_sorted&_limit=8`, how: 'the page asks the EA for each gauge when it opens; the EA allows browser reads (CORS *)' },
        attribution: 'This uses Environment Agency flood and river level data from the real-time data API (Beta)',
        counts: { gauges: gauges.length, with_readings: gauges.filter(g => g.readings).length, readings: gauges.reduce((s, g) => s + g.readings, 0) }, gauges }
}
