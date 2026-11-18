// The collectors' shared code: a polite reader, hashes, and the three things each source writes.
// data@PrompTugal.dinis, 17 November 2026. Node 18+, no dependencies, no model.
//
// For each source <id> a run writes:
//   data/<id>/latest.json   the compact values, each with its provenance (served at /api/v1/<id>/latest.json)
//   data/<id>/reads.json    every read: time, address, HTTP status, bytes, sha256, whether the bytes changed
//   vaults/<id>/            the bytes as received, for the source's vault: latest/<file>, and a dated copy
//                           <yyyy>/<mm>/<dd>/<hh>/<file> only when the sha256 changed. Never in git (gitignored).
// Reads are polite: one request at a time, GAP_MS between requests, a named user agent with no contact
// details, three tries with a growing backoff, a 60 second timeout. A refusal (403, 429) is recorded and not retried.
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
export const SITE = 'https://data.promptugal.news'
export const UA = 'PrompTugal.news data collector (+https://data.promptugal.news/)'
export const GAP_MS = Number(process.env.COLLECT_GAP_MS || 2500)
export const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z')
export const sha256 = b => crypto.createHash('sha256').update(b).digest('hex')
export const sleep = ms => new Promise(r => setTimeout(r, ms))
export const num = v => (v === undefined || v === null || v === '' || +v === -99 || Number.isNaN(+v)) ? null : +v
export const readJson = (f, d = null) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return d } }
export const writeJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1) + '\n') }

let last = 0
const cache = new Map()   // one read per address per run: a reference list two sources share is fetched once
/** One polite GET. Returns { ok, status, bytes, sha256, at, url, json() } and never throws. */
export async function get(url, { tries = 3, timeout = 60000, shared = false, gap = GAP_MS, headers = {} } = {}) {
    if (shared && cache.has(url)) return cache.get(url)
    let res = null
    for (let i = 0; i < tries; i++) {
        const wait = last + gap - Date.now(); if (wait > 0) await sleep(wait)
        if (i) await sleep(10000 * i)
        last = Date.now()
        const at = now()
        try {
            const r = await fetch(url, { headers: { 'user-agent': UA, accept: '*/*', ...headers }, signal: AbortSignal.timeout(timeout) })
            const bytes = Buffer.from(await r.arrayBuffer())
            res = { ok: r.ok, status: r.status, bytes, sha256: sha256(bytes), at, url, rate_remaining: num(r.headers.get('x-ratelimit-remaining')), rate_reset: num(r.headers.get('x-ratelimit-reset')) }
            if (r.ok || r.status === 401 || r.status === 403 || r.status === 429 || r.status === 404) break
        } catch (e) { res = { ok: false, status: 'error', error: String(e.cause?.code || e.name || e.message), bytes: Buffer.alloc(0), sha256: null, at, url } }
    }
    res.json = () => { try { return JSON.parse(res.bytes.toString('utf8')) } catch { return null } }
    if (shared && res.ok) cache.set(url, res)
    return res
}

/** What a run of one source keeps: its reads and its raw files, then writes latest.json, reads.json and the vault copy. */
export class Run {
    constructor(id, card) { this.id = id; this.card = card; this.reads = []; this.raw = []; this.started = now() }
    async get(name, url, opts) { const r = await get(url, opts); this.reads.push({ name, url, at: r.at, status: r.status, bytes: r.bytes.length, sha256: r.sha256, ...(r.error ? { error: r.error } : {}) }); if (r.ok) this.raw.push({ name, r }); return r }
    // Files in git and on the site carry the first 16 hex of each sha256 (sha256_prefix); the full sha256 goes to the vault
    // (latest/reads-full.json). The leak scan flags any longer hex run, and its rules are not ours to loosen.
    async json(name, url, opts) { const r = await this.get(name, url, opts); return r.ok ? r.json() : null }
    prov(extra = {}) { return { source: this.card.source_home, page: this.card.reader_page, read_at: this.started, by: `sources/${this.id}/collect.mjs (code, no model; run by ${this.card.owner})`, terms: this.card.terms.summary, ...extra } }
    finish(latest, dirs = { data: path.join(ROOT, 'data'), vaults: path.join(ROOT, 'vaults') }) {
        const dataDir = path.join(dirs.data, this.id), prevReads = readJson(path.join(dataDir, 'reads.json'), null)
        const prevSha = new Map(); for (const x of (prevReads?.runs?.[0]?.reads || [])) if (x.sha256_prefix) prevSha.set(x.name, x.sha256_prefix)
        for (const x of this.reads) { x.sha256_prefix = x.sha256 ? x.sha256.slice(0, 16) : null; x.changed = x.sha256 ? (prevSha.has(x.name) ? prevSha.get(x.name) !== x.sha256_prefix : 'first read') : null }
        const full = this.reads.map(x => ({ ...x }))
        for (const x of this.reads) delete x.sha256
        const ok = this.reads.filter(x => x.status === 200).length
        const run = { at: this.started, finished: now(), ok, failed: this.reads.length - ok, reads: this.reads }
        const reads = { about: `Every run of sources/${this.id}/collect.mjs, newest first: each request's address, HTTP status, size, the first 16 hex of its sha256, and whether the bytes changed since the run before. The bytes and the full sha256 go to the source's vault (see card.json: latest/reads-full.json), never to git.`, source: this.id, runs: [run, ...(prevReads?.runs || [])].slice(0, 336) }
        if (latest) writeJson(path.join(dataDir, 'latest.json'), latest)
        else if (!fs.existsSync(path.join(dataDir, 'latest.json'))) writeJson(path.join(dataDir, 'latest.json'), { source: this.id, read_at: null, note: 'not read yet: every request of the first run failed (reads.json says why)' })
        writeJson(path.join(dataDir, 'reads.json'), reads)
        // the vault copy: latest/ always, a dated copy only when the bytes changed
        const vdir = path.join(dirs.vaults, this.id), t = this.started
        for (const { name, r } of this.raw) {
            const ext = r.ext || (/\.xml($|\?)/.test(r.url) ? 'xml' : 'json')
            const file = `${name}.${ext}`
            fs.mkdirSync(path.join(vdir, 'latest'), { recursive: true })
            fs.writeFileSync(path.join(vdir, 'latest', file), r.bytes)
            const x = this.reads.find(q => q.name === name)
            if (x && x.changed) { const d = path.join(vdir, t.slice(0, 4), t.slice(5, 7), t.slice(8, 10), t.slice(11, 13)); fs.mkdirSync(d, { recursive: true }); fs.writeFileSync(path.join(d, `${name}-${t.slice(11, 19).replace(/:/g, '')}.${ext}`), r.bytes) }
        }
        if (this.raw.length) writeJson(path.join(vdir, 'latest', 'reads-full.json'), { about: 'This run\'s requests with the full sha256 of the bytes received (the site shows the first 16 hex).', source: this.id, run: { ...run, reads: full } })
        return run
    }
}
