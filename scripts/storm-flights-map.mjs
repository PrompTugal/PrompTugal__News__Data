#!/usr/bin/env node
// The Storm Charles flight map's data files, for data.promptugal.news. Node 18+, no dependencies, no network.
//   node scripts/storm-flights-map.mjs
// A port of tools/flights-map.mjs (PrompTugal__News__Storm-Charles, Apache-2.0, commit fdac6ed): the same inputs (the archived
// adsb.lol snapshots and frames, the Open-Meteo wind files, crosswind.json), but written compactly for this site, one file
// per area instead of one per snapshot (the Storm's per-snapshot files came to many hundreds of files).
// Reads storm/charles/data/flights/ and the base maps (Natural Earth, public domain, copied from the Storm repo's
// app/design/flightmap/base-*.json) in storm/charles/flights-map/. Writes only under storm/charles/flights-map/.
// Privacy (the Storm's rule, kept): airline flights by callsign only. The frames' anonymous "others" (every other aircraft,
// which can include private aircraft) are dropped: only their count is kept. No ICAO24 address, no registration is read or written.
// Thinning: wind keeps the 10 m field only (the 850 hPa field is dropped); positions are rounded to 3 decimals; a frame of the
// wide area replaces the snapshot of the same poll; snapshots before the first frame are kept for Lisbon only (Madeira had none in them).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..')
const IN = path.join(ROOT, 'storm/charles/data/flights')
const OUT = path.join(ROOT, 'storm/charles/flights-map')
const BY = 'data.b.design@PrompTugal.dinis'
const NOT_WARNING = 'Not a warning service. No forecast or advice of ours. Your airline decides whether your flight runs: its site or app has the latest. For warnings follow IPMA and ANEPC.'
const ADSB = 'Aircraft positions: adsb.lol (https://adsb.lol), ODbL 1.0, as kept by the Storm Charles site'
const METEO = 'Weather data by Open-Meteo.com (https://open-meteo.com), CC BY 4.0'
const AREAS = { lisbon: { frames: 'lisbon', snap: 'lisbon', wind: 'lisbon', close: 'lisbon-close', icao: 'LPPT' }, madeira: { frames: 'funchal', snap: 'funchal', wind: 'madeira', close: 'madeira-close', icao: 'LPMA' } }

const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : []
const rd = f => JSON.parse(fs.readFileSync(f, 'utf8'))
const write = (rel, obj) => { const f = path.join(OUT, rel); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(obj)); return fs.statSync(f).size }
const r3 = x => x == null ? null : Math.round(x * 1000) / 1000
const ri = x => x == null ? null : Math.round(x)
const hex16 = s => String(s).replace(/\b([0-9a-f]{17,})\b/g, m => m.slice(0, 16))
const sizes = {}

