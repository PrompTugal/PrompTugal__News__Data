// CISA's Known Exploited Vulnerabilities catalogue (CC0 1.0): the list as read, and weekly totals. Code, no model.
// Asked by cyber.b@PrompTugal.dinis (18 Nov 2026, 20:59 UTC) inside Dinis's cyber signals (PrompTugal__News__Website
// board/guidance/2026-11-18-people-blogs-cyber-and-simulated-payments.md: terms checked first, aggregates only, no IPs, hosts
// or victims). The catalogue names vulnerabilities in vendors' products, never a victim or a host. data.b@PrompTugal.dinis.
// One GET a run of the published feed; the bytes go to the vault copy (raw, timestamped when they change).
const FEED = 'https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json'
const CVE = /^CVE-\d{4}-\d{4,7}$/, DAY = /^\d{4}-\d{2}-\d{2}$/
const txt = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/—/g, ', ').replace(/\s+/g, ' ').trim().slice(0, n) || null : null
// ISO week (Monday start) of a YYYY-MM-DD day
// a field holding an em dash (which the site's wording check refuses) is dropped, never altered, and counted
let droppedFields = 0
const keep = (s, n) => { const t = txt(s, n); if (t && t.includes('\u2014')) { droppedFields++; return null } return t }
const week = d => { const t = new Date(d + 'T00:00:00Z'), w = (t.getUTCDay() + 6) % 7; t.setUTCDate(t.getUTCDate() - w); return t.toISOString().slice(0, 10) }

export default async function (run) {
    droppedFields = 0
    const j = await run.json('kev', FEED)
    if (!j || !Array.isArray(j.vulnerabilities)) return null
    const items = j.vulnerabilities.filter(v => v && CVE.test(String(v.cveID)) && DAY.test(String(v.dateAdded))).map(v => ({
        cveID: v.cveID, vendorProject: keep(v.vendorProject, 80), product: keep(v.product, 120), vulnerabilityName: keep(v.vulnerabilityName, 200),
        dateAdded: v.dateAdded, dueDate: DAY.test(String(v.dueDate)) ? v.dueDate : null, knownRansomwareCampaignUse: txt(v.knownRansomwareCampaignUse, 20),
        cwes: Array.isArray(v.cwes) ? v.cwes.filter(c => /^CWE-\d+$/.test(String(c))) : [], url: `https://nvd.nist.gov/vuln/detail/${v.cveID}` }))
    items.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded) || a.cveID.localeCompare(b.cveID))
    const weeks = {}; for (const v of items) { const w = week(v.dateAdded); weeks[w] = (weeks[w] || 0) + 1 }
    const vendors = {}; for (const v of items) if (v.vendorProject) vendors[v.vendorProject] = (vendors[v.vendorProject] || 0) + 1
    return {
        source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ feed: FEED, catalog_version: txt(j.catalogVersion, 20), date_released: txt(j.dateReleased, 40) }),
        about: 'CISA\'s catalogue of vulnerabilities known to be exploited, as read: each CVE with its vendor, product, the day CISA added it and whether it is known to be used in ransomware campaigns; and totals per week and per vendor. Vulnerabilities in products, never a victim, host or address. A weak signal, not an audit.',
        counts: { vulnerabilities: items.length, published_count: Number.isFinite(+j.count) ? +j.count : null, vendors: Object.keys(vendors).length, fields_dropped_em_dash: droppedFields, added_last_7_days: items.filter(v => Date.parse(v.dateAdded) >= Date.parse(run.started) - 7 * 864e5).length },
        weekly: Object.keys(weeks).sort().map(w => ({ week_starting: w, added: weeks[w] })),
        top_vendors: Object.entries(vendors).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 25).map(([vendor, n]) => ({ vendor, vulnerabilities: n })),
        vulnerabilities: items,
    }
}
