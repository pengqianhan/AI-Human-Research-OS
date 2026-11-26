# SuperResearch OS: development instructions

This repository is the source of the SuperResearch OS desktop app, for
researchers who run their own coding agents
([ADR-0006](docs/adr/0006-desktop-workspace-trunk-and-plugins.md)): the app and
its plugins, the agent harness, the skills and project template every new
workspace gets, the example project, and CI. A user's research lives in a
workspace, a folder of its own; this repository holds none.

## Execution contract

- Match the request: answers and reviews inspect and report; diagnosis finds
  causes; change requests include implementation and proportionate validation.
- Continue authorized, safe local work without routine confirmation. Ask only
  for a necessary user choice or destructive, external, protected-data,
  substantial-cost, or scope-expanding actions not already authorized.
- The maintainer owns direction, consequential choices, publication, and final
  acceptance. Agent verification is part of delivery.
- Repository evidence outranks summaries. Report checks as passed, failed, or
  unrun.

## Read by task

| When | Read |
|---|---|
| Architecture decisions | [ADR-0005](docs/adr/0005-desktop-client.md), [ADR-0006](docs/adr/0006-desktop-workspace-trunk-and-plugins.md) |
| Shared vocabulary | [CONTEXT.md](CONTEXT.md) |
| The app and its plugins | [os-ui/index.md](os-ui/index.md), [os-ui/client/DESIGN.md](os-ui/client/DESIGN.md), [os-ui/PLUGINS.md](os-ui/PLUGINS.md) |
| The agent harness | [os-harness/README.md](os-harness/README.md) |
| How changes are checked and merged | [CONTRIBUTING.md](CONTRIBUTING.md) |

This repository keeps no handoff file: the product's progress, decisions, and
open work are recorded by its maintainer outside it.

## Build and check

- `./verify.sh` from the repository root.
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
