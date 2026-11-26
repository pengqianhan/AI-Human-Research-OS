<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/brand/logo-lockup-white.png">
    <source media="(prefers-color-scheme: light)" srcset="docs/brand/logo-lockup.png">
    <img src="docs/brand/logo-lockup-on-paper.png" alt="Research OS" width="480">
  </picture>
</p>

# SuperResearch OS

[![The os-ui desktop showing the Dashboard, Skill Store, Paper Wiki, and Projects windows](docs/screenshots/os-ui-desktop.png)](os-ui/README.md)

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

The source of the **Research OS** desktop app: a local app for researchers who
already use Claude Code or Codex, over a workspace of plain files. This
repository holds the app, its plugins, what every new workspace is made from,
the example project `nanochat_cpu`, CI, and the development record. It holds no
one's research: a workspace is a folder of its own. It was created from
{{WORKSPACE_URL}} at commit `{{SOURCE_SHORT}}` ([os-build/import.md](os-build/import.md)).

<!-- import:section "## Current Design Stance" -->

## Quick Start

Install the desktop client for your OS as [os-ui/client/README.md](os-ui/client/README.md)
says, or build it from this checkout: `npm ci`, then `npm start`, in `os-ui/client`.
Until step 3's PR 9 a development run opens this repository's root, a
transitional workspace of stubs with the example project
([AGENTS.md](AGENTS.md)).

Run [`./verify.sh`](verify.sh) from the repository root to check the brand
copies and the transitional workspace. It requires a working `uv` and the Python
version in [`.python-version`](.python-version) already installed. Exit codes:
`0` = all passed, `1` = a check failed, `2` = runtime error left checks incomplete.

<!-- import:section "## Optional Layers" -->

<!-- import:section "## Contributing" -->

## License

Original content in this repository is licensed under the [MIT License](LICENSE).
Vendored third-party files keep their upstream licence and attribution, recorded
beside them (for example the Paper view's PDF.js and the paper wiki viewer's
libraries, each in its `vendor/` folder).

<!-- import:section "## Roadmap" -->

<!-- import:section "## Similar Projects" -->
