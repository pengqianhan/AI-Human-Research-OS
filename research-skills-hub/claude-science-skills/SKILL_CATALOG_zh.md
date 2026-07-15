# Claude Science Skills Catalog

[English](SKILL_CATALOG.md) | 中文

本文件整理 `claude-science-skills` 中保留的全部 skills 和 agent profiles，
并标注它们与广义 machine learning 研究的关系。它是导航文件，不改变上游
skill、agent 或 MCP server 的内容。

## 标签

- `[ML-CORE]`：面向广义 machine learning 的计算、部署或推理基础设施。
- `[ML-DOMAIN]`：明确使用 machine learning，但限定于生物、基因组、蛋白质、
  药物设计或单细胞等领域。
- `[GENERAL-RESEARCH]`：跨学科通用的文献、论文、图表、PDF 或学习工作流。
- `[DOMAIN-SPECIALIZED]`：领域专用，但主要任务不是 machine learning。
- `[SUPPORT]`：产品运行时、agent 定制、网页或其他辅助能力。

需要筛选所有 machine learning 相关 skills 时，查找 `[ML-CORE]` 和
`[ML-DOMAIN]`。需要跨领域 ML 能力时，优先使用 `[ML-CORE]`，再搭配
`[GENERAL-RESEARCH]`。

## Machine Learning Core

这些 skills 可跨 ML 子领域复用，不绑定生物任务。

| Skill | 标签 | 用途 |
| --- | --- | --- |
| [compute-env-setup](skills/compute-env-setup/SKILL.md) | `[ML-CORE]` | 配置 SSH、Slurm、容器、GPU 软件栈和模型权重缓存。 |
| [managed-model-endpoints](skills/managed-model-endpoints/SKILL.md) | `[ML-CORE]` | 注册并管理本地或远程模型推理服务。 |
| [remote-compute-modal](skills/remote-compute-modal/SKILL.md) | `[ML-CORE]` | 在用户的 Modal 账户上运行 GPU 或 CPU 作业。 |
| [remote-compute-ssh](skills/remote-compute-ssh/SKILL.md) | `[ML-CORE]` | 向 SSH 或 Slurm 主机提交、监控并收取远程计算任务。 |
| [using-model-endpoint](skills/using-model-endpoint/SKILL.md) | `[ML-CORE]` | 通过原生 HTTP API 调用已注册的模型端点。 |

## Domain Machine Learning

这些 skills 使用 ML、foundation models 或深度生成模型，但工作流限定在
biology、biomedicine 或 drug discovery。

| Skill | 标签 | 领域与用途 |
| --- | --- | --- |
| [alphafold2](skills/alphafold2/SKILL.md) | `[ML-DOMAIN]` | 蛋白质单体和复合物结构预测。 |
| [boltz](skills/boltz/SKILL.md) | `[ML-DOMAIN]` | 蛋白质、核酸和小分子复合物结构及亲和力预测。 |
| [borzoi](skills/borzoi/SKILL.md) | `[ML-DOMAIN]` | 从 DNA 序列预测功能基因组轨迹。 |
| [chai1](skills/chai1/SKILL.md) | `[ML-DOMAIN]` | 使用 Chai-1 预测生物分子复合物结构。 |
| [diffdock](skills/diffdock/SKILL.md) | `[ML-DOMAIN]` | 使用扩散模型预测小分子与蛋白质的结合姿态。 |
| [esmfold2](skills/esmfold2/SKILL.md) | `[ML-DOMAIN]` | 生物分子共折叠、蛋白质语言模型表示和突变评分。 |
| [evo2](skills/evo2/SKILL.md) | `[ML-DOMAIN]` | 使用长上下文基因组 foundation model 评分、表示和生成 DNA。 |
| [fair-esm2](skills/fair-esm2/SKILL.md) | `[ML-DOMAIN]` | 生成蛋白质表示、突变分数和接触预测。 |
| [ligandmpnn](skills/ligandmpnn/SKILL.md) | `[ML-DOMAIN]` | 在配体、核酸或金属环境下进行蛋白质序列设计。 |
| [openfold3](skills/openfold3/SKILL.md) | `[ML-DOMAIN]` | 使用 OpenFold3 预测蛋白质、核酸和配体复合物结构。 |
| [proteinmpnn](skills/proteinmpnn/SKILL.md) | `[ML-DOMAIN]` | 从蛋白质骨架反向设计氨基酸序列。 |
| [scgpt](skills/scgpt/SKILL.md) | `[ML-DOMAIN]` | 单细胞表达数据表示、聚类和细胞类型注释。 |
| [scvi-tools](skills/scvi-tools/SKILL.md) | `[ML-DOMAIN]` | 单细胞数据的概率生成建模、批次校正和差异表达分析。 |
| [solublempnn](skills/solublempnn/SKILL.md) | `[ML-DOMAIN]` | 面向可溶性表达的蛋白质序列设计。 |

