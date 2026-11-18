// YouTube listings and chapters through Perplexity, until Dinis gives a YouTube Data API key (Dinis, 18 Nov 2026, about
// 16:00 UTC: PrompTugal__News__Website board/guidance/2026-11-18-the-pipeline-standard-and-the-fact-checker.md, item 5; the
// library's request REQ-2026-0001). data.b@PrompTugal.dinis.
//
//   node collect/discovery-youtube.mjs [topic]        (default: websummit-2026)
//
// Asks Perplexity (sonar, through OpenRouter; OPEN_ROUTER_KEY from the environment only, never printed) for the official
// uploads of an event on YouTube and, where it can give them, each video's chapters (start time, title, speakers as
// published). Nothing is fetched from YouTube or websummit.com. The answer is untrusted text kept as evidence: every value
// is "as reported by Perplexity", with the URLs it cites; a chapter is not confirmed until read from YouTube itself (with a key).
// Same daily budget as collect/discovery.mjs (discovery/spend.json).
import path from 'node:path'
import fs from 'node:fs'
import { ROOT, readJson, writeJson } from './lib.mjs'

const MODEL = 'perplexity/sonar', BUDGET = Number(process.env.DISCOVERY_BUDGET_USD || 5)
const KEY = process.env.OPEN_ROUTER_KEY
if (!KEY) { console.error('discovery-youtube: OPEN_ROUTER_KEY is not set; nothing done'); process.exit(0) }
const TOPICS = {
  'websummit-2026': { name: 'Web Summit 2026 (Lisbon, 10 to 13 November 2026)', channel: 'the official Web Summit YouTube channel' },
}
const id = process.argv[2] || 'websummit-2026', T = TOPICS[id]
if (!T) { console.error(`discovery-youtube: unknown topic ${id}`); process.exit(1) }
const today = new Date().toISOString().slice(0, 10)
const spendFile = path.join(ROOT, 'discovery', 'spend.json')
const spend = readJson(spendFile) || { days: {} }
spend.days[today] ||= { usd: 0, calls: 0, model: MODEL }
if (spend.days[today].usd + 0.05 > BUDGET) { console.log('discovery-youtube: budget reached'); process.exit(0) }

const LONG = /[A-Za-z0-9+\/_=%-]{32,}/
const clean = u => { try { const x = new URL(u); if (!/^https?:$/.test(x.protocol)) return null; if (LONG.test(x.search.replace(/[?&]v=[\w-]{11}/, '') + x.hash)) return x.origin + x.pathname + ' (query cut)'; return x.href } catch { return null } }
const prompt = `List the official recorded talk videos (replays) of ${T.name} published on ${T.channel}. Answer ONLY with a JSON array, no prose. Each item: {"title": string, "url": "the YouTube video URL", "published": "YYYY-MM-DD" or null, "stage": string or null, "chapters": [{"start": "H:MM:SS", "title": string, "speakers": [names exactly as listed in the video's own description or chapters]}] (empty if you cannot see the chapters)}. Only videos you can cite. At most 30 items.`

const r = await fetch('https://openrouter.ai/api/v1/chat/completions', { method: 'POST', signal: AbortSignal.timeout(120000),
  headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}`, 'x-title': 'PrompTugal.news data (YouTube listings via discovery)' },
  body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: prompt }], usage: { include: true }, temperature: 0 }) })
const j = await r.json().catch(() => null)
if (!r.ok || !j) { console.error(`discovery-youtube: HTTP ${r.status}`); process.exit(0) }
const msg = j.choices?.[0]?.message || {}, text = String(msg.content || '')
const citations = [...new Set([...(j.citations || []), ...((msg.annotations || []).filter(a => a.type === 'url_citation').map(a => a.url_citation?.url))].filter(Boolean))].map(clean).filter(Boolean)
let items = []
const m = text.match(/\[[\s\S]*\]/); if (m) { try { items = JSON.parse(m[0]) } catch { items = [] } }
items = (Array.isArray(items) ? items : []).filter(x => x && typeof x === 'object' && x.title).map(x => ({
  title: String(x.title).slice(0, 200), url: clean(x.url), published: /^\d{4}-\d{2}-\d{2}$/.test(x.published || '') ? x.published : null, stage: x.stage ? String(x.stage).slice(0, 80) : null,
  chapters: (Array.isArray(x.chapters) ? x.chapters : []).filter(c => c && /^\d{1,2}:\d{2}(:\d{2})?$/.test(String(c.start || ''))).slice(0, 60).map(c => ({ start: String(c.start), title: String(c.title || '').slice(0, 200), speakers: (Array.isArray(c.speakers) ? c.speakers : []).map(s => String(s).slice(0, 80)).slice(0, 8) })),
  status: 'as reported by Perplexity, not read from YouTube',
})).filter(x => x.url && /^https:\/\/(www\.)?(youtube\.com|youtu\.be)\//.test(x.url))
const cost = Number(j.usage?.cost ?? 0)
spend.days[today].usd += cost; spend.days[today].calls++
writeJson(spendFile, spend)
writeJson(path.join(ROOT, 'discovery', 'youtube', `${id}.json`), {
  topic: id, name: T.name, asked_at: new Date().toISOString().replace(/\.\d+Z$/, 'Z'), model: j.model || MODEL, via: 'OpenRouter', cost_usd: cost,
  by: 'collect/discovery-youtube.mjs (data.b@PrompTugal.dinis)', for: 'library.b@PrompTugal.dinis REQ-2026-0001',
  about: 'Official replay videos of the event on YouTube, with chapters where Perplexity could give them, AS REPORTED BY PERPLEXITY: untrusted, not read from YouTube (no YouTube key yet). Each video URL is a YouTube link; a chapter is a lead to confirm with the YouTube Data API once Dinis gives a key. Speakers are named as published in the videos, people speaking in public.',
  prompt, counts: { videos: items.length, with_chapters: items.filter(x => x.chapters.length).length }, videos: items, citations,
})
console.log(`discovery-youtube ${id}: ${items.length} videos (${items.filter(x => x.chapters.length).length} with chapters), ${citations.length} citations, ${cost.toFixed(4)} USD`)
