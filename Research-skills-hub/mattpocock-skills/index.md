# Matt Pocock Skills

> **Read-only vendored mirror — do not edit.** These skills are copied verbatim
> from [mattpocock/skills](https://github.com/mattpocock/skills/tree/main/skills)
> (MIT). They are refreshed wholesale from upstream by the weekly sync workflow,
> which **overwrites any local change**. To adapt one, cherry-pick it into
> [../collected-skills/](../collected-skills/index.md) under a new name instead.
> Provenance and the pinned upstream commit live in [SOURCE.md](SOURCE.md); the
> policy behind this layout is
> [ADR 0001](../docs/adr/0001-external-skill-intake-and-sync.md).

Two bundles, discovered by the installer as `mattpocock-skills/<bundle>/<skill>`.

## engineering/

Code-work skills. See [engineering/README.md](engineering/README.md).

* [ask-matt](engineering/ask-matt/SKILL.md)
* [code-review](engineering/code-review/SKILL.md)
* [codebase-design](engineering/codebase-design/SKILL.md)
* [diagnosing-bugs](engineering/diagnosing-bugs/SKILL.md)
* [domain-modeling](engineering/domain-modeling/SKILL.md)
* [grill-with-docs](engineering/grill-with-docs/SKILL.md)
* [implement](engineering/implement/SKILL.md)
* [improve-codebase-architecture](engineering/improve-codebase-architecture/SKILL.md)
* [prototype](engineering/prototype/SKILL.md)
* [research](engineering/research/SKILL.md)
* [resolving-merge-conflicts](engineering/resolving-merge-conflicts/SKILL.md)
* [setup-matt-pocock-skills](engineering/setup-matt-pocock-skills/SKILL.md)
* [tdd](engineering/tdd/SKILL.md)
* [to-spec](engineering/to-spec/SKILL.md)
* [to-tickets](engineering/to-tickets/SKILL.md)
* [triage](engineering/triage/SKILL.md)
* [wayfinder](engineering/wayfinder/SKILL.md)

## productivity/

General workflow skills, not code-specific. See
[productivity/README.md](productivity/README.md).

* [grill-me](productivity/grill-me/SKILL.md)
* [grilling](productivity/grilling/SKILL.md)
* [handoff](productivity/handoff/SKILL.md)
* [teach](productivity/teach/SKILL.md)
* [writing-great-skills](productivity/writing-great-skills/SKILL.md)

## Installing

From the repository root (names collide with other collections, so pass
`--collection mattpocock-skills`):

```bash
python Research-skills-hub/open-paper-skills/research-skill-installer/scripts/install_research_skill.py install <skill> --collection mattpocock-skills
```

Because these are a read-only mirror, do not `sync-back` into this collection —
promote local changes into `collected-skills/` instead.
