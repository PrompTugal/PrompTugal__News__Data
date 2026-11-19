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
  const checkFromBase = (before, after) => { const td = join(tmp, `${name}-trusted`); mkdirSync(td, { recursive: true }); const f = join(td, 'check-signatures.mjs'); writeFileSync(f, g('show', `${before}:scripts/check-signatures.mjs`) + '\n');
    try { writeFileSync(join(td, 'symlink-exceptions.json'), g('show', `${before}:scripts/symlink-exceptions.json`) + '\n') } catch {} return check(before, after, f); };
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
{ const r = withChecks('symlink'); r.g('rm', '-q', 'scripts/leak-scan.mjs'); execFileSync('ln', ['-s', '/etc/hostname', join(r.d, 'scripts', 'leak-scan.mjs')]); const anchor = r.commit('a symlink on a checker path', { key: A });
  expect('(9) a symlink on a checker path is refused', trustRun(r, anchor, 'HEAD'), false, 'not a plain file'); }
// control 9, read from this repository's workflow with every comment removed first, so no comment can satisfy it
// (library.b@'s finding, LIB-2026-067): the verify job runs no pushed code and reads no GITHUB_ENV or GITHUB_PATH; deploy
// needs it; the site is unpacked, after its listing is vetted, before the trusted folder is written (events.b@'s finding)
{ const wf = readFileSync(join(dirname(CHECK), '..', '.github', 'workflows', 'pages.yml'), 'utf8').split('\n').filter(l => !/^\s*#/.test(l)).map(l => l.replace(/\s+#\s.*$/, '')).join('\n');
  const job = (wf.split('\n  verify:\n')[1] || '').split(/\n  [a-z-]+:\n/)[0];
  const lines = job.split('\n');
  const pushed = lines.filter(l => /(^|[\s;&|(])(node|bash|sh|"\$NODE")\s+(\.\/)?(scripts|collect|src|sources)\//.test(l) || /GITHUB_ENV|GITHUB_PATH/.test(l));
  const at = re => lines.findIndex(l => re.test(l));
  const vet = at(/tar -tvf/), unpack = at(/tar --no-same-owner/), trusted = at(/trusted-checks\.sh"? >|show .*trusted-checks\.sh/);
  const deployNeeds = /\n  deploy:\n    needs: \[[^\]\n]*\bverify\b[^\]\n]*\]/.test(wf);
  results.push({ name: '(9) the verify job runs no pushed code and reads no GITHUB_ENV, and deploy needs it', pass: job.length > 0 && pushed.length === 0 && deployNeeds, out: pushed.join(' | ') || (job ? 'deploy does not need verify' : 'no verify job') });
  results.push({ name: '(9) the site is unpacked, after its listing is vetted, before any trusted copy is written', pass: vet >= 0 && unpack > vet && trusted > unpack, out: `vet ${vet}, unpack ${unpack}, trusted ${trusted}` });
  // live.b@'s findings (a4c6fce): a pushed _site is refused and pushed .gitattributes removed before the unpack; the anchor
  // run must have the job named verify passed; verify, deploy and tag run only for refs/heads/dev
  const siteRefused = at(/ls-tree --name-only HEAD _site/), attrs = at(/-name \.gitattributes .*rm -f/);
  results.push({ name: '(9) a pushed _site is refused and pushed .gitattributes removed, before the site is unpacked', pass: siteRefused >= 0 && attrs >= 0 && siteRefused < unpack && attrs < unpack, out: `site ${siteRefused}, attrs ${attrs}, unpack ${unpack}` });
  results.push({ name: '(7) the anchor is a run whose job named verify passed', pass: lines.some(l => /actions\/runs\/.*\/jobs/.test(l)) && lines.some(l => /\.name == "verify" and \.conclusion == "success"/.test(l)), out: 'no jobs check in the verify job' });
  const ifOf = name => ((wf.split(`\n  ${name}:\n`)[1] || '').split(/\n  [a-z-]+:\n/)[0].match(/\n    if: ([^\n]+)/) || [])[1] || '';
  results.push({ name: 'verify, deploy and tag run only for refs/heads/dev', pass: ['verify', 'deploy', 'tag'].every(j => ifOf(j).includes("github.ref == 'refs/heads/dev'")), out: ['verify', 'deploy', 'tag'].map(j => `${j}: ${ifOf(j)}`).join(' | ') }); }
// cyber.b@'s finding (4dd8500): a quoting slip in a workflow step breaks the run, so every run: block is syntax-checked
// with bash -n (GitHub's ${{ }} expressions are left as text, which bash -n accepts)
{ const raw = readFileSync(join(dirname(CHECK), '..', '.github', 'workflows', 'pages.yml'), 'utf8').split('\n');
  const blocks = [];
  for (let i = 0; i < raw.length; i++) {
    const m = /^(\s*)(?:- )?run: (.*)$/.exec(raw[i]); if (!m) continue;
    if (m[2].trim() === '|') { const ind = raw[i + 1]?.match(/^\s*/)[0].length || 0; const body = []; let j = i + 1;
      for (; j < raw.length && (raw[j].trim() === '' || raw[j].match(/^\s*/)[0].length >= ind); j++) body.push(raw[j].slice(ind)); blocks.push({ line: i + 1, text: body.join('\n') }); i = j - 1; }
    else blocks.push({ line: i + 1, text: m[2] }); }
  const bad = blocks.map(b => ({ ...b, r: spawnSync('bash', ['-n'], { input: b.text, encoding: 'utf8' }) })).filter(b => b.r.status !== 0);
  results.push({ name: `every run: block in pages.yml passes bash -n (${blocks.length} blocks)`, pass: blocks.length >= 8 && bad.length === 0, out: bad.map(b => `line ${b.line}: ${b.r.stderr.trim().split('\n')[0]}`).join(' | ') || `${blocks.length} blocks` }); }
{ const wf = readFileSync(join(dirname(CHECK), '..', '.github', 'workflows', 'pages.yml'), 'utf8');
  results.push({ name: 'the verify job reads git attributes from the empty tree and checks git is 2.42 or later', pass: /\n      GIT_ATTR_SOURCE: 4b825dc642cb6eb9a060e54bf8d69288fbee4904\n/.test(wf) && /is older than 2\.42/.test(wf), out: 'missing' }); }
// the git version check fails closed (videos.b@'s finding, 7d1e31b): its lines, taken from the workflow, are run against
// several version strings; anything unreadable or older than 2.42 must fail
{ const wf = readFileSync(join(dirname(CHECK), '..', '.github', 'workflows', 'pages.yml'), 'utf8').split('\n');
  const i0 = wf.findIndex(l => /gv=\$\(git --version\)/.test(l)), i1 = wf.findIndex(l => /is older than 2\.42/.test(l));
  const body = i0 >= 0 && i1 > i0 ? wf.slice(i0, i1 + 1).map(l => l.trim()).join('\n') : '';
  const run = v => spawnSync('bash', ['-c', 'git() { echo "$GV"; }\n' + body + '\necho passed'], { encoding: 'utf8', env: { ...noCI, GV: v } });
  const cases = [['git version 2.56.1', true], ['git version 2.42.0', true], ['git version 3.0', true], ['git version 2.41.9', false], ['git version 1.99', false], ['git version', false], ['', false], ['git version x.y', false], ['git version 2', false]];
  const wrong = cases.filter(([v, ok]) => (run(v).stdout.includes('passed') && run(v).status === 0) !== ok);
  results.push({ name: 'the git version check fails closed on an unreadable or old version', pass: body.length > 0 && wrong.length === 0, out: body ? wrong.map(([v]) => JSON.stringify(v)).join(', ') : 'no version check found' }); }
// control 10 (security@, ed70bd996): no symlinks unless listed, with a reason, in the trusted copy's exceptions file
const withLink = (r, msg, key) => { execFileSync('ln', ['-s', 'x.txt', join(r.d, 'link.txt')]); return r.commit(msg, { key: A, files: { 'x.txt': '1' } }); };
{ const r = setup('link-pushed'); withLink(r, 'adds a symlink, signed'); expect('(10) a pushed symlink fails, even in a signed commit', r.checkFromBase(r.base, 'HEAD'), false, 'adds or changes a symlink'); }
{ const r = repo('link-listed'); const base = r.commit('bootstrap with an exception', { key: A, files: { 'team/keys.json': keysWith(entry('a', A)), 'scripts/symlink-exceptions.json': JSON.stringify([{ path: 'link.txt', target: 'x.txt', reason: 'test' }]) } });
  withLink(r, 'adds the listed symlink'); expect('(10) a symlink listed in the trusted exceptions file passes', r.checkFromBase(base, 'HEAD'), true); }
{ const r = setup('link-unlisted'); r.commit('lists an exception in the pushed tree, then adds the link', { key: A, files: { 'scripts/symlink-exceptions.json': JSON.stringify([{ path: 'link.txt', target: 'x.txt', reason: 'pushed' }]) } }); withLink(r, 'adds the link');
  expect('(10) a symlink listed only in the pushed tree fails', r.checkFromBase(r.base, 'HEAD'), false, 'adds or changes a symlink'); }
{ const r = repo('link-newline'); const base = r.commit('bootstrap listing "a"', { key: A, files: { 'team/keys.json': keysWith(entry('a', A)), 'scripts/symlink-exceptions.json': JSON.stringify([{ path: 'a', target: 'x.txt', reason: 'test' }]) } });
  execFileSync('ln', ['-s', 'x.txt', join(r.d, 'a\nb')]); r.commit('adds a link named a, newline, b', { key: A, files: { 'x.txt': '1' } });
  expect('(10) a symlink whose name holds a newline is not matched to a listed path', r.checkFromBase(base, 'HEAD'), false, 'adds or changes a symlink'); }
{ const r = repo('link-repointed'); const base = r.commit('bootstrap with an exception for link.txt -> x.txt', { key: A, files: { 'team/keys.json': keysWith(entry('a', A)), 'scripts/symlink-exceptions.json': JSON.stringify([{ path: 'link.txt', target: 'x.txt', reason: 'test' }]) } });
  execFileSync('ln', ['-s', '/etc/passwd', join(r.d, 'link.txt')]); r.commit('adds link.txt pointing elsewhere', { key: A, files: { 'x.txt': '1' } });
  expect('(10) an excepted link pointed at another target fails (the target is pinned)', r.checkFromBase(base, 'HEAD'), false, 'adds or changes a symlink'); }
{ const r = setup('link-merge'); r.g('checkout', '-q', '-b', 'side'); r.commit('side, signed', { key: A, files: { 's.txt': '1' } }); r.g('checkout', '-q', 'main'); r.commit('main, signed', { key: A, files: { 'm.txt': '1' } });
  r.g('-c', 'gpg.format=ssh', '-c', `user.signingkey=${A.f}`, 'merge', '-q', '-S', '--no-ff', '--no-commit', '-m', 'merge', 'side'); execFileSync('ln', ['-s', 'x.txt', join(r.d, 'merged-link')]); r.g('add', 'merged-link');
  r.g('-c', 'gpg.format=ssh', '-c', `user.signingkey=${A.f}`, 'commit', '-q', '-S', '-m', 'merge with a link', '-m', `Agent: ${AGENT}\nClaude-Session: ${SESSION}`);
  expect('(10) a symlink added in a merge commit fails', r.checkFromBase(r.base, 'HEAD'), false, 'symlink'); }
{ const r = setup('link-bytes'); const nm = Buffer.from([0x6c, 0xff, 0x6b]); execFileSync('ln', ['-s', 'x.txt', Buffer.concat([Buffer.from(r.d + '/'), nm]).toString('latin1')]);
  let made = true; try { r.commit('a link whose name is not UTF-8', { key: A, files: { 'x.txt': '1' } }) } catch { made = false }
  if (made) expect('(10) a symlink whose name is not valid UTF-8 fails', r.checkFromBase(r.base, 'HEAD'), false, 'symlink'); }

rmSync(tmp, { recursive: true, force: true });
const bad = results.filter(r => !r.pass);
for (const r of results) console.log(`${r.pass ? 'pass' : 'FAIL'}  ${r.name}${r.pass ? '' : `  [${r.out}]`}`);
if (bad.length) { console.error(`test-check-signatures: ${bad.length} of ${results.length} failed`); process.exit(1); }
console.log(`OK (${results.length} cases)`);
