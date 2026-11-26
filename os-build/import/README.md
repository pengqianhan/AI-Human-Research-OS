# The import kit

What makes the product repository, SuperResearch-OS, from one commit of this
repository, by the rule in [HANDOFF.md](../../HANDOFF.md) Decisions, row
"Product repository: contents and timing": the product repository takes only
what a person who clones it alone needs to build, test, and run the app and to
understand its architecture. Planning and history stay here: `HANDOFF.md`,
`os-build/` (this kit included), ADR-0001 to 0004, `CHANGELOG.md`, the
presentation, the screenshots, and every workspace file. The kit writes a plain
folder; it creates no repository and pushes nothing.

| File | What it is |
|---|---|
| [manifest.json](manifest.json) | Every tracked file's class with pinned counts (M and B go as copies, S as editions; R and Dv stay; W, the workspace, is what no entry names), the must-be-absent list, the example's files, the editions, and the rehearsal workspace |
| [export.py](export.py) | Writes the product tree from `--commit` into `--dest` |
| [import_check.py](import_check.py) | Checks a written tree against the commit and the manifest, reports relative links whose target did not come along, and searches it for personal data |
| [importkit.py](importkit.py) | Code the two scripts share |
| [editions/](editions/) | The product editions of the six split files, and the rehearsal section of `AGENTS.md` |
| [rehearsal-workspace/](rehearsal-workspace/) | The rehearsal workspace's stubs |

## Two modes

- **Default: the real import.** The M and B files, the editions, and the
  example `nanochat_cpu`, and nothing else: no `memory/`, `ideas/`, `inbox/`,
  `paper-wiki/`, skill links, or `projects-folder/index.md`. The example's
  idea file is left out, because it sits under `ideas/` at today's commit; it
  comes along when step 3 moves the example and its idea to a product path.
  The `README.md` edition ends with a line naming this repository and the
  commit, read from the source's `origin` remote at run time
  (`--workspace-url` overrides it, `--no-workspace-url` names the repository
  without an address).
- **`--rehearsal-workspace`.** Adds a placeholder workspace at the root (the
  stubs, links to the five shipped skills, the stub wiki's `viz.html`, the
  example's idea file, and a section in `AGENTS.md` that says so), so the
  product's checks that still read a workspace there can run today. It is
  never imported.

`import_check.py` takes the same flag; without it a folder is checked as the
real import. Both scripts read the kit from the commit (default `HEAD`), so
commit the kit first, or pass `--kit-from-worktree` to both while iterating.

## What the check fails on, and what it reports

It fails when a tracked file is in no class or two, or a pinned count does not
hold; when the folder has a `.git`; when any path on disk, ignored files
included, is on the must-be-absent list or is a tracked R or Dv file, or, in
the real import, lies under a workspace root; when a file differs from its
tracked source or from the edition, stub, or generated file the kit gives in
that mode, or is missing; when a W path other than the example (and, in a
rehearsal, the stubs and links) is present; and when an edition, stub, or
generated file has the content of a file that stays. Files the export did not
write are allowed where the product's `.gitignore` files ignore them.

It reports, without failing, each Markdown file whose relative links point
to something the export does not hold, by file and count (`--json` has the
targets). Those are for pull requests before the import, not for the kit.

`--patterns` names a file kept outside the export and the repository, one
`label<TAB>text` per line: the owner's names, email addresses, home folder,
and host names, derived at run time. Never commit it. The check prints files
and line counts only.

- The file holds every written form of each name, one line each: joined and
  spaced (a credit line writes a name with a space where a login joins it),
  with hyphen or dot where one is used, and in every other script the person
  writes it in. The search compares bytes line by line, folding ASCII case
  only, so it finds exactly the forms listed. It cannot see text inside images
  or compressed streams (a PDF's, an archive's), text in another encoding
  (UTF-16, escapes such as `\u…` or `&#…;`), a name broken across two lines,
  or a name in a script or spelling the file does not hold; a clean result
  covers the listed forms in plain text only.

## Rehearse

From the repository root, with the pinned Python, and every check below run
with a throwaway `HOME` (and `USERPROFILE`), `CODEX_HOME` and
`CLAUDE_CONFIG_DIR` unset:

```bash
py() { uv run --no-project --python 3.12 -- python "$@"; }
py os-build/import/export.py --rehearsal-workspace --dest <empty folder outside the repository>
py os-build/import/import_check.py --rehearsal-workspace --export <that folder> --patterns <file> --json <file>
```

Then run the product's checks inside the folder as the import condition below
lists them, the end-to-end suite included, and the check again at the end.

The export is a plain folder, but the import makes a repository of it, and
`verify.sh` and the generator read Git when a `.git` is there. To see that
state, copy the export to a disposable folder and make one commit there with a
made-up identity on the command line and no remote; never run `git init` in
the export itself.

## The import condition

The import may happen, on the Human Owner's word, when the commands below run
to the end at the commit to import: `set -e` stops them at the first command
that fails. Run them in bash from the repository root with a throwaway `HOME`
(and `USERPROFILE`), `CODEX_HOME` and `CLAUDE_CONFIG_DIR` unset, and with `OUT`
naming an empty folder outside the repository and `PATTERNS` the file above.

```bash
set -e
out=${OUT:?an empty folder outside the repository}
patterns=${PATTERNS:?the patterns file, outside the repository}
py() { uv run --no-project --python 3.12 -- python "$@"; }
py os-build/import/export.py --dest "$out"
py os-build/import/import_check.py --export "$out" --patterns "$patterns"
(cd "$out" && ./verify.sh)
(cd "$out" && for s in paper-wiki-manager research-project-manager paper-search research-skill-installer; do
  py -m unittest discover -s "research-skills-hub/open-paper-skills/$s/scripts" -p 'test_*.py' || exit 1
done)
(cd "$out" && py -m unittest discover -s os-harness/tests)
(cd "$out" && py os-ui/generator/generate.py)
(cd "$out/os-ui/frontend" && npm ci && npm run typecheck && npm run build && npm test)
(cd "$out/os-ui/client" && npm ci && npx tsc --noEmit -p . && npm test && npm run build)
(cd "$out/os-ui/client" && npm run test:e2e)
py os-build/import/import_check.py --export "$out" --patterns "$patterns"
echo "import condition: met"
```

These are the steps of the product's `ci.yml` and the client's own, run on
the export without a placeholder workspace. The end-to-end suite copies the
checkout as its workspace, so it needs one at the root until step 3 gives it
workspaces of its own; until then that line cannot pass on the real import.
