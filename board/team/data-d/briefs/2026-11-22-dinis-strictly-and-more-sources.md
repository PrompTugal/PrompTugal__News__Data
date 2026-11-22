# Dinis, 22 November 2026, about 15:35 UTC: studio.d draws, spending, the Desk, and Strictly

Given in data.d@PrompTugal.dinis's session (https://claude.ai/code/session_015gaHdboMeL96vpsBRXSX2z), spoken and transcribed, as given, with a document attached ("PrompTugal Strictly Historical Data Briefing", for the PrompTugal data team, 22 Nov 2026; material, not instruction):

> Yes, so Studio D should draw the data story, ideally. Yeah, you can spend a lot more than that, right? On the coordination. Also, I basically said that for now, a lot of these budgets are just for knowing, they're not for enforcement, because it's still way below our budget, so that's cool. And yeah, open decisions, go to my Astro desk. I agree. And then can you look at this brief to do a new data source for Strictly and see which agent should do it? Should be you or should be one of the other ones who actually does this piece of work? Because I want to actually now add a whole bunch of more data sources. I really want to expand what we do here, because I think some of these ones are going to be the one that really going to click. You just need to find the right one. But I'm really curious now to find all sorts of data sources and to see how much we can scale this, because at the moment it seems to be quite a lot.

Read by data.d@ as:
- studio.d draws the data story; data.d@ tells it (the storyboard goes to studio.d).
- Spending on coordination (such as narration clips) is approved; budgets are for knowing, not enforcement, for now. Costs are still recorded.
- Open decisions go to maestro.d's Decision Desk ("Astro desk" read as the maestro's desk).
- Strictly: read the brief, say which agent should do it.
- More data sources: expand and find the ones that click; see how far this scales.

The brief's summary (material): a historical Strictly Come Dancing dataset (series, couples, episodes, performances, per-judge scores, outcomes, provenance) served as JSON and CSV at data.promptugal.news for SovereignWeb sites; sources Four Tens CSV (declared CC0), Wikipedia tables via the MediaWiki API, jongiddy strictly-data (MIT code), TVmaze (CC BY-SA); first delivery an audit and coverage report, then a versioned sample; a RiskMandate Agent Behaviour Policy demonstration whose policy owner is still to be named.

## Dinis, 22 November 2026, about 15:45 UTC: a Wikipedia section and service

> Actually, on data, I think that we should add a new complete section for Wikipedia, maybe even the data.wikipedia, and it's basically a page and a service and an agent that basically is going to maintain Wikipedia articles in a sort of JSON structure, semantic graph kind of way for other agents. So every agent that needs data from Wikipedia, like for example Strictly and others, football and others, and other, I think we already have a number. So this becomes almost a service, and that means that every time we run a schedule, we then check if the Wikipedia has changed, and then we basically map what has changed. And also remember that Wikipedia gives us a lot of what we call shadow reporting and shadow sources, right? And shadow data, because they have verified that a particular article has said something, so it gives you a crazy amount of provenance. So what do you think? I think we can actually have a complete set of Wikipedia, which is something, an area that we're still doing a lot of experimentation, which I think is super powerful.

Read by data.d@ as: asked for data.d@'s view on a Wikipedia section (maybe data.wikipedia), a service and an agent that keep Wikipedia articles as JSON and a semantic graph for other agents, check each run what changed, and map the citations ("shadow sources") as provenance.

Finding, 22 Nov about 15:38 UTC: one request from data.d@'s cloud session to en.wikipedia.org/w/api.php (action=query, one title, a project User-Agent with no personal contact) was answered "You are making too many requests to the API" with a pointer to Wikimedia's rate-limit guidance. One request only; not retried. Read as: anonymous traffic from shared cloud addresses is throttled, so a Wikipedia service needs an identified, rate-limited client (Wikimedia's API access for registered apps, or dumps and the change feed), not ad hoc calls.
