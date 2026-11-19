// /api/v1/history/: the past, per place (Dinis, 19 Nov 2026 ~01:17 UTC, PrompTugal__News__Website
// board/guidance/2026-11-19-show-the-past.md). For each day since the record began: what the station measured (low, high,
// rain) and what was forecast for it one, two and three days before, as published. Built only from what this site keeps in its
// own files (the daily station figures and the issued forecasts, carried from read to read since 18 and 19 November 2026): the
// collections before that were not kept (no raw history yet). A missing day is a row with nulls, never filled in.
// data.b@PrompTugal.dinis.
import { writeJson } from './lib.mjs';
import { readFileSync, existsSync } from 'node:fs';

const day = t => new Date(t).toISOString().slice(0, 10);
const addDays = (d, n) => day(Date.parse(d + 'T00:00:00Z') + n * 864e5);
const IPMA_LIC = { name: "the source's terms", url: 'https://api.ipma.pt/', holder: 'IPMA', commercial_use: 'not allowed' };
const OM_LIC = { name: 'CC BY 4.0 (free API, non-commercial use)', url: 'https://open-meteo.com/en/terms', holder: 'Open-Meteo', commercial_use: 'not allowed' };
const EA_LIC = { name: 'Open Government Licence v3.0', url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', holder: 'Environment Agency', commercial_use: 'allowed' };

export function buildHistory(sources) {
  const L = id => (sources.find(s => s.id === id) || {}).latest || {};
  const obs = L('ipma-observations'), fc = L('ipma-city-forecasts'), om = L('open-meteo-london'), ea = L('ea-flood');
  const map = existsSync('collect/by-place-map.json') ? JSON.parse(readFileSync('collect/by-place-map.json', 'utf8')) : [];
  const places = [...map, { place: 'lisboa', station: 'Lisboa (Geofísico)', station_id: 1200535, forecast_id: 1110600 }];
  const today = day(Date.now()), files = [];
  const forecastFor = (list, date, k) => { // the forecast issued k days before date (the latest issue that day), for date
    const issuedDay = addDays(date, -k);
    const issue = (list || []).filter(h => String(h.issued).slice(0, 10) === issuedDay).sort((a, b) => String(b.issued).localeCompare(String(a.issued)))[0];
    const d = issue && (issue.days || issue.daily || []).find(x => x.date === date);
    return d ? { issued: issue.issued, t_min_c: d.t_min_c ?? d.temperature_min_c ?? null, t_max_c: d.t_max_c ?? d.temperature_max_c ?? null, rain_prob_pct: d.rain_prob_pct ?? null, rain_mm: d.precipitation_sum_mm ?? null } : null;
  };
  for (const m of places) {
    const daily = obs.daily || {}, fh = (fc.forecast_history || {})[m.forecast_id] || [];
    const obsDays = Object.keys(daily).filter(d => daily[d][m.station_id]), fcDays = fh.flatMap(h => (h.days || []).map(x => x.date)).filter(d => d <= today);
    const first = [...obsDays, ...fh.map(h => String(h.issued).slice(0, 10))].sort()[0];
    if (!first) continue;
    const rows = [];
    for (let d = first; d <= today; d = addDays(d, 1)) {
      const o = (daily[d] || {})[m.station_id] || null;
      rows.push({ date: d, observed: o ? { low_c: o.low_c, high_c: o.high_c, rain_mm: o.rain_mm, hours: o.hours, complete: o.hours === 24 } : null,
        forecast: { d1: forecastFor(fh, d, 1), d2: forecastFor(fh, d, 2), d3: forecastFor(fh, d, 3) } });
    }
    const f = { place: m.place, country: 'PT', first_day: first, data_read_at: obs.read_at || null,
      about: `The past in ${m.place}, day by day since ${first}: what IPMA's station ${m.station} (${m.station_id}) measured (low, high, rain; complete only when all 24 hours were seen) and what IPMA forecast for that day one, two and three days before (d1, d2, d3), as published. A null is a day or forecast we do not have: never filled in. Collections before 18 November 2026 were not kept.`,
      sources: { observed: { url: 'https://data.promptugal.news/api/v1/ipma-observations/latest.json', field: `daily[date]["${m.station_id}"]`, license: IPMA_LIC }, forecast: { url: 'https://data.promptugal.news/api/v1/ipma-city-forecasts/latest.json', field: `forecast_history["${m.forecast_id}"]`, license: IPMA_LIC } },
      commit: process.env.GITHUB_SHA || 'local', rows };
    writeJson(`api/v1/history/weather/${m.place}.json`, f); files.push({ place: m.place, first_day: first, days: rows.length, url: `https://data.promptugal.news/api/v1/history/weather/${m.place}.json` });
  }
  // London: rain measured by the Environment Agency's gauges (mean across those with a full day), forecast by Open-Meteo
  { const dr = ea.daily_rain || {}, oh = om.history || [];
    const days = [...Object.keys(dr), ...oh.map(h => String(h.issued_at || h.issued).slice(0, 10))].sort(), first = days[0];
    if (first) { const rows = [];
      for (let d = first; d <= today; d = addDays(d, 1)) {
        const g = Object.values(dr[d] || {}).filter(x => x && Number.isFinite(x.rain_mm) && x.readings > 0);
        const list = oh.map(h => ({ issued: h.issued_at || h.issued, days: h.daily || h.days || [] }));
        rows.push({ date: d, observed: g.length ? { rain_mm_mean: Math.round(g.reduce((a, x) => a + x.rain_mm, 0) / g.length * 10) / 10, gauges: g.length, readings_min: Math.min(...g.map(x => x.readings)), complete: g.every(x => x.readings >= 96) } : null,
          forecast: { d1: forecastFor(list, d, 1), d2: forecastFor(list, d, 2), d3: forecastFor(list, d, 3) } });
      }
      writeJson('api/v1/history/weather/london.json', { place: 'london', country: 'GB', first_day: first, data_read_at: ea.read_at || null,
        about: `The past in London, day by day since ${first}: rain measured by the Environment Agency's gauges near central London (the mean across the gauges that reported that day; complete only when each had all 96 quarter-hour readings) and what Open-Meteo forecast one, two and three days before. Temperature is not observed here yet (the Met Office needs a key). Nulls are days we do not have.`,
        sources: { observed: { url: 'https://data.promptugal.news/api/v1/ea-flood/latest.json', field: 'daily_rain', license: EA_LIC }, forecast: { url: 'https://data.promptugal.news/api/v1/open-meteo-london/latest.json', field: 'history', license: OM_LIC } },
        commit: process.env.GITHUB_SHA || 'local', rows });
      files.push({ place: 'london', first_day: first, days: rows.length, url: 'https://data.promptugal.news/api/v1/history/weather/london.json' }); } }
  writeJson('api/v1/history/index.json', { about: 'The past, per place, from what this site keeps: weather observed beside what was forecast. Each file states its first day: station days from 17 November 2026 (partial), IPMA's issued forecasts from 19 November 2026. Collections before that were not kept, because the raw history vault is not yet switched on.', data_read_at: obs.read_at || null, weather: files });
  return files.length;
}
