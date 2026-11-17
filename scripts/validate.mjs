// Gate: fails the build on any problem. Never weaken a check to get a release out.
// From scripts/validate.mjs in the site repositories made by sites@AgentiCCells.dinis
// (2026-11-16); factory@ added the hub.json fields, the description check and the
// placeholder check (a seeded site must hold no __SITE_*__ placeholder).
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join, dirname } from 'node:path';
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const problems = [];
const fail = m => problems.push(m);
const hype = /\b(revolutionary|cutting[- ]edge|seamless(?:ly)?|world[- ]class|game[- ]changing)\b/i;
const isTemplate = existsSync('.factory-template');
if (!existsSync('_site')) { console.error('FAILED: _site/ is not built: run node scripts/build.mjs'); process.exit(1); }
const files = walk('_site');
for (const f of [...files, 'hub.json', 'README.md']) {
  if (!existsSync(f) || !/\.(html|js|css|json|md)$/.test(f)) continue;
  const s = readFileSync(f, 'utf8');
  s.split('\n').forEach((line, i) => {
    if (line.includes('—')) fail(`${f}:${i + 1}: em dash`);
    const m = line.match(hype); if (m) fail(`${f}:${i + 1}: hype word "${m[0]}"`);
    if (!isTemplate && /__SITE_[A-Z]+__/.test(line)) fail(`${f}:${i + 1}: template placeholder left in a seeded site`);
  });
  if (f.endsWith('.html')) {
    if (!/<title>[^<]+<\/title>/.test(s)) fail(`${f}: no <title>`);
    if (!/<meta name="description" content="[^"]+"/.test(s)) fail(`${f}: no description`);
    if (!/<html lang="/.test(s)) fail(`${f}: no lang on <html>`);
    for (const m of s.matchAll(/<script[^>]+src="([^"]+)"/g)) if (/^(https?:)?\/\//.test(m[1])) fail(`${f}: third-party script ${m[1]}`);
    for (const m of s.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)) if (/^(https?:)?\/\//.test(m[1])) fail(`${f}: third-party stylesheet ${m[1]}`);
    for (const m of s.matchAll(/(?:href|src)="([^"#?]+)/g)) {
      const u = m[1]; if (/^(https?:|mailto:|data:|\/\/)/.test(u)) continue;
      const target = u.startsWith('/') ? join('_site', u) : join(dirname(f), u);
      if (!existsSync(target) && !existsSync(join(target, 'index.html'))) fail(`${f}: broken link ${u}`);
    }
  }
}
if (!existsSync('_site/version.json')) fail('no version.json');
if (!existsSync('_site/index.html')) fail('no index.html');
try {
  const h = JSON.parse(readFileSync('hub.json', 'utf8'));
  for (const k of ['name', 'what_it_does', 'owner', 'repository', 'live_address', 'version_from']) if (typeof h[k] !== 'string' || !h[k].trim()) fail(`hub.json: ${k} must be a non-empty string`);
  if (h.version_from !== `${h.live_address}/version.json`) fail(`hub.json: version_from must be ${h.live_address}/version.json (the hub copies it verbatim)`);
  if (h.owner !== 'AgentiCCells') fail('hub.json: owner must be AgentiCCells');
  if (!h.licence || h.licence.code !== 'Apache-2.0' || h.licence.text !== 'CC BY 4.0') fail('hub.json: licence must be code Apache-2.0, text CC BY 4.0');
} catch (e) { fail(`hub.json is missing or not JSON (${e.message})`); }
// ---- data site checks (data.dev@PrompTugal.dinis, 2026-11-17): additions only ----
const warnings = [];
const warn = m => warnings.push(m);
const cards = existsSync('sources') ? readdirSync('sources').filter(d => existsSync(join('sources', d, 'card.json'))) : [];
if (!cards.length) fail('no sources/<id>/card.json');
for (const id of cards) {
  for (const f of ['card', 'openapi']) if (!existsSync(`_site/api/v1/${id}/${f}.json`)) fail(`_site/api/v1/${id}/${f}.json is missing`);
  if (!existsSync(`_site/api/v1/${id}/latest.json`)) warn(`${id}: no latest.json (not read yet)`);
  if (!existsSync(`_site/sources/${id}/index.html`)) fail(`no page for source ${id}`);
}
for (const f of ['index.json', 'openapi.json', 'README.md']) if (!existsSync(`_site/api/v1/${f}`)) fail(`_site/api/v1/${f} is missing`);
for (const f of ['llms.txt', 'sitemap.xml', 'api/swagger/index.html']) if (!existsSync(`_site/${f}`)) fail(`_site/${f} is missing`);
for (const f of files.filter(f => f.endsWith('.html') && !f.includes('/assets/'))) {
  const twin = f.replace(/\.html$/, '.md');
  if (!existsSync(twin)) fail(`${f}: no markdown twin`);
  const t = readFileSync(f, 'utf8');
  if (f.startsWith('_site/design/')) continue; // another agent's pages; the twin is still required above
  if (!/Version [^<]+</.test(t)) fail(`${f}: no version in the masthead`);
  if (!t.includes('https://promptugal.news/account/')) fail(`${f}: no "Pay for what you read" link`);
  if (!t.includes('PrompTugal__News__Data')) fail(`${f}: no repository link`);
  if (!t.includes('rel="alternate" type="text/markdown"')) fail(`${f}: does not link its markdown twin`);
}
// the API explorer's script and stylesheet are there
for (const f of ['assets/explorer.js', 'assets/explorer.css']) if (!existsSync(`_site/${f}`)) fail(`_site/${f} is missing`);
// openapi: parses, is 3.1.0, and every path it lists exists in _site
const specFiles = files.filter(f => /api\/v1\/(?:[^/]+\/)?openapi\.json$/.test(f));
for (const f of specFiles) {
  let doc; try { doc = JSON.parse(readFileSync(f, 'utf8')); } catch (e) { fail(`${f}: does not parse (${e.message})`); continue; }
  if (doc.openapi !== '3.1.0') fail(`${f}: openapi must be 3.1.0`);
  if (!doc.info || !doc.info.version || !doc.info.license) fail(`${f}: info needs version and license`);
  if (!Array.isArray(doc.servers) || !doc.servers.length) fail(`${f}: no servers`);
  const paths = Object.entries(doc.paths || {});
  if (!paths.length) fail(`${f}: no paths`);
  for (const [p, item] of paths) {
    let variants = [p];
    for (const m of p.matchAll(/\{(\w+)\}/g)) {
      const prm = ((item.get && item.get.parameters) || []).find(x => x.name === m[1]);
      const en = prm && prm.schema && prm.schema.enum;
      if (!en || !en.length) { fail(`${f}: ${p}: no enum for {${m[1]}}`); variants = []; break; }
      variants = variants.flatMap(v => en.map(e => v.replace(m[0], e)));
    }
    for (const v of variants) if (!existsSync(join('_site', v))) fail(`${f}: path ${v} does not exist in _site`);
  }
}
if (!specFiles.some(f => f.endsWith('api/v1/openapi.json'))) fail('_site/api/v1/openapi.json is missing');
for (const w of warnings) console.warn('warning: ' + w);
if (problems.length) { console.error(problems.join('\n')); console.error(`FAILED: ${problems.length} problem(s)`); process.exit(1); }
console.log(`OK${isTemplate ? ' (template)' : ''}`);
