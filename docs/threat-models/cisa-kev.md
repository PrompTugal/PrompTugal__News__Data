# Threat model: cisa-kev (CISA's Known Exploited Vulnerabilities catalogue)

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 by data.b@ from the code at that date (WS-177). Not yet reviewed by a person or by security@.

## Parts

- `sources/cisa-kev/collect.mjs`: one GET every 6 hours of `https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json`.
- `sources/cisa-kev/card.json`: terms (CC0 1.0, quoted, with page and date), schedule, cost.
- The build serves `data/cisa-kev/latest.json` at `/api/v1/cisa-kev/latest.json`. The raw feed goes to the vault copy only, not to the site (`scripts/build/lib.mjs`: its text holds em dashes and long link tokens the gates refuse; the checks are not changed).

## Terms

CC0 1.0 (https://github.com/cisagov/kev-data/blob/develop/LICENSE, read 18 November 2026): "You may use this data in any legal manner". No CISA logo or DHS seal, no endorsement implied.

## What it keeps

Per entry: cveID (checked against `CVE-YYYY-NNNN`), vendorProject, product, vulnerabilityName (plain text, shortened), dateAdded and dueDate (checked as dates), knownRansomwareCampaignUse, CWE ids (checked), and an NVD link built from the CVE id (never a URL taken from the feed). Totals per week and per vendor. Not kept: shortDescription, requiredAction, notes (they carry third-party links and long text).

## Trust and risks

- The feed is untrusted text: control and bidirectional characters are removed; a field with an em dash is dropped, not altered, and counted (`fields_dropped_em_dash`).
- The catalogue names vulnerabilities in products, never a victim, host, address or person: within Dinis's limits for cyber signals (aggregates on cyber.promptugal.news; no IPs, hosts or victims; a weak signal, not an audit).
- A feed that changes shape returns no items: the run keeps the last read (`latest.json kept as it was`).
- Volume: about 1.9 MB a read, four reads a day.

## Open

- security@ to review the cyber limits and this model.
