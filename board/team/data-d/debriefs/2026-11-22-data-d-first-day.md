# data.d@PrompTugal.dinis: hand-over, 22 November 2026

Written by data.d@PrompTugal.dinis (session https://claude.ai/code/session_015gaHdboMeL96vpsBRXSX2z) for Dinis, conductor.d@, and the new agent for generic public data sources. Times are UTC.

## State
- Push: account D can push since 15:34 (factory.d's 8a7f0e3). All work is on branch `data-d/pending` (not dev): my key commit (cd59e1f, also on `data-d/key`) fails check-signatures until a listed key or factory.d's key-request pipeline adds it; everything after it passes. When the key is on dev, rebase `data-d/pending` on dev and push to dev.
- Briefs with Dinis's words: board/team/data-d/briefs/ (streaming pages 22 Nov 03:30 and 13:50; studio.d, spending, the Desk, Strictly, Wikipedia 15:35 and 15:45). Decisions on maestro.d's Decision Desk: streaming-json, streaming-lane, strictly-owner.
- Dinis agreed way D for streaming pages (a static page per entity plus one graph file). Proposal and prototype: board/team/data-d/proposals/2026-11-22-streaming-pages-and-graph.md.

## For the new agent (generic public data sources), when Dinis confirms
- Built and yours to take: `sources/strictly-four-tens/`, `sources/football-england/`, `sources/football-portugal/`, `collect/football.mjs`, `collect/connections.mjs`, `wikipedia/` (feed, extractor, test), `register/wikipedia-tracked.json`, `scripts/build/wikipedia.mjs`. REALITY.md's section "Wikipedia feed, Strictly and football" lists what each holds and its gaps.
- Waiting: the Wikipedia feed has never run. Wikimedia answers HTTP 429 to cloud-session traffic, even with an identifying User-Agent. It needs an OAuth 2 client-credentials app (free, Dinis registers it; WIKIMEDIA_CLIENT_ID and WIKIMEDIA_CLIENT_SECRET). The feed reads them and sends a 4-hour token.
- Open findings: Four Tens covers series 1 to 15 only, with 4 occasional judges to check and 15 performances without judges' scores; openfootball's current season was last updated 20 Sep 2026; 17 clubs are spelled more than one way (join by Wikidata id once the feed runs).
- Streaming, Dinis by voice memo ~17:05 UTC (relayed): JSON first, then HTML; Wikidata yes, but near-real-time sources are needed too. TMDB's terms count cached TMDB data sets given to others as commercial use, and Dinis chose "TMDB, display only": JSON must come from a source whose licence allows it (Wikidata CC0; others to be found).
- Rules learnt: `collect/run.mjs` also rewrites shared derived files (events, social, run.json, claims): restore them after running only your sources. Edits to shared build files stay small and additive (conductor.d@).

## Other work today
- Morning briefing (Tejo, presenters library 0.1.1, 2D fallback): https://claude.ai/artifact/KWHUARzP6DNeXa5EixNmBx. The 3D presenter failed on Dinis's iPhone; cause unknown until the page's diagnostics record a failure.
- Storyboard for studio.d (studio-storyboard/0): board/team/data-d/briefings/2026-11-22-streaming-pages.storyboard.json, sent 15:3x.

## Waiting on Dinis
- The Wikimedia credential.
- Confirming the new agent for generic sources.
- The Desk decisions (streaming JSON route, streaming lane, Strictly owner).
