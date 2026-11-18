# The Storm items each sub-site takes

From the Storm map (board/team/data/storm-map.json, 18 November 2026), for conductor.b@PrompTugal.dinis to pass to the weather, travel and civic teams. Kept by data.b@PrompTugal.dinis. It follows Dinis's brief of 18 November (PrompTugal__News__Website board/briefs/2026-11-18-data-site-and-the-storm.md: "If some of those things need to move into one of the other sub-sites (weather, civic, startups, travel), that's fine"). These are proposals from the map, not decisions: each team decides what it takes.

The Storm's data is served from data.promptugal.news: https://data.promptugal.news/api/v1/storm/charles/index.json (every file), with its OpenAPI at /api/v1/storm/openapi.json. Read it from there rather than copying. The Storm repository (PrompTugal/PrompTugal__News__Storm-Charles, commit fdac6ed, Apache-2.0) is frozen as the record. Charts already ported here can be reused as they are: src/assets/viz/wind.js (the wind map), src/assets/viz/flightmap.js (the flight maps), src/assets/viz/storm-labs.js (once committed: residents by hour, warned against observed, forecast models).

No site takes material that names people (media watch, social, evidence) without consent: those stay frozen on the Storm site.

## weather.promptugal.news (weather.b@): 14 items

| Item | Kind | Files in the Storm repository | Notes |
|---|---|---|---|
| Weather face (front page of the Storm) | page | `weather/index.md`, `weather/about.md`, `app/weather/weather.js`, `app/weather/weather.css` | IPMA warnings in force, day by the hour, what is closed, Madeira. Reads only own JSON (weather/*.json, decisions/graph.json). 98 KB script, no libs. |
| Meteorology lineage: where a forecast comes from | page | `meteorology/`, `app/meteorology/map.js` | 26 files: nodes, edges, lineage.json, licences.json (what we may manipulate), samples. SVG drawn at build time. |
| Labs: experiments in timelines, decisions, weather | page | `labs/index.md`, `labs/weather/`, `labs/timelines/`, `labs/decisions/` and 1 more | 13 md pages, 4 scripts. Own SVG. |
| Broadcast: the storm as a live news channel (chyron, ticker, wind and pressure map) | page | `broadcast/`, `app/broadcast/broadcast.js`, `app/broadcast/broadcast.css` | Canvas map plus panels; reads broadcast/data/field.json and coast.json (NOT in the archive). |
| Residents under each IPMA level, hour by hour | visualization | `app/design/hours.js (6.6 KB)`, `incidents/2026-11-10-storm-charles/data/exposure/people-by-hour.json (8 KB)` | SVG, no libs. Mount <div data-hours-chart=path>. Census 2021 (INE) times IPMA warnings. |
| Weather face: warnings by hour strip, observations, airport METAR, rain, Madeira | visualization | `app/weather/weather.js (98 KB)`, `app/weather/weather.css (31 KB)`, `app/design/front.js` | SVG, no libs. Reads weather/{warnings,forecast,stations,cap,changes,communiques,lisbon-rain,madeira,airport,airport-madeira}.json, decisions/graph.json, data/agents/now.json (the last is Storm-only; drop). |
| Warned against observed: every station on one time axis | visualization | `app/labs/weather.js (34 KB)`, `app/labs/labs.js (19 KB)`, `app/labs/labs.css`, `weather/stations.json` and 1 more | SVG, no libs. Mount <div data-lab="weather/stations">. Needs Labs core. |
| Wednesday hour by hour in bands (warnings, IPMA hourly forecast, TAF, observed, decisions, our hypothesis) | visualization | `app/labs/weather.js`, `app/labs/labs.js`, `weather/forecast.json`, `weather/airport.json` and 3 more | SVG, no libs. Forecast cells dashed, observations solid. |
| Forecast models side by side (IPMA, MET Norway, Open-Meteo, TAF) with direct labels | visualization | `app/labs/weather.js`, `weather/forecast.json`, `weather/madeira.json`, `weather/lisbon-rain.json` | SVG, no libs. |
| IPMA views: map, warnings, sea, cities forecast vs observed, reads | visualization | `app/sources/ipma/ipma.js (32 KB)`, `app/sources/ipma/ipma-more.js (11 KB)`, `app/sources/ipma/ipma.css`, `sources/ipma/data/*.json (10 files)` | No libs, no outside request. Data site has its own IPMA collectors with different shapes; adapter needed. |
| MeteoAlarm feed browser (table, schema, diffs) | visualization | `app/sources/meteoalarm/browser.js (12.5 KB)`, `sources/meteoalarm/data/portugal/` | No libs. |
| Lineage map (SVG at build time, hover lights edges) | visualization | `app/meteorology/map.js (1.3 KB)`, `meteorology/lineage.json`, `meteorology/nodes/`, `meteorology/edges/` | Self-contained. |
| Wind and pressure field, coast | collector | `tools/broadcast-field.mjs`, `tools/broadcast-coast.mjs` | Host: api.open-meteo.com, unpkg.com (world-atlas 2.0.2). Reads: 2 degree grid, 3-hourly; Natural Earth land. Cadence: once, by agent. The files are small; copy them and the tools. |
| Meteorology lineage graph and licences | dataset | `meteorology/*.json`, `meteorology/nodes/`, `meteorology/edges/`, `meteorology/samples/` | 26 files, 380 KB. In archive manifest: no.  |

## travel.promptugal.news (travel.b@): 7 items

| Item | Kind | Files in the Storm repository | Notes |
|---|---|---|---|
| Flights and the wind | page | `flights/README.md`, `flights/how.md`, `flights/how.json`, `flights/sources.md` and 1 more | Two maps (Lisbon LPPT, Madeira LPMA), crosswind per runway end, departures vs ANA cancellations. Data archived; map files under map/, tracks/, runways.json, movements.json are generated by tools/flights-map.mjs and are NOT in git or in the archive. |
| Transport (flights, metro, buses, ferries, trains, bridges, coaches, taxis) | page | `transport/`, `app/transport/transport.js`, `app/transport/transport.css` | 14 files, 11 md. OpenSky pages paused (terms). Carries reads.jsonl, gloss.json, opensky-paused.json. |
| Guide for readers: lisbon, media, stranded | page | `guide/index.md`, `guide/lisbon/`, `guide/media/`, `guide/stranded/` and 1 more | 5 md. |
| Crosswind by runway end and departures vs ANA cancellations, hour by hour | visualization | `app/design/flightmap/flightmap.js (section)`, `incidents/2026-11-10-storm-charles/data/flights/crosswind.json (226 KB)` | Part of the flights map; reads crosswind.json and movements.json. METAR via aviationweather.gov. |
| Transport page: per mode counts, schedule, bridges | visualization | `app/transport/transport.js (17 KB)`, `transport/*.json (8 files)` | No libs. |
| METAR crosswind and runways | collector | `tools/flights-crosswind.mjs`, `tools/flights-map.mjs`, `tools/flights-index.mjs`, `tools/flights-summary.mjs` | Host: aviationweather.gov, davidmegginson.github.io (OurAirports), ourairports.com. Reads: METARs for LPPT and LPMA, runway ends. Cadence: on demand by agents; derives map/ files at build. flights-map.mjs makes the files the flight map needs. |
| Open transport reader | collector | `tools/transport-read.mjs`, `tools/transport-gtfs.mjs`, `tools/transport-gloss.mjs` | Host: opensky-network.org (paused), adsb.lol, api.carrismetropolitana.pt, broker.fiware.urbanplatform.portodigital.pt, dados.gov.pt, ttsl.pt, en.newsroom.ana.pt. Reads: departures per airport, Carris buses, Porto FIWARE, Metro GTFS, ANA cancellations. Cadence: hourly in the Storm; OpenSky paused 11 Nov 22:41 UTC. OpenSky terms ask a written licence for automated use: do not restart without it. |

## civic.promptugal.news (civic.b@): 11 items

| Item | Kind | Files in the Storm repository | Notes |
|---|---|---|---|
| The incident: timeline, decisions, headline | page | `incidents/2026-11-10-storm-charles/README.md`, `incidents/2026-11-10-storm-charles/timeline.md`, `incidents/2026-11-10-storm-charles/decisions.md`, `incidents/2026-11-10-storm-charles/incident.json` and 2 more | 162 files, 17 md. Its data/ folder (142 JSON) is archived in data.promptugal.news. |
| Stories: claims with supports (7) and the story kit | page | `stories/`, `story/` | 7 stories (who-warned-first, less-wind-for-lisbon, madeira/mainland warned against observed, what-the-press-had-and-when, what-nobody-has-said-yet, how-day-2-was-called-off); story/ holds cast, arc, 21 paths. |
| Entities: a node and page per thing (267 files) | page | `entities/` | 15 kinds (agent 40, decision 83, outlet 32, place 23, ...); entities/index.json 125 KB. Not in the archive. |
| Guide for readers: lisbon, media, stranded | page | `guide/index.md`, `guide/lisbon/`, `guide/media/`, `guide/stranded/` and 1 more | 5 md. |
| Timelines: lanes, known-when, lag, story | visualization | `app/labs/timelines.js (24 KB)`, `signals.json`, `weather/cap.json`, `data/graph/tables/signals.json` and 2 more | SVG, no libs. Needs data/graph tables and the media file (neither archived). |
| Decisions: flow, lead times, days, state | visualization | `app/labs/decisions.js (21 KB)`, `decisions/graph.json (142 KB)`, `weather/analysis.json` | SVG, no libs. |
| Incident dashboard: warning windows, decision lanes, timeline rows | visualization | `app/storm.js (41 KB)` | SVG, no libs. Reads signals.json, decisions/graph.json, weather/*.json, watch/websummit.json. |
| Question-first graph, ontology drawn, lead times | visualization | `app/graph/graph.js`, `app/graph/engine.js`, `app/graph/ontology.js`, `app/graph/lead-times.js` and 2 more | engine.js loads 3d-force-graph 1.80.1 and three 0.186.1 (1.6 MB) from web-summit.sgit.ai, pinned by sha384: external. ontology.js and lead-times.js are self-contained SVG. |
| Wikipedia pages on the storm, growing | visualization | `research/wikipedia/growth.js (10.6 KB)`, `research/wikipedia/articles.json` | SVG with table twin, no libs. |
| Wikipedia and Wikidata reader | collector | `tools/wikipedia-read.mjs`, `tools/wikipedia-claims.mjs`, `tools/wikipedia-lib.mjs` | Host: www.wikidata.org, wikipedia. Reads: revision histories, sitelinks. Cadence: each wake. |
| Graph, tables, ontology, queries | dataset | `data/graph/` | 19 files, 1.6 MB. In archive manifest: no. storm-decisions, storm-signals, storm-sources, storm-datasets, storm-elsewhere, tables/* |

Startups: nothing in the Storm map is for startups.promptugal.news.
