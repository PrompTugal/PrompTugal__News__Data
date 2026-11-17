// The pages (HTML plus markdown twin), llms.txt and sitemap.xml.
import { SITE, REPO, ACCOUNT, write, fmtTime } from './lib.mjs';
import { page, h, p, ul, table, pre, quote, raw } from './render.mjs';

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

export function buildPages({ sources, places, readAt, index }) {
  const pages = [];
  const add = o => pages.push(page({ readAt, ...o }));
  const link = s => `[${s.card.title}](/sources/${s.id}/)`;

  // ---- front page ----
  add({
    path: '', title: 'PrompTugal.news Data', h1: 'The raw public data behind every PrompTugal site',
    description: 'Public data on weather, warnings, the sea, fire risk and flights in Portugal, collected by code and served as plain files and an API. No articles. Not a warning service.',
    blocks: [
      p('This site holds the raw public data that the PrompTugal sites draw on. Code collects it from its public publishers, on a schedule, and serves it as plain JSON files with an [API](/api/) and an [OpenAPI description](/api/v1/openapi.json). There are no articles here and no opinion: each value keeps its source and the time it was read.'),
      p('**Not a warning service: follow [IPMA](https://www.ipma.pt/) and [ANEPC](https://prociv.gov.pt/).** Reuse terms differ by source; each card quotes them.'),
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
    ],
  });

  // ---- one card page per source ----
  for (const s of sources) {
    const c = s.card, a = c.api, t = c.terms;
    const prev = previewRows(s);
    const blocks = [
      p(c.what),
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
      ], 'kv'),
      h('Reuse terms'),
      p(`${t.summary} Reuse: ${t.republish}.`),
    ];
    if (t.quote) blocks.push(quote(t.quote, t.quote_lang, `The publisher's words${t.quote_lang ? ` (${t.quote_lang})` : ''}, from [${t.page}](${t.page}), read on ${t.read_at}.`));
    else blocks.push(p(`Terms page: [${t.page}](${t.page}), read on ${t.read_at}.`));
    if (t.privacy) blocks.push(p(`Privacy: ${t.privacy}`));
    if (t.open_question) blocks.push(p(`**Open question:** ${t.open_question}`));
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
  const specs = [{ name: 'Whole API', url: '/api/v1/openapi.json' }, ...sources.map(s => ({ name: s.id, url: `/api/v1/${s.id}/openapi.json` }))];
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
        ['Code', 'The collectors read each public source and write latest.json, reads.json and the vault copy. GitHub Actions runs them every hour and deploys the site. The build writes the API, the OpenAPI documents and these pages. No model is called when data is collected or when the site is built.', 'Node scripts in the [repository](' + REPO + ')'],
        ['Agents', 'The collectors, the cards, the build and the design were written by agents on 17 November 2026.', 'data@PrompTugal.dinis (Opus) leads and wrote the collectors and cards. data.dev@, data.design@ and data.collect@ (Sonnet) wrote parts of the build, the design and the collectors.'],
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
