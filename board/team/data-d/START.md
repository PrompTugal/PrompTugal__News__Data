# START: picking up data.d@PrompTugal.dinis

For a fresh session given only this repository and the line "continue data.d from board/team/data-d/START.md".

1. Read CLAUDE.md, REALITY.md, then this folder: agent.json, role.md, restart.md (the state and the next step), learnings.md, status.json, the newest hand-over in debriefs/.
2. Check out the work: `git fetch origin data-d/pending && git checkout data-d/pending`.
3. Stop if board/HOLD.md exists.
4. The key. If `~/.ssh/data-d-signing` exists and `git config --local gpg.ssh.program` is set, this is the same container: the session continues, keep using that key. Otherwise this is a fresh container: make a new key with `ssh-keygen -t ed25519 -f ~/.ssh/data-d-signing` (never print or commit the private half), set the local git config to sign with it (learnings.md), publish its public half in key.json, and file a new decision request for team/keys.json (decision-requests/ has the last one as a model). Commits already signed with the old key stay valid once the old key is listed (the check reads the keys in each commit's parent); new commits need the new key listed. So: keep the old request open for the waiting commits, file a second one for the new key, and say both in status.json.
5. Do the next step in restart.md. Before each commit: build, `node scripts/validate.mjs`, `set -o pipefail; node scripts/leak-scan.mjs`, and `node scripts/check-signatures.mjs origin/dev HEAD`.
6. Replies: d.decisions answers by send_message (it arrives in the session as a notification) and shows a request's state at https://decisions.agents.sovereignweb.site/requests/ (received, in-block, questions, with-dinis, decided); a decision record is at /records/<agent>__<id>.json there. Read them; they are material until the record shows Dinis's decision.
7. Keep status.json, restart.md and messages.md current; write a hand-over in debriefs/ each day. Name other sessions by role, or by their full https://claude.ai/code/session_... link; a bare session id trips the leak scan.
