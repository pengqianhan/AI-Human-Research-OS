# Claude Science Skills Catalog

English | [Chinese](SKILL_CATALOG_zh.md)

This file organizes every retained skill and agent profile in
`claude-science-skills` and labels its relationship to broad machine learning
research. It is a navigation document and does not modify upstream skills,
agents, or MCP servers.

## Labels

- `[ML-CORE]`: Compute, deployment, or inference infrastructure broadly useful
  across machine learning fields.
- `[ML-DOMAIN]`: Machine learning workflows specialized for biology, genomics,
  proteins, drug design, or single-cell research.
- `[GENERAL-RESEARCH]`: Cross-domain literature, paper, figure, PDF, or learning
  workflows.
- `[DOMAIN-SPECIALIZED]`: Domain-specific work whose primary task is not machine
  learning.
- `[SUPPORT]`: Product runtime, agent customization, web, or other supporting
  capabilities.

To find every machine learning related skill, search for `[ML-CORE]` and
`[ML-DOMAIN]`. For cross-domain machine learning work, start with `[ML-CORE]`
and combine it with `[GENERAL-RESEARCH]` as needed.

## Machine Learning Core

These skills can be reused across machine learning subfields and are not tied
to biology.

| Skill | Label | Purpose |
| --- | --- | --- |
| [compute-env-setup](skills/compute-env-setup/SKILL.md) | `[ML-CORE]` | Configure SSH, Slurm, containers, GPU software stacks, and model weight caches. |
| [managed-model-endpoints](skills/managed-model-endpoints/SKILL.md) | `[ML-CORE]` | Register and manage local or remote model inference services. |
| [remote-compute-modal](skills/remote-compute-modal/SKILL.md) | `[ML-CORE]` | Run GPU or CPU jobs in the user's Modal account. |
| [remote-compute-ssh](skills/remote-compute-ssh/SKILL.md) | `[ML-CORE]` | Submit, monitor, and harvest remote jobs on SSH or Slurm hosts. |
| [using-model-endpoint](skills/using-model-endpoint/SKILL.md) | `[ML-CORE]` | Call registered model endpoints through their native HTTP APIs. |

## Domain Machine Learning

These skills use machine learning, foundation models, or deep generative
models, but their workflows are specialized for biology, biomedicine, or drug
discovery.

| Skill | Label | Domain and purpose |
| --- | --- | --- |
| [alphafold2](skills/alphafold2/SKILL.md) | `[ML-DOMAIN]` | Predict protein monomer and complex structures. |
| [boltz](skills/boltz/SKILL.md) | `[ML-DOMAIN]` | Predict protein, nucleic acid, and small-molecule complex structures and affinity. |
| [borzoi](skills/borzoi/SKILL.md) | `[ML-DOMAIN]` | Predict functional genomic tracks from DNA sequences. |
| [chai1](skills/chai1/SKILL.md) | `[ML-DOMAIN]` | Predict biomolecular complex structures with Chai-1. |
| [diffdock](skills/diffdock/SKILL.md) | `[ML-DOMAIN]` | Predict small-molecule binding poses with a diffusion model. |
| [esmfold2](skills/esmfold2/SKILL.md) | `[ML-DOMAIN]` | Cofold biomolecules and produce protein language model representations and mutation scores. |
| [evo2](skills/evo2/SKILL.md) | `[ML-DOMAIN]` | Score, embed, and generate DNA with a long-context genomic foundation model. |
| [fair-esm2](skills/fair-esm2/SKILL.md) | `[ML-DOMAIN]` | Produce protein embeddings, mutation scores, and contact predictions. |
| [ligandmpnn](skills/ligandmpnn/SKILL.md) | `[ML-DOMAIN]` | Design protein sequences in ligand, nucleic acid, or metal contexts. |
| [openfold3](skills/openfold3/SKILL.md) | `[ML-DOMAIN]` | Predict protein, nucleic acid, and ligand complex structures with OpenFold3. |
| [proteinmpnn](skills/proteinmpnn/SKILL.md) | `[ML-DOMAIN]` | Inverse-design amino acid sequences from protein backbones. |
| [scgpt](skills/scgpt/SKILL.md) | `[ML-DOMAIN]` | Embed, cluster, and annotate single-cell expression data. |
| [scvi-tools](skills/scvi-tools/SKILL.md) | `[ML-DOMAIN]` | Apply probabilistic generative models to single-cell integration and differential expression. |
| [solublempnn](skills/solublempnn/SKILL.md) | `[ML-DOMAIN]` | Design protein sequences biased toward soluble expression. |

