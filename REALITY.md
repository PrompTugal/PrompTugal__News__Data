# REALITY.md: what exists now

A thing not written here does not exist. Kept by data.b@PrompTugal.dinis (account B; carries on from data@PrompTugal.dinis). Last checked: 18 November 2026, about 10:30 UTC.

## The site

- https://data.promptugal.news, deployed by GitHub Pages from `dev` (`.github/workflows/pages.yml`); version at `/version.json`, shown on every page. v0.1.1 was the factory's seed; v0.1.2 (17 November, 19:41 UTC) is the first version with data.
- Pages, each with a markdown twin (`index.md` beside `index.html`): `/`, `/sources/`, `/sources/<id>/` for nine sources, `/storm/`, `/account/`, `/api/`, `/api/swagger/` (the API explorer), `/vaults/`, `/about/`, `/design/` with `/design/a/`, `/design/b/`, `/design/c/`. Also `/llms.txt` and `/sitemap.xml`.
- **18 November (data.b@), on dev, live after the push:** the front page is visualization first (flights around Faro, wind, temperature, warnings, fire risk, sea, forecast, MeteoAlarm, UV, and the Storm's wind field), each chart drawn in the browser from this site's own API files (`src/assets/viz/`, by data.b.design@, Sonnet). Each source page has three layers: the source, the raw data (the publisher's own files of the latest read, at `/api/v1/<id>/raw/<file>`) and the processed data, each visualized. adsb-faro has no raw layer: the raw answer names private aircraft.
- **The masthead (18 November):** the chip "Pay for what you read · free here" (it shows a balance only when this browser holds one for this site under the meter's key; the promptugal.news balance lives in that site's browser storage, which this site cannot read), the sites rail (Weather, Civic, Startups, Travel, Data) at the right edge on wide screens and under the masthead on narrow ones, and `/account/` with the reading graph, drawn from a list of pages read kept in this browser only (`src/assets/top/top.js`). No page here is metered: IPMA's terms forbid profit-making use, so pages built on IPMA data stay free until Dinis decides.
- **Observability (18 November):** `src/assets/obs/obs.js` on every page, a copy of PrompTugal__News__Website's with lane `data`: it reads its configuration from https://promptugal.news/assets/obs/obs.json (no lane token in this repository) and tags every event `lane: "data"`. Since 18 November, about 15:00 UTC, on its own lane: vault 349t1w6w on dev.send.sgraph.ai (private), 2 append lanes, drain key sha256:5109a3745ff9fdb4, made by `scripts/obs-data-setup.py` at Dinis's word; the public half is `team/keys/obs-data.json` (obs.js reads it from GitHub); the drain credentials are sealed to conductor.b-promptugal and were sent to conductor.b@, who drains. No town lookup is made.
- The build (`scripts/build.mjs`, `scripts/build/*.mjs`), the gate (`scripts/validate.mjs`) and the leak scan (`scripts/leak-scan.mjs`) print OK on a local build with collected data and on one without it.

## The sources (nine)

| id | Cadence | Collector | Vault | Read 17 Nov |
|---|---|---|---|---|
| ipma-warnings | hourly | `sources/ipma-warnings/collect.mjs` | 4ol6ht3d | yes |
| ipma-observations | hourly | `sources/ipma-observations/collect.mjs` | a3y1ezgg | yes |
| ipma-city-forecasts | hourly | `sources/ipma-city-forecasts/collect.mjs` | dn8m3051 | yes (35 places) |
| ipma-fire-risk | hourly | `sources/ipma-fire-risk/collect.mjs` | 94lw1wl8 | yes (278 municipalities) |
| ipma-uv | hourly | `sources/ipma-uv/collect.mjs` | mah4euep | yes |
| ipma-sea | hourly | `sources/ipma-sea/collect.mjs` | 2q3ospco | yes |
| adsb-faro | hourly | `sources/adsb-faro/collect.mjs` | sd1fblzs | yes |
| meteoalarm-pt | hourly | `sources/meteoalarm-pt/collect.mjs` | whliuye4 | yes |
| storm-charles-archive | once | `sources/storm-charles-archive/collect.mjs` | j2fq58kn | yes: 142 of 142 files verified by sha256, 5,127,487 bytes, catalogue v0.1.2018 |

- Each source has `sources/<id>/card.json`: owner, schedule, the source's reuse terms (quoted, with the page and date read), code/agents/people, cost, the vault with its public read key and clone command.
- `collect/run.mjs` runs the hourly ones (about 2 minutes, 2.5 s between requests, three tries with backoff) and derives `by-place/now/` (18 Algarve files) with `collect/by-place-now.mjs`, the move of PrompTugal__News__Website's `board/tools/local-now.mjs`, in the same shape.
- Collected data (`data/`) and vault working copies (`vaults/`) are gitignored. Only `sources/storm-charles-archive/manifest.json` is in git.
- Files in git and on the site carry the first 16 hex of each sha256 (`sha256_prefix`). The full hashes are in the vaults (`latest/reads-full.json`, `manifest-full.json`).
- The Storm Charles archive groups into 39 datasets by the rule in its collector. The brief's "34 datasets" could not be reproduced: the count depends on how files are grouped.

## The Storm Charles data (18 November)

- `storm/charles/`: 140 of the Storm's 142 incident data files plus the broadcast map's `field.json` and `coast.json`, copied from PrompTugal__News__Storm-Charles at fdac6ed after each incident file matched its stated sha256; full hashes inside cut to 16 hex; five files held back (two trip the leak scan, three hold em dashes in quotes). `storm/README.md` has the detail. Served at `/api/v1/storm/charles/` with `index.json` and `/api/v1/storm/openapi.json`.
- The Storm map: `board/team/data/storm-map.md` and `.json` (94 items: pages, visualizations, collectors, data sets, vaults; where each goes and its state) and the page `/storm/`.
- The flight maps (18 November, second wake): Lisbon and Madeira rebuilt from the moved frames by `scripts/storm-flights-map.mjs` (a port of the Storm's `tools/flights-map.mjs`) into `storm/charles/flights-map/` (1.0 MB, airline callsigns only), drawn on `/storm/` by `src/assets/viz/flightmap.js`. The crosswind and departures charts are not ported.
- Three more Storm charts (18 November, third wake): residents under each IPMA level by hour, warned against observed, forecast models against measured, on `/storm/` (`src/assets/viz/storm-labs.js`, simplified ports; its header says what was left out). `board/team/data/storm-handoff.md` lists the Storm items for the weather, travel and civic teams.
- Not moved yet: the IPMA views and the other labs charts (see the map); entities, graph and meteorology data sets.

## Events by place (18 November, at Dinis's word, about 13:50 UTC)

- `sources/events-pt/` (collector by data.b.collector@, Sonnet; reviewed by data.b@): Agenda LX (Câmara Municipal de Lisboa's cultural agenda, its public `/wp-json/agendalx/v1/events` route) and Câmara Municipal de Lagos's events page. Since 18 November also Câmara Municipal de Tavira (its public Events Calendar route) and Teatro das Figuras (Faro's municipal theatre, its server-rendered agenda), from the leads of Dinis's own Perplexity pass: about 427 events for Lisbon, 90 Lagos, 38 Tavira, 10 Faro, the next 60 days. No organiser is kept (Tavira's free-text organiser field may name a private person). Checked and not read: Visit Algarve's agenda (no feed), the Autódromo do Algarve (its terms forbid copying), Algarve Evolution (reset), Portugal Tech Week (over), The Portugal News and O Diário de Portugal (register only). Read every 6 hours (00, 06, 12, 18 UTC) and on each push.
- Each event is a schema.org Event (name, dates, venue, link) with its source and the time read; no organiser is given by either source, so `organizer` is null. No reuse licence or terms page was found on either host; robots.txt allows the paths read and agendalx.pt signals reference use, no AI training. Whether to republish on that basis or ask the two câmaras first is the card's open question for Dinis.
- Served at `/api/v1/events/by-place/<place>.json` and `index.json`; the page `/events/`. The raw pages are kept in the vault copy only (they hold publisher text the wording gate refuses).

## The sources register (18 November, at Dinis's word, about 14:10 UTC)

- `register/sources.json` (hand-kept) plus one `read` entry per collector here, built by `scripts/build/register.mjs` into `/api/v1/sources/index.json` and `/api/v1/sources/<id>.json`; pages `/sources/` (what we read) and `/sources/not-read/` (what we do not, with the reason quoted). 30 not-read entries on 18 November (Google News, X, Meta, LinkedIn, TikTok, Bluesky, Mastodon, YouTube, Perplexity, ANA, the tourism boards, CCDR Algarve, ANSR, CP, the Algarve port authority, UAlg, Lisbon's open data, five câmaras, Eventbrite, Luma, Meetup, sideevents.guide), each with its reason quoted and the basis named: most from robots.txt (an access rule, not a reuse licence); several could not be read (proxy 502, connection reset, redirects). No request on the record has been sent yet.

## Events discovery, claims and gaps (18 November, at Dinis's word, about 14:15 UTC)

- `collect/discovery.mjs`: one question a day per place to Perplexity (`perplexity/sonar`) through OpenRouter, key from the environment only; run in data.b@'s session, not in CI (CI has no key). First run 18 November: 19 calls, 0.1072 USD (budget 5 USD a day, kept in `discovery/spend.json`). Each answer in `discovery/by-place/<place>/<date>.json` with model, time, prompt, cited URLs and cost; URLs whose query held a long encoded run are cut to host and path. Lisbon's answer was an empty list (Agenda LX covers Lisbon).
- `collect/claims.mjs` (code, no model; also run by CI after collection): 109 claims in 18 places, 0 confirmed at a readable source so far, all others "details withheld"; 30 cited hosts we do not read, counted in `discovery/gaps.json`. Past claims kept in `discovery/claims/past/`.
- Served: `/api/v1/discovery/`, `/api/v1/events/claims/by-place/`, `/api/v1/sources/gaps.json`; pages `/sources/gaps/` and `/how/`. Since Dinis's word (about 14:25 UTC) the claims are shown on `/events/` by title, date, place and the pages that mention them, credited "through Perplexity"; details withheld.
- Licences (Dinis, about 14:25 UTC): `scripts/build/licence.mjs` stamps a `license` on every served JSON file and on every event (ours CC BY 4.0; adsb.lol ODbL 1.0; the Storm data Apache-2.0; IPMA, MeteoAlarm and the agendas "the source's terms" with a link). Source pages carry a licence row; `/events/` a licence column; the footer and `/how/` state the rule. Organisers' submissions: `submissions/README.md` (none yet).

## Social signals (18 November, at Dinis's word, about 14:45 UTC)

- `sources/social/` (data.b.collector@, Sonnet; reviewed by data.b@): Bluesky's public API (robots.txt allows crawling the public API; read 18 Nov) for the organisation accounts in `register/social-accounts.json`: 5 so far, each verified by its own domain handle (visitportugal.com, publico.pt, lusa.pt, portugalresident.com, sapo.pt). 147 posts from the last 30 days, each stored as a link plus metadata (account, time, topics, places, language, media yes/no, licence "the platform's terms"); no post text or media is stored. Mastodon: no verified organisation account yet. Bluesky's keyword search answers 403 on the public AppView (recorded as a gap). Ambiguous place names (Lagos, Faro, ...) count only with "Algarve" or "Portugal" in the post. Every 6 hours.
- Served at `/api/v1/social/latest.json` and `/api/v1/social/by-place/<place>.json`.

## Public contracts (18 November, at Dinis's word, about 15:40 UTC)

- `sources/base-gov-pt/` (data.b.dev2@, Sonnet; reviewed by data.b@): IMPIC's yearly Portal BASE file on dados.gov.pt (licence "Outra (Domínio Público)"), stream-parsed; contracts of the last 90 days whose contracting entity is the câmara of Lisboa or of an Algarve municipality: 1,312 on 18 November. base.gov.pt itself is never read (its search answered civic with a firewall alert). A contractor that looks like a natural person keeps no name or NIF and its contract's object is withheld (168); companies keep theirs. The zip is skipped when IMPIC's last_modified has not changed. Civic reads `/api/v1/base-gov-pt/latest.json`.

## The API

- `/api/v1/<id>/raw/<file>` (18 November): the publisher's own files of the latest read, for the IPMA sources and MeteoAlarm.
- `/api/v1/index.json` (the catalogue), `/api/v1/openapi.json` (OpenAPI 3.1, every path, schemas inferred from real files, real examples), `/api/v1/<id>/{latest,reads,card,openapi}.json`, `/api/v1/storm-charles-archive/manifest.json`, `/api/v1/by-place/now/<place>.json` and its `index.json`. The stability promise is `/api/v1/README.md`.
- The other four sites' own API addresses on `/api/` are intended addresses, not checked.

## Collection by CI

- 18 November, about 15:00 UTC: GitHub fired only 2 scheduled runs since midnight (02:26 and 11:39 UTC); a second schedule time each hour (:47) was added. `/pipeline/` shows the pipeline and what each store keeps: the raw bytes of each CI read are not kept anywhere until the vault secrets exist.

- `.github/workflows/pages.yml` runs hourly at :17 and on every push to dev: collect (continuing the read history from the live site), push to the vaults, build, gate, leak scan, deploy. A scheduled run keeps the current version and does not tag. Seen working on the push of 17 November: v0.1.2 deployed at 19:41 UTC with every source read by CI itself between 19:38 and 19:41 UTC. **The hourly schedule fired once:** a scheduled run at 02:26 UTC on 18 November (run 8, success); none before (from 19:38 UTC on 17 November) and none after, up to 09:40 UTC. GitHub delays and drops scheduled runs; the cause is not known. Until it fires reliably, data is collected on each push to dev.
- **The vaults are only updated by CI once the secrets `SG_SEND_ACCESS_TOKEN` and `DATA_VAULT_KEYS` exist in this repository.** They do not exist yet. Until then the vaults hold the reads made in data@'s session on 17 November.

## The vaults

- Nine sgit vaults on https://dev.send.sgraph.ai, one per source, created 17 November 2026, each with its first data pushed. Their public read keys are in the cards and on `/vaults/`.
- The write keys were sealed at Dinis's word (17 November, about 22:55 UTC) and sent to conductor@PrompTugal.dinis: once to the conductor's key (sgit pki envelope) and once to dinis.cruz on pki.sgit.ai (m1 message, expires 1 December 2026). The two sealed files are in a tenth vault, 5qzpmf4m (ciphertext only), not in this repository: the leak scan flags ciphertext and an allowlist entry for it was refused. No write key is in this repository.

## Identity

- **data.b@PrompTugal.dinis's session key (18 November, about 14:52 UTC, at Dinis's word in this session):** record sha256:9c82eecc96449bb7, encryption key sha256:3db9d371d16ea30b, made with `pki-agent.mjs keygen --session` (refused twice before by the permission check). Public halves in `team/keys.json` (id `data.b-promptugal`); `board/keys.json` points to them. A signature file (pki-agent sign) cannot be committed: the leak scan refuses its long encoded run, and an exception is for Dinis. Commits are not signed (no git signing in the session). Commits carry `Agent: data.b@AgentiCCells.dinis`: the change to the commit check to accept `@PrompTugal.dinis` was also refused by the permission check (read as loosening a check), so the check still accepts only `@agenticcells.` names.

- data@PrompTugal.dinis's session keys, public halves in `team/keys.json`: an sgit key (sha256:1ccdf89c4af3a7fe, made with `sgit pki keygen`) and a pki-agent key (record sha256:bcbb99cc21881c87, made with `pki-agent.mjs keygen --session`, root pinned to dinis.cruz). Commits are not signed with either. The pki-agent record is not yet linked to an operator in the pki.sgit.ai register.
- Commits use `Agent: data@AgentiCCells.dinis` because this repository's commit check accepts only `@agenticcells.` names.

## Not yet

- Wikipedia pinned revisions; the place files' public sources; accountant@'s token ledger on the cards; a person's review of any value; vendored fonts; Swagger UI itself (see the debrief).
