// Public contracts of Lisboa's and the Algarve's municipalities (as contracting entity), from IMPIC's open data of the Portal BASE.
// Code, no model. data.b.dev2@PrompTugal.dinis for data.b@, 18 November 2026 (Dinis, 18 Nov 2026 ~15:40 UTC, board/guidance/
// 2026-11-18-capture-the-weak-signals.md in PrompTugal__News__Website: "base.gov.pt public contracts (civic already reads these; one collector, shared)").
//
// Approach reused from PrompTugal__News__Civic, tools/extract-base.mjs (civic.b@PrompTugal.dinis, Apache-2.0): read IMPIC's yearly open data
// file from dados.gov.pt (it carries the Portal BASE records), stream-parse it (the unzipped file is over 600 MB), keep the contracts whose
// contracting entity's NIF is a council's, and apply the same privacy rule for contractors (see isPerson below). Differences: this reads the
// file each run through the shared polite reader, keeps only the last WINDOW_DAYS days, and writes a small latest.json.
//
// Not base.gov.pt itself: its own search answered civic with a firewall alert, which is treated as a refusal; it has no robots.txt (404).
// Request budget per run: the dataset description (1), the yearly file (1), and the previous year's file only when the window crosses New Year (1).
// If the dataset's resource has not changed since the last read (it is updated weekly), the file is not downloaded again.
import zlib from 'node:zlib'
import path from 'node:path'
import { ROOT, get, readJson, sha256 } from '../../collect/lib.mjs'

const DATASET = '66d72d488ca4b7cb2de28712'
const API = `https://dados.gov.pt/api/1/datasets/${DATASET}/`
const PAGE = 'https://dados.gov.pt/pt/datasets/' + DATASET + '/'
export const WINDOW_DAYS = 90
const SHAPE = '2'   // 2: buyer_kind and the councils' municipal companies (18 Nov 2026)
const MAX_UNZIPPED = 3 * 1024 ** 3   // zip bomb guard: stop after 3 GiB of JSON (the real file is about 0.6 GiB)
const MAX_ZIP = 400 * 1024 ** 2      // the real file is about 70 MB; a response declared larger is not downloaded (it is held in memory)
const MAX_OBJECT = 8 * 1024 ** 2     // one contract object larger than this is skipped, not parsed
const DAY = 86400000

// Council NIFs as the BASE data gives them (civic's tools/extract-base.mjs, first read 2026-11-17); Lisboa's is checked in this run's reads.
export const COUNCILS = {
    lisboa: ['500051070', 'Lisboa'], albufeira: ['503539473', 'Albufeira'], alcoutim: ['506772446', 'Alcoutim'], aljezur: ['505932512', 'Aljezur'],
    'castro-marim': ['506801969', 'Castro Marim'], faro: ['506579425', 'Faro'], lagoa: ['506804240', 'Lagoa'], lagos: ['505170876', 'Lagos'],
    loule: ['502098139', 'Loulé'], monchique: ['506826961', 'Monchique'], olhao: ['506321894', 'Olhão'], portimao: ['505309939', 'Portimão'],
    'sao-bras-de-alportel': ['503219924', 'São Brás de Alportel'], silves: ['506818837', 'Silves'], tavira: ['501067191', 'Tavira'],
    'vila-do-bispo': ['506730573', 'Vila do Bispo'], 'vila-real-de-santo-antonio': ['506833224', 'Vila Real de Santo António'] }
const BY_NIF = new Map(Object.entries(COUNCILS).map(([id, [nif]]) => [nif, id]))
// data.b@, 18 Nov 2026, at civic.b@'s request: the councils' municipal companies and services that buy in their own name
// (municipal-bodies.json, from civic's data/municipal-companies.json); their contracts carry buyer_kind and the owning council's place
import fs from 'node:fs'
const BODIES = JSON.parse(fs.readFileSync(new URL('./municipal-bodies.json', import.meta.url), 'utf8')).bodies
const BODY_BY_NIF = new Map(BODIES.map(b => [b.nif, b]))
for (const b of BODIES) if (COUNCILS[b.council]) BY_NIF.set(b.nif, b.council)

