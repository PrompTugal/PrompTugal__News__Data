// Web Summit 2026 replays: the uploads of Web Summit's official YouTube channel since 1 November 2026, with the chapters
// read from each description's timestamp lines. Code, no model. data.b@PrompTugal.dinis, 19 Nov 2026, WS-177, for
// library.b@PrompTugal.dinis REQ-2026-0001.
//
// THE KEY: this file holds, reads and sends no key. The environment's network proxy adds the key header to requests to
// www.googleapis.com. No key= in any address. Where there is no key (GitHub Actions), the first call is refused (403) and the
// run does nothing: it keeps the last read and records "no key in this environment".
//
// THE TERMS (card.json quotes them): YouTube API data we read without a user's sign-in is "Non-Authorized Data", and
// "API Clients may temporarily store limited amounts of Non-Authorized Data ... not longer than 30 calendar days. ... after
// 30 calendar days, the API Client must either delete or refresh the stored data." So: latest.json is the only copy, refreshed
// each run; no raw bytes go to a vault (this file never leaves a raw entry on the run); reads.json keeps no list of video ids.
// If a read is ever older than 25 days when a run cannot refresh it, the videos are deleted from it.
// Not kept: descriptions, thumbnails, comments, channel statistics. Never searched (search.list costs 100 units).
import path from 'node:path'
import { ROOT, readJson, now } from '../../collect/lib.mjs'

const API = 'https://www.googleapis.com/youtube/v3'
const HANDLE = 'WebSummit', SINCE = '2026-11-01T00:00:00Z', UNIT_CAP = 200, KEEP_DAYS = 25
const HYPE = /\b(revolutionary|cutting[- ]edge|seamless(?:ly)?|world[- ]class|game[- ]changing)\b/i
const ID = /^[A-Za-z0-9_-]{11}$/
// what the library read through oEmbed (discovery/youtube/websummit-2026.json, corrections of 18 Nov 2026)
const LIBRARY_TITLES = { S9RHQGNIaFY: 'Web Summit 2026 | Day One', dJi_pXLxwno: 'Web Summit 2026 | Opening Night' }

// a value the site's gates refuse (an em dash, a few words) is dropped, never altered (data.b@, 19 Nov 2026: YouTube's
// policies ask for accurate data, and this site never changes a publisher's words); the video stays, linked, and the drop is counted
let altered = { dropped_em_dash: 0, dropped_words: 0 }
const clean = (s, n) => {
    if (typeof s !== 'string') return null
    const t = s.replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, ' ').replace(/\s+/g, ' ').trim()
    if (t.includes('\u2014')) { altered.dropped_em_dash++; return null }
    if (HYPE.test(t)) { altered.dropped_words++; return null }
    return t.slice(0, n) || null
}
const seconds = iso => { const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(String(iso || '')); return m ? (+m[1] || 0) * 86400 + (+m[2] || 0) * 3600 + (+m[3] || 0) * 60 + (+m[4] || 0) : null }
const hms = s => s === null ? null : `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`
const count = v => (v !== undefined && /^\d{1,12}$/.test(String(v))) ? +v : null
const NAME = /^\p{Lu}[\p{L}'.-]+(?: \p{Lu}[\p{L}'.-]+){1,3}$/u

/** Timestamp lines of a description: "0:00 Title", "1:02:03 - Title", "(12:30) Title". The description itself is not kept. */
export function chapters(description) {
    const out = []
    for (const line of String(description || '').split(/\r?\n/)) {
        const m = /^\s*(?:[-*•▶>]\s*)?[(\[]?((?:\d{1,2}:)?\d{1,2}:\d{2})[)\]]?\s*[-:|.–—]*\s*(.+?)\s*$/.exec(line)
        if (!m) continue
        const p = m[1].split(':').map(Number)
        if (p.slice(1).some(n => n > 59)) continue
        const sec = p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1]
        const title = clean(m[2], 120); if (!title) continue
        // speakers only where the line names them: "... with A B, C D and E F"
        let speakers = []
        const w = / with (.+)$/.exec(title)
        if (w) { const names = w[1].split(/,| and | & /).map(x => x.trim()).filter(Boolean); if (names.length && names.every(x => NAME.test(x))) speakers = names }
        out.push({ start: hms(sec), start_seconds: sec, title, speakers_as_published: speakers })
    }
    return out
}

