# Recursive Language Models（RLM）论文笔记

> 论文：**Recursive Language Models**  
> arXiv：https://arxiv.org/abs/2512.24601  
> 作者：Alex L. Zhang、Tim Kraska、Omar Khattab  
> 主题：超长上下文、递归语言模型、外部工作空间、程序化上下文管理、Inference-time Scaling、Agent Harness

---

## 1. 一句话总结

RLM 的核心思想是：

> **不要把全部长文本一次性塞进 Transformer 的上下文窗口，而是把长文本保存在外部环境中，让一个根语言模型通过代码主动检索、切分、处理，并递归调用其他语言模型完成局部语义任务。**

普通长上下文模型：

```text
Long Prompt
    ↓
全部进入 Transformer context
    ↓
模型直接生成答案
```

RLM：

```text
Long Prompt
    ↓
保存为外部环境中的变量
    ↓
Root LM 编写代码检查、检索和切分
    ↓
对局部内容调用 Sub-LM
    ↓
用程序聚合中间结果
    ↓
返回最终答案
```

其本质可以写成：

\[
\text{RLM}
=
\text{外部化上下文}
+
\text{程序化访问}
+
\text{局部语言模型调用}
+
\text{精确聚合}
\]

---

## 2. 论文试图解决的问题

现代语言模型的上下文窗口越来越长，但仍存在几个根本限制：

1. **物理上下文窗口有限**  
   几百万乃至几千万 token 的输入无法直接放入模型。

2. **Context rot**  
   即使输入在物理上能够放入上下文，模型对远距离、分散信息的可靠使用能力也会下降。

3. **计算成本高**  
   将全部 token 放入模型意味着需要对大量无关内容执行 attention 和推理。

4. **全局聚合困难**  
   某些任务要求逐条处理所有记录、保存中间结果、精确计数或生成组合。语言模型仅依赖自然语言记忆容易遗漏或重复。

5. **长输出限制**  
   某些任务不仅输入长，输出也可能非常长，单次生成容易被截断。

论文提出：长 prompt 不一定必须始终等于“送入 Transformer 的 token 序列”。它可以成为一个由模型操作的外部数据对象。

---

## 3. 核心范式：Prompt Virtualization

传统语言模型中，prompt 是模型的输入：

\[
y = LM(x)
\]

其中全部 \(x\) 都必须位于模型上下文窗口中。

RLM 中，长输入 \(x\) 被放入外部环境：

```python
context = very_long_prompt
```

Root LM 只接收：

- 用户任务；
- 外部变量的说明；
- Python REPL 或类似执行环境；
- 调用子语言模型的接口；
- 最终答案返回协议。

Root LM 可以执行：

```python
print(len(context))
print(context[:1000])
matches = [line for line in context.splitlines() if "Lyapunov" in line]
```

它也可以调用子语言模型：

```python
result = llm_query(local_chunk)
```

因此长输入的“可访问长度”不再等于模型的物理 context window。

可以区分三种长度：

### 3.1 Physical context length

模型单次 forward pass 最多能够接收多少 token。

### 3.2 Effective context length

模型在某个具体任务上能够可靠使用多少 token。

### 3.3 Environment-accessible context

模型通过外部文件、变量、数据库或代码能够操作多少信息。

RLM 试图实现：

\[
L_{\text{environment}}
\gg
L_{\text{physical}}
\]

---

## 4. 为什么叫 Recursive Language Model？

RLM 中的 Root LM 可以将原任务的局部内容重新包装成一个新的语言模型任务：

```python
local_result = llm_query(local_prompt)
```

这种调用形式可以表示为：

\[
LM_{\text{root}}
\rightarrow LM_{\text{sub}}
\]

更深层的理论结构可以是：

\[
RLM_0
\rightarrow
RLM_1
\rightarrow
RLM_2
\rightarrow \cdots
\]

但论文主实验中的递归通常比较浅，主要是 Root LM 直接调用 Sub-LM，最大递归深度大多为 1。

因此，“recursive”主要指：

> 一个语言模型可以把原问题的一部分再次构造成语言模型问题，并调用另一个语言模型处理。

它不是：

- RNN 意义上的递归；
- Transformer 层内部的递归；
- 数学递归函数本身。

它属于**推理系统和 harness 层面的递归调用**。

---

## 5. RLM 的系统组成

RLM 可以拆分成三个核心组件。

### 5.1 Root LM：控制器

Root LM 负责：

- 理解用户任务；
- 检查外部输入结构；
- 决定是否搜索、切分或建立索引；
- 决定哪些步骤交给代码；
- 决定哪些步骤需要语言模型语义判断；
- 构造 Sub-LM 的 prompt；
- 保存和组合局部结果；
- 验证结果；
- 决定何时停止；
- 选择最终返回的变量或答案。

