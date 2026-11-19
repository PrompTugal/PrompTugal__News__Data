// The pages (HTML plus markdown twin), llms.txt and sitemap.xml.
import { SITE, REPO, ACCOUNT, write, writeJson, readJson, fmtTime } from './lib.mjs';
import { page, h, p, ul, table, pre, quote, raw } from './render.mjs';
import { licenceOf, OURS } from './licence.mjs';
const lic = l => `[${l.name}](${l.url})`;

// ---- the visualizations (data.b@PrompTugal.dinis, 18 Nov 2026; drawn by src/assets/viz/viz.js, data.b.design@) ----
const COAST = '/api/v1/storm/charles/broadcast/coast.json';
const fig = (name, srcs, fallback, read) => {
  const [a, b, c] = srcs;
  return raw(`<figure class="viz" data-viz="${name}" data-src="${a}"${b ? ` data-src2="${b}"` : ''}${c ? ` data-src3="${c}"` : ''}${read ? ` data-read="${read}"` : ''}><div class="viz-fallback">${fallback} <a href="${a}">The data</a>.</div></figure>`, `${fallback} The data: [${a}](${a}).`);
};
// per source: the raw layer (the publisher's own file) and the processed layer (this site's latest.json)
const LAYERS = {
  'ipma-observations': { raw: ['obs-raw', ['raw/observations.json', 'raw/stations.json'], 'Every station, every hour IPMA published in its 24-hour file: temperature lines for a few stations.'],
    processed: [['wind-now', ['latest.json', COAST], 'The wind at each station in the latest hour: direction and speed.'], ['temp-now', ['latest.json', COAST], 'The temperature at each station in the latest hour.']],
    how: 'The collector keeps only the latest hour of IPMA\'s 24-hour file for each station, names the fields, turns -99 into null and adds the station\'s place from IPMA\'s station list.' },
  'ipma-warnings': { raw: ['warnings-raw', ['raw/warnings.json'], 'Every entry in IPMA\'s warnings file, green ones included, as bars from start to end by area.'],
    processed: [['warnings-now', ['latest.json'], 'The warnings in force or to come: areas by type, coloured by level.']],
    how: 'The collector drops the green entries, names the area and the type in English, and counts the active warnings by level.' },
  'ipma-city-forecasts': { raw: ['city-raw', ['raw/city-1080500.json'], 'IPMA\'s own daily forecast file for Faro, as served.'],
    processed: [['forecast-now', ['latest.json'], 'Lowest and highest temperature by place, north to south, for each forecast day.']],
    how: 'The collector reads one file per place (35 places), names the fields, and joins each place\'s name and position from IPMA\'s list.' },
  'ipma-fire-risk': { raw: ['fire-raw', ['raw/rcm-d0.json', 'raw/rcm-d1.json', 'raw/rcm-d2.json'], 'IPMA\'s three fire-risk files (today, tomorrow, the day after): municipalities by level.'],
    processed: [['fire-now', ['latest.json', COAST], 'Fire risk by municipality, on the map, for each of the three days.']],
    how: 'The collector joins the three day files into one list per municipality, with the level named.' },
  'ipma-uv': { raw: ['uv-raw', ['raw/uv.json'], 'Every UV index value in IPMA\'s file.'],
    processed: [['uv-now', ['latest.json'], 'The UV index by place and day.']],
    how: 'The collector groups the values by place and day and adds the place name where IPMA\'s list has it.' },
  'ipma-sea': { raw: ['sea-raw', ['raw/sea-day0.json', 'raw/sea-locations.json'], 'IPMA\'s sea forecast file for today, as served.'],
    processed: [['sea-now', ['latest.json'], 'Wave heights by coastal place, lowest to highest, for each day.']],
    how: 'The collector joins the three day files, names the fields and adds each place\'s name and position.' },
  'adsb-faro': { raw: null, rawNote: 'The raw answer from adsb.lol names every aircraft by its hex id and position, private ones included. This site keeps the storm site\'s privacy rule: it publishes no hex id and no position of a private aircraft, so the raw file is neither served nor kept. What is shown of it: every aircraft counted by altitude band, below the map.',
    processed: [['flights-now', ['latest.json', COAST], 'Airline flights within 40 nautical miles of Faro airport at the time read, by callsign, with their heading and altitude.']],
    how: 'The collector keeps airline flights (an airline code and a flight number as callsign) with callsign, type, altitude, speed, heading and position to 0.01 degree; every other aircraft is only counted.' },
  'adsb-london-portugal': { raw: null, rawNote: 'The raw answers from adsb.lol name every aircraft by its hex id and position, private ones included, and its route lookup is a best guess by callsign and position. This site keeps the storm site\'s privacy rule: it publishes no hex id and no position of a private aircraft, so the raw files are neither served nor kept. Flights by adsb.lol, under the [ODbL 1.0](https://opendatacommons.org/licenses/odbl/1-0/); what is derived from them stays under ODbL.',
    processed: [['london-portugal-flights', ['latest.json', COAST], 'Airline flights near Faro, Lisbon or Porto airport whose route links a London airport, with the count per day and route.']],
    how: 'The collector reads the aircraft within 40 nautical miles of Faro, Lisbon and Porto airports (three requests), asks adsb.lol\'s route lookup once for the airline callsigns seen, and keeps only flights whose route links Heathrow, Gatwick, Stansted, Luton or London City to one of the three. Each flight keeps callsign, airline, type, route, position to 0.01 degree and altitude band; each flight is counted once per day per route, for 14 days. Every other aircraft is only counted.' },
  'meteoalarm-pt': { raw: ['meteoalarm-raw', ['raw/feeds-portugal.json'], 'Every message in MeteoAlarm\'s Portugal feed, by hazard and level against the time sent.'],
    processed: [['meteoalarm-now', ['latest.json'], 'The messages not yet expired, by area, from onset to expiry.']],
    how: 'The collector reads the CAP messages, keeps area, level, hazard and times, and marks what appeared since the last read.' },
  'events-pt': { raw: null, rawNote: 'The raw files are the agendas as served (Agenda LX\'s JSON pages, the Lagos and Teatro das Figuras pages, Tavira\'s calendar route): kept in the vault copy only, as they hold publisher text this site does not republish. What is shown here is our record of each event: name, dates, venue, link.',
    processed: [['events-calendar', ['latest.json'], 'Events per day for the next 60 days, by place.'], ['events-claims', ['/api/v1/events/claims/by-place/index.json'], 'Events found through Perplexity: claimed, confirmed at a readable source, or details withheld.'], ['gaps-hosts', ['/api/v1/sources/gaps.json'], 'The pages cited for events that we do not read: the gaps in our sources.']],
    how: 'The collector reads each agenda through its public interface, keeps the next 60 days, maps each event to a place, drops events without a web address and keeps no organiser text; discovery adds claims with their evidence links, and the claims are confirmed only at a source we read.' },
  'social': { raw: null, rawNote: 'The raw answers hold the posts\' text, which this site never stores: only each post\'s link and metadata are kept.',
    processed: [['social-pulse', ['latest.json'], 'Posts per day by organisation, and the topics and places they match.']],
    how: 'The collector reads the public posts of the organisation accounts on the register through Bluesky\'s public API, matches topics and places in memory, and keeps the link, account, time, matches, language and whether there is media.' },
  'cams': { raw: null, rawNote: 'The raw answer is each operator\'s web page, which is not kept: only whether it answered and whether it still carries a player. No frame, picture or stream is ever fetched.',
    processed: [['cams-status', ['latest.json'], 'Each camera: where it is, who runs it, whether its page is up, and since when.']],
    how: 'The collector asks each operator\'s page once an hour (never the stream or a frame), records up, down, or page up without a player, and keeps only the changes. The cameras and their terms are in register/cams.json; watch each camera on its operator\'s page.' },
  'tfl-jamcams': { raw: null, rawNote: 'The raw answer is TfL\'s camera list (about 1.1 MB), kept in the vault copy: [TfL\'s API](https://api.tfl.gov.uk/Place/Type/JamCam). No image or clip is ever fetched.',
    processed: [['jamcams-map', ['latest.json'], 'London\'s traffic cameras: where they are and how many TfL marks available.']],
    how: 'The collector reads TfL\'s camera list once a run and keeps each camera\'s name, position, view, availability and the addresses of TfL\'s own image and clip, checked to be on TfL\'s bucket path. Powered by TfL Open Data.' },
  'youtube-replays': { raw: null, rawNote: 'There is no raw layer: YouTube\'s terms let us store API data for 30 calendar days at most, so this source keeps only its latest read, replaced every run, and no raw answer or history anywhere (not in a vault either). [Web Summit\'s channel](https://www.youtube.com/@WebSummit). Source: YouTube. By using these links and players you are bound by the [YouTube Terms of Service](https://www.youtube.com/t/terms).',
    processed: [['replays-list', ['latest.json'], 'Web Summit 2026 replays: each upload with its time, length, counts as read and chapters, with a link to YouTube.']],
    how: 'The collector asks the YouTube Data API for the channel Web Summit (@WebSummit), its uploads playlist back to 1 November 2026 and each video\'s details (3 or 4 requests, as many quota units, never search), and keeps each video\'s id, title, time published, length, view and like counts with the time read, a link to YouTube and the address of YouTube\'s embedded player, and chapters read from timestamp lines in the description. The description, thumbnails and comments are not kept. The key is added by the environment, never held by the code; with no key the run does nothing and keeps the last read, and a read more than 25 days old is deleted. Content: YouTube; the videos stay Web Summit\'s.' },
  'cisa-kev': { raw: null, rawNote: 'The raw file is CISA\'s own feed, kept in the vault copy and not served here (its notes carry text our checks refuse): [the feed](https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json).',
    processed: [['kev-pulse', ['latest.json'], 'Vulnerabilities CISA added per week, and the vendors with the most.']],
    how: 'The collector reads CISA\'s published feed, keeps each entry\'s CVE, vendor, product, name, dates, ransomware use and weakness types, and counts the additions per week and per vendor.' },
  'ea-flood': { raw: null, rawNote: 'The raw files are the Environment Agency\'s own answers (warnings with their free-text messages, the station list, each station\'s latest readings), kept in the vault copy and not served here: [the API](https://environment.data.gov.uk/flood-monitoring/doc/reference). This uses Environment Agency flood and river level data from the real-time data API (Beta), under the [Open Government Licence v3.0](http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/).',
    processed: [['ea-flood-now', ['latest.json'], 'Flood warnings and alerts around London by severity, and the latest level at each Thames station.']],
    how: 'The collector asks the Environment Agency for the warnings within 30 km of central London and the Thames level stations within 15 km, keeps each warning\'s id, severity, area, river, county and times (not the free-text message) and each station\'s latest readings with their unit and time, and builds the links from the ids. It also reads the nearest ten rainfall gauges within 15 km (one request each) and keeps each gauge\'s latest 15-minute total and the rain per UTC day for 14 days, each 15-minute reading counted once by its timestamp. Not a warning service: follow the Environment Agency.' },
  'eurostat-tourism': { raw: ['eurostat-raw', ['raw/tour_occ_nin2.json', 'raw/tour_occ_ninraw.json', 'raw/tour_occ_nim.json'], 'Eurostat\'s own JSON-stat answers, as served: nights by region, by country of residence, and by month.'],
    processed: [['eurostat-tourism', ['latest.json'], 'Nights spent at tourist accommodation by where the guest lives: Portugal, the Algarve, Lisbon and London, with the United Kingdom, Germany, France, Spain, the Netherlands and the United States for Portugal as a whole.']],
    how: 'The collector asks Eurostat\'s dissemination API for three tables (tour_occ_nin2, tour_occ_ninraw, tour_occ_nim), reads each value with its dimension codes, keeps the last 10 years (36 months for the monthly table) and drops a value that does not decode. Regions are split only into domestic, foreign and total guests; named countries exist for Portugal as a whole. Lisbon is PT17 to 2022 and Grande Lisboa and Setubal from 2023, as Eurostat changed the regions. Eurostat has no London value after 2016. Source: Eurostat (tour_occ_nin2, tour_occ_ninraw, tour_occ_nim), [reuse notice](https://ec.europa.eu/eurostat/web/main/help/copyright-notice).' },
  'open-meteo-london': { raw: ['open-meteo-raw', ['raw/forecast.json'], 'Open-Meteo\'s own forecast answer for London, as served: hourly temperature and wind for three days.'],
    processed: [['open-meteo-now', ['latest.json'], 'The London forecast: hourly temperature, chance of rain and wind for three days, and each day\'s lowest and highest.']],
    how: 'The collector asks Open-Meteo once for the point on the card, names the fields and keeps the three days. Each earlier forecast we served stays in history for 14 days. [Weather data by Open-Meteo.com](https://open-meteo.com/), CC BY 4.0. Used under the free non-commercial terms because this site is free and carries no subscriptions or adverts (Dinis, 18 Nov 2026).' },
  'nvd-cve': { raw: null, rawNote: 'The raw files are NVD\'s own CVE API answers (about 6 MB a page, with every description and reference), kept in the vault copy and not served here: [the API](https://nvd.nist.gov/developers/vulnerabilities). This product uses the NVD API but is not endorsed or certified by the NVD.',
    processed: [['nvd-pulse', ['latest.json'], 'CVEs NVD published and modified in the last 24 hours, by day and severity, and the CNAs and vendors with the most.']],
    how: 'The collector reads NVD\'s CVE API for the last 24 to 48 hours (no key, seven seconds between requests), keeps each CVE\'s identifier, dates, status, CNA, CVSS severity and score, weakness types and vendor and product (from NVD\'s CPE, else the CNA\'s own list), and counts per day, severity, CNA and vendor. The counts are ours; the values are NVD\'s as served.' },
  'euvd': { raw: null, rawNote: 'The raw files are EUVD\'s own API answers (JSON, with every description and reference), kept in the vault copy and not served here: [the API documentation](https://euvd.enisa.europa.eu/apidoc).',
    processed: [['euvd-pulse', ['latest.json'], 'Vulnerabilities EUVD published or updated in the last 24 hours, with its latest and exploited lists, by day and severity.']],
    how: 'ENISA publishes EUVD through an open API (no key). The collector reads its robots.txt, then the latest and exploited lists and the records updated in the last 24 hours (pages of 100, one request at a time, ten seconds apart, the crawl delay ENISA asks for), and keeps each record\'s EUVD identifier, CVE aliases, dates, CVSS base score and version, vendor and product names, an exploited flag and a link to its EUVD page. The severity band and the totals are ours, from the score. No descriptions or references. Source: ENISA, EU Vulnerability Database.' },
  'enisa-pubs': { raw: null, rawNote: 'The raw file is ENISA\'s publications page as served (HTML, about 80 KB), kept in the vault copy and not served here: [the page](https://www.enisa.europa.eu/publications).',
    processed: [['enisa-publications', ['latest.json'], 'ENISA\'s newest publications by date, with their topics.']],
    how: 'ENISA has no feed, so the collector reads the first page of its publications list once (robots.txt allows it; ten seconds crawl delay respected; ENISA is read through its published pages and APIs, by Dinis\'s decision of 18 Nov 2026) and keeps each item\'s title, date, link on enisa.europa.eu and topics. Source: ENISA.' },
  'base-gov-pt': { raw: null, rawNote: 'The raw file is IMPIC\'s yearly Portal BASE dataset on dados.gov.pt (about 70 MB zipped, every public contract in Portugal), read by stream and not kept here: [the dataset](https://dados.gov.pt/pt/datasets/66d72d488ca4b7cb2de28712/).',
    processed: [['contracts-by-place', ['latest.json'], 'Public contracts of the last 90 days by place, value and buyer, and by procedure.']],
    how: 'The collector streams the yearly file, keeps the contracts whose buyer is the câmara of Lisboa or of an Algarve municipality or one of their municipal companies, shows a contractor that looks like a natural person only as "a natural person" and withholds that contract\'s description.' },
  'storm-charles-archive': { raw: null, rawNote: 'The raw layer is the Storm site\'s own files: every one is now served here, at [/api/v1/storm/charles/](/api/v1/storm/charles/index.json), and listed with its size on [the Storm page](/storm/).',
    processed: [['storm-datasets', ['latest.json'], 'The archive\'s datasets by size.'], ['storm-wind', ['/api/v1/storm/charles/broadcast/field.json', COAST], 'The Storm\'s wind and pressure field over the Atlantic, as its broadcast page drew it.']],
    how: 'The collector read every file the Storm site listed, checked each against its stated sha256 and grouped them into datasets.' },
};
const FRONT = [
  ['adsb-faro', 'flights-now', ['latest.json', COAST], ['Flights around Faro', 'Airline flights near Faro airport at the time read.']],
  ['ipma-observations', 'wind-now', ['latest.json', COAST], ['Wind', 'The wind at each IPMA station, latest hour.']],
  ['ipma-observations', 'temp-now', ['latest.json', COAST], ['Temperature', 'The temperature at each IPMA station, latest hour.']],
  ['ipma-warnings', 'warnings-now', ['latest.json'], ['Warnings', 'IPMA warnings in force or to come, by area and level.']],
  ['ipma-fire-risk', 'fire-now', ['latest.json', COAST], ['Fire risk', 'Fire risk by municipality, three days.']],
  ['ipma-sea', 'sea-now', ['latest.json'], ['The sea', 'Wave heights by coastal place.']],
  ['ipma-city-forecasts', 'forecast-now', ['latest.json'], ['The forecast', 'Lowest and highest temperature by place.']],
  ['meteoalarm-pt', 'meteoalarm-now', ['latest.json'], ['MeteoAlarm', 'Messages not yet expired, by area.']],
  ['ipma-uv', 'uv-now', ['latest.json'], ['UV index', 'UV index by place and day.']],
];
import { readFileSync as _rf, existsSync as _ex } from 'node:fs';
const _vizSrc = _ex('src/assets/viz/viz.js') ? _rf('src/assets/viz/viz.js', 'utf8') : '';
const HAS_CHART = n => n.startsWith('storm-') || _vizSrc.includes(`'${n}'`);
const abs = (id, u) => u.startsWith('/') ? u : `/api/v1/${id}/${u}`;

