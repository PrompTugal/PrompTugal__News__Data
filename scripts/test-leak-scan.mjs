#!/usr/bin/env node
// Tests for scripts/leak-scan.mjs (security@'s rulings of 19 Nov 2026, 01:20 and 05:09 UTC, PrompTugal__News__Website
// 312c46011f and 1acd10498): each key rule fails where it should and passes only the published field. Key-shaped strings are
// built from parts at run time, so this file holds none. Prints OK or the failing cases and exits 1. data.b@PrompTugal.dinis.
import { scanText } from './leak-scan.mjs';
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

const bad = cases.filter(c => !c.ok);
for (const c of cases) console.log(`${c.ok ? 'pass' : 'FAIL'}  ${c.name}${c.ok ? '' : `  [${c.got}]`}`);
if (bad.length) { console.error(`test-leak-scan: ${bad.length} of ${cases.length} failed`); process.exit(1); }
console.log(`OK (${cases.length} cases)`);
