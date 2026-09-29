#!/usr/bin/env python3
"""Scan GitHub by keyword for projects related to the Research OS.

Appends new candidates to os-build/references/related-projects.md for the
Human Owner to review in a pull request. Run from the repository root with an
authenticated `gh` CLI:

    python .github/scripts/scan_related_projects.py              # dry run
    python .github/scripts/scan_related_projects.py --write --pr-body pr.md

A repo is skipped when it is already linked from the target file or README.md,
or when an earlier scan PR proposed it and it is no longer listed (the human
removed it in review, or closed that PR). The run does nothing while a scan PR
is still open. Standard library only.
"""

import argparse
import datetime as dt
import json
import os
import re
import subprocess
import sys
import textwrap
import time
from pathlib import Path

TARGET = Path("os-build/references/related-projects.md")
LISTED_SOURCES = [TARGET, Path("README.md")]
SCAN_BRANCH = "related-projects-scan"
MARKER = "related-projects-scan:candidates"

RESEARCH = "Research agents and workbenches"
SKILLS = "Skills and lists"

# GitHub search syntax; quoted text matches as a phrase in the name,
# description, or topics. Generic agent-OS and harness queries are left out on
# purpose: keyword search cannot tell a research-relevant runtime from noise,
# so those stay hand-curated.
QUERIES = [
    '"AI scientist"',
    '"autoresearch"',
    '"auto research"',
    '"autonomous research"',
    '"idea to paper"',
    '"research workbench"',
    '"scientific discovery" agent',
    '"research assistant" "claude code"',
    '"academic research" agent',
    '"research skills"',
    '"science skills"',
    "topic:ai-scientist",
    "topic:auto-research",
    "topic:autoresearch",
    "topic:research-agent",
]

# Lists and surveys belong in the Human Owner's awesome-AI-for-research, and
# these domains share the words "research" or "autonomous" but not the topic.
EXCLUDE = re.compile(
    r"^awesome|curated (list|collection)|paper list|reading list|list of|"
    r"collection of (papers|resources)|\bsurvey\b|"
    r"pentest|penetration|offensive security|reverse engineering|"
    r"trading|invest|quant|stock|a-share|"
    r"social media|reddit|instagram|tiktok|crawler|爬虫|投资",
    re.IGNORECASE,
)
# A skill repo must also be about research: after dropping web-search "deep
# research" and similar phrases, names like Nous Research, "X-inspired", and
# "data science", one of these terms has to remain in its name or description.
NOT_RESEARCH = re.compile(
    r"\b(deep|web|market|legal|security|nous|user|ux|competitor)[\s-]+research|"
    r"\w*research-inspired|\bdata[\s-]+scien\w*",
    re.IGNORECASE,
)
RESEARCH_TERM = re.compile(
    r"research|scien|academ|scholar|\bpapers?\b|literature|manuscript|"
    r"experiment|\bph\.?d\b|thesis|科研|学术|论文|研究",
    re.IGNORECASE,
)
REPO_URL = re.compile(r"github\.com/([A-Za-z0-9_.-]+)/([A-Za-z0-9_.-]+)")
EMOJI = re.compile(
    "[\U0001F000-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F\u200D]"
)


def gh(*args):
    out = subprocess.run(
        ["gh", *args], capture_output=True, text=True, encoding="utf-8"
    )
    if out.returncode != 0:
        sys.exit(f"gh {' '.join(args)} failed:\n{out.stderr.strip()}")
    return json.loads(out.stdout or "null")


def repo_key(owner, name):
    name = re.sub(r"\.git$", "", name.rstrip("."))
    return f"{owner}/{name}".lower()


def listed_repos(root):
    keys = set()
    for rel in LISTED_SOURCES:
        text = (root / rel).read_text(encoding="utf-8")
        keys.update(repo_key(o, n) for o, n in REPO_URL.findall(text))
    return keys


def scan_prs():
    prs = gh("pr", "list", "--state", "all", "--limit", "200",
             "--json", "number,state,url,headRefName,body")
    return [p for p in prs if p["headRefName"] == SCAN_BRANCH]


def proposed_before(prs):
    keys = set()
    for pr in prs:
        for names in re.findall(rf"<!--\s*{MARKER}(.*?)-->", pr["body"] or "", re.S):
            keys.update(n.lower() for n in names.split())
    return keys


def search(since, min_stars, per_query):
    hits = {}
    for query in QUERIES:
        q = f"{query} pushed:>={since} stars:>={min_stars} fork:false archived:false"
        found = gh("api", "-X", "GET", "search/repositories", "-f", f"q={q}",
                   "-f", "sort=stars", "-f", f"per_page={per_query}")
        for repo in found["items"]:
            hits.setdefault(repo["full_name"].lower(), {**repo, "queries": []})
            hits[repo["full_name"].lower()]["queries"].append(query)
        time.sleep(2.5)  # search API allows 30 requests per minute
    return hits


def section_for(repo):
    text = f"{repo['name']} {repo['description']}"
    return SKILLS if re.search(r"skill", text, re.IGNORECASE) else RESEARCH


def is_research(repo):
    text = NOT_RESEARCH.sub("", f"{repo['name']} {repo['description']}")
    return bool(RESEARCH_TERM.search(text))


