import { DESKTOP } from "../lib/mode";
import { desktop } from "../lib/desktop";
import { ChooseFolderButton, PrerequisiteGrid, SnapshotLine, useDesktopInfo, usePrerequisites } from "./DesktopStatus";

const REPOSITORY = "https://github.com/pengqianhan/AI-Human-Research-OS";

/**
 * Full-page empty state shown when /state.json is missing (404) or the
 * fetch fails outright. The frontend never fabricates portfolio/store/etc.
 * data — if there's nothing to read, it says so and tells the human exactly
 * which command regenerates the file.
 */
export function StateMissing() {
  if (DESKTOP) return <DesktopWelcome />;
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

/**
 * The desktop client before a snapshot exists: no folder chosen yet, or the
 * generator has not succeeded. Shows the folder, the last generator run, and
 * the prerequisites, with the two actions that fix them.
 */
function DesktopWelcome() {
  const [info] = useDesktopInfo();
  const [report, checking, recheck] = usePrerequisites();
  const noFolder = info !== null && info.workspace === null;

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-10">
      <div data-testid="desktop-welcome" className="w-full max-w-[680px] rounded border border-grid bg-panel p-8">
        <p className="font-mono-heading text-[13px] font-semibold uppercase tracking-[.08em] text-signal">
          {noFolder ? "Open your Research OS folder" : "Preparing the snapshot"}
        </p>
        <p className="mt-2 text-[13.5px] text-ink-soft">
          {noFolder
            ? "Choose the folder of your Research OS checkout (the one with AGENTS.md)."
            : "The desktop appears once the generator has read this folder."}
        </p>
        {noFolder && (
          <p className="mt-1 text-[12.5px] text-ink-soft">
            No folder yet?{" "}
            <a href={REPOSITORY} target="_blank" rel="noreferrer" className="text-signal underline">
              Get the Research OS
            </a>{" "}
            and clone it first.
          </p>
        )}
        {info?.workspaceProblem && <p className="mt-2 text-[12.5px] text-danger">{info.workspaceProblem}</p>}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          {info?.workspace && (
            <code className="font-mono-heading min-w-0 flex-1 truncate text-[12px] text-ink" title={info.workspace}>
              {info.workspace}
            </code>
          )}
          {info?.workspace && <SnapshotLine snapshot={info.snapshot} />}
          {info?.workspace && (
            <button
              type="button"
              onClick={() => void desktop?.regenerate()}
              className="font-mono-heading rounded border border-grid px-3 py-1 text-[12px] text-ink hover:bg-paper"
            >
              Regenerate
            </button>
          )}
          <ChooseFolderButton label={noFolder ? "Choose folder…" : "Change folder…"} />
        </div>

        <div className="mt-6">
          <PrerequisiteGrid report={report} checking={checking} onRecheck={recheck} />
        </div>
      </div>
    </div>
  );
}
