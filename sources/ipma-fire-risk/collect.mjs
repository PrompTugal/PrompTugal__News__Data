// IPMA's fire risk (RCM) for every municipality, today and the next two days. Code, no model.
import { IPMA } from '../../collect/ipma.mjs'
const RCM = { 1: 'low', 2: 'moderate', 3: 'high', 4: 'very high', 5: 'maximum' }
export default async function (run) {
    const days = []
    for (const d of [0, 1, 2]) { const src = `${IPMA}forecast/meteorology/rcm/rcm-d${d}.json`; const j = await run.json(`rcm-d${d}`, src); days.push(j ? { d, date: j.dataPrev, run: j.dataRun, file_date: j.fileDate, source: src, local: j.local } : null) }
    if (!days.some(Boolean)) return null
    const dicos = new Set(days.flatMap(x => x ? Object.keys(x.local) : []))
    const municipalities = [...dicos].sort().map(dico => {
        const any = days.find(x => x && x.local[dico])
        return { dico, lat: any.local[dico].latitude, lon: any.local[dico].longitude, days: days.map(x => x && x.local[dico] ? { date: x.date, rcm: x.local[dico].data.rcm, level: RCM[x.local[dico].data.rcm] || null } : null).filter(Boolean) }
    })
    const today = {}; for (const m of municipalities) { const l = m.days[0]?.level; if (l) today[l] = (today[l] || 0) + 1 }
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ source: IPMA + 'forecast/meteorology/rcm/rcm-d{0,1,2}.json' }),
        about: 'IPMA\'s daily fire risk class (RCM, 1 low to 5 maximum) for each municipality by its DICO code (district and municipality), for today and the next two days.',
        files: days.filter(Boolean).map(({ local, ...x }) => x), counts: { municipalities: municipalities.length, today_by_level: today }, municipalities }
}
