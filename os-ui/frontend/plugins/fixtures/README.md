# Test fixtures: two frozen `paper_skeleton.md` files

Copies taken on 2026-11-23 from branch `step2-design` (commit `1fec841`), byte
for byte, so the tests that pin exact line numbers, counts, and text do not
follow the live files, which agents edit:

| Fixture | Copy of | Git blob | Last commit to the source |
|---|---|---|---|
| `nanochat_cpu.paper_skeleton.md` | `projects-folder/nanochat_cpu/paper_skeleton.md` | `9b95ca83f6b7f95a0ab296adf1166838f80900f2` | `63ead0b` |
| `template.paper_skeleton.md` | `projects-folder/templates/ai_research_template/paper_skeleton.md` | `72f6de3c7460d8875cbce9a022a68a4b1b9e92ff` | `6e69d7d` |

Used by `../md-kit.test.ts`, `../skeleton-view/site/logic.test.ts`, and the
desktop client's end-to-end suite (`os-ui/client/e2e/app.test.ts`), which
writes them into its temporary workspace's `nanochat_cpu` and a project made
from the template. Their relative links resolve from a project folder, not
from here. Do not update them to match the live files; a test that needs other
content gets its own fixture. The tests read them through `split(/\r?\n/)`,
so a checkout that gives them CRLF line endings passes too.

This folder has no `plugin.json`, so the client's build does not ship it.
