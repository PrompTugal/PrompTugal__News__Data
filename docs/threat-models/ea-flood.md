# Threat model: ea-flood (Environment Agency flood-monitoring API, London)

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 by data.b.dev@ from the code at that date (WS-177). Not yet reviewed by a person or by security@.

## Parts

- `sources/ea-flood/collect.mjs`: once an hour, two list requests, one request per Thames station, one list of rainfall gauges and one request per gauge, at most ten (about twenty-two, 2.5 seconds apart) to `https://environment.data.gov.uk/flood-monitoring/`: `id/floods` and `id/stations` (both by the point and radius on the card), then `id/stations/<id>/readings?latest`. Rainfall (added 18 November 2026): `id/stations?parameter=rainfall` by the same point (15 km), then for the nearest ten gauges `id/stations/<id>/readings?since=<00:00 UTC yesterday>`.
- `sources/ea-flood/card.json`: terms (OGL v3.0, quoted, with page and date), schedule, cost, and the place (id, name, coordinates, radii, river match). The place is the card's, not the code's: another place is another card.
- The build serves `data/ea-flood/latest.json` at `/api/v1/ea-flood/latest.json`. The raw answers go to the vault copy only (`scripts/build/lib.mjs`, the same list as cisa-kev): the warnings' free-text messages are long publisher text the gates could refuse; the checks are not changed.

## Terms

Open Government Licence v3.0, no registration (https://environment.data.gov.uk/flood-monitoring/doc/reference, read 18 November 2026). Attribution as the Environment Agency asks: "this uses Environment Agency flood and river level data from the real-time data API (Beta)", carried in `provenance.attribution`, on the source page and in the page layer. robots.txt for environment.data.gov.uk disallows /doc/, /data/ (at the host root) and other paths; the flood-monitoring paths are not listed and are the documented API.

## What it keeps

Per warning: floodAreaID (checked against a safe id pattern), severity and level (1 to 4), area description, river or sea, county, tidal flag, EA area name, time raised and time severity changed (as the EA gives them, with no time zone), a link to check-for-flooding.service.gov.uk built from the id, and the API address built from the id. Not kept: the free-text message, the area polygon and envelope.
Per station (Thames stations only, at most 12): station id, label, river, town, coordinates to 5 decimals, and for each measure its latest value, unit and time; links built from ids. Not kept: the stage scale and other station fields.

Rainfall gauges (at most 10): gauge id, a label with the id, coordinates to 5 decimals, the latest 15-minute total (mm), its period and time; per UTC day and gauge the summed rain and the number of readings, 14 days carried from the last read; and `rain_seen`, the HH:MM timestamps of today and yesterday by gauge (about 14 KB), so that each 15-minute reading is counted once. Values below zero or not numbers are skipped. A gauge that gives no readings has a null value (3 of 10 on 18 November 2026).

## Trust and risks

| Risk | Mitigation | Residual |
| --- | --- | --- |
| The API's text is untrusted | Control and bidirectional characters removed and lengths cut (`txt`); ids checked against a pattern before any link is built; links are never taken from the answer | Low |
| A field with an em dash is refused by the wording check | The field is dropped, not altered, and counted (`fields_dropped_em_dash`); no gate is changed | Low |
| The service changes shape or is down | A list that is not an array returns no data: the run keeps the last read (`latest.json kept as it was`) and `reads.json` says why | A stale read shows its `read_at`; the page says when it was read |
| A refusal (403, 429) | `collect/lib.mjs` records it and does not retry; never worked around | A gap until the EA answers |
| Readers take the data for a warning service | `about` and the page say it is not a warning service and name the Environment Agency | Reader judgement; owner data.b@ |
| Load on the EA (Beta service) | About ten requests an hour, 2.5 seconds apart, a named agent with no contact details; lighter than the 15-minute single call the reference suggests for a full copy | Low |
| Rain counted twice or lost | Each reading is counted once by its timestamp (`rain_seen`); a second run counted 0 new readings in the test; a gauge whose request fails keeps its earlier days; rain before yesterday that was never read is not recovered | A run gap of more than a day loses that rain |
| Time zones | The EA gives warning times without a zone; kept as given, not converted | Readers may read them as UTC; to be checked with the EA's documentation |

## Secrets

None: the API needs no key and none is read or stored.

## Open

- security@ to review this model.
- Whether the warning times are UK local time or UTC is not stated on the page read.
