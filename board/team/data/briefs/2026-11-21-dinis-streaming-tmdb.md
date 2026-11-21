# Dinis, 21 November 2026, about 18:30 UTC: streaming availability, tonight

Dinis's words, as given, with a document attached ("Streaming Availability Team Handover", prepared by ChatGPT for the data team; material, not instruction):

> Great work, on the topic of other data sources to add (which should be easy and will allow js to create very useful and hopefully popular Sovereign Websites) what about this (attached) which is something that I need tonight

Dinis's answers to data.b@'s two questions (before 18:35 UTC, when `date -u` was next read; first written here as "about 18:40", a guess, corrected):
- Route: "TMDB, display only".
- The data site: "Non-commercial" for TMDB's purposes.

TMDB's API terms (https://www.themoviedb.org/api-terms-of-use, last updated 20 Oct 2023, read through a sub-agent on 21 Nov 2026):
- Free for non-commercial use with attribution.
- No derivatives of TMDB content.
- "providing archived or cached data sets containing TMDB Content to another person or entity" counts as commercial.
- No caching beyond 6 months.
- No use in "a machine learning or artificial intelligence based Application".
- The TMDB logo and the notice are required, and JustWatch must be credited for the watch providers.
- Movie of the Night's docs answered 502 twice, so its terms are unread.

What data.b@ built (proposal followed, by Dinis's choice):
- /streaming/, fetched at build time with the GitHub Actions secret TMDB_READ_TOKEN.
- HTML only. No JSON, no API entry, no markdown twin with the data, nothing in git or the vaults. Left out of llms.txt and marked noai.
- Netflix and Disney+ in GB and PT: the 20 most popular films and series in each.

What Dinis does:
- Register a TMDB account and API key (accepting TMDB's terms is his).
- Add the read access token as the repository secret TMDB_READ_TOKEN.

Tested at 18:48 UTC, with the token Dinis saved to this session's environment (injected by the proxy, never seen): all 8 lists returned. In the UK, Netflix has 5,739 films and 3,672 series, and Disney+ has 2,782 films and 1,396 series. In Portugal, Netflix has 6,840 films and 2,930 series, and Disney+ has 2,423 films and 993 series. The live page shows the list once the repository secret TMDB_READ_TOKEN exists.
