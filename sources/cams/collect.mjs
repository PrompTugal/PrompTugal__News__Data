// Public live cameras: is each one up? At Dinis's word, 18 November 2026, about 17:30 to 17:55 UTC (PrompTugal__News__Website
// board/guidance/2026-11-18-people-blogs-cyber-and-simulated-payments.md, "The live cameras site"). Code, no model.
// data.b@PrompTugal.dinis.
//
// Cameras: register/cams.json (official cameras of public bodies and the operator's own pages only; each with its terms).
// Each run asks for the OPERATOR'S PAGE only (HTML), never the embed, the stream, a snapshot or any frame. "Up" means the
// page answered 200 and still names the camera or carries a player; it says nothing about the picture. The page's bytes are
// read in memory and dropped (run.raw emptied): no page, frame or stream goes to git, the site or a vault.
// History: only the changes (up to down and back), carried from the previous read, at most 200 per camera.
import path from 'node:path'
import { ROOT, readJson } from '../../collect/lib.mjs'

const MAX_HISTORY = 200
const PLAYER = /<(iframe|video)\b|\.m3u8\b|youtube\.com\/embed|player|webcam|camara|câmara|camera/i

export default async function (run) {
    const reg = readJson(path.join(ROOT, 'register', 'cams.json'), { cameras: [] })
    const prev = readJson(path.join(ROOT, 'data', run.id, 'latest.json'), null)
    const before = new Map((prev?.cameras || []).map(c => [c.id, c]))
    const cams = (reg.cameras || []).filter(c => c && c.id && /^https?:\/\//.test(String(c.page || '')))
    const pageCache = new Map(), out = []
    for (const c of cams) {
        let r = pageCache.get(c.page)
        if (!r) { r = await run.get(`page-${c.id}`, c.page, { timeout: 20000 }); pageCache.set(c.page, r) }
        const text = r.ok ? r.bytes.toString('utf8') : ''
        const marker = r.ok && (PLAYER.test(text) || (c.name && text.toLowerCase().includes(String(c.name).toLowerCase().slice(0, 24))))
        const up = r.ok ? (marker ? 'up' : 'page up, no player seen') : 'down'
        const was = before.get(c.id), history = (was?.history || []).slice(-MAX_HISTORY)
        if (!history.length || history.at(-1).state !== up) history.push({ at: run.started, state: up, http: r.status || null })
        out.push({ id: c.id, name: c.name, place: c.place, municipality: c.municipality || null, lat: c.lat ?? null, lon: c.lon ?? null, coords_from: c.coords_from || null,
            operator: c.operator, operator_kind: c.operator_kind, page: c.page, embed: c.embed || null, terms_page: c.terms_page || null, terms_summary: c.terms_summary || null,
            license: { name: 'the operator\'s terms', url: c.licence_link || c.terms_page || c.page, holder: c.operator },
            state: up, http: r.status || null, checked_at: run.started, since: history.at(-1).at, checks: (was?.checks || 0) + 1,
            up_checks: (was?.up_checks || 0) + (up === 'down' ? 0 : 1), history })
    }
    run.raw = []   // no page bytes to the vault: only the status is kept
    const byPlace = {}; for (const c of out) (byPlace[c.place] ||= []).push(c.id)
    return {
        source: run.id, title: 'Public live cameras: where they are and whether they are up', read_at: run.started, provenance: run.prov({ register: 'register/cams.json' }),
        about: 'Public live cameras in the places we cover, from official operators only, each with its operator, place, coordinates, terms and licence link, and whether its operator\'s page is up. Status comes from the operator\'s page only; no frame, picture or stream is fetched, kept or analysed. Watch each camera on its operator\'s page.',
        counts: { cameras: out.length, up: out.filter(c => c.state === 'up').length, down: out.filter(c => c.state === 'down').length, places: Object.keys(byPlace).length, pages_asked: pageCache.size },
        rules: reg.rules || [], by_place: byPlace, cameras: out, not_listed: reg.not_listed || [], gaps: reg.gaps || [],
    }
}
