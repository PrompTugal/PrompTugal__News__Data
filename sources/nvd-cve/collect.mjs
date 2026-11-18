// NVD (NIST National Vulnerability Database), CVE API 2.0: CVEs published or modified in the last 24 hours, kept as identifiers
// and classifications, and totals per day and severity. Code, no model. Asked by cyber.b@PrompTugal.dinis (18 Nov 2026) inside
// Dinis's cyber signals (terms first; aggregates only; no IPs, hosts, victims or personal data; a weak signal, not an audit).
// Terms read 18 Nov 2026 (see card.json): the API may be used to "search, display, analyze, retrieve, view"; we show NVD's notice;
// we keep NVD's values as they are and say our totals are ours (a modified value may not be attributed to the NVD).
// Requests: no API key (public limit: 5 in a rolling 30 seconds), 7 seconds apart, one window of modified CVEs since 00:00 UTC
// yesterday (pages of 2000, at most four requests a run). Descriptions and reference URLs are never kept. The bytes go to the vault copy.
const API = 'https://services.nvd.nist.gov/rest/json/cves/2.0'
const CVE = /^CVE-\d{4}-\d{4,7}$/, CWE = /^CWE-\d{1,5}$/, TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?$/
const GAP = 7000, PAGE = 2000, MAX_PAGES = 6, MAX_PAIRS = 20
const txt = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) || null : null
// a field holding an em dash (which the site's wording check refuses) is dropped, never altered, and counted
let dropped = 0
const keep = (s, n) => { const t = txt(s, n); if (t && t.includes('—')) { dropped++; return null } return t }
const nvdTime = d => d.toISOString().replace(/\.\d+Z$/, '') + '.000'
const SEV = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE']

// CVSS: v3.1, else v4.0, else v3.0, else v2; NVD's own (Primary) score first, else the first given (usually the CNA's)
function cvss(m) {
    for (const [key, ver] of [['cvssMetricV31', '3.1'], ['cvssMetricV40', '4.0'], ['cvssMetricV30', '3.0'], ['cvssMetricV2', '2.0']]) {
        const a = Array.isArray(m?.[key]) ? m[key] : []; if (!a.length) continue
        const x = a.find(q => q.type === 'Primary') || a[0], d = x.cvssData || {}
        const score = typeof d.baseScore === 'number' && d.baseScore >= 0 && d.baseScore <= 10 ? d.baseScore : null
        const sev = String(d.baseSeverity || x.baseSeverity || '').toUpperCase()
        return { version: ver, score, severity: SEV.includes(sev) ? sev : null, scored_by: x.type === 'Primary' ? 'nvd' : 'cna' }
    }
    return null
}
// vendor and product from cpe:2.3:<part>:<vendor>:<product>:... (escaped colons handled), deduplicated, vulnerable entries only
function cpes(conf) {
    const set = new Map()
    const walk = n => {
        for (const c of (n?.cpeMatch || [])) if (c.vulnerable !== false) {
            const p = String(c.criteria || '').split(/(?<!\\):/)
            if (p[0] === 'cpe' && p[1] === '2.3' && p[3] && p[4] && p[3] !== '*' && p[4] !== '*') {
                const v = keep(p[3].replace(/\\(.)/g, '$1'), 60), q = keep(p[4].replace(/\\(.)/g, '$1'), 80)
                if (v && q) set.set(v + '\u0000' + q, [v, q])
            }
        }
        for (const k of (n?.children || [])) walk(k)
    }
    for (const c of (conf || [])) for (const n of (c.nodes || [])) walk(n)
    return [...set.values()].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
}
// the CNA's own vendor and product, as NVD's record carries them in "affected" (used when NVD has not yet analysed the CVE and so has no CPE)
function affected(a) {
    const set = new Map()
    for (const x of (Array.isArray(a) ? a : [])) for (const d of (x?.affectedData || [])) {
        const v = keep(d?.vendor, 60), q = keep(d?.product, 80), bad = t => !t || /^(n\/a|na|none|unknown|unspecified|not applicable|\*)$/i.test(t)
        if (!bad(v) && !bad(q)) set.set(v + '\u0000' + q, [v, q])
    }
    return [...set.values()].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
}
function cwes(w) {
    const s = new Set(); for (const x of (w || [])) for (const d of (x.description || [])) if (CWE.test(String(d.value))) s.add(d.value)
    return [...s].sort()
}
function item(c) {
    if (!c || !CVE.test(String(c.id)) || !TS.test(String(c.published)) || !TS.test(String(c.lastModified))) return null
    let pairs = cpes(c.configurations), from = pairs.length ? 'cpe' : null
    if (!pairs.length) { pairs = affected(c.affected); from = pairs.length ? 'cna' : null }
    return { id: c.id, published: c.published, lastModified: c.lastModified, vulnStatus: keep(c.vulnStatus, 30), cna: cnaOf(c.sourceIdentifier),
        cvss: cvss(c.metrics), cwes: cwes(c.weaknesses), products: pairs.slice(0, MAX_PAIRS).map(([vendor, product]) => ({ vendor, product })), products_more: Math.max(0, pairs.length - MAX_PAIRS), products_from: from,
        url: `https://nvd.nist.gov/vuln/detail/${c.id}` }
}
async function readWindow(run, name, startKey, endKey, from, to, maxPages = MAX_PAGES) {
    const out = []; let total = null
    for (let i = 0; i < maxPages; i++) {
        const u = `${API}?${startKey}=${nvdTime(from)}&${endKey}=${nvdTime(to)}&resultsPerPage=${PAGE}&startIndex=${i * PAGE}`
        const j = await run.json(`${name}-${i}`, u, { gap: GAP, tries: 2, timeout: 120000 })
        if (!j || !Array.isArray(j.vulnerabilities)) return { items: out, total, complete: false }
        total = Number.isFinite(+j.totalResults) ? +j.totalResults : total
        for (const v of j.vulnerabilities) { const it = item(v?.cve); if (it) out.push(it) }
        if ((i + 1) * PAGE >= total) return { items: out, total, complete: true }
    }
    return { items: out, total, complete: false }
}
const tally = (list, key) => { const m = {}; for (const v of list) { const k = key(v); m[k] = (m[k] || 0) + 1 } return m }
const sevRow = list => { const m = tally(list, v => v.cvss?.severity || 'UNSCORED'); return { CRITICAL: m.CRITICAL || 0, HIGH: m.HIGH || 0, MEDIUM: m.MEDIUM || 0, LOW: m.LOW || 0, NONE: m.NONE || 0, unscored: m.UNSCORED || 0 } }

