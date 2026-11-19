// The PrompTugal.news sites bar, v1.1.0 (Dinis, 18 Nov 2026, PrompTugal__News__Website board/guidance/2026-11-18-the-sites-bar.md;
// built by dev@ to designer@'s design; security@ post-reviewed the exact files). The three files are vendored unchanged in
// src/assets/sites-bar/1.1.0/ (sha256 checked at copy and at every build); the registry is read at build, rendered here as
// HTML, and the bar's own script on each page (served from this host) adds the pop-ups. data.b@PrompTugal.dinis.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { render } from '../../src/assets/sites-bar/1.1.0/sites-bar-render.mjs';

export const SITES_BAR = '1.1.0';
// the first 16 hex of each file's sha256 (the leak scan refuses longer hex runs; its rules are not ours to loosen); the full
// values were checked by hand on 19 Nov 2026 against those conductor.b@ relayed from dev@ and security@
const PINNED = {
  'sites-bar-render.mjs': 'b9b50ae32fd5dc23',
  'sites-bar.css': '302e2544eb34e3d6',
  'sites-bar.js': 'bc97a820a8f4fbda',
};
const REGISTRY = 'https://promptugal.news/api/v1/sites.json';
const LAST = 'https://data.promptugal.news/assets/sites-bar/last.txt';   // the bar this site published last time
const HERE = 'data.promptugal.news';

export async function sitesBar() {
  for (const [f, want] of Object.entries(PINNED)) {
    const got = createHash('sha256').update(readFileSync(`src/assets/sites-bar/${SITES_BAR}/${f}`)).digest('hex').slice(0, 16);
    if (got !== want) throw new Error(`sites bar: ${f} does not match its pinned sha256; not building with a changed file`);
  }
  const get = async (u, json) => { const r = await fetch(u, { signal: AbortSignal.timeout(15000), redirect: 'error' }); if (!r.ok) throw new Error(String(r.status)); return json ? r.json() : r.text(); };
  try {
    const html = render(await get(REGISTRY, true), { here: HERE });
    return { html, from: html ? 'registry' : 'none (the registry did not pass the bar\'s own check)' };
  } catch {
    // the registry is down: keep the last build's bar, only if it is the bar's own markup
    try { const last = await get(LAST, false); if (/^<nav class="ptsb"[^]*<\/nav>\s*$/.test(last) && !/<script/i.test(last)) return { html: last.trim(), from: 'last build' }; } catch {}
    return { html: '', from: 'none (registry and last build unreachable)' };
  }
}
