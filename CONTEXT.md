# AI-Human Research OS

The domain language for a file-system-native environment where AI agents and the Human Owner continue research through durable artifacts, bounded autonomy, reusable experience, and explicit evaluation.

## Language

**Long-term Research OS**:
The product vision: an AI-native research environment in which agents can independently and collaboratively continue research while the Human Owner supplies direction, artifacts, constraints, and review.
_Avoid_: current build, MVP, launcher

**Research Workspace**:
The single root environment from which the Human Owner and root-level agent coordinate all Research Projects and access shared Paper Wiki, Memory, Ideas, Inbox, and Skill Hub resources.
_Avoid_: individual research project, agent session, application install directory

**Human Owner**:
The single human who holds final authority across the entire Research OS, including all Research Projects, accepted Claims, goal changes, abandonment decisions, and published outputs.
_Avoid_: per-project owner, approver group, interchangeable user

**Manager Agent**:
The workspace-level agent that proactively observes Agent Sessions, detects coordination problems, proposes durable state updates, and schedules work only within human-approved task, budget, permission, and stopping boundaries.
_Avoid_: unrestricted supervisor, project owner, final approver

**Research OS MVP**:
The smallest end-to-end version that proves a human can provide a partial research state, an agent can place and understand it, continue bounded research, produce traceable artifacts, and return control to the human. `os-build/build_phases/` is its execution contract.
_Avoid_: thin launcher, demo, final Research OS

**Research Input Artifact**:
A human- or agent-provided research item that can become part of ongoing work, such as an idea, document, paper set, dataset, codebase, or partial experiment.
_Avoid_: upload, prompt, miscellaneous file

**Source**:
An original research reference such as a paper, webpage, dataset, codebase, interview, or experiment record from which Evidence may be derived.
_Avoid_: evidence, claim, citation

**Evidence**:
A provenance-bearing, addressable excerpt or observation drawn from a Source or experiment and used to support or challenge a Claim.
_Avoid_: whole paper, source collection, unsupported note

**Claim**:
An auditable proposition whose support, contradiction, or uncertainty is assessed through linked Evidence.
_Avoid_: fact, source summary, ungrounded conclusion

**Research Continuation**:
Resuming work from durable project artifacts and recorded state without depending on a previous chat transcript.
_Avoid_: continue chat, resume session

**Audit Event**:
An immutable record of a meaningful Research Project state change, including its actor, reason, affected object, and related provenance. Corrections create new Audit Events rather than rewriting prior ones.
_Avoid_: chat message, mutable log entry, Git commit

**Research Project**:
The bounded workspace that owns a research question, project state, code, evidence, outputs, evaluation, and project-specific experience.
_Avoid_: folder, chat, run

**Write Lease**:
The temporary, exclusive authority held by one human or Agent Run to change a Research Project's authoritative state. It can expire or be transferred without transferring ownership of the project itself.
_Avoid_: project ownership, permanent lock, concurrent writer

**Project Skill**:
Reusable procedural experience proven useful inside one Research Project and stored locally because broader transfer has not yet been established.
_Avoid_: note, global skill, prompt snippet

**Hub Skill**:
A skill whose usefulness has been established beyond one project or domain-specific episode and is made discoverable through `research-skills-hub/`.
_Avoid_: project skill, unreviewed lesson, automatic promotion

**Research Task**:
A bounded unit of agent work with explicit inputs, success criteria, budget, stopping condition, findings, and reviewable artifacts.
_Avoid_: unrestricted agent, background thought, vague subagent

**Agent Run**:
One bounded execution attempt by an agent against a Research Task. A Research Task may have multiple Agent Runs, and a Run's success does not imply that the task or its findings have been accepted.
_Avoid_: research task, project, authoritative session

**Pi-Assisted Research Run**:
A Human Owner-approved, bounded Agent Run conducted through the existing Pi Coding Agent interface while its terminal remains open. Research OS files, declared validation, a Research Checkpoint, and a Review Package carry the durable state; current boundaries are procedural and review-based rather than enforced by a custom Research OS runtime.
_Avoid_: Autonomous Research Run, custom runtime, background daemon

**Autonomous Research Run**:
A future unattended Agent Run confined to one human-approved Research Project and Research Task with explicit write scope, validation, budget, and stopping conditions. Shared workspace knowledge remains read-only and proposed global contributions await human review. This is not the current workflow MVP.
_Avoid_: unrestricted autonomy, multi-project background agent, automatic global promotion

**Run Contract**:
A human-approved, frozen boundary for one bounded Agent Run, covering its goal, success criteria, resource and write scope, validation, budget, stopping conditions, and expected outputs. In the workflow MVP it is a file contract reviewed by the Human Owner; a future runtime may enforce it mechanically.
_Avoid_: prompt, informal instruction, mutable runtime plan

**Executable Validation**:
Validation of a Research Task through reproducible commands, tests, artifact checks, or metric thresholds defined by its Run Contract.
_Avoid_: agent confidence, unrecorded manual inspection, self-declared success

**Review Validation**:
Validation of a Research Task through a contract-defined package of Sources, Evidence, candidate Claims, counterevidence, and uncertainties that must be reviewed by the Human Owner.
_Avoid_: no validation, polished prose, automatic claim acceptance

**Agent Session**:
A runtime conversation and context container used by a participating agent. It may support multiple turns or Agent Runs but never owns authoritative research state.
_Avoid_: Pi process, research project, source of truth

**Session Event**:
A backend-neutral observation about an Agent Session, such as lifecycle, tool activity, resource use, file changes, checkpoints, or failures. It informs management but does not by itself change authoritative project state.
_Avoid_: Audit Event, raw token stream, accepted finding

**Research Checkpoint**:
A durable recovery point that records meaningful progress, findings, artifacts, and the next actionable state so work can continue after an Agent Run or session is lost.
_Avoid_: Pi session, chat history, final handoff only

**Resume Packet**:
A rebuildable, validated view of the authoritative project state needed for a human or agent to take over a Research Task. It reduces resumption cost without becoming a second source of truth.
_Avoid_: chat transcript, hidden prompt context, authoritative duplicate

**Project Integrity Gate**:
The mandatory validation boundary that authoritative project state must satisfy before a Write Lease can be granted. A failed gate permits diagnosis but not continued mutation of research state.
_Avoid_: best-effort warning, ordinary lint, automatic silent repair

**Parallel Research Round**:
A bounded comparison in which multiple Research Tasks explore different approaches under shared evaluation and budget constraints before verified results are selected or merged.
_Avoid_: unlimited subagents, duplicate runs, parallel chat

**Research Artifact**:
A durable, inspectable output such as a note, plan, code change, dataset record, experiment result, figure, evaluation, or draft that carries provenance and can survive agent-session loss. It may organize Sources, Evidence, and Claims but is not interchangeable with them.
_Avoid_: transcript, hidden state, unsupported claim

**Experience Promotion**:
The evidence-gated movement of a lesson from project records to a Project Skill and, only after demonstrated transfer, to a Hub Skill.
_Avoid_: automatic skill generation, copying every lesson to the hub
