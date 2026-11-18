# Threat model: open-meteo-london (Open-Meteo forecast API, London)

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 by data.b.dev@ from the code at that date (WS-177). Not yet reviewed by a person or by security@.

## Parts

- `sources/open-meteo-london/collect.mjs`: every 6 hours, one GET of `https://api.open-meteo.com/v1/forecast` for the point on the card (hourly temperature, rain chance and amount, wind speed, gusts and direction, weather code; daily min, max, rain sum; 3 days; UTC; km/h).
- `sources/open-meteo-london/card.json`: terms, schedule, cost and the place (id, name, coordinates). The place is the card's, not the code's.
- The build serves `data/open-meteo-london/latest.json` at `/api/v1/open-meteo-london/latest.json`, and the raw answer (about 4 KB, numbers only) as the raw layer.

## Terms

CC BY 4.0 data; the free API is for non-commercial use (https://open-meteo.com/en/terms and /en/licence, read 18 November 2026): "You may only use the free API services for non-commercial purposes." Non-commercial examples include "Private or non-profit websites or apps that do not have subscriptions or advertising"; commercial use includes "Websites or apps that have subscriptions or display advertisements". Dinis decided on 18 November 2026 (about 22:40 UTC) that data.promptugal.news is free with no subscriptions or adverts, so the free API is used, attributed ("Weather data by Open-Meteo.com", linked, in `provenance.attribution`, the source page and the page layer). The card records the condition: sites that charge must not reuse it without a paid plan. Limit: under 10,000 calls a day; this uses four.

## What it keeps

Hourly and daily values as named in the code, each checked as a number or set to null; times checked against a date pattern. History: the forecast of the previous latest.json (its issued time and daily values) is carried for 14 days, so every forecast we served stays.

## Trust and risks

| Risk | Mitigation | Residual |
| --- | --- | --- |
| The answer is untrusted | Only numbers and checked dates are kept; no free text is read from it | Low |
| Service changes shape or is down | Missing `hourly` or `daily` returns no data: the run keeps the last read; `reads.json` says why | A stale read shows its `issued_at` |
| A refusal (403, 429) | Recorded by `collect/lib.mjs`, not retried, never worked around | A gap |
| The non-commercial condition stops being true | Recorded on the card and in this model; the site's licence line says CC BY 4.0 with attribution | If the site takes subscriptions or adverts, move to a paid plan or the Met Office DataHub. Owner: Dinis |
| Readers take a model forecast for a warning | `about` says it is not a warning and names the Met Office | Reader judgement |
| History lost if the last read is not copied | `--prev` copies latest.json from the live site before a run; a first run starts with an empty history | Gaps if the live site was down at the time |
| Model provider credit | The attribution names Open-Meteo and points at its model list; the exact model behind the default blend is not named in the answer | To be refined with Dinis's line on credit |

## Secrets

None: no key is used or stored.
