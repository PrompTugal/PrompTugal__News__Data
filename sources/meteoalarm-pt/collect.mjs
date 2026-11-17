// MeteoAlarm's CAP warning feed for Portugal (IPMA's warnings as CAP messages), one line per message. Code, no model.
// compact() is from tools/source-meteoalarm.mjs in PrompTugal__News__Storm-Charles (incident.sources@web-summit.dinis, Apache-2.0).
// MeteoAlarm's terms ask re-users to name the national service, keep the time of issue, link www.meteoalarm.org and
// publish its disclaimer: latest.json carries all four.
import { sha256, readJson, ROOT } from '../../collect/lib.mjs'
import path from 'node:path'
const FEED = 'https://feeds.meteoalarm.org/api/v1/warnings/feeds-portugal'
const DISCLAIMER = 'Time delays between this website and the www.meteoalarm.org website are possible. For the most up-to-date awareness information as published by the participating National Meteorological and Hydrological Services, please refer to www.meteoalarm.org.'
const utc = s => s ? new Date(s).toISOString().replace(/\.\d+Z$/, 'Z') : null
function compact(w) {
    const a = w.alert || {}, infos = a.info || []
    const en = infos.find(i => /^en/i.test(i.language || '')) || infos[0] || {}
    const nat = infos.find(i => !/^en/i.test(i.language || '')) || en
    const par = Object.fromEntries((en.parameter || []).map(p => [p.valueName, p.value]))
    const lvl = String(par.awareness_level || '').split(';').map(s => s.trim())
    const typ = String(par.awareness_type || '').split(';').map(s => s.trim())
    const areas = (en.area || []).map(x => ({ name: x.areaDesc, emma: (x.geocode || []).filter(g => g.valueName === 'EMMA_ID').map(g => g.value).join(',') }))
    const ref = String(a.references || '').trim().split(/\s+/).filter(Boolean).map(r => { const p = r.split(','), id = String(p[1] || '').replace('.-', '.'); return { id, sent_utc: utc(p[2]) } })
    return { id: a.identifier, sent_utc: utc(a.sent), msg_type: a.msgType, replaces: ref.length ? ref : null,
        area: areas.map(x => x.name).join('; '), emma: areas.map(x => x.emma).join(';'), level: lvl[1] || null, hazard: typ[1] || null,
        event: en.event || null, event_national: nat.event || null, onset_utc: utc(en.onset), expires_utc: utc(en.expires),
        severity: en.severity, certainty: en.certainty, urgency: en.urgency, text: en.description || null, sender: en.senderName || a.sender || null,
        h: sha256(JSON.stringify(a)).slice(0, 16) }
}
export default async function (run) {
    const r = await run.get('feeds-portugal', FEED)
    if (!r.ok) return null
    const feed = r.json(); if (!feed) return null
    const messages = (feed.warnings || []).map(compact).sort((a, b) => (a.sent_utc || '').localeCompare(b.sent_utc || '') || String(a.id).localeCompare(String(b.id)))
    const prev = readJson(path.join(ROOT, 'data', run.id, 'latest.json'))
    let changes = null
    if (prev?.messages) { const P = new Set(prev.messages.map(m => m.id)), C = new Set(messages.map(m => m.id)); changes = { since: prev.read_at, appeared: messages.filter(m => !P.has(m.id)).map(m => m.id), left: prev.messages.filter(m => !C.has(m.id)).map(m => m.id) } }
    const live = messages.filter(m => !m.expires_utc || m.expires_utc > run.started)
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ source: FEED }),
        about: 'MeteoAlarm\'s feed for Portugal as a compact table, one line per CAP message (English text where given, the national event name beside it). The national service is IPMA (Instituto Português do Mar e da Atmosfera); sent_utc is each message\'s time of issue. A dated record, not a warning service.',
        attribution: { national_service: 'IPMA, Instituto Português do Mar e da Atmosfera', meteoalarm: 'https://www.meteoalarm.org/', disclaimer: DISCLAIMER },
        sha256_prefix: r.sha256.slice(0, 16), bytes: r.bytes.length, counts: { messages: messages.length, not_expired: live.length }, changes, messages }
}
