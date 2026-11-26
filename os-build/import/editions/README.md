# SuperResearch OS

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A desktop app for macOS, Windows, and Linux for researchers who already use a
coding agent, Claude Code or Codex. It opens a workspace, a folder of plain
files, and shows its projects, papers, and skills; you talk to the agents from
the app, and the files stay the only research state. The app has no model or agent of
its own ([ADR-0006](docs/adr/0006-desktop-workspace-trunk-and-plugins.md)).

## What you need

| | For |
|---|---|
| Node.js 22.18 or later, with npm | building the app |
| [uv](https://docs.astral.sh/uv/) | the snapshot, the harness, and every script; it fetches the Python in [`.python-version`](.python-version) |
| Git 2.45 or later | the Code view |
| [Claude Code](https://docs.claude.com/en/docs/claude-code/setup) or [Codex](https://developers.openai.com/codex/cli), signed in | agent conversations |
| bash (on Windows, from Git for Windows) | the example project's scripts |

## Build and run

From `os-ui/client`:

```bash
npm ci
npm start             # build, then open the app
npm run package       # an installer for this OS, in release/
```

[os-ui/client/README.md](os-ui/client/README.md) covers installing a build,
the first start, and the per-OS installers.

## Check

From the repository root, `./verify.sh`; then the steps of
[CI](.github/workflows/ci.yml), which also runs the Python unit tests and the
frontend's build and tests. In `os-ui/client`: `npm test` and
`npm run test:e2e`. [CONTRIBUTING.md](CONTRIBUTING.md) says how a change lands.

## Layout

| Path | What |
|---|---|
| [os-ui/client/](os-ui/client/README.md) | The Electron app |
| [os-ui/frontend/](os-ui/frontend/README.md) | Its pages, plugins, and shared endpoints |
| [os-ui/generator/](os-ui/generator/README.md) | The snapshot generator, which reads a workspace |
| [os-harness/](os-harness/README.md) | Runs one Claude Code or Codex turn and records its result, for the app and for `project-dispatch` |
| [research-skills-hub/open-paper-skills/](research-skills-hub/open-paper-skills/) | The five skills a workspace gets |
| [projects-folder/templates/](projects-folder/templates/) | The project template |
| [projects-folder/nanochat_cpu/](projects-folder/nanochat_cpu/index.md) | The example project |
| [docs/adr/](docs/adr/) | ADR-0005 (the desktop client) and ADR-0006 (workspace, trunk, and plugins) |
| [docs/brand/](docs/brand/README.md) | Logo, icon, and palette |
| [CONTEXT.md](CONTEXT.md) | Shared vocabulary |

## License

Original content in this repository is licensed under the [MIT License](LICENSE).
Vendored third-party files keep their upstream licence and attribution, recorded
beside them (for example the Paper view's PDF.js and the paper wiki viewer's
libraries, each in its `vendor/` folder).

Imported from {{ORIGIN}} at commit `{{SOURCE_COMMIT}}`, without its history.
