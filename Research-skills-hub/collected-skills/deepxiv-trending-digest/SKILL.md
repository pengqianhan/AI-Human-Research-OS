---
name: deepxiv-trending-digest
description: Summarize recent hot academic papers using deepxiv trending, brief, head, and section reads, then produce a markdown digest highlighting what each paper is about and which papers deserve deeper reading.
---

# DeepXiv Trending Digest

Use this skill when the user wants a recent hot-paper roundup, trending paper summary, weekly paper digest, or a markdown report based on DeepXiv trending papers.

## Goal

Turn recent DeepXiv trending papers into a concise markdown digest:

1. Find currently hot papers with `deepxiv trending`
2. Brief each candidate with `deepxiv paper <id> --brief`
3. Select the most promising papers for deeper inspection
4. Inspect structure with `deepxiv paper <id> --head`
5. Read only the most relevant sections with `deepxiv paper <id> --section ...`
6. Write a clean `.md` summary with recommendations

## Default Workflow

### 1. Pull trending papers

Start with a small, recent set unless the user asks otherwise.

```bash
deepxiv trending --days 7 --limit 10 --json
```

Default heuristics:
- Use `--days 7` for "recent hot papers"
- Use `--limit 10` for a manageable first pass
- If the user asks for a broader roundup, use `--days 14` or `--days 30`

### 2. Brief every candidate

For each selected arXiv ID, fetch a brief first:

```bash
deepxiv paper <arxiv_id> --brief
```

Capture:
- title
- arXiv ID
- publish date
- keywords
- TLDR
- citations if present
- GitHub URL if present

Do not jump to full text yet. `--brief` is the default screening step.

### 3. Rank for deeper reading

After reading briefs, choose the top 1-3 papers for deeper inspection.

Use signals like:
- strong novelty or surprising result
- practical relevance
- likely user interest
- unusually clear contribution
- useful code release
- especially strong social or research momentum

If a paper sounds incremental, unclear, or out of scope, keep it in the digest but skip deep reading.

### 4. Inspect paper structure

For the chosen papers:

```bash
deepxiv paper <arxiv_id> --head
```

Use `--head` to decide whether to drill down and which section matters most.

Look for sections such as:
- Introduction
- Method / Approach / Framework
- Experiments / Results / Evaluation
- Discussion / Limitations

Prefer section reads over full paper reads.

### 5. Read only high-value sections

Read at most 1-2 sections per paper unless the user explicitly asks for a deep dive.

Examples:

```bash
deepxiv paper <arxiv_id> --section Introduction
deepxiv paper <arxiv_id> --section Method
deepxiv paper <arxiv_id> --section Results
```

Selection guidance:
- Read `Introduction` if the contribution is still fuzzy
- Read `Method` if the core idea matters
- Read `Results` if the claim sounds strong and needs verification
- Read `Limitations` or `Discussion` if tradeoffs matter

Avoid reading everything.

## Markdown Output

Write a markdown file in the current workspace unless the user gave a different path.

Recommended filename:

```text
trending-paper-digest-YYYY-MM-DD.md
```

Recommended structure:

```md
# Trending Paper Digest

Date: YYYY-MM-DD
Window: Last 7 days
Source: deepxiv trending

## Executive Summary

- 2-4 bullets with the main themes across the trending list
- Mention the 1-3 most promising papers

## Papers Reviewed

### 1. Paper Title (`arXiv:xxxx.xxxxx`)

What it is about:
Short paragraph based mainly on `--brief`.

Why it matters:
- Bullet
- Bullet

Worth deeper reading?
Yes/Maybe/No, with one sentence.

If deeper review was done:

Sections checked:
- Introduction
- Method

Deeper notes:
Short paragraph with the key insight, evidence, or caveat.

### 2. ...

## Recommended Deep Dives

### Paper Title

- Why it stands out
- Which section to read next
- What question it could answer

## Cross-Cutting Trends

- Repeated themes
- Common methods
- Shared limitations or hype signals
```

## Writing Rules

- Keep the digest skimmable
- Prefer short paragraphs and flat bullets
- Separate "what it says" from "whether it is worth deeper reading"
- Be explicit when a conclusion is based only on `--brief`
- Be explicit when a conclusion is based on `--head` or a section read
- Do not pretend to have verified claims you have not checked

## Decision Rules

- If briefs are enough for the user's request, stop there
- Use `--head` only for the most promising papers
- Use `--section` only after `--head` suggests a high-value section
- Do not read full paper markdown unless the user explicitly asks for a full analysis

## Minimal Example

```bash
deepxiv trending --days 7 --limit 5 --json
deepxiv paper 2603.20639 --brief
deepxiv paper 2603.26221 --brief
deepxiv paper 2603.20639 --head
deepxiv paper 2603.20639 --section Introduction
```

Then write the digest as markdown and clearly label:
- all reviewed papers
- which papers were only briefed
- which papers received deeper inspection
