#!/usr/bin/env bash
#
# Refresh the read-only mattpocock-skills vendored mirror from upstream.
#
# Wholesale, idempotent copy of the upstream `skills/engineering` and
# `skills/productivity` trees into this collection via `rsync --delete`, then
# pins the upstream commit in SOURCE.md. Any local edit to a mirrored skill is
# overwritten — to adapt a skill, cherry-pick it into ../collected-skills/.
#
# Safe to run by hand or from CI. When the mirror already matches upstream it
# leaves the working tree untouched (no SOURCE.md churn, so no noise PRs).
#
# Usage:  bash research-skills-hub/mattpocock-skills/scripts/refresh.sh
set -euo pipefail

UPSTREAM="https://github.com/mattpocock/skills.git"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COLLECTION_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

for tool in git rsync; do
  command -v "$tool" >/dev/null 2>&1 || { echo "error: '$tool' is required" >&2; exit 1; }
done

TMP="$(mktemp -d)"
cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

echo "Cloning $UPSTREAM (shallow, sparse)…"
git clone --depth 1 --filter=blob:none --sparse "$UPSTREAM" "$TMP" >/dev/null 2>&1
git -C "$TMP" sparse-checkout set skills/engineering skills/productivity >/dev/null 2>&1
SHA="$(git -C "$TMP" rev-parse HEAD)"

for d in engineering productivity; do
  src="$TMP/skills/$d/"
  dst="$COLLECTION_DIR/$d/"
  if [[ ! -d "$src" ]]; then
    echo "error: upstream path skills/$d not found — aborting without changes" >&2
    exit 1
  fi
  mkdir -p "$dst"
  rsync -a --delete --exclude='.git' "$src" "$dst"
done

# Only restamp SOURCE.md when the mirrored skills actually changed, so an
# unchanged run leaves the tree clean and the weekly workflow opens no PR.
changed=1
if git -C "$COLLECTION_DIR" rev-parse --show-toplevel >/dev/null 2>&1; then
  if [[ -z "$(git -C "$COLLECTION_DIR" status --porcelain -- \
        "$COLLECTION_DIR/engineering" "$COLLECTION_DIR/productivity")" ]]; then
    changed=0
  fi
fi

if [[ "$changed" -eq 1 ]]; then
  DATE="$(date -u +%F)"
  {
    printf '# Source\n\n'
    printf '%s\n' '- **Upstream**: [mattpocock/skills](https://github.com/mattpocock/skills), paths `skills/engineering/` and `skills/productivity/`.'
    printf '%s\n' '- **License**: MIT (see the upstream `LICENSE`). Preserve attribution when redistributing.'
    printf -- '- **Pinned upstream commit**: `%s`\n' "$SHA"
    printf -- '- **Last synced**: %s (UTC)\n' "$DATE"
    printf '%s\n' '- **Sync policy**: read-only vendored mirror; refreshed wholesale (`rsync --delete`) by [scripts/refresh.sh](scripts/refresh.sh) via the weekly sync workflow, which opens a PR and merges it automatically. To adapt a skill, cherry-pick it into `../collected-skills/` instead of editing it here. See [../docs/adr/0001-external-skill-intake-and-sync.md](../docs/adr/0001-external-skill-intake-and-sync.md).'
    # This block is load-bearing, not documentation: the installer parses it, and
    # a collection without it defaults to `symlink`. It lives here because this
    # script rewrites SOURCE.md wholesale — dropping it silently converts every
    # installed mirror skill to a symlink on the next refresh.
    printf '%s\n' '- **Install form**: `copy`. `research-skill-installer` reads this field and must'
    printf '%s\n' '  never symlink skills from this collection. The installed copy is what pins the'
    printf '%s\n' '  version: it keeps a merged upstream sync PR from silently changing a skill'
    printf '%s\n' '  already in use, and it survives an upstream rename that `rsync --delete` would'
    printf '%s\n' '  otherwise turn into a dangling link. Collections without this field default to'
    printf '%s\n' '  `symlink`. See [../docs/adr/0002-skill-install-form-and-targets.md](../docs/adr/0002-skill-install-form-and-targets.md).'
  } > "$COLLECTION_DIR/SOURCE.md"
  echo "mattpocock-skills: mirror updated to upstream ${SHA:0:12}."
else
  echo "mattpocock-skills: already in sync with upstream ${SHA:0:12}; no changes."
fi
