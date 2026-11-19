#!/usr/bin/env bash
# Writes the trusted copies of the security checks and their config into <outdir> and prints the anchor, for control 7
# (security@'s rulings of 19 Nov 2026, last the fourth at ~14:17 UTC, PrompTugal__News__Website
# board/team/security/reviews/2026-11-19-0130-bar-signing-live-data.md). Usage: scripts/trusted-checks.sh <anchor> <after> <outdir>
# The anchor is the newest commit a passing run verified, from a record a pusher cannot write: in CI the commit of the last
# successful github-pages deployment (GitHub's deployments API); in release.sh the commit /version.json serves, which only
# that deployment writes. Tags are not used. The caller checks the range <anchor>..<after>, so commits from a dropped run are
# covered. It fails, never falling back to the pushed tree or the trusted base's copy, when the anchor is missing or a zero
# id, when it is not an ancestor of <after>, when the checkout is shallow, or when the anchor has no copy of a check.
# Tests: scripts/test-check-signatures.mjs. data.b@PrompTugal.dinis.
set -euo pipefail
anchor="${1:-}"; after="${2:-}"; out="${3:-}"
fail() { echo "trusted-checks: $*" >&2; exit 1; }
[ -n "$out" ] || fail "usage: trusted-checks.sh <anchor> <after> <outdir>"
[ "$(git rev-parse --is-shallow-repository)" = false ] || fail "a shallow checkout; fetch the whole history"
[ -n "$anchor" ] || fail "no anchor (no verified deployment found)"
case "$anchor" in *[!0]*) ;; *) fail "the anchor is a zero id";; esac
git rev-parse --verify --quiet "$anchor^{commit}" >/dev/null || fail "the anchor ($anchor) is not in this checkout"
git rev-parse --verify --quiet "$after^{commit}" >/dev/null || fail "the pushed commit ($after) is not in this checkout"
git merge-base --is-ancestor "$anchor" "$after" || fail "the anchor is not an ancestor of the pushed commit (a force push)"
anchor=$(git rev-parse "$anchor^{commit}")
mkdir -p "$out"
for f in check-commits.mjs check-signatures.mjs leak-scan.mjs; do
  git cat-file -e "$anchor:scripts/$f" 2>/dev/null || fail "the anchor ${anchor:0:8} has no copy of scripts/$f"
  git show "$anchor:scripts/$f" > "$out/$f"
done
rm -f "$out/commit-exemptions.json"
if git cat-file -e "$anchor:scripts/commit-exemptions.json" 2>/dev/null; then git show "$anchor:scripts/commit-exemptions.json" > "$out/commit-exemptions.json"; fi
echo "$anchor"
