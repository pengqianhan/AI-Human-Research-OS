# os-ui 设计文档 — Research OS 只读仪表盘

> 2026-07-04 grilling 会话定稿,经对抗性核查修订。本文件是 `os-ui/` 实现会话的
> 施工图;视觉规格见同目录 [mockup.html](mockup.html)(带假数据的可点击效果图)。
>
> **授权与边界**:人类已于 2026-07-04 授权**只读 monitor UI**——该授权对"只读
> 监视界面"这一项**豁免了 [GOAL.md](../GOAL.md) M4 的证据前置条件**(supersession
> 记录见 [HANDOFF.md](../HANDOFF.md) Decisions,GOAL.md M4 已同步加注)。
> 执行面(真按钮)、常驻服务、SSE 推送等仍属 M4:逐项证据 + 人类确认。

## 1. 定位(已拍板)

- **只读仪表盘,不是控制台**。前端渲染仓库状态,不执行任何动作;所有"操作"
  以"复制这条命令去终端跑"的形式呈现。文件系统仍是唯一事实源和唯一写入口。
- 删掉整个 `os-ui/` 目录,OS 无任何感知——这是前后端独立迭代的极限形态。
- UI 属 OS 基础设施,不进 projects-folder、不占 portfolio 表。

## 2. 架构与契约(已拍板)

```
仓库 plain files ──> generator(Python, uv)──> state.json ──> frontend(静态站点)
                     后端 v0:一次性脚本                      只认 schema,不知 Markdown
```

- **`state.json` 是前后端唯一接触面**,带 `schema_version`(追加字段不删旧字段),
  文件本身 gitignored(schema 版本化 ≠ git 版本化)。
- 生成器两种跑法:`generate`(一次性)与 `generate --watch`(**人类手动前台运行
  的开发工具**,不作为后台常驻服务);前端每几秒重新拉取 `state.json`。
- 升级路径:实时性 → 文件监听小服务 + SSE(**属常驻服务,受 M4 闸门约束**,
  前端组件层零改动);执行面(M4 后)→ 同一 schema 加 actions 端点。

### schema v0.1 骨架

```jsonc
{
  "meta":      { "schema_version": "0.1", "generated_at": "...", "repo_head": "..." },
  "policy":    { "agent_led_research": "off", "parallelism": "..." },
  "portfolio": [ { "project", "path", "owner", "stage", "priority", "status",
                   "evaluator", "next_action", "evidence": {"source","mtime"} } ],
  "active_work": [ { "title", "items": [{"text","done"}], "source" } ],
  "governance": [ { "date", "decision", "source" } ],
  "projects":  [ { "name",
                   // Snapshot 字段以 INSTRUCTION.md 的口径为准(owner/origin/stage/
                   // priority/evaluator_status/current_question/next_action);
                   // 项目文件缺某字段时输出 null,UI 显示"未填写"
                   "snapshot": { ... },
                   "evaluation": { "target": null, "best_known": null, "source": null },
                   "rounds": [{"id","score","valid","artifacts","tasks"}],
                   "evaluations": [...], "os_feedback": [...],
                   "local_skills": [{"name","promotion_candidate": null}] } ],
  "store":     { "collections": [ { "name", "skills": [{
                   "name","description","license","has_scripts",
                   // 键为安装目录名的开放映射:新增 adapter 零 schema 变更(兼容 GOAL M3)
                   "installed": { ".claude/skills": true, ".agents/skills": true },
                   "sync": "synced | drift | not_installed | installed_no_hub_source" }] } ],
                 "orphans": [ /* 已安装但 hub 无源的技能,同上结构 */ ] },
  "activity":  [ { "when", "what", "source" } ],
  "agent_activity": []   // v1 由推导填充;心跳约定的预留槽位(见 §4)
}
```

### 数据源映射

