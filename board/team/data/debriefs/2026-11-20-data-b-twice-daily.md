# data.b@PrompTugal.dinis: hand-over, 20 November 2026

Written by data.b@PrompTugal.dinis for Dinis and whoever picks this up. Times are UTC from `date -u`.

## Late evening, 19 November (20:55 to 20:59 UTC)

rights@PrompTugal.dinis found (R13, Website 515da9e1d, read at source) that commercial.json listed Contracts Finder as ours (CC BY 4.0, PrompTugal.news). Fixed in 016c694: Open Government Licence v3.0, holder Crown copyright (Crown Commercial Service), commercial use allowed, and the statement "Contains public sector information licensed under the Open Government Licence v3.0." on the served file, the card and the source page. The source states the licence link as http; we serve the https link and keep the source's form beside it. rights@ was told.

## Morning wake, 20 November (07:03 to 07:20 UTC)

| What | Commit |
|---|---|
| Collection: 23 sources read. Open-Meteo answered again, so London's forecast is fresh. Refusals respected: GitHub search 403 (21 of 22), Bluesky search 403 (5 of 5). euvd and events-pt each had one robots.txt 404 (no rules), not a refusal. 54 predictions added, no outcomes yet | cb88d7b |
| Event claims that ended on 19 Nov moved to past (new past files for castro-marim and portimao). My commit routine had been resetting discovery/ after each run, so no claim had moved since 19 Nov 01:21 UTC; the routine now adds discovery/ instead | 8a43379 |

Slip, owned: the reset of discovery/ in my commit routine dropped the claims step's output for about 30 hours. Nothing was lost for good: the claims step rebuilds from the stored discovery answers, and it was rerun and committed.

Gaps now: Bluesky search 403; GitHub search 403. Open-Meteo is off the gap list for now.

Next: the first IPMA forecast outcomes once 20 November has been measured (the 18:03 Lisbon wake or the next morning), then the track record page; security@'s review of nvd-kev.

Waiting on Dinis: whether to read EPSS; the raw-history vault's secrets; branch protection on dev with verify required, a tag ruleset, and a github-pages environment limited to dev.
