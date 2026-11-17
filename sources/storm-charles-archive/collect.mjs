// The Storm Charles archive: every data file storm-charles.promptugal.news lists in its api/v1/index.json, read once,
// each checked against the sha256 the catalogue states. Code, no model.
//   node sources/storm-charles-archive/collect.mjs     (from the repository root; about 6 minutes, 2.5 s between requests)
// Writes sources/storm-charles-archive/manifest.json (kept in git: small, and the archive does not change) and the bytes to
// vaults/storm-charles-archive/<incident>/<path> for the source's vault. Also usable from collect/run.mjs by name.
import fs from 'node:fs'
import path from 'node:path'
import { ROOT, readJson, writeJson, sha256 } from '../../collect/lib.mjs'
import { Run } from '../../collect/lib.mjs'
const SITE = 'https://storm-charles.promptugal.news/'
// a series is the files one dataset is split into by place, date or hour: the path with those parts taken out
const datasetOf = p => p.replace(/\/\d{4}-\d{2}-\d{2}\/\d{2}\.json$/, '').replace(/\/(lisbon|funchal)$/, '').replace(/\/[a-z-]+-(close-)?\d{4}-\d{2}-\d{2}\.json$/, '').replace(/^decisions\/entities\/.*$/, 'decisions/entities').replace(/\.json$/, '')
export default async function collect(run) {
    const idx = await run.get('index', SITE + 'api/v1/index.json')
    const cat = idx.ok ? idx.json() : null
    if (!cat) return null
    const files = []
    const vdir = path.join(ROOT, 'vaults', run.id)
    for (const d of cat.datasets) {
        const r = await run.get(`file:${d.url}`, SITE + d.url)
        const ok = r.ok && r.sha256 === d.sha256
        if (r.ok) { const f = path.join(vdir, d.incident, d.path); fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, r.bytes) }
        files.push({ incident: d.incident, path: d.path, dataset: datasetOf(d.path), url: SITE + d.url, bytes: d.bytes, sha256_prefix: d.sha256.slice(0, 16), status: r.status, verified: ok, about: d.about, _full: { stated: d.sha256, read: r.sha256 } })
    }
    run.raw = []   // the bytes are written above in their own layout, not as latest/ copies
    fs.mkdirSync(vdir, { recursive: true }); fs.writeFileSync(path.join(vdir, 'index.json'), idx.bytes)
    const datasets = {}
    for (const f of files) { const k = f.dataset; datasets[k] ||= { dataset: k, files: 0, bytes: 0 }; datasets[k].files++; datasets[k].bytes += f.bytes }
    const manifest = { source: run.id, title: run.card.title, read_at: run.started, provenance: run.prov({ source: SITE + 'api/v1/index.json' }),
        about: 'Every data file storm-charles.promptugal.news listed in its catalogue (api/v1/index.json) on the day it was archived. verified is true when the full sha256 of the bytes we received equals the one the catalogue states; here each is shown by its first 16 hex (sha256_prefix), and the full hashes are in the vault (manifest-full.json). The bytes are in the source\'s vault, at <incident>/<path>. The storm site keeps its own addresses (its api/v1 contract); this is a second, hashed copy.',
        catalogue: { version: cat.version, built_at: cat.built_at, sha256_prefix: idx.sha256.slice(0, 16), api: cat.api, contract: cat.contract, licence: cat.licence, incidents: cat.incidents },
        counts: { files: files.length, verified: files.filter(f => f.verified).length, bytes: files.reduce((s, f) => s + f.bytes, 0), datasets: Object.keys(datasets).length },
        datasets: Object.values(datasets).sort((a, b) => a.dataset.localeCompare(b.dataset)), files }
    writeJson(path.join(vdir, 'manifest-full.json'), { ...manifest, files: files.map(({ _full, ...f }) => ({ ...f, sha256: _full.stated, read_sha256: _full.read })) })
    for (const f of files) delete f._full
    writeJson(path.join(ROOT, 'sources', run.id, 'manifest.json'), manifest)
    return manifest
}
if (import.meta.url === `file://${process.argv[1]}`) {
    const card = readJson(path.join(ROOT, 'sources/storm-charles-archive/card.json'))
    const run = new Run(card.id, card)
    const m = await collect(run)
    run.finish(m)
    console.log(m ? `storm-charles-archive: ${m.counts.verified}/${m.counts.files} files verified, ${m.counts.datasets} datasets, ${m.counts.bytes} bytes` : 'storm-charles-archive: the catalogue could not be read')
}
