#!/usr/bin/env python3
"""Static acceptance checks for explain-paper-html outputs."""

from __future__ import annotations

import argparse
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import re
import shutil
import subprocess
import sys
import tempfile
from urllib.parse import unquote, urlsplit


VOID_TAGS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input", "link",
    "meta", "param", "source", "track", "wbr",
}
RESOURCE_ATTRIBUTES = {
    "script": ("src",), "link": ("href",), "img": ("src",),
    "iframe": ("src",), "source": ("src",), "video": ("src", "poster"),
    "audio": ("src",), "object": ("data",), "embed": ("src",),
    "input": ("src",), "track": ("src",), "image": ("href", "xlink:href"),
    "use": ("href", "xlink:href"), "base": ("href",), "form": ("action",),
}
ROLE_PATTERNS = {
    "background": r"background|context|motivation|problem|prerequisite|gap|背景|问题|动机|位置|承接",
    "intuition": r"intuition|core idea|mental model|核心|直觉|核心模型",
    "mechanism": r"method|mechanism|architecture|walkthrough|algorithm|proof|system|implementation|semantics|pipeline|方法|机制|架构|证明|实现|语义|流水|标签|令牌|语言",
    "evidence": r"experiment|evaluation|result|evidence|benchmark|case stud|实验|结果|证据|案例|评估",
    "limitations": r"limitation|boundary|assumption|misread|discussion|critique|contribution|限制|边界|假设|误读|讨论|评价|贡献|适用",
    "quiz": r"quiz|knowledge check|理解测验|测验|小测|问答",
}
PLACEHOLDER_PATTERNS = {
    "template braces": r"\{\{[^{}]+\}\}|\{%[^%]+%\}|<%[^%]+%>",
    "placeholder word": r"\b(?:TODO|FIXME|TBD|PLACEHOLDER|LOREM\s+IPSUM)\b",
    "generator expression": r"(?:Array\.from|\.map|\.join)\s*\(|=>\s*<",
    "unexpanded interpolation": r"\$\{[^{}]+\}",
}


class ExplanationParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.declared = False
        self.stack: list[tuple[str, bool]] = []
        self.errors: list[str] = []
        self.tag_counts: Counter[str] = Counter()
        self.ids: list[str] = []
        self.links: list[tuple[str, bool]] = []
        self.resources: list[tuple[str, str]] = []
        self.styles: list[str] = []
        self.scripts: list[tuple[dict[str, str], str]] = []
        self.pre_attrs: list[dict[str, str]] = []
        self.headings: list[str] = []
        self.section_roles: set[str] = set()
        self.visible: list[str] = []
        self.comments: list[str] = []
        self.attr_text: list[str] = []
        self.inline_styles: list[str] = []
        self.quiz_markup_count = 0
        self.toc_depth = 0
        self._capture_tag: str | None = None
        self._capture_attrs: dict[str, str] = {}
        self._capture_data: list[str] = []
        self._heading_tag: str | None = None
        self._heading_data: list[str] = []

    def handle_decl(self, decl: str) -> None:
        if decl.lower().startswith("doctype html"):
            self.declared = True

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        tag = tag.lower()
        self.tag_counts[tag] += 1
        attr = {key.lower(): value or "" for key, value in attrs}
        names = [key.lower() for key, _ in attrs]
        duplicates = [name for name, count in Counter(names).items() if count > 1]
        if duplicates:
            self.errors.append(f"<{tag}> repeats attributes: {', '.join(duplicates)}")
        if attr.get("id"):
            self.ids.append(attr["id"])
        self.attr_text.extend(value for key, value in attr.items() if key not in {"style", "onclick"})
        if attr.get("style"):
            self.inline_styles.append(attr["style"])

        classes = set(attr.get("class", "").split())
        if "data-quiz-question" in attr or "quiz-question" in classes:
            self.quiz_markup_count += 1
        starts_toc = tag == "nav" and ("toc" in classes or attr.get("aria-label", "").lower() == "table of contents")
        if starts_toc:
            self.toc_depth += 1
        if tag not in VOID_TAGS:
            self.stack.append((tag, starts_toc))

        if tag == "a" and attr.get("href"):
            self.links.append((attr["href"], self.toc_depth > 0))
        for resource_attr in RESOURCE_ATTRIBUTES.get(tag, ()):
            if attr.get(resource_attr):
                self.resources.append((tag, attr[resource_attr]))
        if tag == "pre":
            self.pre_attrs.append(attr)
        if tag == "section":
            roles = re.split(r"[\s,]+", attr.get("data-explain-role", "").strip())
            self.section_roles.update(role.lower() for role in roles if role)
        if tag in {"style", "script"}:
            self._capture_tag = tag
            self._capture_attrs = attr
            self._capture_data = []
        if tag in {"h1", "h2", "h3"}:
            self._heading_tag = tag
            self._heading_data = []

    def handle_startendtag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag.lower() not in VOID_TAGS:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        tag = tag.lower()
        if self._heading_tag == tag:
            self.headings.append(" ".join("".join(self._heading_data).split()))
            self._heading_tag = None
            self._heading_data = []
        if self._capture_tag == tag:
            content = "".join(self._capture_data)
            if tag == "style":
                self.styles.append(content)
            else:
                self.scripts.append((self._capture_attrs, content))
            self._capture_tag = None
            self._capture_attrs = {}
            self._capture_data = []
        if tag in VOID_TAGS:
            return
        open_tags = [entry[0] for entry in self.stack]
        if tag not in open_tags:
            self.errors.append(f"unexpected </{tag}>")
            return
        if self.stack[-1][0] != tag:
            self.errors.append(f"misnested </{tag}> while <{self.stack[-1][0]}> is open")
        while self.stack:
            opened, started_toc = self.stack.pop()
            if started_toc:
                self.toc_depth -= 1
            if opened == tag:
                break

    def handle_data(self, data: str) -> None:
        if self._capture_tag:
            self._capture_data.append(data)
        else:
            self.visible.append(data)
        if self._heading_tag:
            self._heading_data.append(data)

    def handle_comment(self, data: str) -> None:
        self.comments.append(data)

    def finish(self) -> None:
        if self.stack:
            self.errors.append("unclosed tags: " + ", ".join(tag for tag, _ in self.stack[-8:]))


