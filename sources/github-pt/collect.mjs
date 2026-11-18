// Code from Portuguese organisations on GitHub: their public repositories and latest releases, through GitHub's official REST API. Code, no model.
// Organisations: sources/github-pt/orgs.json (each verified there as Portuguese: verified_how). Organisations only; no people.
//   GET /orgs/{org}/repos?type=public&sort=pushed   one request per organisation (first 100 repositories, newest push first)
//   GET /repos/{org}/{repo}/releases?per_page=3     only for repositories pushed in the last 90 days (not forks, not archived)
// Not collected: contributors, commit authors, emails, user profiles, organisation members, release authors, release notes, issues.
// Token: GITHUB_TOKEN from the environment, if present, sent only as a Bearer header to api.github.com; never logged, never stored.
//   A token the API rejects (401) is dropped for the rest of the run and the run goes on without it (a gap records it).
// Rate limit: the budget is read from /rate_limit (it does not count) and from X-RateLimit-Remaining on every answer; at 10 remaining
//   the run stops, records a gap, and keeps the last read of the organisations not reached (marked stale). One second between requests.
import path from 'node:path'
import { ROOT, readJson } from '../../collect/lib.mjs'
import { scanText } from '../../scripts/leak-scan.mjs'

const API = 'https://api.github.com', WEB = 'https://github.com'
const DAYS = 90, KEEP_REMAINING = 10, GAP = 1000, MAX_REPOS = 100, MAX_RELEASE_REPOS = 150, RELEASES_PER_REPO = 3
const TERMS = 'https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#h-api-terms'
const LOGIN = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/, REPO = /^[A-Za-z0-9._-]{1,100}$/
// repository text is untrusted material: plain text only (no controls, no markup kept as markup), shortened, and dropped (not altered)
// when it holds an em dash, which the site's wording gate refuses
const clean = (s, n) => {
    if (typeof s !== 'string') return null
    const t = s.replace(/[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g, ' ').replace(/\s+/g, ' ').trim()
    return t ? (t.length > n ? t.slice(0, n - 1) + '…' : t) : null
}
const iso = s => { const t = Date.parse(s); return Number.isFinite(t) ? new Date(t).toISOString().replace(/\.\d+Z$/, 'Z') : null }
const count = v => Number.isFinite(+v) && +v >= 0 ? Math.floor(+v) : null

export default async function (run) {
    const list = readJson(path.join(ROOT, 'sources/github-pt/orgs.json'), { orgs: [] }).orgs || []
    const prev = readJson(path.join(ROOT, 'data/github-pt/latest.json'), null)
    const gaps = [], dropped = { fields: 0 }
    let token = process.env.GITHUB_TOKEN || '', remaining = null, resetAt = null, stopped = false, used = 0
    const headers = () => ({ accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', ...(token ? { authorization: `Bearer ${token}` } : {}) })
    let scanDropped = 0, scanSkipped = 0
    // the leak scan's own rules decide whether a value may be published: a field it flags (a long repository name inside a link, say)
    // is dropped, never changed, and the gap says how many
    const flagged = (k, v) => typeof v === 'string' && scanText('data/github-pt/latest.json', `"${k}": ${JSON.stringify(v)},`).length > 0
    const scrub = o => { for (const k of Object.keys(o)) { if (flagged(k, o[k])) { o[k] = null; scanDropped++ } else if (o[k] && typeof o[k] === 'object' && !Array.isArray(o[k])) scrub(o[k]) } }
    const keep = (v, n) => { const c = clean(v, n); if (c && c.includes('\u2014')) { dropped.fields++; return null } return c }

    // one API read: honours the budget, drops a rejected token once, never throws
    async function api(name, url) {
        if (stopped) return null
        if (remaining !== null && remaining <= KEEP_REMAINING) { stopped = true; gaps.push({ what: 'the rest of the run', why: `stopped at ${remaining} requests remaining (limit kept: ${KEEP_REMAINING}); the quota resets at ${resetAt ? new Date(resetAt * 1000).toISOString().replace(/\.\d+Z$/, 'Z') : 'an unknown time'}`, read_at: run.started }); return null }
        let r = await run.get(name, url, { gap: GAP, timeout: 30000, tries: 2, headers: headers() })
        if (r.status === 401 && token) { token = ''; gaps.push({ what: 'GITHUB_TOKEN', why: 'the API rejected the token (401): the run went on without one, with the smaller anonymous quota', read_at: run.started }); r = await run.get(name, url, { gap: GAP, timeout: 30000, tries: 2, headers: headers() }) }
        used++
        if (r.rate_remaining !== null && r.rate_remaining !== undefined) { remaining = r.rate_remaining; resetAt = r.rate_reset }
        if (!r.ok) return { failed: r.status }   // 403 or 429 with 0 remaining: the next call sees remaining <= 10 and stops
        const j = r.json()
        return j === null ? { failed: 'not JSON' } : { json: j }
    }

    let start = await run.get('rate-limit', `${API}/rate_limit`, { gap: GAP, timeout: 30000, tries: 2, headers: headers() })
    if (start.status === 401 && token) { token = ''; gaps.push({ what: 'GITHUB_TOKEN', why: 'the API rejected the token (401): the run went on without one, with the smaller anonymous quota', read_at: run.started }); start = await run.get('rate-limit', `${API}/rate_limit`, { gap: GAP, timeout: 30000, tries: 2, headers: headers() }) }
    const rl = (start.ok ? start.json() : null)?.rate
    if (rl) { remaining = num0(rl.remaining); resetAt = num0(rl.reset) }
    const authenticated = !!token
    const licenceOf = (repo, url) => {
        const l = repo.license, id = l && typeof l.spdx_id === 'string' && /^[A-Za-z0-9.+-]{1,60}$/.test(l.spdx_id) && l.spdx_id !== 'NOASSERTION' ? l.spdx_id : null
        return id ? { name: id, url: `https://spdx.org/licenses/${id}.html` } : { name: "the repository's terms", url }
    }
    const cutoff = Date.parse(run.started) - DAYS * 864e5
    const orgs = new Map(), repoQueue = []
    for (const o of list) {
        if (!LOGIN.test(String(o.login))) { gaps.push({ what: `organisation ${String(o.login).slice(0, 40)}`, why: 'not a valid GitHub login: skipped', read_at: run.started }); continue }
        const res = await api(`repos-${o.login}`, `${API}/orgs/${o.login}/repos?type=public&sort=pushed&direction=desc&per_page=${MAX_REPOS}`)
        if (!res || res.failed) { if (res) gaps.push({ what: `repositories of ${o.login}`, why: `not read (HTTP ${res.failed}; see reads.json)`, read_at: run.started }); continue }
        if (!Array.isArray(res.json)) { gaps.push({ what: `repositories of ${o.login}`, why: 'the answer was not a list', read_at: run.started }); continue }
        const repos = []
        let forks = 0
        for (const r of res.json) {
            if (!r || !REPO.test(String(r.name))) continue
            if (r.fork) { forks++; continue }
            if (flagged('name', r.name)) { scanSkipped++; continue }   // a name the leak scan flags: the repository is left out, not renamed
            const url = `${WEB}/${o.login}/${r.name}`, lic = licenceOf(r, url)
            repos.push({ name: r.name, url, description: keep(r.description, 200), language: keep(r.language, 40), stars: count(r.stargazers_count), forks: count(r.forks_count),
                pushed_at: iso(r.pushed_at), archived: !!r.archived, licence_spdx: lic.url.startsWith('https://spdx.org/') ? lic.name : null,
                source: `${API}/orgs/${o.login}/repos`, license: lic, read_at: run.started, releases: [] })
            if (!r.archived && Date.parse(r.pushed_at) >= cutoff) repoQueue.push({ org: o.login, repo: repos[repos.length - 1] })
        }
        if (res.json.length >= MAX_REPOS) gaps.push({ what: `repositories of ${o.login}`, why: `only the ${MAX_REPOS} most recently pushed were read`, read_at: run.started })
        orgs.set(o.login, { login: o.login, name: o.name, kind: o.kind, url: `${WEB}/${o.login}`, verified_how: o.verified_how, verified_at: o.verified_at, source: `${API}/orgs/${o.login}/repos`, read_at: run.started,
            forks_skipped: forks, repos })
    }
    // releases: most recently pushed repositories first, across all organisations, until the budget or the cap says stop
    repoQueue.sort((a, b) => b.repo.pushed_at.localeCompare(a.repo.pushed_at))
    let relRead = 0
    for (const { org, repo } of repoQueue) {
        if (relRead >= MAX_RELEASE_REPOS) { gaps.push({ what: 'releases of older repositories', why: `releases were read for the ${MAX_RELEASE_REPOS} most recently pushed repositories only`, read_at: run.started }); break }
        const rname = `releases-${org}-${repo.name}`.slice(0, 120), rurl = `${API}/repos/${org}/${repo.name}/releases?per_page=${RELEASES_PER_REPO}`
        if (flagged('name', rname) || flagged('url', rurl)) { scanSkipped++; continue }   // reads.json would carry an address the leak scan flags: not requested
        const res = await api(rname, rurl)
        if (stopped) break
        relRead++
        if (!res || res.failed || !Array.isArray(res.json)) { if (res?.failed && res.failed !== 404) gaps.push({ what: `releases of ${org}/${repo.name}`, why: `not read (HTTP ${res.failed}; see reads.json)`, read_at: run.started }); continue }
        for (const x of res.json) {
            if (!x || x.draft || typeof x.tag_name !== 'string') continue
            const tag = clean(x.tag_name, 100); if (!tag || tag.includes('\u2014')) { dropped.fields++; continue }
            repo.releases.push({ tag, name: keep(x.name, 120), published_at: iso(x.published_at), prerelease: !!x.prerelease, url: `${repo.url}/releases/tag/${encodeURIComponent(tag)}`,
                source: `${API}/repos/${org}/${repo.name}/releases`, license: repo.license, read_at: run.started })
        }
        repo.releases_read = true
    }
    if (stopped && !gaps.some(g => g.what === 'the rest of the run')) gaps.push({ what: 'the rest of the run', why: 'stopped at the request limit kept', read_at: run.started })
    run.raw = []   // no response bytes to a vault: repository text is untrusted, release payloads carry user profiles; we keep the fields above only

    // organisations not reached this run keep their last read, marked stale
    let stale = 0
    for (const o of list) if (!orgs.has(o.login)) { const p = prev?.orgs?.find(x => x.login === o.login); if (p) { orgs.set(o.login, { ...p, stale: true }); stale++ } }
    if (!orgs.size) return null
    for (const o of orgs.values()) if (!o.stale) for (const r of o.repos) { scrub(r); for (const x of r.releases) scrub(x) }
    if (scanDropped || scanSkipped) gaps.push({ what: 'left out by the leak scan rules', why: `${scanDropped} field values and ${scanSkipped} repositories or release reads (long mixed-case names in addresses) match the leak scan's high-entropy rule; they are left out, not altered`, read_at: run.started })
    if (dropped.fields) gaps.push({ what: 'fields dropped', why: `${dropped.fields} repository or release text fields held an em dash, which the site's wording check refuses; they are left out, not altered`, read_at: run.started })
    const out = list.filter(o => orgs.has(o.login)).map(o => orgs.get(o.login))
    const all = out.flatMap(o => o.repos)
    return { source: run.id, title: run.card.title, read_at: run.started,
        provenance: run.prov({ source: API, terms_page: TERMS, authenticated, requests: used, rate_remaining_at_end: remaining, orgs_list: 'sources/github-pt/orgs.json' }),
        about: `Public repositories and latest releases (last ${RELEASES_PER_REPO} per repository, for repositories pushed in the last ${DAYS} days) of ${list.length} Portuguese organisations on GitHub, read through GitHub's official REST API. Each organisation was verified as Portuguese by hand (verified_how). Forks are left out. Descriptions are the repositories' own words, shortened to 200 characters, plain text, untrusted. Each item carries its own licence: the repository's licence where it declares one, otherwise a link to the repository, whose terms apply. No contributors, emails, user profiles or organisation members are collected. A signal of activity, not a ranking.`,
        counts: { orgs: out.length, orgs_stale: stale, repos: all.length, repos_with_releases: all.filter(r => r.releases.length).length, releases: all.reduce((n, r) => n + r.releases.length, 0), requests: used, authenticated },
        orgs: out, gaps }
}
function num0(v) { return Number.isFinite(+v) ? +v : null }
