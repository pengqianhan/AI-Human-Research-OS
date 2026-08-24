# Source

- **Upstream**: [mattpocock/skills](https://github.com/mattpocock/skills), paths `skills/engineering/` and `skills/productivity/`.
- **License**: MIT (see the upstream `LICENSE`). Preserve attribution when redistributing.
- **Pinned upstream commit**: `5b15a47f2d7150f545fbcacbfe381787fc0230dc`
- **Last synced**: 2026-08-24 (UTC)
- **Sync policy**: read-only vendored mirror; refreshed wholesale (`rsync --delete`) by [scripts/refresh.sh](scripts/refresh.sh) via the weekly sync workflow, which opens a PR and merges it automatically. To adapt a skill, cherry-pick it into `../collected-skills/` instead of editing it here. See [../docs/adr/0001-external-skill-intake-and-sync.md](../docs/adr/0001-external-skill-intake-and-sync.md).
- **Install form**: `copy`. `research-skill-installer` reads this field and must
  never symlink skills from this collection. The installed copy is what pins the
  version: it keeps a merged upstream sync PR from silently changing a skill
  already in use, and it survives an upstream rename that `rsync --delete` would
  otherwise turn into a dangling link. Collections without this field default to
  `symlink`. See [../docs/adr/0002-skill-install-form-and-targets.md](../docs/adr/0002-skill-install-form-and-targets.md).
