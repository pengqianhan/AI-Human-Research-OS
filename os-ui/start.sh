#!/usr/bin/env bash
# os-ui 一键启动:生成 state.json 快照 → 首次自动安装前端依赖 → 启动开发服务器。
#
# 用法(在仓库任意位置执行都可以):
#   ./os-ui/start.sh            # 生成一次快照,然后启动前端
#   ./os-ui/start.sh --watch    # 同上,并让生成器持续跟踪仓库变化(数据常新)
#
# 前台运行,Ctrl-C 一次性停掉所有东西;不留任何后台常驻进程。
set -euo pipefail
cd "$(dirname "$0")"

# ---- 前置检查:友好地告诉用户缺什么、去哪装 -------------------------------
if ! command -v uv >/dev/null 2>&1; then
  echo "✗ 未找到 uv(Python 环境管理器)。安装方法见 https://docs.astral.sh/uv/" >&2
  exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
  echo "✗ 未找到 npm(随 Node.js 一起安装,建议 Node 18+)。见 https://nodejs.org/" >&2
  exit 1
fi

# ---- 第 1 步:生成数据快照 --------------------------------------------------
echo "▸ 生成 state.json 快照 ..."
(cd generator && uv run python generate.py)

# ---- 第 2 步:首次运行时安装前端依赖 ---------------------------------------
if [ ! -d frontend/node_modules ]; then
  echo "▸ 首次运行,安装前端依赖(仅此一次)..."
  (cd frontend && npm install)
fi

# ---- 可选:--watch 让快照持续跟踪仓库变化 ----------------------------------
# 生成器作为本脚本的子进程运行,随 Ctrl-C / 终端关闭一起退出,
# 不是后台常驻服务(见 DESIGN.md §2 的授权边界)。
if [ "${1:-}" = "--watch" ]; then
  echo "▸ 生成器进入 watch 模式(随本脚本一起退出)..."
  # exec 让子 shell 自替换成 uv 进程,这样 $! 记到的就是 uv 本身,
  # 退出时 trap 的 kill 才能真正命中它(而不是只杀掉一层空壳)。
  (cd generator && exec uv run python generate.py --watch) &
  WATCH_PID=$!
  trap 'kill "$WATCH_PID" 2>/dev/null || true' EXIT
fi

# ---- 第 3 步:启动前端开发服务器(前台) -----------------------------------
echo "▸ 启动前端,浏览器打开终端里打印的网址(通常 http://localhost:5173/)"
cd frontend && npm run dev
