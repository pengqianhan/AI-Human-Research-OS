# os-ui - Research OS Read-only Desktop

`os-ui/` is a read-only observation window for the AI-Human Research OS. It
renders the repository's current state in a browser using a desktop-OS
metaphor. It does not execute actions or write source files; the filesystem
remains the only source of truth. Removing `os-ui/` does not affect the OS
itself.

A Chinese copy of the previous overview is kept at [README_zh.md](README_zh.md).
The current build direction is English-first; Chinese UI support can be added
later when the OS is more mature.

## Interface

The UI opens as a dot-grid desktop with three layers:

- **Menu bar**: the OS name, a snapshot freshness chip, and the
  `agent_led_research` policy chip. Hover the snapshot chip to see the full
  generated timestamp, schema version, and repository HEAD.
- **Windows**: four draggable, resizable, minimizable macOS-style windows:
  **Dashboard**, **Projects**, **Skill Store**, and **Paper Wiki** (the
  standalone `paper-wiki/viz.html` graph viewer, embedded by iframe — see
  DESIGN.md §4).
- **Dock**: app icons on the left and copy-only command buttons on the right
  for Claude Code, Codex, and snapshot regeneration.

All displayed data comes from one cache file:
`frontend/public/state.json`. The generator creates that file by scanning the
repository's Markdown files. The frontend polls it every five seconds. Missing
data renders as honest empty states; neither generator nor frontend invents
facts.

## Quick Start

Run from the repository root:

```bash
./os-ui/start.sh
./os-ui/start.sh --watch
```

`--watch` keeps the generator running in the foreground so changes in the
repository are reflected in `state.json`. Ctrl-C stops both generator and
frontend.

Manual two-step flow:

```bash
cd os-ui/generator
uv run python generate.py
# or:
uv run python generate.py --watch
```

```bash
cd os-ui/frontend
npm install
npm run dev
```

The dev server prints a URL, usually `http://localhost:5173/`.

Build a static bundle:

```bash
cd os-ui/frontend
npm run build
```

The output goes to `frontend/dist/`, which is gitignored.

## Design Stance

1. **Read-only dashboard, not a console**. Every apparent action copies a
   command for the human to run elsewhere. Real execution buttons remain behind
   GOAL.md M4.
2. **`state.json` is the only contract** between generator and frontend. The
   generator knows Markdown; the frontend knows schema.
3. **Honest state beats fake realtime**. The UI shows evidence sources,
   timestamps, staleness, and empty states instead of pretending to know more
   than the files contain.
4. **Desktop shell, research cockpit content**. The visual identity is
   engineering graph paper plus flight-progress strips, not a generic product
   dashboard.

The desktop shell was inspired by [wanman.ai](https://wanman.ai/) and
[chekusu/wanman](https://github.com/chekusu/wanman), but keeps this OS's own
palette, typography, and read-only semantics.

## Follow-up Queue

- [ ] Persist window layout in `localStorage`.
- [ ] Add keyboard move/resize controls for windows.
- [ ] Feed the round score track from real `Code/runs/<round-id>/result.json`
      files after circle_packing M2 lands.
- [ ] Split governance or activity into separate dock apps only if real use
      shows that the Dashboard is too dense.
- [ ] M4-gated: replace polling with a small file-watching service plus SSE.
- [ ] M4-gated: add real execution endpoints and buttons.
- [ ] M4-gated: add `agent_activity` heartbeat semantics only if OS Feedback
      proves that observed repository state is insufficient.

## Directory

```text
os-ui/
  README.md          # English overview and launch guide
  README_zh.md       # Chinese overview retained for reference
  start.sh           # one-command launcher
  DESIGN.md          # architecture, schema, state semantics, and visual spec
  mockup.html        # static visual mockup with fake data
  generator/         # Python read-only scanner -> state.json
  frontend/          # Vite + React + TypeScript + Tailwind desktop UI
```
