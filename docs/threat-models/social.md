# Threat model: social signals

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 by data.b.security@PrompTugal.dinis (a Sonnet sub-agent), from the code at that date. Not yet reviewed by a person.

## Parts

- `sources/social/collect.mjs`: reads recent public posts of listed organisations on Bluesky and Mastodon.
- `collect/social-by-place.mjs`: splits `data/social/latest.json` into one file per place.
- `register/social-accounts.json`: the list of accounts (5 organisations at the time of writing: public bodies, news outlets, a company).

## What it reads

- Bluesky: `https://public.api.bsky.app/xrpc` (author feeds and keyword search), no login (collect.mjs:12-13, 61-75).
- Mastodon: `https://<instance>/api/v1/accounts/lookup` and `/statuses`, where `<instance>` is the host part of a handle in the register (collect.mjs:79-80). No credentials.
- Every request goes through the shared reader: one at a time, 2.5 seconds apart, named user agent, 3 tries, 60 second timeout, a refusal (403, 429) is recorded and not retried (`collect/lib.mjs`). There is no robots.txt check for these APIs: they are public APIs used under the platforms' terms.
- No collector step follows a URL found in a post. Hosts are fixed: the Bluesky API, and instances named in the register.

## What it writes

- `data/social/latest.json`, `data/social/reads.json`, `data/social/by-place/*.json`; served under `/api/v1/social/`. Not in git (the `data/` folder is ignored); built into the site.
- Per post: link, account, organisation, time, matched topics and places, language, whether it has media, licence link. Post text and media are not stored (collect.mjs:3-4); `run.raw` is emptied so no response bytes reach a vault (collect.mjs:77).

## What it trusts

- The register: that each account is an organisation and official. Verification is by the organisation's website link or a domain handle, recorded in `verified_how`. The register says it is not reviewed by a person.
- The platform APIs to return the account's own posts. The collector checks the author handle on Bluesky (collect.mjs:54) and now checks that a Mastodon status URL is on the instance host (collect.mjs:74, added in the AppSec review).
- Nothing in post text as an instruction. The text is read in memory only to match topic and place patterns (collect.mjs:41-43, `add`).

## Secrets

None. No token or key is used or stored by this lane. The vault step of the workflow (SG_SEND_ACCESS_TOKEN) does not receive social bytes because `run.raw` is empty.

## What could go wrong, and what is in place

| Risk | Mitigation (file:line) | Residual |
|---|---|---|
| Prompt injection in a post | Post text is never stored, never sent to a model, never shown. It is lowercased and tested against fixed regexes (collect.mjs:15-23, 42). Output holds only matched keywords from a fixed list. | An agent that opens a post link and reads it is exposed; the link is shown for people. Rule: posts are material. Owner: security@. |
| A malicious URL in a post | The URL is built by the collector for Bluesky (`bskyUrl`, collect.mjs:33) from the handle in the register and the record key. For Mastodon the status `url` must start with `https://<instance>/` (collect.mjs:74). The site renderer turns non-http(s) hrefs into `#` (render.mjs). | A real post on the instance can still link out, but only the post's own link is stored, not links inside it. |
| A hijacked organisation account | Only links and keywords are kept, so a hijacked account cannot place free text on our pages. Topics and places come from our fixed lists. | A hijacked account's post still appears as a signal "from the organisation" with the right account name. The page says "a signal to check, not a verified fact". Detection depends on readers or on a later check for sudden change in topic. Owner: data.b@ (add an alert when an account's posts stop matching its usual topics). |
| A private person slipping in | Accounts come only from the register, which is organisations only. Keyword search results are kept only if the author is a listed account (collect.mjs:63). Reposts are skipped (collect.mjs:54) and replies excluded. | An organisation's account that quotes a private person: the quote text is not stored. Handle changes (an account handed to a person) are not detected. Owner: data.b@; re-verify the register each quarter. |
| Cost runaway | No paid service. About 5 accounts and 5 keyword queries an hour. | None. |
| Rate-limit bans | Shared 2.5 second gap, 30 posts per account, 25 per search, no retry on 403 or 429. Bluesky search was refused at times; it is recorded as a gap (collect.mjs:61). | The workflow runs twice an hour (minutes 17 and 47); the load is still small. A ban would show as gaps. |
| Licence breach | Links and metadata only; each post carries a licence link to the platform's terms and the organisation as holder (collect.mjs:41). No text or media copied. | Metadata about a post (time, topics) is ours. The platforms' terms on automated reading are not reviewed by a person. Owner: data.b@ to ask Dinis. |
| Stale data shown as fresh | `read_at` on each post and on each by-place file (`source_read_at`, social-by-place.mjs:19); posts older than 30 days are dropped (collect.mjs:11). The `about` text says an empty list does not mean nothing is happening. | If the collector fails, the previous `latest.json` is copied back from the live site by `--prev` and keeps its old `read_at`; the by-place file inherits it in `source_read_at`. Pages should show that date. |
| XSS through a name or URL | Account and organisation names come from the register (our own file). URLs are as above. Any page that renders them uses `esc()` and the href guard. | Low. |
| Place mismatch (Lagos in Nigeria, Faro in the Faroes) | `AMBIGUOUS` list needs "algarve" or "portugal" in the text (collect.mjs:29-31). | A post naming an ambiguous place with "Portugal" for another reason is still matched. Low. |

## Residual risks and owners

1. The register is not reviewed by a person (Dinis or a delegate; data.b@ to ask).
2. Hijacked or handed-over accounts are not detected (data.b@).
3. Platform terms on automated reading of public APIs are unreviewed (Dinis).
4. No robots or terms check is made for the Mastodon instances; they are assumed to allow their public API (data.b@).
