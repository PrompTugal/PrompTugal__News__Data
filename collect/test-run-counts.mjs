// Test: how a run counts good and failed reads. A 404 on a robots.txt is "no rules", not a failure; other refusals still fail.
// Run: node collect/test-run-counts.mjs   (no network, writes only to a temporary directory)
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { Run } from './lib.mjs'

let bad = 0
const check = (name, cond) => { console.log((cond ? 'pass  ' : 'FAIL  ') + name); if (!cond) bad++ }
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'run-counts-'))
const card = { source_home: 'https://example.test/', reader_page: 'https://example.test/', owner: 'test', terms: { summary: 'test' } }
const run = new Run('t', card)
const add = (name, status) => run.reads.push({ name, url: 'https://example.test/' + name, at: run.started, status, bytes: 0, sha256: null })
add('site-robots', 404)        // no robots.txt: no rules
add('services-robots', 200)    // robots.txt present
add('events-p1', 403)          // a real refusal
add('latest', 200)
add('search', 429)             // a real refusal
add('timeout-robots', 'error') // a robots.txt that could not be read is still a failure
const out = run.finish({ ok: true }, { data: path.join(tmp, 'data'), vaults: path.join(tmp, 'vaults') })
check('404 on robots.txt is marked no_rules', out.reads.find(x => x.name === 'site-robots').no_rules === true)
check('200 on robots.txt is not marked no_rules', !out.reads.find(x => x.name === 'services-robots').no_rules)
check('403 is not marked no_rules', !out.reads.find(x => x.name === 'events-p1').no_rules)
check('an unreadable robots.txt is not marked no_rules', !out.reads.find(x => x.name === 'timeout-robots').no_rules)
check('ok counts the 200s and the no-rules 404 (3 of 6)', out.ok === 3)
check('failed counts the 403, the 429 and the unreadable robots.txt (3 of 6)', out.failed === 3)
check('ok + failed is the number of reads', out.ok + out.failed === out.reads.length)
fs.rmSync(tmp, { recursive: true, force: true })
console.log(bad ? `FAILED: ${bad}` : `OK (7 cases)`)
process.exit(bad ? 1 : 0)
