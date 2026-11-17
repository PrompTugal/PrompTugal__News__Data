# REALITY.md: what exists now

A thing not written here does not exist. Kept by data@PrompTugal.dinis. Last checked: 17 November 2026, about 19:45 UTC.

## The site

- https://data.promptugal.news, deployed by GitHub Pages from `dev` (`.github/workflows/pages.yml`); version at `/version.json`, shown on every page. v0.1.1 was the factory's seed; v0.1.2 (17 November, 19:41 UTC) is the first version with data.
- Pages, each with a markdown twin (`index.md` beside `index.html`): `/`, `/sources/`, `/sources/<id>/` for nine sources, `/api/`, `/api/swagger/` (the API explorer), `/vaults/`, `/about/`, `/design/` with `/design/a/`, `/design/b/`, `/design/c/`. Also `/llms.txt` and `/sitemap.xml`.
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

## The API

- `/api/v1/index.json` (the catalogue), `/api/v1/openapi.json` (OpenAPI 3.1, every path, schemas inferred from real files, real examples), `/api/v1/<id>/{latest,reads,card,openapi}.json`, `/api/v1/storm-charles-archive/manifest.json`, `/api/v1/by-place/now/<place>.json` and its `index.json`. The stability promise is `/api/v1/README.md`.
- The other four sites' own API addresses on `/api/` are intended addresses, not checked.

## Collection by CI

- `.github/workflows/pages.yml` runs hourly at :17 and on every push to dev: collect (continuing the read history from the live site), push to the vaults, build, gate, leak scan, deploy. A scheduled run keeps the current version and does not tag. Seen working on the push of 17 November: v0.1.2 deployed at 19:41 UTC with every source read by CI itself between 19:38 and 19:41 UTC. The first scheduled run is due at 20:17 UTC and has not been checked.
- **The vaults are only updated by CI once the secrets `SG_SEND_ACCESS_TOKEN` and `DATA_VAULT_KEYS` exist in this repository.** They do not exist yet. Until then the vaults hold the reads made in data@'s session on 17 November.

## The vaults

- Nine sgit vaults on https://dev.send.sgraph.ai, one per source, created 17 November 2026, each with its first data pushed. Their public read keys are in the cards and on `/vaults/`.
- The write keys were sealed at Dinis's word (17 November, about 22:55 UTC) and sent to conductor@PrompTugal.dinis: once to the conductor's key (sgit pki envelope) and once to dinis.cruz on pki.sgit.ai (m1 message, expires 1 December 2026). The two sealed files are in a tenth vault, 5qzpmf4m (ciphertext only), not in this repository: the leak scan flags ciphertext and an allowlist entry for it was refused. No write key is in this repository.

## Identity

- data@PrompTugal.dinis's session keys, public halves in `team/keys.json`: an sgit key (sha256:1ccdf89c4af3a7fe, made with `sgit pki keygen`) and a pki-agent key (record sha256:bcbb99cc21881c87, made with `pki-agent.mjs keygen --session`, root pinned to dinis.cruz). Commits are not signed with either. The pki-agent record is not yet linked to an operator in the pki.sgit.ai register.
- Commits use `Agent: data@AgentiCCells.dinis` because this repository's commit check accepts only `@agenticcells.` names.

## Not yet

- Wikipedia pinned revisions; the place files' public sources; the observability snippet; accountant@'s token ledger on the cards; a person's review of any value; vendored fonts; Swagger UI itself (see the debrief).
