// Build: copy src/ to _site/, write the API and the pages from the cards and the collected data,
// stamp the version, write version.json. Works when data/ is missing for some or all sources.
// SITE_VERSION is set by CI only (v0.1.N); a local build says "dev".
import { cpSync, rmSync, readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { loadSources, loadPlaces, dataReadAt, write, OUT } from './build/lib.mjs';
import { buildApi, buildStormApi, readme } from './build/api.mjs';
import { loadStorm } from './build/storm.mjs';
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
const { index } = buildApi({ sources, places, version: '__VERSION__', builtAt, readAt, storm });
buildStormApi({ storm, version: '__VERSION__' });
write('api/v1/README.md', readme());
const pages = buildPages({ sources, places, readAt, index, storm });

const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
for (const f of walk(OUT)) {
  if (f.includes('/vendor/') || !/\.(html|js|css|json|md|txt|xml)$/.test(f)) continue;
  const s = readFileSync(f, 'utf8');
  if (s.includes('__VERSION__')) writeFileSync(f, s.replaceAll('__VERSION__', version));
}
writeFileSync(join(OUT, 'version.json'), JSON.stringify({ version, commit: process.env.GITHUB_SHA || 'local', built: builtAt }, null, 2) + '\n');
writeFileSync(join(OUT, '.nojekyll'), '');
console.log(`built _site/ (${version}): ${pages.length} pages, ${sources.length} sources, ${places.length} places`);
