---
name: project-dispatch
description: Root-agent workflow that hands Research Tasks to per-project Claude Code or Codex sessions through os-harness. Use when the human asks for work to be done in a project, asks how dispatched work is going, wants a finished run reviewed, revised, or accepted, or wants a run stopped.
---

# Project Dispatch

You are the **root agent**: the human talks only to you at the Research
Workspace root, and each project's work runs in its own agent session, started
through [os-harness](../../../os-harness/README.md) on the human's own
subscription. Your job is to brief, dispatch, track, verify, and report, so the
human never has to switch into a project to follow it.

Commands below run from the repository root; `H` stands for
`python os-harness/harness.py`. Vocabulary follows [CONTEXT.md](../../../CONTEXT.md):
a dispatched turn is an **Agent Run** on a **Research Task**, and each project
has one **Write Lease**: at most one running session per project.

## 1. Dispatch

1. Read the project's `PROJECT_MEMORY.md` Snapshot under `projects-folder/<P>/`.
2. Check the Write Lease: `H sessions --json`. A `running` session whose `cwd`
   is this project holds the lease; report it to the human and wait for it to
   finish or be stopped. The human can also talk to a project's agent from the
   os-ui Projects window; those sessions are ordinary harness sessions and
   hold the lease the same way.
3. Choose the agent and mode. The agent is the one the human names, else
   `claude`. The mode is `read-only` for questions and reviews, `workspace` for
   file edits only, and `full` when the task must run code (Claude refuses shell
   commands in the other modes).
4. Note the baseline: `git status --porcelain -- projects-folder/<P>`. Files
   already listed there are not the run's changes; copy any of them the run
   will also edit (it always edits `PROJECT_MEMORY.md`) to a scratch location,
   so the review can separate the run's edits from earlier ones.
5. Write the brief from the template below. Dispatch when the human asked for
   this specific work or confirmed your brief.
6. Dispatch, passing the brief on stdin:

   ```bash
   H run --agent claude --cwd projects-folder/<P> --mode full --detach - <<'BRIEF'
   ...brief...
   BRIEF
   ```

Done when the harness has printed a session id and you have told the human, in
at most three lines, the session id, agent, mode, and what the run will deliver.

### Brief template

```text
You are the project agent for the Research OS project in the current directory.
Task: <what to do and why, one paragraph>
Done when:
- <checkable criterion>
- <validation command> <expected result>
Boundaries: change files only inside this directory; keep frozen evaluators and
authoritative result files as they are; leave commits to the Human Owner.
Run long commands in the foreground, split so each finishes within your shell
tool's time limit; work left in the background dies when your turn ends.
Record: add one dated bullet to the Progress Log in PROJECT_MEMORY.md and update
any Snapshot field your work changed.
Finish with a report: files changed, each validation command with its result,
and anything unfinished or uncertain.
```

## 2. Track

When the human asks about progress, and before any review: `H sessions --json`
gives each session's `status` (`running`, `ok`, `failed`, `stopped`) and
`last_result`; `H show <id>` replays the full trace. Answer in two to four
lines: status, what happened, what comes next. Quote the trace only for a
specific question.

`stopped` means the run's process died mid-turn; tell the human and offer to
resume it.

## 3. Review

When a run ends `ok` or `failed`:

1. Read the agent's final report (`last_result`, or `H show <id>`).
2. Verify it yourself: run every validation command from the brief, and diff
   `git status --porcelain` against the baseline. A change outside the project
   directory is a boundary breach; report it first.
3. Check that `PROJECT_MEMORY.md` gained the run's Progress Log bullet.
4. Report to the human: files changed, each "Done when" criterion as met or
   unmet with its evidence, deviations, and open questions. Ask for acceptance.

Done when every "Done when" criterion carries evidence you produced, not only
the agent's word.

## 4. Act on the human's decision

- **Accept**: append `(accepted YYYY-MM-DD)` to the run's Progress Log bullet,
  then offer to commit; the human decides.
- **Revise**: `H resume <id> --detach -` with the feedback on stdin; the session
  keeps its context. Review again when it ends.
- **Reject**: report which files the run changed; revert them only on the
  human's word.
- **Stop**: `H stop <id>` whenever the human asks to halt a run.

The Human Owner alone accepts results; your report is the evidence for that
decision.

_Original, Pengqian Han (drafted with an agent, 2026-09-26)._