for (const [name, A] of Object.entries(AREAS)) {
  // ---- aircraft: frames (wider area) first, then snapshots for times before the first frame
  const ac = []; const idx = new Map(); const airlines = {}; const frames = []
  const acId = (callsign, airline, type) => { const k = callsign; if (!idx.has(k)) { idx.set(k, ac.length); ac.push([callsign, airline, type || null]) } return idx.get(k) }
  let areaDef = null; let cadence = null; let source = null; let dropped = 0
  const fileList = walk(path.join(IN, 'frames', A.frames)).filter(f => f.endsWith('.json')).sort()
  for (const f of fileList) {
    const h = rd(f); const F = h.fields; areaDef = h.area_def; cadence = h.cadence_min; Object.assign(airlines, h.airlines)
    for (const fr of h.frames) {
      if (!fr.t) continue
      source = source || fr.request.url
      const rows = []
      for (const r of fr.rows) {
        const o = Object.fromEntries(F.map((k, i) => [k, r[i]]))
        if (!o.callsign || !o.airline || !airlines[o.airline] || o.lat == null || o.lon == null) { dropped++; continue }
        rows.push([acId(o.callsign, o.airline, o.type), r3(o.lat), r3(o.lon), o.on_ground ? null : ri(o.alt_ft), ri(o.gs_kt), ri(o.track_deg), ri(o.vrate_fpm), o.on_ground ? 1 : 0])
      }
      frames.push({ t: fr.t, kind: 'frame', n_other: fr.other, n_withheld: fr.withheld_by_owner_request, rows })
    }
  }
  const firstFrame = frames.length ? frames.map(x => x.t).sort()[0] : null
  const snapFiles = walk(path.join(IN, 'snapshots')).filter(f => f.endsWith('.json')).sort()
  let snapDef = null
  for (const f of snapFiles) {
    const h = rd(f); Object.assign(airlines, h.airlines || {}); snapDef = snapDef || (h.areas || {})[A.snap]
    for (const s of h.snapshots) {
      if (s.area !== A.snap || !s.time || (firstFrame && s.time >= firstFrame) || name !== 'lisbon') continue
      const rows = []
      for (const a of s.aircraft) {
        if (!a.callsign || !a.airline || !airlines[a.airline] || a.lat == null || a.lon == null) { dropped++; continue }
        rows.push([acId(a.callsign, a.airline, a.type), r3(a.lat), r3(a.lon), a.on_ground ? null : ri(a.baro_alt_ft ?? a.geo_alt_ft), ri(a.ground_speed_kt), ri(a.track_deg), ri(a.vertical_rate_fpm), a.on_ground ? 1 : 0])
      }
      frames.push({ t: s.time, kind: 'snapshot', n_other: null, n_withheld: null, rows })
    }
  }
  frames.sort((a, b) => a.t < b.t ? -1 : 1)
  const used = {}; ac.forEach(a => { used[a[1]] = airlines[a[1]] })
  sizes[`${name}-flights.json`] = write(`${name}-flights.json`, {
    by: BY, label: 'fact', area: name, area_def: areaDef, cadence_min: cadence, licence: 'ODbL 1.0', attribution: ADSB, source,
    not_a_warning_service: NOT_WARNING,
    method: 'Airline flights adsb.lol showed in the area, one row per flight per frame, by callsign only. No ICAO24 address, registration or private aircraft is kept: every other aircraft is dropped and only counted (n_other). Every position was measured at the time of its frame (frames: the wide area, every 5 minutes for Lisbon and 20 for Madeira; snapshots: a 40 nm area, before the first frame). A line drawn between two frames is a drawing, not a path flown. Rounded: positions to 3 decimals, speeds and altitudes to whole units. alt: feet, barometric (geometric when absent), null on the ground; gs: knots; trk: degrees true; vr: feet per minute, + climbing; g: 1 on the ground.',
    fields: ['ac', 'lat', 'lon', 'alt', 'gs', 'trk', 'vr', 'g'], ac_fields: ['callsign', 'airline', 'type'], ac, airlines: used, frames
  })
  console.log(`${name}: ${frames.length} frames, ${ac.length} flights, ${dropped} rows dropped (no airline callsign)`)

  // ---- wind: the 10 m field, one file per area and view; the latest-read file wins for an hour
  const tMin = frames.length ? frames[0].t.slice(0, 13) + ':00:00Z' : '0'; const tMax = frames.length ? frames.at(-1).t : '9'
  for (const [view, wa] of [['wide', A.wind], ['close', A.close]]) {
    const files = walk(path.join(IN, 'wind')).filter(f => path.basename(f).startsWith(wa + '-2026')).sort()
    const grids = []; const hours = new Map(); let src = null; let read = null
    for (const f of files) {
      const w = rd(f); const key = JSON.stringify([w.grid.lat, w.grid.lon])
      let gi = grids.findIndex(g => JSON.stringify([g.lat, g.lon]) === key); if (gi < 0) { grids.push({ lat: w.grid.lat, lon: w.grid.lon, step_deg: w.grid.step_deg }); gi = grids.length - 1 }
      const L = w.levels['10m']; src = src || w.request.url.replace(/latitude=[^&]+&longitude=[^&]+/, 'latitude=...&longitude=...'); read = read && read > w.request.read ? read : w.request.read
      w.times.forEach((t, i) => {
        if (t < tMin || t > tMax.slice(0, 13) + ':59:59Z') return
        const prev = hours.get(t); if (prev && prev.updated >= w.updated) return
        hours.set(t, { updated: w.updated, t, g: gi, forecast: !!(w.forecast_from && t >= w.forecast_from), dir: L.dir_deg[i].map(ri), spd: L.speed_kt[i].map(ri), gust: L.gust_kt[i].map(ri) })
      })
    }
    const hs = [...hours.values()].sort((a, b) => a.t < b.t ? -1 : 1).map(({ updated, ...h }) => h)
    sizes[`${name}-wind-${view}.json`] = write(`${name}-wind-${view}.json`, {
      by: BY, label: 'evidence', area: name, view, licence: 'CC BY 4.0', attribution: METEO, source: src, read_utc: read, not_a_warning_service: NOT_WARNING,
      model: 'Open-Meteo forecast API, best match for each point: a model\'s analysis and short-range forecast, not observations.',
      method: 'The wind at 10 m on a lattice, one entry per lattice point in the order: for each latitude (south to north), every longitude (west to east). dir: where the wind blows FROM, degrees true (an arrow points to dir + 180); spd and gust: knots, whole numbers. The 850 hPa field in the Storm files is dropped to keep this small.',
      grids, hours: hs
    })
  }

  // ---- airport wind (METAR) and runways, from crosswind.json
}
const cw = rd(path.join(IN, 'crosswind.json'))
const rwSrc = cw.sources.find(s => /OurAirports/.test(s.what)) || {}
const airports = {}
for (const ap of cw.airports) {
  airports[ap.icao] = {
    name: ap.name, runways: ap.runways.map(r => ({ id: r.runway, length_m: r.length_m, ends: r.ends.map(e => ({ name: e.end, lat: e.lat, lon: e.lon, heading_deg: e.heading_true })) })),
    metar: ap.hours.flatMap(h => h.metars.map(m => ({ t: m.time, dir: m.wind_dir, kt: m.wind_kt, gust: m.gust_kt, cross: Object.fromEntries(Object.entries(m.runways || {}).map(([e, v]) => [e, v.crosswind_kt])) }))).sort((a, b) => a.t < b.t ? -1 : 1)
  }
}
sizes['airports.json'] = write('airports.json', {
  by: BY, label: 'fact', licence: 'Runways: OurAirports, public domain. Winds: METAR as published by IPMA via aviationweather.gov.', source: rwSrc.url || 'https://ourairports.com/data/', read_utc: rwSrc.read || null,
  not_a_warning_service: NOT_WARNING,
  method: 'Open runways of LPPT and LPMA: each end\'s threshold position and true heading (OurAirports runways.csv). metar: each METAR\'s wind (dir degrees true it blows from, kt, gust kt or null) and the crosswind in knots on each runway end for the mean wind, as the Storm\'s crosswind.json worked it out.',
  airports
})

