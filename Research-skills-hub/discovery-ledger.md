# Discovery Ledger

Every candidate the [`discover-academic-skills`](open-paper-skills/discover-academic-skills/SKILL.md)
scout has surfaced, with its disposition. The scout reads this file and
**suppresses re-review of anything already listed** (run with `--include-seen` to
override), so repeated runs get quieter over time.

Dispositions: `surfaced` (shown, awaiting your decision) · `accepted` (note where
it was vendored) · `rejected` (note why) · `deferred` (revisit later).

| Candidate (owner/repo@skill) | Date | Disposition | Score | Reason |
| --- | --- | --- | --- | --- |
| allenai/asta-plugins@semantic-scholar | 2026-07-09 | surfaced | 88 | Semantic Scholar lookups from AllenAI; fills the hub's S2 gap |
| galaxy-dawn/claude-scholar@citation-verification | 2026-07-09 | surfaced | 84 | Anti-fake-citation guide; complements ml-paper-writing + paper-wiki |
| k-dense-ai/claude-scientific-skills@peer-review | 2026-07-09 | surfaced | 83 | Structured CONSORT/STROBE/PRISMA manuscript peer review |
| galaxy-dawn/claude-scholar@zotero-obsidian-bridge | 2026-07-09 | surfaced | 76 | Zotero→markdown KB bridge; overlaps paper-wiki-manager |
| wentorai/research-plugins@citation-skills | 2026-07-09 | surfaced | 74 | Router over 22 citation/reference sub-skills (incl. Chinese CNKI) |
| allenai/asta-plugins@semantic-scholar-lookup | 2026-07-09 | surfaced | 72 | S2 sibling of the above; likely redundant — pick one |
| poemswe/co-researcher@peer-review | 2026-07-09 | surfaced | 70 | Research suite; small repo, verify quality |
| yrom/arxiv-paper-translator@arxiv-paper-translator | 2026-07-09 | surfaced | 68 | Translates arXiv papers — novel niche, no hub equivalent |
| yuan1z0825/nature-skills@nature-citation | 2026-07-09 | surfaced | 67 | Nature-style formatting + sci figures (Chinese-authored) |
| google-deepmind/science-skills@literature-search-arxiv | 2026-07-09 | rejected | - | Already vendored in hub science-skills |
| google-deepmind/science-skills@literature-search-openalex | 2026-07-09 | rejected | - | Already vendored in hub science-skills |
| google-deepmind/science-skills@literature-search-biorxiv | 2026-07-09 | rejected | - | Already vendored in hub science-skills |
| google/skills@workload-manager-basics | 2026-07-09 | rejected | - | GCP workload manager — off scope (fuzzy "reference manager" match) |
| google/skills@google-analytics-admin-api-basics | 2026-07-09 | rejected | - | Analytics — off scope |
| aaron-he-zhu/aaron-marketing-skills@preference-frequency-manager | 2026-07-09 | rejected | - | Marketing — off scope |
| vishalsachdev/canvas-mcp@canvas-peer-review-manager | 2026-07-09 | rejected | - | Canvas LMS classroom peer review — not a research workflow |
