// IPMA's weather warnings for every warning area of Portugal (mainland, Madeira, the Azores). Code, no model.
import { IPMA, AREA } from '../../collect/ipma.mjs'
const EN = { 'Agitação Marítima': 'rough sea', 'Precipitação': 'rain', 'Vento': 'wind', 'Trovoada': 'thunderstorms', 'Nevoeiro': 'fog', 'Tempo Frio': 'cold', 'Tempo Quente': 'heat', 'Neve': 'snow' }
export default async function (run) {
    const src = IPMA + 'forecast/warnings/warnings_www.json'
    const w = await run.json('warnings', src)
    if (!Array.isArray(w)) return null
    const all = w.map(x => ({ area: x.idAreaAviso, area_name: AREA[x.idAreaAviso] || null, type: EN[x.awarenessTypeName] || x.awarenessTypeName, type_pt: x.awarenessTypeName, level: x.awarenessLevelID, start: x.startTime, end: x.endTime, text: x.text || '' }))
    const active = all.filter(x => x.level !== 'green').sort((a, b) => a.area.localeCompare(b.area) || a.start.localeCompare(b.start))
    const levels = {}; for (const x of active) levels[x.level] = (levels[x.level] || 0) + 1
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ source: src }),
        about: 'IPMA\'s weather warnings, every area: the active ones (yellow, orange, red) in full, and a count of the rest. Times as IPMA gives them (Portugal local time). Not a warning service: follow IPMA and ANEPC.',
        counts: { active: active.length, by_level: levels, green: all.length - active.length, areas: new Set(all.map(x => x.area)).size }, active }
}
