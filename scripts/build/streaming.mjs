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

// TMDB text goes onto our page, so it meets the site's wording check (scripts/validate.mjs): a field holding an em dash or a listed
// word is dropped, never altered, and counted
const HYPE = /\b(revolutionary|cutting[- ]edge|seamless(?:ly)?|world[- ]class|game[- ]changing)\b/i;
let dropped = 0;
const keep = v => { if (v == null) return null; const t = String(v).replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').trim(); if (!t) return null; if (t.includes('\u2014') || HYPE.test(t)) { dropped++; return null; } return t; };
// the details of one title (Dinis, 21 Nov 2026 about 18:56 UTC: "are we able to get metadata for each one?"): one request with
// credits and the country's age rating appended
async function details(type, id, lang, region, token) {
  const j = await get(`/${type}/${id}?language=${lang}&append_to_response=credits,${type === 'movie' ? 'release_dates' : 'content_ratings'}`, token);
  const crew = (j.credits?.crew || []);
  const rating = type === 'movie'
    ? ((j.release_dates?.results || []).find(r => r.iso_3166_1 === region)?.release_dates || []).map(r => r.certification).find(Boolean)
    : (j.content_ratings?.results || []).find(r => r.iso_3166_1 === region)?.rating;
  return {
    overview: keep(j.overview), tagline: keep(j.tagline), genres: (j.genres || []).map(g => keep(g.name)).filter(Boolean), genre_ids: (j.genres || []).map(g => g.id).filter(Number.isInteger),
    runtime: type === 'movie' ? (Number.isFinite(j.runtime) && j.runtime > 0 ? j.runtime : null) : null,
    seasons: type === 'tv' ? j.number_of_seasons ?? null : null, episodes: type === 'tv' ? j.number_of_episodes ?? null : null, status: keep(j.status),
    language: keep(j.original_language), countries: (j.origin_country || (j.production_countries || []).map(c => c.iso_3166_1)).filter(c => /^[A-Z]{2}$/.test(c)),
    makers: type === 'movie' ? crew.filter(c => c.job === 'Director').map(c => keep(c.name)).filter(Boolean).slice(0, 3) : (j.created_by || []).map(c => keep(c.name)).filter(Boolean).slice(0, 3),
    cast: (j.credits?.cast || []).slice(0, 5).map(c => keep(c.name)).filter(Boolean),
    age_rating: keep(rating) || null,
    poster: /^\/[A-Za-z0-9]+\.(jpg|png)$/.test(String(j.poster_path || '')) ? j.poster_path : null,
  };
}

export async function streamingData() {
  const token = process.env.TMDB_READ_TOKEN;
  if (!token) return { ok: false, why: 'no TMDB token in this build' };
  dropped = 0;
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
            id: t.id, title: keep(t.title || t.name), original: keep(t.original_title || t.original_name), year: String(t.release_date || t.first_air_date || '').slice(0, 4), rating: t.vote_average, votes: t.vote_count })) });
          await new Promise(r => setTimeout(r, 300));
        }
      }
    }
    // details: one request per distinct title and language, four at a time (TMDB allows about 40 a second)
    const jobs = new Map();
    for (const l of out) if (!l.missing) for (const t of l.titles) { const lang = REGIONS.find(r => r[0] === l.region)[2]; jobs.set(`${l.type}:${t.id}:${l.region}`, [l.type, t.id, lang, l.region]); }
    const got = new Map(), list = [...jobs.entries()];
    let failed = 0;
    await Promise.all([0, 1, 2, 3].map(async w => { for (let i = w; i < list.length; i += 4) { const [k, a] = list[i]; try { got.set(k, await details(...a, token)); } catch { failed++; } await new Promise(r => setTimeout(r, 100)); } }));
    for (const l of out) if (!l.missing) for (const t of l.titles) t.details = got.get(`${l.type}:${t.id}:${l.region}`) || null;
    // genre names in English for every country, by TMDB's genre id, so filters, charts and the pivot compare like with like
    const en = {};
    for (const type of ['movie', 'tv']) for (const g of (await get(`/genre/${type}/list?language=en-GB`, token)).genres || []) if (Number.isInteger(g.id) && keep(g.name)) en[g.id] = g.name;
    for (const l of out) if (!l.missing) for (const t of l.titles) if (t.details) t.details.genres_en = t.details.genre_ids.map(id => en[id]).filter(Boolean);
    return { ok: true, at, lists: out, details: { asked: list.length, got: got.size, failed }, dropped };
  } catch (e) { return { ok: false, why: String(e.message).replace(/Bearer\s+\S+/g, 'Bearer [masked]') }; }
}

