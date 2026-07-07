#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Create or merge a paper_body profile for paper-wiki.toml.

The script is intentionally dependency-free. An agent can use it in two ways:

* pass only a natural-language description and let the script infer a draft;
* pass explicit --section values derived from the user's template request.

By default it safely merges the profile into an existing config, preserving the
current file layout where possible. Use --preview to print the TOML without
writing.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
import tomllib
from dataclasses import dataclass
from pathlib import Path
from typing import Any

CONFIG_NAME = "paper-wiki.toml"
DEFAULT_CONFIG_PATH = Path(__file__).resolve().parents[1] / "assets" / CONFIG_NAME


@dataclass(frozen=True)
class ProfileDraft:
    name: str
    description: str
    sections: list[str]
    section_descriptions: dict[str, str]


DEFAULT_SECTION_DESCRIPTIONS = {
    "Problem": "The problem, gap, or question the paper addresses.",
    "Contribution": "The paper's main claimed contribution and why it matters.",
    "Evidence": "The evidence, experiments, analyses, or examples supporting the claims.",
    "Assumptions": "Important assumptions, scope boundaries, and dependencies behind the result.",
    "Strengths": "What the paper does well or contributes clearly.",
    "Weaknesses": "Limitations, fragile assumptions, or under-supported claims.",
    "Missing Evidence": "Evidence, experiments, baselines, or analyses that would strengthen the paper.",
    "Questions": "Questions to answer during deeper reading or follow-up work.",
    "Decision": "Reader-owned decision about relevance, priority, or next action.",
    "Implementation Plan": "Concrete steps for implementing or adapting the paper's method.",
    "Reproduction Checklist": "Artifacts, data, metrics, and commands needed to reproduce the result.",
    "Research Fit": "How the paper connects to the current research direction or project.",
    "Use Cases": "Practical situations where the method, result, or insight may be useful.",
    "Risks": "Technical, empirical, or adoption risks to keep in mind.",
}

PROFILE_RULES = [
    (
        "implementation",
        {
            "implement",
            "implementation",
            "reproduce",
            "reproduction",
            "replicate",
            "code",
            "artifact",
            "benchmark",
            "engineering",
            "debug",
            "\u590d\u73b0",
            "\u5b9e\u73b0",
            "\u4ee3\u7801",
            "\u5de5\u7a0b",
        },
        [
            "What To Reproduce",
            "Algorithm",
            "Data",
            "Metrics",
            "Engineering Notes",
            "Failure Modes",
        ],
    ),
    (
        "survey-card",
        {
            "survey",
            "literature",
            "map",
            "taxonomy",
            "compare",
            "comparison",
            "related work",
            "\u7efc\u8ff0",
            "\u6587\u732e",
            "\u5bf9\u6bd4",
            "\u5206\u7c7b",
        },
        [
            "One-line Takeaway",
            "Research Context",
            "Method Family",
            "Compared With",
            "Useful For",
            "Open Questions",
        ],
    ),
    (
        "critique-card",
        {
            "critique",
            "review",
            "reviewer",
            "assumption",
            "weakness",
            "gap",
            "evidence gap",
            "limitation",
            "\u5ba1\u7a3f",
            "\u6279\u5224",
            "\u5c40\u9650",
            "\u7f3a\u53e3",
        },
        [
            "Summary",
            "Contribution",
            "Evidence",
            "Assumptions",
            "Weaknesses",
            "Missing Evidence",
            "Questions",
        ],
    ),
    (
        "quick-card",
        {
            "quick",
            "skim",
            "first pass",
            "flashcard",
            "short",
            "brief",
            "\u5feb\u901f",
            "\u901f\u8bfb",
            "\u5361\u7247",
            "\u7b80\u77ed",
        },
        [
            "One-line Takeaway",
            "Problem",
            "Method",
            "Evidence",
            "Research Fit",
            "Questions",
        ],
    ),
    (
        "project-fit",
        {
            "idea",
            "project",
            "fit",
            "useful",
            "apply",
            "application",
            "next step",
            "\u60f3\u6cd5",
            "\u9879\u76ee",
            "\u9002\u5408",
            "\u5e94\u7528",
        },
        [
            "One-line Takeaway",
            "Contribution",
            "Useful For",
            "Research Fit",
            "Implementation Plan",
            "Risks",
            "Decision",
        ],
    ),
]

