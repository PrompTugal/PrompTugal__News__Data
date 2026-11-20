// A dated history of London's Contracts Finder notices (civic.b@'s request, 2207d0d, relayed by conductor.b@ 20 Nov 2026
// 20:52 UTC): each read's London notices are kept in data/contracts-finder/by-day/<day published, UTC>.json, one entry per
// notice (by its OCDS id), never deleted; a later read that shows the same notice updates its fields and last_seen. A read
// marked empty_read adds nothing. Code, no model. data.b@PrompTugal.dinis.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, readJson, writeJson } from './lib.mjs'

const dir = path.join(ROOT, 'data', 'contracts-finder', 'by-day')
const L = readJson(path.join(ROOT, 'data', 'contracts-finder', 'latest.json'))
if (L && Array.isArray(L.notices) && !(L.counts && L.counts.empty_read)) {
    fs.mkdirSync(dir, { recursive: true })
    const byDay = {}
    for (const n of L.notices) { const d = String(n.published || '').slice(0, 10); if (/^\d{4}-\d{2}-\d{2}$/.test(d)) (byDay[d] ||= []).push(n) }
    for (const [day, list] of Object.entries(byDay)) {
        const f = path.join(dir, `${day}.json`)
        const cur = readJson(f) || { day, place: 'london', about: `London public bodies' notices published on Contracts Finder on ${day} (UTC), as seen by this site's reads; one entry per notice, kept for good. Only the buyer is kept, never a supplier or a contact.`, license: L.license, notices: {} }
        for (const n of list) { const key = n.ocid || n.notice; const prev = cur.notices[key]; cur.notices[key] = { ...n, first_seen: prev ? prev.first_seen : L.read_at, last_seen: L.read_at } }
        cur.license = L.license; cur.read_at = L.read_at; cur.last_read = L.read_at; cur.count = Object.keys(cur.notices).length
        writeJson(f, cur)
    }
    const days = fs.readdirSync(dir).filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f)).sort().reverse()
    writeJson(path.join(dir, 'index.json'), { about: 'Days with London notices kept, newest first. The first day may be partial: the history starts with the read of 19 Nov 2026 19:30 UTC (earlier reads replayed from git), and each read covers the 24 hours before it.', license: L.license, read_at: L.read_at, last_read: L.read_at,
        days: days.map(f => { const j = readJson(path.join(dir, f)); return { day: f.slice(0, 10), notices: j.count, url: `https://data.promptugal.news/api/v1/contracts-finder/by-day/${f}` } }) })
    console.log(`contracts-finder/by-day: ${days.length} days`)
}
