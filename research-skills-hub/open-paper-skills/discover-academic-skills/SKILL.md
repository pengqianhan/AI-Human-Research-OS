---
name: discover-academic-skills
description: Discover research/academic agent-skills from skills.sh (and user-supplied candidates), filter them through strict hard gates plus a strict academic-relevance gate, score survivors with a rubric, and hand back a ranked report with reasons. Use when the user wants to find, discover, or scout new academic/research skills to add to the hub, evaluate a skill they saw on social media, or refresh the discovery ledger.
---

# Discover Academic Skills

A **discovery scout**, not an auto-collector. It surfaces candidate research
skills with scores and reasons; **ingestion is always human-gated** (per
[ADR 0001](../../docs/adr/0001-external-skill-intake-and-sync.md)). The scout
never installs or vendors anything.

- **Scope**: discovery + strict filtering + scoring of academic/research skills
  from the skills.sh registry and from candidates the user pastes (e.g. from
  social media). Anything the user accepts is later vendored **by hand** into
  [`collected-skills/`](../../collected-skills/index.md) via the normal intake.
- **Inputs**: none required (runs a default academic query set); optional
  `--candidate owner/repo@skill`, `--queries`, `--min-installs`, `--include-seen`.
- **Outputs**: a ranked Markdown report in `scratch/skill-discovery/` (gitignored),
  the top picks surfaced inline, and new rows appended to the committed
  [`discovery-ledger.md`](../../discovery-ledger.md).
- **Limitations**: `npx skills find` is fuzzy and skills.sh coverage is partial;
  the strict relevance gate favours precision over recall (it *will* miss some
  real-but-unlabelled skills — by design, to cut review burden). The skills.sh
  JSON API (`/api/v1`) needs a Vercel OIDC token and is **not** used; the
  unauthenticated CLI is the discovery channel.

## Prerequisites

- **Node / npx** — for `npx skills find` (unauthenticated; no token).
- **`gh` authenticated** — for the license hard gate and repo metadata. Without
  it the license gate is skipped and every candidate is flagged
  `license-unverified` for you to check by hand (nothing is silently dropped).

## Pipeline (deterministic gates → relevance gate → rubric)

### 1. Gather + deterministic hard gates (script)

Run the helper — it queries skills.sh, dedupes, suppresses ledger entries, and
applies the deterministic gates:

```bash
python research-skills-hub/open-paper-skills/discover-academic-skills/scripts/discover.py
```

Deterministic gates it applies (a failure drops the candidate into the report's
"dropped" appendix with a reason — never silently):

- **Install floor** — `< 50 installs` dropped (tune with `--min-installs`; manual
  `--candidate` entries bypass this).
- **License present** — no license → dropped (default all-rights-reserved can't be
  redistributed). Permissive (MIT/Apache/BSD/…) passes; copyleft passes **flagged**
  `copyleft-license`; unrecognised passes flagged for your check.
- **Ledger suppression** — anything already decided in `discovery-ledger.md` is
  dropped (use `--include-seen` to override). This is what makes repeated runs
  quieter over time.
- **Hub-overlap hint** — candidates whose name overlaps an existing hub skill are
  flagged `possible-overlap:<name>` (not dropped — you may want the better one).

The script writes `scratch/skill-discovery/<date>-candidates.raw.json` with a
`kept` list (for scoring) and a `dropped` list (for the appendix).

### 2. Academic-relevance gate — STRICT (agent)

For every `kept` candidate, read its `SKILL.md` (open the skills.sh page at the
candidate `url`, or run `npx skills use owner/repo@skill` to print the skill
prompt) and decide, strictly:

> **Would a researcher use this *in a research workflow*?** It must clearly match
> the IN list. Borderline or merely dual-use → **reject** (move to a
> "dropped — off scope" section with a one-line reason).

**IN (pass):** literature discovery/reading (arXiv, OpenAlex, Semantic Scholar,
PubMed, bioRxiv); citation/reference management (Zotero, BibTeX); academic writing
(LaTeX papers, venue templates, submission formatting); research data / experiments
/ reproducibility / baseline tables; **paper-oriented** figures and diagrams;
systematic review / meta-analysis / bibliometrics; discipline-specific science
tooling and ML/AI research workflows.

**OUT (reject):** general software engineering, web/frontend, DevOps, marketing,
generic productivity. **Dual-use tools** (generic `latex`, `diagram`, `pdf`,
`search`) are rejected unless the SKILL.md gives an explicit research framing.

Precision over recall is intended: a strict gate keeps your review list almost
entirely genuine research skills. The vocabulary behind this gate is in
[`../../CONTEXT.md`](../../CONTEXT.md).

### 3. Rubric scoring (agent)

Score each survivor on four dimensions, 0–5 each, weighted into a 0–100 composite:

| Dimension | Weight | What to judge |
|---|---|---|
| Research value & impact | 35% | how central/useful to a research workflow (not "is it relevant" — "how much does it matter") |
| Quality & maturity | 25% | SKILL.md clarity/completeness, install count, stars, recency of `pushed_at` |
| Safety & trust | 25% | read the bundled scripts: does it run arbitrary code, reach the network, need credentials? author track record |
| Fit & uniqueness | 15% | fills a gap vs the hub / complements the OS; overlap with an existing skill lowers this |

Tiers by composite: **≥80 strongly recommend · 65–79 consider · 50–64 borderline
· <50 low (appendix only)**. License is not scored (it is a gate/flag).

### 4. Report + ledger (agent)

Write `scratch/skill-discovery/<date>-candidates.md`:

- Grouped by tier (strongly recommend → consider → borderline). Each entry:
  composite score, the four sub-scores, a 2–3 sentence reason, and any flags
  (`copyleft-license`, `license-<spdx>`, `possible-overlap:…`, `license-unverified`).
- Appendices: **dropped at hard gates** and **dropped — off scope**, each with the
  one-line reason. Do not silently omit anything.

Then **surface every ≥80 candidate inline** to the user, and **append every
surfaced candidate** to [`discovery-ledger.md`](../../discovery-ledger.md) with
disposition `surfaced`. When the user later accepts/rejects one, update its row to
`accepted` (note where it was vendored) or `rejected` (note why). Ledger row shape:

```
| owner/repo@skill | <date> | surfaced | <score> | <one-line reason> |
```

## Accepting a candidate

Accepting is manual and follows the existing cherry-pick intake: read the whole
`SKILL.md` and every bundled script, confirm the license, copy it into
`collected-skills/<skill>/`, register it with the `skill-organizer` skill
(source URL + license), then run `./verify.sh`. If a whole repo is worth tracking
wholesale, promote it to its own vendored-mirror collection like `mattpocock-skills`
instead (see ADR 0001).

## Manual candidate (social-media finds)

Feed a skill you saw elsewhere through the exact same gates and rubric:

```bash
python .../discover.py --candidate owner/repo@skill
```

It skips the install floor but runs the license gate, relevance gate, and rubric
like any other candidate.
