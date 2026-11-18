// Now in each Algarve place: board/tools/local-now.mjs from PrompTugal__News__Website (conductor@PrompTugal.dinis,
// 16 November 2026), moved here and changed to read this site's own collected files instead of IPMA and adsb.lol a
// second time. Writes data/by-place/now/<place>.json in the same shape as PrompTugal__News__Website's
// data/by-place/now/ (data/schemas/by-place-now.schema.json there), so the place pages can switch to
// https://data.promptugal.news/api/v1/by-place/now/<place>.json without a change. Code, no model, no request.
// The place map (collect/by-place-map.json) is board/briefs/2026-11-16-storm-local-map.json there, copied unchanged.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, readJson, writeJson, now } from './lib.mjs'

const D = id => readJson(path.join(ROOT, 'data', id, 'latest.json'), {}) || {}
const MAP = readJson(path.join(ROOT, 'collect/by-place-map.json'), [])
const OUT = path.join(ROOT, 'data/by-place/now')
const BY = 'collect/by-place-now.mjs (code, no model; data@PrompTugal.dinis), from this site\'s collected sources'
const IPMA = 'https://api.ipma.pt/open-data/'
const PAGE = { station: 'https://www.ipma.pt/en/otempo/obs.superficie/', forecast: 'https://www.ipma.pt/en/otempo/prev.localidade.hora/', warnings: 'https://www.ipma.pt/en/otempo/prev-sam/',
    fire: 'https://www.ipma.pt/en/riscoincendio/rcm.pt/', uv: 'https://www.ipma.pt/en/otempo/prev.uv/', sea: 'https://www.ipma.pt/en/maritima/costeira/', airport: 'https://globe.adsb.lol/?lat=37.014&lon=-7.966&zoom=9' }
const FORECAST = { 1110600: 'Lisboa', 1080500: 'Faro', 1080800: 'Loulé', 1081100: 'Portimão', 1081505: 'Sagres' }
const SEA = { faro: 1080526, sagres: 1081526 }
// Lisboa (live.b@ asked, 18 Nov 2026 19:05 UTC): IPMA's Lisboa (Geofísico) station, Lisboa forecast and UV, Lisbon coast, warnings area LSB.
// Kept here, not in the place map, which other collectors read with Lisboa added on their own.
const LISBOA = { place: 'lisboa', dico: '1106', station: 'Lisboa (Geofísico)', station_id: 1200535, forecast_id: 1110600, area: 'LSB', area_name: 'the Lisboa district', uv_id: 1110600, uv_name: 'Lisboa', sea_id: 1111026, sea_name: 'Lisbon coast' }
// coordinates: register/places.json (Wikidata, CC0), made by collect/places-coords.mjs
const COORDS = (readJson(path.join(ROOT, 'register/places.json'), { places: {} }) || { places: {} }).places || {}
const coordsOf = p => { const c = COORDS[p]; return c ? { lat: c.lat, lon: c.lon, name: c.name, wikidata: c.wikidata, source: c.source, property: c.property, license: c.license, read_at: c.read_at, note: 'The municipality\'s point on Wikidata (the parish\'s for Quarteira): for maps, not a boundary.' } : null }
const WEST = new Set(['vila-do-bispo', 'aljezur', 'lagos']), INLAND = new Set(['monchique', 'alcoutim', 'sao-bras-de-alportel', 'silves'])

const obs = D('ipma-observations'), warn = D('ipma-warnings'), city = D('ipma-city-forecasts'), rcm = D('ipma-fire-risk'), uv = D('ipma-uv'), sea = D('ipma-sea'), adsb = D('adsb-faro')
const reads = {}
for (const [k, j] of Object.entries({ observations: obs, warnings: warn, forecasts: city, 'fire-risk': rcm, uv, sea, adsb })) reads[k] = { url: `https://data.promptugal.news/api/v1/${j.source || k}/latest.json`, at: j.read_at || null, status: j.read_at ? 200 : 'not read' }
const stationOf = id => { const s = (obs.stations || []).find(x => x.id === id); return s && s.reading ? { at: obs.hour_utc, ...s.reading } : null }
const activeIn = a => (warn.active || []).filter(w => w.area === a).map(({ area, area_name, ...w }) => w), active = activeIn('FAR')
const fireOf = dico => ((rcm.municipalities || []).find(m => m.dico === dico)?.days || []).map(d => ({ date: d.date, level: d.level }))
const uvOf = id => { const p = (uv.places || []).find(x => x.id === id); const d = p ? [...p.days].sort((a, b) => b.date.localeCompare(a.date))[0] : null; return d ? { date: d.date, index: d.index } : null }
const seaOf = id => { const c = (sea.coasts || []).find(x => x.id === id); const d = c?.days?.[0]; return d ? { date: d.date, waves_max_m: d.waves_max_m, sea_max_m: d.sea_max_m, sea_temp_max_c: d.sea_temp_max_c } : null }
const airport = adsb.read_at ? { icao: 'LPFR', name: 'Faro airport', within_nm: 40, at: adsb.read_at, airline: (adsb.airline || []).map(a => ({ callsign: a.callsign, airline: a.airline_icao, type: a.type, alt_ft: a.alt_ft, on_ground: a.on_ground, ground_speed_kt: a.ground_speed_kt })), other_aircraft: adsb.counts?.other_aircraft ?? null, page: PAGE.airport, source: 'https://api.adsb.lol/', note: 'What adsb.lol\'s community receivers saw within 40 nautical miles at the time read. Airline flights by callsign; other aircraft only counted.', ...(adsb.stale ? { stale: true, stale_note: adsb.stale_note } : {}) } : null

