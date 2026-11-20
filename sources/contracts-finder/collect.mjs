// Contracts Finder (UK government procurement notices, Open Government Licence v3.0): the notices London public bodies
// published in the 24 hours before the read, from the published OCDS search API (no key). Asked by civic.b@PrompTugal.dinis
// through conductor.b@ (19 Nov 2026 19:27 UTC), inside Dinis's London decision (PrompTugal__News__Website
// board/guidance/2026-11-18-london.md: each UK source on the register with its terms read first). Terms: every package
// carries the OGL v3.0 licence; robots.txt answers "page not found" (no rules); the published search needs no token (the API
// documentation's authentication covers drafts and users only). Code, no model. data.b@PrompTugal.dinis.
// Only the buyer (a public body) is kept, never a supplier or a contact: supplier names in notices can be sole traders, and
// this site never names a private person. London: the buyer's locality says London, or its postcode area lies wholly inside
// Greater London (E, EC, N, NW, SE, SW, W, WC); the outer areas that straddle the boundary (BR, CR, DA, EN, HA, IG, KT, RM, SM,
// TW, UB, WD) are left out, so London bodies there are missed, and the file says so.
const API = 'https://www.contractsfinder.service.gov.uk/Published/Notices/OCDS/Search'
const LIC = 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/'
const INNER = new Set(['E', 'EC', 'N', 'NW', 'SE', 'SW', 'W', 'WC'])
const LIMIT = 100
const HYPE = /\b(revolutionary|cutting[- ]edge|seamless(?:ly)?|world[- ]class|game[- ]changing)\b/i   // the same words as scripts/validate.mjs
const txt = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) || null : null
// a field the site's wording check refuses (an em dash or a listed word) is dropped, never altered, and counted
let dropped = 0
const keep = (s, n) => { const t = txt(s, n); if (t && (t.includes('—') || HYPE.test(t))) { dropped++; return null } return t }
const area = pc => (/^([A-Z]{1,2})\d/.exec(String(pc || '').toUpperCase().trim()) || [])[1] || null
const outward = pc => (/^([A-Z]{1,2}\d[A-Z\d]?)\s*\d[A-Z]{2}$/i.exec(String(pc || '').trim()) || [])[1]?.toUpperCase() || null
const isLondon = a => !!a && (/\blondon\b/i.test(String(a.locality || '')) || /\blondon\b/i.test(String(a.region || '')) || INNER.has(area(a.postalCode)))
const num = v => Number.isFinite(+v) ? +v : null

