---
type: HumanCognitionQuadrant
title: Known Knowns
description: Human-confirmed cognition that the human can already state clearly.
quadrant: known_knowns
tags: [human-cognition, known-knowns]
timestamp: 2026-07-04T00:00:00+12:00
---

# Known Knowns

## Active Index

- cog-20260716-001 - Python and PyTorch familiarity: self-reported working familiarity with Python programming and deep-learning training in PyTorch.
- cog-20260716-002 - Outcome-level Research OS vision: can state desired human-agent research outcomes and collaboration flows without prescribing the implementation route.
- cog-20260724-002 - Branch as the containment boundary for unattended agent work: scopes recurring autonomous runs to a named branch, merges their output into main only after review, and expects it readable off the dev machine.
- cog-20260923-001 - Human-read, agent-write division of the OS: the GUI exists for human observation; agents mutate paper-wiki, skills, and projects only through skills with scripted interfaces.
- cog-20260923-002 - Recommended defaults in grilling rounds are accepted without close reading: executive decisions inside a round are effectively the agent's; directional vetoes happen separately.
- cog-20260927-001 - Glance-first GUI: state shown with visual elements and minimal text; sentences only after a click.
- cog-20260930-001 - Human and LLM remember papers differently: a human retains what they read, while an LLM keeps a paper only through its note, so the human marks their own reading in the note for agents to look up.
- cog-20261002-001 - Own habit as the default, user choice as a setting: in the published OS, the human's personal workflow (reading papers via HF read, then alphaXiv) ships as a default that each user can change.

## Entries

## cog-20260716-001 Python and PyTorch familiarity

- content: The human reports familiarity with Python programming and training deep-learning models with PyTorch.
- source: user-confirmed
- confidence: high
- evidence: The human explicitly stated this capability while defining how implementation tutorials should teach unfamiliar technologies.
- created: 2026-07-16
- last_updated: 2026-07-16
- status: active
- domain: software and machine learning
- scope: Python programming and PyTorch-based deep-learning training; no claim about every Python ecosystem or training stack.
- evidence_type: self-report
- last_verified: 2026-07-16
- freshness: current
- responsibility_relevance:
  - Use Python, PyTorch, pathlib, subprocess, state-machine, and training-loop analogies when teaching new implementation mechanisms.

## cog-20260716-002 Outcome-level Research OS vision

