// Open-Meteo forecast for London (CC BY 4.0, free API under its non-commercial terms): three days of hourly values and daily
// min and max, and every forecast served kept for 14 days. Code, no model.
// Decision by Dinis (18 Nov 2026, about 22:40 UTC; board/team/data/briefs/2026-11-18-dinis-europe-open-data-public-service.md):
// this site is free, with no subscriptions or adverts, so the free API is used, attributed. One request a run.
// The place is the card's (card.place), not fixed here. data.b.dev@PrompTugal.dinis for data.b@ (WS-177).
import path from 'node:path'
import { ROOT, readJson } from '../../collect/lib.mjs'
const KEEP_DAYS = 14
const TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, DAY = /^\d{4}-\d{2}-\d{2}$/
const n = v => v === null || v === undefined || v === '' || !Number.isFinite(+v) ? null : +v
const col = (o, k, re) => Array.isArray(o?.[k]) ? o[k] : []

export default async function (run) {
    const { lat, lon, name } = run.card.place
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,weather_code&daily=temperature_2m_min,temperature_2m_max,precipitation_sum,weather_code&forecast_days=3&timezone=UTC&wind_speed_unit=kmh`
    const j = await run.json('forecast', url)
    if (!j || !j.hourly || !j.daily) return null
    const ht = col(j.hourly, 'time').filter(t => TIME.test(String(t)))
    if (!ht.length) return null
    const hourly = ht.map((t, i) => ({ time: t + ':00Z', temperature_c: n(j.hourly.temperature_2m?.[i]), precipitation_probability_pct: n(j.hourly.precipitation_probability?.[i]),
        precipitation_mm: n(j.hourly.precipitation?.[i]), wind_speed_kmh: n(j.hourly.wind_speed_10m?.[i]), wind_gust_kmh: n(j.hourly.wind_gusts_10m?.[i]),
        wind_direction_deg: n(j.hourly.wind_direction_10m?.[i]), weather_code: n(j.hourly.weather_code?.[i]) }))
    const daily = col(j.daily, 'time').map((d, i) => DAY.test(String(d)) ? ({ date: d, temperature_min_c: n(j.daily.temperature_2m_min?.[i]), temperature_max_c: n(j.daily.temperature_2m_max?.[i]),
        precipitation_sum_mm: n(j.daily.precipitation_sum?.[i]), weather_code: n(j.daily.weather_code?.[i]) }) : null).filter(Boolean)
    // every forecast served is kept: the one in the last latest.json becomes history (issued_at plus its daily values), 14 days
    const prev = readJson(path.join(ROOT, 'data', run.id, 'latest.json'), null)
    const cutoff = Date.parse(run.started) - KEEP_DAYS * 864e5
    const history = [...(prev?.history || []), ...(prev?.issued_at && prev?.daily ? [{ issued_at: prev.issued_at, daily: prev.daily }] : [])]
        .filter((h, i, a) => h.issued_at && h.issued_at !== run.started && Date.parse(h.issued_at) >= cutoff && a.findIndex(x => x.issued_at === h.issued_at) === i)
        .sort((a, b) => a.issued_at.localeCompare(b.issued_at))
    return {
        source: run.id, title: run.card.title, place: run.card.place.id, country: run.card.country, issued_at: run.started, read_at: run.started,
        provenance: run.prov({ attribution: 'Weather data by Open-Meteo.com (https://open-meteo.com/), CC BY 4.0; forecast models by the national weather services Open-Meteo lists at https://open-meteo.com/en/docs; values as served, rounded as served', licence: 'CC BY 4.0 (https://open-meteo.com/en/licence)', centre: { lat, lon }, grid_point: { lat: n(j.latitude), lon: n(j.longitude), elevation_m: n(j.elevation) }, timezone: 'UTC' }),
        about: `Forecast for ${name}: hourly temperature, chance and amount of rain, wind and weather code for 3 days, and each day's lowest and highest temperature, as Open-Meteo served it at the time shown, with every earlier forecast we served for 14 days in history. A model forecast for a grid point, not a warning: follow the Met Office.`,
        units: { temperature: 'degC', precipitation: 'mm', precipitation_probability: '%', wind: 'km/h', wind_direction: 'degrees', weather_code: 'WMO code' },
        counts: { hourly: hourly.length, daily: daily.length, history: history.length },
        daily, hourly, history,
    }
}
