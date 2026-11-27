#!/usr/bin/env node
// Tests for scripts/leak-scan.mjs (security@'s rulings of 19 Nov 2026, 01:20 and 05:09 UTC, PrompTugal__News__Website
// 312c46011f and 1acd10498): each key rule fails where it should and passes only the published field. Key-shaped strings are
// built from parts at run time, so this file holds none. Prints OK or the failing cases and exits 1. data.b@PrompTugal.dinis.
import { scanText, scanBinary } from './leak-scan.mjs';
import { mkdtempSync, mkdirSync, writeFileSync, symlinkSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { generateKeyPairSync } from 'node:crypto';

const D = '-'.repeat(5);
const pub = generateKeyPairSync('ed25519').publicKey.export({ format: 'jwk' }).x;
const raw = Buffer.from(pub, 'base64url'), t = Buffer.from('ssh-ed25519'), len = n => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b };
const sshLine = 'ssh-ed25519 ' + Buffer.concat([len(t.length), t, len(raw.length), raw]).toString('base64');
const session = 'https://claude.ai/code/session_0Test' + 'SessionAbcdef01234';
const keys = (entry) => JSON.stringify({ keys: [{ id: 'test', session, ssh_signing: { public_key: sshLine }, ...entry }] }, null, 1);
const kinds = (path, text) => scanText(path, text).map(f => f.kind);
const cases = [];
const expect = (name, path, text, want) => { const k = kinds(path, text); const ok = want === null ? k.length === 0 : k.some(x => x.includes(want)); cases.push({ name, ok, got: k.join('; ') || '(none)' }) };

for (const kind of ['OPENSSH ', 'RSA ', 'EC ', 'DSA ', 'ENCRYPTED ', ''])
  expect(`a ${kind || 'plain '}private-key header in a status file fails`, 'board/team/data/status.json', `{"note": "${D}BEGIN ${kind}PRIVATE KEY${D}"}`, 'private key block');
expect('a private-key header in the keys file fails too', 'team/keys.json', keys({ note: `${D}BEGIN OPENSSH PRIVATE KEY${D}` }), 'private');
expect('an ssh public key in a status file fails', 'board/team/data/status.json', `{"note": "${sshLine}"}`, 'ssh public key outside');
// every key type the rule must catch outside the published field (library.b@'s check, LIB-2026-060): the body is random base64
// starting AAAA, built here
const body = 'AAAA' + Buffer.from(Array.from({ length: 48 }, (_, i) => (i * 37 + 11) & 255)).toString('base64');
for (const type of ['ssh-ed25519', 'ssh-rsa', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521', 'sk-ssh-ed25519@openssh.com', 'sk-ecdsa-sha2-nistp256@openssh.com'])
  expect(`a ${type} public key in a status file fails`, 'board/team/data/status.json', `{"note": "${type} ${body}"}`, 'ssh public key outside');
expect('an ssh public key in another field of the keys file fails', 'team/keys.json', keys({ other: sshLine }), 'ssh public key outside');
expect('an ssh public key with a comment in the published field fails', 'team/keys.json', keys({ ssh_signing: { public_key: sshLine + ' me@host' } }), 'does not match its pattern');
expect('the published field passes', 'team/keys.json', keys({}), null);
// cl-6.security@, 26 Nov 2026: the one exact public value passes; a token beside it, or a similar name, still fails
const aws = 'AWSConfigRemediation-EnableSystemsManagerSessionManagerAuditLogsToS3', tok = 'Zk3' + 'pQ9xLm2Vb7Nc4Rt8Yw1Uh6Gj5Df0Sa';
expect('the exempt AWS runbook name passes', 'data/euvd/latest.json', `{"product": "${aws}"}`, null);
expect('a token beside the exempt name still fails', 'data/euvd/latest.json', `{"product": "${aws}", "x": "${tok}"}`, 'high-entropy');
expect('a token joined to the exempt name still fails', 'data/euvd/latest.json', `{"product": "${aws}${tok}"}`, 'high-entropy');
expect('a changed name with a token tail still fails', 'data/euvd/latest.json', `{"product": "${aws.slice(0, -3)}${tok}"}`, 'high-entropy');

// library.b@'s finding (LIB-2026-067): a file holding a NUL byte is checked, not skipped; a symlink is refused, not followed
{ const k = scanBinary(Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 1]), Buffer.from(`${D}BEGIN OPENSSH PRIVATE KEY${D}`), Buffer.from([0, 2])])).map(f => f.kind);
  cases.push({ name: 'a private-key header in a file holding a NUL byte fails', ok: k.some(x => x.includes('private key block')), got: k.join(',') }); }
{ const k = scanBinary(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 1, 2, 3, 255, 0])).map(f => f.kind); cases.push({ name: 'a plain binary file passes', ok: k.length === 0, got: k.join(',') }); }
{ const d = mkdtempSync(join(tmpdir(), 'leaktest-')); const g = (...a) => execFileSync('git', a, { cwd: d, stdio: 'ignore' });
  g('init', '-q'); mkdirSync(join(d, '_site')); writeFileSync(join(d, '_site', 'index.html'), '<p>ok</p>\n'); symlinkSync('/etc/hostname', join(d, '_site', 'link.txt'));
  const r = spawnSync('node', [join(dirname(fileURLToPath(import.meta.url)), 'leak-scan.mjs')], { cwd: d, encoding: 'utf8' });
  cases.push({ name: 'a symlink in the built site fails', ok: r.status === 1 && r.stderr.includes('a symlink'), got: (r.stdout + r.stderr).trim().split('\n')[0] }); rmSync(d, { recursive: true, force: true }); }

const bad = cases.filter(c => !c.ok);
for (const c of cases) console.log(`${c.ok ? 'pass' : 'FAIL'}  ${c.name}${c.ok ? '' : `  [${c.got}]`}`);
if (bad.length) { console.error(`test-leak-scan: ${bad.length} of ${cases.length} failed`); process.exit(1); }
console.log(`OK (${cases.length} cases)`);
