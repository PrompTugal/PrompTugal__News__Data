// The shared map, ptmap (designer@, Website 9f5ba1d44; security@'s go, b5fc4fdef; Dinis, 19 Nov 2026 ~17:40 UTC, board/guidance/
// 2026-11-19-cameras-as-links-and-the-map.md: Portugal big, London and the EU small). src/assets/ptmap/<v>/ is copied unchanged
// from the Website repo's design/shared-map/<v>/ and is never loaded from another site. At every build each file's sha384 is
// compared with the sites registry's map.versions[<v>] pin (read by this build, as for the sites bar): the version unlisted
// leaves the map out (logged as off); the same version with other bytes stops the build. The map is placed where a page holds
// the <!--PTMAP--> marker; its data rides in a data attribute and /assets/ptmap/init.js calls PTMap.render (script-src 'self',
// no inline script). data.b@PrompTugal.dinis.
import { readFileSync, writeFileSync, rmSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';

export const PTMAP = '1.0.0';
const FILES = ['ptmap.js', 'ptmap.css'], MARK = '<!--PTMAP-->';
const SITE = 'https://data.promptugal.news';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const walk = d => readdirSync(d).flatMap(f => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

export function placePtmap(out, reg, places) {
  const dir = join(out, 'assets/ptmap', PTMAP);
  const pages = walk(out).filter(f => f.endsWith('.html') && readFileSync(f, 'utf8').includes(MARK));
  const off = why => { rmSync(join(out, 'assets/ptmap'), { recursive: true, force: true }); for (const f of pages) writeFileSync(f, readFileSync(f, 'utf8').replaceAll(MARK, '')); return { off: `ptmap ${PTMAP} off: ${why}` } };
  const pin = reg && reg.map;
  if (!pin) return off('the registry lists no map');
  // the registry's install note: vendor it only once map.review is "passed" (security@'s review recorded by dev@)
  if (!/^passed\b/i.test(String(pin.review || ''))) return off(`the registry's review reads "${String(pin.review || 'none').slice(0, 60)}"`);
  const v = pin.versions && pin.versions[PTMAP];
  if (!v) return off(`the registry does not list it${pin.version ? ` (it names ${pin.version})` : ''}`);
  const sri = {};
  for (const f of FILES) {
    const want = typeof v.integrity === 'object' && v.integrity ? v.integrity[f] : (v[f] || null);
    const got = 'sha384-' + createHash('sha384').update(readFileSync(join(dir, f))).digest('base64');
    if (typeof want !== 'string') return off(`the registry gives no pin for ${f}`);
    if (got !== want) throw new Error(`ptmap ${PTMAP}: ${f} does not match the registry's pin; not building with a changed file`);
    sri[f] = got;
  }
  rmSync(join(dir, 'manifest.json'), { force: true });
  // Portugal's places with Wikidata coordinates (register/places.json); London is the inset, not a dot
  const data = places.filter(p => p.place !== 'london' && Number.isFinite(p.lon) && Number.isFinite(p.lat)).map(p => ({ id: p.place, name: p.name, at: [p.lon, p.lat], href: `${SITE}/api/v1/by-place/now/${p.place}.json` }));
  const opts = { places: data, london: { href: `${SITE}/api/v1/by-place/now/london.json` }, eu: { href: `${SITE}/sources/eurostat-tourism/` }, label: 'Places this site has data for' };
  const block = `<link rel="stylesheet" href="/assets/ptmap/${PTMAP}/ptmap.css" integrity="${sri['ptmap.css']}">\n<figure class="ptmap-fig"><div id="ptmap" data-ptmap="${esc(JSON.stringify(opts))}"></div>`
    + `<figcaption>Places this site has data for. Each dot links to that place's latest file; London and Brussels (the EU) are small insets. Outline: Natural Earth (public domain) via world-atlas (ISC licence). Map by designer@ (ptmap ${PTMAP}).</figcaption></figure>\n`
    + `<script src="/assets/ptmap/${PTMAP}/ptmap.js" integrity="${sri['ptmap.js']}"></script>\n<script src="/assets/ptmap/init.js"></script>`;
  for (const f of pages) writeFileSync(f, readFileSync(f, 'utf8').replaceAll(MARK, block));
  return { ok: `ptmap ${PTMAP}: ${data.length} places, both files match the registry's pins, on ${pages.length} page(s)` };
}
