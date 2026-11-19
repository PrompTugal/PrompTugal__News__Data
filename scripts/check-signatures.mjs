// Every commit is signed by the agent named in its Agent: trailer, with the SSH key that agent published in team/keys.json,
// and names the Claude-Session: published with that key (Dinis, 18 and 19 Nov 2026: PrompTugal__News__Website
// board/guidance/2026-11-19-signed-commits-paid-search-and-free-embeds.md, section 2). data.b@PrompTugal.dinis.
// Usage: node scripts/check-signatures.mjs <before> <after>   (the pushed range, before..after)
// Commits whose tree does not yet hold this file are older than the check and skipped: history is never rewritten.
// No exemption by author or committer name (anyone can set those; signals.b@'s review, relayed 19 Nov 2026 01:16 UTC); GitHub Actions
// makes no commits in this repository. Keys: each commit is checked against the keys in its PARENT's team/keys.json, so a commit
// cannot add its own key and pass; a new or rotated key is added by a commit signed with a key already listed, or by a person.
// The one bootstrap: the commit that added this file (found from history, which a later push cannot change) is checked against
// the keys in its own tree, because it published the first key.
// The keys: team/keys.json entries with an "ssh" block {public_key_pem (Ed25519, SPKI PEM: the only key form the leak scan
// allows there), principals, session_sha256 (first 16 hex of the session id's sha256), from}; a key's "superseded" time
// ends it for commits after that time. Prints OK or lists each failing commit and exits 1.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createPublicKey, createHash } from 'node:crypto';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryGit = (...a) => { try { return git(...a); } catch (e) { return null; } };
const lines = s => (s ? s.split('\n').filter(Boolean) : []);
const SELF = 'scripts/check-signatures.mjs';

const [beforeArg, afterArg] = process.argv.slice(2);
const after = afterArg || 'HEAD';
const before = beforeArg && !/^0+$/.test(beforeArg) && tryGit('rev-parse', '--verify', '--quiet', `${beforeArg}^{commit}`);
const commits = lines(git('rev-list', '--no-merges', before ? `${before}..${after}` : after));

// an Ed25519 SPKI PEM to the OpenSSH line ssh-keygen reads: string "ssh-ed25519", then the 32-byte key, each length-prefixed
const toSsh = pem => { const x = Buffer.from(createPublicKey(pem).export({ format: 'jwk' }).x, 'base64url'); const t = Buffer.from('ssh-ed25519'); const len = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b }; return 'ssh-ed25519 ' + Buffer.concat([len(t.length), t, len(x.length), x]).toString('base64') };
const sha16 = s => createHash('sha256').update(s).digest('hex').slice(0, 16);
const first = lines(git('log', '--format=%H', '--diff-filter=A', '--reverse', after, '--', SELF))[0] || null;
const dir = mkdtempSync(join(tmpdir(), 'sigs-'));
let fileN = 0;
// the keys valid for a commit: those in its parent's team/keys.json (its own, only for the bootstrap commit)
const keysAt = rev => { let j; try { j = JSON.parse(git('show', `${rev}:team/keys.json`)) } catch { return { keys: [], allowed: null } }
    const keys = (j.keys || []).filter(k => k.ssh && k.ssh.public_key_pem).map(k => { try { return { ...k, sshLine: toSsh(k.ssh.public_key_pem) } } catch { return null } }).filter(Boolean)
    const allowed = join(dir, `allowed_signers_${fileN++}`)
    writeFileSync(allowed, keys.flatMap(k => (k.ssh.principals || []).map(p => `${p} namespaces="git" ${k.sshLine}`)).join('\n') + '\n')
    return { keys, allowed } };
const failures = [];
let checked = 0, skipped = 0;
for (const c of commits) {
    if (tryGit('cat-file', '-e', `${c}:${SELF}`) === null) { skipped++; continue }   // older than the check
    checked++
    const parent = (git('log', '-1', '--format=%P', c).split(' ')[0] || '').trim();
    const { keys, allowed } = keysAt(c === first || !parent ? c : parent);   // the parent's keys; the bootstrap commit's own
    const short = c.slice(0, 8);
    if (!keys.length) { failures.push(`${short}: no published key in its parent's team/keys.json`); continue }
    const agent = git('log', '-1', '--format=%(trailers:key=Agent,valueonly)', c).split('\n')[0].trim();
    const session = git('log', '-1', '--format=%(trailers:key=Claude-Session,valueonly)', c).split('\n')[0].trim();
    // git prints the verdict on stderr, on success as on failure
    const v = spawnSync('git', ['-c', `gpg.ssh.allowedSignersFile=${allowed}`, '-c', 'gpg.ssh.program=ssh-keygen', 'verify-commit', '--raw', c], { encoding: 'utf8' });
    const out = String(v.stderr || '') + String(v.stdout || '');
    const good = /Good "git" signature for (\S+) with \S+ key (SHA256:[A-Za-z0-9+/]+)/.exec(out) || /Good "git" signature for (\S+)/.exec(out);
    if (!good) { failures.push(`${short}: not signed by a key in its parent's team/keys.json`); continue }
    const principal = good[1];
    const key = keys.find(k => (k.ssh.principals || []).includes(principal));
    if (!agent) { failures.push(`${short}: no Agent: trailer`); continue }
    if (!key || !(key.ssh.principals || []).includes(agent)) { failures.push(`${short}: signed by ${principal}, but its Agent: is ${agent}`); continue }
    const time = Number(git('log', '-1', '--format=%ct', c)) * 1000;
    if (key.superseded && time > Date.parse(key.superseded)) { failures.push(`${short}: signed with a key superseded on ${key.superseded}`); continue }
    const sid = (/(session_[A-Za-z0-9]+)\s*$/.exec(session) || [])[1] || '';
    if (!sid || sha16(sid) !== key.ssh.session_sha256) { failures.push(`${short}: Claude-Session: ${session || '(none)'} is not the session published with the key`); continue }
}
rmSync(dir, { recursive: true, force: true });
if (failures.length) { console.error(`check-signatures: ${failures.length} commit(s) fail\n` + failures.join('\n')); process.exit(1); }
console.log(`OK (${checked} commits checked, ${skipped} older than the check)`);
