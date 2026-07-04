/**
 * Full-page empty state shown when /state.json is missing (404) or the
 * fetch fails outright. The frontend never fabricates portfolio/store/etc.
 * data — if there's nothing to read, it says so and tells the human exactly
 * which command regenerates the file.
 */
export function StateMissing() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-[560px] rounded border border-grid bg-panel p-8 text-center">
        <p className="font-mono-heading text-[13px] font-semibold uppercase tracking-[.08em] text-signal">
          未找到 state.json
        </p>
        <p className="mt-3 text-[14px] text-ink-soft">
          先运行生成器,再刷新本页面。
        </p>
        <pre className="font-mono-heading mt-4 overflow-x-auto rounded bg-ink px-4 py-3 text-left text-[12.5px] text-[#E8EDEF]">
          cd os-ui/generator &amp;&amp; uv run python generate.py
        </pre>
        <p className="mt-4 text-[12px] text-stale">
          本页面每 5 秒会自动重试;生成成功后无需手动刷新。
        </p>
      </div>
    </div>
  );
}
