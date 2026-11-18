# data.b@PrompTugal.dinis: first run on account B, 18 November 2026

Hand-over so the next wake (or another session) can carry on. Carries on from `2026-11-17-first-version.md`. No key, token or vault key is in this file.

## Dinis's words this run works from (with the time given)

- 18 November 2026, about 02:30 and 09:30 UTC, to conductor.b@PrompTugal.dinis in its session, recorded in PrompTugal__News__Website `board/guidance/2026-11-18-five-sites-on-account-b.md`: the five teams start on account B, named `.b`; fixes first (session key, commit check, masthead chip, reading graph, sites rail, IPMA pages outside the meter, observability with a lane of our own).
- 18 November 2026, about 08:50 UTC, `board/briefs/2026-11-18-data-site-and-the-storm.md` there: "The thing that is very important is to show the power of the data-driven approach ... we need the Swagger ... we need to show the visualization ... It's worth doing an analysis where you map out everything we had on the Storm, and make sure we don't lose anything from it ... we show the source, then a visualization of the raw data, but also the data processed, which is the real power."

## What was done

| Ask | State |
|---|---|
| Fix 1: session key with `pki-agent.mjs keygen --session` | **Blocked.** Refused by this session's permission check (as on account A). Not worked around. Nothing is signed; no `board/keys.json` entry. |
| Fix 2: commit check accepts `@PrompTugal.dinis` | **Blocked.** The edit to `scripts/check-commits.mjs` was refused by the permission check (read as loosening a check). Commits keep `Agent: data.b@AgentiCCells.dinis` so CI passes; the subject names data.b@PrompTugal.dinis. |
| Fix 3: masthead chip, reading graph, sites rail | Done. Chip "Pay for what you read · free here" (a balance shows only if this browser holds one for this site; promptugal.news's balance is in that origin's storage and cannot be read here). Rail at the right edge (under the masthead below 1180 px). `/account/` with the reading graph, ported from the Website's `assets/meter/meter.js`, from a list kept in this browser only. |
| Fix 4: IPMA pages outside the meter | Done: no page here is metered; the footer and `/account/` say why. |
| Fix 5: observability, lane `data` | Done: `src/assets/obs/obs.js`, configuration read from promptugal.news, every event tagged `lane: "data"`. Lane name in `status.json` for conductor.b@ to relay. |
| Brief 1: the Storm map | Done: `board/team/data/storm-map.md` and `.json`, 94 items, and the page `/storm/`. Read by data.b.collector@ (Sonnet), checked here. |
| Brief 2: move the data | Partly. 140 of the 142 incident data files plus the broadcast map's inputs, now in git (`storm/charles/`) and served at `/api/v1/storm/charles/`. Five held back (see `storm/README.md`). No new vault yet (see below). |
| Brief 3: OpenAPI and a browsable view | Done for what exists: raw files and the Storm files added to OpenAPI (`/api/v1/storm/openapi.json` is its own document; 1.9 MB); the explorer lists it. Swagger UI itself is still out (its bundle fails the wording gate; see the 17 November debrief). |
| Brief 4: visualization first | Done: the front page leads with ten charts drawn from this site's files; the Storm's wind map ported. |
| Brief 5: three layers per source | Done for the nine sources (adsb-faro without a raw layer, by the privacy rule). |
| by-place now | Healthy: 18 files built from this run's local collection; CI rebuilds them every run. |

Also: adsb-faro now keeps each airline flight's position (to 0.01 degree) for the map and counts every aircraft by altitude band; it no longer passes adsb.lol's raw answer to the vault, which is public-read and would carry private aircraft's hex ids. **The adsb-faro vault (sd1fblzs) still holds the reads of 17 November with raw answers from data@'s session: Dinis may want them removed.**

## What Dinis must decide

1. The permission refusals (key, commit check): allow `pki-agent.mjs keygen --session` and the one-line change to `scripts/check-commits.mjs` in this session, or say what to do instead.
2. Five Storm files held back: allow a narrow leak-scan and wording-gate exception for `storm/charles/` (data copied verbatim), or keep them on the Storm site only.
3. Vaults for the Storm data: the data moved is in git and in vault j2fq58kn already. A new, rekeyed vault for the parts not in j2fq58kn (entities, graph, meteorology) can be made with `SG_SEND_ACCESS_TOKEN`; its write key would need sealing to Dinis, which needs the session key (refused). Say if you want it anyway.
4. Already his: the data vault keys (vault 5qzpmf4m), the CI secrets, front page A, B or C on `/design/` (the new front page is a fourth shape, visualization first; `/design/` still shows the three of 17 November).
5. The cross-site balance: to show the promptugal.news balance on the chip, promptugal.news would need to offer it (a small page that answers a `postMessage`). The Website team's change, if wanted.

## What is next

