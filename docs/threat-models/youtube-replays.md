# Threat model: youtube-replays (Web Summit 2026 replays, through the YouTube Data API)

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 19 November 2026 by data.b.dev@ from the code at that date (WS-177), for library.b@PrompTugal.dinis REQ-2026-0001. Not yet reviewed by a person or by security@.

## Parts

- `sources/youtube-replays/collect.mjs`: every 6 hours, three or four GETs to `https://www.googleapis.com/youtube/v3/`: `channels.list` (forHandle `WebSummit`), `playlistItems.list` (the uploads playlist, 50 a page, back to 1 November 2026) and `videos.list` (50 ids a call). Never `search.list` (100 units). A cap of 200 quota units a run is checked before every call; the units used are written to `provenance.quota_units_used`.
- `sources/youtube-replays/card.json`: terms with exact quotes, schedule, cost.
- The build serves `data/youtube-replays/latest.json` and `reads.json`. There is no raw layer and no vault.

## The key

- It is a network secret of the environment. The proxy adds the header `X-Goog-Api-Key` to requests to `www.googleapis.com`. The code does not contain, read, set or send a key, and no address holds `key=`. Request headers are never printed or stored.
- Node's `fetch` does not use the environment's proxy unless it is started with `NODE_USE_ENV_PROXY=1` (Node 22.21 or later); without it the request goes direct and Google answers 403. The collector treats that exactly as it treats a missing key. This is a setting of the machine that runs it, not of the code.
- Where there is no key (GitHub Actions), the first call answers 401 or 403. The run then does nothing: it keeps the last read (copied from the live site by `collect/run.mjs --prev`), writes `last_attempt.outcome = "no key in this environment; last read kept"`, and exits cleanly. A quota refusal (`quotaExceeded`) is recorded the same way.
- If no read exists and there is no key, `latest.json` says "not read yet" (the framework's own message).

## Terms (read 19 November 2026, both pages last updated 2026-11-06 UTC)

The YouTube API Services Terms of Service and the Developer Policies. The rules that shape this source, with exact quotes on the card:

- **Storage (Developer Policies, Refreshing, Storing, and Displaying API Data):** data read without a user's sign-in is Non-Authorized Data, which may be stored "not longer than 30 calendar days", after which "the API Client must either delete or refresh the stored data". View counts of such data may not be kept more than 30 days. The remembered 30-day rule is right.
- **Display:** the most updated data must be shown; historical data may be shown "provided that it is presented accurately in context of time". Every count here carries its read time.
- **Audiovisual content:** no download, caching, storage or offline copy. We hold only links and the address of YouTube's embedded player (`youtube-nocookie.com`).
- **Aggregation:** no aggregation of API Data except across channels of one content owner, viewable only by that owner. We read one channel and add no totals across channels or any figure about YouTube's own business.
- **Branding and terms:** content shown from YouTube must make clear that YouTube is the source, with a link to https://www.youtube.com/t/terms. Sites that show these videos must do this; the data file carries an `attribution` line and the licence entry says it.
- **Playback:** no charge to watch an embedded video, and no gating of play.
- **Quota:** the default is 10,000 units a day (Data API documentation, not the two terms pages). The collector uses about 3 to 4 units a run, so about 16 a day.

## Design that follows

- **Only the latest read is kept.** `latest.json` is replaced every run. No dated copy goes to a vault (the collector clears the run's raw list; `youtube-replays` is also in the raw exclusion list in `scripts/build/lib.mjs`; the card says `vault: null`). `reads.json` keeps the status, size and sha256 prefix of each request, with an address that holds no video id and no page token, so it is not a list of API data. Git history of `latest.json` is not kept either: the file is gitignored, written by CI at build time, and copied from the live site.
- **A read that cannot be refreshed is deleted at 25 days.** When a run cannot refresh (no key, quota, error), it keeps the last read until that read is 25 days old, then empties the video list and says why in `deleted_because`. `delete_or_refresh_by` in the file is 30 days after the read.
- **Not kept:** descriptions (only chapter lines parsed from them), thumbnails, comments, channel statistics (subscriber and video counts), anything about a viewer.

## What it keeps

Per video: id (checked against 11 characters of `A-Za-z0-9_-`), title (plain text, cut to 200 characters), time published, duration, view and like counts (digits only, with the time read), channel title, a link `https://www.youtube.com/watch?v=<id>` and an embed address `https://www.youtube-nocookie.com/embed/<id>`, both built from the id and never taken from the answer, and chapters: start time (parsed, never text), title as written (cut to 120 characters), and speakers only where the chapter line names them as `... with A B, C D and E F` (each name 2 to 4 capitalised words). A video is kept only if its `channelId` is the channel resolved from the handle.

## Trust and risks

- **The answer is untrusted text.** Titles and chapter lines are third-party text on a public site. Control and bidirectional characters are removed; the site renders text as text (no HTML from the answer is inserted). Every address is built from a checked id.
- **Our gates change text, and we say so.** The wording check refuses em dashes and a few words. In a title or chapter line an em dash becomes " - " and such a word becomes "[word withheld]"; each change is counted in `counts` (`fields_altered_em_dash`, `words_withheld`). This is the only alteration of a published value.
- **Official channel check.** The handle `@WebSummit` resolves to the channel titled "Web Summit" (id in `latest.json`); `channel.official_check` records that, and how many of the library's 15 lead videos (`discovery/youtube/websummit-2026.json`, untrusted Perplexity answers) are among its uploads (3 on 19 November 2026). Two titles are compared with the library's oEmbed corrections (`library_title_checks`); both matched. A channel with the same title but another id would show as a different `channel.id`; a person should confirm the id once.
- **Speakers.** Names appear only if a chapter line names them. They are people speaking in public, named as published; the descriptions read on 19 November 2026 held no chapter lines at all.
- **Handle takeover or rename.** If `@WebSummit` pointed at another channel, the videos would be another channel's. Mitigation: the channel id is published with every read, and `official_check` would show the leads missing.
- **Quota.** Capped at 200 units a run and checked before each call. An abuse of the key by another process in the environment is not visible to us (the key is not ours to see); the run records only its own units.
- **No search, no write calls, no user data, no sign-in.** The API is used read-only with a key; no OAuth, no user's data, no comments.
- **Changes to the terms.** The terms say changes take effect "no sooner than 30 calendar days after posting" (2.3). Re-read both pages at least monthly; both were last updated 2026-11-06 UTC.

## Open

- Dinis: who accepted the API terms for the project the key belongs to; an agent never does.
- Sites that show these videos must display YouTube as the source and link its Terms (library.b@ to be told).
- security@ to review this model; a person to confirm the reading of the 30-day rule and the channel id.
