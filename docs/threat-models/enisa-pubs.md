# Threat model: enisa-pubs (ENISA publications list)

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 by data.b.dev@ from the code at that date (WS-177). Not yet reviewed by a person or by security@.

## Parts

- `sources/enisa-pubs/collect.mjs`: one GET every 6 hours of `https://www.enisa.europa.eu/publications` (first page, 10 items), 10 second gap.
- `sources/enisa-pubs/card.json`: terms (quoted, with page and read date), schedule, cost.
- The build serves `data/enisa-pubs/latest.json` at `/api/v1/enisa-pubs/latest.json`. The raw HTML goes to the vault copy only.

## Terms

ENISA legal notice 1.2 (https://www.enisa.europa.eu/about-enisa/legal-notice, read 18 November 2026): "Reproduction of ENISA material published on this website is authorized, provided the source is acknowledged, unless it is stated otherwise." Title, date and link are shown with ENISA named as the source. No logo, report text or images.

robots.txt (https://www.enisa.europa.eu/robots.txt, read 18 November 2026): `Crawl-delay: 10` for all agents, which the 10 second gap respects; `/publications` is not disallowed. Sorting, facet and search query strings are disallowed and are not used. A list of named AI crawlers is disallowed everywhere. This collector is plain code that uses no model and is not named, but a person may want to confirm that reading is in the spirit of the file.

## Feed

None. Checked 18 November 2026: `/rss.xml`, `/publications/rss.xml`, `/publications/feed`, `/rss` and `/feeds/publications` all answer 404, and the page links no feed. The HTML list is therefore read; it is allowed by robots.txt.

## What it keeps

Per item: title (plain text, markup removed, shortened to 200), date (from the `datetime` attribute, checked as YYYY-MM-DD), link (made absolute, then checked to be `https` on `www.enisa.europa.eu` under `/publications/`, with no credentials or port; anything else is dropped), and the topics ENISA lists (plain text, at most five). The listing gives topics and audience, not a document type, so no type is kept.

## Trust and risks

| Risk | Mitigation | Residual |
| --- | --- | --- |
| Hostile or odd HTML | parsed with fixed patterns, tags stripped, entities decoded; control and bidirectional characters removed; shortened | a redesign makes the patterns miss: the run returns no items and the last read stays |
| A link to another host | only https on the ENISA host under /publications/ is kept | none known |
| Em dash in a title | the field is dropped, never altered, and counted (`fields_dropped_em_dash`) | an item with a dropped title is missing |
| Load on ENISA | one request a run, 10 second gap, 4 runs a day | none |
| Mis-use of ENISA's name | source named; no logo; no endorsement claimed | none |
| Personal data | none read: authors and contacts are not on the list and are not kept | none |
| Secret | none | none |

## Open

- security@ to review this model, and a person to confirm the AI crawler point above.
- Only the newest page (10 items) is read: a gap of more than 10 publications between two reads would be missed. ENISA publishes a few a month.

## On hold

The collector does not run (card cadence "on hold", data.b@, 18 Nov 2026): ENISA's robots.txt disallows named AI crawlers everywhere. Ours is plain code and unnamed, and /publications is allowed to everyone, but this site is built by AI agents. Dinis decides.
