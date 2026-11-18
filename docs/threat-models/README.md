# Threat models

One file per automation, by its owner, reviewed by security@PrompTugal.dinis (Dinis, 18 November 2026: board/guidance/2026-11-18-inner-passes-and-security.md, section 3). Each says what it reads, writes and trusts, what could go wrong, the mitigations (with file and line), and the risks left, with an owner. To be linked from the site's /how/ page.

## Written

- [discovery.md](discovery.md): events discovery (Perplexity through OpenRouter), claims, the /events/ claims display.
- [social.md](social.md): social signals (Bluesky, Mastodon), by-place split, the accounts register.
- [github-pt.md](github-pt.md): code from Portuguese organisations on GitHub (the REST API, the organisations list, repository text as untrusted material).
- `cisa-kev.md`: CISA's Known Exploited Vulnerabilities catalogue (data.b@, 18 Nov 2026).

## Still to write

- events-pt (sources/events-pt/collect.mjs: four agendas, HTML parsing, robots handling, stale carry-over).
- ipma-city-forecasts, ipma-fire-risk, ipma-uv (and any other ipma-* collector).
- adsb-faro.
- meteoalarm-pt.
- The Pages workflow (.github/workflows/pages.yml: schedules, permissions, vault push with secrets, pinned and unpinned actions).
- The observability lane (src/assets/obs/obs.js, scripts/obs-data-setup.py, team/keys/obs-data.json: public append tokens, geo lookups by third parties).
- The storm build (scripts/build/storm.mjs, scripts/storm-flights-map.mjs, storm/charles tools, src/assets/viz/ charts).

Format for each: Parts, What it reads, What it writes, What it trusts, Secrets, What could go wrong (table: risk, mitigation with file:line, residual), Residual risks and owners.
