// The shared time-zone-to-country table for obs.js (Dinis, 19 Nov 2026 ~03:15 UTC: the country from the browser's time zone, no
// IP lookup; conductor.b@ relayed dev@'s table 1.0.0 at 04:50 UTC). src/assets/obs/tz-country.json is copied unchanged from the
// Website repo; at every build its full SRI string is compared with the sites registry's obs_tz.integrity, and only then are its
// zones written into the built obs.js. No match, or no registry: obs.js keeps an empty table and sends no country.
// data.b@PrompTugal.dinis.
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const FILE = 'src/assets/obs/tz-country.json', MARK = /\/\*OBS_TZ_ZONES\*\/\{\}\/\*END_OBS_TZ_ZONES\*\//;
export function injectObsTz(out, reg) {
  const js = join(out, 'assets/obs/obs.js');
  rmSync(join(out, 'assets/obs/tz-country.json'), { force: true });   // the page needs only the table written into obs.js; the file itself is never served
  const raw = readFileSync(FILE), sri = 'sha256-' + createHash('sha256').update(raw).digest('base64');
  const t = JSON.parse(raw), zones = {};
  const pin = reg && reg.obs_tz;
  // security@'s wording (19 Nov 2026 05:09 UTC): "<piece> <version> off: the registry names <newer>"; the piece is left out, never shipped unchecked
  if (!pin) return { off: `obs_tz ${t.version} off: the registry could not be read` };
  // this version's own pin from the append-only obs_tz.versions; off (no country sent, the data still deploys) only when the
  // registry no longer lists it; this version with other bytes is a changed file, and the build stops
  const want = (pin.versions && pin.versions[t.version] && pin.versions[t.version].integrity) || (pin.version === t.version ? pin.integrity : null);
  if (typeof want !== 'string') return { off: `obs_tz ${t.version} off: the registry no longer lists it (it names ${pin.version})` };
  if (sri !== want) throw new Error('obs tz table: src/assets/obs/tz-country.json does not match the registry\'s obs_tz.integrity; not building with a changed file');
  for (const [z, cc] of Object.entries(t.zones || {})) if (/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(z) && typeof cc === 'string' && /^[A-Z]{2}$/.test(cc)) zones[z] = cc;
  const src = readFileSync(js, 'utf8');
  if (!MARK.test(src)) throw new Error('obs tz table: the placeholder is missing from obs.js');
  writeFileSync(js, src.replace(MARK, JSON.stringify(zones)));
  return { ok: `obs_tz ${t.version}: ${Object.keys(zones).length} zones, integrity matches the registry` };
}
