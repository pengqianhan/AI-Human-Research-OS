---
name: writing-great-prompt
description: Prompt-contract authoring for frontier reasoning and coding agents. Use when the user wants a new implementation prompt, a phased agent task, a copy-ready prompt, or an evidence-based upgrade of an existing prompt that should work across capable model providers.
---

# Writing Great Prompts

Turn an intent into a **prompt contract**: a lean, copy-ready task that defines the destination, evidence, authority, and completion bar while leaving the agent freedom to choose an efficient route.

## 1. Resolve the Contract

Extract the requested artifact, user-visible outcome, explicit user values, current work layer, target environment, and intended agent. Distinguish a one-off task from a reusable template and a new prompt from an upgrade.

Inspect named artifacts and nearby repository instructions before drafting. Ask only for a missing choice that would materially change the contract; otherwise make a conservative, visible assumption.

Complete this step when the outcome, authorized scope, available evidence, and meaning of completion are all known or explicitly marked as unresolved.

## 2. Ground the Prompt

Read the source material the future agent will need. For repository tasks, discover real paths, commands, constraints, dirty-worktree risks, and environment boundaries. For externally grounded tasks, retrieve current authoritative sources when access exists and label unsupported inference.

Preserve the user's explicit model target. Verify provider-specific capabilities before encoding them; otherwise write against generic capabilities such as reading files, editing in-scope artifacts, running commands, browsing authorized sources, and reporting evidence.

Complete this step when every named prerequisite has been read or the prompt states how the future agent must handle its absence.

## 3. Set the Authority Envelope

Grant safe, in-scope local actions without repeated approval. Put confirmation boundaries in one place for external writes, destructive actions, purchases, long or costly runs, protected data, and material scope expansion. State the current layer—research, design, implementation, review, experiment, or external coordination—so the agent does not silently cross layers.

Use environment gates for work that requires specific hardware, credentials, services, or dependencies. Define the evidence required to pass each gate and the blocked outcome when it fails.

Complete this step when every likely side effect is either authorized, gated, or outside scope.

## 4. Draft Outcome-First

Write the prompt in the language and destination requested by the user. Make it directly copyable: address the future agent, use imperative language, and remove commentary about how the prompt was produced.

Use only sections that change behavior. For complex agent tasks, usually include:

- execution directive;
- outcome;
- evidence to inspect;
- required implementation or analysis;
- authority and scope;
- verification and completion bar;
- required artifacts and final response;
- stop, fallback, or blocked rules.

Define personality or collaboration style only when it changes the experience. Describe the destination rather than scripting routine reasoning or tool calls. Parallel and sequential routing rules belong in the prompt only when correctness depends on them.

For complex implementation, tool-using, research-grounded, visual, phased, or cross-provider prompts, read [references/prompt-contract.md](references/prompt-contract.md) before completing the draft.

Complete this step when the draft can be pasted into the intended agent without surrounding explanation or unresolved placeholders, unless the user explicitly requested a template.

## 5. Bind Completion to Evidence

Give each required result a checkable completion criterion. Require targeted tests for changed behavior, appropriate build/type/lint checks, a smoke test when full validation is expensive, and rendered inspection for visual artifacts. Require actual commands and results, and require the agent to distinguish passed, failed, and unrun checks.

Define `complete`, `incomplete`, and `blocked` so implementation presence cannot be mistaken for verified completion. For research, require claims to trace to retrieved sources or raw results. For long-running work, request sparse outcome-based updates at major phase changes.

Complete this step when every user-visible deliverable has evidence that can prove it exists and works.

## 6. Prune the Contract

Run a contradiction and no-op audit sentence by sentence:

- keep each rule in one authoritative place;
- remove repeated goals, style reminders, examples, and default behavior;
- keep absolute language for true invariants and use decision rules for judgment;
- phrase the desired behavior positively, pairing unavoidable prohibitions with the safe action;
- remove tools, sections, and model-specific tuning that do not affect this task;
- preserve required facts, decisions, caveats, and next actions before optional detail.

When upgrading an existing prompt, preserve its working behavior, remove one class of scaffolding at a time, and recommend representative evals rather than claiming that a rewrite is better by inspection.

Default to equal or lower instruction count. Point to authoritative repository evidence instead of copying its domain model into the prompt; inline a fact only when the future agent must know it before reading that evidence or when it is a true execution invariant.

Complete this step when every remaining sentence changes behavior, resolves ambiguity, protects evidence, or defines completion.

## 7. Deliver

Save to the requested project-local path when one is given; otherwise return the prompt in one copyable Markdown block or artifact. Keep provider-specific wrappers outside the portable core unless the user explicitly targets one runtime.

Report the path, intended use, assumptions, and validation performed. Do not present the generated prompt as empirically superior unless representative evaluations support that claim.

Complete the skill only when the prompt is copy-ready, grounded, permission-aware, contradiction-free, and paired with a checkable completion bar.
