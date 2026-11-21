# London data feeds: what we have, what we can add, and a proposal to split the data work

By data.b@PrompTugal.dinis, 21 November 2026, for Dinis's brief of about 09:08 UTC (briefs/2026-11-21-dinis-london-as-a-second-country.md).

**Sources:**
- Research read between 09:00 and 09:20 UTC by three Sonnet sub-agents. They used only official docs, terms pages and robots.txt, plus one or two keyless sample requests per API.
- Nothing was signed up for, registered or accepted.
- Quotes came through a summarising fetch tool: close, but check the wording before it goes on a page.
- "Unverified" means not read at the source.

## 1. What London has today (read twice a day)

| Source | What | Last read (UTC) | Counts at that read |
|---|---|---|---|
| tfl-jamcams | TfL traffic cameras, as links and metadata | 21 Nov 07:13 | 889 cameras, 801 available |
| ea-flood | Environment Agency flood warnings, Thames levels, rain gauges | 21 Nov 07:04 | 0 warnings, 10 stations, 10 rain gauges |
| open-meteo-london | London forecast (hourly, 3 days) | 21 Nov 07:12 | 72 hours, 3 days |
| contracts-finder | London public bodies' procurement notices, kept by day | 21 Nov 07:04 | 16 London notices, 15 buyers |
| by-place/now/london | One file joining forecast, floods and reads | each wake | |

Flights (adsb-lol-london-airports) and the other UK entries are on the register but not read yet.

## 2. What we can add

### Tier 1: live, keyless and open. Ready to build now.

| Feed | Gives | How live | Key | Licence and credit | Sample |
|---|---|---|---|---|---|
| TfL Unified API: line status | Tube, Overground, Elizabeth line, DLR, tram: good service, delays, closures | about 60 s (cache max-age 30, s-maxage 60) | none | TfL Transport Data Service terms: "Exploit the Information commercially and non-commercially"; credit "Powered by TfL Open Data"; at most 500 calls a minute per feed (read by Dinis in a browser, 18 Nov; on our register). | 09:10 UTC, 200, weekend Bakerloo closure listed |
| TfL Unified API: BikePoint | Santander Cycles docks: bikes, e-bikes, empty docks | minutes | none | as above | not sampled (unverified) |
| TfL Unified API: road disruptions | Roadworks, incidents, closures | minutes | none | as above | not sampled (unverified) |
| NESO Carbon Intensity API, London region | Carbon intensity of London's electricity and the generation mix | half-hourly | none | CC BY 4.0; terms: free, rate limited; no selling or sublicensing of the API, and no app that substitutes for theirs | 09:09 UTC, 200: forecast 239, index "very high", gas 43.1%, imports 35.6% |
| Environment Agency tide gauges and Thames levels | Tidal Thames and river levels | 15 min, with a 15 to 30 min lag | none | OGL v3.0, credit as for ea-flood (we already read this API) | already read |

### Tier 2: open, but slower, or needing care.

| Feed | Gives | How live | Care needed |
|---|---|---|---|
| LAQN (Imperial College ERG) | Hourly air quality index by London site | hourly (latest bulletin 08:00 UTC at 09:09 UTC) | **Terms conflict.** The API document says OGL v2. The Terms v1.1 PDF says "You shall not make the API data available to any third parties", and asks for the university logo and a link. rights@ should read it before we show it; ERG may be asked. |
| DEFRA UK-AIR SOS (AURN London sites) | Official air quality readings | not stated | OGL v3.0. robots.txt disallows many /data/ pages; check that /data/sos/ is allowed before reading. |
| data.police.uk (Met and City of London) | Street-level crime by category, outcomes | monthly; latest month is 2026-09 at 21 Nov | OGL v3.0, 15 requests a second. Aggregate by borough only. Never show case ids or stop-and-search personal fields. |
| FSA food hygiene ratings | Ratings by London borough | daily | OGL v3.0, keyless. Business names can be sole traders, and some premises are home addresses: aggregate, or drop such records. No FSA logo or rating images. |
| UKHPI (HM Land Registry) | London house price index | monthly (September published 18 Nov; next 16 Dec) | OGL v3.0. The linked-data paths are disallowed in robots.txt, so use the monthly CSV downloads. Never use Price Paid Data addresses. |
| NCSC advisories (RSS) | UK cyber advisories and news | several a week | OGL v3.0 with acknowledgement; UK-wide, not London. Fits cyber.b@ more than London. |
| GOV.UK Search API | Government news mentioning London | live | OGL v3.0, keyless. The London match is loose and needs a filter. |
| ONS API | Borough statistics | scheduled releases | OGL v3.0, keyless, in beta. |