| UI 元素 | 来源 | 状态 |
|---|---|---|
| Portfolio 表 | `Memory/MEMORY.md` Active Projects 表 | 现成 |
| 研究策略面板 | `Memory/MEMORY.md` Research Policy 表 | 现成 |
| Active Work 进度 | `HANDOFF.md` Active Work 勾选清单 | 现成 |
| 治理记录面板 | `HANDOFF.md` Decisions 表 + `Memory/MEMORY.md` Key Decisions 表 | 现成 |
| 项目 Snapshot | `projects-folder/<P>/PROJECT_MEMORY.md` Snapshot(字段口径见 INSTRUCTION.md;缺失输出 null) | 现成 |
| 项目 Evaluation(目标线/最优线) | `PROJECT_MEMORY.md` 的 `## Evaluation Contract` 区 | **待建(M2,circle_packing 计划)** |
| 回合流水线 | `projects-folder/<P>/Code/runs/<round-id>/`,分数只读 evaluator 落盘的 `result.json` | **待建(M2)** |
| 并行分叉 | `projects-folder/<P>/Tasks/<task-id>/` | **待建(M2)** |
| 评审报告 | `projects-folder/<P>/Evaluations/` | **待建(M2)** |
| OS Feedback | `PROJECT_MEMORY.md` 的 `## OS Feedback` 区 | **待建(M2)** |
| 私有技能 | 枚举项目内 `.claude/skills/` / `.agents/skills/`;`promotion_candidate` 为可选字段,来源约定(PROJECT_MEMORY 一行)待建,缺失时不显示徽章 | 部分待建 |
| 商店卡片 | `Research-skills-hub/*/index.md` + 各 `SKILL.md` frontmatter(name/description) | 现成 |
| license | 降级链:skill 目录内 LICENSE → 集合级 LICENSE / README(collected-skills 为 README 的 Source/Credits 段)→ 输出 `unknown(见上游)` | 现成(带降级) |
| 同步状态 | hub / `.claude/skills/` / `.agents/skills/` 三方哈希对比(D7 规则);**hub 无源的已安装技能输出第四态 `installed_no_hub_source`**(仓库现状真实存在,如 session-handoff / filetree-simple) | 现成 |
| 活动流 | `git log` + 各项目 progress log 最新条目 | 现成 |

> 待建来源在数据出现前一律走**空态渲染**(如"暂无回合数据"),生成器不得编造。

## 3. 三页信息架构(已拍板;2026-07-05 起以"桌面窗口"呈现)

