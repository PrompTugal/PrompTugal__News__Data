// Santander Cycles docks in London (TfL BikePoint): each dock's position and, at the read, its bikes, e-bikes and empty
// docks; and London's totals. For Dinis's London demos (21 Nov 2026, about 09:16 UTC: tier 1, collected once a day as the
// archive; the page reads the live figures in the browser). Code, no model. One GET of TfL's Unified API (about 2.2 MB), no
// key. TfL's Transport Data Service terms (read by Dinis, 18 Nov 2026). data.b@PrompTugal.dinis.
const API = 'https://api.tfl.gov.uk/BikePoint'
const txt = (s, n) => typeof s === 'string' ? (s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) || null) : null
const int = v => /^\d{1,4}$/.test(String(v)) ? +v : null
export default async function (run) {
    const j = await run.json('bikepoint', API, { headers: { accept: 'application/json' }, timeout: 90000 })
    if (!Array.isArray(j)) return null
    let dropped = 0
    const docks = []
    for (const d of j) {
        if (!d || !/^BikePoints_\d{1,6}$/.test(String(d.id)) || !Number.isFinite(+d.lat) || !Number.isFinite(+d.lon)) { dropped++; continue }
        const p = Object.fromEntries((d.additionalProperties || []).filter(x => x && typeof x.key === 'string').map(x => [x.key, x.value]))
        const name = txt(d.commonName, 120); if (!name || name.includes('—')) { dropped++; continue }
        docks.push({ id: d.id, name, lat: +(+d.lat).toFixed(5), lon: +(+d.lon).toFixed(5), bikes: int(p.NbBikes), standard: int(p.NbStandardBikes), ebikes: int(p.NbEBikes),
            empty: int(p.NbEmptyDocks), docks: int(p.NbDocks), installed: p.Installed === 'true', locked: p.Locked === 'true' })
    }
    docks.sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true }))
    const sum = k => docks.reduce((s, d) => s + (d[k] || 0), 0)
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ api: API }), country: 'GB', place: 'london',
        about: 'Every Santander Cycles dock in London, with its bikes, e-bikes and empty docks as Transport for London published them at the read, and London\'s totals. Collected once a day as the archive; the page shows the live figures read in your browser from TfL.',
        live: { url: API, how: 'the page asks TfL for this address when it opens; TfL allows browser reads (CORS *)' },
        attribution: 'Powered by TfL Open Data',
        counts: { docks_listed: docks.length, in_service: docks.filter(d => d.installed && !d.locked).length, bikes: sum('bikes'), standard: sum('standard'), ebikes: sum('ebikes'), empty_docks: sum('empty'), dock_spaces: sum('docks'), dropped },
        docks }
}