const OTHER_SITES = [['weather', 'Weather'], ['civic', 'Civic'], ['startups', 'Startups'], ['travel', 'Travel']];
const short = (v, n = 80) => { const s = String(v); return s.length > n ? s.slice(0, n - 3) + '...' : s; };
const statusText = s => s.status === 'ok' ? 'ok' : s.status;

// a few rows of the main list in latest.json: scalar columns only, with the source link on every row
function previewRows(s) {
  const l = s.latest; if (!l) return null;
  const key = Object.keys(l).find(k => Array.isArray(l[k]) && l[k].length && typeof l[k][0] === 'object');
  if (!key) return null;
  const rows = l[key].slice(0, 5);
  let cols = [...new Set(rows.flatMap(r => Object.keys(r)))].filter(k => rows.some(r => r[k] !== null && typeof r[k] !== 'object')).slice(0, 6);
  const src = (l.provenance && l.provenance.source) || (s.card.source_home);
  const t = table([...cols, 'Source'], rows.map(r => [...cols.map(c => r[c] === null || r[c] === undefined ? '' : (typeof r[c] === 'object' ? '' : short(r[c]))), r.source ? `[source](${r.source})` : `[source](${src})`]));
  return { key, total: l[key].length, table: t, src };
}

export function buildPages({ sources, places, readAt, index, storm, events = [], register, discovery }) {
  const pages = [];
  const add = o => pages.push(page({ readAt, ...o }));
  const link = s => `[${s.card.title}](/sources/${s.id}/)`;

  // ---- front page ----
  add({
    path: '', title: 'PrompTugal.news Data', h1: 'The raw public data behind every PrompTugal site',
    description: 'Public data on weather, warnings, the sea, fire risk and flights in Portugal, collected by code and served as plain files and an API. No articles. Not a warning service.',
    blocks: [
      p('Portugal now, from public data: flights, wind, temperature, warnings, fire risk, the sea. Code collects every source twice a day and this page draws it in your browser from the same files the [API](/api/) serves. Each chart names its source and the time it was read; open a source for its raw data and what this site makes of it.'),
      p('**Not a warning service: follow [IPMA](https://www.ipma.pt/) and [ANEPC](https://prociv.gov.pt/).**'),
      raw('<!--PTMAP-->', ''),   // the shared map (scripts/build/ptmap.mjs places it when the registry pins match)
      raw('<div class="viz-grid">', ''),
      ...FRONT.flatMap(([id, name, srcs, text]) => [raw('<section class="viz-cell">', ''), h(text[0], 3), fig(name, srcs.map(u => abs(id, u)), text[1]), p(`[The source, the raw data and the processing](/sources/${id}/)`), raw('</section>', '')]),
      raw('</div>', ''),
      h('Storm Charles, 10 to 12 November 2026'),
      p('The Storm Charles site is frozen as the record; its data now lives here. [Everything it built, and where each part goes now](/storm/).'),
      fig('storm-wind', ['/api/v1/storm/charles/broadcast/field.json', COAST], 'The Storm\'s wind and pressure field over the Atlantic.'),
      h('The sources'),
      table(['Source', 'Publisher', 'Cadence', 'Last read', 'Last run', 'Now'], sources.map(s => [link(s), s.card.publisher.split(',')[0], s.card.schedule.cadence, fmtTime(s.read_at), s.last ? `${statusText(s)} (${s.last.ok} ok, ${s.last.failed} failed)` : statusText(s), s.headline]), 'sources'),
      p('Status comes from each source\'s own reads.json (listed in the [catalogue](/api/v1/index.json)); the headline count comes from its latest.json, as read at the time shown.'),
      h('Use it'),
      ul([
        'The catalogue: [/api/v1/index.json](/api/v1/index.json)',
        'The stability promise: [/api/v1/README.md](/api/v1/README.md)',
        'Try every address: [the API explorer](/api/swagger/)',
        'Agents: [llms.txt](/llms.txt)',
        'Where each source is kept: [vaults](/vaults/)',
        'How this site is made, and by whom: [about](/about/)',
      ]),
    ],
  });

  // ---- sources list ----
  add({
    path: 'sources/', title: 'Sources: PrompTugal.news Data', h1: 'Sources', description: 'Every source this site collects: publisher, schedule, reuse terms and API addresses.',
    blocks: [
      p('Each source has a card: what it is, who publishes it, the terms for reusing it, when it is read, what code, agents and people do, what it costs, and its API addresses.'),
      table(['Source', 'What', 'Publisher', 'Cadence', 'Reuse'], sources.map(s => [link(s), short(s.card.what, 110), s.card.publisher, s.card.schedule.cadence, s.card.terms.republish])),
      ...(register ? [
        h('Every source we know of'),
        p(`The register holds every source PrompTugal knows of, read or not: ${Object.entries(register.index.counts).filter(([, n]) => n).map(([k, n]) => `${n} ${k}`).join(', ')}. The ones we do not read today, and why, quoted from their own terms: [sources we do not read](/sources/not-read/). The data: [/api/v1/sources/index.json](/api/v1/sources/index.json).`),
        table(['Source', 'Kind', 'Places', 'How we read it'], register.entries.filter(e => e.status === 'read' || e.status === 'allowed').map(e => [e.on_this_site ? `[${e.name}](${e.on_this_site})` : `[${e.name}](${e.url})`, e.kind, (e.places || []).join(', '), short(e.how || '', 120)])),
      ] : []),
    ],
  });

  // ---- the sources we do not read, and why (Dinis, 18 Nov 2026, about 14:10 UTC) ----
  if (register) {
    const nr = register.entries.filter(e => e.status !== 'read' && e.status !== 'allowed');
    const kinds = [...new Set(nr.map(e => e.kind))].sort();
    add({
      path: 'sources/not-read/', title: 'Sources we do not read: PrompTugal.news Data', h1: 'Sources we do not read today, and why',
      description: 'Every source PrompTugal knows of but does not read, with the reason quoted from its own terms or robots.txt, the page and the date read, and whether we have asked.',
      blocks: [
        p('Some organisations publish what our places need (events, notices, news, schedules) but do not allow a site like this to read it by machine, or we have not yet checked. We respect whatever they say. Each entry quotes the clause or the robots.txt line, with its page and the date we read it. A separate track asks each one, on the record, through its own published channel: an agent drafts, a person sends, and the answer is kept here as written. Official and public bodies first.'),
        p(`${nr.length} sources. The data: [/api/v1/sources/index.json](/api/v1/sources/index.json), one file per source. [The sources we do read](/sources/).`),
        ...(nr.length ? kinds.flatMap(k => [h(k[0].toUpperCase() + k.slice(1)), table(['Source', 'Status', 'What it would give', 'Why, in its own words', 'Page and date read', 'Asked'], nr.filter(e => e.kind === k).map(e => [`[${e.name}](${e.url})`, e.status, short((e.gives || []).join(', '), 60), (e.why && e.why.basis ? `${e.why.basis}: ` : '') + (e.why && e.why.quote ? `"${short(String(e.why.quote).replace(/\s*\n\s*/g, ' / '), 220)}"` : short((e.why && e.why.text) || '', 220)), e.why ? `[page](${e.why.page}), ${e.why.read_at}` : '', e.asked ? `${e.asked.date}: ${short(e.asked.answer || 'no answer yet', 80)}` : 'not yet']))]) : [p('None recorded yet.')]),
      ],
    });
  }

  // ---- one card page per source ----
  for (const s of sources) {
    const c = s.card, a = c.api, t = c.terms;
    const prev = previewRows(s);
    const L = LAYERS[s.id];
    const blocks = [p(c.what)];
    if (L) {
      blocks.push(p('Three layers: **the source** (who publishes it, the terms, when it was read), **the raw data** as the publisher served it, and **the processed data**, what this site makes of it. The processing is where the value is: named fields, places joined, gaps marked, every value kept with its source and time.'));
      blocks.push(h('1. The source'));
    }
    blocks.push(
      h('At a glance'),
      table(['Field', 'Value'], [
        ['Publisher', c.publisher],
        ['Source', `[${c.source_home}](${c.source_home})`],
        ['Reader page', `[${c.reader_page}](${c.reader_page})`],
        ['Schedule', `${c.schedule.cadence}: ${c.schedule.how}`],
        ['Owner', c.owner],
        ['Collector', `[${c.collector}](${REPO}/blob/dev/${c.collector})`],
        ['Since', c.since],
        ['Last read', fmtTime(s.read_at)],
        ['Last run', s.last ? `${statusText(s)}: ${s.last.ok} requests ok, ${s.last.failed} failed` : statusText(s)],
        ['Now', s.headline],
        ['Licence', `The data: ${lic(licenceOf(s.id))} (${licenceOf(s.id).holder}). This page, the card and the records we add: ${lic(OURS)}.`],
      ], 'kv'),
      h('Reuse terms'),
      p(`${t.summary} Reuse: ${t.republish}.`),
    );
    if (t.quote) blocks.push(quote(t.quote, t.quote_lang, `The publisher's words${t.quote_lang ? ` (${t.quote_lang})` : ''}, from [${t.page}](${t.page}), read on ${t.read_at}.`));
    else blocks.push(p(`Terms page: [${t.page}](${t.page}), read on ${t.read_at}.`));
    if (t.privacy) blocks.push(p(`Privacy: ${t.privacy}`));
    if (t.open_question) blocks.push(p(`**Open question:** ${t.open_question}`));
    if (L) {
      blocks.push(h('2. The raw data'));
      if (L.raw && s.raw.length) blocks.push(p(`As ${c.publisher.split(',')[0]} served it at the latest read (${fmtTime(s.read_at)}), unprocessed. The files: ${s.raw.map(r => `[${r.name}](/api/v1/${s.id}/raw/${r.name})`).join(', ')}.`), fig(L.raw[0], L.raw[1].map(u => abs(s.id, u)), L.raw[2], s.read_at));
      else if (L.raw) blocks.push(p('The raw files were not collected in this build: see the vault.'));
      if (L.rawNote) blocks.push(p(L.rawNote));
      blocks.push(h('3. The processed data'), p(`${L.how} The result: [latest.json](/api/v1/${s.id}/latest.json).`));
      for (const [n, u, t2] of L.processed) if (HAS_CHART(n)) blocks.push(fig(n, u.map(x => abs(s.id, x)), t2)); else blocks.push(p(`${t2} The data: [${abs(s.id, u[0])}](${abs(s.id, u[0])}).`));   // a chart not yet in viz.js shows its data link instead
      blocks.push(h('More about this source'));
    }
    blocks.push(
      h('What runs by code, by agents and by people'),
      h('Code', 3), ul(c.split.code),
      h('Agents', 3), ul(c.split.agents),
      h('People', 3), ul(c.split.people),
      h('Cost'),
      table(['Field', 'Value'], Object.entries(c.cost).map(([k, v]) => [k.replace(/_/g, ' '), String(v)]), 'kv'),
      h('API addresses'),
      p('These addresses stay for the life of v1 ([the contract](/api/v1/README.md)).'),
      table(['File', 'Address'], [
        ['Latest read', s.latest ? `[${a.latest}](${a.latest})` : `${a.latest} (not read yet)`],
        ['Every read', s.reads ? `[${a.reads}](${a.reads})` : `${a.reads} (not read yet)`],
        ['Card', `[${a.card}](${a.card})`],
        ['OpenAPI', `[${a.openapi}](${a.openapi})`],
        ...(s.manifest ? [['Manifest', `[${SITE}/api/v1/${s.id}/manifest.json](${SITE}/api/v1/${s.id}/manifest.json)`]] : []),
      ]),
      pre(`curl -s ${a.latest}\ncurl -s ${a.reads} | head -c 600`),
      h('Vault'),
    );
    if (c.vault) blocks.push(
      table(['Field', 'Value'], [['Vault id', c.vault.id], ['Public read key', `\`${c.vault.read_key}\``], ['Clone', `\`${c.vault.clone}\``], ...(c.vault.web ? [['In the browser', `[${c.vault.web}](${c.vault.web})`]] : []), ['Note', c.vault.note || '']], 'kv'));
    else blocks.push(p('Vault not yet created. The collector writes the bytes of each read to a vault copy; until the vault exists they are not kept.'));
    blocks.push(h('Last runs'));
    if (s.runs.length) blocks.push(table(['Time (UTC)', 'Requests ok', 'Requests failed', 'Reads with changed bytes'], s.runs.slice(0, 24).map(r => [fmtTime(r.at), r.ok, r.failed, `${(r.reads || []).filter(x => x.changed).length} of ${(r.reads || []).length}`])), p(`Showing ${Math.min(24, s.runs.length)} of ${s.runs.length} runs kept. Full detail with sha256: [reads.json](${a.reads}).`));
    else blocks.push(p(s.latest ? 'This source is archived, not read on a schedule: see the manifest.' : 'Not read yet.'));
    blocks.push(h('Preview of the values'));
    if (prev) blocks.push(p(`The first ${Math.min(5, prev.total)} of ${prev.total} entries in \`${prev.key}\`, as read ${fmtTime(s.read_at)}. Source: [${prev.src}](${prev.src}). Long values are shortened here; the file has them whole.`), prev.table);
    else blocks.push(p('Not read yet: no values to show.'));
    add({ path: `sources/${s.id}/`, title: `${c.title}: PrompTugal.news Data`, h1: c.title, description: short(c.what, 200), blocks });
  }

  // ---- API ----
  add({
    path: 'api/', title: 'API: PrompTugal.news Data', h1: 'The API', description: 'Static JSON files and an OpenAPI 3.1 description: how to read the PrompTugal data, the stable addresses and the other four sites.',
    blocks: [
      p('The API is a set of plain JSON files, all `GET`, no key, no sign-up. The build writes them; there is no server to fail. The addresses are stable for the life of v1: read [the contract](/api/v1/README.md).'),
      h('Start here'),
      table(['What', 'Address'], [
        ['Catalogue of every source', `[${SITE}/api/v1/index.json](/api/v1/index.json)`],
        ['OpenAPI 3.1, every path', `[${SITE}/api/v1/openapi.json](/api/v1/openapi.json)`],
        ['OpenAPI for one source', `${SITE}/api/v1/<source>/openapi.json`],
        ['Latest read of a source', `${SITE}/api/v1/<source>/latest.json`],
        ['Every read of a source', `${SITE}/api/v1/<source>/reads.json`],
        ['A source\'s card (terms, schedule, vault)', `${SITE}/api/v1/<source>/card.json`],
        ['Algarve places, now', `[${SITE}/api/v1/by-place/now/index.json](/api/v1/by-place/now/index.json), then \`${SITE}/api/v1/by-place/now/<place>.json\``],
        ['Try it in the browser', '[API explorer](/api/swagger/)'],
      ]),
      pre(`curl -s ${SITE}/api/v1/index.json\ncurl -s ${SITE}/api/v1/ipma-warnings/latest.json\ncurl -s ${SITE}/api/v1/by-place/now/faro.json`),
      h('Sources and places'),
      p('Source ids: ' + sources.map(s => `[${s.id}](/sources/${s.id}/)`).join(', ') + '.'),
      p(places.length ? 'Places with a now file: ' + places.map(x => `[${x.id}](/api/v1/by-place/now/${x.id}.json)`).join(', ') + '.' : 'No place files were built (not read yet).'),
      h('Every value has a source'),
      p('Each latest.json has a `provenance` block: the source address, the page a reader would use, the time read, what read it, and the source\'s terms. Keep the source named when you reuse a value, and check the terms on the card first: they differ.'),
      h('CORS'),
      p('GitHub Pages serves every file with `Access-Control-Allow-Origin: *`, so a browser page on any origin can read these files with `fetch`. The API explorer on this site calls only this site.'),
      h('The other four PrompTugal sites'),
      p('Each site publishes the same kind of catalogue at the same path. These are the intended addresses; this site does not check that they are live yet.'),
      table(['Site', 'Catalogue'], OTHER_SITES.map(([id, n]) => [n, `https://${id}.promptugal.news/api/v1/index.json`])),
      h('Machine-readable'),
      ul(['[openapi.json](/api/v1/openapi.json)', '[API explorer](/api/swagger/)', '[llms.txt](/llms.txt)', '[sitemap.xml](/sitemap.xml)']),
    ],
  });

  // ---- the API explorer (at /api/swagger/, the address the brief and the catalogue name) ----
  const specs = [{ name: 'Whole API', url: '/api/v1/openapi.json' }, ...sources.map(s => ({ name: s.id, url: `/api/v1/${s.id}/openapi.json` })), ...(storm ? [{ name: 'Storm Charles data', url: '/api/v1/storm/openapi.json' }] : [])];
  add({
    path: 'api/swagger/', title: 'API explorer: PrompTugal.news Data', h1: 'API explorer', description: 'Try every GET address of the data API in the browser, for the whole API or one source, from its OpenAPI 3.1 description.',
    head: `<link rel="stylesheet" href="/assets/explorer.css">\n`,
    foot: `<script src="/assets/explorer.js"></script>\n`,
    blocks: [
      p('A small explorer written for this site, reading its own OpenAPI 3.1 documents: pick the whole API or one source, open an address, choose its parameters and try it. Every call is a `GET` to this site. The documents work in any OpenAPI tool, Swagger UI included. [Back to the API page](/api/).'),
      raw(`<div id="explorer" data-specs="${JSON.stringify(specs).replace(/"/g, '&quot;')}"><noscript>The explorer needs JavaScript. The documents are plain JSON: <a href="/api/v1/openapi.json">openapi.json</a>.</noscript></div>`, 'The explorer needs JavaScript. The documents: ' + specs.map(x => `[${x.name}](${x.url})`).join(', ') + '.'),
    ],
  });

  // ---- vaults ----
  add({
    path: 'vaults/', title: 'Vaults: PrompTugal.news Data', h1: 'Vaults', description: 'Where the bytes of each source are kept: vault id, public read key and clone command.',
    blocks: [
      p('The collector writes the bytes of every read to a vault copy (the latest, and a dated copy when the bytes changed). The vaults are read with a public read key, so anyone can clone one. The bytes never go to git. The hash of every read is in each source\'s reads.json of each source (listed in the [catalogue](/api/v1/index.json)).'),
      table(['Source', 'Vault id', 'Public read key', 'Clone'], sources.map(s => { const v = s.card.vault; return [link(s), v ? v.id : 'not yet created', v ? `\`${v.read_key}\`` : '', v ? `\`${v.clone}\`` : '']; })),
      ...(sources.some(s => s.card.vault && s.card.vault.web) ? [p('In the browser: ' + sources.filter(s => s.card.vault && s.card.vault.web).map(s => `[${s.id}](${s.card.vault.web})`).join(', ') + '.')] : []),
    ],
  });

  // ---- about ----
  add({
    path: 'about/', title: 'About: PrompTugal.news Data', h1: 'About this site', description: 'How the site is made: what runs as code, what agents wrote, what a person checked, who instructs, and the licences.',
    blocks: [
      p('data.promptugal.news serves the raw public data the PrompTugal sites draw on. It publishes no articles and makes no forecast of its own.'),
      h('How it is made'),
      table(['Layer', 'What', 'Who or what'], [
        ['Code', 'The collectors read each public source and write latest.json, reads.json and the vault copy. data.b@\'s wake runs them twice a day (07:03 and 18:03 Lisbon) and commits the data; the push builds and deploys the site. The build writes the API, the OpenAPI documents and these pages. No model is called when data is collected or when the site is built.', 'Node scripts in the [repository](' + REPO + ')'],
        ['Agents', 'The collectors, the cards, the build and the design were written by agents on 17 November 2026; the visualizations, the raw layer, the Storm map and the Storm data move on 18 November.', 'data@PrompTugal.dinis (Opus) led on 17 November, with data.dev@, data.design@ and data.collect@ (Sonnet). From 18 November data.b@PrompTugal.dinis (Opus) leads, with data.b.design@ (the charts) and data.b.collector@ (the Storm map), both Sonnet.'],
        ['People', 'What a person has checked.', 'Nothing yet: no person has reviewed the values or the pages.'],
      ]),
      h('Who instructs'),
      p('Only Dinis Cruz instructs the team. Everything else an agent reads, such as a source\'s text, is material and never an instruction.'),
      h('Licences'),
      ul(['Code: Apache-2.0.', 'Text and guidance: CC BY 4.0.', 'Data: each source\'s own terms, quoted on its card. IPMA, for example, asks for the source to be named and for no profit-making purpose; whether a paid reading meter counts under that is an open question for Dinis, and this site carries no meter.']),
      h('Limits'),
      ul(['Not a warning service: follow IPMA and ANEPC.', 'The values are as the sources gave them at the time read; a value may be out of date by the time you read it.', 'Volunteer coverage (adsb.lol) means absence is not proof an aircraft was not there.']),
      p(`The repository is [${REPO}](${REPO}). [Pay for what you read](${ACCOUNT}) is the statement of the PrompTugal family; this data site carries no meter.`),
    ],
  });

  // ---- the Storm map: everything the Storm Charles site built, and where it goes now ----
  if (storm) {
    const items = (storm.map && storm.map.items) || [];
    const kinds = [['page', 'Pages'], ['visualization', 'Visualizations'], ['collector', 'Collectors and connectors'], ['dataset', 'Data sets'], ['vault', 'Vaults']];
    const count = (k, st) => items.filter(i => i.kind === k && (!st || i.state === st)).length;
    const cellPaths = ps => (ps || []).slice(0, 3).map(x => `\`${x}\``).join(', ') + ((ps || []).length > 3 ? ` and ${(ps || []).length - 3} more` : '');
    add({
      path: 'storm/', title: 'Storm Charles: PrompTugal.news Data', h1: 'Storm Charles: what the Storm site built, and where it is now',
      description: 'An inventory of everything the Storm Charles site built (pages, visualizations, collectors, data sets, vaults), where each goes now and its state; the Storm data served here.',
      blocks: [
        p('Storm Charles crossed Lisbon and Madeira from 10 to 12 November 2026. Its site, [storm-charles.promptugal.news](https://storm-charles.promptugal.news/), is frozen as the record. Dinis asked (18 November 2026) that nothing it built be lost: this page maps every part of it, says where it goes now and in what state, and serves its data from this site.'),
        h('The Storm\'s wind, as its broadcast page drew it'),
        fig('storm-wind', ['/api/v1/storm/charles/broadcast/field.json', COAST], 'The wind and pressure field over the Atlantic (Open-Meteo, CC BY 4.0) and the coast (Natural Earth).'),
        h('The flights, as the Storm site saw them'),
        p('Airline flights around Lisbon (from 22:23 UTC on 11 November to 18:00 UTC on 12 November, every 5 minutes) and Madeira, with the wind at 10 m and the runways, rebuilt from the moved frames by `scripts/storm-flights-map.mjs`, a port of the Storm\'s `tools/flights-map.mjs`. Airline flights by callsign only; every other aircraft only counted. Use the slider, or play.'),
        ...['lisbon', 'madeira'].map(a => raw(`<figure class="viz" data-viz="storm-flightmap" data-area="${a}" data-base="/api/v1/storm/charles/flights-map/"><div class="viz-fallback">The ${a === 'lisbon' ? 'Lisbon' : 'Madeira'} flight map needs JavaScript. <a href="/api/v1/storm/charles/flights-map/${a}-flights.json">The data</a>.</div></figure>`, `The ${a} flight map: [the data](/api/v1/storm/charles/flights-map/${a}-flights.json).`)),
        h('Warnings, people and the weather'),
        p('Three of the Storm\'s own charts, ported from its labs and design pages, drawn from the moved files.'),
        fig('storm-hours', ['/api/v1/storm/charles/exposure/people-by-hour.json'], 'Residents under each IPMA warning level, hour by hour (census residents, not people present).'),
        fig('storm-stations', ['/api/v1/storm/charles/weather/stations.json', '/api/v1/storm/charles/weather/warnings.json'], 'Warned against observed: IPMA\'s Lisbon warning windows above the rain and wind each station measured.'),
        fig('storm-models', ['/api/v1/storm/charles/weather/forecast.json', '/api/v1/storm/charles/weather/madeira.json', '/api/v1/storm/charles/weather/lisbon-rain.json'], 'What the forecast models said against what was measured: wind, gusts and rain.'),
        h('The data, moved'),
        p(`${storm.index.counts.files} files, ${(storm.index.counts.bytes / 1e6).toFixed(1)} MB, from the Storm repository at commit ${storm.index.from.commit}, served at [/api/v1/storm/charles/](/api/v1/storm/charles/index.json) with [their own OpenAPI document](/api/v1/storm/openapi.json) (also in [the explorer](/api/swagger/)). Each of the 142 incident files matched the sha256 the Storm site states before it was copied. In this copy each full sha256 value is cut to its first 16 hex, this site's rule; five files are held back, with the reason for each, in [the index](/api/v1/storm/charles/index.json). The archive with full hashes: [the archive source](/sources/storm-charles-archive/), vault j2fq58kn.`),
        fig('storm-datasets', ['/api/v1/storm-charles-archive/latest.json'], 'The Storm data sets by size.'),
        h('The map'),
        p(`${items.length} items, read from the Storm repository on 18 November 2026 by data.b.collector@PrompTugal.dinis (Sonnet) and checked by data.b@. **moved**: on this site now; **to move**: planned, to this site or a sub-site; **dropped**: not carried, most kept frozen on the Storm site as the record. The full map: [storm-map.md](${REPO}/blob/dev/board/team/data/storm-map.md), [storm-map.json](${REPO}/blob/dev/board/team/data/storm-map.json).`),
        table(['Kind', 'Items', 'Moved', 'To move', 'Dropped'], [...kinds.map(([k, l]) => [l, count(k), count(k, 'moved'), count(k, 'to move'), count(k, 'dropped')]), ['All', items.length, items.filter(i => i.state === 'moved').length, items.filter(i => i.state === 'to move').length, items.filter(i => i.state === 'dropped').length]]),
        ...kinds.flatMap(([k, l]) => [h(l, 3), table(['Item', 'Where it goes now', 'State', 'Files in the Storm repository', 'Notes'], items.filter(i => i.kind === k).map(i => [i.title, i.goes_to, `**${i.state}**`, cellPaths(i.paths), i.notes || '']))]),
      ],
    });
  }

  // ---- events by place (18 Nov 2026, at Dinis's word: board/guidance/2026-11-18-s53-and-the-events-site.md in PrompTugal__News__Website) ----
  if (events.length) {
    const day = d => d ? String(d).replace('T', ' ').slice(0, 16) : '';
    const withEv = events.filter(e => (e.data.events || []).length);
    add({
      path: 'events/', title: 'Events by place: PrompTugal.news Data', h1: 'Events, place by place',
      description: 'Upcoming events in Lisbon and the Algarve from official agendas and organisers\' own public feeds, each with its source and the time read; the same data as /api/v1/events/by-place/.',
      blocks: [
        p('What is on, place by place, from official agendas and organisers\' own public feeds: each event keeps its source and the time it was read. The sources and their terms are on [the events card](/sources/events-pt/). Not from eventbrite, lu.ma, luma.com or meetup.com. Check with the organiser before you go: dates change.'),
        p(`The API: [/api/v1/events/by-place/index.json](/api/v1/events/by-place/index.json), then \`/api/v1/events/by-place/<place>.json\`, each event a schema.org Event.`),
        table(['Place', 'Events', 'File'], events.map(e => [e.data.name || e.id, (e.data.events || []).length, `[${e.id}.json](/api/v1/events/by-place/${e.id}.json)`])),
        ...(discovery && discovery.claims && discovery.claims.length ? [
          h('Also found: events whose details we do not copy'),
          p('Found through Perplexity (asked once a day per place). Each is shown by its title, date and place, with the pages that mention it, as a search engine would; its details are withheld because those pages\' terms do not let us copy them, or we have not read them. Organisers: send us your event\'s details and we publish them, credited to you and dated. The records: CC BY 4.0, [claims by place](/api/v1/events/claims/by-place/index.json); each linked page keeps its own terms.'),
          ...discovery.claims.filter(c => (c.claims || []).length && c.discovery).sort((a, b) => a.place.localeCompare(b.place)).flatMap(c => [h(c.place.replace(/-/g, ' ').replace(/\b\w/g, x => x.toUpperCase()), 3), table(['When', 'Event', 'Mentioned on', 'Found'], c.claims.slice(0, 25).map(x => [x.startDate + (x.endDate && x.endDate !== x.startDate ? ' to ' + x.endDate : ''), short(x.name, 90), x.evidence.map(e => `[${e.host || 'link'}](${String(e.url).replace(/ \(query cut\)$/, '')})`).join(', ') || 'no link given', `through Perplexity, ${String(c.discovery.asked_at).slice(0, 10)}`]))]),
        ] : []),
        ...withEv.flatMap(e => [h(e.data.name || e.id), table(['When', 'What', 'Where', 'Organiser', 'Source', 'Licence'], (e.data.events || []).slice(0, 15).map(ev => [day(ev.startDate) + (ev.endDate ? ' to ' + day(ev.endDate) : ''), ev.url ? `[${short(ev.name, 90)}](${ev.url})` : short(ev.name, 90), short((ev.location && ev.location.name) || '', 60), short((ev.organizer && ev.organizer.name) || '', 50), ev.source ? `[source](${String(ev.source).split(' ')[0]})` : '', ev.url ? `[the source's terms](${new URL(ev.url).origin}/)` : ''])), ...((e.data.events || []).length > 15 ? [p(`Showing 15 of ${(e.data.events || []).length}: the rest in [the file](/api/v1/events/by-place/${e.id}.json).`)] : [])]),
      ],
    });
  }

  // ---- gaps: the hosts cited as evidence that we do not read (Dinis, 18 Nov 2026, about 14:15 UTC) ----
  if (discovery && discovery.gaps) {
    const g = discovery.gaps.hosts || [];
    add({
      path: 'sources/gaps/', title: 'Gaps in our sources: PrompTugal.news Data', h1: 'Gaps: sources cited for events that we do not read',
      description: 'Every website cited as evidence for an event in our places that this site does not read, ranked by how many events point to it.',
      blocks: [
        p(`When we look for events in a place, the answer cites its sources. Each one this site does not read is a gap: the details it holds we do not copy. ${g.length} hosts, ranked by the number of event claims that cite them. Each gap is a candidate for the register and for a request on the record (an agent drafts, a person sends). [The register](/sources/not-read/) · [the data](/api/v1/sources/gaps.json).`),
        table(['Host', 'Claims citing it', 'Places', 'On the register'], g.map(x => [x.host, x.claims, x.places.join(', '), x.register ? `[${x.register}](/api/v1/sources/${x.register}.json)` : 'not yet'])),
      ],
    });
  }

  // ---- the pipeline: what is collected, where it goes, what is kept (Dinis, 18 Nov 2026, about 14:40 UTC: "point me to a
  // page that has a very clear distinction with infographics ... on the pipeline and how everything works and what you
  // actually are collecting") ----
  {
    const B = (x, y, w, h, title, sub, cls = '') => `<g class="pl-box ${cls}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/><text x="${x + 10}" y="${y + 20}" class="pl-t">${title}</text>${(sub || []).map((l, i) => `<text x="${x + 10}" y="${y + 38 + i * 15}" class="pl-s">${l}</text>`).join('')}</g>`;
    const A = (x1, y1, x2, y2, cls = '') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="pl-a ${cls}" marker-end="url(#pl-head)"/>`;
    const nHourly = sources.filter(s => s.card.schedule.cadence === 'hourly').length;
    const svg = `<figure class="pl-fig"><svg viewBox="0 0 1000 460" role="img" aria-label="The pipeline: public sources are read by code in GitHub Actions; the latest read and a log of hashes are published on this site; the raw bytes would go to one vault per source but are not kept until the CI secrets exist; the other sites read the API.">
<defs><marker id="pl-head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" class="pl-h"/></marker></defs>
${B(10, 20, 220, 150, '1. Public sources', [`IPMA (6 feeds), adsb.lol,`, 'MeteoAlarm, Agenda LX,', 'Câmara de Lagos,', 'the Storm Charles archive', `${sources.length} with a collector`])}
${B(10, 200, 220, 120, '1b. Discovery', ['Perplexity (sonar) via', 'OpenRouter, once a day', 'per place, in data.b@\'s', 'session (no CI key yet)'], 'pl-ai')}
${B(290, 20, 230, 150, '2. Collect (code, no model)', ['data.b@\'s wake, twice a day', `each wake: ${nHourly} sources read`, 'hourly; slower ones when due;', '2.5 s between requests;', 'a signed commit, then a push'])}
${B(290, 200, 230, 120, '2b. Claims (code)', ['each event named becomes', 'a claim; evidence marked', 'readable or not by the', 'register; gaps counted'], 'pl-ai')}
${B(580, 20, 200, 110, '3a. Latest + log', ['latest.json per source,', 'reads.json: 336 runs of', 'URLs, sizes, sha256 (16 hex)'], 'pl-ok')}
${B(580, 150, 200, 110, '3b. Raw bytes', ['every file as served,', 'dated copy when changed', 'NOT KEPT by CI today:', 'needs the vault secrets'], 'pl-bad')}
${B(580, 280, 200, 90, '3c. In git', ['Storm data (8.8 MB),', 'discovery, claims, the', 'register, the cards'], 'pl-ok')}
${B(830, 20, 160, 110, '4a. This site', ['build, gate, leak scan,', 'deploy: pages, charts,', 'API, OpenAPI'], 'pl-ok')}
${B(830, 150, 160, 110, '4b. Vaults (sgit)', ['one per source, public', 'read key; last written', '17 Nov by data@'], 'pl-bad')}
${B(830, 300, 160, 120, '5. Readers', ['promptugal.news places,', 'weather, travel, civic,', 'events.promptugal.news,', 'agents (llms.txt)'])}
${A(230, 95, 290, 95)}${A(230, 260, 290, 260, 'pl-ai')}${A(520, 75, 580, 75)}${A(520, 120, 580, 200, 'pl-bad')}${A(520, 260, 580, 320, 'pl-ai')}${A(780, 75, 830, 75)}${A(780, 205, 830, 205, 'pl-bad')}${A(780, 325, 830, 75)}${A(910, 130, 910, 300)}
<text x="10" y="420" class="pl-k">Green: working now. Red: blocked (CI secrets SG_SEND_ACCESS_TOKEN and DATA_VAULT_KEYS not set: Dinis). Purple: uses a model.</text>
<text x="10" y="445" class="pl-k">Lost today between runs: the raw bytes of every read and the processed values of every hour but the latest (only hashes survive).</text>
</svg><figcaption>The pipeline as it runs on ${new Date().toISOString().slice(0, 10)}. Drawn from this site's own configuration; CC BY 4.0.</figcaption></figure>`;
    const rows = sources.filter(s => s.card.schedule.cadence !== 'once').map(s => { const l = s.latest ? JSON.stringify(s.latest).length : 0; const raw = (s.raw || []).reduce((n, r) => n + JSON.stringify(r.data).length, 0); return [link(s), s.card.schedule.cadence, `${(l / 1024).toFixed(0)} KB`, s.raw && s.raw.length ? `${s.raw.length} files, about ${(raw / 1024).toFixed(0)} KB a read` : (s.id === 'adsb-faro' ? 'not kept (private aircraft)' : 'HTML pages, vault only'), 'latest only (overwritten each run)', '336 runs (14 days hourly)', s.card.vault ? `${s.card.vault.id}: not written since 17 Nov` : 'none']; });
    add({
      path: 'pipeline/', title: 'The pipeline: PrompTugal.news Data', h1: 'The pipeline: what we collect, where it goes, what we keep',
      description: 'A diagram of the data pipeline and a map of every store: what is collected, how often, where it is kept, for how long, and what is lost today.',
      blocks: [
        p('Public data comes in from its publishers, is read by code on a schedule, published on this site and its API, and should be kept whole in a vault per source. This page shows the whole path and, store by store, what is kept and what is not. [How each data set is shown and licensed](/how/).'),
        raw(svg, 'A diagram: sources, collection in GitHub Actions, the latest files and the log on this site, the raw bytes to the vaults (blocked), the readers.'),
        h('The schedule'),
        ul([`Since 19 November 2026 (Dinis, about 01:20 UTC: every run starts from a commit), data.b@'s wake reads the ${nHourly} sources marked hourly (and the 6-hourly and daily ones when they fall due), commits the data as a signed commit and pushes. Since about 16:30 UTC that day (Dinis: "we don't need hourly updates") the wake runs twice a day, at 07:03 and 18:03 Lisbon, so every served file states a cadence of twice a day. The push runs \`.github/workflows/pages.yml\`: the build, the checks, the leak scan and the deploy. GitHub runs nothing on a timer and collects nothing.`, 'Before 19 November, GitHub ran the workflow on a timer, and fired only 2 of about 19 scheduled runs on 18 November between 00:00 and 14:40 UTC; that is why a reader could see data 6 hours old.', 'Discovery (Perplexity) runs once a day per place in data.b@\'s session, because CI has no OpenRouter key.']),
        h('What is kept, store by store'),
        table(['Source', 'Read', 'Processed (latest.json)', 'Raw bytes per read', 'Processed history', 'Read log', 'Vault'], rows),
        table(['Store', 'What', 'Size now', 'Kept how long', 'State'], [
          ['This site (GitHub Pages)', 'latest.json, reads.json, raw files of the latest read, events, claims, the register, the Storm data, the pages', 'about 18 MB a build', 'replaced on every deploy', 'working'],
          ['Git (this repository)', 'collectors, cards, the Storm data (8.8 MB), discovery answers and claims, the register', 'about 14 MB', 'for ever (history)', 'working'],
          ['GitHub Actions run', 'everything a run reads, raw bytes included', 'about 1 to 3 MB a run', 'deleted when the run ends', 'the raw bytes are lost here today'],
          ['Vaults (sgit, one per source)', 'every raw file, a dated copy when the bytes change, full sha256', 'about 1.5 MB an hour if kept (about 1 GB a month)', 'for ever, versioned', '**blocked:** CI needs SG_SEND_ACCESS_TOKEN and DATA_VAULT_KEYS (Dinis); last written 17 Nov'],
        ]),
        h('What it would take to keep everything'),
        ul(['**Vault secrets in CI (the simplest):** Dinis adds `SG_SEND_ACCESS_TOKEN` and `DATA_VAULT_KEYS` to this repository\'s Actions secrets. `collect/vault-push.mjs` already runs in the workflow and is skipped only because they are missing. Every raw file and a dated copy when it changes would then be kept, per source, readable with each vault\'s public read key.', '**An append lane instead:** CI would hold only a write-only append token (it cannot read or delete), the safer key to give GitHub. Each hourly bundle would be sealed and appended; a drain would file it into the vaults. It needs lanes large enough for about 1.5 MB an hour.', '**Processed history:** each hour\'s latest.json could also go to the vault (small: about 0.6 MB an hour for all sources), so the site can draw a day or a week, not only now.']),
      ],
    });
  }

  // ---- security: every finding, published (Dinis, 18 Nov 2026, about 15:15 UTC) ----
  {
    const sec = readJson('security/findings.json') || { findings: [] };
    const fs = sec.findings || [];
    const pub = x => x.state === 'fixed' || x.state === 'accepted';
    writeJson('api/v1/security/findings.json', { about: sec.about, findings: fs.map(x => pub(x) ? x : { id: x.id, title: x.title, severity: x.severity, state: x.state, found: x.found }) });
    add({
      path: 'security/', title: 'Security: PrompTugal.news Data', h1: 'Security: what we found, and what we did',
      description: 'Every vulnerability, bug and breach found on data.promptugal.news, ours included, with severity, file, when found and by which review, the fix and its commit; and the threat models.',
      blocks: [
        p('Every vulnerability, bug and breach found on this site is published here, ours included. A fixed finding is shown in full; an open one shows only its title, severity and state until it is fixed. The log for every PrompTugal site: [promptugal.news/security/](https://promptugal.news/security/). The data: [/api/v1/security/findings.json](/api/v1/security/findings.json).'),
        h('Findings'),
        table(['Id', 'Finding', 'Severity', 'Found', 'State', 'Files', 'Fix', 'Commit'], fs.map(x => [x.id, x.title, x.severity, `${x.found}, by ${pub(x) ? x.found_by : 'a review'}`, `**${x.state}**`, pub(x) ? (x.files || []).map(f => `\`${f}\``).join(', ') : '', pub(x) ? (x.fix || '') + (x.detail ? ` (${x.detail})` : '') : '', pub(x) && x.commit ? `[${x.commit}](${REPO}/commit/${x.commit})` : ''])),
        h('Threat models'),
        p(`Each automation has a published threat model: what it reads, writes and trusts, what could go wrong, the mitigations. [The list](${REPO}/blob/dev/docs/threat-models/README.md): [discovery](${REPO}/blob/dev/docs/threat-models/discovery.md), [social signals](${REPO}/blob/dev/docs/threat-models/social.md); the others are being written. Reviewed by security@PrompTugal.dinis.`),
        h('Report a problem'),
        p(`Found something? [Open an issue](${REPO}/issues/new?title=Security) (for anything that should not be public, say so in the title and leave out the detail; we will ask how to reach you).`),
      ],
    });
  }

  // ---- how this works: the data, its visualisations, provenance and storage (Dinis, 18 Nov 2026) ----
  {
    const ans = (discovery && discovery.answers) || [];
    const usd = ans.reduce((s, a) => s + (a.cost_usd || 0), 0);
    add({
      path: 'how/', title: 'How it works: PrompTugal.news Data', h1: 'How this site works: the data, the pictures, the provenance, the storage',
      description: 'For every data set: where it comes from, how it is read, how it is drawn, where it is stored and how to reach it; and how events are found and confirmed.',
      blocks: [
        p('Everything here is public data, read by code on a schedule and kept with its source and the time it was read. This page says, for every data set, where it comes from, how it is read, how it is shown, where it is stored and how to reach it.'),
        h('For every data set'),
        table(['Data set', 'Source and interface', 'Read', 'Shown', 'Stored', 'Reach it'], sources.map(s => [link(s), `${s.card.publisher.split(',')[0]}: [${short(s.card.source_home, 50)}](${s.card.source_home})`, s.card.schedule.cadence, `[the source page](/sources/${s.id}/): the source, the raw data, the processed data`, s.card.vault ? `vault ${s.card.vault.id} (public read key on the card), and this site` : 'this site (latest and every read)', `[latest.json](/api/v1/${s.id}/latest.json), [OpenAPI](/api/v1/${s.id}/openapi.json)`])),
        h('Events: look, then publish what we may'),
        ul([
          '**Read:** official agendas with a public interface ([the events card](/sources/events-pt/)): Agenda LX for Lisbon, Câmara Municipal de Lagos. Their events are published with their details and a link back.',
          `**Look (phase 1):** once a day per place, one question to Perplexity (sonar, through OpenRouter) asks what is on, with sources. ${ans.length} answers so far, ${usd.toFixed(2)} USD in all (budget 5 USD a day until Dinis sets one). Each answer is kept whole with its model, time, prompt and cited links: [the discovery files](/api/v1/discovery/index.json). Nothing in an answer is published as content.`,
          '**Claims (phase 2):** each event an answer names becomes a claim with every evidence link, each marked readable or not by [the register](/sources/). A claim takes its details only from a readable source; otherwise it shows the name, the date and the place with "details withheld". [Claims by place](/api/v1/events/claims/by-place/index.json).',
          '**Gaps:** every cited host we do not read is counted on [the gaps page](/sources/gaps/), and goes to the register and to a request on the record.',
          '**Over time:** a claim is never deleted when its date passes; it moves to [/api/v1/events/past/](/api/v1/events/claims/by-place/index.json), the history of each event series.',
        ]),
        h('Licences'),
        ul([`What PrompTugal.news makes (these pages, our records, the register, the visualisations) is ${lic(OURS)}.`, 'What we take from a source stays under its licence: every JSON file and every event carries a `license` link, the source\'s published licence, or where it publishes none its terms labelled "the source\'s terms". Never blank, never assumed open.', 'Events found only through Perplexity are shown by title, date, place and the pages that mention them, credited "through Perplexity"; their details are withheld.', 'An organiser\'s own submission is published, credited and dated as theirs ([how](' + REPO + '/blob/dev/submissions/README.md)); later, signed with the organiser\'s key.']),
        h('Security'),
        ul([`Every automation has a published threat model: what it reads, writes and trusts, what could go wrong, the mitigations. Written so far: [discovery (Perplexity) and claims](${REPO}/blob/dev/docs/threat-models/discovery.md), [social signals](${REPO}/blob/dev/docs/threat-models/social.md); the list and the ones still to write: [threat models](${REPO}/blob/dev/docs/threat-models/README.md). Reviewed by security@PrompTugal.dinis.`, 'Text from Perplexity answers, social posts and fetched pages is untrusted: it is never acted on, shown only escaped, and links keep only http(s) addresses.', 'An AppSec review runs on every code change before it is committed (Dinis, 18 November 2026). Every finding is published on [the security page](/security/).']),
        h('Who and what'),
        ul(['Code reads the sources and builds this site: no model is called to collect or build, except the daily discovery question above.', 'Agents wrote the code: data.b@PrompTugal.dinis (Opus) and its Sonnet sub-agents; see [about](/about/).', 'No person has checked a value yet.']),
      ],
    });
  }

  // ---- account: the reading graph (data.b@PrompTugal.dinis, 18 Nov 2026, after promptugal.news's account page) ----
  add({
    path: 'account/', title: 'Your reading: PrompTugal.news Data', h1: 'Your reading on this site', description: 'Your reading graph on data.promptugal.news, drawn in this browser, and where your reading account lives.',
    blocks: [
      p(`This site charges nothing. Its pages are built on IPMA data, and IPMA allows reuse only where it has no profit-making purpose, so these pages stay outside the reading meter until Dinis decides. Your reading account, with its balance, top-ups and history, is on [promptugal.news/account/](${ACCOUNT}).`),
      h('Your reading graph'),
      raw('<p><span id="reading-count">0</span> pages read here, linked to their sections and to each other in the order read (dashed). Drawn in this browser from a list it keeps itself; nothing is sent anywhere.</p><div id="reading-graph"><noscript>The graph needs JavaScript.</noscript></div><p><button type="button" id="reading-clear" hidden>Forget my reading on this site</button></p>',
        'The graph is drawn in your browser from the pages you read on this site; the markdown version has no graph.'),
      h('What is kept'),
      ul(['In this browser only (localStorage `pt.data.reads`): the address and title of each page you open here, and the minute. The last 200.', 'Page views and reading time are also counted, publicly and without an IP address or cookie, on the PrompTugal observability lane `data`: see the note at the foot of each page.']),
    ],
  });

  // ---- llms.txt and sitemap ----
  write('llms.txt', `# PrompTugal.news Data

> The raw public data behind every PrompTugal site: weather, warnings, sea, fire risk and flights in Portugal, collected by code, served as plain JSON files. No articles. Not a warning service: follow IPMA and ANEPC.

Every file is a GET, no key, CORS open. Addresses are stable for the life of v1: ${SITE}/api/v1/README.md. Reuse terms differ by source: read the card before reuse.

## Start here
- [Catalogue](${SITE}/api/v1/index.json): every source with its addresses
- [OpenAPI 3.1](${SITE}/api/v1/openapi.json): every path with schema and example
- [Contract](${SITE}/api/v1/README.md)
- [API page](${SITE}/api/index.md)
- [About](${SITE}/about/index.md)
- [Vaults](${SITE}/vaults/index.md)

## Sources
${sources.map(s => `- [${s.card.title}](${SITE}/sources/${s.id}/index.md): ${s.card.what}\n  - latest: ${s.card.api.latest}\n  - reads: ${s.card.api.reads}\n  - card: ${s.card.api.card}\n  - openapi: ${s.card.api.openapi}\n  - terms: ${s.card.terms.summary}`).join('\n')}

## Places
- [Algarve places, now](${SITE}/api/v1/by-place/now/index.json): ${places.map(x => x.id).join(', ') || 'none built yet'}
`);
  const today = new Date().toISOString().slice(0, 10);
  write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${pages.map(u => `<url><loc>${SITE}${u}</loc><lastmod>${today}</lastmod></url>`).join('\n')}\n</urlset>\n`);
  return pages;
}
