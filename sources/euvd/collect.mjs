// EUVD, the EU Vulnerability Database run by ENISA: the vulnerabilities updated in the last 24 hours, the latest and the exploited
// lists, kept as identifiers and classifications, and totals per day and severity. Code, no model. Asked by cyber.b@PrompTugal.dinis
// (18 Nov 2026). Dinis decided (18 Nov 2026, about 23:40 UTC, relayed by cyber.b@): ENISA is read through its published interfaces;
// our collector is plain code with its own named user agent, and the paths read are allowed to `*`.
// Interface: EUVD's published API (https://euvd.enisa.europa.eu/apidoc, no key, GET only): /api/lastvulnerabilities,
// /api/exploitedvulnerabilities (8 records each) and /api/search (100 a page, newest update first). Read from
// https://euvdservices.enisa.europa.eu. robots.txt of both hosts is read first, every run (euvd: `User-agent: *` and an empty
// `Disallow:`; euvdservices: 404, no rules); a Disallow that covers /api for us stops the run.
// Requests: one at a time, 10 seconds apart (ENISA's Crawl-delay), at most 5 MB an answer, a refusal (403, 429, a bot check, a
// reset) stops the run and is recorded, never worked around. Descriptions, references, the ENISA UUIDs and the advisory text are
// never kept. The bytes go to the vault copy.
const API = 'https://euvdservices.enisa.europa.eu/api', SITE = 'https://euvd.enisa.europa.eu'
const GAP = 10000, PAGE = 100, MAX_PAGES = 30, MAX_BYTES = 5 * 1024 * 1024, MAX_PAIRS = 10, DAYS_KEPT = 14
const ID = /^EUVD-\d{4}-\d{4,9}$/, CVE = /^CVE-\d{4}-\d{4,7}$/, VERSIONS = ['2.0', '3.0', '3.1', '4.0']
const MON = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 }
const SEV = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'NONE']
const txt = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) || null : null
// a field holding an em dash (which the site's wording check refuses) is dropped, never altered, and counted
let dropped = 0
const keep = (s, n) => { const t = txt(s, n); if (t && t.includes('—')) { dropped++; return null } return t }
const name = (s, n) => { const t = keep(s, n); return t && !/^(n\/a|na|none|unknown|unspecified|not applicable|\*|-)$/i.test(t) ? t : null }   // a placeholder is no vendor or product
// "Nov 18, 2026, 9:31:40 PM" (the API's own format; read as UTC, which fits the server's clock) -> "2026-11-18T21:31:40Z"
function when(s) {
    const m = /^([A-Z][a-z]{2}) (\d{1,2}), (\d{4}), (\d{1,2}):(\d{2}):(\d{2})\s?([AP]M)$/.exec(String(s || '').trim().replace(/[   ]/g, ' '))
    if (!m || !(m[1] in MON)) return null
    let h = +m[4] % 12; if (m[7] === 'PM') h += 12
    const d = new Date(Date.UTC(+m[3], MON[m[1]], +m[2], h, +m[5], +m[6]))
    return Number.isNaN(+d) || +m[4] > 12 || +m[4] < 1 ? null : d.toISOString().replace(/\.\d+Z$/, 'Z')
}
// CVSS qualitative ranges (FIRST): ours, derived from the base score; the API gives a score and a version, not a severity
const sevOf = x => x == null ? null : x === 0 ? 'NONE' : x < 4 ? 'LOW' : x < 7 ? 'MEDIUM' : x < 9 ? 'HIGH' : 'CRITICAL'
function item(v) {
    if (!v || !ID.test(String(v.id))) return null
    const published = when(v.datePublished), updated = when(v.dateUpdated); if (!published || !updated) return null
    const score = typeof v.baseScore === 'number' && v.baseScore >= 0 && v.baseScore <= 10 ? v.baseScore : null
    const ver = score !== null && VERSIONS.includes(String(v.baseScoreVersion)) ? String(v.baseScoreVersion) : null
    const aliases = [...new Set(String(v.aliases || '').split(/\s+/).filter(a => CVE.test(a)))].sort()
    const pairs = new Map(), vendors = new Set()
    for (const p of (Array.isArray(v.enisaIdProduct) ? v.enisaIdProduct : [])) {
        const ven = name(p?.product?.vendor?.name, 80), pro = name(p?.product?.name, 80)
        if (ven) vendors.add(ven)
        if (ven && pro) pairs.set(ven + '\u0000' + pro, [ven, pro])
    }
    for (const p of (Array.isArray(v.enisaIdVendor) ? v.enisaIdVendor : [])) { const ven = name(p?.vendor?.name, 80); if (ven) vendors.add(ven) }
    const list = [...pairs.values()].sort((a, b) => a[0].localeCompare(b[0]) || a[1].localeCompare(b[1]))
    const since = when(v.exploitedSince)
    return { id: v.id, aliases, published, updated, base_score: score, score_version: ver, severity: ver ? sevOf(score) : null,
        vendors: [...vendors].sort().slice(0, MAX_PAIRS), products: list.slice(0, MAX_PAIRS).map(([vendor, product]) => ({ vendor, product })), products_more: Math.max(0, list.length - MAX_PAIRS),
        exploited: !!since, exploited_since: since ? since.slice(0, 10) : null, url: `${SITE}/vulnerability/${v.id}` }
}
// robots.txt: the groups that name us or `*`; true when a Disallow there covers /api (or everything). One agent group is read by
// its literal rules; Allow lines are not needed because the two hosts give none.
function blocked(body) {
    let applies = false, any = false, hit = null
    for (const raw of String(body).split(/\r?\n/)) {
        const l = raw.replace(/#.*/, '').trim(); if (!l) continue
        const m = /^([A-Za-z-]+)\s*:\s*(.*)$/.exec(l); if (!m) continue
        const k = m[1].toLowerCase(), v = m[2].trim()
        if (k === 'user-agent') { if (any) { applies = false; any = false } ; if (v === '*' || /promptugal/i.test(v)) applies = true; else if (!applies) applies = false }
        else { any = true; if (applies && k === 'disallow' && v && (v === '/' || '/api'.startsWith(v) || v.startsWith('/api'))) hit = v }
    }
    return hit
}
const sevRow = list => { const m = {}; for (const v of list) { const k = v.severity || 'UNSCORED'; m[k] = (m[k] || 0) + 1 } return { CRITICAL: m.CRITICAL || 0, HIGH: m.HIGH || 0, MEDIUM: m.MEDIUM || 0, LOW: m.LOW || 0, NONE: m.NONE || 0, unscored: m.UNSCORED || 0 } }
const day = t => t.slice(0, 10)
// daily_totals: whole UTC days {new, modified, by_severity:{new, modified}, complete}, 14 days carried from the previous latest.json.
// A day counted by a later read replaces a partial one; a day already complete is kept. complete is true only when the read
// reached back to 00:00 UTC of that day and the day had ended (the 00 UTC run reads from 00:00 yesterday for this).
function dailyTotals(prev, list, from, to, pagesComplete, readAt) {
    const out = {}
    for (const [d, v] of Object.entries(prev && typeof prev === 'object' ? prev : {})) if (/^\d{4}-\d{2}-\d{2}$/.test(d) && v && typeof v === 'object') out[d] = v
    const first = from.toISOString().slice(0, 10), last = to.toISOString().slice(0, 10)
    const days = new Set(list.flatMap(v => [day(v.published), day(v.updated)]).filter(d => d >= first && d <= last))
    for (const d of [...days].sort()) {
        const s = new Date(d + 'T00:00:00Z'), e = new Date(+s + 864e5)
        if (out[d]?.complete === true) continue
        const n = list.filter(v => day(v.published) === d), m = list.filter(v => day(v.updated) === d && day(v.published) !== d)
        out[d] = { new: n.length, modified: m.length, by_severity: { new: sevRow(n), modified: sevRow(m) }, complete: pagesComplete && +from <= +s && +to >= +e, counted_at: readAt }
    }
    const res = {}
    for (const d of Object.keys(out).sort().slice(-DAYS_KEPT)) res[d] = out[d]
    return res
}
const opts = { gap: GAP, tries: 2, timeout: 90000, maxBytes: MAX_BYTES, headers: { accept: 'application/json' } }
const arr = j => Array.isArray(j) ? j : null

export default async function (run, prevLatest) {
    dropped = 0
    const end = new Date(run.started), cut = new Date(+end - 864e5)
    // at the 00 UTC run the window reaches back to 00:00 UTC yesterday, so that day is counted whole (about 24 hours and a few minutes)
    const from = end.getUTCHours() === 0 ? new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate() - 1)) : cut
    // robots.txt first, both hosts; a Disallow for us, or a refusal, stops the run and is recorded
    for (const [name, url] of [['robots-euvd', SITE + '/robots.txt'], ['robots-services', 'https://euvdservices.enisa.europa.eu/robots.txt']]) {
        const r = await run.get(name, url, { gap: GAP, tries: 1, timeout: 30000, maxBytes: 200000 })
        if (r.status === 403 || r.status === 429 || r.status === 'too-big') return null
        if (r.ok && blocked(r.bytes.toString('utf8'))) return null
    }
    const last = arr(await run.json('latest', `${API}/lastvulnerabilities`, opts))
    if (!last) return null   // refused, unavailable or not JSON: nothing else is asked; the last read stays
    const expl = arr(await run.json('exploited', `${API}/exploitedvulnerabilities`, opts))
    const explTotal = await run.json('exploited-total', `${API}/search?exploited=true&size=1&page=0`, opts)
    const byId = new Map(); let seen = 0, complete = false, reached = null, total = null
    const lastIds = new Set(), explIds = new Set()
    for (const v of last) { const it = item(v); if (it) { lastIds.add(it.id); byId.set(it.id, it) } }
    for (const v of (expl || [])) { const it = item(v); if (it) { explIds.add(it.id); byId.set(it.id, { ...it, exploited: true }) } }
    const window = new Map()
    const fromDate = from.toISOString().slice(0, 10), toDate = end.toISOString().slice(0, 10)
    for (let i = 0; i < MAX_PAGES; i++) {
        const j = await run.json(`updated-${i}`, `${API}/search?fromUpdatedDate=${fromDate}&toUpdatedDate=${toDate}&size=${PAGE}&page=${i}`, opts)
        if (!j || !Array.isArray(j.items)) break
        total = Number.isFinite(+j.total) ? +j.total : total
        let oldest = null
        for (const v of j.items) {
            seen++
            const it = item(v); if (!it) continue
            oldest = it.updated
            if (it.updated >= from.toISOString()) { window.set(it.id, it); byId.set(it.id, { ...(byId.get(it.id) || {}), ...it, exploited: it.exploited || explIds.has(it.id) }) }
        }
        reached = oldest
        if (!j.items.length || j.items.length < PAGE || (oldest && oldest < from.toISOString())) { complete = true; break }   // sorted by update, newest first: older than the window means the window is read
    }
    const inWindow = [...window.values()]
    for (const it of inWindow) it.exploited = byId.get(it.id).exploited
    if (!inWindow.length && !last.length) return null
    const cutIso = cut.toISOString().replace(/\.\d+Z$/, 'Z')
    const fresh = inWindow.filter(v => v.published >= cutIso), modified = inWindow.filter(v => v.published < cutIso && v.updated >= cutIso)
    const items = inWindow.filter(v => v.updated >= cutIso)
    for (const v of byId.values()) if ((lastIds.has(v.id) || explIds.has(v.id)) && !items.some(x => x.id === v.id)) items.push(v)
    items.sort((a, b) => b.updated.localeCompare(a.updated) || a.id.localeCompare(b.id))
    const vendors = {}; for (const v of fresh) for (const n of new Set(v.vendors.map(x => x.toLowerCase()))) vendors[n] = (vendors[n] || 0) + 1
    const tag = v => ({ ...v, in_latest_list: lastIds.has(v.id), in_exploited_list: explIds.has(v.id) })
    const explNow = inWindow.filter(v => v.exploited && v.updated >= cutIso)
    return {
        source: run.id, title: run.card.title, read_at: run.started,
        provenance: run.prov({ api: API, window_from: from.toISOString().replace(/\.\d+Z$/, 'Z'), window_to: run.started, interface: 'EUVD published API (https://euvd.enisa.europa.eu/apidoc), no key', robots: SITE + '/robots.txt (User-agent *, empty Disallow); euvdservices.enisa.europa.eu/robots.txt answered 404 (no rules)' }),
        about: 'Vulnerabilities in the EU Vulnerability Database (EUVD, run by ENISA) that were published or updated in the 24 hours before the read, plus EUVD\'s own latest and exploited lists: each with its EUVD identifier, CVE aliases, dates, CVSS base score and version, a severity band (ours, from the score by the standard CVSS ranges), vendor and product names, whether EUVD lists it as exploited, and a link to the EUVD page; and totals per day and severity (daily_totals, 14 days, complete true only for a whole UTC day). Values are EUVD\'s, kept as served; the totals are ours. Descriptions and references are not kept. Source: ENISA, EUVD (euvd.enisa.europa.eu); reproduction is authorised if the source is acknowledged. Times are read as UTC. Vulnerabilities in products, never a victim, host or address. A weak signal, not an audit.',
        counts: { in_last_24h: items.length, new_last_24h: fresh.length, updated_not_new_last_24h: modified.length, exploited_in_last_24h: explNow.length, exploited_total_euvd: explTotal && Number.isFinite(+explTotal.total) ? +explTotal.total : null,
            euvd_total_since_window_start: total, records_read: seen, pages_complete: complete, oldest_update_reached: reached, fields_dropped_em_dash: dropped },
        last_24h: { new: fresh.length, new_by_severity: sevRow(fresh), updated: modified.length, updated_by_severity: sevRow(modified), exploited: explNow.length },
        daily_totals: dailyTotals(prevLatest?.daily_totals, inWindow, from, end, complete, run.started),
        new_by_vendor: Object.entries(vendors).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 25).map(([vendor, n]) => ({ vendor, new: n })),
        latest_list: last.map(v => v?.id).filter(i => ID.test(String(i))),
        exploited_list: (expl || []).map(v => v?.id).filter(i => ID.test(String(i))),
        vulnerabilities: items.map(tag),
    }
}
