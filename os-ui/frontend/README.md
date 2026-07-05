# os-ui/frontend — 新手说明书

这是"只读桌面"的网页部分。界面模仿桌面操作系统:底部有一个"程序坞"(Dock),
点图标会打开一个个可以拖动、缩放、最小化的窗口(总览/项目/技能商店),顶部
有一条常驻的"菜单条"显示快照时间和研究策略。它自己不产生任何数据——所有内容都来自
`public/state.json` 这一个文件,而这个文件是由 `os-ui/generator/` 里的 Python
脚本读取仓库里的 Markdown 文档(`Memory/MEMORY.md`、`HANDOFF.md`、各项目的
`PROJECT_MEMORY.md` 等)生成出来的。网页每隔 5 秒会重新读一次这个文件,所以
你在终端里跑一次生成器,网页几秒内就会自动刷新显示新内容,不用手动刷新浏览器。

如果你完全没碰过前端开发,可以把这个目录想象成一个"预制房子的施工现场":

- 有"设计图纸"(下面会讲的几类文件),
- 有"建筑材料仓库"(`node_modules/`,自动下载,不用管),
- 有"施工完成后的成品房子"(`dist/`,用来正式发布时用)。

你平时只需要关心"图纸",也就是 `src/` 目录下的文件。

## 目录里每样东西是干什么的

用类比来说明,方便完全不懂前端的人也能对上号:

```
os-ui/frontend/
├── README.md              ← 你正在看的这份说明书
├── index.html             ← 网页的"地基":一个几乎空的 HTML 外壳,
│                             真正的内容都是 React 代码往里面塞的
├── package.json            ← "菜单/清单":记录这个项目需要用到哪些
│                             第三方代码包(React、Tailwind 等),
│                             以及"npm run xxx"能跑哪些命令
├── vite.config.ts          ← 开发服务器(Vite)的配置,一般不用改
├── tailwind.config.js       ← Tailwind(一种写样式的工具)的配置,
│                             里面登记了色板和字体的名字
├── postcss.config.js        ← Tailwind 底层要用到的样式处理工具配置
├── tsconfig.json            ← TypeScript(带类型检查的 JavaScript)配置
├── public/
│   └── state.json          ← 真实数据文件!由生成器产出,不要手改
│                             (这个文件本身不会被提交到 git 里)
└── src/                     ← 真正的"图纸"都在这里
    ├── main.tsx             ← 整个网页程序的"总开关",把 App 挂到网页上
    ├── App.tsx              ← 程序入口的三岔路口:加载中 / 找不到数据 / 进入桌面
    ├── index.css            ← 全局样式:色板变量、字体、方格纸背景
    ├── types.ts             ← state.json 数据结构的"说明书"(TypeScript 类型)
    ├── useOsState.ts         ← 负责"每 5 秒去读一次 state.json"的逻辑
    ├── vite-env.d.ts         ← Vite 自带的类型声明,不用改
    ├── lib/
    │   ├── format.ts        ← 小工具函数:把时间变成"3 小时前"、
    │   │                       把带 Markdown 语法的文字变成纯文字
    │   └── skills.ts        ← 把"商店"数据整理成好渲染的形状、拼装安装命令
    ├── dev-fixtures/
    │   └── roundTrack.fixture.ts
    │                        ← 仅供开发调试用的假回合数据,
    │                          用来在真实回合数据出现前预览"回合分数轨道"
    │                          长什么样;不会出现在正式页面或 state.json 里
    ├── desktop/             ← "桌面外壳":窗口、程序坞、菜单条
    │   ├── Desktop.tsx          桌面本体:哪些窗口开着、位置大小、谁在最上层
    │   ├── WindowFrame.tsx      单个窗口的"外壳":标题栏、红/黄/绿按钮、拖拽缩放
    │   ├── Dock.tsx             底部程序坞:应用图标 + 复制命令按钮
    │   │                        (Claude Code / Codex 启动命令、刷新快照命令)
    │   └── apps.tsx             应用注册表:每个应用的名字、图标、默认窗口大小
    ├── components/          ← 一个个可复用的小部件(卡片、徽章、图表……)
    │   ├── SnapshotHeader.tsx    菜单条上那张"快照牌"(生成时间/版本/commit)
    │   ├── StateMissing.tsx      找不到 state.json 时的整页提示
    │   ├── Badge.tsx             四色小徽章(绿/橙/红/灰)
    │   ├── PortfolioStrip.tsx    总览页的项目"飞行进度条"
    │   ├── UnregisteredStrip.tsx 总览页的"未登记项目"琥珀警示条
    │   ├── ActiveWorkPanel.tsx   总览页的"进行中的工作"清单+进度条
    │   ├── ActivityFeed.tsx      总览页的"最近活动"列表
    │   ├── PolicyPanel.tsx       总览页的"研究策略"面板
    │   ├── GovernancePanel.tsx   总览页可展开的"治理记录"
    │   ├── SnapshotGrid.tsx      项目页顶部的 Snapshot 字段卡片
    │   ├── RoundTrack.tsx        项目页的"回合分数轨道"图(签名组件)
    │   ├── RoundCards.tsx        项目页每个回合的详情小卡片
    │   ├── EvaluationsPanel.tsx  项目页的"评审报告"列表
    │   ├── OsFeedbackPanel.tsx   项目页的"OS Feedback"表格
    │   ├── LocalSkillsPanel.tsx  项目页的"私有技能"列表
    │   ├── SkillCard.tsx         商店页里的一张技能卡片
    │   ├── SyncBadge.tsx         技能的四态同步徽章
    │   └── SkillDrawer.tsx       点击技能卡片后弹出的详情抽屉
    └── pages/                ← 三个应用窗口里各自的内容
        ├── DashboardPage.tsx     "总览"窗口的内容
        ├── ProjectPage.tsx       "项目"窗口的内容
        └── StorePage.tsx        "技能商店"窗口的内容
```

