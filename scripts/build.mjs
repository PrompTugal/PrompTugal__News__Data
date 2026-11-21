// Build: copy src/ to _site/, write the API and the pages from the cards and the collected data,
// stamp the version, write version.json. Works when data/ is missing for some or all sources.
// SITE_VERSION is set by CI only (v0.1.N); a local build says "dev".
import { cpSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadSources, loadPlaces, loadEvents, loadSocial, dataReadAt, write, writeJson, OUT } from './build/lib.mjs';
import { buildApi, buildStormApi, readme } from './build/api.mjs';
import { loadStorm } from './build/storm.mjs';
import { buildRegister } from './build/register.mjs';
import { buildDiscovery } from './build/discovery.mjs';
import { stampLicences, commercialTable } from './build/licence.mjs';
import { buildCameras } from './build/cameras.mjs';
import { buildPreview } from './build/preview.mjs';
import { buildHistory, buildEventsHistory } from './build/history.mjs';
import { sitesBar, REGISTRY_READ } from './build/sitesbar.mjs';
import { injectObsTz } from './build/obstz.mjs';
import { placePtmap } from './build/ptmap.mjs';
import { setSitesBar } from './build/render.mjs';
import { buildAttribution } from './build/attribution.mjs';
import { buildPages } from './build/pages.mjs';
import { streamingData, writeStreaming } from './build/streaming.mjs';
import { page as renderPage } from './build/render.mjs';
const version = process.env.SITE_VERSION || 'dev';
const builtAt = new Date().toISOString();
rmSync(OUT, { recursive: true, force: true });
cpSync('src', OUT, { recursive: true });

const bar = await sitesBar(); setSitesBar(bar.html);
// pieces pinned by the sites registry: when one is off, it is left out of the site and named in the log and in version.json
// (security@'s ruling, 19 Nov 2026 05:09 UTC: "<piece> <version> off: the registry names <newer>")
const OFF = [];
if (bar.off) { OFF.push(bar.off); rmSync(join(OUT, 'assets/sites-bar'), { recursive: true, force: true }); console.log(bar.off); }
{ const t = injectObsTz(OUT, REGISTRY_READ); if (t.off) { OFF.push(t.off); console.log(t.off) } else console.log(t.ok) }
console.log(`sites bar: ${bar.html ? 'rendered' : 'left out'} (${bar.from || bar.off})`);
const sources = loadSources();
const places = loadPlaces();
const readAt = dataReadAt(sources);
const missing = sources.filter(s => !s.latest).map(s => s.id);
if (missing.length) console.warn(`warning: no latest.json for ${missing.join(', ')} (shown as "not read yet")`);
const storm = loadStorm(sources);
const events = loadEvents();
const cameras = buildCameras(sources);   // /api/v1/cameras/ for live.promptugal.news (live.b@ asked, 18 Nov 2026)
const { index } = buildApi({ sources, places, version: '__VERSION__', builtAt, readAt, storm, events, cameras });
buildStormApi({ storm, version: '__VERSION__' });
write('api/v1/README.md', readme());
if (existsSync('data/contracts-finder/by-day')) for (const f of readdirSync('data/contracts-finder/by-day').filter(f => f.endsWith('.json'))) writeJson(`api/v1/contracts-finder/by-day/${f}`, JSON.parse(readFileSync(`data/contracts-finder/by-day/${f}`, 'utf8')));   // London notices kept by day (civic.b@, 20 Nov 2026)
for (const f of loadSocial()) writeJson(`api/v1/social/by-place/${f.file}`, f.data);   // social signals per place (Dinis, 18 Nov 2026 ~14:45 UTC)
// folder indexes, so /api/v1/events/ and /api/v1/social/ answer (signals.b@ saw a 404/503 on the folder, 18 Nov)
writeJson('api/v1/events/index.json', { about: 'Events: read from official agendas (by-place), found through Perplexity (claims), and past ones.', by_place: '/api/v1/events/by-place/index.json', claims: '/api/v1/events/claims/by-place/index.json', past: '/api/v1/events/past/<place>.json (appears when a claim\'s date passes)', openapi: '/api/v1/openapi.json' });
writeJson('api/v1/social/index.json', { about: 'Social signals: organisations\' public posts as links and metadata, never the text.', latest: '/api/v1/social/latest.json', by_place: '/api/v1/social/by-place/<place>.json', accounts: 'register/social-accounts.json in the repository', card: '/api/v1/social/card.json' });
const register = buildRegister(sources);
const discovery = buildDiscovery();
buildPreview({ sources, builtAt });
buildHistory(sources); buildEventsHistory(sources);   // /api/v1/history/ (Dinis, 19 Nov 2026 ~01:17 UTC: show the past)
// (no last.txt fallback since 1.1.1: an unchecked bar is never published)   // /preview.svg for the sites bar (Dinis, 18 Nov 2026 ~22:00 UTC)
buildAttribution({ sources, events, discovery });   // the attribution ledger for the simulated payouts (Dinis, 18 Nov 2026)
const pages = buildPages({ sources, places, readAt, index, storm, events, register, discovery });
// /streaming/ (Dinis, 21 Nov 2026: TMDB, display only): fetched at build time with TMDB_READ_TOKEN, HTML only, nothing kept
{ const sd = await streamingData(); writeStreaming(renderPage, sd); console.log(sd.ok ? `streaming: ${sd.lists.length} lists from TMDB` : `streaming: off (${sd.why})`); }

