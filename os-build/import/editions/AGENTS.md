# SuperResearch OS: development instructions

This repository is the source of the Research OS desktop app for researchers who
run their own coding agents ([ADR-0006](docs/adr/0006-desktop-workspace-trunk-and-plugins.md)):
the app and its plugins, the files every new workspace gets, the example
project, CI, and the development record. A user's research lives in a
workspace, a folder of its own; this repository holds none.

## Execution contract

- Match the request: answers and reviews inspect and report; diagnosis finds
  causes; change requests include implementation and proportionate validation.
- Continue authorized, safe local work without routine confirmation. Ask only
  for a necessary user choice or destructive, external, protected-data,
  substantial-cost, or scope-expanding actions not already authorized.
- The Human Owner owns direction, consequential choices, publication, and final
  acceptance. Agent verification is part of delivery.
- Repository evidence outranks summaries and handoffs. Report checks as passed,
  failed, or unrun.

## The transitional workspace

Until step 3's PR 9, this repository's root is also a workspace, so the
generator, the project contract, and the end-to-end suite have one to open
([os-build/import.md](os-build/import.md); design §7 R3). `memory/`, `ideas/`,
`inbox/`, `paper-wiki/`, `projects-folder/index.md`, and the five links in
`.claude/skills/` and `.agents/skills/` are stubs; `projects-folder/nanochat_cpu/`
is the example the app ships. Change them only as product changes; never put a
person's own research, notes, or context here.

## Read by task

| When | Read |
|---|---|
| Resume cross-session work or revisit a settled decision | [HANDOFF.md](HANDOFF.md), Active Work and Decisions |
| Direction, milestones, and step designs | [os-build/index.md](os-build/index.md), [os-build/GOAL.md](os-build/GOAL.md) |
| Architecture decisions | [docs/adr/](docs/adr/) |
| Shared vocabulary | [CONTEXT.md](CONTEXT.md) |
| The app and its plugins | [os-ui/index.md](os-ui/index.md), [os-ui/client/DESIGN.md](os-ui/client/DESIGN.md), [os-ui/PLUGINS.md](os-ui/PLUGINS.md) |
| The agent harness | [os-harness/README.md](os-harness/README.md) |
| How this repository was created | [os-build/import.md](os-build/import.md) |

## The Human Owner's context

The Human Owner's cognition cache lives in their own workspace, not in this
repository. The session that directs product work starts there, reads the cache,
writes each brief with what an implementing agent needs, and records cognition
there at the end. A session started directly in this repository works without
the cache and creates none.

## Build and check

- `./verify.sh` from the repository root: brand copies, and the transitional
  workspace's paper wiki, project contract, installed skills, and generator.
- Python unit tests, as [CI](.github/workflows/ci.yml) runs them, with `uv` and
  the version in `.python-version`.
- `os-ui/frontend`: `npm ci`, `npm run build` (type-check and build), `npm test`.
- `os-ui/client`: `npm ci`, `npx tsc --noEmit -p .`, `npm test`, `npm run build`,
  `npm run test:e2e`; see [os-ui/client/README.md](os-ui/client/README.md).
- Use `uv` for Python environments. Update the nearest README or runbook when
  setup, commands, inputs, outputs, or limitations change.

## Integrity

Keep claims traceable to sources or artifacts; record unknowns honestly; never
invent citations, data, results, or verification. Preserve licences and
attribution of vendored files.

`main` accepts changes only through pull requests whose CI passes
([CONTRIBUTING.md](CONTRIBUTING.md)). Commit on a topic branch and open a pull
request into `main`.