// People: a contractor whose NIF is masked ("-") or does not have nine digits, or whose NIF marks a natural person (first digit 1, 2 or 3,
// or 45, or 8 for a sole trader), keeps no name and no NIF (civic's rule, kept exactly). Companies (5), public bodies (6) and others (9) keep theirs.
export const isPerson = nif => !/^\d{9}$/.test(nif) || /^(1|2|3|45|8)/.test(nif)
// Free text can name a person or carry contact details: an e-mail address or a nine-digit number that is not a company's is a reason to drop the object.
const PERSONAL_TEXT = /[\w.+-]+@[\w-]+\.[\w.-]+|(?<!\d)(?:[123]|45|8)\d{7,8}(?!\d)/
// Text from a page we do not control: no control characters, no markup brackets, one line, cut to a length.
const clean = (s, n) => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/[<>]/g, '').replace(/\s+/g, ' ').trim().slice(0, n)
const date = s => (/^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? s : null)

/** Streams the top-level JSON array of `buf` (a zip with one deflated .json) one object at a time, without holding the whole text. */
export async function* contractsOf(zip) {
    let e = zip.length - 22; while (e >= 0 && zip.readUInt32LE(e) !== 0x06054b50) e--
    if (e < 0) throw new Error('not a zip file')
    let c = zip.readUInt32LE(e + 16), found = null
    for (let n = zip.readUInt16LE(e + 10); n > 0 && zip.readUInt32LE(c) === 0x02014b50; n--) {
        const name = zip.toString('latin1', c + 46, c + 46 + zip.readUInt16LE(c + 28))
        if (/\.json$/i.test(name) && !found) found = { method: zip.readUInt16LE(c + 10), size: zip.readUInt32LE(c + 20), at: zip.readUInt32LE(c + 42) }
        c += 46 + zip.readUInt16LE(c + 28) + zip.readUInt16LE(c + 30) + zip.readUInt16LE(c + 32)
    }
    if (!found || found.method !== 8 || found.size === 0xffffffff || found.at === 0xffffffff) throw new Error('no plain deflated .json entry in the zip')
    const h = found.at; if (zip.readUInt32LE(h) !== 0x04034b50) throw new Error('bad zip entry')
    const start = h + 30 + zip.readUInt16LE(h + 26) + zip.readUInt16LE(h + 28)
    const inflate = zlib.createInflateRaw(); inflate.end(zip.subarray(start, start + found.size))
    let depth = 0, inStr = false, esc = false, from = -1, parts = [], len = 0, total = 0
    for await (const chunk of inflate) {
        total += chunk.length; if (total > MAX_UNZIPPED) throw new Error('unzipped data over the size limit')
        for (let i = 0; i < chunk.length; i++) {
            const b = chunk[i]
            if (inStr) { if (esc) esc = false; else if (b === 92) esc = true; else if (b === 34) inStr = false; continue }
            if (b === 34) { inStr = true; continue }
            if (b === 123) { if (depth++ === 0) { from = i; parts = []; len = 0 } }
            else if (b === 125 && --depth === 0) {
                parts.push(Buffer.from(chunk.subarray(from, i + 1))); len += i + 1 - from; from = -1
                if (len <= MAX_OBJECT) { try { yield JSON.parse(Buffer.concat(parts).toString('utf8')) } catch {} }
                parts = []; len = 0
            }
        }
        if (depth > 0 && from >= 0) { parts.push(Buffer.from(chunk.subarray(from))); len += chunk.length - from; from = 0 }
    }
}

const supplier = s => {
    const nif = String(s?.nifEntContrato ?? '').trim()
    return isPerson(nif) ? { kind: 'a natural person' } : { kind: 'company', nif, name: clean(s.descEntContrato, 160), country: clean(s.codPaisEntContrato, 3) || null }
}