// the CNA as NVD names it (sourceIdentifier): an email address or a UUID. Only the domain of an address is kept, never the
// address itself (data.b@, 18 Nov 2026: no contact details from untrusted data); a UUID is kept as given.
const cnaOf = v => { const t = typeof v === 'string' ? v.trim() : ''; const m = /^[^@\s]+@([a-z0-9.-]+\.[a-z]{2,})$/i.exec(t); if (m) return m[1].toLowerCase(); return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(t) ? t.toLowerCase() : null }

const DAYS_KEPT = 30
// daily_totals (cyber.b@'s request, 18 Nov 2026): whole UTC days, {new, modified, by_severity, complete}, carried from the previous
// latest.json for 30 days. A day counted by a later read replaces a partial one; a day already complete is kept as it was counted.
// complete is true only when the read window covered the whole day (it starts at 00:00 UTC yesterday, so yesterday is complete and
// today never is) and every page of it was read. "modified" counts the CVEs whose latest modification fell on that day.
function dailyTotals(prev, list, windowFrom, windowTo, pagesComplete, readAt) {
    const out = {}
    for (const [d, v] of Object.entries(prev && typeof prev === 'object' ? prev : {})) if (/^\d{4}-\d{2}-\d{2}$/.test(d) && v && typeof v === 'object') out[d] = v
    const first = windowFrom.toISOString().slice(0, 10)   // only the days inside the window: an old CVE modified now says nothing about its published day
    const days = new Set([...list.map(v => v.published.slice(0, 10)), ...list.map(v => v.lastModified.slice(0, 10))])
    for (const d of [...days].filter(d => d >= first).sort()) {
        const dayStart = new Date(d + 'T00:00:00Z'), dayEnd = new Date(+dayStart + 864e5)
        const covered = pagesComplete && +windowFrom <= +dayStart && +windowTo >= +dayEnd
        if (out[d]?.complete === true) continue
        const n = list.filter(v => v.published.slice(0, 10) === d), m = list.filter(v => v.lastModified.slice(0, 10) === d && v.published.slice(0, 10) !== d)
        out[d] = { new: n.length, modified: m.length, by_severity: { new: sevRow(n), modified: sevRow(m) }, complete: covered, counted_at: readAt }
    }
    const res = {}
    for (const d of Object.keys(out).sort().slice(-DAYS_KEPT)) res[d] = out[d]
    return res
}

