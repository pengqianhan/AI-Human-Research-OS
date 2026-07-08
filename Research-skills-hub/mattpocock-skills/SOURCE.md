# Source

- **Upstream**: [mattpocock/skills](https://github.com/mattpocock/skills), paths
  `skills/engineering/` and `skills/productivity/`.
- **License**: MIT (see the upstream `LICENSE`). Preserve attribution when
  redistributing.
- **Pinned upstream commit**: _not yet pinned_. The current vendored files were
  copied from upstream at an earlier, unrecorded commit. The first run of the
  refresh script (Phase 2) will reconcile these files to a known commit and record
  its SHA here.
- **Upstream HEAD at time of writing**: `d574778f94cf620fcc8ce741584093bc650a61d3`
  (2026-07-09) — reference only; the vendored files may predate this.
- **Sync policy**: read-only vendored mirror; refreshed wholesale (`rsync
  --delete`) by the weekly sync workflow, which opens a PR and never auto-merges.
  See [../docs/adr/0001-external-skill-intake-and-sync.md](../docs/adr/0001-external-skill-intake-and-sync.md).