export default async function (run, prev) {
    altered = { dropped_em_dash: 0, dropped_words: 0 }
    let units = 0
    const spent = { 'channels.list': 0, 'playlistItems.list': 0, 'videos.list': 0, 'search.list': 0 }
    // one call; the cost is counted before it is made, and the run stops at the cap. Nothing is kept as raw bytes, and the
    // address recorded in reads.json carries no video id and no page token.
    const call = async (method, name, query, cost) => {
        if (units + cost > UNIT_CAP) return { stopped: true }
        units += cost; spent[method] += cost
        // the key: in a session, the network proxy adds X-Goog-Api-Key; in GitHub Actions, the repository secret GOOGLE_API_KEY
        // (if set) is sent as that header. Never in an address, never logged (reads.json keeps the address only).
        const KEY = process.env.GOOGLE_API_KEY
        const r = await run.get(name, `${API}/${method.split('.')[0]}?${query}`, KEY ? { headers: { 'x-goog-api-key': KEY } } : undefined)
        run.raw.length = 0
        const x = run.reads[run.reads.length - 1]; if (x) x.url = `${API}/${method.split('.')[0]}?(${method}, ${cost} unit)`
        return { status: r.status, body: r.json() }
    }
    const kept = why => {   // no refresh: keep the last read, and delete it once it is too old for the terms
        if (!prev) return null
        const t = Date.parse(prev.read_at || '')
        const old = Number.isFinite(t) && Date.now() - t > KEEP_DAYS * 864e5
        const out = { ...prev, last_attempt: { at: run.started, outcome: why, units_used: units } }
        if (old) { out.videos = []; out.counts = { ...(out.counts || {}), videos: 0, with_chapters: 0, chapters: 0 }; out.deleted_because = `The last read was more than ${KEEP_DAYS} days old and could not be refreshed: the YouTube terms allow stored API data for 30 calendar days at most, so the videos were deleted.` }
        return out
    }

    // 1. the channel (1 unit)
    const ch = await call('channels.list', 'channel', `part=snippet,contentDetails&forHandle=${HANDLE}&fields=items(id,snippet(title,customUrl),contentDetails/relatedPlaylists/uploads)`, 1)
    if (ch.status === 401 || ch.status === 403) {
        const reason = ch.body?.error?.errors?.[0]?.reason || ch.body?.error?.status || 'refused'
        return kept(reason === 'quotaExceeded' ? 'quota exceeded for the day; last read kept' : 'no key in this environment; last read kept')
    }
    const c = ch.body?.items?.[0]
    if (ch.status !== 200 || !c || !/^UC[\w-]{22}$/.test(c.id) || !/^UU[\w-]{22}$/.test(c.contentDetails?.relatedPlaylists?.uploads || '')) return kept('the channel could not be resolved; last read kept')
    const channelTitle = clean(c.snippet?.title, 120), uploads = c.contentDetails.relatedPlaylists.uploads

    // 2. the uploads playlist, newest first, back to SINCE (1 unit a page of 50)
    const ids = []; let token = '', pages = 0, truncated = false
    for (;;) {
        const r = await call('playlistItems.list', 'uploads', `part=contentDetails&playlistId=${uploads}&maxResults=50${token ? `&pageToken=${encodeURIComponent(token)}` : ''}&fields=nextPageToken,items/contentDetails(videoId,videoPublishedAt)`, 1)
        if (r.stopped) { truncated = true; break }
        if (r.status !== 200 || !r.body) return kept('the uploads list could not be read; last read kept')
        pages++
        let reachedOld = false
        for (const it of r.body.items || []) {
            const d = it.contentDetails || {}, t = Date.parse(d.videoPublishedAt || '')
            if (!ID.test(d.videoId || '') || !Number.isFinite(t)) continue
            if (t < Date.parse(SINCE)) { reachedOld = true; continue }
            ids.push(d.videoId)
        }
        if (reachedOld || !r.body.nextPageToken) break
        token = r.body.nextPageToken
    }

    // 3. the videos, 50 ids a call (1 unit each)
    const videos = []
    for (let i = 0; i < ids.length; i += 50) {
        const chunk = ids.slice(i, i + 50)
        const r = await call('videos.list', 'videos', `part=snippet,contentDetails,statistics&id=${chunk.join(',')}&maxResults=50&fields=items(id,snippet(title,publishedAt,channelId,channelTitle,description),contentDetails/duration,statistics(viewCount,likeCount))`, 1)
        if (r.stopped) { truncated = true; break }
        if (r.status !== 200 || !r.body) return kept('the videos could not be read; last read kept')
        const at = now()
        for (const v of r.body.items || []) {
            if (!ID.test(v.id || '') || v.snippet?.channelId !== c.id) continue
            const secs = seconds(v.contentDetails?.duration), chs = chapters(v.snippet?.description)
            videos.push({
                id: v.id, title: clean(v.snippet?.title, 200), published_at: /^\d{4}-\d\d-\d\dT[\d:]+Z$/.test(v.snippet?.publishedAt || '') ? v.snippet.publishedAt : null,
                duration_seconds: secs, duration: hms(secs), views: count(v.statistics?.viewCount), likes: count(v.statistics?.likeCount), counts_read_at: at,
                channel_title: clean(v.snippet?.channelTitle, 120), watch_url: `https://www.youtube.com/watch?v=${v.id}`, embed_url: `https://www.youtube-nocookie.com/embed/${v.id}`,
                chapters: chs, chapters_valid_on_youtube: chs.length >= 3 && chs[0].start_seconds === 0 && chs.every((x, k) => k === 0 || x.start_seconds - chs[k - 1].start_seconds >= 10),
            })
        }
    }
    videos.sort((a, b) => String(b.published_at).localeCompare(String(a.published_at)) || a.id.localeCompare(b.id))
    if (!videos.length && prev?.videos?.length) return kept('no video came back; last read kept')

    // 4. checks: the channel is the official one if its title is "Web Summit" and the library's own leads are among its uploads
    const lead = readJson(path.join(ROOT, 'discovery', 'youtube', 'websummit-2026.json'), null)
    const leadIds = [...new Set((lead?.citations || []).concat((lead?.videos || []).map(v => v.url)).map(u => (/[?&]v=([\w-]{11})/.exec(String(u)) || [])[1]).filter(Boolean))]
    const have = new Map(videos.map(v => [v.id, v]))
    const titleChecks = Object.entries(LIBRARY_TITLES).map(([id, expected]) => ({ id, expected_title: expected, read_title: have.get(id)?.title ?? null, match: have.has(id) ? have.get(id).title === expected : null }))
    return {
        source: run.id, title: run.card.title, read_at: run.started,
        provenance: run.prov({ api: API, channel_handle: `@${HANDLE}`, quota_units_used: units, quota_units_by_method: spent, quota_cap_per_run: UNIT_CAP, quota_default_per_day: 10000, searched: false, key_in_code: false, window_from: SINCE,
            storage_rule: 'YouTube Developer Policies III.E.4.d: stored Non-Authorized Data is deleted or refreshed within 30 calendar days. This file is the only copy and is replaced each run; no raw answers or history are kept.' }),
        about: 'The uploads of Web Summit\'s official YouTube channel since 1 November 2026, as read from the YouTube Data API: title, time published, length, view and like counts (each read at the time shown), a link to YouTube and the embed address for YouTube\'s player, and chapters read from the timestamp lines of each description. The videos and their descriptions stay Web Summit\'s; only the link and the player show them. Descriptions, thumbnails and comments are not kept. Counts are YouTube\'s at the time read and are replaced on every run. Content: YouTube.',
        counts: { videos: videos.length, with_chapters: videos.filter(v => v.chapters.length).length, chapters: videos.reduce((n, v) => n + v.chapters.length, 0), pages_read: pages, truncated_by_unit_cap: truncated, fields_altered_em_dash: altered.em_dash, words_withheld: altered.withheld_words },
        channel: { id: c.id, title: channelTitle, custom_url: clean(c.snippet?.customUrl, 60), url: `https://www.youtube.com/channel/${c.id}`, official_check: { title_is_web_summit: channelTitle === 'Web Summit', library_leads: leadIds.length, library_leads_among_uploads_since_window: leadIds.filter(i => have.has(i)).length } },
        library_title_checks: titleChecks,
        delete_or_refresh_by: new Date(Date.parse(run.started) + 30 * 864e5).toISOString().replace(/\.\d+Z$/, 'Z'),
        attribution: 'Video data and players: YouTube (https://www.youtube.com/). Use of YouTube is under the YouTube Terms of Service: https://www.youtube.com/t/terms',
        videos,
    }
}
