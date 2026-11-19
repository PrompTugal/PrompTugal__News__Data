// /api/v1/history/: the past, per place (Dinis, 19 Nov 2026 ~01:17 UTC, PrompTugal__News__Website
// board/guidance/2026-11-19-show-the-past.md). For each day since the record began: what the station measured (low, high,
// rain) and what was forecast for it one, two and three days before, as published. Built only from what this site keeps in its
// own files (the daily station figures and the issued forecasts, carried from read to read since 18 and 19 November 2026): the
// collections before that were not kept (no raw history yet). A missing day is a row with nulls, never filled in.
// data.b@PrompTugal.dinis.
import { writeJson } from './lib.mjs';
import { readFileSync, existsSync, readdirSync } from 'node:fs';

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
    return d ? { issued: issue.issued, read_at: issue.read_at || issue.read || null, t_min_c: d.t_min_c ?? d.temperature_min_c ?? null, t_max_c: d.t_max_c ?? d.temperature_max_c ?? null, rain_prob_pct: d.rain_prob_pct ?? null, rain_mm: d.precipitation_sum_mm ?? null } : null;
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
        const list = oh.map(h => ({ issued: h.issued_at || h.issued, read_at: h.read_at || h.issued_at || null, days: h.daily || h.days || [] }));
        rows.push({ date: d, observed: g.length ? { rain_mm_mean: Math.round(g.reduce((a, x) => a + x.rain_mm, 0) / g.length * 10) / 10, gauges: g.length, readings_min: Math.min(...g.map(x => x.readings)), complete: g.every(x => x.readings >= 96) } : null,
          forecast: { d1: forecastFor(list, d, 1), d2: forecastFor(list, d, 2), d3: forecastFor(list, d, 3) } });
      }
      writeJson('api/v1/history/weather/london.json', { place: 'london', country: 'GB', first_day: first, data_read_at: ea.read_at || null,
        about: `The past in London, day by day since ${first}: rain measured by the Environment Agency's gauges near central London (the mean across the gauges that reported that day; complete only when each had all 96 quarter-hour readings) and what Open-Meteo forecast one, two and three days before. Temperature is not observed here yet (the Met Office needs a key). Nulls are days we do not have.`,
        sources: { observed: { url: 'https://data.promptugal.news/api/v1/ea-flood/latest.json', field: 'daily_rain', license: EA_LIC }, forecast: { url: 'https://data.promptugal.news/api/v1/open-meteo-london/latest.json', field: 'history', license: OM_LIC } },
        commit: process.env.GITHUB_SHA || 'local', rows });
      files.push({ place: 'london', first_day: first, days: rows.length, url: 'https://data.promptugal.news/api/v1/history/weather/london.json' }); } }
  writeJson('api/v1/history/index.json', { events: 'https://data.promptugal.news/api/v1/history/events/index.json', about: 'The past, per place, from what this site keeps: weather observed beside what was forecast, and events as first listed (see events). Each file states its first day: station days from 17 November 2026 (partial), IPMA\'s issued forecasts from 19 November 2026. Collections before that were not kept, because the raw history vault is not yet switched on.', data_read_at: obs.read_at || null, weather: files });
  return files.length;
}

