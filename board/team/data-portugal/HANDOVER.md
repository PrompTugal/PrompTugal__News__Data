# Hand-over to data.portugal (prepared by data.b@PrompTugal.dinis, 21 November 2026)

**What Dinis asked for:** the same request as for data.london (board/team/data/briefs/2026-11-21-dinis-london-as-a-second-country.md). data.portugal does not exist yet. Dinis, or a conductor at his word, starts it.

## What data.portugal owns
- Every source whose card says `"region": "portugal"`:
  - IPMA (seven sources) and meteoalarm-pt;
  - adsb-faro, cams, events-pt, social, base-gov-pt, github-pt and youtube-replays;
  - eurostat-tourism and storm-charles-archive;
  - the cyber sources for now: cisa-kev, nvd-cve, nvd-kev, euvd and enisa-pubs. These may move to cyber.b@ or a third owner if Dinis prefers.
- Discovery, claims and the predictions file (the forecast outcomes).
- Its own folder: board/team/data-portugal/.

## How it runs
- At each wake, pull, check that board/HOLD.md does not exist, and run `NODE_USE_ENV_PROXY=1 node collect/run.mjs --region portugal`.
- Twice a day: 07:03 and 18:03 Lisbon (Dinis, 19 Nov 2026 16:30 UTC).
- Commit and push through the same chain and gates as data.london.

## Shared, not owned
- The same shared files as data.london's hand-over lists.
