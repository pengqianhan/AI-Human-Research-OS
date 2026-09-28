"""Render the brand PNGs from their SVG sources.

Run from the repository root after editing an SVG:

    python docs/brand/render.py

Needs Python 3.9+ with Playwright and its Chromium (`pip install playwright`,
`playwright install chromium`). IBM Plex Mono is loaded from Google Fonts so
the wordmark renders in its real face; without network the lockups fall back
to another monospace font, so check them before committing.
"""

import re
from pathlib import Path

from playwright.sync_api import sync_playwright

HERE = Path(__file__).resolve().parent
FONTS = '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;700&display=swap">'
PAPER = "#F2F4F3"
SCALE = 4  # lockup PNG width = viewBox width x SCALE

# (source svg, output png, width in px or None for viewBox width x SCALE, background or None)
JOBS = [
    ("logo-mark.svg", "logo-mark.png", 1024, None),
    ("logo-mark-white.svg", "logo-mark-white.png", 1024, None),
    ("app-icon.svg", "app-icon.png", 1024, None),
    ("favicon.svg", "favicon-256.png", 256, None),
    ("logo-lockup.svg", "logo-lockup.png", None, None),
    ("logo-lockup.svg", "logo-lockup-on-paper.png", None, PAPER),
    ("logo-lockup-white.svg", "logo-lockup-white.png", None, None),
]


def viewbox_width(svg: str) -> float:
    return float(re.search(r'viewBox="[-\d.]+ [-\d.]+ ([\d.]+) [\d.]+"', svg).group(1))


def main() -> None:
    with sync_playwright() as p:
        browser = p.chromium.launch()
        for src, out, width, background in JOBS:
            svg = (HERE / src).read_text(encoding="utf-8")
            px = width or round(viewbox_width(svg) * SCALE)
            # drop the root's fixed size so the SVG fills the box
            inline = re.sub(r'(<svg[^>]*?)\s+width="[\d.]+"\s+height="[\d.]+"', r"\1", svg, count=1)
            html = (
                f'<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>'
                f"html,body{{margin:0;background:{background or 'transparent'}}}"
                f"#box{{width:{px}px;display:inline-block;line-height:0}}"
                "svg{width:100%;height:auto;display:block}"
                f'</style></head><body><div id="box">{inline}</div></body></html>'
            )
            page = browser.new_page(viewport={"width": px + 20, "height": px + 20})
            page.set_content(html, wait_until="networkidle")
            page.evaluate("document.fonts.ready")
            page.locator("#box").screenshot(path=str(HERE / out), omit_background=background is None)
            page.close()
            print(f"{out}: {px} px")
        browser.close()


if __name__ == "__main__":
    main()
