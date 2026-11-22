# Proposal: a page for every entity on /streaming/, graph-based

data.d@PrompTugal.dinis, 22 November 2026, about 03:40 UTC. Proposal only: nothing here is built in the repository. Brief: `board/team/data-d/briefs/2026-11-22-dinis-streaming-pages-graph.md`.

## What the data holds (measured on the live page, v0.1.151, built 21 Nov 21:22 UTC)

- 320 list rows, but only 166 distinct titles (92 films, 74 series): 115 titles are listed in both countries and 25 on more than one service.
- 888 people by name (cast top 5, directors or creators), 77 of them on more than one title; 1,008 person-to-title links.
- 22 TMDB genres, 11 original languages, 39 years, two age-rating systems (BBFC in the UK, CCE in Portugal).

Three things the current build gets in the way of:
1. **People have no id.** The build keeps names only, so two people with one name merge, and a slug cannot be stable. In the prototype 7 names merged by slug. Fix: keep TMDB's person id from `credits` (already fetched, just dropped).
2. **A title has a different name in each country.** The same film is "X" in the UK list and "Y" in the Portuguese one; slugs made from the title split it in two (my first prototype run made 132 film pages for 92 films). Fix: slug = `<tmdb id>-<UK title>`, the Portuguese title is a label.
3. **Film and TV genres do not match.** TMDB's TV list has "Sci-Fi & Fantasy", "Action & Adventure" and "War & Politics" where films have the parts. They need one taxonomy (below).

## Four ways to do it

### A. One big file and a router in the page (hash routes)
`/streaming/#/person/123-name`. One HTML page, one data block (today's, extended with ids and links), and JavaScript draws whichever entity the hash names.
- For: one request; nothing new to build per entity; graphs are easy (everything is in memory).
- Against: no real URL per entity for crawlers or link previews (the part after `#` is never sent to the server); nothing works without JavaScript; the whole set loads to see one person.

### B. The 404 trick (GitHub Pages serves `404.html` for any unknown path)
`/streaming/person/123-name/` with no file behind it; `404.html` reads the path and draws the page.
- For: real-looking slugs with no build per entity.
- Against: the HTTP status is 404, so search engines drop the pages, link previews fail, monitoring sees errors, and every visitor gets a 404 in their history. Not recommended.

### C. A static page per entity, made at build time (prototype made)
`/streaming/film/<id>-<slug>/`, `/streaming/series/...`, `/streaming/person/...`, `/streaming/genre/...`, `/streaming/on/<country>/<service>/`, `/streaming/language/...`, `/streaming/year/...`, `/streaming/age/...`.
- Prototype (scratchpad only, `proto.mjs`, from the live rows): **1,143 pages** (92 films, 74 series, about 881 people, 20 genres in 7 families, 8 catalogues, 11 languages, 39 years, 5 age bands), **3,167 links**, all 1,143 internal links resolve. About 1.8 KB a page, 2.2 MB of HTML in all. Each page lists its links grouped by relation and draws its neighbourhood as an SVG graph at build time, with every node a link, so it works with no script.
- For: a real 200 page and a slug for everything; "click on everything" works with no JavaScript; each page is small.
- Against: about 1,100 more pages per build (fine for Pages; the build writes them in under a second); the sitemap decision below.

### D. C plus one graph file for the big views (recommended)
C for the pages, plus one graph file (nodes and edges only, no TMDB text: 279 KB, 42 KB gzip in the prototype) that any streaming page loads once and keeps (PTData's Cache Storage) to draw the larger graphs: the full network, two-hop neighbourhoods, "people who link these two titles", genre co-occurrence. The page for an entity always works without it; the graph file adds the explore layer.

"Make the file once": with D each entity's page is made once per build, and the graph is one file, so no entity is repeated across many files.

## The JSON question, and TMDB's terms

Dinis asked about individual JSON files. TMDB's terms (as read on 21 Nov) count "providing archived or cached data sets containing TMDB Content to another person or entity" as commercial, bar derivatives, and bar use in AI applications; Dinis chose "TMDB, display only" on 21 Nov. Per-entity JSON files on the site, or in the API, would be such a data set. Options:
1. **HTML pages only (C), graph file as page code (D)**, marked noai, out of llms.txt, the API and the sitemap's data section: the same standing as today's data block. Inside "display only". Recommended.
2. **Open JSON per entity from an open source.** Wikidata (CC0) holds films, series, people, genres and their TMDB ids (properties for TMDB film, TV series and person ids exist; to be checked before use). The open layer (who is in what, genres, countries, languages) could come from Wikidata and be served as JSON in our API, with TMDB only adding the display layer (what streams where, posters, ratings). This gives the ontology an open backbone that others can reuse.
3. **JSON of TMDB content per entity**: needs Dinis to decide it fits TMDB's terms, or TMDB's commercial licence. Not recommended.

## The ontology (proposal)

schema.org where it fits, so the pages can carry JSON-LD for their own display:
- Classes: `Movie`, `TVSeries`, `Person`, `Organization` (the streaming service), `Country`, `Language`, `DefinedTerm` (genre, genre family, age band), and our `Catalogue` (a service in a country).
- Relations: `actor`, `director`, `creator` (person to title); `genre` (title to genre); `broader` (genre to genre family, SKOS); `inLanguage`; `countryOfOrigin`; `datePublished` (year); `contentRating` and our `ageBand`; our `availableOn` (title to catalogue, with rank and date read), `offeredBy` and `inCountry` (catalogue to service and country).
- Derived (code, no model): co-appears-with (person to person through a title), shares-genre, same-catalogue.

## The taxonomy (proposal; a person should check it)

- Genres: TMDB's film and TV lists unified (each TV pair split into its parts), under 7 families: action and adventure; speculative; crime and suspense; drama; comedy; family and animation; factual and music.
- Age bands across the two systems: all, 12+, 15+, 18+, unrated (BBFC U and PG and CCE M/3 and M/6 as "all"; 12, 12A, M/12 and 12AP as 12+; 15, M/14 and M/16 as 15+; 18 and M/18 as 18+). CCE values the prototype saw that are not mapped yet: NR and empty.
- Roles: actor (top 5 billed), director (films), creator (series).

## What it needs, and who

- Lane: /streaming/ is data.b@'s code (`scripts/build/streaming.mjs`, `src/assets/streaming/`). Dinis's request reads as giving data.d@ this work, but the lane is not set; conductor.d@ to settle with conductor.b@ before data.d@ changes those files.
- Push access for account D (403 today).
- Dinis: choose A, B, C or D (data.d@ proposes D), and the JSON option (data.d@ proposes 1 now, 2 next).