const LANG = { en: 'English', pt: 'Portuguese', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', ja: 'Japanese', ko: 'Korean', hi: 'Hindi', zh: 'Chinese', id: 'Indonesian', tr: 'Turkish', sv: 'Swedish', da: 'Danish', no: 'Norwegian', nl: 'Dutch', pl: 'Polish', th: 'Thai', ta: 'Tamil', te: 'Telugu' };
function more(t, l) {
  const d = t.details; if (!d) return '';
  const facts = [
    d.genres.length ? `<b>Genres:</b> ${esc(d.genres.join(', '))}` : '',
    l.type === 'movie' ? (d.runtime ? `<b>Runtime:</b> ${Math.floor(d.runtime / 60)} h ${d.runtime % 60} min` : '') : (d.seasons ? `<b>Seasons:</b> ${esc(d.seasons)} (${esc(d.episodes)} episodes)${d.status ? `, ${esc(d.status.toLowerCase())}` : ''}` : ''),
    d.makers.length ? `<b>${l.type === 'movie' ? 'Directed by' : 'Created by'}:</b> ${esc(d.makers.join(', '))}` : '',
    d.cast.length ? `<b>Cast:</b> ${esc(d.cast.join(', '))}` : '',
    d.age_rating ? `<b>Age rating (${esc(l.region)}):</b> ${esc(d.age_rating)}` : '',
    d.language ? `<b>Original language:</b> ${esc(LANG[d.language] || d.language)}` : '',
    d.countries.length ? `<b>From:</b> ${esc(d.countries.join(', '))}` : '',
  ].filter(Boolean).join(' · ');
  const img = d.poster ? `<img class="poster" src="https://image.tmdb.org/t/p/w92${esc(d.poster)}" alt="" width="92" height="138" loading="lazy" referrerpolicy="no-referrer">` : '';
  return `<tr class="more"><td></td><td colspan="3"><details><summary>Details</summary><div class="st-more">${img}<div>${d.tagline ? `<p><i>${esc(d.tagline)}</i></p>` : ''}${d.overview ? `<p>${esc(d.overview)}</p>` : '<p class="small">No summary in this language on TMDB.</p>'}<p class="small">${facts}</p></div></div></details></td></tr>`;
}

// the rows the page's own explore tools use, inline in the page (not a separate file: under TMDB's terms the list is not offered as a
// data set). One row per list entry. '<' is escaped so the JSON cannot close its script element.
function rowsOf(d) {
  if (!d.ok) return [];
  const rows = [];
  for (const l of d.lists) if (!l.missing) l.titles.forEach((t, i) => { const x = t.details || {};
    rows.push({ country: l.region, service: l.service, type: l.type === 'movie' ? 'film' : 'series', rank: i + 1, id: t.id, title: t.title, original: t.original,
      year: /^\d{4}$/.test(t.year) ? +t.year : null, rating: t.votes ? Math.round(t.rating * 10) / 10 : null, votes: t.votes || 0,
      runtime: x.runtime ?? null, seasons: x.seasons ?? null, episodes: x.episodes ?? null, age_rating: x.age_rating ?? null, language: x.language ?? null,
      genres: x.genres_en || x.genres || [], makers: x.makers || [], cast: x.cast || [] }); });
  return rows;
}

export function writeStreaming(page, d) {
  const credit = `<div class="tmdb-credit"><a href="https://www.themoviedb.org/"><img src="/assets/streaming/tmdb-logo.svg" alt="TMDB" width="140" height="18"></a>
<p>This website uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB. Where each title streams comes from <a href="https://www.justwatch.com/">JustWatch</a>, through TMDB.</p></div>`;
  const body = !d.ok ? `<p>The list is not available in this build (${esc(d.why)}). It is fetched from TMDB when the site is built, and shown only here.</p>` :
    REGIONS.map(([region, country]) => `<h2 id="${region.toLowerCase()}">${esc(country)}</h2>\n` + d.lists.filter(l => l.region === region).map(l => l.missing
      ? `<p>${esc(l.service)}: TMDB lists no such service in ${esc(country)}.</p>`
      : `<h3>${esc(l.service)}: ${esc(l.label)}</h3>\n<p class="small">The 20 most popular of ${esc(l.total)} ${esc(l.label.toLowerCase())} TMDB lists as included with ${/^[AEIOU]/i.test(l.service) ? "an" : "a"} ${esc(l.service)} subscription in ${esc(country)}.</p>\n<div class="scroll"><table><thead><tr><th scope="col">#</th><th scope="col">Title</th><th scope="col">Year</th><th scope="col">TMDB rating</th></tr></thead><tbody>${l.titles.map((t, i) => `<tr><td>${i + 1}</td><td><a href="https://www.themoviedb.org/${l.type}/${encodeURIComponent(t.id)}">${t.title ? esc(t.title) : 'title not shown (our wording check)'}</a>${t.original && t.original !== t.title ? ` <span class="small">(${esc(t.original)})</span>` : ''}</td><td>${esc(t.year)}</td><td>${t.votes ? `${esc(Number(t.rating).toFixed(1))} (${esc(t.votes)} votes)` : 'no votes'}</td></tr>${more(t, l)}`).join('')}</tbody></table></div>`).join('\n')).join('\n');
  const url = page({ path: 'streaming/', title: 'Streaming in the UK and Portugal: PrompTugal.news Data', h1: 'What is streaming in the UK and Portugal: Netflix, Disney+, Prime Video and Apple TV+',
    description: 'The most popular films and series included with Netflix, Disney+, Prime Video and Apple TV+ in the United Kingdom and Portugal, from TMDB and JustWatch, shown at the time this site was built.',
    readAt: d.ok ? d.at : null, head: '<meta name="robots" content="noai, noimageai">\n<link rel="stylesheet" href="/assets/streaming/explore.css">\n<script src="/assets/streaming/explore.js" defer></script>\n',
    blocks: [{ t: 'html', md: '', x: `<style>.st-more{display:flex;gap:1rem;align-items:flex-start}.st-more img.poster{flex:0 0 auto;border-radius:4px}.st-more p{margin:.3rem 0}tr.more td{border-top:0;padding-top:0}details summary{cursor:pointer;font-size:.9em}</style>\n<p>Read from TMDB when this site was built${d.ok ? `, at ${esc(d.at.replace('T', ' ').replace(/:\d\dZ$/, ' UTC'))}` : ''}. Shown on this page only: under TMDB's terms this list is not offered as data, through our API, as a download, or for use by AI systems, and it is not kept in our archive.${d.ok && d.details ? ` Details for ${esc(d.details.got)} of ${esc(d.details.asked)} titles${d.details.failed ? ` (${esc(d.details.failed)} did not answer)` : ''}; ${esc(d.dropped)} field(s) left out by our wording check.` : ''}</p>\n${credit}\n${d.ok ? `<script type="application/json" id="st-data">${JSON.stringify({ rows: rowsOf(d) }).replace(/</g, '\\u003c')}</script>\n<section id="st-explore" aria-labelledby="h-explore"><h2 id="h-explore">Explore</h2><p class="small">Filters, charts, a pivot table and SQL, all in this browser, over the lists below. Needs JavaScript; the lists below work without it.</p></section>\n<h2 id="lists">The lists</h2>` : ''}\n${body}` }] });
  // no markdown twin for this page (the twin is what agents read): overwrite it with a pointer only
  write('streaming/index.md', '# Streaming\n\nThis page is HTML only: under TMDB\'s terms its list is not offered to agents or AI systems. See https://data.promptugal.news/streaming/ in a browser.\n');
  return url;
}