Root LM 的角色更接近：

\[
\text{Planner}
+
\text{Programmer}
+
\text{Data Analyst}
+
\text{LLM Orchestrator}
\]

### 5.2 REPL：外部持久化工作空间

REPL 提供：

- 完整长输入；
- Python 状态；
- 字符串搜索；
- 正则表达式；
- 排序、集合运算和计数；
- 中间变量；
- 结构化数据；
- Sub-LM 的输出缓存；
- 最终答案对象。

例如：

```python
records = parse(context)
classified = []
user_labels = {}
target_users = []
pairs = []
```

这意味着模型不必在自然语言上下文中“记住”全部中间状态，而是可以把状态存入程序变量。

### 5.3 Sub-LM：局部语义计算器

代码擅长：

- 精确搜索；
- 过滤；
- 去重；
- 计数；
- 排序；
- 组合；
- 结构化解析；
- 一致性检查。

但代码不擅长直接判断：

- 一个问题是在询问人物、地点还是抽象概念；
- 一段话是否真正支持某个论点；
- 两段文字是否具有相同语义；
- 某个代码模块的功能意图；
- 某段证据是否回答了问题。

这些任务交给 Sub-LM：

```python
label = llm_query(
    "Classify this question as person, location, number, "
    "abbreviation, entity, or abstract concept:\n"
    + question
)
```

因此 Sub-LM 更像程序中的语义函数：

\[
f_{\text{semantic}}:
\text{local text}
\rightarrow
\text{structured semantic result}
\]

---

## 6. RLM 的基本计算模式

一个典型 RLM trajectory 可以概括为：

```text
1. 检查输入格式
2. 解析或切分数据
3. 通过代码缩小候选范围
4. 对局部片段调用 Sub-LM
5. 将结果写入持久化变量
6. 用代码进行全局聚合
7. 检查完整性和一致性
8. 直接返回最终变量
```

更形式化地说：

\[
S_{t+1}=F(S_t,a_t,o_t)
\]

其中：

- \(S_t\)：REPL 当前状态；
- \(a_t\)：Root LM 选择的操作；
- \(o_t\)：代码执行或 Sub-LM 返回的结果；
- \(F\)：状态更新过程。

Root LM 学习或推理一个策略：

\[
\pi(a_t\mid S_t,q)
\]

其中 \(q\) 是用户问题。

---

# 7. Benchmark 概览

论文使用的 benchmark 包括：

- CodeQA
- BrowseComp-Plus
- OOLONG
- OOLONG-Pairs

它们测试不同类型的长上下文推理。

## 7.1 CodeQA

输入是大型代码仓库，长度约：

\[
23K \sim 4.2M \text{ tokens}
\]

任务要求理解跨文件代码结构并回答问题。

RLM 可以：

- 查看仓库目录；
- 搜索符号；
- 读取局部文件；
- 调用 Sub-LM 分析某些代码片段；
- 用程序保存依赖关系和证据。

## 7.2 BrowseComp-Plus

输入由大量文档组成，总长度约：

\[
6M \sim 11M \text{ tokens}
\]

任务需要多跳检索和推理。

RLM 不需要把所有文档送入模型，而可以：

- 先通过关键词或正则过滤；
- 根据中间发现生成新的查询；
- 对候选文档调用 Sub-LM；
- 综合多跳证据。

## 7.3 OOLONG

OOLONG 主要测试：

> 对大量记录逐条做语义转换，然后对全部结果进行聚合。

它不同于 Needle-in-a-Haystack。

Needle-in-a-Haystack 的信息复杂度近似：

\[
C(n)=O(1)
\]

即使输入增长，最终只需找到一条信息。

OOLONG 中，几乎每条输入都可能影响结果：

\[
C(n)=O(n)
\]

## 7.4 OOLONG-Pairs

OOLONG-Pairs 在逐条分类和聚合之后，还要求枚举满足条件的所有对象对。

其潜在输出规模为：

\[
O(n^2)
\]

例如，有 \(m\) 个符合条件的用户，需要生成：

\[
\binom{m}{2}
=
\frac{m(m-1)}{2}
\]

个不同 pair。

这类任务特别适合展示 RLM：

- LLM 负责局部语义分类；
- Python 负责用户聚合；
- Python 负责组合枚举；
- 外部变量负责保存完整结果。

---

# 8. OOLONG-Pairs 数据集和任务详解

## 8.1 数据是什么？

数据可以理解成很多用户提出的常识问题。

每条记录包含：

- User ID；
- Question。

示例：

```text
User 101: What does CPU stand for?
User 101: Who wrote Hamlet?

User 205: What is photosynthesis?
User 205: What is the capital of Japan?

User 307: How many planets are in the Solar System?
User 307: What does NATO stand for?
```

