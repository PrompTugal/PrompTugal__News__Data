// Every commit is signed by the agent named in its Agent: trailer, with the SSH key that agent published in team/keys.json,
// and names the Claude-Session: published with that key (Dinis, 18 and 19 Nov 2026: PrompTugal__News__Website
// board/guidance/2026-11-19-signed-commits-paid-search-and-free-embeds.md, section 2). data.b@PrompTugal.dinis.
// Usage: node scripts/check-signatures.mjs <before> <after>   (the pushed range, before..after)
// Commits older than the check (the trusted base's ancestors) are skipped: history is never rewritten.
// security@'s five controls (19 Nov 2026 ~01:30 UTC, board/team/security/reviews/2026-11-19-0130-bar-signing-live-data.md):
// (1) no exemption by name, (2) keys from the parent (a merge: its first parent), (3) every commit in the range, merges
// included, (4) one failure fails the whole range (exit 1; deploy needs the build job), (5) Agent: and the full
// Claude-Session: match the key. Tests: scripts/test-check-signatures.mjs.
// No exemption by author or committer name (anyone can set those; signals.b@'s review, relayed 19 Nov 2026 01:16 UTC); GitHub Actions
// makes no commits in this repository. Keys: each commit is checked against the keys in its PARENT's team/keys.json, so a commit
// cannot add its own key and pass; a new or rotated key is added by a commit signed with a key already listed, or by a person.
// The one bootstrap: the trusted base, the commit that added this file (c243ef7, pinned here by hash), is checked against the
// keys in its own tree, because it published the first key. Controls 6 and 7 (conductor.b@'s relay of videos.b@'s
// pre-review finding, 19 Nov 2026 14:01 UTC, proposed to security@ as numbers 6 and 7):
// (6) a commit with no parent (an orphan) is refused, except the trusted base: an orphan cannot trust the keys in its own tree.
//     Only the trusted base's ancestors are skipped as older than the check; a commit whose tree drops this file is checked
//     like any other (it was skipped before 19 Nov 14:10 UTC).
// (7) this file is run from the last release's copy (git show <before>:scripts/check-signatures.mjs), never from the pushed
//     tree, so a push cannot change the check that judges it: see .github/workflows/pages.yml and scripts/release.sh. A change
//     to this file takes effect from the push after the one that brings it.
// SIGNING_TRUSTED_BASE overrides the pinned hash for scripts/test-check-signatures.mjs's throwaway repositories only; it is
// refused when CI or GITHUB_ACTIONS is set (security@'s low finding, 14:05 UTC), so in CI the base changes only by a reviewed
// commit to this file. Control 6 also refuses a shallow checkout, which cannot tell an orphan from a cut-off history
// (security@'s ruling, 14:02 UTC; CI checks out with fetch-depth 0). Control 8: only the base's ancestors are skipped.
// The keys: team/keys.json entries with an "ssh" block {public_key_pem (Ed25519, SPKI PEM: the only key form the leak scan
// allows there), principals, session_sha256 (first 16 hex of the session id's sha256), from}; a key's "superseded" time
// ends it for commits after that time. Prints OK or lists each failing commit and exits 1.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { createPublicKey, createHash } from 'node:crypto';

const git = (...a) => execFileSync('git', a, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const tryGit = (...a) => { try { return git(...a); } catch (e) { return null; } };
const lines = s => (s ? s.split('\n').filter(Boolean) : []);
const SELF = 'scripts/check-signatures.mjs';

const [beforeArg, afterArg] = process.argv.slice(2);
const after = afterArg || 'HEAD';
const before = beforeArg && !/^0+$/.test(beforeArg) && tryGit('rev-parse', '--verify', '--quiet', `${beforeArg}^{commit}`);
// every commit in the range, merges and side branches included (security@'s control 3, 19 Nov 2026 ~01:30 UTC)
const commits = lines(git('rev-list', before ? `${before}..${after}` : after));

// an Ed25519 SPKI PEM to the OpenSSH line ssh-keygen reads: string "ssh-ed25519", then the 32-byte key, each length-prefixed
const toSsh = pem => { const jwk = createPublicKey(pem).export({ format: 'jwk' }); const len = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b }; const str = b => Buffer.concat([len(b.length), b]);
    // Ed25519 (the first keys) and ECDSA P-256 (the cl-6 team, 26 Nov 2026: P-256 signing keys, made with openssl); any other curve is refused
    if (jwk.kty === 'OKP' && jwk.crv === 'Ed25519') return 'ssh-ed25519 ' + Buffer.concat([str(Buffer.from('ssh-ed25519')), str(Buffer.from(jwk.x, 'base64url'))]).toString('base64');
    if (jwk.kty === 'EC' && jwk.crv === 'P-256') return 'ecdsa-sha2-nistp256 ' + Buffer.concat([str(Buffer.from('ecdsa-sha2-nistp256')), str(Buffer.from('nistp256')), str(Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]))]).toString('base64');
    throw new Error('unsupported key type') };
