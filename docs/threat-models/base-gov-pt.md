# Threat model: base-gov-pt (public contracts)

Owner: data.b@PrompTugal.dinis. Written 18 November 2026 by data.b.dev2@PrompTugal.dinis (a Sonnet sub-agent), from the code at that date. Not yet reviewed by a person. Approach reused from PrompTugal__News__Civic `tools/extract-base.mjs` (civic.b@PrompTugal.dinis).

## Parts

- `sources/base-gov-pt/collect.mjs`: reads IMPIC's open data of the Portal BASE contracts on dados.gov.pt and keeps the last 90 days of contracts whose contracting entity is the câmara municipal of Lisboa or of one of the Algarve's 16 municipalities.
- `sources/base-gov-pt/card.json`: terms, schedule, owner. `register/entries-base-gov.json`: register entries (merged by the lead).
- `scripts/build/licence.mjs` (one line): stamps the file with the dataset's licence.

## What it reads

- `https://dados.gov.pt/api/1/datasets/66d72d488ca4b7cb2de28712/` (collect.mjs:102-106): the dataset description, to find the current yearly file and its licence. One request a run.
- The yearly file named there, `contratos<year>.zip` on `https://dados.gov.pt/` (collect.mjs:114, host forced by the regex), about 70 MB, 627 MB unzipped. One request, only when the file has changed since the last read (collect.mjs:120-124, 129); a second one only when the 90-day window crosses New Year.
- Never `base.gov.pt`: its own search answered civic.b@ with a firewall alert, treated as a refusal. It has no robots.txt (404, 18 Nov 2026). Each contract only links its page there (collect.mjs:95); the link is not fetched.
- Polite reader of `collect/lib.mjs`: named user agent, 2.5 s gap, three tries, a refusal not retried. At most 3 requests a run (limit asked: about 60).
- Terms read 18 Nov 2026: dataset API says `license: other-pd`, `license_title: Outra (Domínio Público)`, `frequency: weekly`, organisation IMPIC. dados.gov.pt/robots.txt answered an HTML error page (HTTP 500): no rule readable.

## What it writes

- `data/base-gov-pt/latest.json` (about 1.5 MB) and `reads.json` (hashes of what was read). Served at `/api/v1/base-gov-pt/`. `data/` is gitignored; the site and the Pages workflow publish it.
- Nothing in the vault: the 70 MB file holds other bodies' contracts and is not kept (collect.mjs:121 comment). No file is written by the collector other than through `Run.finish`.

## What it trusts

