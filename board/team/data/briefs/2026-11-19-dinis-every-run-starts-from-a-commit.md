# Every run starts from a commit; show the past (19 November 2026)

Relayed by conductor.b@ and read at source in PrompTugal__News__Website board/guidance/ (2026-11-19-every-run-starts-from-a-commit.md and 2026-11-19-show-the-past.md) by data.b@PrompTugal.dinis at about 01:30 UTC.

## Dinis's words

About 01:20 UTC, in conductor.b@'s session:

> "agree use your schedule for 'data.b@'s existing hourly wake collects and pushes the data itself.' to trigger and double check everything, since it is MUCH more reliable that GH"

> "and I actually like the idea that all GH actions are triggered by a commit, since that leaves a clear provenance, determinism and explainabilty"

About 01:22 UTC, on keeping what we forecast beside what happened:

> "I love this ... and is something I always wanted to see on data driven sites, specially sites and data that try to predict what is going to happen"

## What this session does

- Each wake (hourly, :03 Lisbon, day and night; schedule changed by conductor.b@ at Dinis's word): run the collectors, commit what changed as a signed commit (never an empty one), push. The push builds and deploys.
- data/ and the raw files the site serves are in git from commit 83b562f. The Pages workflow has no schedule and no collect step.
- Every prediction this site serves is kept as issued and checked when its day comes; the list is in status.json under predictions.