const sha16 = s => createHash('sha256').update(s).digest('hex').slice(0, 16);
if (process.env.SIGNING_TRUSTED_BASE && (process.env.CI || process.env.GITHUB_ACTIONS)) { console.error('check-signatures: SIGNING_TRUSTED_BASE is for test repositories and is refused in CI'); process.exit(1); }
if (tryGit('rev-parse', '--is-shallow-repository') !== 'false') { console.error('check-signatures: a shallow checkout cannot tell an orphan from a cut-off history; fetch the whole history'); process.exit(1); }
const TRUSTED_BASE = process.env.SIGNING_TRUSTED_BASE || 'c243ef7346eec8e726c0b61532ee8f2e9feddd80';
const base = tryGit('rev-parse', '--verify', '--quiet', `${TRUSTED_BASE}^{commit}`);
if (!base) { console.error(`check-signatures: the trusted base ${TRUSTED_BASE.slice(0, 8)} is not in this repository`); process.exit(1); }
const olderThanCheck = c => c !== base && spawnSync('git', ['merge-base', '--is-ancestor', c, base]).status === 0;
const dir = mkdtempSync(join(tmpdir(), 'sigs-'));
let fileN = 0;
// the keys valid for a commit: those in its parent's team/keys.json (its own, only for the bootstrap commit)
const keysAt = rev => { let j; try { j = JSON.parse(git('show', `${rev}:team/keys.json`)) } catch { return { keys: [], allowed: null } }
    // a key whose published ssh line (ssh_signing.public_key) differs from its PEM block is not used at all
    const keys = (j.keys || []).filter(k => k.ssh && k.ssh.public_key_pem).map(k => { try { return { ...k, sshLine: toSsh(k.ssh.public_key_pem) } } catch { return null } }).filter(k => k && (!k.ssh_signing || !k.ssh_signing.public_key || k.ssh_signing.public_key === k.sshLine))
    const allowed = join(dir, `allowed_signers_${fileN++}`)
    writeFileSync(allowed, keys.flatMap(k => (k.ssh.principals || []).map(p => `${p} namespaces="git" ${k.sshLine}`)).join('\n') + '\n')
    return { keys, allowed } };
// Control 10 (security@, ed70bd996, 19 Nov 2026 ~16:50 UTC): no symlinks. A commit in the range that adds or changes a
// mode-120000 entry fails, read per commit with git diff-tree (not only the final tree), unless its path is in
// symlink-exceptions.json beside this file, which comes from the anchor's tree with the rest of the trusted copy, so an
// exception listed only in the pushed tree does not count: [{ "path": "...", "reason": "..." }], each reviewed by security@.
const EXF = join(dirname(fileURLToPath(import.meta.url)), 'symlink-exceptions.json');
let linkOk = new Map();   // path bytes (hex) -> the pinned target bytes (hex)
if (existsSync(EXF)) { let l; try { l = JSON.parse(readFileSync(EXF, 'utf8')) } catch (e) { console.error(`check-signatures: ${EXF} is not JSON`); process.exit(1) }
  // each exception pins its link's target too (library.b@'s finding, LIB-2026-069), so an excepted link cannot be re-pointed
  if (!Array.isArray(l) || l.some(x => !x || typeof x.path !== 'string' || typeof x.target !== 'string' || typeof x.reason !== 'string' || !x.reason.trim())) { console.error('check-signatures: symlink-exceptions.json must be a list of { path, target, reason }'); process.exit(1) }
  linkOk = new Map(l.map(x => [Buffer.from(x.path).toString('hex'), Buffer.from(x.target).toString('hex')])) }
