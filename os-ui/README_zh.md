# os-ui — Research OS 应用界面

AI-Human Research OS 的应用界面:呈现仓库的真实状态,并承载与 agent 的对话。它以
[桌面客户端](client/README.md)(macOS、Windows、Linux)发布,开发时也在浏览器里运行。
除 [DESIGN.md](DESIGN.md) 列出的几项窄写入外,它不执行动作、不写源文件——文件系统
仍是唯一事实源;删掉整个 `os-ui/` 目录,OS 本体毫无感知。

## 界面是什么样子

2026-11-22 起,界面采用人类所有者于 2026-11-21 选定的布局稿 C"文档优先"
([mockups/step1/c-document.html](mockups/step1/c-document.html);决定见 HANDOFF.md Decisions 的 "Layout" 行,
细节见 [DESIGN.md](DESIGN.md) §4、§7)。此前的"桌面操作系统"外壳(可拖动的浮动窗口 +
底部 Dock)已被取代,代码暂留在 `frontend/src/desktop/` 但不再显示,之后的改动会删除它。

- **左侧导航**:**Home**、**Projects**、**Paper wiki**、**Skills**、**Plugins**,
  **Quick access**(每个已登记项目一项),底部是快照状态、**Settings** 和
  **Collapse**(折叠成只剩图标)。快照状态显示数据生成时间(超过 10 分钟变琥珀色并标
  "stale";悬停可见完整时间、schema 版本、仓库 HEAD)、当前是哪种构建,以及刷新控件:
  桌面客户端里是 **Regenerate** 按钮,浏览器里是"复制刷新命令"按钮,公开的只读构建里没有。
- **Home**:根 agent 的输入条,点开后原地展开成完整对话(含会话列表);下面是每个项目
  一张卡片(阶段、优先级、当前问题、状态、下一步、评估器、负责人、证据来源);再下面是默认
  收起的 **Workspace status**:进行中的工作、最近活动、治理记录、研究策略徽章。
- **项目工作区**(点 Home 卡片或 Projects 列表的一行打开):左边是该项目的对话,可收成
  一条细竖条;右边是视图标签页:**Overview**(默认,即原来的项目总览:阶段条、四个计数、
  Snapshot 字段、回合分数轨道、评审报告、OS Feedback、私有技能);**Code**(仅桌面应用)
  显示项目 `Code/` 下的文件与 Git 变更;**Paper**(仅桌面应用)只读显示项目的
  `paper/main.pdf`,可翻页、缩放,打不开时说明原因(尚未编译、没有 `paper/` 文件夹、
  不是 PDF、有密码、文件过大);**Skeleton**(仅桌面应用)只读显示项目的 `paper_skeleton.md`:
  Snapshot、每条论断及其证据,其余内容按小节折叠;**Assets**(仅桌面应用)只读列出项目的图
  (`Figs/`)、参照运行(`Baselines/`)、结果(`Code/results/`)以及 `Code/README.md` 列出的
  数据集,并预览所选的一项、说明它在哪里被引用;**Idea**(仅桌面应用)只读绘制项目的
  `idea_graph.md`:问题、假设、实验、结果与论断按类分列成方框,以彩色连线相连,所选节点的
  全文、连线与指向显示在图上方(没有 `idea_graph.md` 时,说明该文件是什么以及如何开始)。
  五者中"Ask the agent about this"都把所选内容(一行、一次提交、论文中的一段文字、一条
  论断、一个文件、一个节点)作为引用放进对话输入框。
- **Paper wiki**:嵌入 `paper-wiki/viz.html` 图谱与时间线查看器;笔记的 Status 按钮
  会把 unread / skimmed / read 写回笔记文件。
- **Skills**:技能商店,与之前相同。**Plugins**:哪些已内置、哪些即将到来(暂为写死的
  清单)。**Settings**:桌面客户端里显示工作区文件夹、快照、依赖与登录状态。

界面会记住打开的页面和项目,以及侧栏、对话栏是否收起。

所有数据都来自一个文件:`frontend/public/state.json`(gitignored 的缓存),
由生成器扫描仓库的 Markdown 文档产出;前端每 5 秒重新读取一次。数据缺失时
一律渲染诚实空态("暂无回合数据"),生成器与前端都不编造。

## 怎么启动

### 最快方式:一条命令

```bash
./os-ui/start.sh            # 生成快照 → 首次自动装依赖 → 启动前端
./os-ui/start.sh --watch    # 同上,并让快照持续跟踪仓库变化(推荐开发时用)
```