一个用户可以对应多个问题。

## 8.2 模型不是回答问题，而是判断答案类型

模型需要推断每个问题的答案属于哪一类，例如：

- description and abstract concept
- entity
- human being
- numeric value
- location
- abbreviation

示例：

| 问题 | 可能答案 | 答案类型 |
|---|---|---|
| What does CPU stand for? | Central Processing Unit | abbreviation |
| Who wrote Hamlet? | William Shakespeare | human being |
| What is photosynthesis? | 光合作用的定义 | description and abstract concept |
| What is the capital of Japan? | Tokyo | location |
| How many planets are in the Solar System? | 8 | numeric value |

任务通常不给出标签，模型必须根据问题语义进行分类。

## 8.3 一个完整的缩小示例

输入：

```text
User 101:
1. What does CPU stand for?
2. Who wrote Hamlet?

User 205:
1. What is photosynthesis?
2. What is the capital of Japan?

User 307:
1. How many planets are in the Solar System?
2. What does NATO stand for?

User 412:
1. Who is Albert Einstein?
2. Where is Auckland located?

User 518:
1. Explain reinforcement learning.
```

目标条件：

> 找出所有至少有一条问题属于“description and abstract concept”或“abbreviation”的用户，然后生成这些用户之间的所有无重复 pair。

## 8.4 第一步：逐条分类

### User 101

```text
What does CPU stand for?
→ abbreviation
```

```text
Who wrote Hamlet?
→ human being
```

User 101 满足条件。

### User 205

```text
What is photosynthesis?
→ description and abstract concept
```

```text
What is the capital of Japan?
→ location
```

User 205 满足条件。

### User 307

```text
How many planets are in the Solar System?
→ numeric value
```

```text
What does NATO stand for?
→ abbreviation
```

User 307 满足条件。

### User 412

```text
Who is Albert Einstein?
→ human being
```

```text
Where is Auckland located?
→ location
```

User 412 不满足条件。

### User 518

```text
Explain reinforcement learning.
→ description and abstract concept
```

User 518 满足条件。

## 8.5 第二步：得到符合条件的用户

\[
S=\{101,205,307,518\}
\]

## 8.6 第三步：生成所有用户 pair

\[
P=
\{
(101,205),
(101,307),
(101,518),
(205,307),
(205,518),
(307,518)
\}
\]

不包含：

```text
(205, 101)
```

因为它和 `(101, 205)` 是同一无序 pair。

也不包含：

```text
(101, 101)
```

因为用户不能和自己配对。

## 8.7 这个任务在测试什么？

### 语义分类

模型必须理解问题是在询问：

- 人物；
- 地点；
- 数字；
- 缩写；
- 实体；
- 抽象概念。

### 全覆盖处理

任务要求处理所有记录，而不是只找几个例子。

### 跨记录聚合

模型必须把不同位置属于同一 User ID 的记录合并起来。

### 全局条件判断

任何一条问题都可能使某个用户满足条件。

### 精确组合生成

筛选之后，必须生成全部无重复 pair。

### 错误放大

如果漏掉一个符合条件的用户，并且总共有 \(m\) 个合格用户，那么至少可能漏掉 \(m-1\) 个 pair。

因此，一个局部分类错误会被后续组合步骤放大。

---

# 9. RLM 如何完成 OOLONG-Pairs

## 9.1 Step 1：将完整数据放入外部变量

```python
context = long_dataset_text
```

Root LM 不必直接在上下文中完整阅读所有数据。

## 9.2 Step 2：探测数据格式

```python
print(context[:1000])
print(context.splitlines()[:20])
print(len(context.splitlines()))
```

Root LM 需要理解：

- 记录如何分隔；
- User ID 如何表示；
- 问题文本在哪里；
- 总共有多少条记录。

## 9.3 Step 3：用代码解析记录

```python
records = [
    (101, "What does CPU stand for?"),
    (101, "Who wrote Hamlet?"),
    (205, "What is photosynthesis?"),
]
```

这一步适合代码，不需要语言模型。

## 9.4 Step 4：分批调用 Sub-LM 完成语义分类

```python
batches = [
    records[0:100],
    records[100:200],
    ...
]
```

对每个 batch：

```python
prompt = """
Classify every question into exactly one category:

- description and abstract concept
- entity
- human being
- numeric value
- location
- abbreviation

Return:
user_id<TAB>label
"""
labels = llm_query(prompt + format_batch(batch))
```

Sub-LM 返回：

```python
classified = [
    (101, "abbreviation"),
    (101, "human being"),
    (205, "description and abstract concept"),
]
```

