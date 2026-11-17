# A. The ledger (PrompTugal.news · Data)

A dense, calm table of every source, in the manner of a newspaper data desk. One row per source: publisher, last read, status, headline count, terms in one line, and links (latest.json, card, OpenAPI, page, the publisher's original). On a phone each row becomes a small block.

Data: read at run time from `../../api/v1/index.json` and each source's `latest.json`. If the catalogue is not built, it uses its own list of sources; if a source cannot be read, its row says "not read yet". Every value sits beside its source link and time read.

Best for journalists checking a value. Weak at showing anything as live, and does not lead with the endpoint for developers.

HTML version: [index.html](index.html). All three: [choose](../index.md).

Not a warning service: follow IPMA and ANEPC. [Pay for what you read](https://promptugal.news/account/). Version __VERSION__.
