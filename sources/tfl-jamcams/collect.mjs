// TfL's traffic cameras (JamCams) in London: where each is, which way it looks, whether TfL marks it available, and the
// addresses of TfL's own still image and short clip. Code, no model. London, Dinis 18 Nov 2026 ~22:20 UTC (PrompTugal__News__Website
// board/guidance/2026-11-18-london.md); for live.promptugal.news (live.b@). data.b@PrompTugal.dinis.
// One GET of TfL's Unified API (no key) a run. No image or clip is ever fetched or stored: only their addresses, checked to be
// on TfL's own bucket path. Link-only until TfL's transport data terms are read (tfl.gov.uk answers us with a bot check).
const API = 'https://api.tfl.gov.uk/Place/Type/JamCam'
const HOST = 's3-eu-west-1.amazonaws.com', PREFIX = '/jamcams.tfl.gov.uk/'
const ID = /^JamCams_\d{5}\.\d{5}$/
const media = (u, ext) => { try { const x = new URL(String(u)); return x.protocol === 'https:' && x.host === HOST && x.pathname.startsWith(PREFIX) && x.pathname.endsWith(ext) && !x.search && !x.hash ? x.href : null } catch { return null } }
const txt = (s, n) => typeof s === 'string' ? (s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) || null) : null

export default async function (run) {
    const j = await run.json('jamcams', API, { timeout: 60000 })
    if (!Array.isArray(j)) return null
    let dropped = 0
    const cameras = []
    for (const c of j) {
        if (!c || !ID.test(String(c.id)) || !Number.isFinite(+c.lat) || !Number.isFinite(+c.lon)) { dropped++; continue }
        const p = Object.fromEntries((c.additionalProperties || []).filter(x => x && typeof x.key === 'string').map(x => [x.key, x]))
        const name = txt(c.commonName, 120); if (!name || name.includes('—')) { dropped++; continue }
        cameras.push({ id: c.id, name, lat: +(+c.lat).toFixed(5), lon: +(+c.lon).toFixed(5), view: txt(p.view?.value, 40),
            available: String(p.available?.value) === 'true', image_url: media(p.imageUrl?.value, '.jpg'), video_url: media(p.videoUrl?.value, '.mp4'),
            modified: txt(p.available?.modified, 30) })
    }
    cameras.sort((a, b) => a.id.localeCompare(b.id))
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ api: API }), country: 'GB', place: 'london',
        about: 'Transport for London\'s traffic cameras: name, position, the way each looks, whether TfL marks it available, and the addresses of TfL\'s own latest still image and short clip (on TfL\'s bucket, s3-eu-west-1.amazonaws.com/jamcams.tfl.gov.uk/). No image or clip is fetched or kept here. Powered by TfL Open Data. Embedding allowed under TfL\'s Transport Data Service terms (read 18 Nov 2026), with both credits.',
        media: { host: HOST, path_prefix: PREFIX }, attribution: 'Powered by TfL Open Data. Contains OS data © Crown copyright and database rights 2016 and Geomni UK Map data © and database rights [2019]',
        counts: { cameras: cameras.length, available: cameras.filter(c => c.available).length, dropped }, cameras }
}
