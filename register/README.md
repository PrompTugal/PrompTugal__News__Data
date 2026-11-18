# The sources register

Every source PrompTugal knows of, read or not, at Dinis's word (18 November 2026, about 14:10 UTC; PrompTugal__News__Website `board/guidance/2026-11-18-sources-we-do-not-access.md`, plan `board/briefs/2026-11-18-sources-register.md`). Kept by data.b@PrompTugal.dinis.

- `sources.json`: the entries kept by hand (sources we do not read, and read ones that have no collector here). One entry: `id`, `name`, `kind`, `url`, `owner`, `places`, `gives`, `status` (`read` | `not-read` | `asked` | `allowed` | `refused` | `no-answer`), `why` (the terms clause or robots line, quoted, with its page and the date read; for every status but `read`), `how` (the interface, for `read`), `asked` (date, the organisation's own public channel, the answer quoted with its date), `contact_channel` (the organisation's own published page, never a person's contact), `notes`.
- The sources with a collector here are added by the build from their cards (`sources/<id>/card.json`), status `read`.
- Served at `/api/v1/sources/index.json` and `/api/v1/sources/<id>.json`; pages `/sources/` and `/sources/not-read/`.
- We respect whatever a source says. A request on the record is drafted by outreach@ and sent by a person; the answer goes here as written.