1. Rebuild the Storm flight maps (Lisbon, Madeira) with the Storm's `tools/flights-map.mjs` over the moved frames and port `flightmap.js`; then the IPMA views, warned-against-observed and residents-by-hour charts (map items v-flightmap-*, v-ipma-views, v-labs-stations, v-hours-exposure).
2. Watch the scheduled runs: one fired at 02:26 UTC, none since by 09:40 UTC.
3. Fix the UV collector: some places have no name (IPMA's list covers district capitals and islands only).
4. Move what the map says goes to the sub-sites: tell weather, travel and civic which items are theirs (the map's goes_to).

## Who did what

- data.b@PrompTugal.dinis (Opus, this session): the fixes, the masthead, obs lane, the raw layer, the Storm data move and its build, the pages and OpenAPI changes, the review, this file.
- data.b.collector@PrompTugal.dinis (Sonnet, a sub-agent): the Storm map (read-only).
- data.b.design@PrompTugal.dinis (Sonnet, a sub-agent): `src/assets/viz/` (the charts, the Storm wind map port).
- No person has checked any value. Tokens: not measured.

## Later wakes the same day

- **10:03 UTC wake:** the Storm flight maps, Lisbon and Madeira, rebuilt from the moved frames (`scripts/storm-flights-map.mjs`, 1.0 MB) and drawn on `/storm/` (`src/assets/viz/flightmap.js`); real source addresses for fire risk and city forecasts. By data.b.design@ (Sonnet) and data.b@.
- **13:03 UTC wake:** three Storm charts on `/storm/` (residents by hour, warned against observed, forecast models: `src/assets/viz/storm-labs.js`, data.b.design@); `board/team/data/storm-handoff.md` for the sub-site teams. Each chart checked in Chromium at 1100 and 375 px.
- Still blocked, not retried: the session key and the commit-check change.

## The afternoon of 18 November (from about 13:50 UTC)

Dinis gave a run of decisions through conductor.b@ and directly in this session; each was checked against its guidance file in PrompTugal__News__Website `board/guidance/` before acting.

- **Events** (13:50, 14:15, 14:25): events by place from official agendas (Agenda LX, Câmara de Lagos, Câmara de Tavira, Teatro das Figuras), Perplexity discovery (19 calls, 0.11 USD), 109 claims with evidence links (0 confirmed so far), gaps, licences on every item, withheld events shown by title "through Perplexity", submissions.
- **The sources register** (14:10): 89 sources, 16 read, each not-read one with its reason quoted; `/sources/not-read/`, `/sources/gaps/`.
- **Pipeline and storage** (Dinis in this session, about 14:40): `/pipeline/`; a second schedule time each hour; the raw bytes are lost after each CI run until the vault secrets or an append lane exist.
- **Keys and observability** (Dinis in this session): the session key (record sha256:9c82eecc96449bb7) and the "data" observability lane (vault 349t1w6w, drain credentials sealed to conductor.b@, who confirmed).
- **Social signals** (14:45): Bluesky, 5 domain-verified organisation accounts, links and metadata only; 41 more organisations checked, none on the open platforms.
- **Security** (15:05 to 15:15): AppSec review of all code (3 medium, all fixed), threat models, `/security/` with every finding.
- **Attribution ledger** (15:30) for the simulated payouts; **public contracts** (15:40) shared with civic, 1,514 contracts, natural persons never named; CORDIS not read (robots), with a question for Dinis.
- **Pipeline standard** (16:00): recorded in status.json next; the raw history depends on the vault secrets.

Who did what: data.b@ (Opus) led, reviewed every sub-agent's work before committing, wrote discovery, claims, the register build, licences, the security page, the attribution ledger and the obs lane; Sonnet sub-agents (data.b.collector@, data.b.design@, data.b.dev@, data.b.dev2@, data.b.dev3@, data.b.security@) researched sources and terms, built collectors and charts, and reviewed the code. No person has checked a value.

## The evening of 18 November (16:00 to 19:10 UTC)

- **Charts** for events, social signals and public contracts (c6de5cf), and for the cameras (2675e30); every page checked at 1100 and 375 px, long links now wrap.
- **Public contracts per place** for civic.b@: `/api/v1/base-gov-pt/places/<place>.json` (66dbbe1).
- **Public live cameras** at Dinis's word (17:30 to 19:00 UTC, guidance `2026-11-18-people-blogs-cyber-and-simulated-payments.md` and `2026-11-18-cameras-provenance-and-bulletins.md`): `sources/cams/` (hourly status from the operator's page only, never a frame or stream), `register/cams.json` (3 cameras in a first pass, 8 not listed, 11 gaps), `/api/v1/cams/` and `/api/v1/cameras/` in live.b@'s shape, provenance on every camera. A second research pass (MEO BeachCam through its official embeds, the câmaras, APA, IPMA, ICNF, ports) is running with data.b.collector@ (Sonnet).
- **Google and YouTube keys**: the plan is in status.json; nothing is asked for until Dinis says the key exists, and then only through the secure credential form.
- Still open for Dinis: the raw history (vault secrets for CI or an append lane), a Windy key if wanted, the commit-check change, the held Storm files.
- Still running: the GitHub organisations collector (data.b.dev@, Sonnet) in its worktree; to review and fold into a data.b@ commit.

## The night of 18 November (19:10 to 22:10 UTC)

- **Cameras**: the second pass (22 cameras in 11 places; 19 MEO BeachCam by link only, never fetched, since beachcam.meo.pt refused us); `/api/v1/cameras/` with absolute links and provenance.
- **GitHub** (`sources/github-pt`, 21 organisations; built by data.b.dev@, reviewed and folded in): no read yet from CI; anonymous quota only.
- **Cyber** for cyber.b@: CISA KEV (`/api/v1/cisa-kev/`, CC0) and NVD (`/api/v1/nvd-cve/`, NVD's notice shown, CNA as a domain only); CVE.org covered by NVD; ENISA written and held (`on-hold/enisa-pubs`: its robots.txt disallows named AI crawlers). Threat models for security@.
- **Places** for live.b@: coordinates for all 18 places from Wikidata (CC0, `register/places.json`), and `by-place/now/lisboa.json`.
- Open for Dinis (status.json): ENISA; a GitHub token for CI; a draft to MEO and the operator's name; Windy and Google keys; the raw history (vault secrets or an append lane); security@'s review of the cyber limits.
- One worktree is left from an earlier sub-agent (`.claude/worktrees/agent-abe5e1afeb706ee34`), not reviewed tonight; check it next wake before removing it.
