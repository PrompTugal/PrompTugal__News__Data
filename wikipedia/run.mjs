#!/usr/bin/env node
// wikipedia/run.mjs: the Wikipedia feed (data.d@PrompTugal.dinis, 22 Nov 2026). Dinis, in data.d@'s session: "every time we run
// a schedule, we then check if the Wikipedia has changed, and then we basically map what has changed", and one shared copy for
// every agent, which also cuts our traffic to Wikimedia. Code, no model.
//   node wikipedia/run.mjs            check every tracked article; fetch and extract only those whose revision changed
//   node wikipedia/run.mjs --dry      say what would be asked, ask nothing
// Steps: (1) one request per 50 titles asks for the latest revision id, its time and the Wikidata item (pageprops); (2) for each
// article whose revision differs from data/wikipedia/index.json, one request for its wikitext (action=parse); (3) extract
// (wikipedia/extract.mjs) into data/wikipedia/articles/<slug>.json, append what changed to data/wikipedia/changes.jsonl, and keep
// the wikitext in vaults/wikipedia/ (never git).
// Wikimedia's rules (https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits, read 22 Nov 2026): an identifying User-Agent with
// a contact URL; authenticated clients are limited per user, not per address. So when WIKIMEDIA_CLIENT_ID and
// WIKIMEDIA_CLIENT_SECRET are set (an OAuth 2 client-credentials app Dinis registers; read from the environment, never printed or
// written), a 4-hour token is fetched and sent. One request at a time, at least 1.5 s apart, maxlag=5, and a 429 or maxlag answer
// stops the run (it waits for the next schedule; Retry-After is recorded).
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { extract, makeCleaner } from './extract.mjs'

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const API = 'https://en.wikipedia.org/w/api.php', TOKEN_URL = 'https://meta.wikimedia.org/w/rest.php/oauth2/access_token'
const UA = 'PrompTugalDataWikipedia/0.1 (https://data.promptugal.news/wikipedia/about/; https://github.com/PrompTugal/PrompTugal__News__Data) node'
const GAP = 1500, DRY = process.argv.includes('--dry')
const DATA = path.join(ROOT, 'data', 'wikipedia'), VAULT = path.join(ROOT, 'vaults', 'wikipedia')
const now = () => new Date().toISOString().replace(/\.\d+Z$/, 'Z'), sleep = ms => new Promise(r => setTimeout(r, ms))
const readJson = (f, d) => { try { return JSON.parse(fs.readFileSync(f, 'utf8')) } catch { return d } }
const writeJson = (f, o) => { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, JSON.stringify(o, null, 1) + '\n') }
export const slug = t => t.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