## 怎么启动(两条命令)

**第一步:先让 state.json 存在**(如果还没生成过,或者数据太旧了):

```bash
cd os-ui/generator
uv run python generate.py
```

**第二步:回到 frontend 目录,启动开发服务器**:

```bash
cd os-ui/frontend
npm install   # 只有第一次跑,或者 package.json 变了才需要
npm run dev
```

跑完后终端会打印一个网址,通常是 `http://localhost:5173/`,用浏览器打开它就能看到桌面。
开发服务器在你改代码时会自动刷新页面(热更新),不用自己重启。

## 怎么打包成"正式版"

```bash
npm run build
```

这会先做一次 TypeScript 类型检查,再把所有代码打包压缩到 `dist/` 目录里,
产出一个可以直接用任何静态网页服务器(比如 `npm run preview`、或者 nginx)
托管的成品站点。`dist/` 目录不会被提交到 git 仓库(已在 `.gitignore` 里排除),
每次需要发布时重新 `npm run build` 就行。

## 我想改一个颜色 / 一段文案,应该去哪个文件?

- **改色板**(比如想让"橙色警示色"变成别的颜色):去 `src/index.css`
  最上面的 `:root { ... }` 部分,里面每一行都是一个颜色变量,比如
  `--signal: #E8590C;` 就是那个橙色。改了这一处,全站用到这个颜色的地方
  都会跟着变。
- **改字体**:也是在 `src/index.css` 的 `:root` 里,`--mono` 和 `--sans`
  两个变量。如果要换成别的 Google Fonts 字体,还要去 `index.html` 里的
  `<link href="https://fonts.googleapis.com/...">` 那一行换成新字体的链接。
- **改某个页面上的中文文案**(比如"暂无回合数据"这句话):
  先看这句话大概属于哪个页面(总览/项目/商店),再去 `src/pages/` 里对应的
  `DashboardPage.tsx` / `ProjectPage.tsx` / `StorePage.tsx` 找;如果那句话
  是某个可复用小部件的一部分(比如空态提示、按钮文字),就去
  `src/components/` 下面同名的文件里改,比如"未找到 state.json"这句话在
  `src/components/StateMissing.tsx` 里。
- **改应用名字或图标**(总览/项目/技能商店):去 `src/desktop/apps.tsx` 里的
  `APPS` 数组;每一项还带 `defaultW` / `defaultH`,就是这个应用窗口的默认宽高。
- **改程序坞里"复制生成命令"复制的内容**:去 `src/desktop/Dock.tsx` 最上面的
  `GENERATE_COMMAND` 常量。
- **改安装命令的拼接规则**:去 `src/lib/skills.ts` 的 `installCommand` 函数。

## 常见问题

**Q: 跑 `npm run dev` 提示端口被占用(port already in use)怎么办?**
A: 说明你之前开的开发服务器还在后台跑,或者电脑上别的程序占用了这个端口。
可以直接指定一个新端口再跑一次:
```bash
npm run dev -- --port 5180
```
或者找到并关掉那个占用端口的旧进程。

**Q: 打开网页显示"未找到 state.json"怎么办?**
A: 这说明 `os-ui/frontend/public/state.json` 这个文件还不存在,或者请求失败了。
按页面上的提示,去仓库根目录跑一次生成器就行:
```bash
cd os-ui/generator && uv run python generate.py
```
生成器成功跑完后,网页会在 5 秒内自动检测到并刷新,不需要重开浏览器。

**Q: 页头的"快照"牌子变成了橙色,写着"快照可能过时",这是坏了吗?**
A: 不是坏了,这是设计好的诚实提示——如果 `state.json` 里记录的生成时间
(`generated_at`)距离现在已经超过 10 分钟,页面会主动告诉你数据可能不新鲜了,
而不是装作一切都是实时的。重新跑一次生成器就会恢复正常颜色。

**Q: `npm install` 或 `npm run build` 报错了怎么办?**
A: 先确认 Node.js 版本(建议 18 及以上,推荐用仓库里验证过的 22),
再确认你是在 `os-ui/frontend/` 目录下执行命令,而不是仓库根目录。
如果报错信息里提到某个具体的包找不到,先删掉 `node_modules/` 文件夹和
`package-lock.json`,重新跑一次 `npm install`。

**Q: 我能不能删掉整个 `os-ui/` 目录?**
A: 可以。这是设计上刻意保留的能力——`os-ui/` 是独立于仓库其他部分的
"观察窗口",删掉它不会影响仓库里任何真实的研究数据、项目文件或 Git 历史。
