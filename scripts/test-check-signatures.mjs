#!/usr/bin/env node
// Tests for scripts/check-signatures.mjs against security@'s five controls and the proposed 6 and 7 (orphans; run from the trusted copy) (19 Nov 2026 ~01:30 UTC,
// PrompTugal__News__Website board/team/security/reviews/2026-11-19-0130-bar-signing-live-data.md).
// Builds throwaway repositories in a temporary folder with throwaway keys made for the test and deleted after;
// no key of any agent is read. Prints OK or the failing cases and exits 1. data.b@PrompTugal.dinis.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, copyFileSync, mkdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const CHECK = join(dirname(fileURLToPath(import.meta.url)), 'check-signatures.mjs');
const tmp = mkdtempSync(join(tmpdir(), 'sigtest-'));
const AGENT = 'tester@Example.test', SESSION = 'https://claude.ai/code/session_0TestSessionAbcdef01234';
const results = [];
// the checks run here without CI's variables, since the check refuses SIGNING_TRUSTED_BASE under CI
const noCI = Object.fromEntries(Object.entries(process.env).filter(([k]) => k !== 'CI' && k !== 'GITHUB_ACTIONS'));

const newKey = name => {
  const f = join(tmp, name);
  execFileSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', '', '-f', f]);
  const line = readFileSync(f + '.pub', 'utf8').trim().split(/\s+/).slice(0, 2).join(' ');
  const raw = Buffer.from(line.split(' ')[1], 'base64').subarray(-32);
  const der = Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), raw]);
  const D = '-'.repeat(5);   // built from parts, as in leak-scan.mjs, so this file holds no key header
  const pem = `${D}BEGIN PUBLIC KEY${D}\n${der.toString('base64')}\n${D}END PUBLIC KEY${D}\n`;
  return { f, line, pem };
};
const entry = (id, k, extra = {}) => ({ id, agent: AGENT, session: SESSION, ssh: { public_key_pem: k.pem, principals: [AGENT] }, ssh_signing: { public_key: k.line }, ...extra });