export default async function (run) {
    dropped = 0
    const to = new Date(run.started), from = new Date(+to - 864e5)
    const iso = d => d.toISOString().replace(/\.\d+Z$/, '')
    // six 4-hour windows of up to 100 notices each, no pagination cursor (a cursor is a long encoded token the leak scan
    // refuses in the reads log); a window that comes back full is counted, and the read is marked incomplete
    const WINDOWS = 6, kept = new Map()
    let pages = 0, seen = 0, full = 0, licence = null
    for (let w = 0; w < WINDOWS; w++) {
        const a = new Date(+from + w * 4 * 3600e3), b = new Date(+from + (w + 1) * 4 * 3600e3)
        const url = `${API}?publishedFrom=${iso(a)}&publishedTo=${iso(b)}&limit=${LIMIT}`
        const j = await run.json(`window-${w + 1}`, url, { headers: { accept: 'application/json' }, timeout: 60000 }); pages++
        if (!j || !Array.isArray(j.releases)) continue
        if (j.releases.length >= LIMIT) full++
        licence = licence || j.license || null
        for (const r of j.releases) {
            seen++
            const buyer = (r.parties || []).find(p => (p.roles || []).includes('buyer')) || {}
            if (!isLondon(buyer.address)) continue
            const guid = String(r.id || '').replace(/-\d+$/, '')
            if (!/^[0-9a-f-]{36}$/.test(guid)) continue
            const t = r.tender || {}, aw = (r.awards || [])[0] || {}
            kept.set(r.ocid || guid, { ocid: txt(r.ocid, 80), notice: `https://www.contractsfinder.service.gov.uk/Notice/${guid}`, published: txt(r.date, 25), stage: (r.tag || []).map(x => txt(x, 30)).filter(Boolean),
                title: keep(t.title, 300), buyer: keep(buyer.name, 160), buyer_locality: keep(buyer.address?.locality, 80), buyer_postcode_district: outward(buyer.address?.postalCode),
                status: txt(t.status, 30), value: num(t.value?.amount) != null ? { amount: num(t.value.amount), currency: txt(t.value.currency, 3) } : null,
                award_value: num(aw.value?.amount) != null ? { amount: num(aw.value.amount), currency: txt(aw.value.currency, 3) } : null,
                deadline: txt(t.tenderPeriod?.endDate, 25), procurement_method: txt(t.procurementMethod, 40) })
        }
    }
    // a read where every window answered with no notices at all is not a complete read of a quiet day: on 20 Nov 2026
    // 07:04 UTC all six windows answered 200 with an empty package (1,387 bytes) while the same windows answered 47 notices
    // and more at 09:50 UTC (civic.b@'s report, relayed by conductor.b@ at 09:50 UTC). So an all-empty read says so plainly.
    const empty = seen === 0
    const complete = full === 0 && !empty
    if (!pages) return null
    const items = [...kept.values()].sort((a, b) => String(b.published).localeCompare(String(a.published)))
    const buyers = {}; for (const i of items) if (i.buyer) buyers[i.buyer] = (buyers[i.buyer] || 0) + 1
    const sum = c => items.reduce((s, i) => s + (i.value && i.value.currency === c ? i.value.amount : 0), 0)
    return {
        source: run.id, title: run.card.title, read_at: run.started, place: 'london',
        provenance: run.prov({ api: API, window_from: iso(from) + 'Z', window_to: iso(to) + 'Z', interface: 'Contracts Finder published OCDS search (no key)', robots: 'https://www.contractsfinder.service.gov.uk/robots.txt answered page not found (no rules), 19 Nov 2026' }),
        license: { name: 'Open Government Licence v3.0', url: LIC, ...(licence && licence !== LIC ? { url_stated_by_source: licence } : {}), holder: 'Crown copyright (Crown Commercial Service)', commercial_use: 'allowed', attribution: 'Contains public sector information licensed under the Open Government Licence v3.0.' },
        about: 'Procurement notices that London public bodies published on Contracts Finder in the 24 hours before the read: each with its notice page, stage, title, buyer (as published: mostly public bodies, sometimes an agent publishing for one), the buyer\'s postcode district, value, award value and deadline, as published. London means the buyer\'s locality says London or its postcode area lies wholly inside Greater London (E, EC, N, NW, SE, SW, W, WC); bodies in the outer areas that straddle the boundary are not counted. When the locality says London it counts even if the postcode lies outside London: some national bodies publish a non-geographic postcode (HMRC uses SS99, Southend) with a London address. Suppliers and contacts are not kept. Source: Contracts Finder (Crown Commercial Service); OGL v3.0. A weak signal, not an audit.',
        counts: { notices_in_window: seen, london_notices: items.length, windows_read: pages, windows_full: full, complete, ...(empty ? { empty_read: true } : {}), buyers: Object.keys(buyers).length, fields_dropped_wording: dropped, value_gbp_listed: Math.round(sum('GBP')) },
        ...(empty ? { read_note: 'Every window answered with no notices at all. A whole day with no notices anywhere in the UK is unlikely, so this most likely means the source answered empty, not that London published nothing. Treat it as a gap, not as a count of zero.' } : {}),
        top_buyers: Object.entries(buyers).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 20).map(([buyer, n]) => ({ buyer, notices: n })),
        notices: items,
    }
}
