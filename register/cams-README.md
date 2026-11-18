# Public cameras register (second pass)

Made by data.b.collector@PrompTugal.dinis for data.b. Pass one 2026-11-18 (time of day not recorded); pass two read 2026-11-18T19:05Z.

## Rules from Dinis (18 Nov 2026, about 19:00 UTC)

Source: `PrompTugal__News__Website` board/guidance/2026-11-18-cameras-provenance-and-bulletins.md (named in the brief; not read by this agent).

- Official cameras only. Use the operator's own embed (an iframe from the operator's host) or a link. Never record.
- MEO BeachCam is included through its official cameras, with MEO's terms on the register.
- Windy's webcams API is allowed under its terms, attributed. No key is held and the API was not called.

## Method

HTML and search results only. No stream, frame or snapshot was fetched. `beachcam.meo.pt` refused fetches in pass one (403) and was not fetched again: no other user agent, cache or mirror. The MEO camera and terms pages were found through search, and only their URLs and search snippets are recorded. No MEO page was read in full.

## Counts (22 cameras)

By place: lisboa 2, faro 3, castro-marim 2, portimao 6, lagoa 1, silves 1, albufeira 2, loule 1, lagos 1, aljezur 1, vila-do-bispo 2. Places with none: alcoutim, monchique, olhao, sao-bras-de-alportel, tavira, vila-real-de-santo-antonio.

By operator kind: private business, own public page 19 (MEO BeachCam); port 2 (APL Tejo Live); public agency 1 (school group, Portimão).

## embed_allowed

None is true. MEO: the terms were not read in full, so the basis is a search snippet. It says site content including the livecam streams may not be used outside the site's permitted conditions without Beachcam's consent. The camera pages add that reproduction, redistribution or retransmission needs prior authorisation. No MEO embed offer, and no câmara page embedding a MEO iframe, was found, so `embed_seen_at` is null everywhere. Every MEO camera is a link only until MEO gives consent or an embed offer. The three first-pass cameras have no embed offer either.

## MEO BeachCam

- Terms page (found by search, not read): https://beachcam.meo.pt/termos-e-condicoes/ . Privacy page: https://beachcam.meo.pt/politica-de-privacidade/ . The privacy snippet names Wavenation, Conteúdos e Media Lda. as the site operator, and the App Store lists Wavenation, so the legal operator may not be MEO itself. Dinis should confirm the operator name to show. Some cameras are owned or paid for by others (Faro, Castro Marim, Clube de Surf de Faro). Some features need a paid Beachcam+ subscription.
- Flagged cameras: Praia do Alemão (camera page URL not seen, livecams index given) and Meia Praia, Lagos (only a beach page URL seen). Status of all 19 is unknown; some search snapshots are old.
- Contact for consent: the App Store page gives a Beachcam contact; Dinis to decide who asks. This agent contacted nobody.

## Windy webcams API (for Dinis; nothing signed up, API not called)

- Needs an API key from api.windy.com (Keys page), sent in the header `x-windy-api-key`. How the key is obtained and its price (pricing page) were not read.
- Docs say image URLs carry tokens that expire after 10 minutes on the free tier and 24 hours on the professional tier; an expired URL returns 401, so call the API each time a page loads.
- Terms (https://api.windy.com/webcams/terms): "Link every image with us" (each image links to the webcam page, from `webcam.urls`); "Mention us" with a credit such as "Webcams provided by Windy.com"; use data as is; Windy "may terminate the API at any time for any reason". The terms do not address caching or commercial use, and say nothing clear on embedding beyond pointing to the API. These need checking with Windy before a register stores Windy records.

## Other bodies

Municipal home pages read (no camera link): Lagos, Vila Real de Santo António, Silves, Lagoa, Aljezur, Albufeira, Castro Marim, Loulé (beaches page), Monchique, Alcoutim, São Brás de Alportel. APA (COSMO is a survey programme), IPMA, ICNF, Docapesca, ANA, Infraestruturas de Portugal: no public camera found in search. See `not_listed` and `gaps` in cams.json.

## Doubtful

- MEO operator name (MEO or Wavenation) and the status of every MEO camera.
- Municipality for Praia do Vau, Alvor and Vilamoura and Cordoama is inferred from the beach.
- Faro Este belongs to the Clube de Surf de Faro.
- Portimão school stream is inferred from page text; the Tejo Live cameras stand in Almada and Oeiras but show Lisboa.
- Vila do Bispo's site was not reached (host did not resolve; the address tried may be wrong).
