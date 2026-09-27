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
| [logo-lockup-white.svg](logo-lockup-white.svg) | The lockup for dark backgrounds (white mark and text, orange ring and “OS”). |
| [app-icon.svg](app-icon.svg) | Ink tile with the OS's dot grid and the white mark. Rounded corners at 22%; masks well to a circle. |
| [favicon.svg](favicon.svg) | The pair only (dot and ring) on an ink tile, for 16–48 px. |
| `logo-mark.png`, `logo-mark-white.png`, `app-icon.png` | 1024 px PNG exports, transparent background. |
| `logo-lockup.png`, `logo-lockup-white.png`, `logo-lockup-on-paper.png` | 1740 px PNG exports of the lockup: transparent for light backgrounds, transparent for dark backgrounds, and on the paper color. |
| `favicon-256.png` | 256 px PNG of the favicon. |

The PNGs were rendered from the SVGs with headless Chromium (IBM Plex Mono
loaded from Google Fonts for the wordmark). Re-render them after editing an
SVG; keep the SVGs as the source of truth.

## Where the assets are used

- The repository [README](../../README.md) opens with the lockup:
  `logo-lockup.png` in light mode and `logo-lockup-white.png` in dark mode,
  switched by a `<picture>` element.
- [os-ui](../../os-ui/README.md) shows `favicon.svg` as its browser-tab icon
  from a copy at `os-ui/frontend/public/favicon.svg`; replace that copy when
  the favicon changes.

## Colors and type

The logo uses the os-ui palette (`os-ui/DESIGN.md` §7):

| Token | Hex | In the logo |
|---|---|---|
| ink | `#17262E` | window, human dot, projects, wordmark |
| paper | `#F2F4F3` | window fill; the light background |
| signal | `#E8590C` | the agent ring and “OS” |
| verify / warn / danger | `#2F7D6D` / `#B7791F` / `#C4564A` | the three window lights |
| ink-soft | `#52646E` | “AI-HUMAN” in the wordmark |

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