function repo(name) {
  const d = join(tmp, name); mkdirSync(d);
  const g = (...a) => execFileSync('git', a, { cwd: d, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  g('init', '-q', '-b', 'main'); g('config', 'user.name', 'tester'); g('config', 'user.email', 'tester@example.test');
  // the machine's global git config may name another signer; the test repos sign with ssh-keygen and the throwaway keys
  g('config', 'gpg.format', 'ssh'); g('config', 'gpg.ssh.program', 'ssh-keygen'); g('config', 'commit.gpgsign', 'false');
  mkdirSync(join(d, 'scripts')); mkdirSync(join(d, 'team'));
  copyFileSync(CHECK, join(d, 'scripts', 'check-signatures.mjs'));
  const commit = (msg, { key, agent = AGENT, session = SESSION, files = {}, author } = {}) => {
    for (const [p, c] of Object.entries(files)) writeFileSync(join(d, p), c);
    g('add', '-A');
    const args = ['-c', 'gpg.format=ssh', ...(key ? ['-c', `user.signingkey=${key.f}`] : []), 'commit', '-q', '--allow-empty', ...(key ? ['-S'] : ['--no-gpg-sign']), ...(author ? ['--author', author] : []), '-m', msg, '-m', `Agent: ${agent}\nClaude-Session: ${session}`];
    g(...args); return g('rev-parse', 'HEAD');
  };
  // the trusted base is the range's start in every case here (SIGNING_TRUSTED_BASE, for test repositories only)
  const check = (before, after, script = 'scripts/check-signatures.mjs') => spawnSync('node', [script, before, after], { cwd: d, encoding: 'utf8', env: { ...noCI, SIGNING_TRUSTED_BASE: g('rev-parse', before) } });
  // control 7: run the check from the trusted base's copy, as CI and release.sh do
  const checkFromBase = (before, after) => { const f = join(tmp, `${name}-trusted.mjs`); writeFileSync(f, g('show', `${before}:scripts/check-signatures.mjs`) + '\n'); return check(before, after, f); };
  return { d, g, commit, check, checkFromBase };
}
// a failing case passes only when the check fails for the expected reason
const expect = (name, r, ok, why) => { const out = (r.stdout + r.stderr).trim(); results.push({ name, pass: (r.status === 0) === ok && (!why || out.includes(why)), out: out.split('\n').slice(0, 3).join(' | ') }); };

const A = newKey('a'), B = newKey('b');
const keysWith = (...e) => JSON.stringify({ keys: e }, null, 1);

// base: the bootstrap commit adds the check and key A, signed with A
const setup = name => { const r = repo(name); const base = r.commit('bootstrap', { key: A, files: { 'team/keys.json': keysWith(entry('a', A)) } }); return { ...r, base }; };

{ const r = setup('good'); r.commit('good', { key: A, files: { 'x.txt': '1' } }); expect('a signed commit with matching Agent and full session passes', r.check(r.base, 'HEAD'), true); }
{ const r = setup('unsigned'); r.commit('unsigned', { files: { 'x.txt': '1' } }); expect('(1) an unsigned commit fails', r.check(r.base, 'HEAD'), false, 'not signed by a key'); }
{ const r = setup('botname'); r.commit('bot', { files: { 'x.txt': '1' }, author: 'github-actions[bot] <41898282+github-actions[bot]@users.noreply.github.com>', agent: 'github-actions' }); expect('(1) a commit named as a bot is not exempt', r.check(r.base, 'HEAD'), false, 'not signed by a key'); }
{ const r = setup('selfkey'); r.commit('adds key B and signs with it', { key: B, files: { 'team/keys.json': keysWith(entry('a', A), entry('b', B)) } }); expect('(2) a commit that adds its own key does not pass on it', r.check(r.base, 'HEAD'), false, 'not signed by a key'); }
{ const r = setup('rotated'); r.commit('adds key B, signed with A', { key: A, files: { 'team/keys.json': keysWith(entry('a', A), entry('b', B)) } }); r.commit('signed with B', { key: B, files: { 'x.txt': '2' } }); expect('(2) a key added by a commit signed with a listed key is used from the next commit', r.check(r.base, 'HEAD'), true); }
{ const r = setup('merge'); r.g('checkout', '-q', '-b', 'side'); r.commit('side, signed', { key: A, files: { 's.txt': '1' } }); r.g('checkout', '-q', 'main'); r.commit('main, signed', { key: A, files: { 'm.txt': '1' } });
  r.g('-c', 'core.editor=true', 'merge', '-q', '--no-gpg-sign', '--no-ff', '-m', 'merge', '-m', `Agent: ${AGENT}\nClaude-Session: ${SESSION}`, 'side'); expect('(3) an unsigned merge commit fails', r.check(r.base, 'HEAD'), false, 'not signed by a key'); }
{ const r = setup('sidebranch'); r.g('checkout', '-q', '-b', 'side'); r.commit('side, unsigned', { files: { 's.txt': '1' } }); r.g('checkout', '-q', 'main'); r.commit('main, signed', { key: A, files: { 'm.txt': '1' } });
  r.g('-c', 'gpg.format=ssh', '-c', `user.signingkey=${A.f}`, 'merge', '-q', '-S', '--no-ff', '-m', 'merge', '-m', `Agent: ${AGENT}\nClaude-Session: ${SESSION}`, 'side'); expect('(3) an unsigned commit on a merged side branch fails', r.check(r.base, 'HEAD'), false, 'not signed by a key'); }
{ const r = setup('onebad'); r.commit('good 1', { key: A, files: { 'x.txt': '1' } }); r.commit('bad', { files: { 'x.txt': '2' } }); r.commit('good 2', { key: A, files: { 'x.txt': '3' } }); expect('(4) one bad commit among good ones fails the range', r.check(r.base, 'HEAD'), false, '1 commit(s) fail'); }
{ const r = setup('agent'); r.commit('wrong agent', { key: A, agent: 'someone@Example.test', files: { 'x.txt': '1' } }); expect('(5) an Agent: that is not the key\'s agent fails', r.check(r.base, 'HEAD'), false, 'but its Agent: is'); }
{ const r = setup('session'); r.commit('other session', { key: A, session: 'https://claude.ai/code/session_0OtherSessionAbcdef9876', files: { 'x.txt': '1' } }); expect('(5) a Claude-Session: other than the key\'s fails', r.check(r.base, 'HEAD'), false, 'is not the session published'); }
{ const r = setup('sessionprefix'); r.commit('session with extra text', { key: A, session: SESSION + 'x', files: { 'x.txt': '1' } }); expect('(5) the session is compared exactly, not as a prefix', r.check(r.base, 'HEAD'), false, 'is not the session published'); }
{ const r = repo('mismatch'); const base = r.commit('bootstrap', { key: A, files: { 'team/keys.json': keysWith({ ...entry('a', A), ssh_signing: { public_key: B.line } }) } }); r.commit('signed with A', { key: A, files: { 'x.txt': '1' } }); expect('a key whose ssh line differs from its PEM is not used', r.check(base, 'HEAD'), false, 'no published key'); }
{ const r = setup('orphan'); r.g('checkout', '-q', '--orphan', 'o'); r.commit('orphan trusting its own key B', { key: B, files: { 'team/keys.json': keysWith(entry('b', B)) } }); r.g('checkout', '-q', 'main');
  r.g('-c', 'gpg.format=ssh', '-c', `user.signingkey=${A.f}`, 'merge', '-q', '-S', '--no-ff', '--allow-unrelated-histories', '-X', 'ours', '-m', 'merge', '-m', `Agent: ${AGENT}\nClaude-Session: ${SESSION}`, 'o');
  expect('(6) an orphan commit merged in is refused, even signed with the key in its own tree', r.check(r.base, 'HEAD'), false, 'no parent (an orphan)'); }
{ const r = setup('dropcheck'); r.g('rm', '-q', 'scripts/check-signatures.mjs'); r.commit('drops the check and adds a change, unsigned', { files: { 'x.txt': '1' } }); expect('(8) a commit that removes the check and adds an unsigned change fails', r.checkFromBase(r.base, 'HEAD'), false, 'not signed by a key'); }
{ const r = setup('swapcheck'); r.commit('replaces the check, unsigned', { files: { 'scripts/check-signatures.mjs': 'console.log("OK")\n' } });
  expect('(7) a push that replaces the check is judged by the trusted base\'s copy', r.checkFromBase(r.base, 'HEAD'), false, 'not signed by a key'); }
{ const r = setup('ci-override'); r.commit('good', { key: A, files: { 'x.txt': '1' } });
  const v = spawnSync('node', ['scripts/check-signatures.mjs', r.base, 'HEAD'], { cwd: r.d, encoding: 'utf8', env: { ...noCI, CI: 'true', SIGNING_TRUSTED_BASE: r.base } });
  expect('the trusted-base override is refused under CI', v, false, 'refused in CI'); }
{ const r = setup('shallow'); r.commit('good', { key: A, files: { 'x.txt': '1' } }); r.commit('good 2', { key: A, files: { 'x.txt': '2' } });
  const s = join(tmp, 'shallow-clone'); execFileSync('git', ['clone', '-q', '--depth', '1', `file://${r.d}`, s]);
  const v = spawnSync('node', ['scripts/check-signatures.mjs', 'HEAD', 'HEAD'], { cwd: s, encoding: 'utf8', env: { ...noCI, SIGNING_TRUSTED_BASE: r.base } });
  expect('(6) a shallow checkout is refused', v, false, 'shallow checkout'); }
const check = (r, before, after, script) => r.check(before, after, script);
// scripts/trusted-checks.sh (control 7, security@'s fourth ruling, ~14:17 UTC): the anchor and where the checks come from
const TRUST = join(dirname(CHECK), 'trusted-checks.sh');
const outOf = r => join(tmp, `${r.d.split('/').pop()}-out`);
const trustRun = (r, before, after) => spawnSync('bash', [TRUST, before, after, join(tmp, `${r.d.split('/').pop()}-out`)], { cwd: r.d, encoding: 'utf8', env: noCI });
const withChecks = name => { const r = setup(name); r.commit('adds the other checks', { key: A, files: { 'scripts/check-commits.mjs': '//\n', 'scripts/leak-scan.mjs': '//\n' } }); return r; };
{ const r = withChecks('trust-ok'); const b = r.g('rev-parse', 'HEAD'); r.commit('next', { key: A, files: { 'x.txt': '1' } }); const v = trustRun(r, b, 'HEAD');
  results.push({ name: '(7) the checks come from the anchor', pass: v.status === 0 && v.stdout.trim() === b, out: (v.stdout + v.stderr).trim() }); }
{ const r = setup('trust-missing'); r.commit('next', { key: A, files: { 'x.txt': '1' } }); expect('(7) a trusted commit with no copy of a check fails', trustRun(r, r.base, 'HEAD'), false, 'has no copy of scripts/check-commits.mjs'); }
{ const r = withChecks('trust-zero'); expect('(7) a zero anchor fails', trustRun(r, '0'.repeat(40), 'HEAD'), false, 'a zero id'); }
{ const r = withChecks('trust-force'); const old = r.commit('later dropped', { key: A, files: { 'x.txt': '1' } }); r.g('reset', '-q', '--hard', 'HEAD~1'); r.commit('rewritten', { key: A, files: { 'x.txt': '2' } });
  expect('(7) an anchor that is not an ancestor of the pushed commit fails', trustRun(r, old, 'HEAD'), false, 'force push'); }
{ const r = withChecks('trust-none'); expect('(7) a missing anchor fails', trustRun(r, '', 'HEAD'), false, 'no anchor'); }
{ const r = withChecks('dropped'); const anchor = r.g('rev-parse', 'HEAD'); r.commit('from a dropped run, unsigned', { files: { 'x.txt': '1' } });
  r.commit('the push before this one, signed', { key: A, files: { 'x.txt': '2' } }); r.commit('this push, signed', { key: A, files: { 'x.txt': '3' } });
  const t = trustRun(r, anchor, 'HEAD'); const v = check(r, anchor, 'HEAD', join(outOf(r), 'check-signatures.mjs'));
  expect('(7) an unsigned commit from a dropped run (between the anchor and the push before) fails', t.status === 0 ? v : t, false, 'not signed by a key'); }
{ const r = withChecks('tagged'); const anchor = r.g('rev-parse', 'HEAD'); r.commit('unverified, weakens the check', { files: { 'scripts/check-signatures.mjs': 'console.log("OK")\n' } }); r.g('tag', 'v0.1.999');
  const t = trustRun(r, anchor, 'HEAD');
  results.push({ name: '(7) a pushed tag on an unverified commit is not used', pass: t.status === 0 && t.stdout.trim() === anchor && !readFileSync(join(outOf(r), 'check-signatures.mjs'), 'utf8').startsWith('console.log'), out: (t.stdout + t.stderr).trim() }); }
{ const r = setup('backdated'); r.g('checkout', '-q', '--orphan', 'o');
  const env0 = { GIT_AUTHOR_DATE: '2001-01-01T00:00:00Z', GIT_COMMITTER_DATE: '2001-01-01T00:00:00Z' }; Object.assign(process.env, env0);
  r.commit('backdated orphan, signed with its own key B', { key: B, files: { 'team/keys.json': keysWith(entry('b', B)) } }); for (const k of Object.keys(env0)) delete process.env[k];
  r.g('checkout', '-q', 'main');
  r.g('-c', 'gpg.format=ssh', '-c', `user.signingkey=${A.f}`, 'merge', '-q', '-S', '--no-ff', '--allow-unrelated-histories', '-X', 'ours', '-m', 'merge', '-m', `Agent: ${AGENT}\nClaude-Session: ${SESSION}`, 'o');
  expect('(8) a backdated orphan merged in fails (skips go by ancestry, never by date)', r.check(r.base, 'HEAD'), false, 'no parent (an orphan)'); }

rmSync(tmp, { recursive: true, force: true });
const bad = results.filter(r => !r.pass);
for (const r of results) console.log(`${r.pass ? 'pass' : 'FAIL'}  ${r.name}${r.pass ? '' : `  [${r.out}]`}`);
if (bad.length) { console.error(`test-check-signatures: ${bad.length} of ${results.length} failed`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
