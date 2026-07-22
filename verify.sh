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
# usable on their own; only this OS repo needs the install-integrity check below.

set -u
cd "$(dirname "$0")"

if ! command -v uv >/dev/null 2>&1; then
  echo "verify: uv is required (https://docs.astral.sh/uv/)" >&2
  exit 2
fi

PYTHON_VERSION_FILE=".python-version"
if [ ! -f "$PYTHON_VERSION_FILE" ]; then
  echo "verify: missing $PYTHON_VERSION_FILE" >&2
  exit 2
fi
IFS= read -r PYTHON_VERSION < "$PYTHON_VERSION_FILE"
if [ -z "$PYTHON_VERSION" ]; then
  echo "verify: $PYTHON_VERSION_FILE must name a Python version" >&2
  exit 2
fi

# Use the repository-pinned interpreter on every machine. --no-project keeps
# this read-only check from creating or syncing a repository-local .venv.
PYTHON=(uv run --no-project --python "$PYTHON_VERSION" -- python)

# Canonical (hub) copy of the hub-sourced skill; agent-neutral.
PWM_HUB="research-skills-hub/open-paper-skills/paper-wiki-manager"
FILETREE_HUB="research-skills-hub/open-paper-skills/filetree-simple"
FILETREE="$FILETREE_HUB/scripts/filetree.py"

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
  "${PYTHON[@]}" "$PWM_HUB/scripts/validate_paper_wiki.py" paper-wiki

# 2. FILETREE.md drift.
check "FILETREE lint" \
  "${PYTHON[@]}" "$FILETREE" lint

# 3. Installed-skill integrity (ADR 0002). The hub is canonical. Every install
#    is either a symlink back to it or a copy, and which one is not a free
#    choice: a collection whose SOURCE.md declares `Install form: copy` (an
#    auto-refreshed read-only mirror) must be copied, everything else linked.
#    A plain `diff -rq` cannot be used against a symlinked install — it follows
#    the link and compares the hub with itself, so it passes unconditionally.
verify_installs() {
  local rc=0 target entry name src coll form
  # `.disabled/` holds installs that are turned off. They are still installs,
  # so they are checked too — the glob would otherwise skip the dot-directory
  # and let a disabled install drift or dangle unnoticed.
  for target in .claude/skills .agents/skills .claude/skills/.disabled .agents/skills/.disabled; do
    [ -d "$target" ] || continue
    for path in "$target"/*; do
      [ -e "$path" ] || [ -L "$path" ] || continue
      entry="$(basename "$path")"
      name="$entry"
      # Dangling links are checked first and unconditionally: when the hub
      # source disappears the name lookup below finds nothing, so deferring
      # this would let the exact failure ADR 0002 warns about pass silently.
      if [ -L "$path" ] && [ ! -e "$path" ]; then
        echo "$path is a dangling symlink (target $(readlink "$path") is missing)"; rc=1; continue
      fi
      src="$(find research-skills-hub -maxdepth 3 -type d -name "$name" | head -1)"
      if [ -z "$src" ]; then
        continue  # orphan install with no hub source; tracked in HANDOFF, not an error
      fi
      coll="$(printf '%s' "$src" | cut -d/ -f2)"
      form=copy
      grep -q 'Install form.*`copy`' "research-skills-hub/$coll/SOURCE.md" 2>/dev/null || form=symlink

      if [ -L "$path" ]; then
        [ "$form" = symlink ] || { echo "$path is a symlink but $coll declares Install form: copy"; rc=1; continue; }
        [ "$(cd "$(dirname "$path")" && cd "$(readlink "$entry")" && pwd)" = "$(cd "$src" && pwd)" ] \
          || { echo "$path resolves outside its hub source $src"; rc=1; }
      else
        [ "$form" = copy ] || { echo "$path is a copy but $coll should be symlinked"; rc=1; continue; }
        diff -rq "$src" "$path" >/dev/null 2>&1 || { echo "$path has drifted from $src"; rc=1; }
      fi
    done
  done
  return "$rc"
}
check "installed skills: link/copy form and integrity" verify_installs

if [ "$fail" -eq 0 ]; then
  echo "verify: all checks passed"
else
  echo "verify: FAILED — fix the items above (this script does not auto-fix)"
fi
exit "$fail"
