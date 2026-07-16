# AI-Human Research OS

The domain language for a file-system-native environment where AI agents and humans continue research through durable artifacts, bounded autonomy, reusable experience, and explicit evaluation.

## Language

**Long-term Research OS**:
The product vision: an AI-native research environment in which agents can independently and collaboratively continue research while humans supply direction, artifacts, constraints, and review.
_Avoid_: current build, MVP, launcher

**Research OS MVP**:
The smallest end-to-end version that proves a human can provide a partial research state, an agent can place and understand it, continue bounded research, produce traceable artifacts, and return control to the human. `build_phases/` is its execution contract.
_Avoid_: thin launcher, demo, final Research OS

**Research Input Artifact**:
A human- or agent-provided research item that can become part of ongoing work, such as an idea, document, paper set, dataset, codebase, or partial experiment.
_Avoid_: upload, prompt, miscellaneous file

**Research Continuation**:
Resuming work from durable project artifacts and recorded state without depending on a previous chat transcript.
_Avoid_: continue chat, resume session

**Research Project**:
The bounded workspace that owns a research question, project state, code, evidence, outputs, evaluation, and project-specific experience.
_Avoid_: folder, chat, run

**Project Skill**:
Reusable procedural experience proven useful inside one Research Project and stored locally because broader transfer has not yet been established.
_Avoid_: note, global skill, prompt snippet

**Hub Skill**:
A skill whose usefulness has been established beyond one project or domain-specific episode and is made discoverable through `research-skills-hub/`.
_Avoid_: project skill, unreviewed lesson, automatic promotion

**Research Task**:
A bounded unit of agent work with explicit inputs, success criteria, budget, stopping condition, findings, and reviewable artifacts.
_Avoid_: unrestricted agent, background thought, vague subagent

**Parallel Research Round**:
A bounded comparison in which multiple Research Tasks explore different approaches under shared evaluation and budget constraints before verified results are selected or merged.
_Avoid_: unlimited subagents, duplicate runs, parallel chat

**Research Artifact**:
A durable, inspectable output such as a note, plan, code change, dataset record, experiment result, figure, evaluation, or draft that carries provenance and can survive agent-session loss.
_Avoid_: transcript, hidden state, unsupported claim

**Experience Promotion**:
The evidence-gated movement of a lesson from project records to a Project Skill and, only after demonstrated transfer, to a Hub Skill.
_Avoid_: automatic skill generation, copying every lesson to the hub
