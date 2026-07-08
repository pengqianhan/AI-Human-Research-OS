#!/usr/bin/env bash
#
# verify.sh — read-only consistency check for this Research OS.
#
# Agent-neutral: Claude Code, Codex, or a human all run the same command.
# It REPORTS drift; it never fixes anything and never edits files. A non-zero
# exit means the working tree is inconsistent and needs a fix before commit.
#
# Run before finishing a change that touches paper-wiki/, an installed skill,
# or an indexed doc:  ./verify.sh
#
# This is repo-local glue, not part of any skill. The skills it calls
# (paper-wiki-manager's validator, filetree-simple's lint) are independently
# usable on their own; only this OS repo needs the three-copy check below.

set -u
cd "$(dirname "$0")"

PYTHON="$(command -v python3 || command -v python)"
if [ -z "$PYTHON" ]; then
  echo "verify: no python3/python on PATH" >&2
  exit 2
fi

# Canonical (hub) copy of the hub-sourced skill; agent-neutral.
PWM_HUB="Research-skills-hub/open-paper-skills/paper-wiki-manager"
# filetree-simple is an orphan skill (installed-only, no hub copy), so its
# script is referenced from an installed copy. The 3-copy check does not apply
# to it — it is intentionally not synced to the hub.
FILETREE=".claude/skills/filetree-simple/scripts/filetree.py"

fail=0
check() {
  local name="$1"; shift
  local out rc
  out="$("$@" 2>&1)"; rc=$?
  if [ "$rc" -eq 0 ]; then
    printf '  OK    %s\n' "$name"
  else
    printf '  FAIL  %s\n' "$name"
    printf '%s\n' "$out" | sed 's/^/          /'
    fail=1
  fi
}

echo "verify: read-only consistency check"

# 1. Paper-wiki bundle: frontmatter, links, bidirectional paper<->topic/concept,
#    required indexes, and viz.html graph freshness (catches a forgotten
#    generate_viz.py run).
check "paper-wiki validation" \
  "$PYTHON" "$PWM_HUB/scripts/validate_paper_wiki.py" paper-wiki

# 2. FILETREE.md drift.
check "FILETREE lint" \
  "$PYTHON" "$FILETREE" lint

# 3. Three-copy skill consistency (D7): hub is canonical, both installs match.
check "skill sync: hub == .claude" \
  diff -rq "$PWM_HUB" .claude/skills/paper-wiki-manager
check "skill sync: hub == .agents" \
  diff -rq "$PWM_HUB" .agents/skills/paper-wiki-manager

if [ "$fail" -eq 0 ]; then
  echo "verify: all checks passed"
else
  echo "verify: FAILED — fix the items above (this script does not auto-fix)"
fi
exit "$fail"