脚本会先检查 uv 和 Node 是否已安装(缺了会给出安装链接),前台运行,
Ctrl-C 一次性停掉所有进程。下面是它背后的两步,想手动控制时用:

### 手动方式(两步)

**第 1 步 — 生成数据快照**(需要 [uv](https://docs.astral.sh/uv/);首次运行
或想刷新数据时执行):

```bash
cd os-ui/generator
uv run python generate.py            # 一次性生成 + 自检
# 或者,开发时让它持续跟踪仓库变化(前台运行,Ctrl-C 停止):
uv run python generate.py --watch
```

**第 2 步 — 启动前端**(需要 Node.js 18+,推荐 22):

```bash
cd os-ui/frontend
npm install     # 只有第一次、或 package.json 变化后需要
npm run dev
```

终端会打印网址(通常 `http://localhost:5173/`),浏览器打开即见 Home 页。改了
代码热更新,重跑生成器后页面 5 秒内自动吸收新数据,都不用手动刷新。

要打包成静态站点:`npm run build`,产物在 `frontend/dist/`(gitignored),
可用任意静态服务器托管。更多新手向说明(每个文件是干什么的、想改颜色/文案
去哪里)见 [frontend/README.md](frontend/README.md);生成器细节见
[generator/README.md](generator/README.md);完整施工图见 [DESIGN.md](DESIGN.md)。

## 理念与灵感来源

**理念**(详见 [DESIGN.md](DESIGN.md),2026-07-04 grilling 会话定稿):

1. **只读仪表盘,不是控制台**——前端渲染仓库状态,所有"操作"以"复制这条
   命令去终端跑"的形式呈现;执行面(真按钮)属 [GOAL.md](../os-build/GOAL.md) M4
   闸门,需逐项证据 + 人类确认。
2. **`state.json` 是前后端唯一接触面**——生成器不懂 React,前端不懂
   Markdown;两侧可独立迭代、独立删除。
3. **诚实的状态语义**——每个状态带证据来源和时间戳;不显示"运行中",
   显示"最后活动 3 小时前(来源:progress log)";数据缺失走空态。
4. **气质:空管飞行进度条 × 工程方格纸**——人类是调度员,项目是进度条。
   (2026-11-22 起改为布局稿 C 的"文档"气质:暖色纸面、衬线标题与正文、柔和阴影、
   青绿强调色,只用系统自带字体;原方格纸色板与 IBM Plex 字体已被取代,见 DESIGN.md §7。)

**灵感来源**:2026-07-05 至 2026-11-21 使用的桌面外壳参考了
[wanman.ai](https://wanman.ai/)(开源项目 [chekusu/wanman](https://github.com/chekusu/wanman)
的前端)的桌面 OS 隐喻;它已被布局稿 C 取代。

## 后续迭代 TODO

按"需求驱动、每步小而可逆"的原则排队;带 ⛔ 的项受
[GOAL.md](../os-build/GOAL.md) M4 闸门约束(常驻服务/执行面需逐项证据 + 人类确认):

- [ ] **删除旧桌面外壳**——新布局验收后,删除 `frontend/src/desktop/` 及只被它使用的页面。
- [ ] **回合分数轨道吃到真实数据**——等某个项目落盘
      `Code/runs/<round-id>/result.json`;前端已实现空态与非空分支
      (fixture 验证过),数据一到即点亮。
- [ ] ⛔ **实时推送**——文件监听小服务 + SSE 替代 5 秒轮询(属常驻服务,
      M4 闸门;DESIGN.md §2 已预留升级路径,前端组件层零改动)。
- [ ] ⛔ **执行面**——同一 schema 增加 actions 端点,"复制命令"升级为
      真按钮(M4 之后,逐项证据 + 人类确认)。
- [ ] ⛔ **agent_activity 心跳**——若 OS Feedback 出现"看不到 agent 在干嘛"
      的真实证据,再启用带租约语义(`expires_at` 过期自动降级 stale)的
      心跳槽位,杜绝永远绿灯(DESIGN.md §4)。

## 目录结构

```
os-ui/
  README.md          # 本文件:界面介绍、启动流程、理念与 TODO
  start.sh           # 一键启动脚本(可选 --watch)
  DESIGN.md          # 施工图:架构、schema、状态语义、布局与视觉规格
  mockup.html        # 2026-07-04 视觉稿(面板内容的规格;色板与外壳已被取代)
  generator/         # Python + uv 只读扫描器 → state.json(gitignored)
  frontend/          # Vite + React + TS + Tailwind 前端;含新手 README
```