- content: The human can articulate the desired end state and research collaboration flows, while explicitly delegating detailed technical route design beyond their current knowledge.
- source: user-confirmed
- confidence: high
- evidence: The human described intake from ideas, documents, papers, and partial experiments; autonomous continuation; project and hub skill learning; and parallel agent research, while stating they cannot provide detailed implementation instructions. 2026-09-23: opened the project-management design with an outcome statement only (a skill as the agents' interface to `projects-folder/`, mirroring the paper-wiki and skill-hub skills) and left the whole route — operation set, state source, contract location, tracking, verification plan — to three grilling rounds, accepting every recommended default. 2026-09-26: extended the vision to a product — users bring their own coding-agent subscription (after seeing Orca and alphaXiv OpenResearch), the human talks only to one root agent that coordinates per-project agents to cut attention loss when switching projects, and the OS manages session traces so agents can reflect on history — and again delegated the mechanism analysis to the agent. Same day: named Pi Agent as the intended long-term engine but chose subscription-driven Claude/Codex CLIs for speed, accepted the recommended OpenResearch-style adapter layering by restating it, and delegated implementation and verification with one constraint: “尽量简单的实现，不要太复杂，简单有效最好”. Later that day they cut the first example project twice, from a 30-minute run to “只要它小到足够让所有用户能够作为例子试验一遍即可”, stating the priority outright: “我们的任务重点是构建 AI Home Research OS，这个训练只是作为一个小例子”. Example projects exist to let any user try the OS once; their research content is secondary. 2026-09-27: cancelled the long-planned first real project outright (“我只需要保留 Example Project 和 Nano Chat 这两个 Project 作为示例就可以了。Circle Packing 我觉得可以删除”), keeping the portfolio to the two examples. 2026-09-30: specified the unified paper search the same way, by pointing at a reference product and naming the additions (“参考openresearch 给 我的research OS 设计一个统一的paper 搜索接口，在openresearch 的基础上添加hugging face 和 … pwc-cli#mcp-server 的来源，同时像openresearch那样添加按钮来开闭来源”), leaving the CLI, result shape, switch storage, and UI placement to the agent. A reference product plus named deltas recurs as their way to specify a feature (OpenResearch also seeded the harness layering and the nanochat example). 2026-10-02: before approving the paper-search read order they asked how it compared with OpenResearch's unified paper interface (「和…OpenResearch…中统一的论文搜索接口相比有什么优点和缺点」), and held execution until the logic was settled (「先不执行，先来聊一下执行逻辑」); they then approved the hybrid design in one word.
- created: 2026-07-16
- last_updated: 2026-10-02
- status: active
- domain: Research OS product direction
- scope: Outcome and value-level product direction, not implementation architecture or technology selection.
- capability_level: awareness
- evidence_type: explanation
- last_verified: 2026-10-02
- freshness: current
- responsibility_relevance:
  - Preserve human authority over research goals, autonomy limits, budgets, irreversible actions, and acceptance criteria.
  - Size example and smoke-test projects for the least capable user's machine and patience, and say so in their READMEs; propose research-grade scale only when the human asks for a result.

## cog-20260724-002 Branch as the containment boundary for unattended agent work

- content: When delegating recurring work that runs without supervision, the human names a single branch as the sole write surface and states it as a hard constraint rather than a suggestion. Unattended output that should reach `main` goes through their own review and merge. They separately expect the resulting artifact to be readable away from the development machine, including from another country, so unattended output must land somewhere they can reach without the repo checkout.
- source: user-confirmed
- confidence: medium
- evidence: Setting up a daily Hugging Face agent-paper reading routine, the human specified that every operation must happen only on the `autoreadpaper` branch, and in the same request asked that `paper-wiki/viz.html` be published to the internet so they could read the notes from abroad. 2026-09-29: asking for a recurring scan of GitHub for related projects, they set the gate themselves: 「填写到os-build\references\related-projects.md 中，我审核后合并到main」, which became a scan branch plus a PR they review.
- created: 2026-07-24
- last_updated: 2026-09-29
- status: active
- domain: autonomy governance and delivery of agent output
- scope: Unattended or scheduled agent work in this repository; no claim about branch discipline in interactive sessions the human is watching.
- evidence_type: explanation
- last_verified: 2026-09-29
- freshness: current
- responsibility_relevance:
  - For any scheduled or long-running autonomous task, verify the working branch before the first write and never touch `main` or open a PR without being asked; when the task's output is meant for `main`, deliver it as a PR for the human to review rather than merging.
  - Treat "the agent produced files in the repo" as incomplete delivery when the human is away from the machine; pair unattended runs with a reachable published view.
- related:
  - [cog-20260724-001](unknown_knowns.md#cog-20260724-001-agent-neutrality-as-a-veto)

## cog-20260923-001 Human-read, agent-write division of the OS

- content: The human holds, and states as a standing design principle, that the Research OS GUI exists for human observation while code agents perform all mutation of the OS's managed areas (paper-wiki, skills, projects) through skills that expose scripted interfaces. A management need in an OS area is therefore met by a skill, not by a GUI action. The GUI's operating surface is conversation with agents: the root agent for the whole OS, and, at the human's request, a direct entry into each project's agent (“root agent 来管理不同的 project。但是也应该提供 project 中的入口，让用户直接操作和管理project”). The human treats "copy a launch command" as not being integration, and wants both levels of control, not only the root agent.
- source: user-confirmed
- confidence: high
- evidence: 2026-09-23, opening the project-management design: 「整个OS 图形界面是给人看，code agent 来管理paper-wiki, skill,和project，现在paper-wiki 和 skill-hub 都有对应的 skill 来添加，删除和管理，但是projects 还没有skill」. Applied consistently before: the 2026-07-22 skill-management session confined `os-ui` to a single disable/enable write slice and kept install and remove on the command line (HANDOFF "Skill-management decisions"); on 2026-09-23 the human accepted that `os-ui` stays read-only for projects with no stage toggle, and that the GUI's unregistered-project warning is only a cue for an agent to run `sync`. 2026-09-26: after seeing the dashboard remotely, the human objected that 「claude code 和 codex 还是复制链接，不是接入，也没有一个对话框提供给人类给 root agent 对话」 and had the Root Agent window built; mutation of OS areas still goes through the root agent and skills, not through GUI buttons. 2026-09-30: the human themselves proposed a GUI write, a Paper Wiki viewer button to mark a paper read that records the status in its Markdown file (「对于网页可以添加一个按钮来让人类来标记读过」), and approved the os-ui endpoint when asked. The write carries the human's own state and runs through a skill script (`set_status.py`), so the principle holds for agent mutations while the GUI may carry the human's own records.
- created: 2026-09-23
- last_updated: 2026-09-30
- status: active
- domain: Research OS architecture and division of labour
- scope: Where write authority sits between the GUI and agents in this Research OS; no claim about GUI design preferences in general or about other tools.
- capability_level: awareness
- evidence_type: explanation
- last_verified: 2026-09-30
- freshness: current
- responsibility_relevance:
  - When a request implies a GUI write action, route it to an explicit M4-style authorization decision rather than building it; the authorized exceptions are the root-agent conversation, the skill toggle, and the human's own paper reading status.
  - Treat "agent integration" in the GUI as meaning live conversations, with the root agent and with each project's agent, never a copied command.
  - When the human asks to "manage" an OS area, propose a hub skill with a stdlib script and a `verify.sh` check, following `paper-wiki-manager`, `research-skill-installer`, and `research-project-manager`.
- related:
  - [cog-20260724-001](unknown_knowns.md#cog-20260724-001-agent-neutrality-as-a-veto)

## cog-20260923-002 Recommended defaults in grilling rounds are accepted without close reading

- content: The human states that in grilling rounds they accept the agent's recommended defaults without reading each one closely. Inside a round, the recommendation is therefore effectively the decision. Their directional judgement is exercised separately and has produced vetoes, so this describes the executive and mechanical layer only.
- source: user-confirmed
- confidence: high
- evidence: Raised as a hypothesis on 2026-09-23 after 16 of 16 recommended defaults were accepted across three rounds with one-line replies. Asked directly whether they read each recommendation's evidence or trusted the format, the human answered 「我基本没细看，直接接受了推荐」. Directional counter-evidence stands: the 2026-07-19 SDK route reset and the 2026-07-22 amendment of GOAL.md M3's trigger were the human's own vetoes. Later the same day, given three options without a recommendation on deleting the route map, the human chose one directly (「全部删除」), which supports withholding recommendations on directional-grade questions. 2026-09-26: contrary to this entry's guidance, the agent marked one option "(Recommended)" in a directional-grade question (adopt the revised GOAL.md draft, execute the unrevised GOAL.md, or rework the draft first), and the human chose the recommended option. The human had asked for the draft and then to execute "the GOAL", so the choice probably matched their intent; the observation cannot separate intent from default acceptance. 2026-09-29, outside a grilling round: a two-question prompt on a README.md update carried a recommendation on each question. The human took the recommended scope ("sync to current state") but overrode the recommended roadmap handling ("keep the original text, annotate status") and chose "condense", which rewrites their own roadmap wording. This supports the grilling-round scope: in a short prompt about their own authored text, the human reads the options and does not simply take the default. Later the same day, faced with a directional question (the role of the project template), the human asked to compare the agent's approach with their own before deciding (「我们先来聊一下你的做法和我的想法，看看二者哪个更合适再做决定」). Given three designs without a recommendation plus three deciding questions, they answered the questions, and the answers determined the design. This supports presenting directional questions as balanced options with the questions that decide them.
- created: 2026-09-23
- last_updated: 2026-09-29
- status: active
- domain: human-agent decision process in this repository
- scope: Executive and mechanical decisions presented inside grilling rounds with a recommendation attached; no claim about directional decisions.
- evidence_type: self-report
- last_verified: 2026-09-29
- freshness: current
- responsibility_relevance:
  - Treat a recommendation inside a round as the decision that will be taken: keep it reversible and record it in HANDOFF with a reversal path.
  - Mark each question as evidence-forced or judgment call, and flag directional-grade questions (those that change a standing decision or an OS principle) explicitly.
  - Present the one or two directional-grade questions of a round without a recommendation, as two balanced options with their costs, so the human chooses.
  - Six 2026-09-23 judgment calls were effectively agent-made: timing (Q1), Snapshot as source (Q3), archive semantics (Q8), Integrity Gate positioning (Q9), contract in TOML (Q11), Example_Project stage `probe` (Q14). Q3 and Q9 are directional-grade and stay open to a deliberate re-decision. The 2026-09-26 GOAL.md adoption was likewise taken on a recommended option and stays open to one.
- related:
  - [cog-20260716-002](known_knowns.md#cog-20260716-002-outcome-level-research-os-vision)

## cog-20260927-001 Glance-first GUI: visual state, text on click

- content: The human wants the OS interface to present state through visual elements (bars, chips, counts, timelines) with as little text as possible, and to reveal sentences only when the user clicks for detail. Dense text on a screen is treated as a defect even when it is accurate.
- source: user-confirmed
- confidence: high
- evidence: 2026-09-27, after viewing the dashboard remotely: 「Dashboard 和 Project Overview 页面尽量少的用文字，尽量用视觉元素来呈现信息。用户如果想看详情的话，点击才可以就可以看到」. Earlier the same evening they reported text overflowing its boxes as a problem worth fixing before any feature work, which is consistent with caring about the visual surface.
- created: 2026-09-27
- last_updated: 2026-09-27
- status: active
- domain: Research OS interface design
- scope: The os-ui desktop pages; no claim about documents, READMEs, or agent replies, where the human reads prose readily.
- capability_level: awareness
- evidence_type: explanation
- last_verified: 2026-09-27
- freshness: current
- responsibility_relevance:
  - When adding a UI panel, encode state in form (bar, chip, count, dot) first and put the sentence behind a disclosure; check both desktop and phone widths for overflow before showing it.
  - Treat a new text-heavy panel as needing a visual pass, not as done.
- related:
  - [cog-20260908-001](unknown_knowns.md#cog-20260908-001-lingua-franca-for-shared-artifacts)
  - [cog-20260923-001](#cog-20260923-001-human-read-agent-write-division-of-the-os)

## cog-20260930-001 Human and LLM remember papers differently

- content: The human reasons that after reading a paper a person keeps some of its content, while an LLM understands a paper only during the session that reads it and has forgotten it by the next. The note file is therefore the LLM's memory of the paper, and the human's reading state belongs in that file, set only by the human and kept easy for agents to search. An agent reading a paper in full is not the human reading it.
- source: user-confirmed
- confidence: high
- evidence: 2026-09-30, discussing the Paper Wiki viewer: 「对于人类来说，读完之后论文的内容或多或少会留存在脑子里，但是对于LLM 来说，只有在阅读的时候拥有论文的理解，下个session会忘记这篇论文」, followed by the design of a human-only “read” button that writes the note's `status`. Shown that agent runs had set `status: read` on papers the human may not have read, they decided 「只有人类改了status 才更新」 and reset every note to `unread`.
- created: 2026-09-30
- last_updated: 2026-09-30
- status: active
- domain: human-agent memory division in the Research OS
- scope: Reading state of paper-wiki papers and sources; no claim yet about how other OS memory layers should split human and agent knowledge.
- capability_level: awareness
- evidence_type: explanation
- last_verified: 2026-09-30
- freshness: current
- responsibility_relevance:
  - Treat `status: read` as “the human knows this paper”: reference it without re-explaining, and prefer `unread` papers when recommending reading.
  - Leave `status` at `unread` after agent reading, however complete the note is; the note body carries the agent's understanding.
- related:
  - [cog-20260923-001](#cog-20260923-001-human-read-agent-write-division-of-the-os)

## cog-20261002-001 Own habit as the default, user choice as a setting

- content: The human separates their own workflow from what the published Research OS imposes. Their habit becomes the default, and users get a manual choice. For papers, they read full text with Hugging Face's `hf papers read` first and the alphaXiv MCP second, and those two cover the papers they usually read. They want users of the released OS to pick the literature sources and their order themselves.
- source: user-confirmed
- confidence: medium
- evidence: 2026-10-02, while designing `paper-search fetch`: 「我自己在找论文的时候更喜欢用hf read 如果找不到就用alphaxiv 的 mcp，这两个工具基本能覆盖我常读的论文，但是我发布了research OS，我希望我的用户在用这个产品的时候可以手动选择论文的来源」. They accepted a configurable `read_order` defaulting to `huggingface → alphaxiv → arxiv` rather than a fixed route.
- created: 2026-10-02
- last_updated: 2026-10-02
- status: active
- domain: Research OS product design
- scope: Literature sources and read order in paper-search; no claim yet that every personal workflow should become a user setting.
- capability_level: awareness
- evidence_type: explanation
- last_verified: 2026-10-02
- freshness: current
- responsibility_relevance:
  - When a design mirrors the human's own tool habit, ship it as the default behind a user-changeable setting rather than a hard-coded route, and say which default came from their habit.
  - Read papers for this human through HF first and alphaXiv second unless the configured read order says otherwise.
- related:
  - [cog-20260716-002](#cog-20260716-002-outcome-level-research-os-vision)
  - [cog-20260724-001](unknown_knowns.md#cog-20260724-001-agent-neutrality-as-a-veto)
