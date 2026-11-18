# Threat model: euvd (ENISA's EU Vulnerability Database)

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 by data.b.dev@ from the code at that date (WS-177). Not yet reviewed by a person or by security@.

## Parts

- `sources/euvd/collect.mjs`: every 6 hours, at most about 35 GETs to ENISA, one at a time, 10 seconds apart: `robots.txt` of `euvd.enisa.europa.eu` and of `euvdservices.enisa.europa.eu`, then on the API host `/api/lastvulnerabilities`, `/api/exploitedvulnerabilities`, `/api/search?exploited=true&size=1` (a count) and pages of `/api/search?fromUpdatedDate=...&size=100&page=N` (newest update first; reading stops when a page passes the window; at most 30 pages). No key. Each answer is capped at 5 MB (`maxBytes` in `collect/lib.mjs`); a larger one is refused and recorded as `too-big`.
- `sources/euvd/card.json`: terms (quoted, with page and read date), schedule, cost.
- The build serves `data/euvd/latest.json` at `/api/v1/euvd/latest.json`. The raw answers (with every description and reference) go to the vault copy only (`scripts/build/lib.mjs` skips them for the site; the checks are not changed).

## Terms and decision

- Dinis decided (18 November 2026, about 23:40 UTC, in cyber.b@'s session; PrompTugal__News__Cyber board/team/cyber/briefs/2026-11-18-dinis-answers.md, relayed): "I don't think we are a crawler per se ... we're just trying to use data that they have ... I'm assuming that [ENISA] published data available in APIs". So ENISA is read through its published interfaces. Our collector is plain code with its own named user agent (`collect/lib.mjs` `UA`); ENISA's main-site robots.txt disallows named AI crawlers, which does not name us.
- robots.txt (read 18 November 2026): `https://euvd.enisa.europa.eu/robots.txt` is `User-agent: *` with an empty `Disallow:` (nothing disallowed). `https://euvdservices.enisa.europa.eu/robots.txt` answers 404 (no rule). The collector reads both on every run and stops if a `Disallow` covering `/api` applies to `*` or to us.
- API documentation (https://euvd.enisa.europa.eu/apidoc, part of EUVD's JavaScript application, read 18 November 2026): GET, "No authentication required", "No custom headers"; latest, exploited and critical lists give at most 8 records; search gives at most 100 records per request.
- Legal notice (https://www.enisa.europa.eu/about-enisa/legal-notice, 1.2, read 18 November 2026; linked from the EUVD footer): "Reproduction of ENISA material published on this website is authorized, provided the source is acknowledged, unless it is stated otherwise." EUVD has no data licence of its own that we found, so a person may want to confirm that the notice covers EUVD data. Licence entry: commercial use allowed, with the source acknowledged (`scripts/build/licence.mjs`).
- The page `/apidoc` is a JavaScript application; its HTML shell carries a hidden "Application Unavailable" fallback that shows only if the application fails to load. That fallback was what the earlier register entry saw; on 18 November 2026 the application loaded and the API answered 200.

## What it keeps

Per record: EUVD id (checked against `EUVD-YYYY-NNNN`), CVE aliases (only values that match `CVE-YYYY-NNNN`; other alias kinds such as GHSA are not kept), published and updated times (parsed from the API's own format and read as UTC; anything that does not parse drops the record), base score (0 to 10) and CVSS version (2.0, 3.0, 3.1, 4.0), a severity band that is ours (the standard CVSS ranges applied to the score), vendor and product names (plain text, shortened, placeholders such as "unknown" and "n/a" dropped, at most 10), the exploited flag and the date EUVD gives, and a link built from the EUVD id (never a URL from the answer). Totals per UTC day and severity (`daily_totals`, 14 days carried from the previous `latest.json`; `complete` true only for a whole day, which only the 00 UTC run reads), and per vendor.

Not kept: descriptions, references, advisory text, ENISA's internal UUIDs, the vector string, EPSS, assigner.

## Trust and risks

| Risk | Mitigation | Residual |
| --- | --- | --- |
| Reading against ENISA's wishes (the robots.txt names AI crawlers on the main site) | Dinis's decision above; published API used; own named user agent; both robots.txt files read each run and a Disallow for us stops the run; a refusal (403, 429, a bot check, a reset, too large an answer) stops the run and is recorded, never worked around | a person may want to confirm with ENISA; the rule is the one in ENISA's notice |
| Load on ENISA | one request at a time, 10 seconds apart (ENISA's crawl delay), at most about 35 requests (about 6 minutes) a run, four runs a day, 5 MB cap an answer, pages of 100; the last read is kept when a run fails | about 130 requests a day is more than the other sources; the page cap (30) bounds it; fewer pages if the first run shows ENISA minds |
| Untrusted text in the answer (vendor and product names) | control and bidirectional characters removed, shortened (`txt` in collect.mjs); a field with an em dash is dropped, never altered, and counted (`fields_dropped_em_dash`) | the wording check stays as it is |
| A link to a hostile site | links are built from the validated EUVD id, never from the answer | none known |
| Time zone of the API's dates | read as UTC: the server's own clock header and the newest record agree to the hour on 18 November 2026 | if ENISA serves local time the day totals move by hours; not stated in the API documentation |
| Partial window (30 pages is 3000 records) | `pages_complete` and `oldest_update_reached` in counts say whether the window was read to its start | totals are lower than ENISA's if false |
| A changed answer shape | a read with no valid record returns no items: the last read is kept | silent drift in fields we do not check |
| Misreading the totals | `about` says the severity band and totals are ours, from the score, and a weak signal | EUVD gives no severity of its own that we read |
| Personal data, hosts, victims, IPs | the API returns vulnerability records about products; none of those fields are read or kept | a vendor name could in theory be a person's name (a one-person project); not seen |
| Secret | none: no key is used, none is stored or sent | none |
| Volume | about 4 MB of answers a run (pages of about 150 KB); `latest.json` about 2 MB | the site grows with each day's window only (14 days of totals) |

## Open

- security@ to review this model.
- A person may want to confirm with ENISA that reuse under its legal notice covers EUVD data, and that the request rate is acceptable.
- Whole-day totals exist only for days the 00 UTC run read; a missed run leaves that day partial.