Sub-LM 并不负责整个任务，只负责一个局部、结构明确的语义转换。

## 9.5 Step 5：用代码按用户聚合

```python
from collections import defaultdict

user_labels = defaultdict(set)

for user_id, label in classified:
    user_labels[user_id].add(label)
```

得到：

```python
{
    101: {"abbreviation", "human being"},
    205: {"description and abstract concept", "location"},
    307: {"numeric value", "abbreviation"},
    412: {"human being", "location"},
    518: {"description and abstract concept"},
}
```

## 9.6 Step 6：筛选符合条件的用户

```python
target_labels = {
    "description and abstract concept",
    "abbreviation",
}

target_users = sorted(
    user_id
    for user_id, labels in user_labels.items()
    if labels & target_labels
)
```

结果：

```python
[101, 205, 307, 518]
```

## 9.7 Step 7：程序化生成所有 pair

```python
from itertools import combinations

pairs = list(combinations(target_users, 2))
```

结果：

```python
[
    (101, 205),
    (101, 307),
    (101, 518),
    (205, 307),
    (205, 518),
    (307, 518),
]
```

这一步由 Python 完成，可以保证：

- 不重复；
- 不遗漏；
- 不和自己配对；
- 顺序一致；
- 数量可验证。

## 9.8 Step 8：直接返回变量

理想方式：

```text
FINAL_VAR(pairs)
```

而不是让 Root LM 再次凭自然语言生成 pair 列表。

这是因为重新生成可能再次引入：

- 遗漏；
- 重复；
- 排序错误；
- 格式错误。

---

# 10. 为什么普通长上下文模型容易失败？

普通模型需要在一次推理中完成：

```text
阅读所有记录
→ 给所有记录分类
→ 记住每个用户的分类
→ 筛选所有合格用户
→ 生成全部 pair
→ 检查遗漏和重复
```

问题包括：

1. 一条早期记录可能在后面被遗忘；
2. 同一用户的记录可能分散在很远的位置；
3. 模型难以维持精确的中间状态；
4. pair 数量增长很快；
5. 自然语言生成不擅长保证组合完备性；
6. 输出过长时容易截断；
7. 一条分类错误会影响多个最终 pair。

RLM 将任务转换成：

\[
\text{局部语义分类}
+
\text{持久化结构化状态}
+
\text{确定性程序聚合}
\]

---

# 11. 实验设置与主要结果

论文主要测试：

- GPT-5
- Qwen3-Coder-480B-A35B

GPT-5 RLM 中：

- Root LM：GPT-5
- Sub-LM：GPT-5-mini

主要 baseline：

- Base model
- Summary agent
- CodeAct + BM25
- RLM
- RLM without sub-calls

论文报告的代表性结果如下。

| 方法 | CodeQA | BrowseComp+ | OOLONG | OOLONG-Pairs |
|---|---:|---:|---:|---:|
| GPT-5 Base | 24.00 | 无法容纳 | 44.00 | 0.04 |
| GPT-5 CodeAct | 22.00 | 51.00 | 38.00 | 24.67 |
| GPT-5 Summary Agent | 58.00 | 70.47 | 46.00 | 0.01 |
| **RLM GPT-5** | **62.00** | **91.33** | **56.50** | **58.00** |
| RLM GPT-5，无子调用 | 58.00 | 88.00 | 36.00 | 43.93 |

Qwen3-Coder 的结果：

| 方法 | CodeQA | BrowseComp+ | OOLONG | OOLONG-Pairs |
|---|---:|---:|---:|---:|
| Qwen3-Coder Base | 20.00 | 无法容纳 | 36.00 | 0.06 |
| CodeAct | 24.00 | 12.66 | 38.00 | 0.28 |
| Summary Agent | 50.00 | 38.00 | 44.06 | 0.31 |
| **RLM** | 56.00 | 44.66 | **48.00** | **23.11** |
| RLM，无子调用 | **66.00** | **46.00** | 43.50 | 17.34 |

---

# 12. 对实验结果的理解

## 12.1 外部化 context 本身就很强

RLM without sub-calls 在很多任务上已经优于普通模型。

这意味着 RLM 最基础的贡献不是“多 Agent”，而是：

> 把输入从模型必须持续注意的 token 序列，转换成可以被程序访问的数据对象。

在 CodeQA 中，Qwen3-Coder 无子调用版本甚至超过完整 RLM：

\[
66 > 56
\]

原因是很多代码任务可以主要通过：

- grep；
- 文件结构；
- 符号搜索；
- 静态分析；
- 局部读取；
- 程序化聚合；

解决，额外 Sub-LM 调用可能带来噪声或成本。

## 12.2 信息密集型任务更需要 Sub-LM

