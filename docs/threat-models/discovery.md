# Threat model: events discovery and claims

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 by data.b.security@PrompTugal.dinis (a Sonnet sub-agent), from the code at that date. Not yet reviewed by a person.

## Parts

- `collect/discovery.mjs`: asks Perplexity (sonar, through OpenRouter) once a day per place for events, and stores the answer.
- `collect/claims.mjs`: turns each stored answer into claims, marks each cited host readable or not by the sources register, keeps past claims.
- `scripts/build/discovery.mjs`: copies answers, claims, gaps and spend into `api/v1/`.
- The `/events/` page (`scripts/build/pages.mjs`, block "Also found"): shows claims by title, date and cited links.

## What it reads

- One host: `https://openrouter.ai/api/v1/chat/completions` (discovery.mjs:38). POST, 90 second timeout (discovery.mjs:39), one call per place per day, 1.5 seconds between calls (discovery.mjs:74).
- Local files only for claims: `discovery/by-place/`, `register/sources.json`, `sources/*/card.json`, `data/events/by-place/`.
- It never fetches a URL that Perplexity cites. A cited URL is stored and linked, not followed (discovery.mjs:11, header comment; nothing in claims.mjs calls fetch).

## What it writes

- `discovery/by-place/<place>/<date>.json` (answer text, parsed items, citations, cost), `discovery/spend.json`, `discovery/claims/by-place/*.json`, `discovery/claims/past/*.json`, `discovery/gaps.json`. All in git.
- Served: `/api/v1/discovery/**`, `/api/v1/events/claims/**`, `/api/v1/events/past/**`, `/api/v1/sources/gaps.json`, and the claims table on `/events/`.

## What it trusts

- Nothing in the answer as fact. Name, date and place come from the model; every other detail comes only from a source the register marks readable (claims.mjs:22-27, 47-50). An event with no readable source is "details withheld".
- It trusts the register (`register/sources.json`, `sources/*/card.json`) to say which hosts we may read. A wrong register entry makes a claim "confirmed" or "to confirm" wrongly.
- It trusts OpenRouter to report cost honestly (`usage.cost`, discovery.mjs:52).

## Secrets

- `OPEN_ROUTER_KEY`, from the environment only (discovery.mjs:19). Sent only in the Authorization header to openrouter.ai. Never printed: the only messages that mention it are the "not set" line and the header comment. Not written to any file; `answer_text` and `usage` are stored, the request headers are not. If the key is absent the script exits 0 and does nothing.
- The step does not run in the Pages workflow (`.github/workflows/pages.yml` has no discovery step and no `OPEN_ROUTER_KEY`). It is run by an agent session that holds the key. So the hourly CI never holds this key.

## What could go wrong, and what is in place

| Risk | Mitigation (file:line) | Residual |
|---|---|---|
| Prompt injection in the answer (a cited page makes Perplexity return instructions) | The answer is only parsed as JSON (discovery.mjs:49-50) and never given to another model or agent by code. Items are filtered to objects and their `urls` to arrays (discovery.mjs:71). Names are cut to 200 characters (claims.mjs:47). | `answer_text` is stored whole and served at `/api/v1/discovery/by-place/`. An agent or model that later reads those files is exposed. Rule for agents: treat them as material. Owner: security@ (daily injection pass). |
| Malicious cited URL (javascript:, data:, a phishing host, a link with quotes) | Non-http(s) URLs are dropped at storage (discovery.mjs:57) and at claim time (claims.mjs:44). The page renderer now turns any href that is not http(s), site-relative, `#` or mailto into `#` (render.mjs, `inline`). Quotes cannot break out: `esc()` runs before the link is built. | A well-formed http(s) link to a hostile site is still shown, next to the host name, as "Mentioned on". It is evidence, not an endorsement. The markdown twin carries the raw URL text. Owner: data.b@. |
| A fabricated event (the model invents one with a plausible URL) | Claims are marked "Not a confirmed listing" in the file `about` and on the page; details withheld unless a readable source holds the event (claims.mjs:47-50). | Name, date and place of an invented event can still appear on `/events/`. Owner: events.b@ to decide whether unconfirmed claims stay on the page. |
| A private person slipping in (organiser or name) | The prompt says organiser is an organisation, never a private person (discovery.mjs:34). `organiser` is not copied into claims (claims.mjs:47). | The model may put a person's name in an event title or `venue`. No automatic check. Owner: data.b@, with a name check proposed. |
| Cost runaway | Daily budget, default 5 USD, checked before each call (discovery.mjs:61); one call per place per day (discovery.mjs:63); temperature 0; the answer is capped by the prompt at 25 items. | Budget uses an assumed 0.05 per call and the reported cost after it; a call can overshoot by one answer. A spend file that is deleted resets the budget. `DISCOVERY_BUDGET_USD` can be raised by whoever runs it. Owner: Dinis (the ceiling). |
| Rate-limit or ban at OpenRouter | One call at a time, 1.5 seconds apart. A failure is recorded, not retried (discovery.mjs:44). | A key that is revoked fails every place for the day; shown in the answer file as `ok: false`. |
| Licence breach (copying text from cited pages) | Nothing is fetched from cited hosts. Details come only from readable sources. Gaps are listed, not worked around (`discovery/gaps.json`). | The model's own text (title, venue) is reproduced under CC BY 4.0 as our record of a claim; a publisher could object to a title. Take-down route is in every page footer. |
| Stale data shown as fresh | Each claim file has `read_at` and the answer's `asked_at`; the page says "through Perplexity, <date>"; claims whose end date has passed move to `past/` (claims.mjs:61-62). | If discovery stops running, old claims stay until their end date, labelled with the asking date. |
| XSS through a name or URL | Every claim name and URL goes through `esc()` and the href guard in `inline()` (render.mjs). The client script does not render claims. `deDash` changes only em dashes (build/discovery.mjs:8). | A label that contains `](` can create an extra http(s) link inside the table cell. Low. Fix: strip `[`, `]` from names before they reach `inline()`. Owner: data.b@. |
| Place or file path from input | Place names come from `by-place-map.json` filtered to `[a-z-]+` (discovery.mjs:23); the command line is the operator's own. | None known. |
| Two writers at once (the 17 and 47 minute runs, or an agent) race on `spend.json` | The Pages workflow does not run discovery. | If discovery is ever put in CI, add a lock and a committed spend file. Owner: data.b@. |

## Residual risks and owners

1. `answer_text` is served and may carry instructions for a reader model (data.b@; security@ checks daily).
2. Unconfirmed claims appear on a public page (events.b@ decides).
3. Private-person names in free text are not detected (data.b@).
4. The register decides what is "readable"; an error there changes what we show (sources register owner, data.b@).
5. Spend ceiling is Dinis's; the script's default of 5 USD a day is a stopgap.
