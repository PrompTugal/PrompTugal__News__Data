# data.b@PrompTugal.dinis: 19 November 2026, the hourly collector

Hand-over for the next wake or another session. It carries on from the night hand-over of 18 November (commit 291574a, 22:06 UTC). Times are UTC, taken from the clock or the git log. No key, token or vault key is in this file.

## Dinis's words this period works from (each recorded in board/team/data/briefs/)

- About 22:20 UTC on 18 Nov (relayed, verified in PrompTugal__News__Website board/guidance/2026-11-18-london.md): London is the first place beyond Portugal.
- 18 Nov evening, in this session: keyless sources only for now; raw history in public-read vaults; add the EU; the data site is free and non-commercial; every dataset explicit on licence and commercial use; billing only on promptugal.news; every commit gets a release tag.
- About 01:10 UTC on 19 Nov (guidance 2026-11-19-signed-commits-paid-search-and-free-embeds.md): signed commits.
- About 01:17 and 01:22 UTC (guidance 2026-11-19-show-the-past.md): "can we always try to show historical data"; every prediction is kept and checked.
- About 01:20 UTC (guidance 2026-11-19-every-run-starts-from-a-commit.md): "all GH actions are triggered by a commit, since that leaves a clear provenance, determinism and explainabilty"; data.b@'s hourly wake collects and pushes the data.

## How the site runs now

- **Every hour at :03 Lisbon** this session's wake pulls, checks board/HOLD.md, runs `NODE_USE_ENV_PROXY=1 node collect/run.mjs`, commits `data/` and the served raw files (`vaults/<id>/latest/` for IPMA, MeteoAlarm, Eurostat and Open-Meteo) as a signed commit, and pushes. The push builds and deploys. GitHub's workflow has no timer and no collector.
- **Cadences:** hourly (11 sources); every 6 hours by the age of the last read (base-gov-pt, cisa-kev, enisa-pubs, eurostat-tourism, euvd, events-pt, github-pt, nvd-cve, open-meteo-london, social, youtube-replays: next due about 05:15 UTC); daily (nvd-kev, next due about 02:17 UTC on 20 Nov).
- **Commit procedure, one && chain:** build, validate, leak scan, `git checkout -- discovery`, add, commit with the five trailers, check-commits, check-signatures, push. One push per run; wait for `/version.json` to show the previous commit before the next push.
- **Signing:** repo-local ssh signing with this session's key (`~/.ssh-data-b/signing`, never printed). The machine's global git config points at another signer; the repo's own config overrides it.

## What was done (18 Nov 22:06 to 19 Nov 03:08 UTC)

| What | Commit |
|---|---|
| London: EA flood and rain, Open-Meteo London, TfL JamCams (889, embeddable under TfL's terms); 31 UK sources on the register | 994bd45, 81e7d24, 249767c |
| The EU and reservoirs on the register; Eurostat tourism nights; ENISA's EUVD and publications; NVD whole-day counts | d747a2d, ce5d7ec, c1e05f6 |
| Commercial use on every licence; billing only on promptugal.news | 249767c, 6c02b34 |
| Web Summit replays (YouTube Data API, the environment's key) | c166118 |
| Sites bar 1.1.0, then 1.1.1 with each file checked whole against the registry's bar.integrity | 5ee1237, e8d9a54 |
| Signed commits; the check meets security@'s five controls, with 12 tests in CI and release.sh | c243ef7, 9bfdf0c, f68beb3 |
| Full public forms in team/keys.json, allowed by the leak scan only by field and exact pattern | f68beb3 |
| Data in the browser: data_read_at, cadence and schema on every latest file; charts show each file's licence | f7f53a5, 6a11922, e74aea1 |
| Show the past: weather history per place (IPMA, London), camera status history, events history with Perplexity's claims kept | 6c1c927, b716c15, 432dc8c |
| Every run starts from a commit: data in git, no timer, no CI collection | 83b562f |
| History licences per rights@ R8 (IPMA and Open-Meteo values off promptugal.news) | 432dc8c |
| nvd-kev: NVD's record of all 1,786 KEV CVEs, daily, for cyber.b@'s CVE store | a902800, 23f5f0b |
| EPSS on the register, not read (terms unclear) | ecc438d |

## Slips, owned

- Two commits went in after a failed step, because the commit ran on a separate line from the failed gate (6c1c927, fixed in 7b3d262). Every commit now runs in one && chain.
- Messages and status on 19 Nov between about 01:30 and 01:38 UTC carried guessed times up to half an hour ahead of the clock. Corrected (43727ea); every time now comes from `date -u`.
- My first signature tests passed their failing cases for the wrong reason (the machine's own signer). Each failing case now checks its reason.

## Waiting on Dinis

1. EPSS (first-epss on the register): no licence is named; FIRST's Services Terms limit content to cybersecurity uses and may not cover EPSS. Read it on the free site, or ask FIRST first?
2. London observed temperature needs a Met Office key; bulletins.b@ compares rain only until then.
3. The raw-history vault's secrets, so the raw bytes kept out of git (NVD, CISA KEV, events, TfL, EA, dated copies) have a home.
4. Branch protection with required status checks on dev (security@: only GitHub's setting stops someone switching a check off).
5. The older asks in status.json still stand (Storm files held back, the adsb-faro vault's old reads, front page choice, Luma and Eventbrite, CORDIS, permission letters, ENISA's robots.txt).

## Next

1. Each hour: collect, commit, push; say in status any source that failed.
2. The first track record: IPMA's forecasts against the station days, per place and lead day, from /api/v1/history/.
3. security@'s review of nvd-kev (asked through conductor.b@, 02:23 UTC); no date-range gap reader until it clears.
4. ECMWF open forecasts; charts for KEV, NVD, Eurostat and GitHub; INE UK guests by region (terms accepted by Dinis).
