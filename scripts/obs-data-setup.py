#!/usr/bin/env python3
"""The "data" observability lane on account B (data.b@PrompTugal.dinis, 18 Nov 2026, at Dinis's word: PrompTugal__News__Website
board/guidance/2026-11-18-keys-issues-rebuilds-observability.md, "it's okay for the agent here to create the tokens").
After newsroom/tools/obs/obs_setup.py there. NOT YET RUN: this session's permission check refused it; Dinis to allow or run it.

    SG_SEND_ACCESS_TOKEN=... python3 -I scripts/obs-data-setup.py

1. one PRIVATE data vault on dev.send.sgraph.ai with a drain key inside (identity/), two append lanes ('site 1', 'site 2')
   and an enum key that lists them;
2. the PUBLIC half (endpoint, vault id, the lanes' append tokens, the drain's public key) in team/keys/obs-data.json: the
   only place this repository's leak scan allows a public key; obs.js reads it from GitHub. Tokens are 40 hex, the length
   the scan allows; each can only append to its lane;
3. the credentials (vault key, enum key, tokens) in ~/.sg-send/obs-data-b/creds.json (0600), outside the repository, for
   sealing to conductor.b-promptugal (sgit pki encrypt, signed with data.b's key), who drains the lane.
Prints no credential. Runs once."""
import datetime, hashlib, json, os, secrets, subprocess, sys, urllib.request

HOST, AGENT = 'https://dev.send.sgraph.ai', 'data.b@PrompTugal.dinis'
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.expanduser('~/.sg-send/obs-data-b'); CREDS = os.path.join(OUT, 'creds.json')
VAULTS = os.path.expanduser('~/vaults')
h = lambda s: hashlib.sha256(s.encode()).hexdigest()


def sgit(cwd, *a):
    r = subprocess.run(['sgit', *a], cwd=cwd, capture_output=True, text=True)
    if r.returncode: sys.exit(f'setup: sgit {a[0]} failed (exit {r.returncode})')
    return r.stdout


def wjson(p, o, mode=None):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f: f.write(json.dumps(o, indent=1, ensure_ascii=False) + '\n')
    if mode: os.chmod(p, mode)


def main():
    if os.path.exists(CREDS): sys.exit('setup: already made')
    token = os.environ['SG_SEND_ACCESS_TOKEN']
    from sgit_ai.crypto.PKI__Crypto import PKI__Crypto
    from sgit_ai.crypto.Vault__Crypto import Vault__Crypto
    pki, today = PKI__Crypto(), datetime.date.today().isoformat()
    os.makedirs(VAULTS, exist_ok=True)
    name = 'promptugal-obs-data-b'; d = os.path.join(VAULTS, name)
    if os.path.exists(d): sys.exit('setup: the vault folder exists')
    sgit(VAULTS, 'create', name, '--base-url', HOST, '--token', token, '--no-push')
    with open(os.path.join(d, 'README.md'), 'w') as f:
        f.write(f'# PrompTugal sub-sites observability, lane "data" (private)\n\nMade by {AGENT} on {today} at Dinis Cruz\'s word. Page views and reads from data.promptugal.news (assets/obs/obs.js, lane "data") arrive sealed to the drain key (identity/) on this vault\'s append lanes. Drained by conductor.b@PrompTugal.dinis, to whom the credentials are sealed. Private.\n')
    priv, pub = pki.generate_encryption_key_pair()
    pub_pem, priv_pem = pki.export_public_key_pem(pub), pki.export_private_key_pem(priv)
    fp = pki.compute_fingerprint(pub)
    os.makedirs(os.path.join(d, 'identity', 'private'), exist_ok=True)
    with open(os.path.join(d, 'identity', 'private', 'private_key.pem'), 'w') as f: f.write(priv_pem)
    wjson(os.path.join(d, 'identity', 'public-bundle.json'), {'encrypt': pub_pem, 'fingerprint': fp, 'label': 'data.promptugal.news observability drain'})
    names = ['site 1', 'site 2']; toks = [secrets.token_hex(20) for _ in names]
    wjson(os.path.join(d, 'identity', 'lanes.json'), {'lanes': [{'name': n, 'anchor': h(t)} for n, t in zip(names, toks)]})
    sgit(d, 'commit', 'the data vault: README, the drain key, the lanes'); sgit(d, 'push')
    with open(os.path.join(d, '.sg_vault', 'local', 'vault_key')) as f: vk = f.read().strip()
    vid = vk.split(':')[-1]
    enum_key = secrets.token_hex(32)
    wk = Vault__Crypto().derive_keys_from_vault_key(vk)['write_key']
    req = urllib.request.Request(f'{HOST}/api/vault/append/configure/{vid}', method='POST',
        data=json.dumps({'append_anchors': [h(t) for t in toks], 'enum_key_hash': h(enum_key)}).encode(),
        headers={'Content-Type': 'application/json', 'x-sgraph-vault-write-key': wk, 'x-sgraph-access-token': token})
    with urllib.request.urlopen(req, timeout=60) as resp: r = json.loads(resp.read() or b'{}')
    if r.get('status') != 'configured': sys.exit(f'setup: configure answered {r.get("status")}')
    wjson(os.path.join(REPO, 'team', 'keys', 'obs-data.json'), {
        'about': f'The observability lanes of data.promptugal.news, lane "data" ({AGENT}, {today}, at Dinis Cruz\'s word). Public on purpose: each append token can only append to its lane, and the key can only encrypt. Read by src/assets/obs/obs.js from this file on GitHub. Drained by conductor.b@PrompTugal.dinis.',
        'enabled': True, 'endpoint': HOST, 'vault_id': vid, 'lanes': {'site': toks}, 'recipient': {'fingerprint': fp, 'encrypt': pub_pem}})
    os.makedirs(OUT, mode=0o700, exist_ok=True)
    wjson(CREDS, {'type': 'promptugal.obs/creds', 'lane': 'data', 'host': HOST, 'vault_id': vid, 'vault_key': vk, 'enum_key': enum_key,
                  'tokens': toks, 'lane_names': names, 'made': today, 'by': AGENT}, 0o600)
    print(f'setup: vault {vid} made, 2 lanes configured, drain key {fp}; public half in team/keys/obs-data.json; credentials kept outside the repository')


if __name__ == '__main__':
    main()
