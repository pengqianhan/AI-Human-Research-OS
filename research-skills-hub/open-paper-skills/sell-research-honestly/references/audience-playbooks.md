# Audience Playbooks

Load only the section for the current audience. Facts and evidence remain
fixed across playbooks; emphasis changes with the decision being requested.

## Advisor: decision brief

### Model

- **Values:** research significance, feasibility, learning value, and portfolio
  fit.
- **Risks:** student time, compute, opportunity cost, and an unbounded project.
- **Likely objection:** the idea is interesting but insufficiently scoped or
  validated.
- **Decision evidence:** a cheap discriminating test, credible upside, explicit
  cost, and a stop condition.

### Primary deliverable

Keep the brief within one page:

1. decision requested;
2. problem and why it matters;
3. current gap and proposed insight;
4. existing evidence;
5. smallest validation, budget, and duration;
6. risks and stop condition;
7. immediate next action.

Make approval bounded: ask for a defined validation window rather than vague
support for an entire research program.

## Collaborator: scoped invitation

### Model

- **Values:** an interesting shared problem, complementary contribution, and a
  reliable partner.
- **Risks:** unclear ownership, open-ended labor, coordination cost, and weak
  follow-through.
- **Likely objection:** the opportunity is relevant, but their role or payoff
  is unclear.
- **Decision evidence:** concrete preliminary evidence, why their expertise is
  uniquely relevant, defined responsibilities, and the first small commitment.

### Primary deliverable

Write a sendable invitation:

1. authentic connection to their work;
2. the specific opportunity;
3. one credible evidence point;
4. why their contribution matters;
5. proposed division of work and expected effort;
6. a low-cost next conversation or artifact review.

Make the collaboration legible before making it exciting.

## Reviewer: claim–evidence defense brief

### Model

- **Values:** a clear contribution, novelty, soundness, fair comparison,
  reproducibility, and calibrated scope.
- **Risks:** accepting a claim that the design cannot support.
- **Likely objection:** the claim is broader than the evidence or the gain has
  an alternative explanation.
- **Decision evidence:** exact claim language, direct result pointers, fair
  baselines, uncertainty, ablations or controls, and acknowledged limitations.

### Primary deliverable

Produce a compact defense brief:

1. exact claim under review;
2. direct answer;
3. evidence and where it appears;
4. fairness and alternative-explanation check;
5. narrowed language or additional validation when required;
6. concrete manuscript revision.

This brief can feed a rebuttal or revision skill; it is not a substitute for a
full venue-specific rebuttal workflow.

## Talk audience: memorable narrative

### Model

- **Values:** relevance, a usable mental model, and one conclusion worth
  remembering.
- **Risks:** attention, cognitive load, and technical detail without payoff.
- **Likely objection:** the result may be valid but unrelated to their work.
- **Decision evidence:** an intuitive failure case, one mechanism-level
  insight, and one decisive visual or result.

### Primary deliverable

Build this outline:

1. audience-relevant hook;
2. concrete problem or failure;
3. why the obvious approach is insufficient;
4. new insight and solution;
5. strongest evidence;
6. boundary or cost;
7. one-sentence takeaway and next action.

Use detail to earn the takeaway; remove detail that serves neither
understanding nor trust.

## Research community: PR brief

### Model

- **Values:** relevant new information, reusable artifacts, credible evidence,
  and an easy path to inspect or use the work.
- **Risks:** attention, setup cost, hidden limitations, and promotional noise.
- **Likely objection:** the message sounds broad but does not show a concrete
  use or result.
- **Decision evidence:** one memorable supported claim, a visual or demo,
  transparent limitations, accessible code or paper, and a specific call to
  action.

### Primary deliverable

Create a PR brief with:

1. exact target community;
2. single message they should remember;
3. supporting result or demonstration;
4. best channel and artifact;
5. honest boundary and setup cost;
6. action: inspect, try, reproduce, discuss, cite, or collaborate;
7. outcome signal tied to that action.

Prefer qualified use, reproduction, substantive discussion, citation, or
collaboration over raw impressions, likes, or shares.

## Feedback loop

When the user returns real feedback, classify it before revising:

| Class | Diagnostic question | Typical response |
| --- | --- | --- |
| Comprehension | Did the audience understand the problem and contribution? | Clarify the narrative or artifact. |
| Value | Did they see why the result matters? | Reconnect supported value to their stakes. |
| Trust | Did they believe the claim? | Add evidence, narrow scope, or expose cost. |
| Fit | Was this the right audience or venue? | Retarget without changing facts. |
| Timing | Was the request actionable now? | Change the ask or sequence. |

Treat feedback as evidence about communication and fit. Treat new research
claims as true only when research evidence supports them.

## Illustrative example: one study, five framings

The following facts are fictional and exist only to demonstrate invariant
facts with variable emphasis. Never reuse them as real evidence.

### Fixed evidence

`Selective Cache` was tested on Models A and B on Dataset X across five seeds.
It reduced median inference latency by 18%, changed accuracy by no more than
0.2 percentage points, and increased memory use by 7%. It was not tested on
other model families or contexts longer than 64k tokens.

### Claim ledger

| Claim | State | Evidence-safe wording |
| --- | --- | --- |
| Latency benefit in the tested setup | observed | Reduced median latency by 18% on Models A/B and Dataset X. |
| Accuracy preservation in the tested setup | observed | Accuracy changed by at most 0.2 points in these runs. |
| Low cost | inferred | Trades 7% more memory for lower latency in the tested setup. |
| Model-agnostic improvement | unsupported | Omit; only two models were tested. |
| Long-context performance | unsupported | State the untested >64k boundary. |

### Advisor

> I am asking for one week to test whether the 18% latency reduction persists
> on a third model family. The current result is stable across five seeds, with
> a 7% memory trade-off; failure to reproduce on the third family is the stop
> condition.

### Collaborator

> We found an 18% median latency reduction on two models, but generality is the
> open question. Your long-context evaluation setup could test the load-bearing
> boundary; I propose that we supply the method and baseline runs while you own
> the >64k evaluation.

### Reviewer

> We narrow the claim to Models A/B on Dataset X. Across five seeds, median
> latency fell 18%, accuracy changed by at most 0.2 points, and memory rose 7%.
> We will report the >64k setting as untested rather than claim model-agnostic
> behavior.

### Talk audience

> The usual cache spends memory everywhere. Selective Cache asks where memory
> buys latency: on two tested models, a 7% memory increase bought an 18% median
> latency reduction without a material accuracy change. The open boundary is
> other families and contexts beyond 64k.

### Research community

> Selective Cache reduced median latency 18% on Models A/B and Dataset X, with
> a 7% memory increase and accuracy within 0.2 points. Try the released setup on
> another model family and share whether the trade-off holds; >64k contexts
> remain untested.

## Provenance

This playbook distills the user-provided article “AI-PhD.SKILL 4：人人都是销售”.
The article's author and source URL were not provided.
