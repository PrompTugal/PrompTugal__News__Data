# Threat model: eurostat-tourism (Eurostat dissemination API, tourist nights)

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 by data.b.dev2@ from the code at that date (WS-177). Not yet reviewed by a person or by security@.

## Parts

- `sources/eurostat-tourism/collect.mjs`: every 6 hours, three requests (2.5 seconds apart) to `https://ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/<dataset>` in JSON-stat 2.0 (`format=JSON&lang=en`), no key: `tour_occ_nin2` (annual, regions: PT15, PT17, PT1A, PT1B, PT, UKI; guest DOM, FOR or TOTAL), `tour_occ_ninraw` (annual, Portugal, guest by country: UK, DE, FR, ES, NL, US, DOM) and `tour_occ_nim` (monthly, 36 months; regions are asked for and Eurostat returns only Portugal).
- `sources/eurostat-tourism/card.json`: terms (quoted, with page and date), schedule, cost, attribution with the dataset codes and links.
- The build serves `data/eurostat-tourism/latest.json` at `/api/v1/eurostat-tourism/latest.json`, and the three raw answers (about 4 to 6 KB each) as the raw layer.

## Terms

"Reuse of statistical data, metadata, publications, and other dissemination tools published on this website for commercial or non-commercial purposes is authorised provided the source is acknowledged" (https://ec.europa.eu/eurostat/web/main/help/copyright-notice, read 18 November 2026; the Commission Decision of 12 December 2011). Attribution: "Source: Eurostat" with the dataset code and link, in `provenance.attribution`, on the source page and in the page layer. The notice allows individual documents to carry their own conditions; none was seen on these tables. robots.txt for ec.europa.eu disallows `/eurostat/SDMX/diss-web/rest/` and `/eurostat/tgm/`; the dissemination API at `/eurostat/api/dissemination/` is not listed and is the documented interface.

## What it keeps

Per value: dataset code, place code and label, guest-residence code and label, period (year or month), number of nights, unit, and Eurostat's flag when it gives one. Not kept: every other dimension (accommodation type is fixed to the total, the unit to a number), Eurostat's annotations and extension block.

## Trust and risks

| Risk | Mitigation | Residual |
| --- | --- | --- |
| The API's text is untrusted | Codes checked against a pattern (`[A-Z0-9_]`), periods against `YYYY` or `YYYY-MM`, values must be finite numbers; labels have control and bidirectional characters removed and lengths cut; no link is taken from the answer (links are built from the card's dataset codes) | Low |
| A row that does not decode is a risk to the site's checks | The row is dropped, never altered; a label with an em dash is dropped and counted (`fields_dropped_em_dash`); no gate is changed | Low |
| The service changes shape or is down | A table that does not decode adds no rows; if no table decodes the run keeps the last read (`latest.json kept as it was`) and `reads.json` says why | A stale read shows its `read_at` and each table's `updated` date |
| Readers take a region split for a country split | The card, `about` and page say regions are domestic, foreign and total only, and named countries exist for Portugal as a whole | Reader judgement; owner data.b@ |
| Series that end or change codes read as zero | `coverage` gives the first and last period per dataset and place; `gaps` lists places Eurostat returned nothing for; Lisbon is PT17 to 2022 and PT1A plus PT1B from 2023 (two different areas), London (UKI) has values only for 2012, 2015 and 2016 | Charts must show where a series ends and never join across a change of region |
| Statistics are revised | Each table's `updated` is kept; values are the latest Eurostat serves, not a record of earlier ones | Eurostat is the authority |
| Load on Eurostat | Three small requests (about 14 KB) per run, at most four runs a day, a named agent with no contact details; a refusal (403, 429) is recorded and not retried | Low |

## Secrets

None: the API needs no key and none is read or stored.

## Open

- security@ to review this model.
- The reuse notice's address in the brief (`/eurostat/about-us/policies/copyright`) answers 404; the notice at `/eurostat/web/main/help/copyright-notice` was read instead.
- No update-date check before reading: the tables are small, so the collector reads all three every run and records each `updated` date; `reads.json` shows whether the bytes changed.
