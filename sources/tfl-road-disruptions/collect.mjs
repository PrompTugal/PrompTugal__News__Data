// London road disruptions (TfL): works, incidents and closures on London's roads as TfL lists them at the read, each with its
// severity, category, place, TfL's description and the period. For Dinis's London demos (21 Nov 2026, about 09:16 UTC: tier 1,
// collected once a day as the archive; the page reads the live list in the browser). Code, no model. One GET of TfL's
// Unified API, no key. TfL's Transport Data Service terms (read by Dinis, 18 Nov 2026). data.b@PrompTugal.dinis.
const API = 'https://api.tfl.gov.uk/Road/all/Disruption'
const HYPE = /\b(revolutionary|cutting[- ]edge|seamless(?:ly)?|world[- ]class|game[- ]changing)\b/i   // the same words as scripts/validate.mjs
const txt = (s, n) => typeof s === 'string' ? (s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) || null) : null
let dropped = 0
const keep = (s, n) => { const t = txt(s, n); if (t && (t.includes('—') || HYPE.test(t))) { dropped++; return null } return t }
const point = s => { try { const a = JSON.parse(String(s)); return Array.isArray(a) && a.length === 2 && a.every(Number.isFinite) ? { lon: +a[0].toFixed(5), lat: +a[1].toFixed(5) } : null } catch { return null } }
export default async function (run) {
    dropped = 0
    const j = await run.json('disruptions', API, { headers: { accept: 'application/json' }, timeout: 60000 })
    if (!Array.isArray(j)) return null
    const items = j.filter(d => d && /^[A-Z]{2,6}-\d{1,9}$/.test(String(d.id))).map(d => ({
        id: d.id, severity: txt(d.severity, 30), category: txt(d.category, 40), sub_category: txt(d.subCategory, 60), status: txt(d.status, 30),
        level_of_interest: txt(d.levelOfInterest, 20), closures: d.hasClosures === true, location: keep(d.location, 200), description: keep(d.comments, 600),
        current_update: keep(d.currentUpdate, 400), updated: txt(d.currentUpdateDateTime || d.lastModifiedTime, 25), start: txt(d.startDateTime, 25), end: txt(d.endDateTime, 25),
        ...(point(d.point) || {}), corridors: (d.corridorIds || []).map(x => txt(x, 20)).filter(Boolean) }))
        .sort((a, b) => String(b.updated).localeCompare(String(a.updated)))
    const by = k => items.reduce((o, i) => (o[i[k] || 'unknown'] = (o[i[k] || 'unknown'] || 0) + 1, o), {})
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ api: API }), country: 'GB', place: 'london',
        about: 'Works, incidents and closures on London\'s roads as Transport for London listed them at the read: severity, category, place, TfL\'s description and the period. Collected once a day as the archive; the page shows the live list read in your browser from TfL.',
        live: { url: API, how: 'the page asks TfL for this address when it opens; TfL allows browser reads (CORS *)' },
        attribution: 'Powered by TfL Open Data',
        counts: { disruptions: items.length, with_closures: items.filter(i => i.closures).length, by_severity: by('severity'), by_category: by('category'), fields_dropped_wording: dropped }, disruptions: items }
}