def is_external_or_local_resource(value: str) -> bool:
    value = value.strip()
    if not value or value.startswith(("#", "data:")):
        return False
    return True


def selector_matches_pre(selector: str, attrs: dict[str, str]) -> bool:
    selector = re.sub(r":[\w-]+(?:\([^)]*\))?", "", selector.strip())
    selector = re.split(r"\s+|>|\+|~", selector)[-1]
    tag_match = re.match(r"^[a-zA-Z][\w-]*|^\*", selector)
    if tag_match and tag_match.group(0).lower() not in {"pre", "*"}:
        return False
    wanted_id = re.findall(r"#([\w-]+)", selector)
    if wanted_id and attrs.get("id") not in wanted_id:
        return False
    present = set(attrs.get("class", "").split())
    if not set(re.findall(r"\.([\w-]+)", selector)).issubset(present):
        return False
    return bool(tag_match or wanted_id or "." in selector)


def specificity(selector: str) -> tuple[int, int, int]:
    return (
        selector.count("#"),
        len(re.findall(r"\.[\w-]+|:[\w-]+", selector)),
        1 if re.match(r"^[a-zA-Z][\w-]*", selector.strip()) else 0,
    )


def effective_pre_whitespace(styles: str, attrs: dict[str, str]) -> str | None:
    candidates: list[tuple[int, tuple[int, int, int], int, str]] = []
    order = 0
    css = re.sub(r"/\*.*?\*/", "", styles, flags=re.S)
    for selectors, declarations in re.findall(r"([^{}]+)\{([^{}]*)\}", css):
        match = re.search(r"(?:^|;)\s*white-space\s*:\s*([\w-]+)\s*(!important)?", declarations, re.I)
        if not match:
            continue
        for selector in selectors.split(","):
            order += 1
            if selector_matches_pre(selector, attrs):
                candidates.append((1 if match.group(2) else 0, specificity(selector), order, match.group(1).lower()))
    inline = re.search(r"(?:^|;)\s*white-space\s*:\s*([\w-]+)\s*(!important)?", attrs.get("style", ""), re.I)
    if inline:
        candidates.append((1 if inline.group(2) else 0, (1000, 0, 0), order + 1, inline.group(1).lower()))
    return max(candidates)[-1] if candidates else None


