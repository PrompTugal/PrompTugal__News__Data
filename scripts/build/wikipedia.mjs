// The Wikipedia feed and the connections, served (data.d@PrompTugal.dinis, 22 Nov 2026, at Dinis's word: a Wikipedia section, page
// and service for other agents, then Strictly and football, "and then see how we can connect the dots").
//   /api/v1/wikipedia/index.json          the tracked articles, which are held, their revision and Wikidata item
//   /api/v1/wikipedia/articles/<slug>.json one article's structure (sections, infobox, tables, citations, links), CC BY-SA 4.0
//   /api/v1/wikipedia/changes.json        what changed at each check, newest first (the last 500)
//   /api/v1/wikipedia/cited-hosts.json    the publishers the held articles cite, and which of our sources' articles cite them
//   /api/v1/connections/latest.json       the links between Strictly, football and Wikipedia (collect/connections.mjs)
//   /wikipedia/, /wikipedia/about/ (the page Wikimedia's rules ask a bot's User-Agent to point to), /connections/
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { writeJson } from './lib.mjs';

const read = f => { try { return JSON.parse(readFileSync(f, 'utf8')); } catch { return null; } };
const BYSA = { name: 'CC BY-SA 4.0', url: 'https://creativecommons.org/licenses/by-sa/4.0/', holder: 'Wikipedia contributors', commercial_use: 'allowed', note: 'Share-alike: what is derived from it stays under CC BY-SA 4.0, with attribution to the article and its revision.' };
const OURS = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', holder: 'PrompTugal.news', commercial_use: 'allowed', note: 'Our index; each article file carries its own licence (CC BY-SA 4.0).' };
const REPO = 'https://github.com/PrompTugal/PrompTugal__News__Data';

