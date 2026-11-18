// Eurostat dissemination API (JSON-stat 2.0), keyless: nights spent at tourist accommodation by where the guest lives, for the
// Algarve (PT15), the Lisbon metropolitan area (PT17), Portugal (PT) and London (UKI, which Eurostat stopped updating after Brexit).
// Decision by Dinis (18 Nov 2026, about 22:40 UTC; board/team/data/briefs/2026-11-18-dinis-europe-open-data-public-service.md):
// add the EU, keyless first, as a free public service. data.b.dev2@PrompTugal.dinis for data.b@ (WS-177). Code, no model.
// Three datasets, found by asking the API for their dimensions (not from memory):
//   tour_occ_nin2   annual, regions (NUTS 2): the guest is Domestic (DOM), Foreign (FOR) or Total (TOTAL) only
//   tour_occ_ninraw annual, countries only: the guest's country of residence (UK, DE, FR, ES, NL, US, ...)
//   tour_occ_nim    monthly, countries only (the API drops regions silently): DOM, FOR, TOTAL
// So a named partner country exists for Portugal as a whole, never for a region; the card and the page say so.
const BASE = 'https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data'
const NACE = 'nace_r2=I551-I553&unit=NR'   // all accommodation (hotels, short-stay, camping); the unit is a number of nights
const CODE = /^[A-Z0-9_]{1,16}$/, TIME = /^\d{4}(-\d{2})?$/
const REGIONS = ['PT15', 'PT17', 'PT', 'UKI']
// Eurostat moved Lisbon to NUTS 2024 from 2023: PT17 (to 2022) became PT1A Grande Lisboa and PT1B Península de Setúbal (2023 on); two different areas, both kept as published
const REGIONS2 = [...REGIONS, 'PT1A', 'PT1B']
const resid = l => l.map(c => `c_resid=${c}`).join('&')
const geos = l => l.map(g => `geo=${g}`).join('&')
const SETS = [
    { id: 'tour_occ_nin2', geo: REGIONS2, q: `${geos(REGIONS2)}&${resid(['DOM', 'FOR', 'TOTAL'])}&${NACE}&lastTimePeriod=10` },
    { id: 'tour_occ_ninraw', geo: ['PT'], q: `geo=PT&${resid(['UK', 'DE', 'FR', 'ES', 'NL', 'US', 'DOM'])}&${NACE}&lastTimePeriod=10` },
    { id: 'tour_occ_nim', geo: REGIONS, q: `${geos(REGIONS)}&${resid(['DOM', 'FOR', 'TOTAL'])}&${NACE}&lastTimePeriod=36` },
]
const txt = (s, n) => typeof s === 'string' ? s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n) || null : null
// a field holding an em dash (which the site's wording check refuses) is dropped, never altered, and counted
let droppedFields = 0
const keep = (s, n) => { const t = txt(s, n); if (t && t.includes('—')) { droppedFields++; return null } return t }
const iso = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(s) ? s.slice(0, 19) : null

