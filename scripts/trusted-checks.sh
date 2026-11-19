#!/usr/bin/env bash
# Writes the trusted copies of the security checks and their config into <outdir> and prints the trusted commit, for
# control 7 (security@, 19 Nov 2026: 14:02, 14:05 and 14:11 UTC rulings, PrompTugal__News__Website
# board/team/security/reviews/2026-11-19-0130-bar-signing-live-data.md). Usage: scripts/trusted-checks.sh <before> <after> <outdir>
# The trusted commit is the last release tag that is an ancestor of <before> (a run GitHub dropped leaves <before> unchecked:
# specialist.code@'s finding 3b), else <before> itself. It fails, never falling back to the pushed tree or the trusted base's
# copy, when <before> is missing or a zero id, when <before> is not an ancestor of <after> (a force push), when the checkout
# is shallow, or when the trusted commit has no copy of a check. Tests: scripts/test-check-signatures.mjs. data.b@PrompTugal.dinis.
set -euo pipefail
before="${1:-}"; after="${2:-}"; out="${3:-}"
fail() { echo "trusted-checks: $*" >&2; exit 1; }
[ -n "$out" ] || fail "usage: trusted-checks.sh <before> <after> <outdir>"
[ "$(git rev-parse --is-shallow-repository)" = false ] || fail "a shallow checkout; fetch the whole history"
case "$before" in ''|*[!0]*) ;; *) fail "no commit before the push (a zero id: a new branch)";; esac
[ -n "$before" ] || fail "no commit before the push"
git rev-parse --verify --quiet "$before^{commit}" >/dev/null || fail "the commit before the push ($before) is not in this checkout"
git rev-parse --verify --quiet "$after^{commit}" >/dev/null || fail "the pushed commit ($after) is not in this checkout"
git merge-base --is-ancestor "$before" "$after" || fail "the commit before the push is not an ancestor of the pushed one (a force push)"
# a release tag counts only when it points to an ancestor of <before> (describe from <before> finds only those)
trusted=$(git describe --tags --abbrev=0 --match "v${VERSION_BASE:-0.1}.*" "$before" 2>/dev/null || true)
trusted=$(git rev-parse "${trusted:-$before}^{commit}")
mkdir -p "$out"
for f in check-commits.mjs check-signatures.mjs leak-scan.mjs; do
  git cat-file -e "$trusted:scripts/$f" 2>/dev/null || fail "the trusted commit ${trusted:0:8} has no copy of scripts/$f"
  git show "$trusted:scripts/$f" > "$out/$f"
done
rm -f "$out/commit-exemptions.json"
if git cat-file -e "$trusted:scripts/commit-exemptions.json" 2>/dev/null; then git show "$trusted:scripts/commit-exemptions.json" > "$out/commit-exemptions.json"; fi
echo "$trusted"
