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
          state.json not found
        </p>
        <p className="mt-3 text-[14px] text-ink-soft">
          Run the generator first, then refresh this page.
        </p>
        <pre className="font-mono-heading mt-4 overflow-x-auto rounded bg-ink px-4 py-3 text-left text-[12.5px] text-[#E8EDEF]">
          cd os-ui/generator &amp;&amp; uv run python generate.py
        </pre>
        <p className="mt-4 text-[12px] text-stale">
          This page retries every 5 seconds; once generation succeeds, it updates automatically.
        </p>
      </div>
    </div>
  );
}
