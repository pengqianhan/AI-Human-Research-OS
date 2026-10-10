---
status: accepted
---

# Wrap os-ui in an Electron desktop client

On 2026-10-10 the Human Owner asked for the Research OS as a client covering
macOS, Linux, and Windows: 「我想把这个 Research OS 做成一个客户端 … 客户端要覆盖
Mac、Linux 和 Windows 三个系统。」 GOAL.md M4 lists the desktop wrapper among the
items that need a new Human Owner authorization; this request is that
authorization for the wrapper only.

Until then the live os-ui ran only as a Vite dev server started by
`./os-ui/start.sh`. That needs a terminal, `bash` (Git Bash on Windows), Node,
and a pasted token, and it dies with the terminal.

The client is [`os-ui/client/`](../../os-ui/client/README.md), an Electron app:

- **Same UI.** It loads the os-ui frontend's production build, which turns
  live when the client's preload bridge is present.
- **Same endpoints.** The four dev-server plugins' logic moved into
  `os-ui/frontend/server/`. The Vite plugins and the client's `app://`
  protocol both call it, so there is one copy of every endpoint rule.
- **Same execution surface.** The client adds no write action on repository
  content. What it adds lives and dies with the app: choosing a folder,
  regenerating the cache `state.json`, a prerequisites check, and
  notifications when an agent turn ends.
- **Same scripts.** Python scripts and research files are read from the chosen
  folder, never bundled. Agent turns still go through os-harness on the
  user's own Claude Code or Codex login (ADR-0003).

## Considered options

- **Tauri.** Its installers are small, but the Node endpoints would have to be
  rewritten in Rust or shipped as a sidecar, and the build would need a Rust
  toolchain. TypeScript is already unfamiliar to the Human Owner, and Rust
  would add a third language.
- **A local server opened in the system browser.** This is the least code, but
  it is not an app: there is no folder picker, no notifications, and no dock
  icon. Its port would also be reachable by every local process and browser tab.
- **Keeping only `start.sh`.** This leaves Windows users on Git Bash and every
  user in a terminal.

## Consequences

- **Security.** The Paper Wiki viewer renders note HTML, so it runs on its own
  origin, `app://paper-wiki`, under a strict CSP. The app's writes must be
  JSON, and the agent endpoints need a per-launch token, as on the dev server
  (DESIGN.md §3).
- **Generator.** A workspace without Git now works: `generate.py` takes the
  root by layout first and skips `git` when there is no `.git`. The Paper Wiki
  viewer probes its status endpoint on any non-`file:` page.
- **Distribution.** Installers are CI artifacts only. Publishing them, signing
  them with a paid identity, and auto-update stay unauthorized; the app drives
  users' subscriptions, so the provider terms come first.
- **Tests.** The shared endpoints are tested in the required CI job. The client
  is tested in the advisory `desktop.yml` on six OS and architecture rows.
