# storm/: the Storm Charles data, moved here

Moved on 18 November 2026 by data.b@PrompTugal.dinis, at Dinis's word (PrompTugal__News__Website `board/briefs/2026-11-18-data-site-and-the-storm.md`: "we need to leverage just about everything we created there ... the Storm website is frozen, and we continue from there").

- **From:** https://github.com/PrompTugal/PrompTugal__News__Storm-Charles at commit fdac6ed (18 November 2026): `incidents/2026-11-10-storm-charles/data/` to `charles/data/`, and `broadcast/data/{field,coast}.json` to `charles/broadcast/`.
- **Licence:** Apache-2.0 (the Storm repository's). Quoted sources keep their own terms: Open-Meteo CC BY 4.0, Natural Earth public domain, adsb.lol ODbL 1.0, IPMA as stated on its pages.
- **Checked:** each of the 142 incident files matched the first 16 hex of the sha256 the Storm site states (`sources/storm-charles-archive/manifest.json`) before anything was changed.
- **Changed in this copy:** every JSON string that is a full hex hash (48 or more hex characters) is cut to its first 16 hex, and those files are re-serialised (615 values in 101 files); in `exposure/README.md` the same for the hashes it lists. This site's leak scan refuses longer hex runs, and the check is not loosened. The full values: the Storm site, and vault j2fq58kn (the archive source).
- **Held back** (served by the Storm site, kept in vault j2fq58kn): `exposure/lisbon-grid.json` and `exposure/lisbon-municipalities.json` (a provenance string trips the leak scan); `decisions/graph.json`, `decisions/entities/madeira.json`, `transport/bridges.json` (quoted text with an em dash, which the wording gate refuses; quotes are not altered). Bringing them needs Dinis's word on a narrow exception.
- **Served at:** https://data.promptugal.news/api/v1/storm/charles/ (index: `index.json`; OpenAPI: `/api/v1/storm/openapi.json`). The build: `scripts/build/storm.mjs`.
- **Where everything else the Storm built goes:** `board/team/data/storm-map.md`, and https://data.promptugal.news/storm/.