// JSON-stat 2.0: values sit at row-major positions over `id` and `size`; `value` is an object or an array; `status` holds flags
function decode(j, set) {
    if (!j || j.class !== 'dataset' || !Array.isArray(j.id) || !Array.isArray(j.size) || !j.dimension) return null
    const dims = j.id.map(d => { const c = j.dimension[d]?.category; return c ? { d, codes: Object.entries(c.index || {}).sort((a, b) => a[1] - b[1]).map(e => e[0]), label: c.label || {} } : null })
    if (dims.some(x => !x) || dims.some((x, i) => x.codes.length !== j.size[i])) return null
    const geoDim = dims.find(x => x.d === 'geo'), partDim = dims.find(x => x.d === 'c_resid')
    if (!geoDim || !partDim || !dims.some(x => x.d === 'time') || !dims.some(x => x.d === 'unit')) return null
    const pos = n => { const out = {}; let r = n; for (let i = dims.length - 1; i >= 0; i--) { out[dims[i].d] = dims[i].codes[r % j.size[i]]; r = Math.floor(r / j.size[i]) } return out }
    const vals = Array.isArray(j.value) ? Object.fromEntries(j.value.map((v, i) => [i, v])) : (j.value || {})
    const flags = Array.isArray(j.status) ? Object.fromEntries(j.status.map((v, i) => [i, v])) : (j.status || {})
    const rows = []
    for (const [k, v] of Object.entries(vals)) {
        const p = pos(+k), nights = typeof v === 'number' && Number.isFinite(v) ? v : null
        if (nights === null || !CODE.test(p.geo) || !CODE.test(p.c_resid) || !TIME.test(p.time) || !CODE.test(p.unit)) continue   // a failing row is dropped, never altered
        rows.push({ dataset: set.id, geo: p.geo, geo_label: keep(geoDim.label[p.geo], 80), partner: p.c_resid, partner_label: keep(partDim.label[p.c_resid], 60),
            time: p.time, nights, unit: p.unit, flag: flags[k] ? keep(String(flags[k]), 8) : null })
    }
    return { rows, updated: iso(j.updated), label: keep(j.label, 160) }
}

export default async function (run) {
    droppedFields = 0
    const rows = [], datasets = []
    for (const set of SETS) {
        const url = `${BASE}/${set.id}?format=JSON&lang=en&${set.q}`
        const d = decode(await run.json(set.id, url), set)
        if (!d) { datasets.push({ dataset: set.id, ok: false, rows: 0 }); continue }
        rows.push(...d.rows)
        datasets.push({ dataset: set.id, ok: true, title: d.label, updated: d.updated, rows: d.rows.length, api: `${BASE}/${set.id}`, page: `https://ec.europa.eu/eurostat/databrowser/view/${set.id}/default/table` })
    }
    if (!rows.length) return null
    rows.sort((a, b) => a.dataset.localeCompare(b.dataset) || a.geo.localeCompare(b.geo) || a.partner.localeCompare(b.partner) || a.time.localeCompare(b.time))
    // the first and last period with a value for each dataset and place: where a series ends is itself a finding (the UK after Brexit)
    const span = {}
    for (const r of rows) { const k = `${r.dataset}|${r.geo}`, s = span[k] || (span[k] = { dataset: r.dataset, geo: r.geo, geo_label: r.geo_label, first: r.time, last: r.time, rows: 0 }); if (r.time < s.first) s.first = r.time; if (r.time > s.last) s.last = r.time; s.rows++ }
    const gaps = []
    for (const set of SETS) for (const g of set.geo) if (!span[`${set.id}|${g}`]) gaps.push({ dataset: set.id, geo: g, why: 'Eurostat returned no value for this place in this dataset' })
    return {
        source: run.id, title: run.card.title, country: run.card.country, places: run.card.places, read_at: run.started,
        provenance: run.prov({ attribution: 'Source: Eurostat', datasets: datasets.map(x => x.dataset).join(', '), licence: 'Reuse authorised provided the source is acknowledged (European Commission Decision of 12 December 2011)' }),
        about: 'Nights spent at tourist accommodation (hotels, short-stay accommodation and camping together) by where the guest lives, for Portugal, the Algarve (PT15), the Lisbon area (PT17 to 2022; from 2023 Eurostat splits it into Grande Lisboa PT1A and Península de Setúbal PT1B) and London (UKI), as Eurostat publishes them. Regions are split only into domestic, foreign and total guests; named countries of residence (United Kingdom, Germany, France, Spain, the Netherlands, the United States) exist for Portugal as a whole. Eurostat has no UK data after Brexit, and London has values only for a few years up to 2016. Official statistics, revised by Eurostat; not a count made here.',
        counts: { rows: rows.length, by_dataset: Object.fromEntries(datasets.map(x => [x.dataset, x.rows])), requests_ok: datasets.filter(x => x.ok).length, fields_dropped_em_dash: droppedFields },
        datasets, coverage: Object.values(span), gaps, rows,
    }
}
