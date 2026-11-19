// The PrompTugal.news sites bar, v1.1.1 (security@'s go, 19 Nov 2026 ~01:30 UTC: 1.1.0 tightened, no user info or password, redirects
// refused) (Dinis, 18 Nov 2026, PrompTugal__News__Website board/guidance/2026-11-18-the-sites-bar.md;
// built by dev@ to designer@'s design; security@ post-reviewed the exact files). The three files are vendored unchanged in
// src/assets/sites-bar/1.1.1/ (the full pin checked at copy and at every build); the registry is read at build, rendered here as
// HTML, and the bar's own script on each page (served from this host) adds the pop-ups. data.b@PrompTugal.dinis.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { render } from '../../src/assets/sites-bar/1.1.1/sites-bar-render.mjs';

export const SITES_BAR = '1.1.1';
// The pins: the registry's bar.integrity (SRI form, sha256-<base64> of the whole file), read at every build and checked
// whole, never a part of it (security@'s go and the registry's install note, 19 Nov 2026). They are not copied into this
// file: this site's leak scan refuses long base64 runs outside team/keys.json, and its rules are not ours to loosen.
// Checked by hand on 19 Nov 2026 against the hex sha256 in security@'s review (PrompTugal__News__Website
// board/team/security/reviews/2026-11-19-0130-bar-signing-live-data.md). If the registry cannot be read, or names
// another version, or a file differs from its pin, this build has no bar: an unchecked bar is never published.
const FILES = { render: 'sites-bar-render.mjs', js: 'sites-bar.js', css: 'sites-bar.css' };
const REGISTRY = 'https://promptugal.news/api/v1/sites.json';
const HERE = 'data.promptugal.news';

export async function sitesBar() {
  const get = async (u, json) => { const r = await fetch(u, { signal: AbortSignal.timeout(15000), redirect: 'error' }); if (!r.ok) throw new Error(String(r.status)); return json ? r.json() : r.text(); };
  let reg;
  try { reg = await get(REGISTRY, true); } catch { return { html: '', from: 'none (the registry could not be read, so the files could not be checked against their pins)' }; }
  const pins = (reg && reg.bar && reg.bar.integrity) || {};
  if (!reg.bar || reg.bar.version !== SITES_BAR) return { html: '', from: `none (the registry names version ${reg.bar && reg.bar.version}, this site vendors ${SITES_BAR})` };
  for (const [k, f] of Object.entries(FILES)) {
    const got = 'sha256-' + createHash('sha256').update(readFileSync(`src/assets/sites-bar/${SITES_BAR}/${f}`)).digest('base64');
    if (typeof pins[k] !== 'string' || got !== pins[k]) throw new Error(`sites bar: ${f} does not match its pin in the registry's bar.integrity; not building with a changed file`);
  }
  const html = render(reg, { here: HERE });
  return { html, from: html ? 'registry (files checked against bar.integrity)' : 'none (the registry did not pass the bar\'s own check)' };
}
