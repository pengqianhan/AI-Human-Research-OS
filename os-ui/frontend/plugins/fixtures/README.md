# Test fixtures: frozen project files

Copies of live project files, so the tests that pin exact line numbers, counts,
sizes, and text do not follow the live files, which agents edit. Do not update
them to match the live files; a test that needs other content gets its own
fixture. The tests read text through `split(/\r?\n/)` and take sizes from the
files on disk, so a checkout that gives them CRLF line endings passes too.
Their relative links resolve from a project folder, not from here.

## Two `paper_skeleton.md` files

Taken on 2026-11-23 from branch `step2-design` (commit `1fec841`), byte for
byte:

| Fixture | Copy of | Git blob | Last commit to the source |
|---|---|---|---|
| `nanochat_cpu.paper_skeleton.md` | `projects-folder/nanochat_cpu/paper_skeleton.md` | `9b95ca83f6b7f95a0ab296adf1166838f80900f2` | `63ead0b` |
| `template.paper_skeleton.md` | `projects-folder/templates/ai_research_template/paper_skeleton.md` | `72f6de3c7460d8875cbce9a022a68a4b1b9e92ff` | `6e69d7d` |

Used by `../md-kit.test.ts`, `../skeleton-view/site/logic.test.ts`,
`../assets-view/site/logic.test.ts` (for "Used in"), and the desktop client's
end-to-end suite (`os-ui/client/e2e/app.test.ts`), which writes them into its
temporary workspace's `nanochat_cpu` and into the projects it makes.

## Two project trees for the Assets view

Taken on 2026-11-24 from `main` at `22fc5d5`. Each holds only what the Assets
view reads besides `paper_skeleton.md` (the copies above): `Figs/`,
`Baselines/`, `Code/results/`, `Code/Datasets/`, and `Code/README.md`.

| Fixture | Copy of | Last commit to the source | Changed |
|---|---|---|---|
| `assets_project/` | those folders and `Code/README.md` of `projects-folder/nanochat_cpu/` | `63ead0b` | `Baselines/openresearch-demo/training-metrics.csv` keeps its header and first 300 of 6,501 rows; every other file is byte for byte |
| `assets_template/` | the same of `projects-folder/templates/ai_research_template/` (no `Code/results/`, as there) | `c3acde4` | none |

`assets_project/` is nanochat_cpu's assets as the design describes them: two
figures, the reference run whose `README.md` describes two of its files, two
result files, the four datasets of `Code/README.md`'s Data section, and an
empty `Code/Datasets/` (its `.gitkeep` never appears). `assets_template/` is a
new project's: an empty `Figs/`, no `Code/results/`, and a Data section with no
table. Used by `../assets-view/site/walk.test.ts` and `logic.test.ts` (read
through a fake listing that behaves as the read channel's), and by the
end-to-end suite, which lays each over a project it makes from the template in
its temporary workspace (`assets_e2e`, and the template project
`skeleton_e2e`).

## Two idea files for the Idea view

Written on 2026-11-24 for the Idea view (step 2.3); no project has an
`idea_graph.md` yet (that is step 2.4), so these are not copies.

| Fixture | What it is |
|---|---|
| `idea_graph/example.idea_graph.md` | The example of [os-ui/PLUGINS.md](../../../PLUGINS.md) Part 3 §5.1, byte for byte: four nodes, two links, one result's experiment, and claim C2 of `nanochat_cpu.paper_skeleton.md` (line 116) |
| `idea_graph/mockup.idea_graph.md` | The graph the Idea view's mockup drew for `nanochat_cpu` ([mockups/step2/views.html](../../../mockups/step2/views.html), alternative A) in the confirmed format: 20 nodes, 9 links, 6 results with their experiments, claims C1 to C5. The two links the mockup inferred (E1 tests Q1, E5 tests Q4) are left out. E1's run left no commit and no result file, as the mockup has it: `commit: none; files: none` (the Human Owner allowed `files: none` on 2026-11-24) |

Used by `../idea-view/site/logic.test.ts` and `layout.test.ts` (with the
frozen `nanochat_cpu.paper_skeleton.md`), and by the end-to-end suite, which
writes the second into its temporary copy of `nanochat_cpu`.

This folder has no `plugin.json`, so the client's build does not ship it.
