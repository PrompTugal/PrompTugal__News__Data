#!/usr/bin/env node
// Push what the collectors wrote under vaults/<id>/ to each source's sgit vault. Code, no model.
//   node collect/vault-push.mjs                 every source with a key
//   node collect/vault-push.mjs ipma-uv         only these
// Keys: DATA_VAULT_KEYS (a JSON object {"<source id>": "<vault key>"}) or DATA_VAULT_KEYS_FILE (a file holding that JSON),
// and SG_SEND_ACCESS_TOKEN. All read from the environment only, never printed, logged or written: sgit's own output is
// not shown, only whether each push worked. A source without a key is skipped and said so.
// How: a clone without a working copy (sgit clone --no-checkout, the key on stdin), then one atomic sgit write of every
// file under vaults/<id>/ with --push. A vault must already have one commit (an empty vault cannot be cloned).
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { execFileSync } from 'node:child_process'
import { ROOT, readJson } from './lib.mjs'

const BASE = process.env.SG_SEND_BASE_URL || 'https://dev.send.sgraph.ai'
const keys = process.env.DATA_VAULT_KEYS ? JSON.parse(process.env.DATA_VAULT_KEYS) : process.env.DATA_VAULT_KEYS_FILE ? JSON.parse(fs.readFileSync(process.env.DATA_VAULT_KEYS_FILE, 'utf8')) : {}
const token = process.env.SG_SEND_ACCESS_TOKEN
if (!token || !Object.keys(keys).length) { console.log('vault-push: no SG_SEND_ACCESS_TOKEN or no vault keys in the environment: nothing pushed (the site is still built and deployed)'); process.exit(0) }
const only = process.argv.slice(2)
const walk = d => fs.existsSync(d) ? fs.readdirSync(d, { withFileTypes: true }).flatMap(e => e.name === '.sg_vault' ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]) : []
let failed = 0
for (const id of Object.keys(keys).filter(k => !only.length || only.includes(k)).sort()) {
    const src = path.join(ROOT, 'vaults', id), files = walk(src)
    if (!files.length) { console.log(`${id}: nothing to push`); continue }
    const card = readJson(path.join(ROOT, 'sources', id, 'card.json'), {})
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), `vault-${id}-`)), dir = path.join(tmp, 'v')
    const quiet = { stdio: ['pipe', 'ignore', 'ignore'], cwd: tmp }
    try {
        execFileSync('sgit', ['clone', '--base-url', BASE, '--token', token, '--no-checkout', '-', dir], { ...quiet, input: keys[id] + '\n' })
        const rel = files.map(f => path.relative(src, f))
        const args = ['write', rel[0], '--file', files[0], ...rel.slice(1).flatMap((r, i) => ['--also', `${r}:${files[i + 1]}`]), '--message', `${card.owner || 'data@PrompTugal.dinis'}: ${id}, ${files.length} files from collect/run.mjs (code, no model)`, '--push']
        execFileSync('sgit', args, { stdio: ['ignore', 'ignore', 'ignore'], cwd: dir })
        console.log(`${id}: pushed ${files.length} files to vault ${card.vault?.id || '(id in card.json)'}`)
    } catch (e) { failed++; console.log(`${id}: push failed (exit ${e.status ?? '?'}; sgit's output is not shown because it can hold the key)`) }
    finally { fs.rmSync(tmp, { recursive: true, force: true }) }
}
process.exit(failed ? 1 : 0)
