// IPMA's UV index forecast for each place it covers. Code, no model.
import { IPMA, places } from '../../collect/ipma.mjs'
import { num } from '../../collect/lib.mjs'
export default async function (run) {
    const P = await places(run)
    const src = IPMA + 'forecast/meteorology/uv/uv.json'
    const uv = await run.json('uv', src)
    if (!Array.isArray(uv)) return null
    const by = new Map()
    for (const x of uv) { const k = x.globalIdLocal; if (!by.has(k)) by.set(k, []); by.get(k).push({ date: x.data, index: num(x.iUv), period: x.idPeriodo, hours: x.intervaloHora || null }) }
    const list = [...by].sort((a, b) => a[0] - b[0]).map(([id, days]) => ({ id, name: P.get(id)?.name || null, days: days.sort((a, b) => a.date.localeCompare(b.date)) }))
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ source: src }),
        about: 'IPMA\'s UV index forecast by place (globalIdLocal), by day. Names are given where the place is a district capital or island in IPMA\'s list; others by id only.',
        counts: { places: list.length }, places: list }
}
