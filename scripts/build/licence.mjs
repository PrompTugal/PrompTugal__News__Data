// Every piece of data carries its licence (Dinis, 18 Nov 2026, about 14:25 UTC: PrompTugal__News__Website
// board/guidance/2026-11-18-licences-and-submissions.md): what we make is CC BY 4.0; what we take stays under its
// source's licence; where a source publishes none, a link to its terms labelled "the source's terms", never blank,
// never assumed open. data.b@PrompTugal.dinis.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const OURS = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', holder: 'PrompTugal.news', note: 'What PrompTugal.news makes: this file\'s structure, records and derived values.' };
const terms = (url, holder, note) => ({ name: 'the source\'s terms', url, holder, ...(note ? { note } : {}) });
const IPMA = terms('https://api.ipma.pt/', 'IPMA, Instituto Português do Mar e da Atmosfera', 'No named licence: free copying and use for personal or public use without profit-making purpose, IPMA named as the source.');
const BY_SOURCE = {
  'adsb-faro': { name: 'ODbL 1.0', url: 'https://opendatacommons.org/licenses/odbl/1-0/', holder: 'adsb.lol contributors', note: 'Share-alike: what we derive from it stays under ODbL.' },
  'meteoalarm-pt': terms('https://www.meteoalarm.org/en/live/page/terms-and-conditions', 'MeteoAlarm (EUMETNET), for IPMA'),
  'storm-charles-archive': { name: 'Apache-2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0', holder: 'PrompTugal (the Storm Charles site)', note: 'The Storm site\'s own data; quoted sources keep their own terms.' },
  'social': { ...terms('https://bsky.social/about/support/tos', 'each post\'s author (an organisation)'), note: 'Links and metadata only; each post keeps its own license field (the platform\'s terms).' },
  'github-pt': terms('https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#h-api-terms', 'each repository\'s organisation', 'Each repository and release carries its own license field: the repository\'s declared licence (SPDX), or a link to the repository, whose terms apply.'),
  'events-pt': terms('https://www.agendalx.pt/', 'the agenda each event comes from', 'No reuse licence or terms page was found; each event carries its own source\'s link.'),
};
export const licenceOf = id => BY_SOURCE[id] || (id.startsWith('ipma-') ? IPMA : OURS);
const EVENT_HOSTS = { 'agendalx.pt': terms('https://www.agendalx.pt/', 'Agenda Cultural de Lisboa (Câmara Municipal de Lisboa)', 'No reuse licence or terms page found (robots.txt: use=reference).'), 'cm-lagos.pt': terms('https://www.cm-lagos.pt/', 'Câmara Municipal de Lagos', 'No reuse licence or terms page found.') };
const hostOf = u => { try { return new URL(String(u).split(' ')[0]).hostname.replace(/^www\./, ''); } catch { return null; } };
const PERPLEXITY = terms('https://www.perplexity.ai/hub/legal/terms-of-service', 'Perplexity', 'The model\'s answer, kept as evidence; each cited page keeps its own terms.');

function forFile(rel) {
  const p = rel.split('/');   // api, v1, ...
  if (p[2] === 'storm') return BY_SOURCE['storm-charles-archive'];
  if (p[2] === 'discovery') return p[3] === 'index.json' ? OURS : PERPLEXITY;
  if (p[2] === 'by-place') return { ...OURS, note: 'Our record; each value keeps its source, under that source\'s licence: IPMA values under IPMA\'s terms (https://api.ipma.pt/), adsb.lol counts under ODbL 1.0.', sources: { ipma: IPMA, 'adsb.lol': BY_SOURCE['adsb-faro'] } };
  if (p[2] === 'events' || p[2] === 'sources' || p[2] === 'queries' || p[2] === 'social') return OURS;
  if (BY_SOURCE[p[2]] || p[2]?.startsWith('ipma-')) return /^(latest|manifest)\.json$/.test(p[3]) || p[3] === 'raw' ? licenceOf(p[2]) : OURS;
  return OURS;
}
// per item: an event under its own source's terms; a claim is our record, its evidence links each under their own terms
function items(o) {
  if (Array.isArray(o)) return o.map(items);
  if (!o || typeof o !== 'object') return o;
  const x = Object.fromEntries(Object.entries(o).map(([k, v]) => [k, items(v)]));
  if (x['@type'] === 'Event' && !x.license) x.license = x.status ? { ...OURS, note: 'Our record of the claim (title, date, place, evidence links), found through Perplexity; each evidence link is under its own source\'s terms.' } : (EVENT_HOSTS[hostOf(x.url)] || terms(x.url, 'the event\'s source'));
  return x;
}
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
export function stampLicences(out) {
  let n = 0;
  for (const f of walk(join(out, 'api')).filter(f => f.endsWith('.json') && !f.endsWith('openapi.json'))) {
    let o; try { o = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; }
    if (Array.isArray(o)) o = { items: o };
    const rel = f.slice(out.length + 1);
    o = items(o);
    if (!o.license) o = { license: forFile(rel), ...o };
    writeFileSync(f, JSON.stringify(o, null, 1) + '\n'); n++;
  }
  return n;
}
