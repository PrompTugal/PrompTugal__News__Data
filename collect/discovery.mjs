// Events discovery per place, phase 1 ("look"): one question a day per place to Perplexity (sonar) through OpenRouter.
// At Dinis's word, 18 November 2026, about 14:15 UTC (PrompTugal__News__Website board/guidance/2026-11-18-events-in-two-phases.md;
// plan board/briefs/2026-11-18-events-discovery-and-the-graph.md). data.b@PrompTugal.dinis.
//
//   node collect/discovery.mjs [place ...]        (default: every place in collect/by-place-map.json, plus lisboa)
//
// The key is read from OPEN_ROUTER_KEY in the environment only: never printed, logged or written. A daily budget
// (DISCOVERY_BUDGET_USD, default 5, Dinis's ceiling until he sets one) is kept in discovery/spend.json; the run stops
// before a call that could pass it. Each answer is stored with its model, time, prompt, every cited URL and its cost in
// discovery/by-place/<place>/<date>.json. Nothing from an answer is published as content: it is evidence, and each event
// it names becomes a claim (collect/claims.mjs) whose details come only from sources the register marks readable.
// This script reads Perplexity's answer only; it fetches nothing from the hosts it cites.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, readJson, writeJson } from './lib.mjs'

const MODEL = 'perplexity/sonar'
const BUDGET = Number(process.env.DISCOVERY_BUDGET_USD || 5)
const KEY = process.env.OPEN_ROUTER_KEY
if (!KEY) { console.error('discovery: OPEN_ROUTER_KEY is not set; nothing done'); process.exit(0) }

const NAMES = { lisboa: 'Lisboa', algarve: 'the Algarve', loule: 'Loulé', olhao: 'Olhão', portimao: 'Portimão', 'sao-bras-de-alportel': 'São Brás de Alportel', 'vila-real-de-santo-antonio': 'Vila Real de Santo António' }
const map = readJson(path.join(ROOT, 'collect', 'by-place-map.json')) || []
const fromMap = (Array.isArray(map) ? map.map(x => x.place) : Object.keys(map)).filter(k => /^[a-z-]+$/.test(k || ''))
const nameOf = id => NAMES[id] || id.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
const args = process.argv.slice(2)
const places = args.length ? args : ['lisboa', ...fromMap.filter(p => p !== 'lisboa')]

const today = new Date().toISOString().slice(0, 10)
const spendFile = path.join(ROOT, 'discovery', 'spend.json')
const spend = readJson(spendFile) || { about: 'OpenRouter spend on events discovery, per UTC day (USD, as OpenRouter reports it).', days: {} }
spend.days[today] ||= { usd: 0, calls: 0, model: MODEL }

const prompt = (place) => `List public events (concerts, exhibitions, festivals, fairs, talks, sports, markets, theatre) taking place in ${nameOf(place)}, Portugal, between ${today} and the next 30 days. Answer ONLY with a JSON array, no prose. Each item: {"name": string, "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD" or null, "venue": string or null, "municipality": string, "organiser": organisation name or null (never a private person), "urls": [the source URLs for this event]}. Include only events you can support with a source URL. At most 25 items.`

async function ask(place) {
  const body = { model: MODEL, messages: [{ role: 'user', content: prompt(place) }], usage: { include: true }, temperature: 0 }
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST', signal: AbortSignal.timeout(90000),
    headers: { 'content-type': 'application/json', authorization: `Bearer ${KEY}`, 'x-title': 'PrompTugal.news data (events discovery)' },
    body: JSON.stringify(body),
  })
  const j = await r.json().catch(() => null)
  if (!r.ok || !j) return { ok: false, status: r.status, error: (j && j.error && String(j.error.message || '').slice(0, 200)) || `HTTP ${r.status}` }
  const msg = j.choices?.[0]?.message || {}
  const citations = [...new Set([...(j.citations || []), ...((msg.annotations || []).filter(a => a.type === 'url_citation').map(a => a.url_citation?.url))].filter(Boolean))]
  let items = null
  const text = String(msg.content || '')
  const m = text.match(/\[[\s\S]*\]/)
  if (m) { try { items = JSON.parse(m[0]) } catch { items = null } }
  return { ok: true, model: j.model || MODEL, text, items, citations, usage: j.usage || null, cost_usd: Number(j.usage?.cost ?? 0) }
}

// a cited URL with a long encoded query (a token-like run of 32+ characters) keeps its host and path only: the leak scan
// refuses such runs, and the query adds nothing as evidence of where the event is listed
const LONG = /[A-Za-z0-9+\/_=%-]{32,}/
const clean = u => { try { const x = new URL(u); if (!/^https?:$/.test(x.protocol)) return '(not an http link)'; if (LONG.test(x.search + x.hash)) return x.origin + x.pathname + ' (query cut)'; return u } catch { return String(u).slice(0, 300) } }

let calls = 0, cost = 0
for (const place of places) {
  if (spend.days[today].usd + 0.05 > BUDGET) { console.log(`discovery: budget of ${BUDGET} USD for ${today} reached; stopping`); break }
  const out = path.join(ROOT, 'discovery', 'by-place', place, `${today}.json`)
  if (fs.existsSync(out)) { console.log(`${place}: already asked today`); continue }
  const at = new Date().toISOString().replace(/\.\d+Z$/, 'Z')
  const a = await ask(place)
  calls++
  if (a.ok) { spend.days[today].usd += a.cost_usd; spend.days[today].calls++; cost += a.cost_usd }
  writeJson(out, {
    place, asked_at: at, model: a.model || MODEL, via: 'OpenRouter', by: 'collect/discovery.mjs (data.b@PrompTugal.dinis)',
    about: 'Phase 1 evidence: what Perplexity answered about events in this place, with every URL it cited. Not published as content; each event becomes a claim whose details come only from readable sources.',
    prompt: prompt(place), ok: a.ok, ...(a.ok ? { items: (Array.isArray(a.items) ? a.items : []).filter(i => i && typeof i === 'object').map(i => ({ ...i, urls: (Array.isArray(i.urls) ? i.urls : []).map(clean) })), citations: a.citations.map(clean), answer_text: a.text, usage: a.usage, cost_usd: a.cost_usd } : { error: a.error, status: a.status }),
  })
  console.log(`${place}: ${a.ok ? `${(a.items || []).length} items, ${a.citations.length} citations, ${a.cost_usd.toFixed(4)} USD` : `failed (${a.error})`}`)
  await new Promise(r => setTimeout(r, 1500))
}
writeJson(spendFile, spend)
console.log(`discovery: ${calls} calls, model ${MODEL}, ${cost.toFixed(4)} USD this run; ${spend.days[today].usd.toFixed(4)} USD today of ${BUDGET}`)
