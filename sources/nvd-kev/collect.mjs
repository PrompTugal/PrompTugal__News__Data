// NVD's record of every CVE on CISA's Known Exploited Vulnerabilities list (the CVE API 2.0 hasKev filter): a daily baseline in
// the same per-CVE shape as nvd-cve's cves[], so cyber.b@'s per-CVE store has an NVD record for each KEV CVE, not only those
// NVD changed in the last day (cyber.b@ asked, 19 Nov 2026 02:15 UTC, for Dinis's request that every tracked CVE be kept with its
// changes, checked without a request per CVE). Code, no model. data.b@PrompTugal.dinis.
// Terms as nvd-cve (card.json): NVD's notice shown, values kept as served, no key (public limit 5 in 30 seconds), 7 seconds apart,
// pages of 2000: about 1,800 CVEs, so one request a day (two if the list passes 2,000). Descriptions and references never kept.
import { item, API } from '../nvd-cve/collect.mjs'
const PAGE = 2000, MAX_PAGES = 3, TS = /^\d{4}-\d{2}-\d{2}(T[\d:.]+)?$/

export default async function (run) {
    const out = []; let total = null, complete = false
    for (let i = 0; i < MAX_PAGES; i++) {
        const j = await run.json(`kev-${i}`, `${API}?hasKev&resultsPerPage=${PAGE}&startIndex=${i * PAGE}`, { gap: 7000, tries: 2, timeout: 120000 })
        if (!j || !Array.isArray(j.vulnerabilities)) break
        total = Number.isFinite(+j.totalResults) ? +j.totalResults : total
        for (const v of j.vulnerabilities) {
            const it = item(v?.cve); if (!it) continue
            const c = v.cve   // NVD's own copy of CISA's dates for the CVE, kept as served (the action and name texts are not kept)
            it.kev = { added: TS.test(String(c.cisaExploitAdd)) ? c.cisaExploitAdd : null, action_due: TS.test(String(c.cisaActionDue)) ? c.cisaActionDue : null }
            out.push(it)
        }
        if ((i + 1) * PAGE >= total) { complete = true; break }
    }
    if (!out.length) return null
    out.sort((a, b) => a.id.localeCompare(b.id))
    return { source: run.id, title: run.card.title, read_at: run.started,
        notice: 'This product uses the NVD API but is not endorsed or certified by the NVD.',
        provenance: run.prov({ api: `${API}?hasKev`, api_key: 'none (public rate limit)' }),
        about: 'NVD\'s record of every CVE on CISA\'s Known Exploited Vulnerabilities list, read once a day with the API\'s hasKev filter, in the same per-CVE shape as /api/v1/nvd-cve/latest.json (cves[]): CNA (domain only), status, CVSS, weakness types, vendors and products, published and lastModified, plus kev.added and kev.action_due as NVD serves them. Descriptions and references are not kept. Values are NVD\'s, as served.',
        counts: { cves: out.length, nvd_total: total, pages_complete: complete, with_products: out.filter(v => v.products.length).length },
        cves: out }
}
