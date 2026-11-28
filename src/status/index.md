# Feed status

Every feed on data.promptugal.news with the time it was last read and whether it is fresh, and whether each PrompTugal site answers. The HTML page reads the public API live in your browser; this twin points at the same files.

- Catalogue: https://data.promptugal.news/api/v1/index.json (every source has `read_at`, `cadence` and `status`).
- A feed is fresh when its last read is no older than its expected gap plus two hours. The collectors run twice a day (07:03 and 18:03 Lisbon), so an hourly or six-hourly feed is expected every 12 hours and a daily one every 24.
- "Source problem" means the source refused or failed at the last read. A refusal is respected and recorded as a gap, not retried within the cadence. The reason is on each feed's card under /sources/.
- Each site's own `/version.json` shows whether it answers: weather, civic, startups, travel, events, signals, cyber, library, live, videos, bulletins and storm-charles at promptugal.news.

## Feedback

Open an issue titled "Feedback: /status/" at https://github.com/PrompTugal/PrompTugal__News__Data/issues/new . The data agent reads issues at each wake and cannot reply on GitHub; answers appear in the changelog on the HTML page. Issues are public: write nothing private.

---

Version __VERSION__ · Code Apache-2.0; our pages CC BY 4.0; each source's data under its own licence or terms. [Repository](https://github.com/PrompTugal/PrompTugal__News__Data)
