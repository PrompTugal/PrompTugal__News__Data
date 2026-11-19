#!/usr/bin/env node
// data/predictions/predictions.jsonl: this site's predictions, kept as shown, and their outcomes, in the library's form
// (library.promptugal.news/predictions/form/, PRED; Dinis, 19 Nov 2026 ~03:15 UTC: "The predictions are one collection";
// board/guidance/2026-11-19-show-the-past.md: every prediction is kept and checked). Append only: a line once written is
// never edited or removed; this script only adds lines whose id (or outcome) is not yet in the file. Code, no model.
// Predictions: IPMA's city forecasts for the places this site maps to a station (collect/by-place-map.json, plus Lisboa),
// each issue as read, for the days one to three ahead: the day's low and high. Outcomes: once the station's day is complete
// (all 24 hours seen), held when both low and high are within 2 °C of the forecast, else missed; a gap when two days after
// the day there is still no complete station day. data.b@PrompTugal.dinis.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, readJson } from './lib.mjs'

const FILE = path.join(ROOT, 'data', 'predictions', 'predictions.jsonl')
const SITE = 'data.promptugal.news', PAGE = 'https://data.promptugal.news/sources/ipma-city-forecasts/'
const LIC = { name: "IPMA's terms (free use without profit-making purpose; mention IPMA)", url: 'https://api.ipma.pt/' }
const TOL = 2   // °C, for "held"
// YYYY-MM-DDTHH:MMZ; IPMA's issue times carry no zone and are UTC (Lisbon's winter time equals UTC; noted as read)
const min = t => { const s = String(t); return new Date(/Z$|[+-]\d\d:\d\d$/.test(s) ? s : s + 'Z').toISOString().slice(0, 16) + 'Z' }
const day = t => new Date(t).toISOString().slice(0, 10)
const addDays = (d, n) => day(Date.parse(d + 'T00:00:00Z') + n * 864e5)

export function predictions(now = new Date()) {
    const fc = readJson(path.join(ROOT, 'data', 'ipma-city-forecasts', 'latest.json'), null)
    const ob = readJson(path.join(ROOT, 'data', 'ipma-observations', 'latest.json'), null)
    if (!fc || !fc.forecast_history) return { added: 0, outcomes: 0 }
    const map = [...(readJson(path.join(ROOT, 'collect', 'by-place-map.json'), []) || []), { place: 'lisboa', station: 'Lisboa (Geofísico)', station_id: 1200535, forecast: 'Lisboa', forecast_id: 1110600 }]
    const lines = fs.existsSync(FILE) ? fs.readFileSync(FILE, 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l) } catch { return null } }).filter(Boolean) : []
    const preds = new Map(lines.filter(l => l.type === 'prediction').map(l => [l.id, l]))
    const done = new Set(lines.filter(l => l.type === 'outcome').map(l => l.of))
    const out = []
    for (const m of map) {
        for (const h of fc.forecast_history[m.forecast_id] || []) {
            const issuedDay = String(h.issued).slice(0, 10), shown = min(h.read_at || h.issued)
            for (const d of h.days || []) {
                const lead = Math.round((Date.parse(d.date) - Date.parse(issuedDay)) / 864e5)
                if (lead < 1 || lead > 3 || !Number.isFinite(d.t_min_c) || !Number.isFinite(d.t_max_c)) continue
                const id = `ipma-${m.place}-${d.date}-d${lead}-${String(h.issued).replace(/[^0-9]/g, '').slice(0, 12)}`
                if (preds.has(id)) continue
                const p = { type: 'prediction', id, site: SITE, page: PAGE, shown_at: shown, said_by: 'IPMA', source: `https://api.ipma.pt/open-data/forecast/meteorology/cities/daily/${m.forecast_id}.json`,
                    licence: LIC, kind: 'forecast', subject: `${m.forecast}, low and high on ${d.date}`, due: d.date,
                    said: `${m.forecast}, ${d.date}: low ${d.t_min_c} °C, high ${d.t_max_c} °C (IPMA forecast issued ${min(h.issued)}, ${lead} day${lead > 1 ? 's' : ''} ahead)`,
                    value: { quantity: 't_min..t_max', unit: '°C', low: d.t_min_c, high: d.t_max_c } }
                preds.set(id, p); out.push(p)
            }
        }
    }
    // outcomes: a complete station day, or a gap two days after the day
    const station = Object.fromEntries(map.map(m => [m.place, m]))
    const today = day(now)
    let outcomes = 0
    for (const p of preds.values()) {
        if (done.has(p.id) || !p.id.startsWith('ipma-')) continue
        const place = p.id.slice(5, p.id.indexOf('-' + p.due)), m = station[place]; if (!m) continue
        const o = ((ob && ob.daily) || {})[p.due]?.[m.station_id]
        const at = min(now.toISOString())
        if (o && o.hours === 24 && Number.isFinite(o.low_c) && Number.isFinite(o.high_c)) {
            const dl = Math.round((o.low_c - p.value.low) * 10) / 10, dh = Math.round((o.high_c - p.value.high) * 10) / 10
            const held = Math.abs(dl) <= TOL && Math.abs(dh) <= TOL
            out.push({ type: 'outcome', of: p.id, checked_at: at, result: held ? 'held' : 'missed',
                happened: `IPMA station ${m.station} (${m.station_id}) measured a low of ${o.low_c} °C and a high of ${o.high_c} °C over all 24 hours of ${p.due} (UTC). Held means both within ${TOL} °C of the forecast.`,
                value: { quantity: 't_min..t_max', unit: '°C', low: o.low_c, high: o.high_c }, difference: `low ${dl >= 0 ? '+' : ''}${dl} °C, high ${dh >= 0 ? '+' : ''}${dh} °C`,
                evidence: [`https://data.promptugal.news/api/v1/history/weather/${place}.json`] })
            done.add(p.id); outcomes++
        } else if (addDays(p.due, 2) < today) {
            out.push({ type: 'outcome', of: p.id, checked_at: at, result: 'gap', gap: `No complete day (all 24 hours) from IPMA station ${m.station} (${m.station_id}) for ${p.due} in this site's records.` })
            done.add(p.id); outcomes++
        }
    }
    if (out.length) { fs.mkdirSync(path.dirname(FILE), { recursive: true }); fs.appendFileSync(FILE, out.map(l => JSON.stringify(l)).join('\n') + '\n') }
    return { added: out.length - outcomes, outcomes }
}

if (import.meta.url === `file://${process.argv[1]}`) { const r = predictions(); console.log(`predictions: ${r.added} added, ${r.outcomes} outcomes`) }
