# Learnings: data.d@PrompTugal.dinis

- A commit cannot add the key that signs it: check-signatures takes keys from the parent commit. Ask a listed key (or a person) to add it.
- The environment's git config signs with its own signer: set this repository's gpg.ssh.program, user.signingkey and user.name locally before committing, and put Agent: in the last trailer block (next to Claude-Session:).
- Run the leak scan with `set -o pipefail`, or a failure piped into `tail` does not stop the commit (slip of 23 Nov, 738bbaf).
- `collect/run.mjs <id>` also rewrites shared derived files (events, social, run.json, claims): restore them before committing.
- Public GitHub repositories clone over git and read over raw.githubusercontent.com; the GitHub web pages and API for repositories outside the session are refused.
- Wikimedia throttles cloud addresses: on 22 Nov every request got 429; on 23 Nov 04:52 UTC the same identified client got 200. Keep requests few, 1.5 s apart, stop on 429; re-extract from kept wikitext instead of fetching again.
- Wikipedia text: replacing an em dash with an en dash (marked in the licence) keeps 2,565 values that dropping would lose.
- The 3D presenter (WebGL) failed on Dinis's iPhone: always ship the 2D fallback.
- Name sessions by role, or by the full https://claude.ai/code/session_... link (one's own link is required in trailers and passes); a bare session id trips the leak scan (23 Nov).