export function buildWikipedia(page) {
  const tracked = read('register/wikipedia-tracked.json')?.articles || [];
  const index = read('data/wikipedia/index.json') || { articles: {} };
  const held = tracked.map(a => ({ ...a, ...(index.articles[a.title] || {}) })).map(a => ({ title: a.title, for: a.for, why: a.why, held: !!a.revid, revision: a.revid || null, revision_time: a.revision_time || null, wikidata: a.wikidata || null, checked_at: a.checked_at || null,
    file: a.file ? `/api/v1/wikipedia/${a.file}` : null }));
  const articles = [];
  if (existsSync('data/wikipedia/articles')) for (const f of readdirSync('data/wikipedia/articles').filter(f => f.endsWith('.json'))) { const o = read(join('data/wikipedia/articles', f)); if (!o) continue; writeJson(`api/v1/wikipedia/articles/${f}`, { license: { ...BYSA, attribution: o.licence?.attribution }, ...o }); articles.push(o); }
  const changes = existsSync('data/wikipedia/changes.jsonl') ? readFileSync('data/wikipedia/changes.jsonl', 'utf8').split('\n').filter(Boolean).map(l => { try { return JSON.parse(l); } catch { return null; } }).filter(Boolean).reverse().slice(0, 500) : [];
  const hosts = {}; for (const a of articles) for (const h of a.cited_hosts || []) { hosts[h.host] ||= { host: h.host, uses: 0, articles: 0, for: {} }; hosts[h.host].uses += h.uses; hosts[h.host].articles++; for (const s of a.for || []) hosts[h.host].for[s] = (hosts[h.host].for[s] || 0) + h.uses; }
  const nHeld = held.filter(a => a.held).length;
  const status = nHeld ? `holds ${nHeld} of ${tracked.length} tracked articles` : `tracks ${tracked.length} articles; none held yet: the first run waits on a Wikimedia credential`;
  writeJson('api/v1/wikipedia/index.json', { license: OURS, about: 'The Wikipedia feed: Wikipedia articles kept as structured JSON (sections, infobox, tables, citations, links) for this site\'s sources and other agents, checked at every run and fetched again only when the revision changes. Agents read Wikipedia through here, not directly: one shared copy keeps the traffic to Wikimedia small.',
    status, wiki: 'en.wikipedia.org', checked_at: index.checked_at || null, stopped: index.stopped || null, owner: 'data.d@PrompTugal.dinis', tracked_register: `${REPO}/blob/dev/register/wikipedia-tracked.json`,
    files: { changes: '/api/v1/wikipedia/changes.json', cited_hosts: '/api/v1/wikipedia/cited-hosts.json', connections: '/api/v1/connections/latest.json' }, counts: { tracked: tracked.length, held: nHeld, changes: changes.length, cited_hosts: Object.keys(hosts).length }, articles: held });
  writeJson('api/v1/wikipedia/changes.json', { license: OURS, about: 'What changed at each check of the Wikipedia feed, newest first: the revisions, table rows and citations before and after, and how many cited addresses were added or removed.', changes });
  writeJson('api/v1/wikipedia/cited-hosts.json', { license: OURS, about: 'The publishers the held Wikipedia articles cite (the "shadow sources"), with how often, in how many articles, and for which of this site\'s sources. A citation means an editor says the source supports a sentence; it is not a check by Wikipedia or by us.', hosts: Object.values(hosts).sort((a, b) => b.uses - a.uses) });
  const conn = read('data/connections/latest.json');
  if (conn) writeJson('api/v1/connections/latest.json', { license: { ...OURS, note: 'Our record of the links; the joined data keep their own licences: Four Tens CC0, openfootball CC0, Wikipedia CC BY-SA 4.0.' }, ...conn });

  // pages
  const rows = held.map(a => [a.held ? `[${a.title}](https://en.wikipedia.org/wiki/${encodeURIComponent(a.title.replace(/ /g, '_'))})` : a.title, (a.for || []).map(s => `[${s}](/sources/${s}/)`).join(', '), a.held ? `${a.revision} (${String(a.revision_time).slice(0, 10)})` : 'not held yet', a.wikidata ? `[${a.wikidata}](https://www.wikidata.org/wiki/${a.wikidata})` : '', a.file ? `[JSON](${a.file})` : '']);
  page({ path: 'wikipedia/', title: 'Wikipedia feed: PrompTugal.news Data', h1: 'The Wikipedia feed', readAt: index.checked_at || null,
    description: 'Wikipedia articles kept as structured JSON for this site\'s sources and other agents: tables, infoboxes, citations and links, checked for changes at every run.',
    blocks: [
      { t: 'p', x: `Every agent that needs facts from Wikipedia reads them here instead of from Wikipedia: each tracked article is checked at every run, fetched again only when its revision changes, and kept as structured JSON (sections, infobox, tables, citations, links) with its Wikidata item. One shared copy keeps our traffic to Wikimedia small. The feed ${status}.` },
      { t: 'h', l: 2, x: 'Citations as provenance' },
      { t: 'p', x: 'Each citation is kept with its address, publisher, date, access date and archive copy, and the section it supports. A citation means an editor says the source supports a sentence; it is not a check by Wikipedia or by us. The publishers cited across the held articles are in [cited-hosts.json](/api/v1/wikipedia/cited-hosts.json), and they are candidates for new sources on this site.' },
      { t: 'h', l: 2, x: 'The tracked articles' },
      { t: 'table', cls: '', head: ['Article', 'For', 'Revision held', 'Wikidata', 'Data'], rows },
      { t: 'h', l: 2, x: 'Files' },
      { t: 'ul', items: ['[index.json](/api/v1/wikipedia/index.json): what is tracked and held', '[changes.json](/api/v1/wikipedia/changes.json): what changed at each check', '[cited-hosts.json](/api/v1/wikipedia/cited-hosts.json): the publishers the articles cite', '[connections](/connections/): how the Strictly, football and Wikipedia data link up', '[About the feed\'s client](/wikipedia/about/)'] },
      { t: 'h', l: 2, x: 'Licence' },
      { t: 'p', x: 'Wikipedia\'s text and tables are CC BY-SA 4.0: each article file carries the article, its revision and a link to its authors, and stays under CC BY-SA 4.0 when reused. Strings holding an em dash or a listed hype word are left out (counted, never altered). Wikidata\'s structured data is public domain (CC0).' } ] });
  page({ path: 'wikipedia/about/', title: 'About the Wikipedia feed\'s client: PrompTugal.news Data', h1: 'About the Wikipedia feed\'s client',
    description: 'Who runs the PrompTugalDataWikipedia client, what it asks Wikipedia for, how often, and how to reach us.',
    blocks: [
      { t: 'p', x: 'PrompTugalDataWikipedia is the client of this site\'s Wikipedia feed. Its User-Agent names this page, as [Wikimedia\'s rules](https://www.mediawiki.org/wiki/Wikimedia_APIs/Rate_limits) ask.' },
      { t: 'ul', items: ['What it asks: the latest revision of each tracked article (one request per 50 articles), then the wikitext of only those whose revision changed.', 'How often: at most at each of this site\'s scheduled runs; one request at a time, at least 1.5 seconds apart, with maxlag=5. A 429 answer or a maxlag error stops the run until the next schedule.', 'Why: one shared copy for this site\'s sources and other agents, so they do not each read Wikipedia.', 'Which articles: [register/wikipedia-tracked.json](' + REPO + '/blob/dev/register/wikipedia-tracked.json).', `Contact: open an issue on the repository, ${REPO}/issues.`] } ] });
  if (conn) {
    const L = id => conn.links.find(l => l.id === id) || { items: [] };
    const sport = L('sport-on-strictly'), drift = L('club-name-drift');
    page({ path: 'connections/', title: 'Connections: Strictly, football and Wikipedia: PrompTugal.news Data', h1: 'Connecting the dots: Strictly, football and Wikipedia', readAt: conn.read_at,
      description: 'How the Strictly Come Dancing, football and Wikipedia data on this site link up, what joins each link today and what it still needs.',
      blocks: [
        { t: 'p', x: 'Three sources, one graph: [Strictly scores, series 1 to 15](/sources/strictly-four-tens/), [Premier League](/sources/football-england/) and [Primeira Liga](/sources/football-portugal/) results, and the [Wikipedia feed](/wikipedia/). Each link below says what joins it today and what it still needs, so nothing is shown as joined when it is not.' },
        { t: 'h', l: 2, x: 'Sport on Strictly' },
        { t: 'p', x: `${sport.items.length} Strictly celebrities in series 1 to 15 had a sport as their occupation; ${(sport.footballers || []).length} were footballers (${(sport.footballers || []).join(', ')}). They played before 2010, where the football data starts, so linking them to their clubs needs Wikidata, through the Wikipedia feed.` },
        { t: 'table', cls: '', head: ['Celebrity', 'Occupation', 'Series', 'Partner', 'Weeks', 'Average'], rows: sport.items.map(x => [x.celebrity, x.occupation, x.scored ? String(x.series) : 'no scores here (series 16?)', x.professional || '', String(x.last_week ?? ''), x.average_percent != null ? `${x.average_percent}%` : (x.scored ? 'no judges\' scores' : '')]) },
        { t: 'h', l: 2, x: 'One club, several names' },
        { t: 'p', x: `openfootball writes ${drift.items.length} clubs in more than one way across seasons (for example with and without "FC"). Joining by name is fragile; the Wikipedia feed's season articles give each club's Wikidata item, so the join can be by id.` },
        { t: 'table', cls: '', head: ['League', 'Names'], rows: drift.items.map(x => [x.league, x.names.join(' · ')]) },
        { t: 'h', l: 2, x: 'What waits on the Wikipedia feed' },
        { t: 'ul', items: conn.links.filter(l => l.needs).map(l => `${l.what}: ${l.needs}`) } ] });
  }
  return { tracked: tracked.length, held: nHeld, articles: articles.length };
}