// /api/v1/history/events/<place>.json (conductor.b@ for events.b@, 19 Nov 2026 ~01:26 UTC; show the past, and every prediction
// is kept and checked): each event as first listed by its organiser's page (name, dates, venue, source, the read that first saw
// it), never overwritten, then every change seen and when it stopped being listed (sources/events-pt carries this from read to
// read). Beside them, Perplexity's claims that an event will happen, each with its evidence links, the time asked and the stored
// answer it came from, so each can be checked when its date comes. Nothing is filled in.
export function buildEventsHistory(sources) {
  const L = (sources.find(s => s.id === 'events-pt') || {}).latest || {};
  let hist = L.history;
  if (!hist) { hist = {}; for (const e of Object.values(L.places || {}).flat()) if (e.url) hist[e.url] = { place: e.place, source: e.source, first: { at: e.read_at, name: e.name, startDate: e.startDate, endDate: e.endDate || null, venue: e.location?.name || null }, changes: [], last_seen: e.read_at, gone_at: null }; }
  const lic = {}; for (const e of Object.values(L.places || {}).flat()) if (e.url && e.license) { try { lic[new URL(e.url).host] = e.license } catch {} }
  const inTowns = {};
  const claimsOf = place => {
    const out = [];
    for (const f of [`discovery/claims/by-place/${place}.json`, `discovery/claims/past/${place}.json`]) {
      if (!existsSync(f)) continue; const j = JSON.parse(readFileSync(f, 'utf8')), d = j.discovery || {};
      // a claim is kept in the history of the place it names: a region's roll-up (algarve.json lists its towns' claims)
      // is not repeated in the region's history (events.b@'s finding, fde585a, 19 Nov 2026); counted as in_towns
      for (const c of j.claims || []) if (c.place && c.place !== place) { inTowns[place] = (inTowns[place] || 0) + 1 } else out.push({ name: c.name, startDate: c.startDate, endDate: c.endDate || null, status: c.status || null,
        evidence: (c.evidence || []).map(x => ({ url: x.url, host: x.host, readable: x.readable })), asked_at: c.asked_at || d.asked_at || null,
        model: c.model || d.model || null, via: c.via || d.via || null, answer_file: c.file || d.file || null, kept_in: f });
    }
    const seen = new Set(); return out.filter(c => { const k = `${c.name}|${c.startDate}`; if (seen.has(k)) return false; seen.add(k); return true }).sort((a, b) => String(a.startDate).localeCompare(String(b.startDate)));
  };
  const places = new Set(Object.values(hist).map(h => h.place));
  for (const dir of ['discovery/claims/by-place', 'discovery/claims/past']) if (existsSync(dir)) for (const f of readdirSync(dir)) if (f.endsWith('.json') && f !== 'index.json') places.add(f.replace(/\.json$/, ''));
  const files = [];
  for (const place of [...places].filter(Boolean).sort()) {
    const events = Object.entries(hist).filter(([, h]) => h.place === place).map(([url, h]) => {
      let host = null; try { host = new URL(url).host } catch {}
      return { url, source: h.source, licence: lic[host] || { name: "the source's terms", url: host ? `https://${host}/` : null }, first: h.first, changes: h.changes, last_seen: h.last_seen, gone_at: h.gone_at };
    }).sort((a, b) => String(a.first.startDate).localeCompare(String(b.first.startDate)) || String(a.first.name).localeCompare(String(b.first.name)));
    const allClaims = claimsOf(place), claims = allClaims.filter(c => !/—/.test(JSON.stringify(c)));   // a claim the wording gate refuses (an em dash in its name) is dropped, never altered; counted
    const f = { place, data_read_at: L.read_at || null, history_from: L.history_from || L.read_at || null,
      about: `Events in ${place}: each exactly as first listed by its organiser's page (first: name, dates, venue, and the read that first saw it), never overwritten; every later change seen (changes: field, from, to, at); last_seen; gone_at when it stopped being listed before its date. Events read every 6 hours, so a change is dated by the read that first saw it. Claims: what Perplexity (through OpenRouter) said would happen, kept as answered with its evidence links and the time asked, to be checked when the date comes. Not confirmed listings.`,
      sources: { events: { url: 'https://data.promptugal.news/api/v1/events-pt/latest.json', field: 'history' }, claims: { url: 'https://github.com/PrompTugal/PrompTugal__News__Data/tree/dev/discovery/claims', field: 'claims' } },
      commit: process.env.GITHUB_SHA || 'local', counts: { events: events.length, changed: events.filter(e => e.changes.length).length, gone: events.filter(e => e.gone_at).length, claims: claims.length, claims_in_towns_files: inTowns[place] || 0, claims_dropped_wording: allClaims.length - claims.length }, events: events.filter(e => !/—/.test(JSON.stringify(e))), claims };
    writeJson(`api/v1/history/events/${place}.json`, f);
    files.push({ place, ...f.counts, url: `https://data.promptugal.news/api/v1/history/events/${place}.json` });
  }
  writeJson('api/v1/history/events/index.json', { about: 'Events as first listed and every change since, and the claims kept to be checked, one file per place.', data_read_at: L.read_at || null, history_from: L.history_from || L.read_at || null, places: files });
  return files.length;
}
