#!/usr/bin/env bash
#
# verify.sh — consistency check for the SuperResearch OS source (product edition).
#
# Agent-neutral: Claude Code, Codex, or a human all run the same command.
# It REPORTS drift and never fixes anything. The one file it writes is the
# generator's snapshot, os-ui/frontend/public/state.json, which is ignored.
# A non-zero exit is 1 for failed checks or 2 when the runtime prevents
# complete checking.
#
# Until step 3's PR 9 the repository root is also a transitional workspace
# (AGENTS.md; os-build/import.md): its stub paper wiki, the example project,
# its five skill links, and the generator are checked here as a workspace's
# are. PR 9 replaces those checks with workspaces built by new_workspace.py.

set -u
cd "$(dirname "$0")"

PYTHON_VERSION_FILE=".python-version"
PYTHON_VERSION=""
runtime_problem=""
if ! command -v uv >/dev/null 2>&1; then
  runtime_problem="uv is required (https://docs.astral.sh/uv/)"
elif [ ! -f "$PYTHON_VERSION_FILE" ]; then
  runtime_problem="missing $PYTHON_VERSION_FILE"
else
  IFS= read -r PYTHON_VERSION < "$PYTHON_VERSION_FILE"
  if [ -z "$PYTHON_VERSION" ]; then
    runtime_problem="$PYTHON_VERSION_FILE must name a Python version"
  fi
fi

# Use the pinned, already-installed interpreter without project sync, downloads,
# or the persistent user cache, which may be inaccessible in an agent sandbox.
PYTHON=(uv run --no-project --no-cache --offline --no-python-downloads --python "$PYTHON_VERSION" -- python)

PWM_HUB="research-skills-hub/open-paper-skills/paper-wiki-manager"
RPM_HUB="research-skills-hub/open-paper-skills/research-project-manager"

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

echo "verify: consistency check (product edition)"

runtime_error=0
if [ -z "$runtime_problem" ]; then
  runtime_output="$("${PYTHON[@]}" -c 'import sys; print(sys.executable)' 2>&1)"; rc=$?
  if [ "$rc" -ne 0 ]; then
    runtime_problem="Python $PYTHON_VERSION startup failed (exit $rc):
$runtime_output"
  fi
fi

if [ -n "$runtime_problem" ]; then
  runtime_error=1
  echo "  ERROR runtime"
  printf '%s\n' "$runtime_problem" | sed 's/^/          /'
  echo "  SKIP  paper-wiki validation (runtime unavailable)"
  echo "  SKIP  project contract (runtime unavailable)"
  echo "  SKIP  generator (runtime unavailable)"
else
  echo "  OK    Python runtime ($PYTHON_VERSION)"

  # 1. The transitional workspace's stub paper wiki, viz.html included.
  check "paper-wiki validation (transitional workspace)" \
    "${PYTHON[@]}" "$PWM_HUB/scripts/validate_paper_wiki.py" paper-wiki

  # 2. Project contract: the example's Snapshot, its portfolio row, its idea.
  check "project contract (transitional workspace)" \
    "${PYTHON[@]}" "$RPM_HUB/scripts/manage_research_project.py" validate

  # 3. The generator reads the transitional workspace and validates its snapshot.
  check "generator (transitional workspace)" \
    "${PYTHON[@]}" os-ui/generator/generate.py
fi

# 4. Installed-skill integrity (ADR 0002): the transitional workspace's links
#    to the five shipped skills. Same rules as a workspace's verify.sh.
verify_installs() {
  local rc=0 target entry name src coll form
  for target in .claude/skills .agents/skills .claude/skills/.disabled .agents/skills/.disabled; do
    [ -d "$target" ] || continue
    for path in "$target"/*; do
      [ -e "$path" ] || [ -L "$path" ] || continue
      entry="$(basename "$path")"
      name="$entry"
      if [ -L "$path" ] && [ ! -e "$path" ]; then
        echo "$path is a dangling symlink (target $(readlink "$path") is missing)"; rc=1; continue
      fi
      src="$(find research-skills-hub -maxdepth 3 -type d -name "$name" | head -1)"
      if [ -z "$src" ]; then
        continue
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
check "installed skills (transitional workspace)" verify_installs

# 5. Brand copies. os-ui serves its tab icons from tracked copies of the
#    docs/brand originals; a changed original must be copied again.
verify_brand_copies() {
  local rc=0 f
  for f in favicon.svg favicon-256.png; do
    if ! cmp -s "docs/brand/$f" "os-ui/frontend/public/$f"; then
      echo "os-ui/frontend/public/$f differs from docs/brand/$f; copy it again"
      rc=1
    fi
  done
  return "$rc"
}
check "brand copies in os-ui" verify_brand_copies

if [ "$runtime_error" -ne 0 ]; then
  echo "verify: INCOMPLETE — resolve the runtime error and rerun"
  exit 2
elif [ "$fail" -eq 0 ]; then
  echo "verify: all checks passed"
else
  echo "verify: FAILED — fix the items above (this script does not auto-fix)"
fi
exit "$fail"
