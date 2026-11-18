// The Storm Charles data, moved from the Storm site to this one (data.b@PrompTugal.dinis, 18 November 2026, at Dinis's
// word in PrompTugal__News__Website board/briefs/2026-11-18-data-site-and-the-storm.md: "we need to leverage just about
// everything we created there"). The files are in git under storm/charles/ (see storm/README.md for what was changed in
// the copy) and are served at api/v1/storm/charles/<path>. The Storm map (board/team/data/storm-map.json) says where
// every other part of the Storm goes.
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { readJson, writeJson, SITE } from './lib.mjs';

const ROOT = 'storm/charles';
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

export function loadStorm(sources) {
  if (!existsSync(ROOT)) return null;
  const man = (sources.find(s => s.id === 'storm-charles-archive') || {}).manifest;
  const about = new Map(((man && man.files) || []).map(f => [f.path, f.about]));
  const files = [];
  for (const f of walk(ROOT).filter(f => f.endsWith('.json')).sort()) {
    let rel = relative(ROOT, f);
    if (rel.startsWith('data/')) rel = rel.slice(5);
    const data = readJson(f); if (!data) continue;
    files.push({ path: rel, bytes: statSync(f).size, about: about.get(rel) || (rel.startsWith('broadcast/') ? 'The broadcast map\'s inputs: the wind and pressure field (Open-Meteo, CC BY 4.0) and the coast (Natural Earth, public domain).' : ''), data });
  }
  for (const f of files) writeJson(`api/v1/storm/charles/${f.path}`, f.data);
  const map = readJson('board/team/data/storm-map.json');
  const index = {
    about: 'The Storm Charles data (Lisbon and Madeira, 10 to 12 November 2026), moved from storm-charles.promptugal.news to the data site on 18 November 2026. The Storm site is frozen as the record. In this copy every full sha256 value is cut to its first 16 hex (this site\'s rule); the full values are on the Storm site and in vault j2fq58kn. Five files are held back: see held.',
    from: { site: 'https://storm-charles.promptugal.news/', repository: 'https://github.com/PrompTugal/PrompTugal__News__Storm-Charles', commit: 'fdac6ed', licence: 'Apache-2.0 (the Storm repository); quoted sources keep their own terms' },
    moved_at: '2026-11-18', moved_by: 'data.b@PrompTugal.dinis',
    held: [{ path: 'exposure/lisbon-grid.json', why: 'a provenance string in it trips this site\'s leak scan; served by the Storm site and kept in vault j2fq58kn' }, { path: 'exposure/lisbon-municipalities.json', why: 'the same' },
      ...['decisions/entities/madeira.json', 'decisions/graph.json', 'transport/bridges.json'].map(path => ({ path, why: 'its quoted text holds an em dash, which this site\'s wording gate refuses; the quote is not altered here, so the file is served by the Storm site and kept in vault j2fq58kn until Dinis decides' }))],
    counts: { files: files.length, bytes: files.reduce((s, f) => s + f.bytes, 0) },
    files: files.map(f => ({ path: f.path, url: `${SITE}/api/v1/storm/charles/${f.path}`, bytes: f.bytes, about: f.about })),
    map: map ? `${SITE}/storm/` : null,
  };
  writeJson('api/v1/storm/charles/index.json', index);
  return { index, files, map };
}
