// Shared helpers for the site build (data.dev@PrompTugal.dinis, 17 November 2026).
// Reads the cards and the collected data; every reader tolerates a missing file.
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

export const SITE = 'https://data.promptugal.news';
export const REPO = 'https://github.com/PrompTugal/PrompTugal__News__Data';
export const ACCOUNT = 'https://promptugal.news/account/';
export const OUT = '_site';

export const readJson = p => { try { return JSON.parse(readFileSync(p, 'utf8')); } catch { return null; } };
export const write = (rel, s) => { const p = join(OUT, rel); mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, s); };
export const writeJson = (rel, o) => write(rel, JSON.stringify(o, null, 1) + '\n');

// All sources: card plus whatever was collected. storm-charles-archive keeps a committed manifest.json.
export function loadSources() {
  const ids = readdirSync('sources').filter(d => existsSync(join('sources', d, 'card.json'))).sort();
  ids.sort((a, b) => (a === 'storm-charles-archive') - (b === 'storm-charles-archive') || a.localeCompare(b));
  return ids.map(id => {
    const card = readJson(join('sources', id, 'card.json'));
    const manifest = readJson(join('sources', id, 'manifest.json'));
    const latest = readJson(join('data', id, 'latest.json')) || manifest;
    const reads = readJson(join('data', id, 'reads.json'));
    const runs = (reads && reads.runs) || [];
    const last = runs[0] || null;
    const read_at = (latest && latest.read_at) || (last && last.at) || null;
    let status = 'not read yet';
    if (last) status = last.failed > 0 ? (last.ok > 0 ? 'partly failed' : 'failed') : 'ok';
    else if (latest) status = 'archived';
    // the publisher's own bytes of the latest read (vaults/<id>/latest/, written by the collector), served as the raw layer;
    // not for adsb-faro, whose answer names private aircraft (its collector keeps none), and never reads-full.json
    const rdir = join('vaults', id, 'latest');
    const raw = existsSync(rdir) && !['events-pt', 'youtube-replays', 'cisa-kev', 'nvd-cve', 'euvd', 'enisa-pubs', 'tfl-jamcams', 'ea-flood', 'adsb-london-portugal'].includes(id) ?   // nvd-cve (about 6 MB a page, every description and reference), euvd (answers with every description and reference) and enisa-pubs (HTML): the vault keeps the bytes. cisa-kev: CISA's notes carry em dashes and long link tokens the gates refuse; its feed is linked, the vault keeps the bytes. events-pt: its raw pages are HTML and long publisher text (with em dashes the gate refuses); the vault keeps them
     readdirSync(rdir).filter(f => f.endsWith('.json') && f !== 'reads-full.json').sort().map(f => ({ name: f, data: readJson(join(rdir, f)) })).filter(r => r.data) : [];
    return { id, card, manifest, latest, reads, runs, last, read_at, status, raw, headline: headline(id, latest, manifest) };
  });
}

function headline(id, l, m) {
  if (!l) return 'not read yet';
  const c = l.counts || {};
  const f = {
    'ipma-warnings': () => `${c.active} active warnings in ${c.areas} areas`,
    'ipma-observations': () => `${c.reporting} of ${c.stations} stations reporting`,
    'ipma-city-forecasts': () => `${c.places} places`,
    'ipma-fire-risk': () => `${c.municipalities} municipalities`,
    'ipma-uv': () => `${c.places} places`,
    'ipma-sea': () => `${c.coasts} coastal places`,
    'adsb-faro': () => `${c.airline} airline flights, ${c.other_aircraft} other aircraft`,
    'adsb-london-portugal': () => `${c.london_portugal_flights} London-Portugal flights of ${c.airline_flights_seen} airline flights seen`,
    'ea-flood': () => `${c.warnings} warnings, ${c.stations} stations, ${c.rain_gauges ?? 0} rain gauges`,
    'meteoalarm-pt': () => `${c.messages} messages, ${c.not_expired} not expired`,
    'youtube-replays': () => `${c.videos} videos, ${c.chapters} chapters`,
  }[id];
  if (f) return f();
  const n = Object.entries(c).find(([, v]) => typeof v === 'number');
  if (n) return `${n[1]} ${n[0].replace(/_/g, ' ')}`;
  const arr = Object.values(l).find(v => Array.isArray(v));
  return arr ? `${arr.length} entries` : 'archived';
}

export function loadPlaces() {
  const dir = 'data/by-place/now';
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').sort().map(f => ({ id: f.slice(0, -5), data: readJson(join(dir, f)) })).filter(p => p.data);
}

// events per place (data.b@PrompTugal.dinis, 18 Nov 2026; collect/events-by-place.mjs writes data/events/by-place/)
export function loadEvents() {
  const dir = 'data/events/by-place';
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json') && f !== 'index.json').sort().map(f => ({ id: f.slice(0, -5), data: readJson(join(dir, f)) })).filter(p => p.data);
}

export function loadSocial() {
  const dir = 'data/social/by-place';
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(f => f.endsWith('.json')).sort().map(f => ({ file: f, data: readJson(join(dir, f)) })).filter(p => p.data);
}

export function dataReadAt(sources) {
  const run = readJson('data/run.json');
  if (run && run.at) return run.at;
  return sources.map(s => s.read_at).filter(Boolean).sort().pop() || null;
}

// ---- JSON Schema inference and example cutting (ported from newsroom/build/features/openapi.mjs) ----
const typeOf = v => v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
export function infer(samples, depth = 0) {
  const types = new Set(samples.map(typeOf));
  if (types.has('integer') && types.has('number')) types.delete('integer');
  const t = [...types];
  const s = { type: t.length === 1 ? t[0] : t };
  if (depth > 5) return s;
  const objs = samples.filter(v => typeOf(v) === 'object');
  if (objs.length) {
    const keys = new Map();
    for (const o of objs) for (const k of Object.keys(o)) keys.set(k, (keys.get(k) || 0) + 1);
    if (keys.size > 80) { s.additionalProperties = true; return s; }
    s.properties = {};
    for (const k of keys.keys()) s.properties[k] = infer(objs.filter(o => k in o).map(o => o[k]).slice(0, 200), depth + 1);
    const req = [...keys].filter(([, c]) => c === objs.length).map(([k]) => k);
    if (req.length) s.required = req;
  }
  const arrs = samples.filter(Array.isArray);
  if (arrs.length) { const items = arrs.flatMap(a => a.slice(0, 50)).slice(0, 300); if (items.length) s.items = infer(items, depth + 1); }
  const strs = samples.filter(v => typeof v === 'string');
  if (strs.length >= 3 && strs.every(x => /^https?:\/\//.test(x))) s.format = 'uri';
  else if (strs.length >= 3 && strs.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x))) s.format = 'date';
  return s;
}
export function cut(v, depth = 0) {
  if (Array.isArray(v)) return v.slice(0, depth > 3 ? 1 : 3).map(x => cut(x, depth + 1));
  if (v && typeof v === 'object') { const o = {}; let n = 0; for (const [k, x] of Object.entries(v)) { if (n++ > 40) { o['...'] = `${Object.keys(v).length - 40} more keys`; break; } o[k] = cut(x, depth + 1); } return o; }
  if (typeof v === 'string' && /^[0-9a-f]{48,}$/.test(v)) return v.slice(0, 16) + '...';
  if (typeof v === 'string' && v.length > 300) return v.slice(0, 300) + '...';
  return v;
}

export const fmtTime = t => t ? t.replace('T', ' ').replace(/:\d\dZ$/, ' UTC').replace(/Z$/, ' UTC') : 'not read yet';