writeJson('api/v1/sources/commercial.json', commercialTable(sources));   // which data a paid site may use (Dinis, 18 Nov 2026 ~23:10 UTC)
const licensed = stampLicences(OUT);
// data in the browser (Dinis, 19 Nov 2026 ~01:13 UTC, PrompTugal__News__Website board/guidance/2026-11-19-load-the-data-in-the-browser.md):
// every latest file at a stable URL carries data_read_at, its expected cadence (so a page can mark it stale) and its schema
const CADENCE_S = { hourly: 3600, 'every 6 hours': 21600, daily: 86400 };
// Dinis, 19 Nov 2026 ~16:30 UTC (PrompTugal__News__Website board/guidance/2026-11-19-twice-a-day.md): data.b@'s wake runs twice a
// day (07:03 and 18:03 Lisbon), so an hourly or 6-hourly source is in fact read twice a day. expected_cadence states that, with
// stale_after_seconds of 13 hours as the guidance asks; collected_as keeps the source's own cadence from its card.
const SERVED = c => c === 'daily' ? { name: 'daily', seconds: 86400, stale_after_seconds: 93600 } : { name: 'twice a day', seconds: 43200, stale_after_seconds: 46800 };
const meta = (rel, read, cadence, schema) => { const f = join(OUT, rel); let o; try { o = JSON.parse(readFileSync(f, 'utf8')); } catch { return; }
  const out = { data_read_at: read || o.read_at || o.provenance?.read_at || null, expected_cadence: cadence ? { ...SERVED(cadence), collected_as: cadence, why: cadence === 'daily' ? 'read or asked once a day, at one of data.b@\'s two wakes (07:03 and 18:03 Lisbon)' : 'data.b@ collects twice a day (07:03 and 18:03 Lisbon) since 19 Nov 2026' } : null, schema, ...o };
  writeFileSync(f, JSON.stringify(out, null, 1) + '\n'); };
for (const s of sources) meta(`api/v1/${s.id}/latest.json`, s.latest?.read_at || s.latest?.provenance?.read_at, s.card.schedule?.cadence, { openapi: `https://data.promptugal.news/api/v1/${s.id}/openapi.json`, path: `/api/v1/${s.id}/latest.json`, version: 'v1' });
for (const f of readdirSync(join(OUT, 'api/v1/by-place/now')).filter(f => f.endsWith('.json') && f !== 'index.json')) meta(`api/v1/by-place/now/${f}`, null, 'hourly', { openapi: 'https://data.promptugal.news/api/v1/openapi.json', path: `/api/v1/by-place/now/${f}`, version: 'v1' });
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
// events.b@'s finding (fde585a): the derived files carry the cadence too: events, claims, history, social and cameras per place
// are rebuilt at every wake (twice a day); discovery answers are asked once a day per place
for (const [dir, cad] of [['api/v1/events/by-place', 'hourly'], ['api/v1/contracts-finder/by-day', 'hourly'], ['api/v1/events/claims', 'hourly'], ['api/v1/events/past', 'hourly'], ['api/v1/history/events', 'hourly'], ['api/v1/history/weather', 'hourly'], ['api/v1/history', 'hourly'], ['api/v1/cameras/history', 'hourly'], ['api/v1/social/by-place', 'hourly'], ['api/v1/discovery/by-place', 'daily']])
  if (existsSync(join(OUT, dir))) for (const f of walk(join(OUT, dir)).filter(f => f.endsWith('.json'))) { if (dir === 'api/v1/history' && f.slice(join(OUT, dir).length + 1).includes('/')) continue; meta(f.slice(OUT.length + 1), null, cad, { openapi: 'https://data.promptugal.news/api/v1/openapi.json', path: '/' + f.slice(OUT.length + 1), version: 'v1' }) }
meta('api/v1/cameras/index.json', null, 'hourly', { openapi: 'https://data.promptugal.news/api/v1/openapi.json', path: '/api/v1/cameras/index.json', version: 'v1' });   // every JSON item carries its licence (Dinis, 18 Nov 2026)
// the shared map, once every page is written (it fills the <!--PTMAP--> marker; placed earlier it found no page)
{ const P = Object.values(JSON.parse(readFileSync('register/places.json', 'utf8')).places || {}); const t = placePtmap(OUT, REGISTRY_READ, P); if (t.off) { OFF.push(t.off); console.log(t.off) } else console.log(t.ok) }   // the shared map (Dinis, 19 Nov 2026 ~17:40 UTC)   // sites bar 1.1.0 (Dinis, 18 Nov 2026)
for (const f of walk(OUT)) {
  if (f.includes('/vendor/') || !/\.(html|js|css|json|md|txt|xml)$/.test(f)) continue;
  const s = readFileSync(f, 'utf8');
  if (s.includes('__VERSION__')) writeFileSync(f, s.replaceAll('__VERSION__', version));
}
writeFileSync(join(OUT, 'version.json'), JSON.stringify({ version, commit: process.env.GITHUB_SHA || 'local', built: builtAt, ...(OFF.length ? { off: OFF } : {}) }, null, 2) + '\n');
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`built _site/ (${version}): ${pages.length} pages, ${sources.length} sources, ${places.length} places, ${licensed} JSON files with a licence`);
