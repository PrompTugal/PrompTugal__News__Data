// Every piece of data carries its licence (Dinis, 18 Nov 2026, about 14:25 UTC: PrompTugal__News__Website
// board/guidance/2026-11-18-licences-and-submissions.md): what we make is CC BY 4.0; what we take stays under its
// source's licence; where a source publishes none, a link to its terms labelled "the source's terms", never blank,
// never assumed open. data.b@PrompTugal.dinis.
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const OURS = { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', holder: 'PrompTugal.news', note: 'What PrompTugal.news makes: this file\'s structure, records and derived values.', commercial_use: 'allowed', commercial_note: 'With credit to PrompTugal.news; values taken from a source keep that source\'s licence.' };
// commercial_use on every licence (Dinis, 18 Nov 2026 ~23:10 UTC, board/team/data/briefs/2026-11-18-dinis-commercial-line-ine-tfl.md):
// 'allowed' | 'not allowed' | 'unclear' | 'per item'. Sites that sell subscriptions show only data marked 'allowed'.
const terms = (url, holder, note) => ({ name: 'the source\'s terms', url, holder, ...(note ? { note } : {}) });
const IPMA = { ...terms('https://api.ipma.pt/', 'IPMA, Instituto Português do Mar e da Atmosfera', 'No named licence: free copying and use for personal or public use without profit-making purpose, IPMA named as the source.'), commercial_use: 'not allowed', commercial_note: 'IPMA allows use without a profit-making purpose only; a paid site needs IPMA\'s permission or another source.' };
const OGL3 = (holder, note) => ({ name: 'Open Government Licence v3.0', url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', holder, commercial_use: 'allowed', ...(note ? { note } : {}) });
const BY_SOURCE = {
  'adsb-faro': { name: 'ODbL 1.0', url: 'https://opendatacommons.org/licenses/odbl/1-0/', holder: 'adsb.lol contributors', commercial_use: 'allowed', note: 'Share-alike: what we derive from it stays under ODbL.' },
  'adsb-london-portugal': { name: 'ODbL 1.0', url: 'https://opendatacommons.org/licenses/odbl/1-0/', holder: 'adsb.lol contributors', commercial_use: 'allowed', note: 'Share-alike: what we derive from it stays under ODbL.' },
  'meteoalarm-pt': { ...terms('https://www.meteoalarm.org/en/live/page/terms-and-conditions', 'MeteoAlarm (EUMETNET), for IPMA'), commercial_use: 'unclear', commercial_note: 'Terms page needs JavaScript; not read.' },
  'storm-charles-archive': { name: 'Apache-2.0', url: 'https://www.apache.org/licenses/LICENSE-2.0', holder: 'PrompTugal (the Storm Charles site)', commercial_use: 'allowed', note: 'The Storm site\'s own data; quoted sources keep their own terms.' },
  'social': { ...terms('https://bsky.social/about/support/tos', 'each post\'s author (an organisation)'), commercial_use: 'per item', commercial_note: 'Links and metadata only; each post stays its author\'s.', note: 'Links and metadata only; each post keeps its own license field (the platform\'s terms).' },
  'github-pt': { commercial_use: 'per item', ...terms('https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#h-api-terms', 'each repository\'s organisation', 'Each repository and release carries its own license field: the repository\'s declared licence (SPDX), or a link to the repository, whose terms apply.') },
  'cisa-kev': { name: 'CC0 1.0', url: 'https://github.com/cisagov/kev-data/blob/develop/LICENSE', holder: 'CISA', commercial_use: 'allowed', note: 'No CISA logo or DHS seal; no endorsement implied.' },
  'nvd-cve': { name: 'NVD terms of use', url: 'https://nvd.nist.gov/developers/terms-of-use', holder: 'NIST, National Vulnerability Database', commercial_use: 'allowed', note: 'Show: "This product uses the NVD API but is not endorsed or certified by the NVD." Totals are ours, not NVD\'s.' },
  'nvd-kev': { name: 'NVD terms of use', url: 'https://nvd.nist.gov/developers/terms-of-use', holder: 'NIST, National Vulnerability Database', commercial_use: 'allowed', note: 'Show: "This product uses the NVD API but is not endorsed or certified by the NVD." Totals are ours, not NVD\'s.' },
  'euvd': { name: 'ENISA legal notice (reproduction authorised with the source acknowledged)', url: 'https://www.enisa.europa.eu/about-enisa/legal-notice', holder: 'ENISA, EU Vulnerability Database', commercial_use: 'allowed', note: 'Credit: "Source: ENISA, EU Vulnerability Database (euvd.enisa.europa.eu)". Legal notice 1.2: reproduction is authorised provided the source is acknowledged, unless stated otherwise; EUVD has no separate data licence that we found. No ENISA logo. The severity band and the totals are ours.' },
  'enisa-pubs': { name: 'ENISA legal notice (reproduction authorised with the source acknowledged)', url: 'https://www.enisa.europa.eu/about-enisa/legal-notice', holder: 'ENISA', commercial_use: 'allowed', note: 'Credit: "Source: ENISA". Legal notice 1.2: reproduction is authorised provided the source is acknowledged, unless stated otherwise. Title, date, link and topics only; no ENISA logo (press and media use only), report text or images.' },
  'contracts-finder': OGL3('Crown copyright (Crown Commercial Service)', 'Credit: "Contains public sector information licensed under the Open Government Licence v3.0." (rights@ R13, 19 Nov 2026 about 20:45 UTC).'),
  'ea-flood': OGL3('Environment Agency', 'Credit: "this uses Environment Agency flood and river level data from the real-time data API (Beta)".'),
  'tfl-status': { name: "TfL Transport Data Service terms (OGL v2.0 based)", url: 'https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service', holder: 'Transport for London', commercial_use: 'allowed', note: 'Credit: "Powered by TfL Open Data". At most 500 calls a minute per feed; no endorsement implied.' },
  'tfl-bikepoint': { name: "TfL Transport Data Service terms (OGL v2.0 based)", url: 'https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service', holder: 'Transport for London', commercial_use: 'allowed', note: 'Credit: "Powered by TfL Open Data". At most 500 calls a minute per feed; no endorsement implied.' },
  'tfl-road-disruptions': { name: "TfL Transport Data Service terms (OGL v2.0 based)", url: 'https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service', holder: 'Transport for London', commercial_use: 'allowed', note: 'Credit: "Powered by TfL Open Data". At most 500 calls a minute per feed; no endorsement implied.' },
  'carbon-intensity-london': { name: 'CC BY 4.0', url: 'https://creativecommons.org/licenses/by/4.0/', holder: 'National Energy System Operator (NESO), Carbon Intensity API', commercial_use: 'allowed', note: 'Credit: "Carbon Intensity API, National Energy System Operator (NESO), CC BY 4.0". API terms: https://github.com/carbon-intensity/terms (no selling or sublicensing the API; no NESO logo).' },
  'ea-thames-tide': OGL3('Environment Agency', 'Credit: "this uses Environment Agency flood and river level data from the real-time data API (Beta)".'),
  'tfl-jamcams': { name: "TfL Transport Data Service terms (OGL v2.0 based)", url: 'https://tfl.gov.uk/corporate/terms-and-conditions/transport-data-service', holder: 'Transport for London', commercial_use: 'allowed', note: 'Credit: "Powered by TfL Open Data" and "Contains OS data © Crown copyright and database rights 2016" and Geomni UK Map data © and database rights [2019].' },
  'open-meteo-london': { name: 'CC BY 4.0 (free API, non-commercial use)', url: 'https://open-meteo.com/en/terms', holder: 'Open-Meteo', commercial_use: 'not allowed', note: 'Used on this free site under the free tier; a site with subscriptions or adverts needs an Open-Meteo plan or another source. Credit: "Weather data by Open-Meteo.com".' },
  'eurostat-tourism': { name: 'Eurostat reuse policy (Commission Decision of 12 December 2011)', url: 'https://ec.europa.eu/eurostat/web/main/help/copyright-notice', holder: 'Eurostat', commercial_use: 'allowed', note: 'Credit: "Source: Eurostat" with the dataset code.' },
  'base-gov-pt': { name: 'Outra (Domínio Público)', url: 'https://dados.gov.pt/pt/datasets/66d72d488ca4b7cb2de28712/', holder: 'IMPIC, Portal BASE', commercial_use: 'allowed', note: 'Public contracts as published; natural persons are never named here.' },
  'cams': { ...terms('https://github.com/PrompTugal/PrompTugal__News__Data/blob/dev/register/cams.json', 'each camera\'s operator'), commercial_use: 'per item', note: 'Each camera carries its operator\'s terms; links only unless embedding is allowed.' },
  'youtube-replays': { name: 'YouTube API Services Terms of Service and Developer Policies', url: 'https://developers.google.com/youtube/terms/developer-policies', holder: 'Web Summit (the videos), YouTube (the API data)', commercial_use: 'per item', commercial_note: 'The videos, titles and descriptions stay the channel owner\'s. We link and use YouTube\'s own player only; what YouTube serves through its API is under YouTube\'s terms (stored at most 30 calendar days, replaced every run), and whether a commercial site may show it is unclear.', note: 'Source: YouTube. Link YouTube\'s Terms of Service (https://www.youtube.com/t/terms) wherever this is shown; do not copy the video or charge to watch it.' },
  'events-pt': { commercial_use: 'unclear', ...terms('https://www.agendalx.pt/', 'the agenda each event comes from', 'No reuse licence or terms page was found; each event carries its own source\'s link.') },
};
export const licenceOf = id => BY_SOURCE[id] || (id.startsWith('ipma-') ? IPMA : OURS);
const EVENT_HOSTS = { 'agendalx.pt': terms('https://www.agendalx.pt/', 'Agenda Cultural de Lisboa (Câmara Municipal de Lisboa)', 'No reuse licence or terms page found (robots.txt: use=reference).'), 'cm-lagos.pt': terms('https://www.cm-lagos.pt/', 'Câmara Municipal de Lagos', 'No reuse licence or terms page found.') };
const hostOf = u => { try { return new URL(String(u).split(' ')[0]).hostname.replace(/^www\./, ''); } catch { return null; } };
const PERPLEXITY = { ...terms('https://www.perplexity.ai/hub/legal/terms-of-service', 'Perplexity', 'The model\'s answer, kept as evidence; each cited page keeps its own terms.'), commercial_use: 'unclear' };

function forFile(rel) {
  const p = rel.split('/');   // api, v1, ...
  if (p[2] === 'storm') return BY_SOURCE['storm-charles-archive'];
  if (p[2] === 'discovery') return p[3] === 'index.json' ? OURS : PERPLEXITY;
  // London (and later other places beyond Portugal): its now file is built from its own sources, not IPMA's (bulletins.b@ saw IPMA named there)
  // the past (rights@ finding R8, relayed 19 Nov 2026 ~01:27 UTC): IPMA's past observations and forecasts stay on the free sites,
  // credited, never on promptugal.news; London's forecast column is Open-Meteo's free tier, so its file is not commercial either
  if (p[2] === 'history' && p[3] === 'weather') return p[4] === 'london.json'
    ? { ...OURS, note: 'Our record; the Environment Agency\'s rain under the Open Government Licence v3.0 (commercial use allowed), Open-Meteo\'s forecasts under CC BY 4.0 on its free, non-commercial tier.', commercial_use: 'not allowed', commercial_note: 'The file holds Open-Meteo forecasts (non-commercial); free sites only. promptugal.news may link to it, but must show none of its values.', sources: { 'environment-agency': { name: 'Open Government Licence v3.0', url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', holder: 'Environment Agency', commercial_use: 'allowed' }, 'open-meteo': BY_SOURCE['open-meteo-london'] } }
    : { ...IPMA, note: 'IPMA\'s past observations and forecasts as published, kept by us; mention IPMA as the source.', commercial_use: 'not allowed', commercial_note: 'IPMA: "for personal or public use, provided that for no purposes of profit or offence". Free sites only; promptugal.news may link to it, but must show none of its values (rights@ R8).' };
  if (p[2] === 'history') return { ...OURS, commercial_use: 'per item', commercial_note: 'Each history file states its own licence; IPMA and Open-Meteo values are not for commercial use.' };
  if (p[2] === 'by-place' && p[4] === 'london.json') return { ...OURS, note: 'Our record; each value keeps its source, under that source\'s licence: the Environment Agency\'s flood data under the Open Government Licence v3.0, Open-Meteo\'s forecast under CC BY 4.0 (each block carries its own).', commercial_use: 'per item', commercial_note: 'Environment Agency values: allowed. Open-Meteo forecast: not allowed (free tier).', sources: { 'environment-agency': { name: 'Open Government Licence v3.0', url: 'https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/', holder: 'Environment Agency', commercial_use: 'allowed' }, 'open-meteo': { name: 'CC BY 4.0 (free API, non-commercial use)', url: 'https://open-meteo.com/en/terms', holder: 'Open-Meteo', commercial_use: 'not allowed' } } };
  if (p[2] === 'by-place') return { ...OURS, note: 'Our record; each value keeps its source, under that source\'s licence: IPMA values under IPMA\'s terms (https://api.ipma.pt/), adsb.lol counts under ODbL 1.0.', commercial_use: 'per item', commercial_note: 'IPMA values: not allowed (no profit-making purpose). adsb.lol counts: allowed (ODbL, share-alike).', sources: { ipma: IPMA, 'adsb.lol': BY_SOURCE['adsb-faro'] } };
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
// one table for the sites that will sell subscriptions: every source, its licence, and whether commercial use is allowed
export function commercialTable(sources) {
  const rows = sources.map(s => { const l = licenceOf(s.id); return { id: s.id, title: s.card.title, country: s.card.country || null, licence: l.name, url: l.url, holder: l.holder || null, commercial_use: l.commercial_use || 'unclear', note: l.commercial_note || l.note || null, page: `https://data.promptugal.news/sources/${s.id}/` }; });
  const by = k => rows.filter(r => r.commercial_use === k).map(r => r.id);
  return { about: 'Every source on data.promptugal.news, its licence, and whether its data may be used commercially. data.promptugal.news is free and non-commercial. Billing happens only on the main site, promptugal.news; it shows only data marked "allowed". The sub-sites (weather, travel, civic, events, live, cyber, bulletins and the rest) carry no billing and may show any of this data with its licence (Dinis Cruz, 18 November 2026, about 23:45 UTC). "per item" means each item carries its own licence; "unclear" means not to be used commercially until a person settles it.', rule: 'promptugal.news (the only site with billing): allowed only. Every other site: any, with its licence and provenance.', counts: { allowed: by('allowed').length, not_allowed: by('not allowed').length, per_item: by('per item').length, unclear: by('unclear').length }, allowed: by('allowed'), not_allowed: by('not allowed'), per_item: by('per item'), unclear: by('unclear'), sources: rows };
}
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
