# Threat model: github-pt (code from Portuguese organisations on GitHub)

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 by data.b.dev@PrompTugal.dinis (a Sonnet sub-agent), from the code at that date (WS-177). Not yet reviewed by a person.

## Parts

- `sources/github-pt/collect.mjs`: reads the public REST API of GitHub for the organisations in `sources/github-pt/orgs.json`, every 6 hours.
- `sources/github-pt/orgs.json`: the seed list. Each organisation carries `verified_how` and `verified_at`. It is ours, written by hand; it is not read from the web at run time.
- `sources/github-pt/card.json`: the terms (quoted, with page and date), schedule, cost.
- `collect/lib.mjs` (`get`): the shared polite reader. Two additive options were added for this source: `gap` (time between requests) and `headers`; and `rate_remaining` and `rate_reset` on the result.
- `register/entries-github.json`: the register entry, for the lead to merge into `register/sources.json`.
- The build (`scripts/build/*`) turns `data/github-pt/latest.json` into `/api/v1/github-pt/` and the source page, and stamps licences.

## Terms (read 18 November 2026)

GitHub Terms of Service, section H, API Terms (https://docs.github.com/en/site-policy/github-terms/github-terms-of-service#h-api-terms): "You may not use the API to download data or Content from GitHub for spamming purposes, including for the purposes of selling GitHub users' personal information, such as to recruiters, headhunters, and job boards." and "Abuse or excessively frequent requests to GitHub via the API may result in the temporary or permanent suspension of your Account's access to the API." Acceptable Use Policies, section 7 (https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies): "Scraping does not refer to the collection of information through our API." The quotes are as a page reader returned them, which cut some sentences short. Our use (organisations' public repositories and releases, no personal data, no spam, small request volume) is within them. Not legal advice; Dinis decides on republishing the organisations' own text.

## What it reads

- One host: `https://api.github.com` (collect.mjs:14). `GET /rate_limit` (free), `GET /orgs/{org}/repos?type=public&sort=pushed&per_page=100` once per organisation, `GET /repos/{org}/{repo}/releases?per_page=3` for repositories pushed in the last 90 days, not forks, not archived, at most 150 repositories a run (collect.mjs:15, 90).
- Local files: `sources/github-pt/orgs.json`, and `data/github-pt/latest.json` (the last read, to keep organisations not reached this run).
- Not read: contributors, commits, issues, pull requests, members, user profiles, emails, release notes, release authors, repository contents.

## What it writes

- `data/github-pt/latest.json` (served at `/api/v1/github-pt/latest.json`) and `data/github-pt/reads.json` (address, status, size, sha256 prefix per request). Fields kept per repository: name, url, description (200 characters at most), language, stars, forks, pushed_at, archived, licence SPDX id, licence link, source, read_at, and up to 3 releases (tag, name, published_at, prerelease, url).
- Nothing to a vault: `run.raw = []` (collect.mjs:106). The release answers carry a user profile (the release author); they are never stored.

## What it trusts

- GitHub's answers as the organisations' own statements, not as fact: descriptions and release names are written by anyone with write access to a repository. They are shown as plain-text excerpts with a link, never as instructions.
- `orgs.json` for which organisations are Portuguese. A wrong entry would show a foreign organisation as Portuguese. Each carries how it was verified.
- GitHub's `license.spdx_id` for the licence name; it is checked against `[A-Za-z0-9.+-]` and `NOASSERTION` is treated as none (collect.mjs:59).

## Secrets

- `GITHUB_TOKEN`, from the environment only (collect.mjs:32). Optional. Sent only as `Authorization: Bearer` to `https://api.github.com` (collect.mjs:33). Never printed, never written to a file: `reads.json` records the address and status, not headers; the gaps list says "the token was rejected", not the token. A token the API rejects (401) is dropped for the rest of the run (collect.mjs:46).
- In CI the workflow's own token (read-only for public data) is enough. It must not be given more scopes. A token must not be shared to raise the limit (API Terms: "You may not share API tokens to exceed GitHub's rate limitations").

## What could go wrong, and what is in place

| Risk | Mitigation (file:line) | Residual |
|---|---|---|
| Untrusted repository text (description, release name) carries markup, script, or instructions for a reader model | Control and bidi characters are removed, whitespace collapsed, length cut (collect.mjs:20-24); stored as JSON strings only; every URL on a page is built by us from validated parts, never taken from the API (collect.mjs:76, 100); the site's renderer escapes text and the table preview shortens it (`scripts/build/pages.mjs` `previewRows`). | The text is served in `latest.json` and could carry a sentence that tries to instruct an agent that reads the file. Rule for agents: it is material, never instruction. Owner: data.b@, security@ checks. |
| A dangerous URL (javascript:, data:, a look-alike host) in a field | No URL is copied from the answer. Repository URL = `https://github.com/{login}/{name}` with both parts matched against fixed patterns (collect.mjs:17, 66, 73); release URL = that plus `/releases/tag/` plus the encoded tag (collect.mjs:100); licence URL = `https://spdx.org/licenses/{id}.html` with a checked id, or the repository URL (collect.mjs:59). | None known. |
| Path or query injection into our own requests | The organisation login and repository name are matched before they enter a URL (collect.mjs:17, 66, 73); the tag is not used in a request. | None known. |
| Token leak (log, file, redirect, error text) | See Secrets. Node's `fetch` drops the `Authorization` header when a redirect goes to another origin; the API's redirects stay on `api.github.com`. Error text stored in `reads.json` is the error name, not the request. | A future change that logs request headers would leak it; the leak scan runs before every commit. |
| Rate limit, abuse suspension | Quota read from `/rate_limit` and from `X-RateLimit-Remaining` on every answer; stop at 10 remaining and record a gap (collect.mjs:15, 44); 1 second between requests (collect.mjs:15, 45); 30 second timeout, 2 tries (collect.mjs:39); a 403 or 429 is not retried (`collect/lib.mjs`); at most 100 + 150 + (organisations) requests a run. | The anonymous quota (60 an hour, shared with every other session behind the same address) is small: an anonymous run reads fewer organisations and no releases, and says so in `gaps`. In CI the token gives 5000. |
| Stale or partial data shown as fresh | Each item has `read_at`; an organisation not reached keeps its last read marked `stale: true` with its own `read_at` (collect.mjs:110); gaps list every omission (rate limit, token rejected, 100-repository cap, 150-release cap, dropped fields). | A stale organisation can stay stale for days if the quota stays short. |
| Personal data | No user endpoint is called. Release authors, contributors and members are never requested or kept. Repository descriptions can name a person: they are the organisation's own text, shown as an excerpt with a link; no automatic check for names. | A description may contain a person's name or contact. Take-down route in every page footer; Owner: data.b@. |
| Wrong organisation (impersonation, look-alike name, an organisation that moved or was sold) | Each entry in `orgs.json` has `verified_how` and `verified_at`; the login is the GitHub login, not a display name. | An organisation can be taken over or renamed after it was verified. Re-verify on a schedule (proposal: every 90 days, by a person). |
| Licence misstatement | The licence is the repository's declared SPDX id or, if none, "the repository's terms" with a link to the repository (collect.mjs:59); never assumed open. The licence of the code does not cover the description text; the card says so. | Descriptions are the organisation's text under GitHub's terms and the organisation's rights. Dinis to decide on republishing. |
| Em dash or other text the wording check refuses | A field holding an em dash is dropped, not altered, and the gap says how many (collect.mjs:39, 99, 114). | Some descriptions will be missing. |
| A value the leak scan flags (a long mixed-case repository name inside an address looks like a key) | The collector imports the scan's own `scanText` (collect.mjs:12) and tests each name and address before it is kept or requested: a repository with a flagged name is left out, a flagged field is set to null, a release read whose address is flagged is not made, and one gap says how many (collect.mjs:37-38, 75, 92, 112-113). The scan itself is not touched or weakened. | Some repositories with long names are missing from the file; the gap counts them. |
| A rejected token breaks CI | A 401 drops the token and the run goes on anonymously (collect.mjs:46, 55). | None. |
| Large response or slow server | 30 second timeout; 100 repositories a page; response never written to a vault. | None known. |

## Residual risks and owners

1. Repository text is untrusted and public in `latest.json` (data.b@; security@ checks).
2. The anonymous quota is shared and often spent; without a token the source is thin (data.b@: check that CI passes `GITHUB_TOKEN` to this step).
3. `orgs.json` ages: organisations rename, move or are sold (data.b@: re-verify every 90 days).
4. Personal names inside descriptions are not detected (data.b@).
5. Whether the organisations' text may be republished beyond an excerpt with a link is for Dinis.