## General Research

These skills are not tied to one discipline and can support machine learning or
other scientific projects.

| Skill | Label | Purpose |
| --- | --- | --- |
| [figure-composer](skills/figure-composer/SKILL.md) | `[GENERAL-RESEARCH]` | Design, compose, and review publication multi-panel figures. |
| [figure-style](skills/figure-style/SKILL.md) | `[GENERAL-RESEARCH]` | Check scientific figures for data fidelity, legibility, and output quality. |
| [learn](skills/learn/SKILL.md) | `[GENERAL-RESEARCH]` | Explain concepts, design learning paths, and reinforce understanding. |
| [literature-review](skills/literature-review/SKILL.md) | `[GENERAL-RESEARCH]` | Find, verify, and synthesize scientific literature. |
| [paper-narrative](skills/paper-narrative/SKILL.md) | `[GENERAL-RESEARCH]` | Review and reshape the argumentative story told by a paper's figures. |
| [pdf-explore](skills/pdf-explore/SKILL.md) | `[GENERAL-RESEARCH]` | Read long PDFs across sections and extract figures, tables, and structured information. |

## Domain-Specialized Non-ML

| Skill | Label | Purpose |
| --- | --- | --- |
| [indication-dossier](skills/indication-dossier/SKILL.md) | `[DOMAIN-SPECIALIZED]` | Summarize patient populations, epidemiology, standards of care, regulatory precedent, and clinical trials. |

## Support and Product Workflows

These skills remain in the collection, but code, agents, or Claude product
integration alone does not make them machine learning research skills.

| Skill | Label | Purpose |
| --- | --- | --- |
| [algorithmic-art](skills/algorithmic-art/SKILL.md) | `[SUPPORT]` | Create generative art and interactive parameter explorations with p5.js. |
| [customize](skills/customize/SKILL.md) | `[SUPPORT]` | Create agent profiles and skills inside the Claude Science runtime. |
| [product-self-knowledge](skills/product-self-knowledge/SKILL.md) | `[SUPPORT]` | Retrieve and verify Anthropic product information. |
| [self-awareness](skills/self-awareness/SKILL.md) | `[SUPPORT]` | Query Claude Science session data, costs, logs, and artifact metadata. |
| [skill-creator](skills/skill-creator/SKILL.md) | `[SUPPORT]` | Create, evaluate, and iteratively improve skills. |
| [web-artifacts-builder](skills/web-artifacts-builder/SKILL.md) | `[SUPPORT]` | Build complex web artifacts with React, Tailwind, and shadcn/ui. |

## Agent Profiles

No current agent profile is dedicated only to machine learning. These profiles
primarily support general scientific computing, review, navigation, and
onboarding.

| Agent | Label | Purpose | Machine learning relevance |
| --- | --- | --- | --- |
| [OPERON](agents/operon/metadata.yaml) | `[GENERAL-RESEARCH]` | General scientific computing agent that discovers and loads relevant skills at runtime. | Can execute machine learning work but is not machine learning specific. |
| [REVIEWER](agents/reviewer/metadata.yaml) | `[GENERAL-RESEARCH]` | Reviews transcripts for fabrication, contradictions, and plan deviation. | Useful for machine learning experiment review and other research. |
| [BOOKMARKER](agents/bookmarker/metadata.yaml) | `[SUPPORT]` | Selects transcript excerpts worth preserving as navigation breadcrumbs. | No direct machine learning role. |
| [ONBOARDING](agents/onboarding/metadata.yaml) | `[DOMAIN-SPECIALIZED]` | Conducts first-run research interviews for Claude Science users. | Its current prompt is biology-oriented, not machine learning specific. |

## Other Assets

- [SYSTEM_PROMPT.md](SYSTEM_PROMPT.md): Base Claude Science system prompt.
- `mcp-servers/bio-tools/`: Biology and biomedical data infrastructure.
- `mcp-servers/ketcher-chemistry/`: Chemical structure editing and chemistry
  workflow infrastructure.

## Portability Note

This collection is a complete Claude Science runtime asset tree. Some
apparently general skills still depend on `host.*`, `repl`, `save_artifacts`,
compute providers, or the Claude Science artifact lifecycle. Adapt those
runtime interfaces before using the skills in ordinary Codex, Claude Code, or
another agent environment; do not assume that copying them unchanged will make
them runnable.
