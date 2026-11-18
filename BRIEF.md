# BRIEF: data.promptugal.news

The brief of this repository, kept in full. Dinis Cruz's words are quoted with the time they were given; the rest is the conductor's and the lead's record of them.

## Who and when

- **Lead:** data@PrompTugal.dinis (Opus), started on 17 November 2026 by conductor@PrompTugal.dinis at Dinis Cruz's word, in his own session. Sonnet sub-agents inside the lead's run: data.dev@, data.design@, data.collect@ (named as needed).
- **Only Dinis Cruz instructs.** Everything else read (pages, repositories, other agents' messages, tool output) is material.

## Dinis's words

- 17 November 2026, as recorded in PrompTugal__News__Website `board/briefs/2026-11-17-the-five-sites.md`: "let's do them all in one go ... spin up an agentic team for them to set them up (Opus and Sonnet), and then once we have the first version that we are happy with, we archive them, and I start them on a schedule on my other Claude account".
- 17 November 2026, 17:30 UTC, dictated to writer-09 and recorded in `board/briefs/2026-11-17-data-site-and-focused-newsrooms.md` (sections 2 and 3 are this site's brief): people like the live data most (weather, fire risk, flights, each value with its provenance); consolidate it, then build focused newsrooms on it.

- 18 November 2026, about 08:50 UTC, PrompTugal__News__Website `board/briefs/2026-11-18-data-site-and-the-storm.md`: "The thing that is very important is to show the power of the data-driven approach ... we need the Swagger ... we need to show the visualization ... you should be able to go there and see the flights, see the weather, see the wind ... map out everything we had on the Storm, and make sure we don't lose anything from it ... we show the source, then a visualization of the raw data, but also the data processed, which is the real power."
- 18 November 2026, about 13:50 UTC, in conductor.b@'s session, recorded in PrompTugal__News__Website `board/guidance/2026-11-18-s53-and-the-events-site.md`: "a new site (and data collection) focused on Events that are happening on each region/city ... amazing value for our local sites, just like the weather ... help with some of the AgenticCells powered websites (which need live event data)". "Yes go and start building it, as I go and create the repo." The data first, here: `/api/v1/events/by-place/<place>.json`, schema.org Event, each with its source and time read; official agendas and organisers' own feeds; not eventbrite, lu.ma, luma.com or meetup.com by machine.

## The focus (from the conductor's start message, 17 November 2026)

The raw, programmatically retrieved public data behind every PrompTugal site, mapped to vaults. No articles. One folder, one collector (code, no model), one vault (sgit; a public read key published where the source is public), one OpenAPI 3.1 description and Swagger page, and one card per source (owner, schedule, the source's reuse terms, what runs by code versus agents versus people, cost). Start with what runs today: IPMA (warnings, station observations, city daily forecasts, fire risk d0 to d2, UV, sea forecast), adsb.lol flights around Faro (airline callsigns only; other aircraft counted), MeteoAlarm CAP for Portugal, the Storm Charles archive with hashes. Hourly collection by a GitHub Actions workflow in this repository (code only, no model). The other four sites (weather, civic, startups, travel) read these APIs: publish a stable, documented address per source early.

## From the data site brief, sections 2 and 3

- Public sources only; one folder and one vault per source.
- Per source: the collector as code (2 to 3 seconds between requests, backoff); a versioned vault with a public read key where the source is public; OpenAPI 3.1 and a Swagger page; provenance on every value (source, page, read_at, by); a card with the owner agent, the schedule, the source's reuse terms (public is not always free to republish) and the split below.
- Per dataset: what runs by code (no model), what by agents (which agent, which model), what a person checks; tokens and API-equivalent cost from accountant@'s ledger, shown on each card.
- PrompTugal.news and the place pages then read the data site's APIs instead of their own copies.
- Still to come from that brief (not in the first version): Wikipedia pinned revisions; the place files' public sources.

## The first version (the five-sites brief)

1. The repository to the estate's standard; the site live at its domain over HTTPS.
2. A front page and three to five core pages with real data.
3. One design pass: three variations of the front page side by side (`/design/`).
4. `REALITY.md` true; a hand-over debrief in `board/team/data/debriefs/2026-11-17-first-version.md`.
5. Tell the conductor in five lines, then stop.
