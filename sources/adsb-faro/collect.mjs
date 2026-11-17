// Aircraft adsb.lol's community receivers saw within 40 nautical miles of Faro airport (LPFR). Code, no model.
// Privacy (the storm site's rule, tools/flights-poll.mjs in PrompTugal__News__Storm-Charles, kept by local-now.mjs):
// an airline flight keeps its callsign, airline code and type; every other aircraft is only counted. No hex ids, no positions of private aircraft.
import { num, readJson, ROOT } from '../../collect/lib.mjs'
import path from 'node:path'
const LPFR = { lat: 37.0144, lon: -7.9659, nm: 40 }
export default async function (run) {
    const src = `https://api.adsb.lol/v2/point/${LPFR.lat}/${LPFR.lon}/${LPFR.nm}`
    const j = await run.json('point-lpfr', src)
    if (!j) {   // keep the last read with its own time, marked stale, rather than nothing
        const prev = readJson(path.join(ROOT, 'data', run.id, 'latest.json'))
        return prev && prev.read_at ? { ...prev, stale: true, stale_note: `adsb.lol could not be read at ${run.started}; these values are from the last read, at read_at.` } : null
    }
    const airline = [], others = { count: 0, on_ground: 0 }
    for (const a of j.ac || []) {
        const cs = String(a.flight || '').trim()
        if (/^[A-Z]{3}\d{1,4}[A-Z]{0,2}$/.test(cs)) airline.push({ callsign: cs, airline_icao: cs.slice(0, 3), type: a.t || null, alt_ft: a.alt_baro === 'ground' ? 0 : num(a.alt_baro), on_ground: a.alt_baro === 'ground', ground_speed_kt: num(a.gs), track_deg: num(a.track) })
        else { others.count++; if (a.alt_baro === 'ground') others.on_ground++ }
    }
    airline.sort((x, y) => x.callsign.localeCompare(y.callsign))
    const byAirline = {}; for (const a of airline) byAirline[a.airline_icao] = (byAirline[a.airline_icao] || 0) + 1
    return { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ source: src, licence: 'ODbL 1.0 (adsb.lol)' }),
        about: 'What adsb.lol\'s community receivers saw within 40 nautical miles of Faro airport at the time read. Airline flights (an ICAO airline code and a flight number as callsign) by callsign; every other aircraft only counted. Coverage depends on volunteers\' receivers: absence here is not proof an aircraft was not there.',
        airport: { icao: 'LPFR', name: 'Faro airport', lat: LPFR.lat, lon: LPFR.lon, within_nm: LPFR.nm }, feed_time_ms: j.now || null,
        counts: { airline: airline.length, other_aircraft: others.count, other_on_ground: others.on_ground, by_airline: byAirline }, airline }
}
