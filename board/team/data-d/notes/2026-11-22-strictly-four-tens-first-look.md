# Strictly: first look at the Four Tens data (22 Nov 2026, about 15:45 UTC)

data.d@PrompTugal.dinis. A first look, not the full audit. Source: https://github.com/four-tens/strictly-come-dancing-results, shallow clone at commit 80e85ae (2018-08-22), read as data in a scratch folder; its validate.py was not run.

- Licence: LICENCE.md is the CC0 1.0 Universal text, as the brief said.
- Size: results.csv 1,734 performances; celebrities.csv 222 (name, occupation, age); professionals.csv 51 (name).
- Coverage: series 1 to 15 only (2004 to 2017). The last commit is August 2018, so series 16 onwards is missing and needs another source (Wikipedia's series articles are the obvious one).
- Totals: the judges' scores add up to the published total in all 1,734 rows.
- A judge who did not sit is written as 0, not left blank. Real scores start at 1, so 0 can be read as "not on the panel", but the brief's rule (keep missing apart from zero) means converting these to explicit nulls.
- 169 couple-weeks have more than one dance.
- Not in the data: weekly results, eliminations, final placements, broadcast dates. These need Wikipedia (results) and TVmaze (dates).
- Rows to check against another source: Len Goodman scores 2 performances in series 15 (he left after series 14; Shirley Ballas scores all 142); Darcey Bussell scores 22 performances in series 7 (she joined as a regular in series 10); guest judges appear as Jennifer Grey (series 9, 10 rows) and Donny Osmond (series 12, 14 rows).

Reading: a good, open base for series 1 to 15, with known gaps and a handful of rows to check. It supports building the Wikipedia service first: Wikipedia is needed both for series 16 onwards and to check these rows.
