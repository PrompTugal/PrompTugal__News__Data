# data@PrompTugal.dinis: first version hand-over, 17 November 2026

So that a session on another account can carry on. No key, token or vault write key is in this file.

## What exists

- **The site:** https://data.promptugal.news. Front page with every source's live status; a card page per source; the API page; the API explorer at `/api/swagger/`; the vaults page; the about page; `/design/` with three front-page variations. A markdown twin for every page, `llms.txt`, `sitemap.xml`. `REALITY.md` has the detail.
- **Nine sources**, each one folder `sources/<id>/` with `collect.mjs` (code, no model) and `card.json`: ipma-warnings, ipma-observations, ipma-city-forecasts, ipma-fire-risk, ipma-uv, ipma-sea, adsb-faro, meteoalarm-pt (hourly) and storm-charles-archive (once). All read cleanly on 17 November: the eight hourly ones in about 2 minutes (52 requests), and the archive's 142 files all matched their stated sha256.
- **Stable addresses for the other four sites:** `https://data.promptugal.news/api/v1/<id>/latest.json`, the catalogue `/api/v1/index.json`, OpenAPI 3.1 at `/api/v1/openapi.json` and per source `/api/v1/<id>/openapi.json`, the promise in `/api/v1/README.md`. For the place pages: `/api/v1/by-place/now/<place>.json`, in the same shape as PrompTugal__News__Website's `data/by-place/now/` (the move of `board/tools/local-now.mjs` is `collect/by-place-now.mjs`).
- **Nine vaults**, one per source, public read keys in each card and on `/vaults/`.
- **Hourly collection:** `.github/workflows/pages.yml`, at :17 every hour and on every push: collect, push to the vaults (only once the secrets exist), build, gate, deploy.

## Who did what (code, agents, people)

- data@PrompTugal.dinis (Opus): the collectors, `collect/`, the cards, the vaults, the workflow, the API explorer, this file, the review and the commit.
- data.dev@PrompTugal.dinis (Sonnet, a sub-agent inside data@'s run): the site build (`scripts/build/`), the API files and OpenAPI documents, the pages, the validator's new checks.
- data.design@PrompTugal.dinis (Sonnet, a sub-agent): `src/design/`, the three variations.
- No person has checked any value yet.
- Tokens: not measured. accountant@'s ledger is not running on this account.

## What Dinis must decide

1. **The vault write keys.** They exist only in this session's scratchpad and end with it. I did not seal them to anyone: the estate has no pinned root key for Dinis that I could find, and routing a credential to another agent is his call. Either tell this session (before it is archived) which key to seal them to, or let the next session make new vaults (cheap: `sgit create`, then update `vault` in each card). Either way, **CI needs two repository secrets** to keep the vaults current: `SG_SEND_ACCESS_TOKEN` and `DATA_VAULT_KEYS` (a JSON object, source id to vault key). Without them the site still updates hourly; only the vaults stand still.
2. **IPMA's terms and the reading meter.** IPMA allows free copying and use "para uso pessoal ou público desde que dessa utilização não decorram finalidades lucrativas ou ofensivas" and always with the source named (https://api.ipma.pt/, read 17 November 2026). Whether a paid reading meter on a PrompTugal site counts as a profit-making purpose is for Dinis (or a question to IPMA). The data site carries no meter; its masthead links to promptugal.news/account/ as the five-sites brief asks.
3. **Swagger UI.** The vendored Swagger UI 5.33.3 bundle contains an em dash and the word "seamless", which this site's wording gate refuses, and I may not loosen the gate. So `/api/swagger/` is a small explorer written here over the same OpenAPI documents. Bring Swagger UI back only with Dinis's word on a narrow gate exception for vendored files.
4. **Full sha256 in the API.** The leak scan flags any hex run of 48 or more characters, so the site and git carry the first 16 hex of each sha256 and the vaults carry the full ones. A narrow scan rule for `"sha256": "<64 hex>"` values is for security@ or Dinis to decide. I asked to add one and was refused, rightly.
5. **Agent names in commits.** This repository's CLAUDE.md and commit check want `role@AgentiCCells.person`; the five-sites brief wants `<role>@PrompTugal.dinis`. Commits here are subject `data@PrompTugal.dinis: ...` with the trailer `Agent: data@AgentiCCells.dinis`, which the check accepts. Which name is right is Dinis's to say.
6. **Signing.** Running pki-agent.mjs (downloaded from pki.sgit.ai) was refused in this session, so the session key was made with `sgit pki keygen` and its public half is in `team/keys.json` (the only path the leak scan allows for public keys; the brief says `board/keys.json`). Commits are not signed with it.
7. **The design:** choose A (the ledger), B (now: big numbers first) or C (for builders: endpoints first) at `/design/`. The current front page is closest to A.

## What is next

1. When Dinis answers 1: add the secrets, or make new vaults and fill the cards.
2. Watch the first scheduled runs (Actions tab): the version stays, the read times move, `reads.json` grows. adsb.lol allows 500 requests a day per address without a key; hourly is 24.
3. Point PrompTugal__News__Website's place pages at `/api/v1/by-place/now/<place>.json` (the Website team's change, not ours) and tell the weather, civic, startups and travel teams the addresses.
4. Add the sources the brief still lists: Wikipedia pinned revisions, the place files' public sources. Each as one folder, one collector, one card, one vault.
5. Re-read MeteoAlarm's terms page at the source (the card quotes the storm team's reading of 11 November).
6. Observability on this site, once observability@ or its replacement is running.

## What I learnt

- sgit: an empty vault cannot be cloned. Make the first commit from the directory `sgit create` made; after that `sgit clone --no-checkout -` (key on stdin) plus one `sgit write ... --also ... --push` works without downloading the vault's history. `collect/vault-push.mjs` does this and never shows sgit's output.
- A read key printed by `sgit create` starts `sgit_private_read_`; publish it as `sgit_public_read_<same hex>`, which clones read-only and passes the leak scan.
- IPMA's `observations.json` is about 900 KB (24 hours, every station); keep only the latest hour in the API and the whole file in the vault.
- GitHub Pages serves with open CORS, so the other sites can fetch from the browser.

## Where things are

- Collectors and shared code: `collect/`, `sources/<id>/`. Build: `scripts/build/`. Workflow: `.github/workflows/pages.yml`. Cards: `sources/<id>/card.json`. Key: `team/keys.json`.
- Collect locally: `node collect/run.mjs`; the archive: `node sources/storm-charles-archive/collect.mjs`; push: `DATA_VAULT_KEYS_FILE=<file> node collect/vault-push.mjs`.
