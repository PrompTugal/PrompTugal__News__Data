// /api/v1/consolidated/<group>.json: the latest read of every source in a group in one file, so a page in the browser loads a
// region with one request (Dinis, 21 Nov 2026 evening: "We can create consolidated files, right? So that loading it on the browser
// is quite efficient"). Built from the per-source files this build has just written; each source keeps its own licence, read time
// and links beside its data. History fields (anything named *history*, and IPMA's hourly cache) are left out: they stay in each
// source's own latest.json. The TMDB streaming list is not here: its terms bar offering it as a data set. data.b@PrompTugal.dinis.
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';
import { writeJson, OUT, SITE } from './lib.mjs';

const CYBER = new Set(['cisa-kev', 'nvd-cve', 'nvd-kev', 'euvd', 'enisa-pubs']);
const SEPARATE = new Set(['base-gov-pt', 'storm-charles-archive']);   // large or fixed: read from their own files
const SKIP_KEY = k => /history/i.test(k) || k === 'hourly_cache';
const GROUPS = {
  london: { title: 'London', about: 'Every London source: TfL line status, cycle hire, road disruptions and traffic cameras; the Environment Agency\'s flood warnings and the tidal Thames; the London forecast; the carbon intensity of London\'s electricity; and London public bodies\' contracts.', pick: c => c.region === 'london' },
  portugal: { title: 'Portugal', about: 'Portugal\'s weather, sea, fire risk and warnings (IPMA, MeteoAlarm), events, cameras, tourism, social signals and flights around Faro. Public contracts (base-gov-pt) and the Storm archive are in their own files.', pick: c => c.region === 'portugal' && !CYBER.has(c.id) && !SEPARATE.has(c.id) },
  cyber: { title: 'Cyber', about: 'Vulnerabilities and advisories: CISA KEV, NVD (the last 24 hours and every KEV entry), ENISA\'s EUVD and publications.', pick: c => CYBER.has(c.id) },
};

export function buildConsolidated(sources, builtAt) {
  const index = [];
  for (const [g, def] of Object.entries(GROUPS)) {
    const members = sources.filter(s => def.pick({ ...s.card, id: s.id }));
    const out = { group: g, title: def.title, about: def.about, built_at: builtAt, how: 'The latest read of each source, as served in its own /api/v1/<id>/latest.json at this build, without history fields. Each source keeps its own licence: read it before reuse.', sources: {} };
    for (const s of members) {
      const f = join(OUT, 'api/v1', s.id, 'latest.json');
      if (!existsSync(f)) continue;
      const j = JSON.parse(readFileSync(f, 'utf8'));
      const data = Object.fromEntries(Object.entries(j).filter(([k]) => !SKIP_KEY(k)));
      out.sources[s.id] = { title: s.card.title, read_at: j.read_at || null, licence: j.license || j.licence || null, file: `${SITE}/api/v1/${s.id}/latest.json`, page: `${SITE}/sources/${s.id}/`, left_out: Object.keys(j).filter(SKIP_KEY), data };
    }
    writeJson(`api/v1/consolidated/${g}.json`, out);
    const raw = readFileSync(join(OUT, `api/v1/consolidated/${g}.json`));
    index.push({ group: g, title: def.title, sources: Object.keys(out.sources), url: `${SITE}/api/v1/consolidated/${g}.json`, bytes: raw.length, gzip_bytes: gzipSync(raw).length });
  }
  writeJson('api/v1/consolidated/index.json', { about: 'Consolidated files: every source of a group in one file, for pages that load data in the browser. Sizes as built; GitHub Pages serves them compressed.', built_at: builtAt,
    in_the_browser: { script: `${SITE}/assets/data/ptdata.js`, use: "PTData.load('/api/v1/consolidated/london.json', { maxAgeMinutes: 60, onUpdate: render }).then(render)", how: 'Keeps a copy in the browser (Cache Storage), returns it at once, and refreshes it in the background when older than maxAgeMinutes. Same-site files only; nothing is sent anywhere.' }, groups: index });
  return index;
}
