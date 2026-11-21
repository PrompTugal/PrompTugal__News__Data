# Cyber data feeds, focused on London/UK and the EU: what we have and what we can add

By data.b@PrompTugal.dinis, 21 November 2026, for Dinis's request of about 09:27 UTC (kept in briefs/2026-11-21-dinis-london-as-a-second-country.md).

**How this was read:**
- Two Sonnet sub-agents read official docs, terms and robots.txt pages, between about 09:20 and 09:40 UTC.
- They made one keyless sample request per feed, at most.
- Nothing was signed up for, and nobody was contacted.
- Quotes came through a summarising fetch tool: check the wording at the source before it goes on a page.
- "Unverified" means not read at the source.
- cyber.b@ leads cyber, so this map is for cyber.b@ and Dinis before anything is built.

## 1. What we read today

| Source | What | Last read (UTC) | At that read |
|---|---|---|---|
| cisa-kev | CISA's Known Exploited Vulnerabilities | 21 Nov 07:04 | 1,790 entries, 298 vendors, 9 added in 7 days |
| nvd-cve | CVEs NVD published or modified in 24 hours | 21 Nov 07:12 | 1,357 in the window, 539 new |
| nvd-kev | NVD's record of every KEV CVE | 21 Nov 07:12 | 1,790 |
| euvd | ENISA's EU Vulnerability Database: latest, exploited, updated | 21 Nov 07:06 | 1,193 in 24 hours, 7 exploited |
| enisa-pubs | ENISA's publications | 21 Nov 07:06 | 10, newest 16 Nov |

**CWE:** we do not read the CWE catalogue itself. The weakness ids come only as a field on each KEV and NVD record, so a page can show "CWE-79" but not what it means.

## 2. What we can add

### Tier 1: open licence, no key. Ready to build once cyber.b@ agrees.

| Feed | Gives | How live | Licence and credit | Sample |
|---|---|---|---|---|
| NCSC UK RSS (all, guidance, news, blog, reports) | The UK's national cyber advisories and news | on publication | OGL v3.0: "you may use or reuse the content published on the Websites without prior permission"; acknowledge the source and link to the OGL. Images credited to others are excluded. | 09:28, 200, newest 17 Nov |
| CERT-EU security advisories (RSS) | Advisories for the EU institutions | near live, last 10 items | CC BY 4.0 (legal notice): "reuse is allowed, provided appropriate credit is given and changes are indicated" | 09:29, 200, newest 18 Nov |
| MITRE CWE, CAPEC and ATT&CK | What each weakness id means; attack patterns; adversary techniques (STIX 2.1) | each release | MITRE terms: "free to use ... for research, development, and/or commercial purposes"; reproduce MITRE's copyright and licence. | downloads; not sampled |
| GitHub Advisory Database | Package advisories with CWE and GHSA ids (OSV JSON in git) | continuous | CC BY 4.0, credit GitHub | not sampled |
| OSV.dev | Package vulnerabilities across ecosystems | continuous | Licence per source record (CC0, MIT, Apache 2.0, CC BY 4.0, CC BY-SA 4.0). Drop records whose licence is non-commercial, such as Chainguard's (CC BY-NC-ND 4.0). | not sampled |
| Tor Metrics | Daily Tor users by country: GB and PT | daily, about 3 days behind | CC0 for data | PT on 18 Nov: 28,401 users |
| Spamhaus DROP | Netblocks hijacked by criminals | daily (fetch at most once a day) | "available at no cost, regardless of size or business type"; credit Spamhaus. Show counts, not the list. | 20 Nov 18:57 GMT list |

### Tier 2: open, but the licence must be confirmed, or care is needed.

| Feed | Gives | Care |
|---|---|---|
| NCSC-NL advisories (RSS and CSAF) | Dutch national CERT advisories, machine-readable | No licence found on the page. Sample at 09:29, 200, newest 20 Nov. |
| BSI CERT-Bund WID (CSAF 2.0, TLP WHITE) | The largest open CSAF source | No licence text found. BSI's robots.txt sets a 10-second crawl delay. |
| CERT-FR (ANSSI) RSS | French national CERT alerts and advisories, in French | "Licence ouverte" per a search summary, which also says commercial use needs prior authorisation; the page itself could not be read. |
| CIRCL vulnerability-lookup | Cross-source vulnerability lookup with sightings | Open data CC BY 4.0 "unless a repository or dataset states otherwise". The API allows 20 requests a minute anonymously, asks for a User-Agent with a contact, and says "Do not enumerate the API to mirror the dataset". |
| CVE Program cvelistV5 (GitHub) | The CVE records as the CNAs publish them, about every 7 minutes | The CVE terms of use page did not render. It overlaps NVD; its value is the CNA's own CWE, CVSS and products. |
| UK statistics: ONS fraud and computer misuse, ICO data security incident trends, DSIT Cyber Security Breaches Survey | The UK context: annual and quarterly | OGL v3.0 for ONS and for ICO's text; whether ICO's data is OGL is not confirmed, and DSIT's licence is unread. Slow-moving. |

### Tier 3: needs Dinis (an account, a key or a non-commercial licence).

| Feed | What it needs |
|---|---|
| FIRST EPSS | Already your ask: no licence is named. |
| Cloudflare Radar (attacks by country) | An account token, and CC BY-NC 4.0 (no commercial use). |
| abuse.ch URLhaus, ThreatFox, MalwareBazaar | An Auth-Key by registration; commercial users "may require a paid subscription". Feodo Tracker is CC0 but empty today. |
| Shadowserver | An API key; the terms grant a "personal ... limited and revocable" licence; the dashboard answered 503. |
| SANS ISC / DShield | CC BY-NC-SA 4.0; no country endpoint. |
| RIPEstat (routing by country) and IODA (internet outages) | RIPEstat asks heavy users to register; IODA's terms need Georgia Tech's permission for non-academic use (search result). |

### Not for the site

| Feed | Why |
|---|---|
| CCN-CERT (Spain) | 403 bot check. |
| INCIBE-CERT (Spain) | Its terms say "No se pretenda un uso comercial"; link out only. |
| PhishTank, OpenPhish | Registration or unread terms; the lists name impersonated brands. |
| Ransomware leak-site trackers | They republish victims' names. Not checked, and not proposed. |
| London-specific cyber figures | None found: no open Met Police or Report Fraud (formerly Action Fraud) cyber data; london.gov.uk's MOPAC page answered 403. |
| CNCS Portugal (Observatório) | Annual PDF reports only, no open data or licence found; the official page did not load ("too many redirects"). |

## 3. Proposal: the cyber demo set (data.b@'s recommendation)

1. **NCSC UK and CERT-EU feeds**, as titles, dates and links with credit. That gives a live UK-and-EU advisory ticker beside KEV and EUVD.
2. **The CWE catalogue** joined to the CWE ids on KEV, NVD and EUVD records. Every vulnerability then shows its weakness in words, and the top weaknesses exploited this month can be counted. ATT&CK and CAPEC can follow.
3. **Tor users, GB and PT**: a clean daily series, CC0.
4. **The GitHub Advisory Database** (CC BY 4.0), for a software supply-chain tile.

Then the tier 2 feeds, once their licences are confirmed. rights@ should look at NCSC-NL, BSI WID, CERT-FR and CIRCL.

## 4. Who owns cyber data (proposal, open with Dinis)

- A third owner, data.cyber, beside data.london and data.portugal.
- It would hold the five cyber sources above, plus what is added from this map, with region `cyber` on each card.
- cyber.b@ keeps the cyber site on top of the data.
- Until Dinis decides, the five sources stay under data.portugal's hand-over.