// the contracting entity: the council itself, or one of its municipal companies or services (buyer_kind)
function buyer(r, placeId) {
    const nifs = (r.adjudicante || r.adjudicantes || []).map(a => String(a?.nifEntContrato ?? '').trim())
    const body = nifs.map(n => BODY_BY_NIF.get(n)).find(Boolean)
    if (body) return { buyer_kind: body.kind, contracting_entity: { name: body.name, nif: body.nif, council: body.council } }
    return { buyer_kind: 'council', contracting_entity: { name: `Município de ${COUNCILS[placeId][1]}`, nif: COUNCILS[placeId][0] } }
}

/** One raw record to ours, or null. `placeId` is the council that is the contracting entity. */
export function shape(r, placeId, readAt, windowStart) {
    const id = String(r?.idcontrato ?? ''); if (!/^\d{1,12}$/.test(id)) return null
    const published = date(r.dataPublicacao); if (!published || published < windowStart) return null
    const contractors = (Array.isArray(r.adjudicatarios) ? r.adjudicatarios : []).slice(0, 20).map(supplier)
    const anyPerson = contractors.some(x => x.kind === 'a natural person')
    const text = clean(r.objectoContrato, 4000)
    const object = anyPerson || PERSONAL_TEXT.test(text) ? null : (text.length > 200 ? text.slice(0, 199).trimEnd() + '…' : text) || null   // free text may name the person: dropped, not edited
    const price = Number(r.precoContratual)
    return { id, place: placeId, object, object_withheld: object === null && !!text ? (anyPerson ? 'a contractor is a natural person' : 'the text holds an e-mail address or a personal-looking number') : null,
        ...buyer(r, placeId),
        contractors, price_eur: Number.isFinite(price) ? price : null, base_price_eur: Number.isFinite(Number(r.precoBaseProcedimento)) && Number(r.precoBaseProcedimento) > 0 ? Number(r.precoBaseProcedimento) : null,
        published, signed: date(r.dataCelebracaoContrato), decision: date(r.dataDecisaoAdjudicacao),
        procedure: clean(r.tipoprocedimento, 80) || null, contract_types: (Array.isArray(r.tipoContrato) ? r.tipoContrato : []).slice(0, 4).map(x => clean(x, 80)),
        url: `https://www.base.gov.pt/Base4/pt/detalhe/?type=contratos&id=${id}`,
        license: { name: 'Outra (Domínio Público)', url: PAGE, id: 'other-pd', holder: 'IMPIC, Instituto dos Mercados Públicos, do Imobiliário e da Construção', note: 'As dados.gov.pt publishes the dataset. Our record of it is CC BY 4.0.' },
        read_at: readAt }
}

const note = (run, name, url, r) => run.reads.push({ name, url, at: r.at, status: r.status, bytes: r.bytes.length, sha256: r.sha256, ...(r.error ? { error: r.error } : {}) })