在 OOLONG 和 OOLONG-Pairs 中，完整 RLM 明显优于无子调用版本。

GPT-5：

\[
\text{OOLONG}: 56.5 \text{ vs. } 36.0
\]

\[
\text{OOLONG-Pairs}: 58.0 \text{ vs. } 43.93
\]

因为每条输入都需要语义分类，单纯使用关键词或正则无法可靠完成。

合理分工是：

\[
\begin{aligned}
\text{LLM} &: \text{局部语义判断}\\
\text{Code} &: \text{精确全局聚合}
\end{aligned}
\]

## 12.3 Summary Agent 在密集任务上容易失败

Summary 的隐含假设是：

> 某些旧信息可以安全丢弃。

但 OOLONG-Pairs 中，几乎每条记录都可能影响最终答案。

若总结时丢掉一个用户的关键问题，就会错误排除该用户，并漏掉大量 pair。

RLM 不需要丢弃原始输入：

- 原始数据永久保留；
- 局部摘要只是临时视图；
- 可以随时返回源数据；
- 中间结果可保存为结构化变量。

因此 RLM 更像数据库查询和外存计算，而不是对话压缩。

## 12.4 RLM 不一定总比直接调用更好

短输入或简单任务中，RLM 可能：

- 过度分解；
- 进行不必要搜索；
- 重复调用子模型；
- 过度验证；
- 已经得到正确答案却继续推理；
- 因 harness 操作失误丢掉正确结果。

因此需要一个 routing 策略：

\[
\text{什么时候直接调用 LM？}
\]

\[
\text{什么时候启动 RLM？}
\]

---

# 13. 论文观察到的典型 RLM 策略

## 13.1 基于模型先验的过滤

Root LM 根据问题内容生成关键词：

```python
matches = [
    line for line in context.splitlines()
    if "festival" in line.lower()
]
```

这形成：

\[
\text{LM prior}
\rightarrow
\text{symbolic query}
\rightarrow
\text{candidate context}
\]

## 13.2 分块调用 Sub-LM

常见切分方式包括：

- 固定字符数；
- 行；
- 文档；
- Markdown 标题；
- 文件；
- 候选结果分组。

论文中的模型通常使用较简单的均匀 chunking 或关键词过滤，没有普遍涌现出非常复杂的自适应分区算法。

## 13.3 小上下文验证

模型可以把候选答案和局部证据交给 Sub-LM：

```python
verified = llm_query(
    "Does this evidence support the candidate answer?"
)
```

这使搜索、推理和验证被拆成多个小任务，而不是在一个巨大 context 中同时完成。

## 13.4 结果保存在变量中

```python
all_results.extend(batch_results)
```

最终：

```text
FINAL_VAR(all_results)
```

这种方式可以构建非常长的输出，不必依赖单次语言模型生成全部内容。

---

# 14. 一个关键失败案例：已经算对，却没有停止

论文分析了一个 Qwen3-Coder 在 OOLONG-Pairs 上的 trajectory：

1. 正确解析输入；
2. 正确切分数据；
3. 调用 Sub-LM 完成分类；
4. 正确构造符合条件的用户集合；
5. 正确生成 pair 变量；
6. 但模型没有停止；
7. 重复进行分类和验证；
8. 多次执行昂贵 Sub-LM 调用；
9. 最终没有返回正确变量；
10. Root LM 重新生成了错误答案。

这说明 RLM 的瓶颈不仅是语义能力，也包括 harness-use capability：

- 何时调用工具；
- 如何 batch；
- 如何保存结果；
- 如何检查完整性；
- 何时信任中间变量；
- 何时停止；
- 返回哪个变量。

可以将其概括为：

\[
\boxed{
\text{RLM 的关键能力是控制计算过程本身}
}
\]

---

# 15. RLM 与 RAG 的区别

普通 RAG：

\[
q
\rightarrow
Retriever(q)
\rightarrow
Top\text{-}k
\rightarrow
LM
\]

RLM：

\[
q
\rightarrow
检查数据
\rightarrow
生成查询
\rightarrow
查看结果
\rightarrow
修改策略
\rightarrow
局部语义处理
\rightarrow
程序化聚合
\]

RAG 通常：

- retrieval pipeline 相对固定；
- 一次性检索 top-k；
- 最终主要由 LM 综合。

RLM：

- 可以根据中间结果多轮搜索；
- 可以动态改变查询；
- 可以建立中间变量和索引；
- 可以对子问题递归调用 LM；
- 可以用代码精确聚合。

因此 RLM 更接近：

> 对原始 context 执行 agentic query planning。

---

# 16. RLM 与 Summary / Compaction 的区别

Compaction：

\[
C_t
\rightarrow
\operatorname{Summary}(C_t)
\]

