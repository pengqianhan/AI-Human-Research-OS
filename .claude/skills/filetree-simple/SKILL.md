---
name: filetree-simple
description: Generate or lint a compact top-level FILETREE.md navigation map. Use when repository structure changes or FILETREE.md needs creation, regeneration, or validation.
license: MIT
---

# Filetree

Generate `FILETREE.md` as a deterministic cold-start map: core repository files
plus public top-level areas. Each area owns its meaning in `index.md`; the map
links to that entrypoint and stops there.

Run commands from the target repository root, or pass `--repo` before the
subcommand. The helper is [scripts/filetree.py](scripts/filetree.py).

## Generate

1. Run:

   ```bash
   python scripts/filetree.py generate
   ```

2. If validation fails, fix every reported entrypoint and rerun `generate`.
3. Run `lint` after generation.

Completion criterion: `FILETREE.md` contains the complete two-section map and
`lint` exits `0`.

## Lint

Run:

```bash
python scripts/filetree.py lint
```

`lint` builds the expected map in memory and compares it with `FILETREE.md`.
It never writes files. Exit `0` means current; exit `1` means invalid inputs or
drift that `generate` must resolve.

## Contract

- Output is English Markdown with `Core Files` and `Main Areas` sections.
- Core files use the script's stable ordered descriptions and appear when
  present as regular files.
- A public area is a non-hidden direct child directory outside the conventional
  temporary-directory exclusions in the script.
- A public area uses `index.md`. Only a skill directory may fall back to
  `SKILL.md`.
- An `index.md` entrypoint starts with an English H1 followed by one plain
  English sentence of at most 20 words. That sentence becomes the map summary.
- A `SKILL.md` entrypoint supplies single-line `name` and `description`
  frontmatter; `description` follows the same summary rules.
- Top-level directory symlinks are rejected. The generator does not traverse
  nested directories.
- Generation validates the complete map before atomically replacing
  `FILETREE.md`; a failed run leaves the existing file unchanged.

## Scope, Inputs, Outputs, and Limitations

- **Scope:** compact top-level navigation, not an exhaustive file inventory or
  content-integrity manifest.
- **Inputs:** the target root, conventional core files, and top-level
  `index.md` or skill `SKILL.md` entrypoints.
- **Output:** one generated `FILETREE.md`; no sidecar manifest or hashes.
- **Runtime:** Python 3.9+ standard library; Git and third-party packages are not
  required.
- **Limitations:** full OKF conformance, nested bundle navigation, file history,
  and content integrity remain separate concerns.

Run the standard-library test suite after changing the skill:

```bash
python -m unittest discover -s tests -v
```

## Credits

Inspired by [nekocode/filetree-skill](https://github.com/nekocode/filetree-skill),
an MIT-licensed Claude Code plugin.
