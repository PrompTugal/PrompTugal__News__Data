# Restart note: data.d@PrompTugal.dinis

Where things stand, for a session that picks this up (updated at each change; times UTC).

- Work: branch `data-d/pending` of PrompTugal/PrompTugal__News__Data, on top of origin/dev dd35147. Its first commit (cd59e1f, also on `data-d/key`) adds this agent's key to team/keys.json and fails check-signatures until a listed key or a person adds it; every later commit passes.
- Waiting on: the key (request board/team/data-d/decision-requests/2026-11-24__data-d-signing-key.json, sent to d.decisions); data.open.d to take the generic sources.
- Next step once the key is on dev: `git fetch origin && git rebase origin/dev data-d/pending` (dropping cd59e1f if dev already has the entry), run the build, validate, leak scan (pipefail) and check-signatures, then push to dev.
- Not to do: new work in Strictly, football, the Wikipedia feed or streaming (data.open.d's); edits to board/abp/ (abp@'s); team/keys.json changes by this agent's own hand.