旧 context 被一个有损摘要替代。

RLM：

\[
C \text{ 始终保留在外部环境中}
\]

模型创建多个临时视图：

\[
v_i=f_i(C)
\]

这些视图可以是：

- 搜索结果；
- 文件索引；
- 局部摘要；
- 标签表；
- 用户集合；
- 中间统计量。

RLM 更像：

- 虚拟内存；
- 数据库；
- out-of-core algorithm；
- 外部工作空间。

---

# 17. RLM 与普通 Code Agent 的区别

普通代码 Agent 也可以：

- 读取文件；
- 执行代码；
- 搜索代码库；
- 调用子 Agent。

但 RLM 的特殊点是：

> 原始 prompt 本身被明确外部化，成为模型通过程序操作的数据。

普通 Code Agent 通常仍把大量会话和任务信息保存在主 context 中，并通过 compaction 管理长会话。

RLM 则把“如何访问原始长输入”作为系统设计的核心。

---

# 18. RLM 与 Claude Code Subagent 的对比

## 18.1 Claude Code Subagent 是什么？

Claude Code 的 Subagent 是拥有独立 context 的自治 worker。

主 Agent 可以委派：

```text
Subagent A：检查认证模块
Subagent B：检查数据库层
Subagent C：运行测试并定位失败原因
```

每个 Subagent 可以：

- 读取文件；
- 搜索代码；
- 运行 Bash；
- 使用指定工具；
- 独立推理；
- 返回报告；
- 在某些配置下写文件或修改代码。

Claude Code Subagent 的主要目的：

\[
\text{context isolation}
+
\text{task specialization}
+
\text{parallel execution}
\]

## 18.2 同一个 OOLONG-Pairs 任务在 Claude Code 中的做法

假设数据保存在：

```text
data.txt
```

主 Agent 可以委派：

```text
Subagent A：分类第 1–1000 行
Subagent B：分类第 1001–2000 行
Subagent C：分类第 2001–3000 行
```

Subagent 可以返回：

- 自然语言报告；
- JSON；
- 写入结果文件。

然后主 Agent：

- 收集结果；
- 合并分类；
- 筛选用户；
- 运行 Python 生成 pair；
- 返回答案。

## 18.3 核心区别一：设计目标不同

RLM：

> 一种处理任意长 prompt 的推理范式。

Claude Code Subagent：

> 一种通用 coding agent 的任务委派机制。

## 18.4 核心区别二：Sub-LM 更像函数，Subagent 更像自治 worker

RLM Sub-LM：

```python
labels = llm_query(batch)
```

更像：

\[
f_{\text{semantic}}(x)\rightarrow y
\]

通常：

- 输入局部；
- 任务窄；
- 输出结构化；
- 结果由程序继续消费。

Claude Code Subagent：

```text
调查某个模块
运行工具
分析问题
返回完整报告
```

更像一个虚拟同事或独立 Agent。

## 18.5 核心区别三：状态管理不同

RLM 的核心共享状态在 Root REPL 中：

```python
records
classified
user_labels
target_users
pairs
```

Sub-LM 的输出被写回这些变量。

Claude Code 的共享状态主要来自：

- 文件系统；
- Git working tree；
- 主 Agent 的任务描述；
- Subagent 返回的报告；
- Subagent 写出的文件；
- resume 后保留的独立历史。

RLM 更像一个有明确中央程序状态的计算系统。

Claude Code 更像多个隔离 worker 通过文件和消息协作。

## 18.6 核心区别四：聚合方式不同

RLM 强调：

```text
Sub-LM 做局部语义判断
→ 结果写入变量
→ Python 精确聚合
→ 直接返回变量
```

Claude Code 的默认工作流更可能是：

```text
多个 Subagent 返回自然语言报告
→ 主 Agent 阅读报告
→ 主 Agent 生成综合答案
```

若 Subagent 返回大量详细信息，主 Agent context 仍可能被填满。

为了接近 RLM，Claude Code 应让 Subagent：

- 返回结构化 JSON；
- 将结果写入文件；
- 避免返回很长自然语言报告；
- 由脚本完成合并和聚合。

## 18.7 核心区别五：Claude Code 更强调角色、权限与并行

Claude Code Subagent 可以配置：

- system prompt；
- 模型；
- tool list；
- permission；
- Skills；
- MCP；
- persistent memory；
- background execution；
- 并行执行；
- nested subagents。

例如：

```yaml
---
name: security-reviewer
model: opus
tools: Read, Grep, Bash
disallowedTools: Edit, Write
---
Review the code for security vulnerabilities.
```

论文中的 RLM Sub-LM 通常没有如此复杂的角色和权限系统。

## 18.8 对照表

