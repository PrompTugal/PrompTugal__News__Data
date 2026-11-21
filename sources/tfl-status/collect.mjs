// TfL line status in London: each Tube, Overground, Elizabeth line, DLR and tram line's current status as TfL publishes it
// (good service, minor delays, part closure and so on, with TfL's reason). For Dinis's London demos (21 Nov 2026, about 09:16
// UTC: tier 1, collected once a day as the archive; the pages read the live status in the browser). Code, no model.
// One GET of TfL's Unified API, no key. TfL's Transport Data Service terms (read by Dinis, 18 Nov 2026). data.b@PrompTugal.dinis.
const MODES = 'tube,overground,elizabeth-line,dlr,tram'
const API = `https://api.tfl.gov.uk/Line/Mode/${MODES}/Status`
const HYPE = /\b(revolutionary|cutting[- ]edge|seamless(?:ly)?|world[- ]class|game[- ]changing)\b/i   // the same words as scripts/validate.mjs
const txt = (s, n) => typeof s === 'string' ? (s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) || null) : null
let dropped = 0
const keep = (s, n) => { const t = txt(s, n); if (t && (t.includes('—') || HYPE.test(t))) { dropped++; return null } return t }
export default async function (run) {
    dropped = 0
    const j = await run.json('status', API, { headers: { accept: 'application/json' }, timeout: 60000 })
    if (!Array.isArray(j)) return null
    const lines = j.filter(l => l && /^[a-z0-9-]{2,40}$/.test(String(l.id))).map(l => ({
        id: l.id, name: keep(l.name, 60), mode: txt(l.modeName, 30),
        statuses: (l.lineStatuses || []).map(s => ({ severity: Number.isFinite(+s.statusSeverity) ? +s.statusSeverity : null, status: keep(s.statusSeverityDescription, 60), reason: keep(s.reason, 600),
            from: txt((s.validityPeriods || [])[0]?.fromDate, 25), to: txt((s.validityPeriods || [])[0]?.toDate, 25) })) }))
        .sort((a, b) => a.mode.localeCompare(b.mode) || a.name.localeCompare(b.name))
    const good = lines.filter(l => l.statuses.every(s => s.severity === 10)).length
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ api: API }), country: 'GB', place: 'london',
        about: 'Each London Tube, Overground, Elizabeth line, DLR and tram line and its status as Transport for London published it at the read (severity 10 is good service), with TfL\'s reason. Collected once a day as the archive; the page shows the live status read in your browser from TfL.',
        live: { url: API, how: 'the page asks TfL for this address when it opens; TfL allows browser reads (CORS *)' },
        attribution: 'Powered by TfL Open Data',
        counts: { lines: lines.length, good_service: good, not_good: lines.length - good, fields_dropped_wording: dropped }, lines }
}
