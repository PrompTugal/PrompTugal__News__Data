// The API under _site/api/v1/ and the OpenAPI 3.1 documents.
import { SITE, REPO, write, writeJson, infer, cut } from './lib.mjs';

const V = `${SITE}/api/v1`;
const LICENCE_NOTE = 'Code: Apache-2.0. Text: CC BY 4.0. The data keeps the terms of its own source (see each source card); nothing here relaxes them.';
const notReadYet = 'Not read yet when this site was built: the shape is a placeholder.';

function example(data) {
  const c = cut(data);
  return JSON.stringify(c).length > 20000 ? undefined : c;
}

// one GET operation for a JSON file; data may be null (not read yet)
function jsonOp({ id, summary, description, tag, data, samples, params, exampleName = 'example' }) {
  const schema = data || samples ? { ...infer(samples || [data]), 'x-inferred': true } : { type: 'object', description: notReadYet };
  const content = { schema };
  if (data) { const ex = example(data); if (ex !== undefined) content.examples = { [exampleName]: { summary: 'A real file, cut to a readable size', value: ex } }; }
  return { get: { operationId: id, tags: [tag], summary, description: description + (data || samples ? '' : ' ' + notReadYet), ...(params ? { parameters: params } : {}), responses: { 200: { description: 'The file', content: { 'application/json': content } }, 404: { description: 'No such file' } } } };
}
const textOp = (id, summary, type, tag) => ({ get: { operationId: id, tags: [tag], summary, responses: { 200: { description: 'The file', content: { [type]: { schema: { type: 'string' } } } } } } });
const opId = p => 'get_' + p.replace(/[{}]/g, '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_|_$/g, '');

function info(title, description, version) {
  return { title, version, description: `${description}\n\n${LICENCE_NOTE}`, license: { name: 'Apache-2.0 for code; each source keeps its own data terms', identifier: 'Apache-2.0' }, contact: { name: 'PrompTugal.news data', url: REPO } };
}
const spec = (title, description, version, paths, extra = {}) => ({ openapi: '3.1.0', info: info(title, description, version), servers: [{ url: SITE, description: 'Production' }], externalDocs: { description: 'How to use the API', url: `${SITE}/api/` }, paths, ...extra });

export function buildApi({ sources, places, version, builtAt, readAt }) {
  // ---- per-source files ----
  const perSource = new Map();
  for (const s of sources) {
    const base = `api/v1/${s.id}`;
    writeJson(`${base}/card.json`, s.card);
    if (s.latest) writeJson(`${base}/latest.json`, s.latest);
    if (s.reads) writeJson(`${base}/reads.json`, s.reads);
    if (s.manifest) writeJson(`${base}/manifest.json`, s.manifest);
    const paths = {
      ...(s.latest ? { [`/api/v1/${s.id}/latest.json`]: jsonOp({ id: opId(`${s.id}_latest`), summary: `${s.card.title}: the latest read`, description: s.latest && s.latest.about || s.card.what, tag: s.id, data: s.latest }) } : {}),
      ...(s.reads ? { [`/api/v1/${s.id}/reads.json`]: jsonOp({ id: opId(`${s.id}_reads`), summary: `${s.card.title}: every read, newest first`, description: s.reads && s.reads.about || 'Every run of the collector: address, status, size and sha256 of each request.', tag: s.id, data: s.reads }) } : {}),
      [`/api/v1/${s.id}/card.json`]: jsonOp({ id: opId(`${s.id}_card`), summary: `${s.card.title}: the card`, description: 'Who publishes the source, its reuse terms, the schedule, who owns it, what runs by code, by agents and by people, and the vault.', tag: s.id, data: s.card }),
      [`/api/v1/${s.id}/openapi.json`]: textOp(opId(`${s.id}_openapi`), `${s.card.title}: this document`, 'application/json', s.id),
    };
    if (s.manifest) paths[`/api/v1/${s.id}/manifest.json`] = jsonOp({ id: opId(`${s.id}_manifest`), summary: `${s.card.title}: the manifest`, description: 'Every archived file with its size and sha256.', tag: s.id, data: s.manifest });
    perSource.set(s.id, paths);
    const doc = spec(`${s.card.title}: data.promptugal.news`, `${s.card.what}\n\nPublisher: ${s.card.publisher}. Reuse terms: ${s.card.terms.summary.replace(/\.$/, "")}. Not a warning service: follow IPMA and ANEPC.`, version, paths, { tags: [{ name: s.id, description: s.card.what }], 'x-source': { id: s.id, card: `${V}/${s.id}/card.json`, page: s.card.api.page } });
    writeJson(`${base}/openapi.json`, doc);
  }

  // ---- by place ----
  const placeFiles = places.map(p => ({ id: p.id, name: p.data.place || p.id, url: `${V}/by-place/now/${p.id}.json`, read_at: p.data.read_at || null }));
  for (const p of places) writeJson(`api/v1/by-place/now/${p.id}.json`, p.data);
  const placeIndex = { about: 'The places that have a "now" file: each combines the nearest IPMA values from this site\'s collected sources, with the source and the time read on every value. Not a warning service: follow IPMA and ANEPC.', read_at: readAt, places: placeFiles };
  writeJson('api/v1/by-place/now/index.json', placeIndex);

  // ---- the catalogue ----
  const index = {
    about: 'The catalogue of data.promptugal.news: the raw public data behind every PrompTugal site, collected by code, no articles. Not a warning service: follow IPMA and ANEPC.',
    api: 'v1',
    contract: `${V}/README.md`,
    version,
    built_at: builtAt,
    site: SITE,
    licence: { code: 'Apache-2.0', text: 'CC BY 4.0', data: 'each source keeps its own terms (terms_summary, and the card)' },
    sources: sources.map(s => ({
      id: s.id, title: s.card.title, publisher: s.card.publisher, cadence: s.card.schedule.cadence,
      read_at: s.read_at, status: s.status, headline: s.headline,
      latest: s.latest ? s.card.api.latest : null, reads: s.reads ? s.card.api.reads : null,
      card: s.card.api.card, openapi: s.card.api.openapi, page: s.card.api.page,
      vault_id: (s.card.vault && s.card.vault.id) || null, terms_summary: s.card.terms.summary,
    })),
    by_place: placeFiles.map(p => p.url),
    by_place_index: `${V}/by-place/now/index.json`,
    openapi: `${V}/openapi.json`,
    swagger: `${SITE}/api/swagger/`,
  };
  writeJson('api/v1/index.json', index);

  // ---- the whole spec ----
  const ids = sources.map(s => s.id);
  const sample = (f) => sources.map(f).filter(Boolean);
  const paths = {
    '/api/v1/index.json': jsonOp({ id: 'get_index', summary: 'The catalogue', description: index.about, tag: 'meta', data: index }),
    '/api/v1/openapi.json': textOp('get_openapi', 'This document', 'application/json', 'meta'),
    '/api/v1/README.md': textOp('get_readme', 'The stability contract', 'text/markdown', 'meta'),
  };
  for (const s of sources) Object.assign(paths, Object.fromEntries(Object.entries(perSource.get(s.id)).filter(([p]) => p.endsWith('/latest.json') || p.endsWith('/manifest.json'))));
  const srcParam = (list) => ({ name: 'source', in: 'path', required: true, schema: { type: 'string', enum: list }, example: list[0] });
  const r0 = sources.find(s => s.reads);
  if (r0) paths['/api/v1/{source}/reads.json'] = jsonOp({ id: 'get_source_reads', summary: 'Every read of one source, newest first', description: 'Each request\'s address, HTTP status, size and sha256, and whether the bytes changed.', tag: 'sources', data: r0 && r0.reads, samples: sample(s => s.reads).length ? sample(s => s.reads) : null, params: [srcParam(sources.filter(s => s.reads).map(s => s.id))] });
  paths['/api/v1/{source}/card.json'] = jsonOp({ id: 'get_source_card', summary: 'One source\'s card', description: 'Publisher, reuse terms, schedule, owner, what runs by code, agents and people, cost, vault.', tag: 'sources', data: sources[0].card, samples: sources.map(s => s.card), params: [srcParam(ids)] });
  paths['/api/v1/{source}/openapi.json'] = { get: { operationId: 'get_source_openapi', tags: ['sources'], summary: 'OpenAPI document for one source', parameters: [srcParam(ids)], responses: { 200: { description: 'The document', content: { 'application/json': { schema: { type: 'object' } } } } } } };
  const pl = places[0];
  const placeParam = { name: 'place', in: 'path', required: true, schema: { type: 'string', enum: places.map(p => p.id) }, example: pl && pl.id };
  paths['/api/v1/by-place/now/index.json'] = jsonOp({ id: 'get_by_place_index', summary: 'The places that have a now file', description: placeIndex.about, tag: 'by-place', data: placeIndex });
  if (pl) paths['/api/v1/by-place/now/{place}.json'] = jsonOp({ id: 'get_by_place_now', summary: 'Now in one place', description: pl.data.about || 'Nearest IPMA values for the place.', tag: 'by-place', data: pl.data, samples: places.map(p => p.data), params: [placeParam] });
  const tags = [{ name: 'meta', description: 'The catalogue, the contract and this document' }, { name: 'sources', description: 'Files every source has, by source id' }, { name: 'by-place', description: 'Algarve places, now' }, ...sources.map(s => ({ name: s.id, description: s.card.what }))];
  const desc = `Every GET file of data.promptugal.news, ${sources.length} sources. Each response schema is inferred from the real file (x-inferred) and each example is a real file cut to a readable size. Data terms by source:\n\n` + sources.map(s => `- ${s.id}: ${s.card.terms.summary}`).join('\n') + '\n\nNot a warning service: follow IPMA and ANEPC.';
  writeJson('api/v1/openapi.json', spec('data.promptugal.news API v1', desc, version, paths, { tags, 'x-generated': { by: 'scripts/build/api.mjs (data.dev@PrompTugal.dinis)', built_at: builtAt } }));
  return { index, placeFiles };
}

export function readme() {
  return `# The data API, v1: what stays stable

For the sites and agents that read data.promptugal.news as a source (the other PrompTugal sites among them). The catalogue is [index.json](index.json); the OpenAPI 3.1 description is [openapi.json](openapi.json); try it in [the API explorer](${SITE}/api/swagger/).

## The promise

- **Addresses stay.** \`api/v1/index.json\`, \`api/v1/openapi.json\` and every \`api/v1/<source>/{latest,reads,card,openapi}.json\` listed in the catalogue keep their address for the life of v1. \`api/v1/storm-charles-archive/manifest.json\` and \`api/v1/by-place/now/<place>.json\` likewise. A file may be added; a listed file is not removed or renamed in v1.
- **Fields stay.** In \`index.json\`: \`about\`, \`api\`, \`contract\`, \`version\`, \`built_at\`, \`site\`, \`sources[]\` (\`id\`, \`title\`, \`publisher\`, \`cadence\`, \`read_at\`, \`latest\`, \`reads\`, \`card\`, \`openapi\`, \`page\`, \`vault_id\`, \`terms_summary\`) and \`by_place\`. Fields may be added; none is removed, renamed or changes type in v1. The same holds for the top-level fields of each data file once it is listed.
- **Every value** carries its source and the UTC time it was read (\`provenance\` in each latest.json). Times are as the source gives them; where a field says UTC it is UTC.
- **\`version\`** is the site's release (one per push); it changes many times a day and is not the API's version. The API's version is \`api\` ("v1") and the path.
- **A source's own terms** travel with its data (\`terms_summary\` here, \`terms\` in the card). They are not ours to relax: read them before you reuse a value.
- **A breaking change** goes to \`api/v2/\`, with v1 kept alongside, and a dated line below before it ships.
- **Refreshed** hourly for the hourly sources (see \`cadence\`). A source that failed to read keeps its last good file; \`reads.json\` shows the failure.
- **Not a warning service:** follow IPMA and ANEPC.

## Changelog

- 2026-11-17: this contract written; v1 starts with the sources in the catalogue. No breaking change in v1 so far.
`;
}
