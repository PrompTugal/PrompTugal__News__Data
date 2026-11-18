# Threat model: tfl-jamcams (TfL's traffic cameras in London)

Owner: data.b@PrompTugal.dinis. Reviewer: security@PrompTugal.dinis. Written 18 November 2026 from the code at that date (WS-177). Not yet reviewed.

- Reads one address an hour: `https://api.tfl.gov.uk/Place/Type/JamCam` (no key). The answer goes to the vault copy, not the site.
- Keeps per camera: TfL's id (checked against `JamCams_NNNNN.NNNNN`), name and view (plain text, shortened; dropped with an em dash), lat and lon (numbers), TfL's `available` flag, and the image and clip addresses, kept only when https, on `s3-eu-west-1.amazonaws.com` under `/jamcams.tfl.gov.uk/`, with the right extension and no query. That host is shared by every AWS customer, so the path prefix is part of the check and is published with it.
- Never fetches, stores or analyses an image or clip. No face or plate recognition. Embedding is off (`embed.allowed: false`) until TfL's transport data terms are read: tfl.gov.uk answers us with a bot check, not worked around.
- Credit: "Powered by TfL Open Data".
- Risk: TfL changes its bucket or address shape; the check then drops the address (null), and the camera stays listed with no media.
