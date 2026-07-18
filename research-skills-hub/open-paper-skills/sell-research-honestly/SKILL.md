---
name: sell-research-honestly
description: Audit, position, and communicate research value without outrunning the evidence. Use when users need audience-specific buy-in from advisors, collaborators, reviewers, talk audiences, or the research community; want to pitch or promote an idea, paper, result, codebase, or demo; plan research PR; or need to detect and repair overclaiming. Do not use for generic proofreading, summarization, or formatting.
---

# Sell Research Honestly

Turn one research object into the strongest defensible case for one audience
and one desired action. Keep facts invariant while changing emphasis.

## Inputs

Establish three inputs:

1. **Research object** — an idea, experiment, paper, codebase, talk, demo, or
   the files that contain it.
2. **Audience** — one advisor, collaborator, reviewer, talk audience, or
   research community.
3. **Desired action** — what that audience should understand, approve, discuss,
   accept, use, cite, or do next.

Inspect supplied materials and repository evidence before requesting facts. If
an input remains missing, ask one blocking question per turn while completing
the audit work that is already possible.

## 1. Frame the case

Classify the research object as `idea`, `preliminary`, or `evidenced`. Read the
matching audience section in
[`references/audience-playbooks.md`](references/audience-playbooks.md), then
write a four-part **audience model**:

- outcome the audience values;
- cost or decision risk they bear;
- objection they are most likely to raise;
- evidence that would make the desired action reasonable.

Read the reference's feedback section only when the user brings back real
reactions or outcomes.

**Complete when:** the research object, maturity, single audience, desired
action, and all four audience-model fields are explicit.

## 2. Build the value case

Create a six-field **value case**. Mark every field `supported`, `plausible`,
`missing`, or `contradicted`.

| Field | Question |
| --- | --- |
| Problem | What concrete problem exists? |
| Audience stake | Why does this audience care? |
| Gap | Where do current approaches fail or cost too much? |
| Insight / solution | What new information or intervention does the work add? |
| Evidence | What makes each material claim credible? |
| Boundary / cost | Where does it fail, stop applying, or impose a cost? |

Build a **claim ledger** beside the value case. Give every material claim one
state and an exact evidence pointer:

- `observed` — directly supported by the materials;
- `inferred` — a reasoned interpretation of observed evidence;
- `hypothesized` — a proposition awaiting a test;
- `unsupported` — no supplied support;
- `contradicted` — conflicts with supplied evidence.

Prefer evidence in this order: raw results, data, code output, figures, and
verified citations; locatable project or manuscript material; user-provided
but unverified information; agent inference. Label the last two categories.
Treat novelty, priority, state-of-the-art, and comparisons with current work as
external facts: verify them against external literature. Until verified, keep
their claim state `unsupported`, add `verification: unverified`, and exclude
them from public copy.

Make the evidence burden proportional to the claim:

- Attach evidence to strong terms such as *first*, *general*, *robust*,
  *low-cost*, and *state of the art*; otherwise use a supported term.
- Inspect critical subgroup and failure behavior rather than relying on an
  average alone.
- Account for added compute, data, labor, latency, memory, and deployment cost.
- Match causal language to a design that excludes the main alternative
  explanations.
- Match scope to the tested models, datasets, conditions, and cases.
- Require fair baselines for comparative effectiveness.

When evidence is narrower, narrow the claim.

**Complete when:** all six fields have a status, every material claim has one
state and a source pointer, and every comparative external claim is verified
or held `unsupported` with `verification: unverified`.

## 3. Apply the value gate

Choose exactly one verdict:

- `ready-to-sell` — the value proposition and material claims are supported;
- `narrow-and-sell` — a useful case survives after narrowing or qualification;
- `validate-first` — the value is plausible but a load-bearing claim lacks
  evidence;
- `do-not-claim` — the core claim is unsupported, contradicted, or relies on a
  research-integrity breach.

For `validate-first`, produce a minimum discriminating validation plan: claim,
cheapest informative test, success and failure criteria, and how each outcome
changes the message. Treat the result as an internal validation brief rather
than public-ready copy.

For `do-not-claim`, run one **salvage pass** for a narrower phenomenon, negative
result, failure mode, engineering benefit, cost advantage, or worthwhile
research question. Use the recovered case only if its own claim ledger passes
the gate. If nothing survives, make the Primary Deliverable a concise no-case
finding that names the evidence required to reopen the claim.

The verdict measures readiness for honest communication, not the probability
of acceptance, collaboration, publication, or attention.

**Complete when:** the verdict follows from the value case and fixes which
deliverable is allowed next.

## 4. Compose the strongest defensible message

For `ready-to-sell` or `narrow-and-sell`, use this narrative spine:

> audience-relevant problem → concrete gap → insight or solution → value →
> strongest evidence → boundary and cost → explicit next action

Write `observed` claims as facts. Mark `inferred` claims with calibrated
language. Present `hypothesized` claims only as research questions or future
tests. Replace `unsupported` and `contradicted` claims with the narrowest
supported alternative.

Vary emphasis, length, and vocabulary for the audience; keep evidence, costs,
and scope unchanged. Produce one primary deliverable unless the user requests
additional formats. Name the concrete contribution before any larger vision.

**Complete when:** the deliverable serves the audience model, contains one
clear takeaway and next action, and every factual sentence maps to the claim
ledger.

## 5. Run the integrity pass and deliver

Re-run the Step 2 evidence rules against every sentence in the draft. Repair
each mismatch by adding evidence, qualifying the sentence, or replacing it
with the narrowest supported claim.

Return four sections:

1. **Verdict** — status and decisive reason.
2. **Value Case** — the six audited fields and audience model.
3. **Primary Deliverable** — one ready-to-use artifact allowed by the gate.
4. **Integrity Notes** — claim ledger, required qualifiers, evidence gaps, and
   next action.

Default to chat output. Edit only files the user explicitly names. Draft PR
plans, outreach, and posts locally; publish, send, or contact people only after
the user authorizes that external action. Match the user's language unless the
target artifact establishes another language.

**Complete when:** the audience and action are explicit; the verdict matches
the research maturity; every material claim is traceable; the deliverable
preserves boundaries and costs; and the next action is concrete.
