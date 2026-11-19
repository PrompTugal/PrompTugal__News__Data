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

## Later on 19 November (03:09 to 08:08 UTC)

Every hourly wake from 03:03 to 08:03 collected and committed the data. At 06:03 the 6-hourly sources were due too and the run took over ten minutes; my foreground limit stopped it, so it was finished in a second run and committed in two parts (6ee935e, a84bc21). A 6-hourly wake now runs the collection in the background with a log.

| What | Commit |
|---|---|
| No IP-based location (Dinis ~03:15 UTC): obs.js keeps the country from the browser's time zone only | f32290a, 2de3310 |
| Predictions for the library's PRED collection: data/predictions/predictions.jsonl, append-only, outcomes once a station day is complete (series PRED 2026/0003) | 0e3eb6b |
| The shared time-zone table (1.0.0, then 1.1.0), checked against the registry; a newer version leaves the piece out rather than stopping the build | c535441, f827417 |
| Leak scan: SSH public keys (sk- and ecdsa forms included) fail outside their field; tests in scripts/test-leak-scan.mjs | 9bf6c76, fd6da9a |
| Sites bar 1.2.0, then 1.2.1, pinned per version in the registry; this site's nav CSS kept off the bar (the phone page had scrolled sideways) | 09eafc4, fe30f0b, 4d91315 |

Gap: Bluesky's public search answers 403 to unauthenticated reads since 06:15 UTC; the account feeds still read. Recorded in status.json, not worked around.

Slip, owned: at 05:07 UTC a ';' in my command line let the hourly commit (0796eae) go in after a failed build; nothing deployed from it. The reset step is now written '{ git checkout -- discovery || true; } &&'.

Waiting on Dinis: EPSS (read it, or ask FIRST first); the raw-history vault's secrets.

## Later on 19 November (08:09 to 15:05 UTC)

Every hourly wake from 09:03 to 15:03 collected and committed the data. Times are from `date -u` or the git log.

| What | Commit |
|---|---|
| London's forecast block states its own 6-hour cadence (Open-Meteo is read every 6 hours; an hourly try got 429) | d402893 |
| A 6-hourly or daily source refused with 429 or 403 waits a whole cadence before the next try (Open-Meteo answered 429 at 11:00, about 12:05 and 13:08 UTC; next try at the 19:03 wake) | 4a4d130 |
| EUVD: a field holding a word the wording check refuses is dropped, never altered, and counted; the check is unchanged | 379aae6 |
| Signing check, controls 6 to 9 from security@'s rulings of 14:02 to 14:26 UTC (relayed by conductor.b@, read at source in PrompTugal__News__Website): orphans refused except the pinned base; skips by ancestry only; no shallow checkout; the checks and their config come from the anchor (the head of the latest successful push run of the workflow on dev, from GitHub's runs API) and cover anchor..AFTER; they run in a separate verify job that runs no pushed code; deploy needs it | 01cebcd, 4789fdd, 5308cd5, 7b19a5b, a41ca50, 90d6d59, 72bff13 |
| Peers' findings: the site is unpacked, after its listing is vetted, before the trusted copies exist; the leak scan checks files holding a NUL byte for key shapes and refuses symlinks; the workflow test ignores comments; git show runs with no attributes or textconv | d2e5b3b |

Tests now: 28 signing cases (scripts/test-check-signatures.mjs), 21 leak-scan cases (scripts/test-leak-scan.mjs).

Gaps now (status.json): Bluesky search 403 since 06:15 UTC; Open-Meteo 429 (London's forecast kept from the 06:15 UTC read); GitHub search 403 on 21 of 22 reads at about 12:05 UTC.

Slips, owned: a commit retry at 11:11 UTC left out the build, validate and leak-scan steps and was refused by the session's safety check; the full chain was rerun. A message to conductor.b@ at about 14:12 UTC gave its time as "14:2x", a guess; corrected at once.

Waiting on Dinis: EPSS (read it, or ask FIRST first); the raw-history vault's secrets; branch protection on dev with the check required, a tag ruleset limiting release tags to GitHub Actions, and a github-pages environment that accepts deployments only from dev (the workflow file still comes from the pushed tree).

## Evening, 19 November (15:06 to 18:16 UTC)

Since about 16:30 UTC (Dinis: "we don't need hourly updates") the wake runs twice a day, 07:03 and 18:03 Lisbon. The 16:03 and 18:03 wakes collected and committed; the 18:03 one ran the 6-hourly sources too.

| What | Commit |
|---|---|
| Twice a day: every served file states its cadence (twice a day, stale after 13 hours; discovery daily); a refused source waits at least 4 hours; pages, README and REALITY.md describe the two wakes | 8f6a905, 15cdd1e |
| events.b@'s findings: cadence on every derived file; the register no longer says "(every 6 hours)"; Algarve's events history no longer repeats its towns' 99 claims | 15cdd1e |
| Signing and CI, from security@'s rulings and peers' findings: the anchor is the latest push run on dev whose verify job passed; verify, deploy and tag only on dev; a pushed _site and .gitattributes refused; git attributes from the empty tree, git 2.42 or later, the version check failing closed; every workflow step syntax-checked; control 10, no symlinks, paths compared whole | ceadd7c, 3abec12, 1c49806, 0c9d41f, 0755fc0 |
| Cameras (Dinis ~17:40 UTC, read at source): 19 MEO BeachCam and 2 SkylineWebcams cameras as credited links, embed off, never fetched by code | 5c999dc, 9061eff |

Tests now: 38 signing cases, 21 leak-scan cases.

Gaps at 18:15 UTC: Open-Meteo 429 (fourth today, one request), GitHub search 403, Bluesky search 403.

Slips, owned: I read SkylineWebcams' Algarve list page before its terms (four requests in all; nothing served). An apostrophe broke a page string before a build; caught by the build, fixed before any commit.

Waiting on Dinis: EPSS; the raw-history vault's secrets; branch protection on dev with verify required, a tag ruleset, and a github-pages environment limited to dev.
