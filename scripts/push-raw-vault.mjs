// Push new raw reads to the PUBLIC raw-history vault (zqyku8mc), with the split enforced, not only built (Dinis, 21 Nov 2026
// about 15:37 UTC, PrompTugal__News__Website board/guidance/2026-11-21-private-vault-kept.md, follow-up 1: "a check in the push
// to the public vault that refuses any file from contracts-finder or events-pt (deny by source, failing closed)").
//
//   node scripts/push-raw-vault.mjs [--dry-run]
//
// 1. Copies vaults/<source>/ into the public vault's working copy for every source that has a card, is not denied and is a
//    plain folder (no symlinks).
// 2. Then checks the WHOLE working copy, whatever put it there, and refuses (exit 1, nothing committed or pushed) if any path
//    sits under a denied source, any top-level folder is not a known, allowed source (fail closed: an unknown folder is
//    refused, not assumed fine), or any entry is a symlink.
// 3. Only then commits and pushes with sgit, the access token read from SG_SEND_ACCESS_TOKEN and never printed.
// Output is masked: no key or token is ever printed. data.b@PrompTugal.dinis.
import { readdirSync, lstatSync, existsSync, mkdirSync, copyFileSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { homedir } from 'node:os';
import { spawnSync } from 'node:child_process';

const DENY = new Set(['contracts-finder', 'events-pt']);   // their raw pages hold contact details: the private vault only
const SRC = 'vaults';
const DEST = join(homedir(), 'vaults', 'promptugal-data-raw-history');
const VAULT_ID = 'zqyku8mc';
const ALLOWED_TOP_FILES = new Set(['README.md']);
const dry = process.argv.includes('--dry-run');
const mask = s => String(s).replace(/sgit_[a-z_]+[0-9a-f]+/g, '[masked]').replace(/[0-9a-f]{24,}/g, '[masked]');
const fail = m => { console.error('REFUSED: ' + m); process.exit(1); };

const cards = new Set(readdirSync('sources').filter(d => existsSync(join('sources', d, 'card.json'))));
if (!existsSync(join(DEST, '.sg_vault'))) fail(`no vault working copy at ${DEST}`);
{ const info = spawnSync('sgit', ['vault', 'info'], { cwd: DEST, encoding: 'utf8' }); if (!String(info.stdout).includes(`Vault ID:    ${VAULT_ID}`)) fail(`the working copy at ${DEST} is not vault ${VAULT_ID}`); }

// 1. copy (new and changed files only)
let copied = 0;
const copyTree = (from, to) => {
  for (const e of readdirSync(from)) {
    const a = join(from, e), b = join(to, e), st = lstatSync(a);
    if (st.isSymbolicLink()) fail(`symlink in the source copy: ${a}`);
    if (st.isDirectory()) { mkdirSync(b, { recursive: true }); copyTree(a, b); }
    else if (st.isFile()) { if (!existsSync(b) || lstatSync(b).size !== st.size || !readFileSync(a).equals(readFileSync(b))) { if (!dry) copyFileSync(a, b); copied++; } }
  }
};
for (const d of readdirSync(SRC)) {
  if (DENY.has(d)) continue;
  if (!cards.has(d)) { console.log(`skipped ${d}: no source card`); continue; }
  if (!lstatSync(join(SRC, d)).isDirectory()) continue;
  if (!dry) mkdirSync(join(DEST, d), { recursive: true });
  copyTree(join(SRC, d), join(DEST, d));
}

// 2. the check, over the whole working copy (fail closed)
const bad = [];
const walk = dir => {
  for (const e of readdirSync(dir)) {
    if (dir === DEST && e === '.sg_vault') continue;
    const p = join(dir, e), rel = relative(DEST, p), top = rel.split('/')[0], st = lstatSync(p);
    if (st.isSymbolicLink()) { bad.push(`symlink: ${rel}`); continue; }
    if (DENY.has(top) || rel.split('/').some(x => DENY.has(x))) { bad.push(`denied source: ${rel}`); continue; }
    if (dir === DEST && st.isFile() && !ALLOWED_TOP_FILES.has(e)) { bad.push(`unknown top-level file: ${rel}`); continue; }
    if (dir === DEST && st.isDirectory() && !cards.has(e)) { bad.push(`unknown top-level folder: ${rel}`); continue; }
    if (st.isDirectory()) walk(p);
  }
};
walk(DEST);
if (bad.length) fail(`${bad.length} path(s) may not go to the public vault:\n  ` + bad.slice(0, 20).join('\n  '));
console.log(`check OK: no path from ${[...DENY].join(' or ')}, no unknown folder, no symlink. ${copied} file(s) ${dry ? 'would be' : ''} copied.`);
if (dry) process.exit(0);

// 3. commit and push
const run = args => { const r = spawnSync('sgit', args, { cwd: DEST, encoding: 'utf8', env: process.env }); return { code: r.status, out: mask((r.stdout || '') + (r.stderr || '')) }; };
const st = run(['status']);
if (/nothing to commit|no changes|clean/i.test(st.out) && !copied) { console.log('nothing new to push'); process.exit(0); }
const at = new Date().toISOString().replace(/\.\d+Z$/, 'Z');
const c = run(['commit', '-m', `data.b@PrompTugal.dinis: raw reads to ${at}`]);
if (c.code !== 0 && !/nothing to commit/i.test(c.out)) fail('sgit commit failed: ' + c.out.split('\n').slice(-3).join(' '));
if (!process.env.SG_SEND_ACCESS_TOKEN) fail('SG_SEND_ACCESS_TOKEN is not set');
const p = run(['push', '--token', process.env.SG_SEND_ACCESS_TOKEN]);
if (p.code !== 0) fail('sgit push failed: ' + p.out.split('\n').slice(-3).join(' '));
console.log(`pushed to ${VAULT_ID} at ${at}: ${(p.out.match(/commit obj-[a-z0-9-]+/) || ['(commit id not shown)'])[0]}`);
