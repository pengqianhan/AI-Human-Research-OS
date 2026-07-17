# Research Skills Hub

The bounded context for how skills are stored, organized, synced, and ingested
under `research-skills-hub/`. It is a glossary only — mechanisms and procedures
live in each skill's `SKILL.md` and in `docs/adr/`.

Structural rule that shapes the language below: the installer
(`open-paper-skills/research-skill-installer`) discovers skills at exactly
`<collection>/<skill>/SKILL.md` or one bundle level deeper
`<collection>/<bundle>/<skill>/SKILL.md`. Nothing is discovered four levels below
the hub root.

## Language

### Hub structure

**Collection**:
A top-level directory directly under `research-skills-hub/`, grouping skills by
source or purpose (e.g. `mattpocock-skills`, `collected-skills`).
_Avoid_: category, folder, group.

**Bundle**:
A folder inside a collection that has no `SKILL.md` of its own and groups related
nested skills one level deeper (e.g. `mattpocock-skills/engineering/`).
_Avoid_: sub-collection, subfolder, group.

**Skill**:
A directory containing a `SKILL.md`; the unit the installer copies into
`.agents/skills/` and `.claude/skills/`.
_Avoid_: plugin, tool, module.

### Skill intake

**Vendored mirror**:
A collection that is a read-only copy of one upstream repo's skills, refreshed
wholesale from upstream and never edited locally (e.g. `mattpocock-skills`). To
adapt one, cherry-pick it into `collected-skills/` under a new name instead.
_Avoid_: fork, clone, submodule.

**Cherry-picked vendor**:
A single skill copied from some upstream into `collected-skills/`, chosen
individually rather than tracked as a whole repo.
_Avoid_: import.

**Discovery scout**:
A skill (`discover-academic-skills`) that searches external registries and
user-supplied candidates for research skills and produces a filtered, scored
report; it never ingests a skill automatically.
_Avoid_: collector, importer, crawler.

**Decision ledger**:
The committed record (`research-skills-hub/discovery-ledger.md`) of every
candidate the scout has surfaced and its disposition (accepted / rejected /
deferred), used to suppress re-review of things already decided.
_Avoid_: log, history, cache.
