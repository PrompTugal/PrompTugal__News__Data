# Threat model: nvd-cve (NVD, CVE API 2.0)

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 by data.b.dev@ from the code at that date (WS-177). Not yet reviewed by a person or by security@.

## Parts

- `sources/nvd-cve/collect.mjs`: every 6 hours, up to four GETs of `https://services.nvd.nist.gov/rest/json/cves/2.0`: one window of CVEs modified since 00:00 UTC yesterday (pages of 2000; a CVE published in the window was also modified in it, so the new CVEs come from the same window). `daily_totals` (30 days, carried from the previous `latest.json`) counts whole UTC days: `complete` is true only when the window covered the whole day and every page was read; a later read replaces a partial day, a complete day is kept. No API key, 7 seconds between requests.
- `sources/nvd-cve/card.json`: terms (quoted, with page and read date), schedule, cost.
- The build serves `data/nvd-cve/latest.json` at `/api/v1/nvd-cve/latest.json`. The raw answers (about 6 MB a page, with every description and reference) go to the vault copy only (`scripts/build/lib.mjs` skips them for the site; the checks are not changed).

## Terms

NVD API Terms of Use (https://nvd.nist.gov/developers/terms-of-use) and start page (https://nvd.nist.gov/developers/start-here), read 18 November 2026. Both pages are script-rendered, so the text was read from the strings in the page bundle NVD serves for them. Quotes are in the card. In short: use is allowed ("search, display, analyze, retrieve, view and otherwise get"); the notice "This product uses the NVD API but is not endorsed or certified by the NVD." is asked to be shown (it is in `latest.json` as `notice` and on the source page); the NVD name may identify the source but not imply endorsement; modified content may not be attributed to the NVD (per-CVE values are kept as served; the totals are ours and say so); public limit 5 requests in a rolling 30 seconds (we make at most four a run, 7 seconds apart); "No more than once every two hours" for automated windows (we run every 6 hours).

## What it keeps

Per CVE: id (checked against `CVE-YYYY-NNNN`), published and lastModified (checked as timestamps), vulnStatus, the CNA (`sourceIdentifier`), CVSS base severity and score with version (v3.1, else v4.0, else v3.0, else v2; NVD's own score first, else the CNA's, marked `scored_by`), CWE ids (checked), vendor and product (from `cpe:2.3` strings of NVD's configurations, deduplicated; for CVEs NVD has not yet analysed, the CNA's own `affected` list in the same record, marked `products_from`; at most 20 a CVE, the rest counted), and a link built from the CVE id (never a URL taken from the answer). Totals per UTC day and severity, per CNA and per vendor.

Not kept: descriptions, reference URLs, tags, vector strings, CPE version parts.

## Trust and risks

| Risk | Mitigation | Residual |
| --- | --- | --- |
| Untrusted text in the answer (vendor and product names, CNA names) | control and bidirectional characters removed, shortened (`txt` in collect.mjs); a field with an em dash is dropped, never altered, and counted (`fields_dropped_em_dash`) | the wording check stays as it is; 6 fields dropped in the first run |
| A link to a hostile site | links are built from the validated CVE id, never from the answer | none known |
| Rate limit or block by NVD | no key, 7 second gap, two tries, a refusal (403, 429) is recorded and not retried; reads are 4 hours or more apart in practice | NVD may change its limits; a block loses the read, the last one stays |
| Partial window (more than six pages, or a page failing) | `pages_complete` in counts says whether every page was read | totals are lower than NVD's if false |
| A changed answer shape | a read with no valid CVE returns no items: the last read is kept | silent drift in fields we do not check, such as severity names (unknown names become unscored) |
| Misreading totals as an audit or as NVD's own numbers | `about` says the totals are ours and a weak signal; per-day `note` says which part of the day is covered | `daily_totals` counts a CVE modified again later under its latest modification day, so a complete day can read slightly low for "modified" |
| Personal data, hosts, victims, IPs | the API returns CVE records about products; none of those fields are read or kept | a CVE id or a vendor name could in theory be a person's name (a one-person project); not seen |
| Secret | none: no key is used, none is stored or sent | if a key is ever added it goes through the environment's credential, never the repository |
| Volume | about 12 MB per run (two pages of about 8 and 4 MB in the first run of the new window); four runs a day; `latest.json` about 1.5 MB | the site's size grows with each day's window only (no history kept) |

## Open

- security@ to review the cyber limits and this model.
- A person may want an API key (higher limits) later; none is used.
- Vendor and product are the CNA's own claim for CVEs NVD has not analysed (about three quarters of the new ones); they are marked `products_from: cna` and are less reliable than NVD's CPE.
- The CNA is kept as the domain of NVD's `sourceIdentifier` (an email address) or as its UUID, never the address itself (data.b@, 18 Nov 2026).
