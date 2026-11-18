// Social signals: recent public posts of ORGANISATIONS' official accounts on Bluesky and Mastodon, kept as links plus metadata. Code, no model.
// Accounts: register/social-accounts.json (organisations only; each verified as official there).
//   Bluesky   public AppView, no login: app.bsky.feed.getAuthorFeed per account, and app.bsky.feed.searchPosts for a few topics
//             (kept only when the author is a listed account)
//   Mastodon  public instance API, without credentials: /api/v1/accounts/lookup then /api/v1/accounts/:id/statuses (exclude_replies)
// The post text is read in memory only, to match topics and places. It is NOT stored: not in latest.json, and run.raw is emptied
// so no response bytes go to the vault. What is kept per post: the link, the account, the time, the matches, the language, whether it has media.
import path from 'node:path'
import { ROOT, readJson } from '../../collect/lib.mjs'

const DAYS = 30, PER_ACCOUNT = 30, SEARCH_LIMIT = 25
const BSKY = 'https://public.api.bsky.app/xrpc'
const BSKY_TERMS = 'https://bsky.social/about/support/tos'
const QUERIES = ['"Web Summit"', 'Lisboa', 'Algarve', 'startup Portugal', 'IA Portugal']
const norm = s => String(s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const plain = h => String(h ?? '').replace(/<br\s*\/?>|<\/p>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&(amp|lt|gt|quot|#39);/g, ' ')

const TOPICS = {
    'web-summit': /\bweb ?summit\b/, startups: /\bstart-?ups?\b|\bscale-?ups?\b|\bunicorn/, ai: /\bia\b|\bai\b|inteligencia artificial|artificial intelligence|\bllm\b/,
    security: /ciberseguranca|cybersecurity|cyber security|seguranca informatica|ciberataque|cyberattack/,
    events: /\bevento|\bfestival|\bconcerto|\bagenda\b|\bevents?\b|\bexposicao/, weather: /\baviso|\bipma\b|meteorolog|\bchuva|\btempestade|\bstorm|\bweather|\bondas?\b|\bvento\b/,
    tourism: /turismo|tourism|\bvisit\b|\bviagem|\btravel/, mobility: /\bcomboio|\bmetro\b|\bcarris\b|\baeroporto|\bairport|\btransportes?\b/
}
const MAP = readJson(path.join(ROOT, 'collect/by-place-map.json'), [])
const PLACES = { lisboa: /\blisboa\b|\blisbon\b/, algarve: /\balgarve\b/ }
for (const m of MAP) PLACES[m.place] = new RegExp('\\b' + m.place.replace(/-/g, ' ').replace('vila real de santo antonio', '(vila real de santo antonio|vrsa)') + '\\b')
// data.b@, 18 Nov 2026: names shared with places abroad (Lagos in Nigeria, Lagoa, Faro in the Faroes) count only when the
// post also names the Algarve or Portugal
const AMBIGUOUS = new Set(['lagos', 'lagoa', 'faro', 'silves', 'tavira', 'albufeira', 'olhao', 'loule', 'portimao', 'quarteira', 'monchique', 'aljezur', 'alcoutim', 'castro-marim', 'vila-do-bispo', 'sao-bras-de-alportel', 'vila-real-de-santo-antonio'])
const CONTEXT = /\balgarve\b|\bportugal\b/
const match = (rx, t) => Object.keys(rx).filter(k => rx[k].test(t) && (rx !== PLACES || !AMBIGUOUS.has(k) || CONTEXT.test(t)))

const bskyUrl = (handle, uri) => `https://bsky.app/profile/${handle}/post/${String(uri).split('/').pop()}`
const hasBskyMedia = e => !!e && /images|video|external/.test(String(e.$type || '') + String(e.media?.$type || ''))

export default async function (run) {
    const reg = readJson(path.join(ROOT, 'register/social-accounts.json'), { accounts: [] })
    const accounts = reg.accounts || [], gaps = [], posts = new Map()
    const cutoff = Date.parse(run.started) - DAYS * 864e5
    const byBsky = new Map(accounts.filter(a => a.platform === 'bluesky').map(a => [a.handle.toLowerCase(), a]))
    const licence = (a, host) => ({ name: "the platform's terms", url: a.platform === 'bluesky' ? BSKY_TERMS : `https://${host}/terms-of-service`, holder: a.organisation })
    const add = (a, p, text, host) => {
        if (!p.posted_at || Date.parse(p.posted_at) < cutoff || posts.has(p.url)) return
        const t = norm(plain(text))
        posts.set(p.url, { platform: a.platform, url: p.url, account: a.handle, organisation: a.organisation, kind: a.kind, posted_at: p.posted_at,
            topics: match(TOPICS, t), places: match(PLACES, t), lang: p.lang || null, has_media: !!p.has_media, source: p.source, license: licence(a, host), read_at: run.started })
    }

    // Bluesky: each account's own feed (posts, no replies; reposts of others are skipped)
    for (const a of accounts.filter(x => x.platform === 'bluesky')) {
        const j = await run.json(`bsky-feed-${a.id}`, `${BSKY}/app.bsky.feed.getAuthorFeed?actor=${encodeURIComponent(a.handle)}&filter=posts_no_replies&limit=${PER_ACCOUNT}`)
        if (!j) { gaps.push({ what: `Bluesky feed of ${a.handle}`, why: 'not read (see reads.json)', read_at: run.started }); continue }
        for (const it of j.feed || []) {
            const p = it.post; if (it.reason || !p || p.author?.handle?.toLowerCase() !== a.handle.toLowerCase()) continue
            add(a, { url: bskyUrl(a.handle, p.uri), posted_at: p.record?.createdAt || p.indexedAt, lang: p.record?.langs?.[0], has_media: hasBskyMedia(p.embed), source: 'author feed' }, p.record?.text, 'bsky')
        }
    }
    // Bluesky: keyword pass, kept only when the author is a listed organisation
    for (const q of QUERIES) {
        const j = byBsky.size ? await run.json(`bsky-search-${norm(q).replace(/[^a-z]+/g, '-').replace(/^-|-$/g, '')}`, `${BSKY}/app.bsky.feed.searchPosts?q=${encodeURIComponent(q)}&sort=latest&limit=${SEARCH_LIMIT}`) : null
        if (!j) { gaps.push({ what: `Bluesky keyword search "${q}"`, why: 'not read: the public search was refused or failed (see reads.json); the author feeds above still cover the listed accounts', read_at: run.started }); continue }
        for (const p of j.posts || []) {
            const a = byBsky.get(String(p.author?.handle).toLowerCase()); if (!a) continue
            add(a, { url: bskyUrl(a.handle, p.uri), posted_at: p.record?.createdAt || p.indexedAt, lang: p.record?.langs?.[0], has_media: hasBskyMedia(p.embed), source: `keyword "${q}"` }, p.record?.text, 'bsky')
        }
    }
    // Mastodon: lookup, then statuses
    for (const a of accounts.filter(x => x.platform === 'mastodon')) {
        const [user, host] = a.handle.replace(/^@/, '').split('@')
        const acc = await run.json(`masto-lookup-${a.id}`, `https://${host}/api/v1/accounts/lookup?acct=${encodeURIComponent(user)}`)
        if (!acc?.id) { gaps.push({ what: `Mastodon account ${a.handle}`, why: 'lookup failed (see reads.json)', read_at: run.started }); continue }
        const st = await run.json(`masto-statuses-${a.id}`, `https://${host}/api/v1/accounts/${acc.id}/statuses?exclude_replies=true&exclude_reblogs=true&limit=${PER_ACCOUNT}`)
        if (!Array.isArray(st)) { gaps.push({ what: `Mastodon statuses of ${a.handle}`, why: 'not read (see reads.json)', read_at: run.started }); continue }
        for (const s of st) if (String(s.url).startsWith(`https://${host}/`)) add(a, { url: s.url, posted_at: s.created_at, lang: s.language, has_media: (s.media_attachments || []).length > 0, source: 'account statuses' }, `${s.spoiler_text || ''} ${s.content || ''}`, host)
    }
    if (!accounts.some(a => a.platform === 'mastodon')) gaps.push({ what: 'Mastodon', why: 'no organisation account could be verified yet (register/social-accounts.json notes); the collector reads Mastodon as soon as one is listed', read_at: run.started })
    run.raw = []   // no response bytes to the vault: we keep links and metadata only

    const list = [...posts.values()].sort((x, y) => y.posted_at.localeCompare(x.posted_at))
    const count = f => list.filter(f).length
    return { source: run.id, title: run.card.title, read_at: run.started,
        provenance: run.prov({ sources: [
            { platform: 'bluesky', api: BSKY, terms: BSKY_TERMS, note: 'public AppView, no login' },
            { platform: 'mastodon', api: 'https://<instance>/api/v1/', terms: 'https://<instance>/terms-of-service', note: 'public endpoints, without credentials' }], accounts: 'register/social-accounts.json' }),
        about: `Links to recent public posts (last ${DAYS} days) by the official accounts of organisations (câmaras, public bodies, venues, organisers, news outlets, companies) listed in register/social-accounts.json. Each record is the post's public web address plus metadata: who, when, which topics and places its text matched, language, whether it has media. The post text and media are not stored: open the link, or use the platform's own embed, to see the post. Every post stays its author's content under the platform's terms; show it by link, credited to the organisation. A signal to check, not a verified fact. Never a private person's account.`,
        counts: { posts: list.length, accounts: accounts.length, by_platform: { bluesky: count(p => p.platform === 'bluesky'), mastodon: count(p => p.platform === 'mastodon') }, with_topic: count(p => p.topics.length), with_place: count(p => p.places.length) },
        posts: list, gaps }
}