let token = null, last = 0, stopped = null
const log = []
async function getToken() {
    const id = process.env.WIKIMEDIA_CLIENT_ID, secret = process.env.WIKIMEDIA_CLIENT_SECRET
    if (!id || !secret) return null
    const r = await fetch(TOKEN_URL, { method: 'POST', headers: { 'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ grant_type: 'client_credentials', client_id: id, client_secret: secret }), signal: AbortSignal.timeout(30000) })
    log.push({ what: 'oauth2 token', status: r.status, at: now() })
    if (!r.ok) return null
    return (await r.json()).access_token || null
}
async function call(params, what) {
    if (stopped) return null
    const wait = last + GAP - Date.now(); if (wait > 0) await sleep(wait); last = Date.now()
    const url = `${API}?${new URLSearchParams({ format: 'json', formatversion: '2', maxlag: '5', ...params })}`
    const r = await fetch(url, { headers: { 'user-agent': UA, 'accept-encoding': 'gzip', ...(token ? { authorization: `Bearer ${token}` } : {}) }, signal: AbortSignal.timeout(60000) })
    const entry = { what, status: r.status, at: now(), auth: !!token }
    if (r.status === 429) { entry.retry_after = r.headers.get('retry-after'); stopped = `HTTP 429 (retry after ${entry.retry_after}s)`; log.push(entry); return null }
    const j = r.ok ? await r.json().catch(() => null) : null
    if (j?.error?.code === 'maxlag') { stopped = 'maxlag: Wikipedia\'s servers are busy'; entry.error = 'maxlag' }
    log.push(entry); return j?.error ? null : j
}

export async function main() {
    const tracked = readJson(path.join(ROOT, 'register', 'wikipedia-tracked.json'), { articles: [] }).articles
    const index = readJson(path.join(DATA, 'index.json'), { articles: {} })
    const started = now()
    if (DRY) { console.log(`would ask ${Math.ceil(tracked.length / 50)} revision request(s) for ${tracked.length} articles, then one parse per changed article`); return }
    token = await getToken()
    // (1) revisions, 50 titles a request
    const latest = new Map()
    for (let i = 0; i < tracked.length; i += 50) {
        const batch = tracked.slice(i, i + 50)
        const j = await call({ action: 'query', prop: 'revisions|pageprops|info', ppprop: 'wikibase_item', rvprop: 'ids|timestamp|size', redirects: '1', titles: batch.map(a => a.title).join('|') }, `revisions ${i / 50 + 1}`)
        if (!j) break
        const redir = new Map((j.query?.redirects || []).concat(j.query?.normalized || []).map(x => [x.to, x.from]))
        for (const p of j.query?.pages || []) { const asked = redir.get(p.title) || p.title
            latest.set(asked, p.missing ? { missing: true } : { pageid: p.pageid, title: p.title, revid: p.revisions?.[0]?.revid, timestamp: p.revisions?.[0]?.timestamp, size: p.revisions?.[0]?.size, wikidata: p.pageprops?.wikibase_item || null }) }
    }
    // (2) and (3): only changed articles
    let fetched = 0, unchanged = 0
    for (const a of tracked) {
        const cur = latest.get(a.title), prev = index.articles[a.title]
        if (!cur) continue
        if (cur.missing) { index.articles[a.title] = { ...(prev || {}), title: a.title, missing: true, checked_at: started }; continue }
        if (prev && prev.revid === cur.revid) { prev.checked_at = started; unchanged++; continue }
        const j = await call({ action: 'parse', oldid: String(cur.revid), prop: 'wikitext|displaytitle' }, `parse ${a.title}`)
        if (!j?.parse) break
        const wt = j.parse.wikitext || '', sha = crypto.createHash('sha256').update(wt).digest('hex')
        const { keep, st } = makeCleaner(), x = extract(wt, { keep }), file = `articles/${slug(cur.title)}.json`, old = prev ? readJson(path.join(DATA, prev.file || file), null) : null
        const rec = { title: cur.title, url: `https://en.wikipedia.org/wiki/${encodeURIComponent(cur.title.replace(/ /g, '_'))}`, revision: cur.revid, revision_url: `https://en.wikipedia.org/w/index.php?oldid=${cur.revid}`, revision_time: cur.timestamp,
            wikidata: cur.wikidata, wikidata_url: cur.wikidata ? `https://www.wikidata.org/wiki/${cur.wikidata}` : null, read_at: started, wikitext_sha256_prefix: sha.slice(0, 16), for: a.for,
            licence: { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/', attribution: `From the Wikipedia article "${cur.title}", revision ${cur.revid}; authors: https://en.wikipedia.org/w/index.php?title=${encodeURIComponent(cur.title.replace(/ /g, '_'))}&action=history`, changes: 'extracted into fields; markup removed; strings with an em dash or a listed hype word left out (fields_dropped_wording)' },
            counts: { sections: x.sections.length, tables: x.tables.length, table_rows: x.tables.reduce((n, t) => n + t.rows_total, 0), citations: x.citations.length, cited_hosts: x.cited_hosts.length, links: x.links.length, fields_dropped_wording: st.dropped }, ...x }
        writeJson(path.join(DATA, file), rec)
        fs.mkdirSync(path.join(VAULT, slug(cur.title)), { recursive: true }); fs.writeFileSync(path.join(VAULT, slug(cur.title), `${cur.revid}.wikitext`), wt)
        // what changed since the revision we held
        const urls = o => new Set((o?.citations || []).map(c => c.url).filter(Boolean))
        const before = urls(old), after = urls(rec)
        const change = { at: started, title: cur.title, from_revision: prev?.revid || null, to_revision: cur.revid, first_read: !prev,
            table_rows: { before: old?.counts?.table_rows ?? null, after: rec.counts.table_rows }, citations: { before: old?.counts?.citations ?? null, after: rec.counts.citations },
            cited_urls_added: [...after].filter(u => !before.has(u)).length, cited_urls_removed: [...before].filter(u => !after.has(u)).length }
        fs.mkdirSync(DATA, { recursive: true }); fs.appendFileSync(path.join(DATA, 'changes.jsonl'), JSON.stringify(change) + '\n')
        index.articles[a.title] = { title: cur.title, revid: cur.revid, revision_time: cur.timestamp, wikidata: cur.wikidata, file, checked_at: started, read_at: started, for: a.for }
        fetched++
    }
    index.about = 'The articles the Wikipedia feed holds: the revision held, when it was last checked and read, and its Wikidata item.'
    index.checked_at = started; index.stopped = stopped; index.log = log.slice(-60)
    writeJson(path.join(DATA, 'index.json'), index)
    console.log(`wikipedia: ${tracked.length} tracked, ${unchanged} unchanged, ${fetched} fetched${token ? ' (authenticated)' : ' (identified, not authenticated)'}${stopped ? `; stopped: ${stopped}` : ''}`)
}
if (import.meta.url === `file://${process.argv[1]}`) await main()