> **2026-07-05 外壳改版(用户指示)**:参考 [wanman.ai](https://wanman.ai/) 的
> 桌面隐喻,外壳从"页头 + 三标签页"改为**桌面 OS**:顶部常驻菜单条(快照牌 +
> 策略徽章)、底部程序坞(Dock)、三页内容各自成为可拖拽/缩放/最小化的
> macOS 风窗口(代码在 `frontend/src/desktop/`)。**信息架构、数据契约、
> 只读语义、空态规则全部不变**;mockup.html 仍是窗口内内容的像素规格,
> 但其"标签页外壳"部分已被本节取代。三"页"以下一律读作三"窗口"。

1. **总览 Dashboard**:portfolio 飞行条板 + Active Work 进度 + 策略面板 +
   最近活动流 + 治理记录折叠面板(不单独设页)。
2. **项目详情 Project**:Snapshot 字段卡(带证据时间戳)→ **回合分数轨道**
   (签名元素:每回合一个节点,向 Evaluation Contract 声明的目标线/已知最优线
   爬升;并行回合显示 Tasks 分叉与合并;无数据时显示空态)。mockup 中的
   2.60 / 2.63598844 为示例值,取自 circle_packing 计划,后者 provenance 尚未
   核实(见 HANDOFF)→ Evaluations / OS Feedback / 私有技能。
3. **技能商店 Store**:货架只摆 hub 三个 collection;卡片含名称、描述、license
   (按降级链)、`scripts/` 提示、同步徽章(四态:`已安装·同步` / `已安装·漂移⚠` /
   `未安装` / `已安装·hub 无源⚠`);"安装" = 复制真实安装命令,**命令一律携带
   `--collection <集合名>`**(安装器任何时候都接受该参数;集合名由 generator 从
   hub 目录结构读取,不得沿用假数据)。scripts 提示的依据:INSTRUCTION.md 对
   **仓库外来源**技能要求装前浏览脚本;本 UI 从严,对所有含 `scripts/` 的技能
   显示提示。项目局部技能不进商店(在项目详情页)。

## 4. 状态语义(已拍板)

- **诚实的陈旧胜过撒谎的实时**:UI 不显示"运行中",显示"`stage: probe`,
  最后活动 3 小时前(来源:progress log)"。每个状态都带证据来源 + 时间戳;
  页头常驻快照牌;数据缺失显示空态,不编造。
- v1 纯推导(observed state),不引入心跳约定。若 circle_packing 的 OS Feedback
  出现"看不到 agent 在干嘛"的真实证据,再启用 `agent_activity` 槽位的心跳约定,
  且必须带租约语义(`expires_at` 过期自动降级 stale),杜绝永远绿灯。

## 5. 技术栈与目录(已拍板)

- 前端:**Vite + React + TypeScript + Tailwind**;TS 类型从 schema 生成,契约
  编译期强制。后端 v0:**Python 生成器,uv 管理**,范围限于 `os-ui/`。
- 用户前端零基础:`frontend/` 自包含,内置写给非前端人的 README(目录结构、
  每个文件干什么、怎么改文案/颜色);实现会话边改边讲解。

```
os-ui/
  DESIGN.md          # 本文件(施工图)
  mockup.html        # 视觉稿(定稿后即像素级规格)
  generator/         # Python + uv;输出 state.json(gitignored)
  frontend/          # Vite 应用;dist/ gitignored;含新手 README
```

## 6. 视觉规格(mockup 已体现)

- **气质**:研究任务台 = 空管飞行进度条 × 工程方格纸。人类是调度员,项目是
  进度条,状态必须可信、可追证据。回避三套模板脸(cream+衬线、黑底荧光绿、
  报纸细线)。
- **色板**:`--paper #F2F4F3`(冷灰绿方格纸,点状网格背景)、`--panel #FFFFFF`、
  `--ink #17262E`(石油墨)、`--ink-soft #52646E`、`--grid #D9E0E2`、
  `--signal #E8590C`(国际橙,仅用于"需要人类"的状态)、`--verify #2F7D6D`
  (青绿,证据/同步/通过)、`--warn #B7791F`(琥珀,漂移/陈旧)。
- **字体**:标题与数据 **IBM Plex Mono**(mono 作标题字 = 终端原生身份,
  这是本设计的一次刻意冒险);正文 IBM Plex Sans;中文回退 PingFang SC /
  Noto Sans SC。
- **签名元素**:① Dashboard 的 portfolio 飞行条(每项目一条,左缘色码 =
  stage);② Project 页的回合分数轨道(含目标虚线与已知最优线)。
- **动效**:克制——卡片 hover 微升、抽屉滑入;尊重 `prefers-reduced-motion`。
- **桌面外壳(2026-07-05 增)**:色板/字体不变(不抄 wanman 的暖奶油色)。
  窗口 = 白面板、12px 圆角、双层柔影、居中 mono 标题;交通灯复用语义色——
  关闭 `--danger #C4564A`(新增令牌)、最小化 `--warn`、缩放 `--verify`;
  双击标题栏 = 缩放。Dock:圆角悬浮条、毛玻璃、图标呼应内容(飞行条/文件夹/
  货架),实心点 = 打开、空心点 = 已最小化;分隔线右侧是 agent 启动命令
  (Claude Code / Codex,暗示驱动方式)与刷新快照命令的复制按钮——
  唯一"动作"类型仍是**复制命令**,不执行。

## 7. 实现里程碑(留给实现会话)

- **U0**:`generator/` 骨架 + schema v0.1 + 对当前仓库跑通(portfolio / store /
  governance 三块先行,含孤儿技能检测);gitignore `state.json`。
- **U1**:Vite 脚手架 + Dashboard 页(读真实 state.json);gitignore `dist/`。
- **U2**:Project 页。**验收含空态**:项目无 `runs/` 数据时轨道显示"暂无回合
  数据"——真实回合数据依赖 circle_packing R1–R2 完成(M2),不阻塞本步交付。
- **U3**:Store 页(三方哈希同步检测 + 四态徽章 + 复制安装命令,集合名读真实
  目录结构)。
- **U4**:打磨 + 新手 README + FILETREE/HANDOFF 收尾。
  每步都小、可逆、可单独验收;每步向用户讲解所改文件。

## 8. 非目标

- 不执行任何写操作/命令;不做常驻服务、SSE、数据库(均属 M4 闸门);
  不做用户系统、多人协作、远程部署;
- 不解析 agent transcript、不依赖任何特定 agent(agnostic 铁律);
- `state.json` 即缓存,git 即历史;数据缺失走空态,生成器不编造。
