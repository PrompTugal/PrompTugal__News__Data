// The sources register (data.b@PrompTugal.dinis, 18 Nov 2026, at Dinis's word: PrompTugal__News__Website
// board/guidance/2026-11-18-sources-we-do-not-access.md). Hand-kept entries in register/sources.json, plus one `read`
// entry per source with a collector here, from its card. Writes api/v1/sources/index.json and api/v1/sources/<id>.json.
import { readJson, writeJson, SITE } from './lib.mjs';

const STATUSES = ['read', 'not-read', 'asked', 'allowed', 'refused', 'no-answer'];

export function buildRegister(sources) {
  const hand = (readJson('register/sources.json') || { entries: [] }).entries || [];
  const fromCards = sources.map(s => ({
    id: s.id, name: s.card.title, kind: s.id === 'storm-charles-archive' ? 'archive' : 'open-data API', url: s.card.source_home,
    owner: s.card.publisher, places: s.card.places || (s.id === 'adsb-faro' ? ['faro'] : ['portugal']), ...(s.card.country ? { country: s.card.country } : {}), gives: [s.card.what],
    status: 'read', how: `${s.card.collector} reads ${s.card.source_home} (${s.card.schedule.cadence})`,
    terms: { summary: s.card.terms.summary, page: s.card.terms.page, read_at: s.card.terms.read_at },
    on_this_site: `${SITE}/sources/${s.id}/`, collector: s.card.collector,
  }));
  const ids = new Set(fromCards.map(e => e.id));
  const entries = [...fromCards, ...hand.filter(e => !ids.has(e.id))];
  const problems = [];
  for (const e of entries) {
    if (!e.id || !/^[a-z0-9-]+$/.test(e.id)) problems.push(`register: bad id ${e.id}`);
    if (!STATUSES.includes(e.status)) problems.push(`register: ${e.id}: status ${e.status}`);
    if (e.status !== 'read' && !(e.why && e.why.page && e.why.read_at)) problems.push(`register: ${e.id}: a ${e.status} entry needs why.page and why.read_at`);
  }
  if (problems.length) throw new Error(problems.join('\n'));
  for (const e of entries) writeJson(`api/v1/sources/${e.id}.json`, e);
  const count = s => entries.filter(e => e.status === s).length;
  const index = {
    about: 'Every source PrompTugal knows of, read or not. For each one we do not read, the reason, quoted from its terms or robots.txt with the page and the date read. We respect whatever a source says; a request on the record is drafted by outreach@ and sent by a person, and the answer is kept here as written.',
    counts: Object.fromEntries(STATUSES.map(s => [s, count(s)])),
    entries: entries.map(e => ({ id: e.id, name: e.name, kind: e.kind, status: e.status, places: e.places, url: `${SITE}/api/v1/sources/${e.id}.json` })),
  };
  writeJson('api/v1/sources/index.json', index);
  return { entries, index };
}
