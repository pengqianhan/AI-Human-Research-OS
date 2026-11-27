---
type: HumanCognitionQuadrant
title: Unknown Knowns
description: Human criteria, assumptions, or preferences that were implicit until revealed through interaction.
quadrant: unknown_knowns
tags: [human-cognition, unknown-knowns]
timestamp: 2026-07-04T00:00:00+12:00
---

# Unknown Knowns

## Active Index

- cog-20260724-001 - Agent neutrality as a veto: rejects OS mechanisms that work in only one agent harness, even when they are the most reliable option.
- cog-20260908-001 - Lingua franca for shared artifacts: keeps UI chrome and skill docs in English and confines Chinese to the human's own note content.
- cog-20260929-001 - Reuse-first templates: a template is the greatest common divisor of its projects, so no project starts from scratch, and each project must stay exportable as its own repository.
- cog-20260929-002 - Scripted tooling before a scheduled agent: for one mechanical recurring chore (the related-projects scan), preferred a `gh` keyword script over a Claude scheduled task; low confidence.
- cog-20261014-001 - A gate that needs routine human clearing is removed, not staffed: for the skill mirror sync, twice dropped a manual safeguard for automation plus an audit trail, while keeping the machine-enforced CI gate; medium confidence.
- cog-20261121-001 - The running product outranks its documents: checks the agent's claims about a reference product against the installed app and answers with screenshots; medium confidence.
- cog-20261122-001 - Reading surface before conversation: for the desktop layout, chose the document-first mockup over the conversation-centred one the agent recommended; low confidence.
- cog-20261126-001 - OpenResearch as the worked example for product mechanics: when a mechanism is open (the Git binding, the bundled demo, whether the app commits), points the agent to how OpenResearch does it, while keeping the decision their own.
- cog-20261127-002 - The product is its code, not its paper trail: a file belongs in the product repository only if building, running, or understanding the app needs it; planning, history, and superseded artifacts stay out or are deleted.
- cog-20261127-003 - One name everywhere: when the app was renamed, had the address no user sees renamed too, against the agent's advice to keep it for a smaller change; low confidence.

## Entries

## cog-20260724-001 Agent neutrality as a veto

- content: The human applies cross-agent portability as a hard constraint on Research OS mechanisms, not as a preference to be traded off. A mechanism that works in one harness but not the others is rejected even when it offers the strongest guarantee.
- source: inferred
- confidence: high
- evidence: While designing autonomous capture for `human-cognition-cache`, the agent proposed a Claude Code Stop hook as the reliability fallback. The human rejected it unprompted, on the grounds that it would leave the OS inapplicable to codex and Pi Coding Agent, and accepted a weaker prompt-level guarantee instead. The criterion had not been stated anywhere in the cache or `INSTRUCTION.md` beforehand. 2026-11-21: applied again in the positioning session. The human required the app to support Claude Code, Codex, and Antigravity by default (「默认要像ohmygame 那样支持使用claude code ,codex, agy」) and accepted an agent registry with ACP for further agents; no decision in the session privileges one harness.
- created: 2026-07-24
- last_updated: 2026-11-21
- status: active
- domain: Research OS architecture and governance
- scope: Mechanism and tooling selection for the Research OS; no claim about portability preferences in project-level research code.
- evidence_type: explanation
- last_verified: 2026-11-21
- freshness: current
- responsibility_relevance:
  - Do not propose harness-specific machinery (Claude Code hooks, settings.json automation, provider-only APIs) for OS-level behavior; reach for `AGENTS.md`, skills, and files.
  - When only a harness-specific option would meet a reliability bar, surface the trade-off rather than assuming the guarantee wins.