## General Research

这些 skills 不限定研究领域，可与 ML 研究或其他科学项目共同使用。

| Skill | 标签 | 用途 |
| --- | --- | --- |
| [figure-composer](skills/figure-composer/SKILL.md) | `[GENERAL-RESEARCH]` | 设计、组合并审查论文多面板图。 |
| [figure-style](skills/figure-style/SKILL.md) | `[GENERAL-RESEARCH]` | 检查科研图表的数据忠实性、可读性和输出质量。 |
| [learn](skills/learn/SKILL.md) | `[GENERAL-RESEARCH]` | 解释概念、设计学习路径并辅助知识巩固。 |
| [literature-review](skills/literature-review/SKILL.md) | `[GENERAL-RESEARCH]` | 检索、核验和综合科学文献。 |
| [paper-narrative](skills/paper-narrative/SKILL.md) | `[GENERAL-RESEARCH]` | 审查和重构论文图表的论证故事线。 |
| [pdf-explore](skills/pdf-explore/SKILL.md) | `[GENERAL-RESEARCH]` | 跨章节阅读长 PDF，并抽取表格、图表和结构化信息。 |

## Domain-Specialized Non-ML

| Skill | 标签 | 用途 |
| --- | --- | --- |
| [indication-dossier](skills/indication-dossier/SKILL.md) | `[DOMAIN-SPECIALIZED]` | 汇总疾病人群、流行病学、治疗标准、监管先例和临床试验。 |

## Support and Product Workflows

这些 skills 保留在集合中，但不应仅因它们涉及代码、agent 或 Claude 产品就
归类为 ML research skills。

| Skill | 标签 | 用途 |
| --- | --- | --- |
| [algorithmic-art](skills/algorithmic-art/SKILL.md) | `[SUPPORT]` | 使用 p5.js 创建生成艺术和交互式参数探索。 |
| [customize](skills/customize/SKILL.md) | `[SUPPORT]` | 在 Claude Science 运行时中创建 agent profiles 和 skills。 |
| [product-self-knowledge](skills/product-self-knowledge/SKILL.md) | `[SUPPORT]` | 查询和核验 Anthropic 产品信息。 |
| [self-awareness](skills/self-awareness/SKILL.md) | `[SUPPORT]` | 查询 Claude Science 会话数据库、成本、日志和 artifact 元数据。 |
| [skill-creator](skills/skill-creator/SKILL.md) | `[SUPPORT]` | 创建、评估和迭代改进 skills。 |
| [web-artifacts-builder](skills/web-artifacts-builder/SKILL.md) | `[SUPPORT]` | 构建基于 React、Tailwind 和 shadcn/ui 的复杂网页 artifacts。 |

## Agent Profiles

当前没有只面向 machine learning 的 agent profile；这些 profiles 主要负责
通用科学计算、审查、导航和 onboarding。

| Agent | 标签 | 用途 | ML 使用判断 |
| --- | --- | --- | --- |
| [OPERON](agents/operon/metadata.yaml) | `[GENERAL-RESEARCH]` | 通用科学计算 agent，通过运行时发现并加载相关 skills。 | 可执行 ML 任务，但并非 ML 专用。 |
| [REVIEWER](agents/reviewer/metadata.yaml) | `[GENERAL-RESEARCH]` | 审查 transcript 中的捏造、矛盾和计划偏离。 | 适合 ML 实验审查，也适用于其他研究。 |
| [BOOKMARKER](agents/bookmarker/metadata.yaml) | `[SUPPORT]` | 从 transcript 中选择值得保存的原文片段。 | 与 ML 无直接关系。 |
| [ONBOARDING](agents/onboarding/metadata.yaml) | `[DOMAIN-SPECIALIZED]` | 面向 Claude Science 新用户的首次科研访谈。 | 当前提示偏向 biology，不是 ML 专用。 |

## Other Assets

- [SYSTEM_PROMPT.md](SYSTEM_PROMPT.md)：Claude Science 基础系统提示。
- `mcp-servers/bio-tools/`：生物和生物医学数据工具，属于领域专用基础设施。
- `mcp-servers/ketcher-chemistry/`：化学结构编辑与化学工作流基础设施。

## Portability Note

本集合是完整 Claude Science runtime asset tree。部分看似通用的 skills 仍依赖
`host.*`、`repl`、`save_artifacts`、计算 provider 或 Claude Science 特有的
artifact 生命周期。将它们用于普通 Codex、Claude Code 或其他 agent 时，应先
适配运行时接口，而不是假定可以原样复制后直接运行。