FALLBACK_SECTIONS = [
    "Summary",
    "Key Ideas",
    "Method",
    "Experiments",
    "Limitations",
    "Notes",
    "Related",
    "Citations",
]


def _load_config(config_path: Path) -> dict[str, Any]:
    if not config_path.exists():
        return {}
    return tomllib.loads(config_path.read_text(encoding="utf-8"))


def _paper_body(config: dict[str, Any]) -> dict[str, Any]:
    value = config.get("paper_body", {})
    return value if isinstance(value, dict) else {}


def _section_descriptions(config: dict[str, Any]) -> dict[str, str]:
    value = _paper_body(config).get("section_descriptions", {})
    if not isinstance(value, dict):
        return {}
    return {str(key): str(desc) for key, desc in value.items() if isinstance(desc, str)}


def _profiles(config: dict[str, Any]) -> dict[str, Any]:
    value = _paper_body(config).get("profiles", {})
    return value if isinstance(value, dict) else {}


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9_-]+", "-", value.casefold()).strip("-_")
    slug = re.sub(r"-{2,}", "-", slug)
    return slug


def _toml_string(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)


def _toml_key(value: str) -> str:
    if re.fullmatch(r"[A-Za-z0-9_-]+", value):
        return value
    return _toml_string(value)


def _format_string_list(values: list[str]) -> str:
    lines = ["["]
    for value in values:
        lines.append(f"  {_toml_string(value)},")
    lines.append("]")
    return "\n".join(lines)


def _score_rule(description: str, keywords: set[str]) -> int:
    haystack = description.casefold()
    return sum(1 for keyword in keywords if keyword in haystack)


def _best_rule(description: str) -> tuple[str, list[str]]:
    best_name = "research-note"
    best_sections = FALLBACK_SECTIONS
    best_score = 0
    for name, keywords, sections in PROFILE_RULES:
        score = _score_rule(description, keywords)
        if score > best_score:
            best_name = name
            best_sections = sections
            best_score = score
    return best_name, list(best_sections)


def _dedupe(values: list[str]) -> list[str]:
    out: list[str] = []
    seen: set[str] = set()
    for value in values:
        item = value.strip()
        if not item or item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def _parse_section_description(value: str) -> tuple[str, str]:
    if "=" not in value:
        raise ValueError("expected SECTION=DESCRIPTION")
    section, description = value.split("=", 1)
    section = section.strip()
    description = description.strip()
    if not section or not description:
        raise ValueError("expected non-empty SECTION=DESCRIPTION")
    return section, description


def _shorten(value: str, limit: int = 180) -> str:
    compact = " ".join(value.split())
    if len(compact) <= limit:
        return compact
    return compact[: limit - 1].rstrip() + "..."


def _fallback_description(section: str, profile_description: str) -> str:
    default = DEFAULT_SECTION_DESCRIPTIONS.get(section)
    if default:
        return default
    return (
        f"Custom guidance for the {section} section, derived from the profile "
        f"request: {_shorten(profile_description)}"
    )


def _validate_language(draft: ProfileDraft, language: str) -> None:
    if language != "english":
        return

    checked = {
        "profile description": draft.description,
        **{f"section {section!r}": section for section in draft.sections},
        **{
            f"section description for {section!r}": description
            for section, description in draft.section_descriptions.items()
        },
    }
    non_english = [label for label, value in checked.items() if not value.isascii()]
    if non_english:
        raise ValueError(
            "--language english requires ASCII profile text; revise "
            + ", ".join(non_english)
        )


