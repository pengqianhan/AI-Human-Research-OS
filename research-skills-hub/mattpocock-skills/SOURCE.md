# Source

- **Upstream**: [mattpocock/skills](https://github.com/mattpocock/skills), paths `skills/engineering/` and `skills/productivity/`.
- **License**: MIT (see the upstream `LICENSE`). Preserve attribution when redistributing.
- **Pinned upstream commit**: `49dd158d1076134a641b33efb035946536778336`
- **Last synced**: 2026-10-12 (UTC)
- **Sync policy**: read-only vendored mirror; refreshed wholesale (`rsync --delete`) by [scripts/refresh.sh](scripts/refresh.sh) via the weekly sync workflow, which opens a PR and merges it automatically. To adapt a skill, cherry-pick it into `../collected-skills/` instead of editing it here. See [../docs/adr/0001-external-skill-intake-and-sync.md](../docs/adr/0001-external-skill-intake-and-sync.md).
- **Install form**: `symlink`. An installed skill from this collection is a link
  back to this mirror, so a merged upstream sync changes it in place with no
  reinstall. When upstream renames or removes an installed skill the link
  dangles and `./verify.sh` fails that sync PR until the install is removed or
  moved to the new name. See [../docs/adr/0002-skill-install-form-and-targets.md](../docs/adr/0002-skill-install-form-and-targets.md).
