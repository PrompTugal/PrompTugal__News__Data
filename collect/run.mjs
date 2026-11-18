#!/usr/bin/env node
// Run the collectors: every source whose card says "hourly" (or those named), one after the other, politely.
//   node collect/run.mjs                      every hourly source
//   node collect/run.mjs ipma-uv adsb-faro    only these
//   node collect/run.mjs --prev               first copy each source's latest.json and reads.json from the live site,
//                                             so a fresh checkout (CI) continues the read history
// Then derives data/by-place/now/ (collect/by-place-now.mjs) and data/events/by-place/ from events-pt's latest read (collect/events-by-place.mjs). Code only: no model is called. Exit 0 even when a source
// fails (its reads.json says why); exit 1 only when no source could be read at all.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, SITE, readJson, writeJson, now, UA } from './lib.mjs'
import { Run } from './lib.mjs'

const args = process.argv.slice(2), only = args.filter(a => !a.startsWith('--'))
const cards = fs.readdirSync(path.join(ROOT, 'sources')).filter(d => fs.existsSync(path.join(ROOT, 'sources', d, 'card.json'))).map(d => readJson(path.join(ROOT, 'sources', d, 'card.json')))
// data.b@, 18 Nov 2026: 'every 6 hours' sources (events-pt: agendas change daily) run at 00, 06, 12 and 18 UTC; their last
// read is still copied from the live site (--prev) on every run, so each build keeps them
const due = c => c.schedule?.cadence === 'hourly' || (c.schedule?.cadence === 'every 6 hours' && (process.env.GITHUB_EVENT_NAME !== 'schedule' || new Date().getUTCHours() % 6 === 0))   // and on every push
const todo = cards.filter(c => only.length ? only.includes(c.id) : due(c))
const kept = cards.filter(c => ['hourly', 'every 6 hours'].includes(c.schedule?.cadence))
if (args.includes('--prev')) for (const c of (only.length ? todo : kept)) for (const f of ['latest.json', 'reads.json']) {
    const local = path.join(ROOT, 'data', c.id, f); if (fs.existsSync(local)) continue
    try { const r = await fetch(`${SITE}/api/v1/${c.id}/${f}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(20000) }); if (r.ok) writeJson(local, await r.json()) } catch {}
}
const summary = []
for (const c of todo) {
    const mod = await import(path.join(ROOT, 'sources', c.id, 'collect.mjs'))
    const run = new Run(c.id, c)
    let latest = null
    try { latest = await mod.default(run) } catch (e) { run.reads.push({ name: 'collector', url: null, at: now(), status: 'error', error: String(e.message).slice(0, 200) }) }
    const r = run.finish(latest)
    summary.push({ id: c.id, ok: r.ok, failed: r.failed, wrote: !!latest })
    console.log(`${c.id}: ${r.ok} read, ${r.failed} failed${latest ? '' : ' (latest.json kept as it was)'}`)
}
if (todo.some(c => c.id.startsWith('ipma-') || c.id === 'adsb-faro')) await import('./by-place-now.mjs')
if (fs.existsSync(path.join(ROOT, 'data', 'events-pt', 'latest.json'))) await import('./events-by-place.mjs')   // also from the copied last read
writeJson(path.join(ROOT, 'data', 'run.json'), { at: now(), sources: summary })
if (summary.length && summary.every(s => !s.ok)) { console.error('no source could be read'); process.exit(1) }
