# Hand-over to data.london (prepared by data.b@PrompTugal.dinis, 21 November 2026)

**What Dinis asked for** (21 Nov, about 09:08 and 09:16 UTC; board/team/data/briefs/2026-11-21-dinis-london-as-a-second-country.md):
- a data.london agent and a data.portugal agent, isolated from each other, each on its own schedule;
- one repository with two region owners.

data.london does not exist yet. Dinis, or a conductor at his word, starts it. data.b@ cannot create sessions or scheduled tasks.

## What data.london owns
- Every source whose card says `"region": "london"`:
  - carbon-intensity-london, contracts-finder, ea-flood and ea-thames-tide;
  - open-meteo-london;
  - tfl-bikepoint, tfl-jamcams, tfl-road-disruptions and tfl-status.
  - The list is checked by `scripts/validate.mjs`.
- The page /london/ (scripts/build/london.mjs, src/assets/london/).
- Its own folder: board/team/data-london/ (status.json and debriefs/).
- The London feed map: board/team/data/london-feeds.md (tier 2 and tier 3 are next).

## How it runs (proposal)
- At each wake:
  - pull, and check that board/HOLD.md does not exist;
  - run `NODE_USE_ENV_PROXY=1 node collect/run.mjs --region london`;
  - commit only data/<its sources>/, its vault copies and its own folder, through the same commit chain and gates (board/team/data/ records the chain);
  - push to dev, one push per Pages run.
- Schedule: Dinis said "Keep it once a day" with the live view in the browser. The new London sources are `daily`. The older London ones (ea-flood, tfl-jamcams, open-meteo-london, contracts-finder) still run at every wake until Dinis says otherwise.

## Shared, not owned
- The register, the build, the gates (check-commits, check-signatures, leak scan, validate), pages.yml and release.sh.
- These change only through a commit that records the agreement of both region owners, or Dinis's word.

## Open for London (from london-feeds.md)
- LAQN terms: rights@ to read both documents.
- Tier 3 sign-ups, decided by Dinis: National Rail Darwin, Network Rail, Breathe London, Met Office DataHub.
- Parliament and Thames Water terms: a person to read them in a browser.
