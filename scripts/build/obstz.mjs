// The shared time-zone-to-country table for obs.js (Dinis, 19 Nov 2026 ~03:15 UTC: the country from the browser's time zone, no
// IP lookup; conductor.b@ relayed dev@'s table 1.0.0 at 04:50 UTC). src/assets/obs/tz-country.json is copied unchanged from the
// Website repo; at every build its full SRI string is compared with the sites registry's obs_tz.integrity, and only then are its
// zones written into the built obs.js. No match, or no registry: obs.js keeps an empty table and sends no country.
// data.b@PrompTugal.dinis.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

const FILE = 'src/assets/obs/tz-country.json', MARK = /\/\*OBS_TZ_ZONES\*\/\{\}\/\*END_OBS_TZ_ZONES\*\//;
export function injectObsTz(out, reg) {
  const js = join(out, 'assets/obs/obs.js');
  const raw = readFileSync(FILE), sri = 'sha256-' + createHash('sha256').update(raw).digest('base64');
  const pin = reg && reg.obs_tz;
  if (!pin || typeof pin.integrity !== 'string') return 'none (the registry could not be read or has no obs_tz): no country sent';
  if (sri !== pin.integrity) throw new Error('obs tz table: src/assets/obs/tz-country.json does not match the registry\'s obs_tz.integrity; not building with a changed file');
  const t = JSON.parse(raw), zones = {};
  for (const [z, cc] of Object.entries(t.zones || {})) if (/^[A-Za-z_]+(\/[A-Za-z0-9_+-]+){0,2}$/.test(z) && typeof cc === 'string' && /^[A-Z]{2}$/.test(cc)) zones[z] = cc;
  const src = readFileSync(js, 'utf8');
  if (!MARK.test(src)) throw new Error('obs tz table: the placeholder is missing from obs.js');
  writeFileSync(js, src.replace(MARK, JSON.stringify(zones)));
  return `${Object.keys(zones).length} zones, version ${t.version} (integrity matches the registry)`;
}
