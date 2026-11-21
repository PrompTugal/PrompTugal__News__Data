// The carbon intensity of London's electricity (NESO Carbon Intensity API, region 13, UKPN London): the current half hour and
// the 48-hour forecast, each with its index and generation mix. For Dinis's London demos (21 Nov 2026, about 09:16 UTC: tier 1,
// collected once a day as the archive; the page reads the live half hour in the browser). Code, no model. Two GETs, no key.
// CC BY 4.0 (the API definitions); the API terms: free, rate limited, no selling or sublicensing of the API. data.b@PrompTugal.dinis.
const BASE = 'https://api.carbonintensity.org.uk'
const NOW = `${BASE}/regional/regionid/13`
const num = v => Number.isFinite(+v) ? +v : null
const txt = (s, n) => typeof s === 'string' ? (s.replace(/[^\x20-\x7e]/g, ' ').trim().slice(0, n) || null) : null
const period = p => p && ({ from: txt(p.from, 20), to: txt(p.to, 20), forecast_gco2_kwh: num(p.intensity?.forecast), index: txt(p.intensity?.index, 20),
    mix: Object.fromEntries((p.generationmix || []).filter(m => m && /^[a-z]{2,12}$/.test(String(m.fuel))).map(m => [m.fuel, num(m.perc)])) })
export default async function (run) {
    const from = new Date(run.started); from.setUTCMinutes(from.getUTCMinutes() < 30 ? 0 : 30, 0, 0)
    const FW = `${BASE}/regional/intensity/${from.toISOString().slice(0, 16)}Z/fw48h/regionid/13`
    const n = await run.json('now', NOW, { headers: { accept: 'application/json' }, timeout: 30000 })
    const f = await run.json('forecast-48h', FW, { headers: { accept: 'application/json' }, timeout: 30000 })
    const region = n?.data?.[0]
    if (!region || region.regionid !== 13) return null
    const forecast = (f?.data?.data || []).map(period).filter(p => p && p.from)
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ api: NOW, forecast_api: FW }), country: 'GB', place: 'london',
        about: 'The carbon intensity of the electricity used in London (NESO\'s London region, UKPN London) in grams of CO2 per kWh, for the half hour of the read and forecast for the next 48 hours, each with its index (very low to very high) and the generation mix in per cent. Collected once a day as the archive; the page shows the live half hour read in your browser.',
        live: { url: NOW, how: 'the page asks the Carbon Intensity API for this address when it opens; the API allows browser reads (CORS *)' },
        attribution: 'Carbon Intensity API, National Energy System Operator (NESO), CC BY 4.0',
        region: { id: 13, name: txt(region.shortname, 40), dno: txt(region.dnoregion, 40) },
        now: period((region.data || [])[0]), counts: { forecast_periods: forecast.length }, forecast }
}
