// /streaming/: what is on Netflix and Disney+ in the United Kingdom and Portugal (Dinis, 21 Nov 2026 about 18:40 UTC: "TMDB,
// display only", the data site non-commercial). Material: the Streaming Availability team hand-over Dinis attached.
//
// TMDB's API terms (https://www.themoviedb.org/api-terms-of-use, last updated 20 Oct 2023, read 21 Nov 2026) shape this page:
//  - display only, on a free non-commercial site, with TMDB's approved logo and notice, and JustWatch credited for the
//    availability ("In order to use this data you must attribute the source of the data as JustWatch");
//  - no derivatives, no "archived or cached data sets containing TMDB Content" for others, no caching beyond 6 months, and no
//    use in "a machine learning or artificial intelligence based Application".
// So this module fetches at build time (the GitHub Actions secret TMDB_READ_TOKEN, a read-only token, read from the environment
// and sent only to api.themoviedb.org, never printed or written) and writes one HTML page. It writes no JSON, no markdown twin,
// nothing under data/, the API or the vaults, and the page is left out of llms.txt and marked noai. Nothing reaches git. Without
// the token the page says the list is not available in this build. data.b@PrompTugal.dinis.
import { write } from './lib.mjs';

const API = 'https://api.themoviedb.org/3';
const REGIONS = [['GB', 'United Kingdom', 'en-GB'], ['PT', 'Portugal', 'pt-PT']];
// subscription services only, matched by TMDB's provider name in each country (ids differ by country: Prime Video is 9 in GB and
// 119 in PT). "Apple TV" is Apple TV+, the subscription; "Apple TV Store" and "Amazon Video" (rent or buy) and the add-on
// channels sold through Amazon and Apple are left out. Dinis, 21 Nov 2026 about 18:53 UTC, asked for Apple TV and Amazon Prime.
const SERVICES = [['Netflix', /^netflix$/i], ['Disney+', /^disney (plus|\+)$/i], ['Prime Video', /^amazon prime video$/i], ['Apple TV+', /^apple tv( ?\+| plus)?$/i]];
const TYPES = [['movie', 'Films'], ['tv', 'Series']];
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

async function get(path, token) {
  const r = await fetch(API + path, { headers: { accept: 'application/json', authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`TMDB answered HTTP ${r.status} for ${path.split('?')[0]}`);
  return r.json();
}

export async function streamingData() {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) return { ok: false, why: 'no TMDB token in this build' };
  const at = new Date().toISOString().replace(/\.\d+Z$/, 'Z'), out = [];
  try {
    for (const [region, country, lang] of REGIONS) {
      const prov = await get(`/watch/providers/movie?watch_region=${region}&language=en-GB`, token);
      for (const [service, re] of SERVICES) {
        const p = (prov.results || []).find(x => re.test(String(x.provider_name)));
        if (!p || !Number.isInteger(p.provider_id)) { out.push({ region, country, service, missing: true }); continue; }
        for (const [type, label] of TYPES) {
          const j = await get(`/discover/${type}?watch_region=${region}&with_watch_providers=${p.provider_id}&with_watch_monetization_types=flatrate&sort_by=popularity.desc&language=${lang}&page=1`, token);
          out.push({ region, country, service, type, label, total: j.total_results, titles: (j.results || []).slice(0, 20).map(t => ({
            id: t.id, title: t.title || t.name, original: t.original_title || t.original_name, year: String(t.release_date || t.first_air_date || '').slice(0, 4), rating: t.vote_average, votes: t.vote_count })) });
          await new Promise(r => setTimeout(r, 300));
        }
      }
    }
  } catch (e) { return { ok: false, why: String(e.message).replace(/Bearer\s+\S+/g, 'Bearer [masked]') }; }
  return { ok: true, at, lists: out };
}

export function writeStreaming(page, d) {
  const credit = `<div class="tmdb-credit"><a href="https://www.themoviedb.org/"><img src="/assets/streaming/tmdb-logo.svg" alt="TMDB" width="140" height="18"></a>
<p>This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB. Where each title streams comes from <a href="https://www.justwatch.com/">JustWatch</a>, through TMDB.</p></div>`;
  const body = !d.ok ? `<p>The list is not available in this build (${esc(d.why)}). It is fetched from TMDB when the site is built, and shown only here.</p>` :
    REGIONS.map(([region, country]) => `<h2 id="${region.toLowerCase()}">${esc(country)}</h2>\n` + d.lists.filter(l => l.region === region).map(l => l.missing
      ? `<p>${esc(l.service)}: TMDB lists no such service in ${esc(country)}.</p>`
      : `<h3>${esc(l.service)}: ${esc(l.label)}</h3>\n<p class="small">The 20 most popular of ${esc(l.total)} ${esc(l.label.toLowerCase())} TMDB lists as included with ${/^[AEIOU]/i.test(l.service) ? "an" : "a"} ${esc(l.service)} subscription in ${esc(country)}.</p>\n<div class="scroll"><table><thead><tr><th scope="col">#</th><th scope="col">Title</th><th scope="col">Year</th><th scope="col">TMDB rating</th></tr></thead><tbody>${l.titles.map((t, i) => `<tr><td>${i + 1}</td><td><a href="https://www.themoviedb.org/${l.type}/${encodeURIComponent(t.id)}">${esc(t.title)}</a>${t.original && t.original !== t.title ? ` <span class="small">(${esc(t.original)})</span>` : ''}</td><td>${esc(t.year)}</td><td>${t.votes ? `${esc(Number(t.rating).toFixed(1))} (${esc(t.votes)} votes)` : 'no votes'}</td></tr>`).join('')}</tbody></table></div>`).join('\n')).join('\n');
  const url = page({ path: 'streaming/', title: 'Streaming in the UK and Portugal: PrompTugal.news Data', h1: 'What is streaming in the UK and Portugal: Netflix, Disney+, Prime Video and Apple TV+',
    description: 'The most popular films and series included with Netflix, Disney+, Prime Video and Apple TV+ in the United Kingdom and Portugal, from TMDB and JustWatch, shown at the time this site was built.',
    readAt: d.ok ? d.at : null, head: '<meta name="robots" content="noai, noimageai">\n',
    blocks: [{ t: 'html', md: '', x: `<p>Read from TMDB when this site was built${d.ok ? `, at ${esc(d.at.replace('T', ' ').replace(/:\d\dZ$/, ' UTC'))}` : ''}. Shown on this page only: under TMDB's terms this list is not offered as data, through our API, as a download, or for use by AI systems, and it is not kept in our archive.</p>\n${credit}\n${body}` }] });
  // no markdown twin for this page (the twin is what agents read): overwrite it with a pointer only
  write('streaming/index.md', '# Streaming\n\nThis page is HTML only: under TMDB\'s terms its list is not offered to agents or AI systems. See https://data.promptugal.news/streaming/ in a browser.\n');
  return url;
}