// paths and link targets read as raw bytes, NUL-separated (-z), and compared byte for byte, so a newline or a name that is
// not valid UTF-8 cannot slip past or collide (events.b@'s 44d5402; library.b@'s LIB-2026-069): ":<modes> <shas> <st>\0<path>\0"
const blob = sha => { try { return execFileSync('git', ['cat-file', 'blob', sha], { stdio: ['ignore', 'pipe', 'pipe'] }) } catch { return null } };
const badLinks = entries => entries.filter(([path, sha]) => { const t = blob(sha); return !(t && linkOk.get(path.toString('hex')) === t.toString('hex')) }).map(([p]) => JSON.stringify(p.toString('latin1')));
const splitZ = buf => { const out = []; let i = 0; for (let j = 0; j < buf.length; j++) if (buf[j] === 0) { out.push(buf.subarray(i, j)); i = j + 1 } return out };
const linksIn = c => { let raw; try { raw = execFileSync('git', ['diff-tree', '-z', '-r', '--raw', '--no-commit-id', '--no-renames', '--root', '-m', c], { stdio: ['ignore', 'pipe', 'pipe'] }) } catch { return ['(diff-tree failed)'] }
  const f = splitZ(raw), found = [];
  for (let i = 0; i < f.length; i++) { const m = /^:\d{6} (\d{6}) [0-9a-f]+ ([0-9a-f]+) [A-Z]\d*$/.exec(f[i].toString('latin1')); if (!m) continue; const p = f[++i]; if (m[1] === '120000') found.push([p, m[2]]) }
  return badLinks(found) };
// the pushed commit's whole tree too, not only what the commits in the range changed (library.b@'s finding)
const linksInTree = c => { let raw; try { raw = execFileSync('git', ['ls-tree', '-r', '-z', '--full-tree', c], { stdio: ['ignore', 'pipe', 'pipe'] }) } catch { return ['(ls-tree failed)'] }
  const found = []; for (const e of splitZ(raw)) { const t = e.indexOf(9); if (t < 0) continue; const m = /^(\d{6}) \w+ ([0-9a-f]+)$/.exec(e.subarray(0, t).toString('latin1')); if (m && m[1] === '120000') found.push([e.subarray(t + 1), m[2]]) }
  return badLinks(found) };
const failures = [];
let checked = 0, skipped = 0;
for (const c of commits) {
    if (olderThanCheck(c)) { skipped++; continue }   // an ancestor of the trusted base
    checked++
    const parent = (git('log', '-1', '--format=%P', c).split(' ')[0] || '').trim();
    const short = c.slice(0, 8);
    if (!parent && c !== base) { failures.push(`${short}: a commit with no parent (an orphan) is refused; only the trusted base may be one`); continue }   // control 6
    const links = linksIn(c); if (links.length) { failures.push(`${short}: adds or changes a symlink (${links.slice(0, 3).join(', ')}); no symlinks unless listed with a reason in the trusted symlink-exceptions.json`); continue }   // control 10
    const { keys, allowed } = keysAt(c === base ? c : parent);   // the parent's keys; the trusted base's own
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
    // the full session URL, compared exactly, where the key's entry publishes one (security@'s control 5 and ruling of
    // 01:20 UTC); entries in older keys files carry only the first 16 hex of the session id's sha256
    const sid = (/(session_[A-Za-z0-9]+)\s*$/.exec(session) || [])[1] || '';
    const sameSession = key.session ? session === key.session : (sid && sha16(sid) === key.ssh.session_sha256);
    if (!sameSession) { failures.push(`${short}: Claude-Session: ${session || '(none)'} is not the session published with the key`); continue }
}
{ const tl = linksInTree(after); if (tl.length) failures.push(`${String(git('rev-parse', '--short', after))}: its tree holds a symlink (${tl.slice(0, 3).join(', ')}) not listed, with its target, in the trusted symlink-exceptions.json`) }   // control 10, the pushed tree
rmSync(dir, { recursive: true, force: true });
if (failures.length) { console.error(`check-signatures: ${failures.length} commit(s) fail\n` + failures.join('\n')); process.exit(1); }
console.log(`OK (${checked} commits checked, ${skipped} older than the check)`);
