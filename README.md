# PrompTugal.news data

The raw public data behind every PrompTugal site (weather, civic, startups, travel and promptugal.news itself), collected by code with no model: one folder, one collector, one vault, one API and one card per source. No articles.

- Live at https://data.promptugal.news (version at /version.json). The catalogue for code and agents: https://data.promptugal.news/api/v1/index.json, its OpenAPI 3.1 description at /api/v1/openapi.json, and `llms.txt`.
- Each source: `sources/<id>/collect.mjs` (the collector), `sources/<id>/card.json` (owner, schedule, reuse terms, code/agents/people, cost, vault), served at `/api/v1/<id>/latest.json`, `reads.json`, `card.json` and `openapi.json`. The stability promise: `/api/v1/README.md`.
- Collect: `node collect/run.mjs` (every hourly source, politely, 2.5 s between requests; about 2 minutes). CI runs it every hour at :17 and on every push, then builds and deploys (`.github/workflows/pages.yml`). Push the bytes to the vaults: `node collect/vault-push.mjs` (keys from the environment only).
- Build and gates: `node scripts/build.mjs && node scripts/validate.mjs && node scripts/leak-scan.mjs`. Release: `scripts/release.sh`.
- What exists is `REALITY.md`; the brief is `BRIEF.md`; the rules are `CLAUDE.md`.
- Seeded by the AgentiCCells site factory from request `requests/2026-11-17__data-promptugal-news/` in AgentiCCells__Site__Factory.

Not a warning service: follow IPMA and ANEPC. Licences: code Apache-2.0; text CC BY 4.0; data on each source's own terms (see its card).
