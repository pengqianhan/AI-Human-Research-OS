# The import kit

What makes the product repository, SuperResearch-OS, from one commit of this
repository ([design](../step3-split-and-git.md) §4, §5.7, §7 R1 and R3). It
writes a plain folder; it creates no repository and pushes nothing.

| File | What it is |
|---|---|
| [manifest.json](manifest.json) | The allowlist: every tracked file's class (W is what no entry names), the example's files, the editions, the stubs, the links |
| [export.py](export.py) | Writes the product tree from `--commit` into `--dest` |
| [import_check.py](import_check.py) | Checks a written tree against the commit and the manifest, and searches it for personal data |
| [importkit.py](importkit.py) | Code the two scripts share |
| [editions/](editions/) | The product editions of the seven split files; `HANDOFF.md` and `README.md` are templates cut from the source at export time |
| [transitional/](transitional/) | The transitional workspace's stubs |

## Rehearse

From the repository root, with the pinned Python:

```bash
py() { uv run --no-project --python 3.12 -- python "$@"; }
py os-build/import/export.py --dest <empty folder outside the repository>
py os-build/import/import_check.py --export <that folder> --patterns <file> --json <file> --record
```

- Both read the kit from the commit (default `HEAD`), so commit the kit first, or
  pass `--kit-from-worktree` to both while iterating.
- `--patterns` names a file kept outside the export and the repository, one
  `label<TAB>text` per line: the owner's names, email addresses, home folder,
  and host names, derived at run time. Never commit it. The check prints files
  and line counts only.
- Then run the product's checks inside the folder: its `verify.sh`, the unit
  tests of its `ci.yml`, the generator, and the `os-ui/frontend` and
  `os-ui/client` steps. Run `import_check.py` again at the end: files the checks
  created are allowed only where the product's `.gitignore` files ignore them.

Every relative link in the `HANDOFF.md` and `README.md` editions whose target is
not product content becomes a link to the workspace repository, whose address
the export reads from the source's `origin` remote (`--workspace-url` overrides
it, `--no-workspace-url` keeps the links as they are).