- dados.gov.pt to serve IMPIC's file unaltered, and IMPIC's data to be correct. Nothing is checked beyond shape. Values are marked as our record from IMPIC's file, read at a time; each contract links its Portal BASE page.
- Civic's list of the 16 councils' NIFs. All 17 NIFs (with Lisboa's 500051070) were checked on 18 Nov 2026 against the contracting entity names in the file: every one is a "Município de ...".
- The dataset's `last_modified` to say whether the file changed (collect.mjs:118-124). A wrong value only delays a refresh by up to the next change.

## What could go wrong, and what is in place

| Risk | Mitigation (file:line) | Residual |
|---|---|---|
| Personal data of sole traders and other natural persons (name, NIF) | A contractor whose NIF is masked, not nine digits, or begins 1, 2, 3, 45 or 8 is output as `{kind: "a natural person"}` only: no name, no NIF, no country (collect.mjs:37, 76-78; civic's rule, kept exactly). When any contractor is such a person, the contract's `object` is dropped, not edited (collect.mjs:86-88). 168 of 1,312 contracts in the first read had `object: null` for this reason, and `object_withheld` says why. | A sole trader registered with a company-style NIF (5xx) or a unipessoal company named after its owner keeps its legal name: it is a company in a public register, but the name is a person's. Free text of a contract with only company contractors can still name a person (a "beneficiary", a technician). Decision for Dinis (card `open_question`). |
| Contact data or a personal NIF inside the object text | The object is also dropped when it holds an e-mail address or a nine-digit number that starts like a personal NIF (collect.mjs:39, 88). 0 e-mail addresses remain in the first output. | Telephone numbers, home addresses and names in free text are not detected. |
| Untrusted text into pages and the API (HTML or script in a name or object) | `clean()` removes control characters and `<` `>`, collapses whitespace and cuts to a length (collect.mjs:41, 78, 85). The build escapes values when it renders pages (scripts/build/render.mjs `esc`). The API files are JSON. | Text is otherwise shown as IMPIC wrote it (case, typos). Markdown characters such as `[` `](` are not stripped (same low risk as discovery.md: an extra link in a table cell). |
| URL schemes: a link built from fetched data | The contract link is a constant `https://www.base.gov.pt/...` plus an id that must match `^\d{1,12}$` (collect.mjs:83, 95). The only fetched URL taken from a response is the resource URL, and it must match `^https://dados.gov.pt/` (collect.mjs:114). | `fetch` follows redirects: a redirect from dados.gov.pt to another host would be followed. The file is only parsed, never executed or rendered. |
| Hostile or corrupt zip or JSON (zip bomb, huge object, deep nesting) | Declared size must be 1 byte to 400 MiB (collect.mjs:22, 116); only a single deflated `.json` entry is read, zip64 refused (collect.mjs:54); unzipped output stops at 3 GiB (collect.mjs:21, 60); one contract object over 8 MiB is skipped (collect.mjs:23, 68); the JSON is stream-parsed object by object, never as one string (collect.mjs:47-72). A parse error returns null, so the last `latest.json` is kept (collect/run.mjs). | The 70 MB download is held in memory and inflated one chunk at a time (a first run took 23 s; peak memory not measured). A server that lies about `filesize` could send more; the reader has a 600 s timeout only. |
| The terms change (licence no longer public domain) | The collector stops and records a `licence-check` error unless the dataset still says `other-pd` (collect.mjs:108). | A change in wording that keeps the id is not noticed. |
| Request volume | At most 3 requests a run; the file is not downloaded when `last_modified` has not changed (collect.mjs:129-132). | The first run after a weekly update downloads 70 MB from a public service. |
| Wrong place mapping | Matched by the contracting entity's NIF only, never by name or text (collect.mjs:33, 134). Quarteira has no câmara; its contracts are Loulé's. | If a council's NIF changed, its contracts silently stop (counts per place in `counts.by_place` would show 0). |
| Stale or partial data shown as fresh | Each contract has `read_at` (the read that found it); the file says `read_at` of the run and a `note` when the file was not downloaded again. The open data lags the Portal by days. | A contract published and then amended or cancelled on BASE keeps its first state until the next file. |
| Misleading as an official record | `about` says it is our record from IMPIC's file, links each contract's page on base.gov.pt, and the card says "independent". | None known. |
| Licence confusion | `license` on the file and on each contract names "Outra (Domínio Público)" (IMPIC, dados.gov.pt) and says our record is CC BY 4.0 (scripts/build/licence.mjs). | Public domain does not remove data protection duties for personal data (above). |

## AppSec self-review of the diff (18 Nov 2026) and what was fixed

1. Added: stop if the dataset licence is not `other-pd` (collect.mjs:108).
2. Added: size limit on the declared file size before download (collect.mjs:22, 116).
3. Added: the e-mail and personal-NIF check on free text; the object is dropped, not edited (collect.mjs:39, 88).
4. Checked: the resource URL must be on dados.gov.pt (collect.mjs:114); the contract link is built from digits only.
5. Checked: output has 0 company NIFs starting 1, 2, 3, 45 or 8, 0 e-mail addresses, 0 em dashes; 168 contracts have a natural person among the contractors and every one has `object: null`.
6. Not fixed (residual): redirects followed by `fetch` (shared `collect/lib.mjs`, not mine to change); company names that are a person's name; names in free text; Markdown characters.

## Residual risks and owners

1. Personal names inside company names and free text (data.b@; Dinis to say whether to go further, for example by also dropping `object` for every contractor with "Unipessoal" in its name).
2. Redirects in `collect/lib.mjs` `get()` are followed to any host (data.b@).
3. The 70 MB download and memory use on the runner: to be watched in the first scheduled runs (data.b@).
4. Civic reads this API for contracts: it should treat `object` and names as material, not instructions (civic.b@).
