# Brand assets

The AI-Human Research OS logo, for the README, talks, social posts, and the
desktop UI. Everything here is MIT-licensed with the repository.

## The mark

A desktop window (the OS) holding one small diagram: a filled dot (the human)
and an orange ring (the agent) joined side by side, branching down to three
squares (the projects). It says what the OS is in one glance: a human and a
root agent, together at the top, running many projects in one place. The
window's three traffic lights come from the os-ui desktop.

## Files

| File | Use |
|---|---|
| [logo-mark.svg](logo-mark.svg) | Color mark on light backgrounds. Vector; scale freely. |
| [logo-mark-white.svg](logo-mark-white.svg) | Mark for dark backgrounds (white lines, orange ring, colored lights). |
| [logo-mark-mono.svg](logo-mark-mono.svg) | One-color mark; takes the surrounding `currentColor` (inline it, or set `color` on an `<img>` wrapper). For print, stamps, and disabled states. |
| [logo-lockup.svg](logo-lockup.svg) | Mark plus wordmark, horizontal. Its text needs IBM Plex Mono installed; use the PNG where you cannot control fonts. |
| [logo-lockup-white.svg](logo-lockup-white.svg) | The lockup for dark backgrounds: white mark and “RESEARCH”, mist-grey “AI-HUMAN”, orange ring and “OS”. |
| [app-icon.svg](app-icon.svg) | Ink tile with the OS's dot grid and the white mark. Rounded corners at 22%; masks well to a circle. |
| [favicon.svg](favicon.svg) | The pair only (dot and ring) on an ink tile, for 16–48 px. |
| [logo-mark.png](logo-mark.png), [logo-mark-white.png](logo-mark-white.png), [app-icon.png](app-icon.png) | 1024 px PNG exports, transparent background. |
| [logo-lockup.png](logo-lockup.png), [logo-lockup-white.png](logo-lockup-white.png), [logo-lockup-on-paper.png](logo-lockup-on-paper.png) | PNG exports of the lockup at 4× its viewBox width: transparent for light backgrounds, transparent for dark backgrounds, and on the paper color (rendered from `logo-lockup.svg`). |
| [favicon-256.png](favicon-256.png) | 256 px PNG of the favicon. |

Every PNG is rendered from its SVG by [render.py](render.py) (headless
Chromium, IBM Plex Mono from Google Fonts). The SVGs are the source of truth:
after editing one, run `python docs/brand/render.py` from the repository root.

## Where the assets are used

- The repository [README](../../README.md) opens with the lockup:
  [logo-lockup.png](logo-lockup.png) in light mode and
  [logo-lockup-white.png](logo-lockup-white.png) in dark mode, switched by a
  `<picture>` element; renderers that ignore it get
  [logo-lockup-on-paper.png](logo-lockup-on-paper.png), readable on any background.
- [os-ui](../../os-ui/README.md) shows the favicon as its browser-tab icon from
  tracked copies, [favicon.svg](../../os-ui/frontend/public/favicon.svg) and
  [favicon-256.png](../../os-ui/frontend/public/favicon-256.png). After changing
  an original, copy it again; `./verify.sh` fails while they differ.

## Colors and type

The logo uses the os-ui palette ([os-ui/DESIGN.md](../../os-ui/DESIGN.md) §7)
plus one brand-only tint for dark backgrounds:

| Token | Hex | Light versions | Dark versions (`-white`) |
|---|---|---|---|
| ink | `#17262E` | window, human dot, projects, “RESEARCH” | the background |
| paper | `#F2F4F3` | window fill; the light background | window, human dot, projects, “RESEARCH” |
| signal | `#E8590C` | the agent ring and “OS” | the same |
| verify / warn / danger | `#2F7D6D` / `#B7791F` / `#C4564A` | the three window lights | the same |
| ink-soft | `#52646E` | “AI-HUMAN” | — (too dark on ink) |
| mist (brand only) | `#9FB0B8` | — | “AI-HUMAN” |

Wordmark: IBM Plex Mono, “AI-HUMAN” at 500 with wide tracking, “RESEARCH OS”
at 700. Body text next to the logo: IBM Plex Sans.

## Usage

- Clear space: keep at least the window's stroke width ×2 (about 10% of the
  mark's width) free on every side.
- Minimum size: the full mark at 24 px or larger; below that use `favicon.svg`.
- On photos or colored backgrounds use the white or mono mark, not the color one.
- Keep the ring orange and the dot filled; swapping them changes the meaning
  (the human is the solid one).
- Do not stretch, rotate, add effects, or set the wordmark in another face.

A canvas with these variants laid out for comparison lives in the Human
Owner's claude.ai artifacts (“Research OS Logo”).