fs.mkdirSync(OUT, { recursive: true })
for (const m of [...MAP, LISBOA]) {
    const f = (city.cities || []).find(c => c.id === m.forecast_id)
    const out = { place: m.place, read_at: now(), by: BY, coords: coordsOf(m.place),
        about: 'Now in this place, from IPMA\'s open data and (for Faro) adsb.lol, as collected by data.promptugal.news: each value with its source and the time read; coords from Wikidata. Not a warning service: follow IPMA (https://www.ipma.pt/) and ANEPC.',
        station: { name: m.station, id: m.station_id, km: m.station_km, reading: stationOf(m.station_id), page: PAGE.station, source: IPMA + 'observation/meteorology/stations/observations.json' },
        forecast: f && f.days ? { place: FORECAST[m.forecast_id], id: m.forecast_id, km: m.forecast_km, page: PAGE.forecast, days: f.days.slice(0, 5).map(d => ({ date: d.date, t_min_c: d.t_min_c, t_max_c: d.t_max_c, rain_prob_pct: d.rain_prob_pct, weather_type: d.weather_type })), source: f.source } : null,
        warnings: { area: m.area ? `${m.area} (${m.area_name})` : 'FAR (the Faro district)', active: m.area ? activeIn(m.area) : active, page: PAGE.warnings, source: IPMA + 'forecast/warnings/warnings_www.json' },
        fire_risk: { municipality: m.dico, days: fireOf(m.dico), page: PAGE.fire, source: IPMA + 'forecast/meteorology/rcm/rcm-d0.json' },
        uv: (() => { const id = m.uv_id || (WEST.has(m.place) ? 1081525 : 1080500), u = uvOf(id); return u ? { place: m.uv_name || (id === 1081525 ? 'Sagres' : 'Faro'), ...u, page: PAGE.uv, source: IPMA + 'forecast/meteorology/uv/uv.json' } : null })(),
        sea: INLAND.has(m.place) ? null : (() => { const id = m.sea_id || (WEST.has(m.place) || m.place === 'portimao' || m.place === 'lagoa' ? SEA.sagres : SEA.faro), s = seaOf(id); return s ? { coast: m.sea_name || (id === SEA.sagres ? 'Sagres coast' : 'Faro coast'), ...s, page: PAGE.sea, source: IPMA + 'forecast/oceanography/daily/hp-daily-sea-forecast-day0.json' } : null })(),
        airport: ['faro', 'olhao', 'loule'].includes(m.place) ? airport : null, reads }
    writeJson(path.join(OUT, `${m.place}.json`), out)
}
// London (Dinis, 18 Nov 2026 ~22:20 UTC: the first place beyond Portugal), from London's own sources only: the Environment Agency's
// floods and river levels and Open-Meteo's forecast (free, non-commercial terms; data.promptugal.news is free). No IPMA here.
{ const ea = D('ea-flood'), om = D('open-meteo-london')
  writeJson(path.join(OUT, 'london.json'), { place: 'london', country: 'GB', read_at: now(), by: BY, coords: coordsOf('london'),
    about: 'Now in London, from the Environment Agency (flood warnings and Thames levels, Open Government Licence) and Open-Meteo (forecast, CC BY 4.0), as collected by data.promptugal.news: each value with its source and the time read. Not a warning service: follow the Environment Agency (https://check-for-flooding.service.gov.uk/) and the Met Office.',
    forecast: om.read_at ? { days: (om.daily || []).map(d => ({ date: d.date, t_min_c: d.temperature_min_c, t_max_c: d.temperature_max_c, rain_mm: d.precipitation_sum_mm, weather_code: d.weather_code })), at: om.read_at, source: 'https://data.promptugal.news/api/v1/open-meteo-london/latest.json', attribution: 'Weather data by Open-Meteo.com', license: { name: 'CC BY 4.0', url: 'https://open-meteo.com/en/licence' } } : null,
    floods: ea.read_at ? { warnings: (ea.warnings || []).map(w => ({ id: w.id, severity: w.severity, area: w.area || w.description || null, url: w.url })), stations: (ea.stations || []).length, at: ea.read_at, source: 'https://data.promptugal.news/api/v1/ea-flood/latest.json', attribution: 'this uses Environment Agency flood and river level data from the real-time data API (Beta)', license: { name: 'Open Government Licence v3.0', url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/' } } : null,
    reads: { 'ea-flood': { url: 'https://data.promptugal.news/api/v1/ea-flood/latest.json', at: ea.read_at || null }, 'open-meteo-london': { url: 'https://data.promptugal.news/api/v1/open-meteo-london/latest.json', at: om.read_at || null } } }) }
writeJson(path.join(OUT, 'algarve.json'), { place: 'algarve', read_at: now(), by: BY, about: 'Now in the Algarve: IPMA\'s warnings for the Faro district, Faro airport, and each place\'s nearest station. Not a warning service.',
    warnings: { area: 'FAR (the Faro district)', active, page: PAGE.warnings, source: IPMA + 'forecast/warnings/warnings_www.json' }, airport,
    places: MAP.map(m => ({ place: m.place, station: m.station, temp_c: stationOf(m.station_id)?.temp_c ?? null })), reads })
console.log(`by-place/now: ${MAP.length + 3} files`)
