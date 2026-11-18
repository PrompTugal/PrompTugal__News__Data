// Build: copy src/ to _site/, write the API and the pages from the cards and the collected data,
// stamp the version, write version.json. Works when data/ is missing for some or all sources.
// SITE_VERSION is set by CI only (v0.1.N); a local build says "dev".
import { cpSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadSources, loadPlaces, loadEvents, loadSocial, dataReadAt, write, writeJson, OUT } from './build/lib.mjs';
import { buildApi, buildStormApi, readme } from './build/api.mjs';
import { loadStorm } from './build/storm.mjs';
import { buildRegister } from './build/register.mjs';
import { buildDiscovery } from './build/discovery.mjs';
import { stampLicences } from './build/licence.mjs';
import { buildPages } from './build/pages.mjs';
const version = process.env.SITE_VERSION || 'dev';
const builtAt = new Date().toISOString();
rmSync(OUT, { recursive: true, force: true });
cpSync('src', OUT, { recursive: true });

const sources = loadSources();
const places = loadPlaces();
const readAt = dataReadAt(sources);
const missing = sources.filter(s => !s.latest).map(s => s.id);
if (missing.length) console.warn(`warning: no latest.json for ${missing.join(', ')} (shown as "not read yet")`);
const storm = loadStorm(sources);
const events = loadEvents();
const { index } = buildApi({ sources, places, version: '__VERSION__', builtAt, readAt, storm, events });
buildStormApi({ storm, version: '__VERSION__' });
write('api/v1/README.md', readme());
for (const f of loadSocial()) writeJson(`api/v1/social/by-place/${f.file}`, f.data);   // social signals per place (Dinis, 18 Nov 2026 ~14:45 UTC)
// folder indexes, so /api/v1/events/ and /api/v1/social/ answer (signals.b@ saw a 404/503 on the folder, 18 Nov)
writeJson('api/v1/events/index.json', { about: 'Events: read from official agendas (by-place), found through Perplexity (claims), and past ones.', by_place: '/api/v1/events/by-place/index.json', claims: '/api/v1/events/claims/by-place/index.json', past: '/api/v1/events/past/<place>.json (appears when a claim\'s date passes)', openapi: '/api/v1/openapi.json' });
writeJson('api/v1/social/index.json', { about: 'Social signals: organisations\' public posts as links and metadata, never the text.', latest: '/api/v1/social/latest.json', by_place: '/api/v1/social/by-place/<place>.json', accounts: 'register/social-accounts.json in the repository', card: '/api/v1/social/card.json' });
const register = buildRegister(sources);
const discovery = buildDiscovery();
const pages = buildPages({ sources, places, readAt, index, storm, events, register, discovery });

const licensed = stampLicences(OUT);   // every JSON item carries its licence (Dinis, 18 Nov 2026)
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk(OUT)) {
  if (f.includes('/vendor/') || !/\.(html|js|css|json|md|txt|xml)$/.test(f)) continue;
  const s = readFileSync(f, 'utf8');
  if (s.includes('__VERSION__')) writeFileSync(f, s.replaceAll('__VERSION__', version));
}
writeFileSync(join(OUT, 'version.json'), JSON.stringify({ version, commit: process.env.GITHUB_SHA || 'local', built: builtAt }, null, 2) + '\n');
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`built _site/ (${version}): ${pages.length} pages, ${sources.length} sources, ${places.length} places, ${licensed} JSON files with a licence`);