def quiz_count(scripts: str, parser: ExplanationParser) -> int:
    arrays = re.findall(
        r"\b(?:const|let|var)\s+(?:qs|questions|quizQuestions|quiz_items)\s*=\s*\[(.*?)\]\s*;",
        scripts,
        flags=re.I | re.S,
    )
    dynamic = max(
        (len(re.findall(r"(?:^|,)\s*\{\s*(?:q|question)\s*:", body, re.I | re.S)) for body in arrays),
        default=0,
    )
    return parser.quiz_markup_count or dynamic


def validate(path: Path, skip_js: bool) -> tuple[list[str], list[str], list[str]]:
    failures: list[str] = []
    passes: list[str] = []
    unrun: list[str] = []
    try:
        source = path.read_text(encoding="utf-8")
    except (OSError, UnicodeError) as exc:
        return [], [f"cannot read UTF-8 HTML: {exc}"], []

    parser = ExplanationParser()
    try:
        parser.feed(source)
        parser.close()
        parser.finish()
    except Exception as exc:  # HTMLParser can raise on malformed entity state.
        failures.append(f"HTML parser raised {type(exc).__name__}: {exc}")
    structural_failures: list[str] = []
    if not parser.declared:
        structural_failures.append("missing <!doctype html>")
    structural_failures.extend(parser.errors)
    if parser.tag_counts["html"] != 1 or parser.tag_counts["body"] != 1:
        structural_failures.append("expected exactly one <html> and one <body>")
    failures.extend(structural_failures)
    if not structural_failures:
        passes.append("HTML parsed with balanced structure")

    duplicates = sorted(value for value, count in Counter(parser.ids).items() if count > 1)
    if duplicates:
        failures.append("duplicate IDs: " + ", ".join(duplicates))
    else:
        passes.append(f"IDs are unique ({len(parser.ids)})")

    id_set = set(parser.ids)
    toc_links = [href for href, in_toc in parser.links if in_toc]
    if not toc_links:
        failures.append("table of contents has no links")
    broken_anchors = sorted({href for href in toc_links if href.startswith("#") and unquote(href[1:]) not in id_set})
    non_anchor_toc = [href for href in toc_links if not href.startswith("#")]
    if broken_anchors:
        failures.append("unresolved TOC anchors: " + ", ".join(broken_anchors))
    if non_anchor_toc:
        failures.append("TOC entries must be local anchors: " + ", ".join(non_anchor_toc))
    if toc_links and not broken_anchors and not non_anchor_toc:
        passes.append(f"table of contents resolves ({len(toc_links)} anchors)")

    broken_pages: list[str] = []
    for href, _ in parser.links:
        parts = urlsplit(href)
        if parts.scheme or not parts.path:
            continue
        target = (path.parent / unquote(parts.path)).resolve()
        if not target.is_file():
            broken_pages.append(href)
    if broken_pages:
        failures.append("missing local cross-page links: " + ", ".join(sorted(set(broken_pages))))
    else:
        local_count = sum(1 for href, _ in parser.links if urlsplit(href).path and not urlsplit(href).scheme)
        passes.append(f"local cross-page links resolve ({local_count})")

    resource_violations = [f"<{tag}> {value}" for tag, value in parser.resources if is_external_or_local_resource(value)]
    all_css = "\n".join(parser.styles + parser.inline_styles)
    css_urls = re.findall(r"url\(\s*['\"]?([^)'\"]+)", all_css, re.I)
    resource_violations.extend(f"CSS url({value})" for value in css_urls if is_external_or_local_resource(value))
    css_imports = re.findall(r"@import\s+['\"]([^'\"]+)", all_css, re.I)
    resource_violations.extend(f"CSS @import {value}" for value in css_imports if is_external_or_local_resource(value))
    if resource_violations:
        failures.append("non-inline resources: " + "; ".join(resource_violations))
    else:
        passes.append("resources are self-contained")

    heading_text = " ".join(parser.headings)
    discovered = set(parser.section_roles)
    for role, pattern in ROLE_PATTERNS.items():
        if re.search(pattern, heading_text, re.I):
            discovered.add(role)
    missing_roles = sorted(set(ROLE_PATTERNS) - discovered)
    if parser.tag_counts["h1"] != 1:
        failures.append(f"expected exactly one h1, found {parser.tag_counts['h1']}")
    if parser.tag_counts["title"] != 1:
        failures.append(f"expected exactly one title, found {parser.tag_counts['title']}")
    if missing_roles:
        failures.append("missing required sections: " + ", ".join(missing_roles))
    else:
        passes.append("required lesson sections are present")

    styles = "\n".join(parser.styles)
    bad_pre = []
    for index, attrs in enumerate(parser.pre_attrs, 1):
        value = effective_pre_whitespace(styles, attrs)
        if value not in {"pre", "pre-wrap"}:
            bad_pre.append(f"pre #{index} has white-space={value or 'unset'}")
    if bad_pre:
        failures.append("; ".join(bad_pre))
    else:
        passes.append(f"pre whitespace is preserved ({len(parser.pre_attrs)} blocks)")

    scripts = "\n".join(content for _, content in parser.scripts)
    if re.search(r"\b(?:fetch|WebSocket|EventSource)\s*\(|\bnew\s+XMLHttpRequest\s*\(", scripts):
        failures.append("inline JavaScript uses a network API")
    count = quiz_count(scripts, parser)
    if count != 5:
        failures.append(f"expected exactly five quiz questions, found {count}")
    else:
        passes.append("exactly five quiz questions found")
    quiz_signals = {
        "correct state": r"\bcorrect\b",
        "incorrect state": r"\b(?:wrong|incorrect)\b",
        "feedback": r"\bfeedback\b",
        "click handler": r"onclick|addEventListener\s*\(\s*['\"]click",
    }
    missing_signals = [name for name, pattern in quiz_signals.items() if not re.search(pattern, source, re.I)]
    if missing_signals:
        failures.append("quiz feedback hooks missing: " + ", ".join(missing_signals))
    else:
        passes.append("quiz exposes correct, incorrect, and explanatory feedback hooks")

    visible_source = " ".join(parser.visible + parser.comments + parser.attr_text)
    residuals = [name for name, pattern in PLACEHOLDER_PATTERNS.items() if re.search(pattern, visible_source, re.I | re.S)]
    if residuals:
        failures.append("visible placeholders or generator fragments: " + ", ".join(residuals))
    else:
        passes.append("no visible placeholders or generator fragments")

    executable = [(attrs, content) for attrs, content in parser.scripts if not attrs.get("src") and attrs.get("type", "text/javascript") in {"", "text/javascript", "module"}]
    if skip_js:
        unrun.append("inline JavaScript syntax (--skip-js)")
    elif not executable:
        failures.append("no inline executable JavaScript found")
    elif not shutil.which("node"):
        unrun.append("inline JavaScript syntax (Node unavailable)")
    else:
        with tempfile.TemporaryDirectory(prefix="explain-paper-html-js-") as temp_dir:
            for index, (_, content) in enumerate(executable, 1):
                suffix = ".mjs" if executable[index - 1][0].get("type") == "module" else ".js"
                script_path = Path(temp_dir) / f"inline-{index}{suffix}"
                script_path.write_text(content, encoding="utf-8")
                result = subprocess.run(["node", "--check", str(script_path)], capture_output=True, text=True)
                if result.returncode:
                    failures.append(f"inline script #{index} syntax: {(result.stderr or result.stdout).strip()}")
        if not any("inline script" in item for item in failures):
            passes.append(f"inline JavaScript syntax is valid ({len(executable)} scripts)")

    return passes, failures, unrun


def main() -> int:
    argument_parser = argparse.ArgumentParser(description=__doc__)
    argument_parser.add_argument("html", type=Path, help="self-contained explanation HTML")
    argument_parser.add_argument("--skip-js", action="store_true", help="report JavaScript syntax validation as unrun")
    args = argument_parser.parse_args()

    path = args.html.resolve()
    passes, failures, unrun = validate(path, args.skip_js)
    print(f"Verification: {path}")
    for item in passes:
        print(f"PASS  {item}")
    for item in failures:
        print(f"FAIL  {item}")
    for item in unrun:
        print(f"UNRUN {item}")
    if failures:
        print(f"RESULT FAIL ({len(failures)} failed, {len(unrun)} unrun)")
        return 1
    if unrun:
        print(f"RESULT INCOMPLETE (0 failed, {len(unrun)} unrun)")
        return 2
    print(f"RESULT PASS ({len(passes)} checks)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