### Tier 3: needs Dinis (a sign-up, an account or terms a person must accept).

| Feed | Gives | What it needs |
|---|---|---|
| National Rail Darwin (Rail Data Marketplace) | Live train departures from London stations | An account and click-through terms (NRE OGL, based on OGL v2 with amendments; National Rail credited). Free under 5 million requests in each 4-week period. |
| Network Rail open data (TRUST) | Live train movements | An account (capped at 1,000 users); no brand use, and no app called "official". |
| Breathe London | Low-cost air sensors across London | Registration and a key (the GLA may approve or deny); OGL v3.0 with the credit "Contains Breathe London data licensed under the Open Government License v3.0". |
| Met Office Weather DataHub | Official forecasts | Registration and a plan (free plans listed); terms are behind a login. |
| UK Parliament APIs | Bills, votes, written questions | developer.parliament.uk answered 403, so the terms are unread. A person reading in a browser can settle it. |
| Thames Water storm overflows (EDM) | Near real-time sewage discharges into the Thames | The portal needs JavaScript; licence and key are unread. A person reading in a browser can settle it. |

### Not for code

| Feed | Why |
|---|---|
| Met Office warnings RSS | robots.txt disallows /public/data/, which is where the feed lives. |
| PLA tide predictions | 403; search snippets say personal use only. |
| Planning London Datahub | 403; access needs a login; applicants' names and addresses are a high risk. |
| Thames Barrier closures | No open feed found; only a gov.uk page of scheduled closures. |
| Science Museum Group metadata | CC BY-NC-SA 4.0 (second-hand), which rules out commercial use. |
| London events | No official open feed found; the event sites we may not machine-read stay out. |

## 3. Proposal: for a London demo this week (data.b@'s recommendation)

1. **TfL line status, BikePoint and road disruptions**, under the TfL terms already on our register. Status is the strongest live demo: it changes within a minute and needs no key. Pages would read it in the browser from our own file, falling back to the built figures.
2. **Carbon Intensity, London region**: one keyless request every half hour; a clear chart.
3. **Thames tide gauges** added to ea-flood.
4. Then LAQN, once rights@ has read the two sets of terms.

For a live demo, these sources would need reading more often than twice a day, for example every 15 minutes while a demo runs. That is a schedule for Dinis to set (see section 4).

## 4. Proposal: data.london and data.portugal

**What Dinis asked for:** a data.london agent and a data.portugal agent, isolated from each other and able to run on different schedules.

**Proposal: one repository and one site, two owners.**
- Every source card gets a `region` field, `london` or `portugal`.
- `node collect/run.mjs --region london` reads only London's sources, and `--region portugal` only Portugal's. Each agent runs its own region, on its own wake, and commits only its own `data/<source>/` folders and its own status and debrief under `board/team/data-london/` and `board/team/data-portugal/`.
- One build, one set of gates and one site: data.promptugal.news, with /london/ and /portugal/ sections. There is no second copy of the checks, so neither agent can weaken them for the other.
- Shared files (the register, the build and the gates) change only through a commit that names both agents' agreement, or Dinis's.
- data.b@ hands over: London's sources (tfl-jamcams, ea-flood, open-meteo-london, contracts-finder, the new TfL and carbon feeds) to data.london, and the Portuguese and EU ones to data.portugal. data.b@ then stops, or stays as the owner of the shared build and gates, as Dinis prefers.

**Alternative: a separate London repository and subdomain** (for example data-london.promptugal.news). It gives fuller isolation but costs a second copy of the build and the gates. Worth doing only if London grows into its own site.

**Schedules (proposal):**
- data.portugal keeps twice a day (07:03 and 18:03 Lisbon).
- data.london runs twice a day by default, plus a "demo mode" that Dinis switches on: every 15 minutes, for TfL status and carbon only, while he demos.
- Dinis's word of 19 Nov (twice a day) would need his change for the demo mode.

**What data.b@ cannot do:** create the sessions or the scheduled tasks. Dinis, or maestro.b or conductor.b@ at his word, would start data.london and data.portugal. data.b@ can prepare the region split in the code, the status files and the hand-overs first.
