# Prompt Contract Reference

Read this reference for complex implementation, tool-using, research-grounded, visual, phased, or cross-provider prompts. Select only the clauses that change behavior; this is a decision surface, not a mandatory template.

## Contents

1. Contract anatomy
2. Decision rules
3. Cross-provider portability
4. Completion patterns
5. Upgrade and evaluation loop
6. Final audit

## Contract Anatomy

Start a directly executable prompt with a plain directive:

```markdown
Execute this task in the current workspace. Inspect the relevant evidence, perform the authorized work, validate the result, and create every required artifact. Do not stop after proposing a plan.
```

Add the smallest useful subset of these sections:

```markdown
# [Actionable task title]

## Outcome
[User-visible end state.]

## Evidence to Inspect
[Named files, sources, state, commands, or prerequisite results.]

## Required Work
[Observable requirements and invariants.]

## Authority and Scope
[Autonomous local actions, approval boundaries, current work layer.]

## Verification and Completion Bar
[Tests, builds, measurements, renders, provenance, failure reporting.]

## Required Artifacts
[Exact paths, formats, schemas, or language requirements.]

## Stop and Fallback Rules
[Environment gates, retry bounds, smallest missing input, blocked state.]

## Final Response
[Status, changes, evidence, artifacts, risks, next interface.]
```

Role and personality are optional. Add a role when domain perspective changes decisions. Add personality or collaboration style when tone, initiative, assumptions, or progress updates matter. Keep both shorter than the operational contract.

## Decision Rules

### New prompt

Infer the minimum contract from the task and available repository evidence. Use exact paths and commands only when verified. Replace missing noncritical detail with a decision rule; surface a placeholder only when the user requested a reusable template.

### Prompt upgrade

Preserve the current outcome, explicit values, safety constraints, output schema, and reasoning baseline. Identify a measured or plausible failure mode before adding text. Remove obsolete scaffolding and duplication first; add the smallest targeted instruction that fixes the gap. Default to an equal or smaller contract. Cite repository documents and precedence instead of reproducing their contents; inline only execution-critical invariants that cannot safely wait for the future agent's evidence pass.

### Implementation task

Authorize in-scope local edits and non-destructive validation. Separate diagnosis from implementation when the user's verb does. Bind `complete` to changed behavior plus relevant verification, not to files being edited.

### Research task

Define acceptable sources, retrieval breadth, citation placement, and missing-evidence behavior. Require retrieved support for factual claims, distinguish inference, surface source conflicts, and narrow claims rather than guessing.

### Experiment task

Define the environment gate, controls, raw-result format, reproducibility inputs, fairness constraints, statistics, cost approval threshold, and negative-result policy. A missing required environment produces `blocked`, not fabricated data.

### Visual artifact

Require generation plus rendering and inspection. Name the states and layout constraints that matter. Completion evidence covers clipping, spacing, missing content, responsive behavior, and consistency with the existing design system.

### Phased work

Give each phase one stable input contract, one bounded outcome, its own validation, and an explicit handoff. A phase prompt must stand alone when it will be copied into a fresh agent task. Repeat only prerequisite facts required for independent execution.

## Cross-Provider Portability

Write the portable core against capabilities, not product syntax:

- say “inspect repository instructions” rather than naming one vendor's instruction file unless that file exists in the target repository;
- say “use available file-editing tools” only when the editing mechanism is not itself a constraint;
- say “run the repository-supported tests” before naming unverified commands;
- describe approval categories rather than a product's permission API;
- request sparse progress updates without naming message channels;
- request a file artifact by path and format rather than a proprietary attachment directive.

Place provider adapters outside the core prompt. An adapter may specify tool names, API fields, reasoning effort, verbosity controls, subagent syntax, or message channels only after those capabilities are verified for the target runtime.

Treat model labels supplied by the user as targets, not capability evidence. When a prompt depends on a provider-specific feature, retrieve current official documentation or express the requirement generically.

## Completion Patterns

### Code

```markdown
After changing behavior, run the most relevant targeted tests, applicable type/lint/build checks, and a minimal smoke test. Report exact commands and results. If a check cannot run, state why and identify the next-best verification. Mark complete only when the requested behavior and required checks pass.
```

### Grounded analysis

```markdown
Support material claims with retrieved evidence, attach each citation to the claim it supports, label inference, and state conflicts. If required evidence remains missing after the smallest useful fallback, narrow the answer and report the gap.
```

### Environment gate

```markdown
Record the required environment facts and run a capability probe before the dependent work. If the gate fails, preserve any useful audit results, omit unsupported execution claims, and return Status: blocked with the missing condition and reproduction command.
```

### Long-running task

```markdown
Before the first tool call, state the first concrete step. Update only when a major phase begins or evidence changes the plan; each update states one outcome and the next step. Continue safe in-scope work without asking for routine confirmation.
```

## Upgrade and Evaluation Loop

Use representative tasks instead of intuition alone:

1. Save the current prompt and model/runtime settings as the baseline.
2. Define pass/fail criteria from user-visible outcomes, evidence, side effects, and completion behavior.
3. Run the same cases before and after a narrow change.
4. Compare correctness and completeness first; compare tokens, latency, cost, calls, turns, and retries only among passing variants.
5. Test a lower reasoning-effort setting only after the contract has adequate success, dependency, tool-routing, and verification rules.
6. Keep a change only when evaluation supports it; record workload-specific uncertainty.

Do not transfer quantitative gains reported for one model or workload into a universal claim.

## Final Audit

Before delivery, answer every question:

- Can the future agent identify the end state without guessing?
- Are explicit user values preserved?
- Is every named prerequisite available or covered by a fallback?
- Are safe local actions authorized once, and risky actions gated once?
- Does the prompt stay within the requested work layer?
- Can every deliverable be proven complete by a named check?
- Does `blocked` prevent unsupported claims when the environment is absent?
- Is every factual claim grounded or labeled as inference?
- Is the prompt directly copyable without surrounding explanation?
- Would removing any remaining sentence change behavior? If not, remove it.

This reference adapts the outcome-first, lean-contract, autonomy, grounding, tool-routing, and verification principles from OpenAI's GPT-5.6 Sol prompting guidance: <https://developers.openai.com/api/docs/guides/prompt-guidance-gpt-5p6>.