| 维度 | RLM | Claude Code Subagent |
|---|---|---|
| 主要目标 | 超长 prompt 推理 | 通用任务委派 |
| 原始输入 | 外部 REPL 变量 | 文件系统或 delegation prompt |
| 子单元 | Sub-LM call | 自治 Subagent |
| 子任务粒度 | 小、结构化、局部 | 较完整、自包含 |
| 状态中心 | Root 的程序状态 | 主会话、文件和独立 context |
| 返回形式 | 标签、变量、局部结果 | 报告、文件、任务结果 |
| 聚合方式 | 强调程序化聚合 | 默认由主 Agent 综合 |
| 并行 | 论文原型主要串行 | 原生支持并行 |
| 权限控制 | 较简单 | 每个 Agent 可独立配置 |
| 专业化 | 动态 prompt | 持久化角色 |
| 典型隐喻 | 语义函数 | 虚拟同事 |
| 主要优势 | 外部化 context 与精确计算 | 隔离、并行、专业化 |

---

# 19. Claude Code 能否实现 RLM？

可以，但需要专门设计 harness。

推荐结构：

```text
Main Claude
├── parse.py → chunks/*.jsonl
├── Subagent A → labels/part_1.json
├── Subagent B → labels/part_2.json
├── Subagent C → labels/part_3.json
├── aggregate.py → target_users.json
├── pairs.py → answer.txt
└── 返回 answer.txt
```

关键原则：

1. 不让主 Agent 直接读取整个超长文件；
2. 原始数据保存在文件或数据库中；
3. 主 Agent 先使用程序解析和切分；
4. Subagent 只做局部语义判断；
5. Subagent 返回结构化结果；
6. 大结果写入文件，而不是塞回主 context；
7. 使用程序合并和验证；
8. 最终直接读取计算结果；
9. 避免主 Agent 最后凭自然语言重新生成。

这样得到：

\[
\text{Claude Code orchestration}
+
\text{RLM externalized context}
+
\text{structured semantic workers}
+
\text{programmatic aggregation}
\]

---

# 20. RLM 最重要的贡献

## 20.1 Prompt Virtualization

RLM 把 prompt 从：

> 必须全部送入 Transformer 的 token 序列

重新定义为：

> 模型可以通过程序访问的数据对象。

这类似：

- 操作系统不需要把全部磁盘内容同时放入 RAM；
- 数据库不需要一次读取整张表；
- Out-of-core algorithm 不需要一次加载全部数据。

## 20.2 将长上下文推理变成 Inference-time Scaling

传统方向：

- 增大 context window；
- 改进位置编码；
- 优化 attention；
- 训练 long-context model；
- 优化 KV cache。

RLM 提供另一条路径：

\[
\text{Context capability}
\approx
\text{model}
+
\text{environment}
+
\text{adaptive compute}
\]

通过增加推理时计算和外部访问能力，扩展模型能够处理的信息规模。

## 20.3 重新定义“上下文能力”

模型的上下文能力不只由 advertised context length 决定，还取决于：

- 是否能检索；
- 是否会切分；
- 是否会写代码；
- 是否能保存结构化状态；
- 是否会调用 Sub-LM；
- 是否能验证结果；
- 是否知道何时停止。

## 20.4 Minimal Harness

RLM 的 harness 很小，只需提供：

1. 外部 context；
2. 持久化 REPL；
3. Sub-LM 调用接口；
4. final answer 协议。

原语可以写为：

\[
\mathcal{A}
=
\{
\text{inspect},
\text{transform},
\text{store},
\text{subcall},
\text{return}
\}
\]

模型自主决定完整 workflow。

这符合一种重要的 Harness Engineering 原则：

> 不要硬编码复杂、脆弱的工作流；提供强而通用的基本原语，让模型随着能力增强自行发现更优策略。

---

# 21. 局限性

## 21.1 递归深度较浅

论文主实验大多只有：

\[
Root\rightarrow Sub
\]

真正的多层递归尚未得到充分验证。

深层递归可能引发：

- 错误累积；
- 任务漂移；
- 成本爆炸；
- provenance 丢失；
- 终止困难。

## 21.2 调用主要是同步、串行

论文原型的 Sub-LM 调用主要是 blocking/sequential。

可改进为：

```python
await asyncio.gather(
    llm_query(chunk_1),
    llm_query(chunk_2),
    llm_query(chunk_3),
)
```

并行可以降低 wall-clock latency，但会引入：

- 并发控制；
- 结果同步；
- rate limit；
- 成本峰值；
- 失败重试。

## 21.3 成本方差较大

Agentic inference 的平均成本可能合理，但尾部 trajectory 可能非常昂贵。

生产系统需要限制：