export default async function (run) {
    const today = run.started.slice(0, 10), windowStart = new Date(+new Date(today) - WINDOW_DAYS * DAY).toISOString().slice(0, 10)
    const ds = await get(API); note(run, 'dataset', API, ds)
    const meta = ds.ok ? ds.json() : null
    if (!meta || !Array.isArray(meta.resources)) return null
    const licence = meta.license || null
    if (licence !== 'other-pd') { run.reads.push({ name: 'licence-check', url: API, at: ds.at, status: 'error', error: `dataset licence is now ${String(licence).slice(0, 40)}, not other-pd: stopped, to be read by a person` }); return null }   // the terms we read on 2026-11-18 must still hold
    const years = [...new Set([+today.slice(0, 4), +windowStart.slice(0, 4)])]
    const prev = readJson(path.join(ROOT, 'data', run.id, 'latest.json'))
    const files = [], contracts = []
    let unchanged = true
    for (const y of years) {
        const res = meta.resources.find(x => x.title === `contratos${y}.zip` && x.format === 'zip' && /^https:\/\/dados\.gov\.pt\//.test(x.url))
        if (!res) continue
        if (!(res.filesize > 0 && res.filesize <= MAX_ZIP)) { run.reads.push({ name: 'size-check', url: res.url, at: ds.at, status: 'error', error: 'file size missing or over the limit: not downloaded' }); return null }
        const was = prev?.dataset?.files?.find(f => f.year === y)
        files.push({ year: y, file: res.title, resource: res.url, resource_modified: res.last_modified || null, bytes: res.filesize || null, read_at: was && was.resource_modified === res.last_modified ? was.read_at : run.started })
        if (!was || was.resource_modified !== res.last_modified) unchanged = false
    }
    if (!files.length) return null
    let seen = 0
    const prevContracts = prev?.places ? Object.values(prev.places).flat() : null   // data.b@: the output keeps contracts by place
    if (unchanged && prevContracts && prev.shape === SHAPE) {   // a change of shape (e.g. buyer_kind) reads the file again
        // the weekly file has not changed since the last read: keep the contracts of that read that are still in the window
        for (const c of prevContracts) if (c.published >= windowStart) contracts.push(c)
    } else {
        unchanged = false   // read again: the note and records_scanned must say so
        for (const f of files) {
            const r = await get(f.resource, { timeout: 600000 }); note(run, f.file, f.resource, r)   // the file's bytes are not kept in the vault: 70 MB of other bodies' contracts
            if (!r.ok) return null
            f.sha256_prefix = r.sha256.slice(0, 16); f.read_at = r.at
            try { for await (const x of contractsOf(r.bytes)) {
                seen++
                for (const a of Array.isArray(x.adjudicante) ? x.adjudicante : []) {
                    const id = BY_NIF.get(String(a?.nifEntContrato ?? '').trim()); if (!id) continue
                    const c = shape(x, id, f.read_at, windowStart); if (c) contracts.push(c)
                    break
                }
            } } catch (e) { run.reads.push({ name: 'parse-' + f.file, url: null, at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), status: 'error', error: String(e.message).slice(0, 200) }); return null }
            r.bytes = null
        }
    }
    const byPlace = {}, seenIds = new Set()
    for (const c of contracts.sort((a, b) => b.published.localeCompare(a.published) || a.id.localeCompare(b.id))) if (!seenIds.has(c.id)) { seenIds.add(c.id); (byPlace[c.place] ||= []).push(c) }
    const sources = { name: 'Contratos Públicos - Portal Base - IMPIC (open data on dados.gov.pt)', dataset: PAGE, licence, files: files.map(({ year, file, resource, resource_modified, bytes, read_at, sha256_prefix }) => ({ year, file, resource, resource_modified, bytes, read_at, ...(sha256_prefix ? { sha256_prefix } : {}) })) }
    return { shape: SHAPE, source: run.id, title: run.card.title, read_at: run.started,
        provenance: run.prov({ source: PAGE, dataset: PAGE, terms_page: PAGE, how: `IMPIC's yearly file on dados.gov.pt (${files.map(f => f.file).join(', ')}), stream-parsed in memory, the approach of PrompTugal__News__Civic tools/extract-base.mjs` }),
        about: `Public contracts published on the Portal BASE in the last ${WINDOW_DAYS} days (from ${windowStart}) where the contracting entity is the câmara municipal of Lisboa or of one of the Algarve's 16 municipalities (Quarteira is a parish of Loulé and has no câmara of its own). From IMPIC's open data, which is updated about weekly: a contract appears here some days after it is signed. object is cut to 200 characters. A contractor that is a company keeps its name and NIF; a contractor that looks like a natural person (its NIF, or none) is shown only as "a natural person", and the contract's object text is then left out. Our record, not an official one: each contract links its page on base.gov.pt.`,
        counts: { contracts: Object.values(byPlace).reduce((n, p) => n + p.length, 0), places: Object.keys(byPlace).length, by_place: Object.fromEntries(Object.keys(COUNCILS).map(p => [p, (byPlace[p] || []).length])), records_scanned: unchanged ? null : seen, window_days: WINDOW_DAYS, objects_withheld: contracts.filter(c => c.object_withheld).length },
        ...(unchanged ? { note: 'The dataset file had not changed since the last read, so it was not downloaded again; each contract keeps the time of the read that found it.' } : {}),
        dataset: sources, places: byPlace }
}
