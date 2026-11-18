# Threat model: adsb-london-portugal (adsb.lol, flights between London and Portugal)

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 by data.b.dev@ from the code at that date (WS-177). Not yet reviewed by a person or by security@.

## Parts

- `sources/adsb-london-portugal/collect.mjs`: once an hour, three GET requests to `https://api.adsb.lol/v2/point/<lat>/<lon>/40` (Faro, Lisbon, Porto; counted against adsb.lol's quota) and one POST to `https://api.adsb.lol/api/0/routeset` (a free path, not counted) with the callsign and position of each airline flight seen. Four requests, 2.5 seconds apart.
- `sources/adsb-london-portugal/card.json`: terms (ODbL 1.0, quoted, with page and date), schedule, cost and the three airports.
- `collect/lib.mjs` gained optional `method` and `body` for the POST; nothing else in the reader changed (same agent name, delays, no retry on 403 or 429).
- The build serves `data/adsb-london-portugal/latest.json`. No raw answer is written to the vault or served.

## Terms

ODbL 1.0, no key up to 500 requests a day per address, 429 with Retry-After over quota (https://www.adsb.lol/docs/open-data/api/ and https://api.adsb.lol/api/openapi.json, read 18 November 2026). What we derive stays under ODbL with attribution to adsb.lol. 72 counted requests a day, plus 24 for adsb-faro.

## What it keeps

Per flight: callsign (airline ICAO code and number only), airline code, aircraft type code, route (from, to; ICAO airport codes), position rounded to 0.01 degree, altitude band, time seen. Per day per route: a count, and the callsigns already counted today and yesterday (to count each once). Not kept: hex id, registration, squawk, speed, track, any aircraft that is not an airline callsign (only counted), the raw answers.

## Trust and risks

| Risk | Mitigation | Residual |
| --- | --- | --- |
| A private or military aircraft is identified | Only callsigns of the form three letters and digits are kept; others are counted; no hex id or registration is read into any kept field; raw never stored or served (`run.raw` emptied) | A private flight with an airline-shaped callsign is shown by callsign and rounded position, as on adsb-faro |
| The route lookup is wrong or absent | Routes come only from adsb.lol's routeset; a route flagged not plausible is dropped; with no route a flight is not kept; the page says it is a best guess | On 18 Nov 2026 the lookup answered 201 with an empty body for every request: no flight is kept and `routeset.status` says so (a gap, not zero flights) |
| adsb.lol's text is untrusted | Callsign, type and airport codes are checked against patterns before use; nothing else is copied | Low |
| Quota exhausted (shared address) | A 429 is recorded and not retried; the last read is kept and marked stale if no position request worked | A gap until the quota resets at 00:00 UTC |
| Double counting | Each callsign counted once per route per UTC day (carried in `seen_flights`) | A callsign reused for two flights on the same route in a day counts once |
| Over-reading the counts | `about` says counts are of callsigns seen by volunteers' receivers, not passengers or all flights | Reader judgement; owner data.b@ |

## Secrets

None: no key is used. The API's optional `x-api-key` is not read or stored.

## Open

- security@ to review this model.
- Whether adsb.lol's route lookup is still maintained (empty answers on 18 November 2026).