- related:
  - [cog-20260716-002](known_knowns.md#cog-20260716-002-outcome-level-research-os-vision)

## cog-20260908-001 Lingua franca for shared artifacts

- content: The human separates an artifact's chrome from its content when deciding language. Anything another person or agent could reuse — UI labels, control names, tab titles, skill documentation — stays English; the human's own note content is where Chinese belongs. Localization is confined to content and is not allowed to spread into the shared surface.
- source: inferred
- confidence: high
- evidence: While adding a timeline view to `paper-wiki/viz.html`, the human opened the request in Chinese and asked for the existing page to be named 「引用图谱」. Offered four naming options, they chose English `Graph` / `Timeline` over their own Chinese framing. One turn later they had already accepted a proposed global 中/英 switch driving both the list titles and the note body; they then pulled it back unprompted — "尽量保持全局的英文显示，只有论文笔记是可以中英文切换" — narrowing the switch to the note body alone. Neither the criterion nor its reason appeared in the cache, `INSTRUCTION.md`, or the skill beforehand.
- created: 2026-09-08
- last_updated: 2026-09-08
- status: active
- domain: Research OS artifacts and reusable skills
- scope: Language of UI text and documentation in repository artifacts and hub skills; no claim about the language of prose the human writes for themselves, or of conversation.
- evidence_type: explanation
- last_verified: 2026-09-08
- freshness: current
- responsibility_relevance:
  - Author new UI strings, control labels, and skill documentation in English by default, even when the request arrives in Chinese.
  - Treat any proposal that spreads localization into shared chrome as needing explicit approval; the human will otherwise pull it back.
- related:
  - [cog-20260724-001](#cog-20260724-001-agent-neutrality-as-a-veto)

## cog-20260929-001 Reuse-first templates as the projects' greatest common divisor

- content: The human designs project templates so that no project starts from scratch. A template is the greatest common divisor of its projects: a new project inherits it, and later project changes build on it rather than replacing it. Each project must also be able to leave the OS as a standalone repository. Neither criterion was written in the repository until the human stated them as a correction.
- source: user-confirmed
- confidence: high
- evidence: 2026-09-29, after the agent changed the template so that each project would rewrite its `index.md` from scratch, the human explained the template's purpose: 「总的思想还是想着不用每次都从零开始，这样会做很多重复工作。template尽量作为不同project 的最大公约数」. Asked to compare three designs, they answered 「希望项目能单独成独立仓库」, which settled on copying the template's shared parts, and raised a per-project `AGENTS.md` themselves. Recorded as the project-template decisions in HANDOFF.md.
- created: 2026-09-29
- last_updated: 2026-09-29
- status: active
- domain: Research OS project scaffolding
- scope: Project templates and the relationship between a template and its projects under `projects-folder/`; no claim about other OS areas.
- evidence_type: explanation
- last_verified: 2026-09-29
- freshness: current
- responsibility_relevance:
  - When changing a project's structure, keep the template's shared parts and add project content beside them; send improvements that every project needs to the template first.
  - Check proposals for exportability: a project still has to work after it is copied out of the OS.
  - Raise any change that would make projects diverge from their template as a design question, not as a local cleanup.
- related:
  - [cog-20260724-001](#cog-20260724-001-agent-neutrality-as-a-veto)
  - [cog-20260716-002](known_knowns.md#cog-20260716-002-outcome-level-research-os-vision)

## cog-20260929-002 Scripted tooling before a scheduled agent for mechanical chores

- content: For a recurring chore that a deterministic tool can do, the human may prefer a plain script over a scheduled LLM agent. For the GitHub related-projects scan they accepted noisier keyword matches in exchange, with pruning moved into their own PR review. Recurring work that needs reading and judgment, such as the daily paper routine, stays with an agent.
- source: inferred
- confidence: low
- evidence: 2026-09-29, while the agent was setting up the related-projects scan as a Claude desktop scheduled task modelled on `autoreadpaper`, the human interrupted the registration question with 「我在想可不可以用github cli 根据关键字来扫描，而不用claude 的定时任务呢？」. The scan was rebuilt as a GitHub Actions workflow with a standard-library script, and the Claude task was dropped. 2026-10-20: when steering the scan toward system-level and RSI projects, the human accepted keyword-script changes (new query groups, a cap on skill collections, an "In hub" column) and kept relevance judgment in their own PR pruning. Neither side proposed an agent-judged scan, so this is consistent with the entry but does not test it.
- created: 2026-09-29
- last_updated: 2026-10-20
- status: active
- domain: automation design
- scope: Choosing a mechanism for recurring, unattended repository chores; a single instance, phrased as a question, so it may be about this task's cost or friction rather than a general rule.
- evidence_type: explanation
- last_verified: 2026-10-20
- freshness: current
- responsibility_relevance:
  - When proposing a recurring automation, offer the scripted option (GitHub Actions, `gh`, a small script) next to the agent option, with the precision lost by dropping judgment, before building either.
- related:
  - [cog-20260724-002](known_knowns.md#cog-20260724-002-branch-as-the-containment-boundary-for-unattended-agent-work)
  - [cog-20260923-001](known_knowns.md#cog-20260923-001-human-read-agent-write-division-of-the-os)

## cog-20261014-001 A gate that needs routine human clearing is removed, not staffed

- content: When a safeguard turns into a step the human must clear by hand on a recurring basis, the human resolves it by removing the step and relying on automation plus an audit trail, and accepts the stated risk. Offered machinery that would preserve the safeguard, they prefer the option that deletes a mechanism. Gates a machine enforces are kept.
- source: inferred
- confidence: medium
- evidence: Two decisions on the `mattpocock-skills` mirror. 2026-07-24: after a refresh PR sat unmerged, the sync was changed to merge its own PR (ADR 0001 amendment). 2026-10-14: a refresh PR failed CI because installed copies no longer matched the hub. The agent recommended keeping the version pin and changing `verify.sh` to tolerate a lagging copy, and listed a workflow reinstall step and a clearer failure message as alternatives. The human proposed a fourth route themself, symlinking the installs (「如果那几个不是软链接安装的skill也改为软链接安装是不是就可以彻底解决了」), and chose it (「走软链接」) after being told it gives up "inert until installed" for the three installed skills. Counter-evidence that bounds the scope: on 2026-09-30 the human kept the required CI check on `main` with no owner bypass (「我自己也遵守规则」), a gate that clears itself.
- created: 2026-10-14
- last_updated: 2026-10-14
- status: active
- domain: automation and governance design
- scope: Safeguards on the third-party skill mirror in this repository, both observed on one subsystem with a trusted upstream; no claim about gates on research results, evaluation, publication, or consequential project decisions.
- evidence_type: explanation
- last_verified: 2026-10-14
- freshness: current
- responsibility_relevance:
  - When proposing a safeguard, state who clears it and how often; prefer one a machine enforces over one a person must remember.
  - When a mechanism misbehaves, offer the fix that removes a mechanism next to the fixes that add one.
  - State the risk being given up in one sentence, let the human accept it, and record it with a reversal path.
- related:
  - [cog-20260929-002](unknown_knowns.md#cog-20260929-002-scripted-tooling-before-a-scheduled-agent-for-mechanical-chores)
  - [cog-20260724-002](known_knowns.md#cog-20260724-002-branch-as-the-containment-boundary-for-unattended-agent-work)

## cog-20261121-001 The running product outranks its documents

- content: When the agent describes how a reference product behaves, the human checks the claim against the product running on their own machine and answers with a screenshot. What the shipped app does is, for them, the fact; a design document or an agent's summary of source code is not. They apply this without stating it as a rule.
- source: inferred
- confidence: medium
- evidence: 2026-11-21, twice in one session. Told (from OhMyGame's design document) that Claude Code and Codex runtimes were off by default and that Pi with an API key was the main path, the human sent a screenshot of the Agents settings page and reported use (「我没看到填写apikey的地方，也没看到pi agent，我使用的时候我本地有codex 和 claude code我就可以使用」); the screenshot also showed Antigravity offered through ACP plugins, which the agent had said was unsupported. Earlier in the session they sent a screenshot of OpenResearch's Agents settings and asked the agent to read the code against it. Both corrections changed decisions (the Agents page design, Pi's role). Related earlier behaviour: on 2026-09-26 they judged os-ui's agent integration from the screen, not from the description.
- created: 2026-11-21
- last_updated: 2026-11-21
- status: active
- domain: evidence standards in product design discussions
- scope: Claims about how reference products behave, in this repository's design work; no claim about how they weigh papers or research results.
- evidence_type: operation
- last_verified: 2026-11-21
- freshness: current
- responsibility_relevance:
  - Label any claim about a reference product by its source (design document, source code, or the running app), and say which was not checked.
  - When the claim decides a design question and the human has the product installed, ask what they see before relying on documents; run the app or read its defaults in code when possible.
- related:
  - [cog-20260716-002](known_knowns.md#cog-20260716-002-outcome-level-research-os-vision)
  - [cog-20260927-001](known_knowns.md#cog-20260927-001-glance-first-gui-visual-state-text-on-click)

## cog-20261122-001 Reading surface before conversation

- content: Offered three layouts for the desktop app, the human picked the one built for reading: project cards carry Home, the root agent is a compact bar that expands on demand, and a project's conversation collapses so a view can be read almost full width. They did not state a reason. The choice suggests that, for them, the research artifacts (projects, paper, code) are the main surface and the agent conversation is a tool beside it.
- source: inferred
- confidence: low
- evidence: 2026-11-21. Asked to choose among mockups A (conversation fills most of Home, existing palette), B (dense dark workbench), and C (document first), with the agent recommending A plus C's collapsible conversation, the human answered only 「选 C」. One choice with no stated reason; the palette and typography of C may have weighed as much as its structure.
- created: 2026-11-22
- last_updated: 2026-11-22
- status: active
- domain: interface design for the Research OS desktop app
- scope: The step 1 layout choice; no claim yet about other views or about how much they use the conversation in practice.
- evidence_type: operation
- last_verified: 2026-11-22
- freshness: current
- responsibility_relevance:
  - In later mockups (Idea, Skeleton, Assets), default to giving the artifact the width and keeping the conversation collapsible, and say that this default comes from one choice.
  - When recommending against it, show the alternative as a mockup; a recommendation in prose did not move the choice.
- related:
  - [cog-20260927-001](known_knowns.md#cog-20260927-001-glance-first-gui-visual-state-text-on-click)

## cog-20261126-001 OpenResearch as the worked example for product mechanics

- content: For how the desktop app should do a concrete thing, the human reaches for OpenResearch as the worked example. They do not hand it the decision: they accept or set the default themselves and add that the agent may look at how OpenResearch does it. It works for them as a source of proven mechanics, not as a product to copy whole.
- source: inferred
- confidence: medium
- evidence: 2026-11-21, in the repositioning session, they took only its Git binding (「openresearch 的git 绑定我觉得很适合ressearch」) and described the wedge as 「openresearch 和 ohmygame的结合版」. 2026-11-26, answering step 3's design questions, they accepted two defaults and attached the same pointer to each: 「1 接受默认，你可以参考OpenResearch 的做法，默认带一个nanochat的demo，3接受默认，你也可以参考OpenResearch的做法」. Three statements across two sessions, all about mechanics.
- created: 2026-11-26
- last_updated: 2026-11-26
- status: active
- domain: product design of the Research OS desktop app
- scope: Mechanics of the app (Git binding, example project, run records). No claim about its experiment tree, compute dispatch, or database, which the human set aside on 2026-11-21, or about visual design.
- evidence_type: explanation
- last_verified: 2026-11-26
- freshness: current
- responsibility_relevance:
  - When a design question is about how a mechanism should work, read what OpenResearch does first and put it beside the options as fact, cited at a commit, before recommending.
  - Say plainly where a recommended default differs from OpenResearch's practice, so the human chooses knowing the difference.
  - Reuse ideas by reimplementation only; its code and text are not copied.
- related:
  - [cog-20261121-001](unknown_knowns.md#cog-20261121-001-the-running-product-outranks-its-documents)

## cog-20261127-002 The product is its code, not its paper trail

- content: The human holds a boundary the agent had not: the product repository is the client's code and what it ships, and the record of how it was planned and built is not part of the product. An artifact that pictures or documents an earlier form of the system belongs to that earlier system, and one nothing uses any more is deleted, not carried along. They state the boundary by reacting to a concrete item that crosses it, not as a rule in advance.
- source: inferred
- confidence: medium
- evidence: 2026-11-27, after an import rehearsal whose inventory classed the development record (HANDOFF, step designs, old ADRs, a screenshot) as going with the product, the human corrected one item and named the criterion: 「superagent-os是客户端相关的代码，旧截图应该是human ai research os 的截图，这个截图完全不用放在superagent-os 里的」. Asked next for a rule, they accepted "only what building, testing, running, and understanding the app needs", and that the product repository has no HANDOFF. In the same session, unprompted, on an old mockup the agent had proposed to check before deciding: 「os-ui/mockup.html 已经完全没用了,可以删除」. The rule's wording was the agent's and was accepted with a batch of recommendations (see cog-20260923-002), so the boundary's exact line is less certain than its direction.
- created: 2026-11-27
- last_updated: 2026-11-27
- status: active
- domain: repository layout and scope of the Research OS product
- scope: What belongs in the product repository against this workspace repository, and whether superseded artifacts are kept. No claim about how they treat research records, results, or papers, where the repository's rules preserve originals.
- evidence_type: explanation
- last_verified: 2026-11-27
- freshness: current
- responsibility_relevance:
  - When sorting files between the product and the workspace, class by what the app needs, and leave out anything that only records how it came to be; when unsure, leave it out and say so.
  - Show a sorting as a short list of concrete files per class before building on it: the human corrects from examples, and a class name such as "development record" hid the disagreement for a day.
  - When an artifact is superseded, ask whether to delete it, instead of proposing to carry or re-check it.
- related:
  - [cog-20261121-001](unknown_knowns.md#cog-20261121-001-the-running-product-outranks-its-documents)
  - [cog-20260923-002](known_knowns.md#cog-20260923-002-recommended-defaults-in-grilling-rounds-are-accepted-without-close-reading)

## cog-20261127-003 One name everywhere

- content: When a thing is renamed, the human wants the new name to hold in the parts nobody sees as well as the parts shown, and counts that consistency as worth a larger change. The agent had weighed only who would see the old name and how many lines the change touches.
- source: inferred
- confidence: low
- evidence: 2026-11-27, choosing from the rename mockup, the human accepted every recommendation except one. The mockup proposed keeping the app's internal address, because it touches 112 lines and no user sees it; they answered 「应用内部地址也改为app://superresearch-os 吧，这样可以保持一致性」. At a moment when the change was still free (nobody had the app installed). Later the same day, asked about the two internal names the rename had left (a shell marker and the client name sent to Codex), they answered 「都改名」.
- created: 2026-11-27
- last_updated: 2026-11-27
- status: active
- domain: naming in the Research OS product
- scope: Identifiers derived from the product's name, at a rename made before anyone depends on the old ones. No claim about renames that would break installed copies or stored data, or about names outside the product.
- evidence_type: explanation
- last_verified: 2026-11-27
- freshness: current
- responsibility_relevance:
  - When a rename leaves an internal identifier on the old name, put it to the human as a choice with its cost, and do not recommend keeping it on the ground that it is invisible.
  - Expect "rename" for such leftovers unless the cost is real, and say what the cost is.
- related:
  - [cog-20261127-002](unknown_knowns.md#cog-20261127-002-the-product-is-its-code-not-its-paper-trail)
