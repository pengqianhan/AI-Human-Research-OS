---
name: task-file-builder
description: Interactively draft a well-structured `task.md` brief for Claude Code by walking the user through Objective, Acceptance Criteria, Relevant Files, Constraints, Background, Known Context, and Questions based on Opus 4.7 best practices. Use this skill whenever the user wants to prepare a task, brief, spec, prompt, plan, or instructions for Claude Code to execute in a fresh session — even if they don't explicitly ask for a "task file" or "task.md". Trigger on phrases like "help me write a task", "draft instructions for Claude Code", "prepare a brief", "plan what to ask Claude to do", "turn this idea into a task.md", "write a spec for Claude", or "front-load context for a new Claude Code session".
author: Pengqian Han
version: 1.0.0
---

# Task File Builder

Help the user produce a well-structured `task.md` file that front-loads all context for a future Claude Code session. The underlying idea comes from Opus 4.7 best practices: a single, context-rich first turn is far more effective than a sparse prompt that forces Claude Code to probe for details mid-task.

The user will ultimately either (a) start a fresh Claude Code session in the same repo and let Claude read `task.md`, or (b) copy-paste the contents of `task.md` directly into a new chat. Your job is to produce a brief that works well for both paths.

## When to use this skill

Use this skill whenever the user is preparing work for Claude Code to execute later — not when they want you to *do* the work right now. Typical signals:

- "Help me draft a task for Claude Code to..."
- "I want to write up a spec / brief / prompt before I start a new session."
- "Turn this into a `task.md`."
- "Front-load the context for this so I don't have to keep clarifying."
- The user is describing something lengthy or multi-step and mentions wanting to "reset" or "start fresh" before executing.

If the user actually wants you to *do* the thing now, do not invoke this skill — just help them with the task directly.

## Workflow

### Step 1 — Understand the task

Read the bundled template at `assets/task_template.md` so you have the field reference in mind. Also skim `examples/example_task.md` for what a filled-in brief looks like.

Extract as much as you can from the conversation history first. The user may have already described the objective, mentioned files, or stated constraints — capture those before asking new questions.

### Step 2 — Ask clarifying questions in a single batch

Batch all open questions into one message. Do not do a 7-round interrogation — that wastes the user's time and the whole point of this skill is to compress setup. Ask only about fields you genuinely cannot infer, and ask them all at once.

Prioritize by the template's star rating:

- **★★★ (must have)** — Objective, Acceptance Criteria, Relevant Files. Always confirm these.
- **★★☆ (strongly encouraged)** — Background & Intent, Constraints. Ask when the task is non-trivial or when hard limits clearly exist.
- **★☆☆ (nice to have)** — Known Context, Questions. Only ask when the user seems to have extra context to share.

If the user has already given you enough, skip straight to drafting — don't fish for more.

**Good batched question example:**

> Before I draft the `task.md`, a few things:
> 1. What file or function should be the entry point? (e.g. `src/api/handlers.py`)
> 2. Are there specific constraints — framework version, style, anything we must *not* touch?
> 3. What does "done" look like? A passing test? A PR merged? A screenshot?

### Step 3 — Draft the task.md

Fill in the template. Follow these principles:

- **Be specific, not aspirational.** Replace vague goals ("improve the API") with concrete ones ("reduce `GET /users` p95 latency from 800ms to under 200ms by adding an index and response caching").
- **Write checkbox-style acceptance criteria** that the executing Claude can self-verify. Each criterion should be a concrete observable outcome, not a process step.
- **Use absolute file paths relative to the repo root** so the executing Claude can read them immediately without searching.
- **Omit fields the user doesn't need.** A small bug fix may not need Background or Constraints. Don't pad empty sections with "N/A" — just remove them. A clean short task.md beats a bloated one.
- **Preserve the user's domain terms.** If they said "embedder", don't rewrite to "encoder". Their vocabulary carries meaning you may not fully see.
- **If the user mentioned a specific effort level** (`low`, `medium`, `high`, `xhigh`, `max`), include it as a top-line note. Otherwise omit — `xhigh` is the default.

Write the output to `task.md` in the current working directory unless the user specifies a different path. If `task.md` already exists, ask before overwriting.

### Step 4 — Show the draft and offer a revision round

After writing the file, show the user the full content inline (not just "I wrote the file") so they can review it without opening the file. Then offer one revision pass: "Want me to tweak anything before you take this into a new session?"

If the user has revisions, edit `task.md` directly — don't rewrite from scratch.

### Step 5 — Tell the user how to execute it

Once the user is satisfied, give them this closing guidance verbatim (adjusting paths if needed):

> `task.md` is ready. To execute it, pick one:
>
> **Option A — Fresh session (recommended):** Run `/clear` in this session, or open a new Claude Code window in the same repo, then say: `Please read task.md and carry out the task.`
>
> **Option B — Paste directly:** Open `task.md`, copy its contents, and paste them as your first message into a new Claude Code session.
>
> A fresh context is important — the conversation we just had about drafting the brief would otherwise pollute the executing session and waste tokens.

## Why a fresh session matters

The drafting conversation accumulates meta-talk ("should this be an acceptance criterion?", "let me rephrase the objective") that is noise for the *executing* Claude. Starting fresh — or pasting only the brief — means the executor sees only the signal: a clean, front-loaded spec. Pass this reasoning on to the user if they ask why.

## Output format

Always use the exact template from `assets/task_template.md`. The final `task.md` should be valid Markdown, start with `## Objective`, and contain no YAML frontmatter, no headers above `## Objective`, and no trailing commentary from you. The user should be able to paste it into Claude Code verbatim.

Omit any section whose content would be empty or "N/A" — the template lists all possible sections, but not every task needs all of them.

## Worked example

See `examples/example_task.md` for a completed task.md derived from the prompt: *"I want Claude to add rate limiting to our /api/login endpoint, tested, without breaking the existing session flow."*

## Notes

- This skill produces a file, not a plan object. Do not use `ExitPlanMode` or in-chat planning tools as a substitute — the point is a persistent artifact the user can paste or re-open later.
- If the user is working on a repo with a `CLAUDE.md`, briefly mention in the closing message that the executor will also pick up those project instructions automatically — they don't need to restate them in `task.md`.