def build_profile_draft(
    *,
    name: str | None,
    description: str,
    sections: list[str] | None,
    section_description_args: list[str] | None,
    language: str,
    config: dict[str, Any],
) -> ProfileDraft:
    if not description.strip():
        raise ValueError("--description must not be empty")

    inferred_name, inferred_sections = _best_rule(description)
    profile_name = _slugify(name or f"custom-{inferred_name}")
    if not profile_name:
        profile_name = "custom-profile"

    selected_sections = _dedupe(sections or inferred_sections)
    if not selected_sections:
        raise ValueError("at least one section is required")

    known_descriptions = _section_descriptions(config)
    custom_descriptions: dict[str, str] = {}
    for raw in section_description_args or []:
        section, section_description = _parse_section_description(raw)
        custom_descriptions[section] = section_description

    descriptions: dict[str, str] = {}
    for section in selected_sections:
        if section in custom_descriptions:
            descriptions[section] = custom_descriptions[section]
        elif section not in known_descriptions:
            descriptions[section] = _fallback_description(section, description)

    draft = ProfileDraft(
        name=profile_name,
        description=_shorten(description),
        sections=selected_sections,
        section_descriptions=descriptions,
    )
    _validate_language(draft, language)
    return draft


def format_profile_template(draft: ProfileDraft) -> str:
    lines: list[str] = []
    if draft.section_descriptions:
        lines.append("[paper_body.section_descriptions]")
        for section, description in draft.section_descriptions.items():
            lines.append(f"{_toml_string(section)} = {_toml_string(description)}")
        lines.append("")

    lines.append(f"[paper_body.profiles.{_toml_key(draft.name)}]")
    lines.append(f"description = {_toml_string(draft.description)}")
    lines.append(f"sections = {_format_string_list(draft.sections)}")
    return "\n".join(lines) + "\n"


def _find_table(lines: list[str], header: str) -> tuple[int, int] | None:
    start = None
    for idx, line in enumerate(lines):
        if line.strip() == header:
            start = idx
            break
    if start is None:
        return None
    end = len(lines)
    for idx in range(start + 1, len(lines)):
        stripped = lines[idx].strip()
        if stripped.startswith("[") and stripped.endswith("]"):
            end = idx
            break
    return start, end


def _remove_profile_table(text: str, profile_name: str) -> str:
    lines = text.splitlines()
    table = _find_table(lines, f"[paper_body.profiles.{profile_name}]")
    if table is None:
        return text
    start, end = table
    while start > 0 and not lines[start - 1].strip():
        start -= 1
    del lines[start:end]
    return "\n".join(lines).rstrip() + "\n"


def _insert_section_descriptions(
    text: str,
    descriptions: dict[str, str],
    existing_descriptions: dict[str, str],
) -> str:
    new_items = [
        (section, description)
        for section, description in descriptions.items()
        if section not in existing_descriptions
    ]
    if not new_items:
        return text

    lines = text.splitlines()
    table = _find_table(lines, "[paper_body.section_descriptions]")
    new_lines = [
        f"{_toml_string(section)} = {_toml_string(description)}"
        for section, description in new_items
    ]

    if table is None:
        block = ["", "[paper_body.section_descriptions]", *new_lines]
        return text.rstrip() + "\n" + "\n".join(block) + "\n"

    _start, end = table
    insert_at = end
    while insert_at > 0 and not lines[insert_at - 1].strip():
        insert_at -= 1
    lines[insert_at:insert_at] = new_lines
    return "\n".join(lines).rstrip() + "\n"