def clean_description(text, limit=220):
    text = EMOJI.sub("", text or "")
    text = text.split(" | ")[0]  # "English | 中文" bilingual descriptions
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"^\W+|[\s|:-]+$", "", text)
    text = text.replace("<", "&lt;").replace(">", "&gt;")
    if len(text) > limit:
        cut = text[:limit]
        end = max(cut.rfind(". "), cut.rfind("。"))
        text = cut[: end + 1] if end > limit // 2 else cut.rsplit(" ", 1)[0] + "…"
    if text and text[-1] not in ".!?。…":
        text += "."
    return text


def entry_lines(repo):
    text = f"[{repo['name']}]({repo['html_url']}): {clean_description(repo['description'])}"
    return textwrap.wrap(text, width=80, initial_indent="- ", subsequent_indent="  ",
                         break_long_words=False, break_on_hyphens=False)


def insert_entries(text, by_section):
    lines = text.split("\n")
    for section, repos in by_section.items():
        new = [ln for repo in repos for ln in entry_lines(repo)]
        heading = f"## {section}"
        if heading not in lines:
            while lines and not lines[-1].strip():
                lines.pop()
            lines += ["", heading, "", *new, ""]
            continue
        start = lines.index(heading)
        end = next((i for i in range(start + 1, len(lines))
                    if lines[i].startswith("## ")), len(lines))
        while end > start + 1 and not lines[end - 1].strip():
            end -= 1
        lines[end:end] = new
    return "\n".join(lines)


def pr_body(added, below, since, min_stars, min_skill_stars):
    rows = [f"| [{r['full_name']}]({r['html_url']}) | {r['stargazers_count']} | "
            f"{r['pushed_at'][:10]} | {section_for(r)} | "
            f"{', '.join(q.replace('|', '/') for q in r['queries'])} |"
            for r in added]
    body = [
        "Automated weekly keyword scan of GitHub. Review the entries in "
        "`os-build/references/related-projects.md`: edit, move, or delete them "
        "on this branch, then merge. Entries you delete, and every entry of a "
        "PR you close without merging, will not be proposed again.",
        "",
        f"Filter: pushed since {since}, at least {min_stars} stars "
        f"({min_skill_stars} and a research topic for skill repos), not "
        "archived or a fork, not "
        "already listed; ranked by number of matched queries, "
        "then stars. Descriptions are the repos' own GitHub descriptions; "
        "relevance was matched by keyword only, not judged.",
        "",
        "| Repo | Stars | Last push | Section | Matched queries |",
        "|---|---|---|---|---|",
        *rows,
    ]
    if below:
        body += ["", "Below the per-run cap (eligible next week if still unlisted):", ""]
        body += [f"- [{r['full_name']}]({r['html_url']}) ({r['stargazers_count']} stars)"
                 for r in below]
    body += ["", f"<!-- {MARKER} {' '.join(r['full_name'].lower() for r in added)} -->", ""]
    return "\n".join(body)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--write", action="store_true", help="edit the target file")
    ap.add_argument("--pr-body", type=Path, help="write the PR body here")
    ap.add_argument("--max", type=int, default=10, help="new entries per run")
    ap.add_argument("--min-stars", type=int, default=50)
    ap.add_argument("--min-skill-stars", type=int, default=100,
                    help="stars required of skill repos (the Skills section)")
    ap.add_argument("--days", type=int, default=60, help="pushed within N days")
    ap.add_argument("--per-query", type=int, default=30)
    args = ap.parse_args()

    root = Path.cwd()
    prs = scan_prs()
    open_pr = next((p for p in prs if p["state"] == "OPEN"), None)
    if open_pr:
        print(f"Scan PR still open, awaiting review: {open_pr['url']}. Nothing to do.")
        return

    listed = listed_repos(root)
    skip = listed | proposed_before(prs)
    since = (dt.date.today() - dt.timedelta(days=args.days)).isoformat()
    hits = search(since, args.min_stars, args.per_query)

    repo = os.environ.get("GH_REPO") or os.environ.get("GITHUB_REPOSITORY")
    owner = gh("repo", "view", *filter(None, [repo]), "--json", "owner")
    owner = owner["owner"]["login"].lower()
    eligible = sorted(
        (r for k, r in hits.items()
         if k not in skip and not k.startswith(owner + "/")
         and (r["description"] or "").strip()
         and not EXCLUDE.search(f"{r['name']} {r['description']}")
         and (section_for(r) != SKILLS
              or (r["stargazers_count"] >= args.min_skill_stars
                  and is_research(r)))),
        key=lambda r: (-len(r["queries"]), -r["stargazers_count"]),
    )
    added, below = eligible[: args.max], eligible[args.max : args.max + 10]
    print(f"{len(hits)} repos seen, {len(eligible)} eligible, {len(added)} proposed.")
    for r in added:
        print(f"  + {r['full_name']} ({r['stargazers_count']}, "
              f"{len(r['queries'])} queries) -> {section_for(r)}")

    if not added:
        return
    if args.write:
        path = root / TARGET
        raw = path.read_bytes().decode("utf-8")
        eol = "\r\n" if "\r\n" in raw else "\n"
        by_section = {}
        for r in added:
            by_section.setdefault(section_for(r), []).append(r)
        text = insert_entries(raw.replace("\r\n", "\n"), by_section)
        path.write_bytes(text.replace("\n", eol).encode("utf-8"))
    if args.pr_body:
        args.pr_body.write_text(
            pr_body(added, below, since, args.min_stars, args.min_skill_stars),
            encoding="utf-8")


if __name__ == "__main__":
    main()