- 最大调用次数；
- 最大 token budget；
- 每层递归预算；
- 最大运行时间；
- 重复调用检测；
- early stopping；
- 缓存。

## 21.4 强依赖 coding 和工具使用能力

RLM 性能依赖：

\[
\text{semantic ability}
+
\text{coding ability}
+
\text{planning ability}
+
\text{tool discipline}
\]

较弱模型可能：

- 不会正确解析数据；
- 不会 batch；
- 每条记录调用一次模型；
- 无法管理变量；
- 无法正确返回结果。

## 21.5 Harness 不完全 model-agnostic

同一个 RLM prompt 在不同模型上可能产生完全不同的行为。

例如某些模型会：

- 每行调用一次 Sub-LM；
- 产生数百或数千次调用；
- 反复验证；
- 不愿停止；
- 错误使用 final protocol。

因此最佳 harness 是：

\[
\text{Best Harness}
=
f(\text{model capability and behavior})
\]

## 21.6 停止条件和输出协议脆弱

模型可能：

- 已得到正确答案却不返回；
- 把计划当作答案；
- 忘记使用 FINAL；
- 错误指定变量名；
- 重新生成并破坏正确结果。

这说明：

> 在 Agent 系统中，“何时停止并返回哪个状态”本身是一项核心能力。

## 21.7 可访问不等于可理解

RLM 可以访问近乎任意规模的外部信息，但：

\[
\text{addressable}
\neq
\text{understandable}
\]

如果任务需要对每条输入做语义处理，计算成本仍至少可能是：

\[
\Omega(n)
\]

如果最终必须显式输出所有 pair，输出复杂度可能达到：

\[
\Omega(n^2)
\]

RLM 绕过的是 context-window bottleneck，而不是信息处理的复杂度下界。

---

# 22. v3 中的 Post-training 方向

论文 v3 摘要还报告了一个 RLM-Qwen3-8B：

- 对小模型进行围绕 RLM 行为的 post-training；
- 相对原始 Qwen3-8B 平均提升约 28.3%；
- 在若干长上下文任务上接近直接使用 GPT-5 的质量。

其重要含义是：

\[
\text{RLM trajectory}
\rightarrow
\text{training data}
\rightarrow
\text{learned context-management policy}
\]

未来模型可以直接学会：

- 何时搜索；
- 如何切分；
- 何时调用 Sub-LM；
- 如何 batch；
- 如何保存结果；
- 如何验证；
- 何时停止。

这使 RLM 从 prompt-based harness 进一步走向：

> 经过训练的上下文管理策略。

---

# 23. 我的总体理解

RLM 最重要的不是“让 LLM 调用另一个 LLM”。

多 Agent、Subagent 和递归分解此前已经存在。

它真正关键的变化是：

\[
\boxed{
\text{Prompt 从模型内部 token，变成外部可计算的数据}
}
\]

由此，很多问题的性质发生变化：

| 传统问题 | RLM 中的转化 |
|---|---|
| 超长上下文 | 外部数据访问 |
| Context rot | 局部任务分解 |
| 全局记忆困难 | 持久化变量 |
| 精确聚合困难 | Python / 程序 |
| 长输出限制 | 外部变量逐步构建 |
| 多跳检索 | 动态查询规划 |
| 复杂推理 | 局部语义调用 + 全局程序 |

最准确的概括是：

\[
\boxed{
\text{RLM 是一个由语言模型控制的外存计算系统}
}
\]

或者：

> Root LM 不再被要求在一次 forward pass 中理解和记住全部信息，而是像程序员操作数据库、文件系统和语义服务一样，主动管理信息。

---

# 24. 最终结论

RLM 的完整逻辑是：

\[
\boxed{
\begin{aligned}
&\text{Long prompt as external data}\\
+&\text{LM-generated code for access}\\
+&\text{recursive LM calls for semantics}\\
+&\text{persistent structured state}\\
+&\text{programmatic aggregation}\\
=&\text{effective long-context reasoning}
\end{aligned}
}
\]

对于 OOLONG-Pairs：

```text
长问题日志
→ 解析记录
→ Sub-LM 对问题分类
→ Python 按用户聚合
→ 筛选目标用户
→ Python 生成所有 pair
→ 直接返回结果变量
```

对于 Claude Code：

- Subagent 提供更成熟的隔离、专业化、权限和并行机制；
- RLM 提供更清晰的外部化上下文和程序化聚合范式。

二者结合后的理想系统是：

\[
\boxed{
\text{Claude Code 的多 Agent 调度能力}
+
\text{RLM 的外部上下文与精确计算范式}
}
\]

也就是：

> 让 Agent 负责高语义密度的局部判断，让代码、文件、数据库和结构化变量负责记忆、聚合、验证和最终输出。