def _set_default_profile(text: str, profile_name: str) -> str:
    lines = text.splitlines()
    table = _find_table(lines, "[paper_body]")
    if table is None:
        return (
            "[paper_body]\n"
            f"default_profile = {_toml_string(profile_name)}\n\n"
            + text.lstrip()
        )

    start, end = table
    for idx in range(start + 1, end):
        if lines[idx].strip().startswith("default_profile"):
            lines[idx] = f"default_profile = {_toml_string(profile_name)}"
            return "\n".join(lines).rstrip() + "\n"

    lines.insert(start + 1, f"default_profile = {_toml_string(profile_name)}")
    return "\n".join(lines).rstrip() + "\n"


def merge_profile(
    config_path: Path,
    draft: ProfileDraft,
    *,
    replace: bool,
    set_default: bool,
) -> None:
    config_path = config_path.expanduser().resolve()
    config = _load_config(config_path)
    profiles = _profiles(config)
    if draft.name in profiles and not replace:
        raise ValueError(
            f"profile {draft.name!r} already exists; use --replace to update it"
        )

    text = config_path.read_text(encoding="utf-8") if config_path.exists() else ""
    if draft.name in profiles:
        text = _remove_profile_table(text, draft.name)

    text = _insert_section_descriptions(
        text,
        draft.section_descriptions,
        _section_descriptions(config),
    )
    text = text.rstrip() + "\n\n" + format_profile_template(
        ProfileDraft(
            name=draft.name,
            description=draft.description,
            sections=draft.sections,
            section_descriptions={},
        )
    )
    if set_default:
        text = _set_default_profile(text, draft.name)

    tomllib.loads(text)
    config_path.parent.mkdir(parents=True, exist_ok=True)
    config_path.write_text(text, encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate or merge a paper_body profile for paper-wiki.toml."
    )
    parser.add_argument(
        "--description",
        "-d",
        required=True,
        help="Natural-language description of the desired paper-note template.",
    )
    parser.add_argument(
        "--name",
        "-n",
        help="Profile name. It is normalized to a lowercase TOML key.",
    )
    parser.add_argument(
        "--section",
        "-s",
        action="append",
        help="Section title. Repeat to set the exact section order.",
    )
    parser.add_argument(
        "--section-description",
        action="append",
        help="Section guidance as SECTION=DESCRIPTION. Repeat as needed.",
    )
    parser.add_argument(
        "--language",
        choices=["any", "english"],
        default="any",
        help=(
            "Language constraint for generated profile text. Use 'english' "
            "when the template must not contain non-ASCII section text."
        ),
    )
    parser.add_argument(
        "--config",
        type=Path,
        default=DEFAULT_CONFIG_PATH,
        help=(
            "Path to paper-wiki.toml. Defaults to this skill's bundled "
            "assets/paper-wiki.toml."
        ),
    )
    parser.add_argument(
        "--write",
        action="store_true",
        help="Compatibility flag; writing is now the default behavior.",
    )
    parser.add_argument(
        "--preview",
        action="store_true",
        help="Print the generated TOML instead of writing it to --config.",
    )
    parser.add_argument(
        "--replace",
        action="store_true",
        help="Replace an existing profile with the same name when writing.",
    )
    parser.add_argument(
        "--set-default",
        action="store_true",
        help="Set paper_body.default_profile to the generated profile.",
    )
    args = parser.parse_args()

    if args.preview and args.write:
        parser.error("--preview conflicts with --write")
    if args.preview and args.set_default:
        parser.error("--set-default requires writing; remove --preview")

    try:
        config = _load_config(args.config.expanduser().resolve())
        draft = build_profile_draft(
            name=args.name,
            description=args.description,
            sections=args.section,
            section_description_args=args.section_description,
            language=args.language,
            config=config,
        )
        if args.preview:
            print(format_profile_template(draft), end="")
        else:
            merge_profile(
                args.config,
                draft,
                replace=args.replace,
                set_default=args.set_default,
            )
            print(f"wrote profile {draft.name!r} to {args.config}")
    except (OSError, ValueError, tomllib.TOMLDecodeError) as exc:
        print(f"create_paper_body_profile.py: {exc}", file=sys.stderr)
        return 1

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