export default async function (run, prevLatest) {
    dropped = 0
    const end = new Date(run.started), start = new Date(+end - 864e5)
    const day0 = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - 1))   // 00:00 UTC yesterday
    // One window of CVEs modified since 00:00 UTC yesterday (up to 48 hours, pages of 2000, at most four requests a run). A CVE
    // published in that window was also modified in it, so the one window gives the new and the modified CVEs, per day, whole
    // for yesterday. This replaces the earlier two windows (24 hours modified, since yesterday published).
    const win = await readWindow(run, 'modified', 'lastModStartDate', 'lastModEndDate', day0, end, 4)
    if (!win.items.length) return null
    const startIso = nvdTime(start).slice(0, 19)
    const newIds = new Set(win.items.filter(v => v.published.slice(0, 19) >= startIso).map(v => v.id))
    const items = win.items.filter(v => v.lastModified.slice(0, 19) >= startIso || newIds.has(v.id))
    items.sort((a, b) => b.lastModified.localeCompare(a.lastModified) || a.id.localeCompare(b.id))
    const modified = items.filter(v => !newIds.has(v.id)), fresh = items.filter(v => newIds.has(v.id))
    const first = day0.toISOString().slice(0, 10)
    const days = new Set([...win.items.map(v => v.published.slice(0, 10)), ...win.items.map(v => v.lastModified.slice(0, 10))].filter(d => d >= first))
    const today = end.toISOString().slice(0, 10)
    const daily = [...days].sort().map(d => {
        const n = win.items.filter(v => v.published.slice(0, 10) === d), m = win.items.filter(v => v.lastModified.slice(0, 10) === d && v.published.slice(0, 10) !== d)
        return { day: d, new: n.length, new_by_severity: sevRow(n), modified: m.length, modified_by_severity: sevRow(m),
            note: d === today ? 'the day so far' : 'the whole day' }
    })
    const vendors = tally(fresh.flatMap(v => [...new Set(v.products.map(p => p.vendor.toLowerCase()))]), x => x)
    const cnas = tally(fresh, v => v.cna || 'not given')
    return {
        source: run.id, title: run.card.title, read_at: run.started,
        notice: 'This product uses the NVD API but is not endorsed or certified by the NVD.',
        provenance: run.prov({ api: API, window_from: nvdTime(day0), window_to: nvdTime(end), last_24h_from: nvdTime(start), api_key: 'none (public rate limit)' }),
        about: 'CVEs that NVD published or modified in the 24 hours before the read: each with its CNA (the domain of NVD\'s sourceIdentifier, never the address), status, CVSS base severity and score, weakness types and the vendors and products (NVD\'s CPE configurations, else the CNA\'s own list in the same record, marked products_from); and totals per day and severity (daily, and daily_totals for 30 days, complete true only for a whole UTC day). Values are NVD\'s, kept as served; the totals are ours, counted from them. Descriptions and references are not kept. Vulnerabilities in products, never a victim, host or address. A weak signal, not an audit.',
        counts: { cves_in_window: items.length, cves_read_since_yesterday: win.items.length, nvd_total_since_yesterday: win.total, new_last_24h: newIds.size, modified_not_new_last_24h: modified.length, pages_complete: win.complete, fields_dropped_em_dash: dropped },
        last_24h: { new: fresh.length, new_by_severity: sevRow(fresh), modified: modified.length, modified_by_severity: sevRow(modified) },
        daily,
        daily_totals: dailyTotals(prevLatest?.daily_totals, win.items, day0, end, win.complete, run.started),
        new_by_cna: Object.entries(cnas).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 25).map(([cna, n]) => ({ cna, new: n })),
        new_by_vendor: Object.entries(vendors).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 25).map(([vendor, n]) => ({ vendor, new: n })),
        coverage: { cves_with_products: items.filter(v => v.products.length).length, from_cpe: items.filter(v => v.products_from === 'cpe').length, from_cna: items.filter(v => v.products_from === 'cna').length },
        cves: items,
    }
}