// ---- the base maps: copied from the Storm repo (Natural Earth, public domain); any full sha256 is cut to 16 hex (this site's rule)
for (const f of fs.readdirSync(OUT).filter(f => /^base-(lisbon|madeira)(-wide)?\.json$/.test(f))) {
  const p = path.join(OUT, f); const s = fs.readFileSync(p, 'utf8'); const t = hex16(s)
  if (s !== t) fs.writeFileSync(p, t)
  sizes[f] = fs.statSync(p).size
}
const index = {
  by: BY, label: 'fact', about: 'The files the Storm Charles flight map reads (data.promptugal.news /storm/): airline flights by callsign, the 10 m wind, runways and METAR winds, and the base maps. Made by scripts/storm-flights-map.mjs from storm/charles/data/flights/ (itself from the Storm repository at commit fdac6ed, Apache-2.0).',
  attribution: [ADSB, METEO, 'Base maps: Natural Earth, public domain. Runways: OurAirports, public domain.'], not_a_warning_service: NOT_WARNING,
  files: Object.keys(sizes).sort().map(k => ({ path: k, bytes: sizes[k] }))
}
write('index.json', index)
console.log('flights-map: ' + Object.values(sizes).reduce((a, b) => a + b, 0) + ' bytes in ' + Object.keys(sizes).length + ' files')
