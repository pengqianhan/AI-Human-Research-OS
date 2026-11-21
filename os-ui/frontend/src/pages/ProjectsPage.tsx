import type { OsState } from "../types";
import { PageHeader } from "../components/PageHeader";
import { stretchedButton, UNREGISTERED_TEXT } from "../components/ProjectCard";
import { projectRows } from "../lib/projects";
import { relativeTime } from "../lib/format";

const COLUMNS = "grid grid-cols-[minmax(0,1.15fr)_104px_minmax(0,1.6fr)_minmax(0,1.6fr)_132px] items-start gap-5";

/**
 * Every project as one row in mockup C's list style. A registered row opens
 * the project's workspace; the status and next-action sentences are shown in
 * full here, since this is the page for reading them.
 */
export function ProjectsPage({ state, onOpenProject }: { state: OsState; onOpenProject: (name: string) => void }) {
  const rows = projectRows(state);
  return (
    <div className="page">
      <PageHeader
        eyebrow="projects-folder/"
        title="Projects"
        lede="Each project is a folder with its own conversation and views. Open one to work inside it."
      />

      <div className="mt-[26px] flex flex-col gap-3" role="list" aria-label="Projects">
        <div className={COLUMNS + " label px-5"} aria-hidden="true">
          <span>Project</span>
          <span>Stage</span>
          <span>Status</span>
          <span>Next action</span>
          <span>Evidence</span>
        </div>

        {rows.length === 0 && state.unregistered_projects.length === 0 && (
          <p className="card-flat px-5 py-4 text-[13.5px] text-muted">No registered projects.</p>
        )}

        {rows.map((row) => {
          const openable = row.project !== null;
          return (
            <div
              key={row.name}
              role="listitem"
              className={"card relative px-5 py-4 text-[13px] transition-shadow " + COLUMNS + (openable ? " hover:shadow-sh3" : "")}
            >
              <div className="min-w-0">
                {openable ? (
                  <button
                    type="button"
                    onClick={() => onOpenProject(row.name)}
                    aria-label={`Open workspace: ${row.name}`}
                    className={"break-words text-left font-serif text-[18px] font-medium leading-tight text-ink " + stretchedButton}
                  >
                    {row.name}
                  </button>
                ) : (
                  <span className="break-words font-serif text-[18px] font-medium leading-tight text-ink2">{row.name}</span>
                )}
                <small className="mt-1 block text-[11.5px] text-muted">
                  {[row.priority, row.owner ? `owner ${row.owner}` : null].filter(Boolean).join(" · ") || "—"}
                </small>
                {!openable && <small className="mt-1 block text-[11.5px] text-muted">no PROJECT_MEMORY.md snapshot</small>}
              </div>
              <div>
                <span className="pill">{row.stage ?? "not filled in"}</span>
              </div>
              <div className={"break-words " + (row.status ? "text-ink" : "text-muted")}>{row.status ?? "not filled in"}</div>
              <div className={"break-words " + (row.nextAction ? "text-ink" : "text-muted")}>{row.nextAction ?? "not filled in"}</div>
              <div className="min-w-0 break-words">
                {row.entry ? (
                  <>
                    <span className="font-mono-heading text-[11.5px] text-ink2">{row.entry.evidence.source}</span>
                    <br />
                    <span className="text-muted">{relativeTime(row.entry.evidence.mtime)}</span>
                  </>
                ) : (
                  <span className="text-muted">not in the portfolio table</span>
                )}
              </div>
            </div>
          );
        })}

        {state.unregistered_projects.map((entry) => (
          <div key={entry.name} role="listitem" className={"rounded-card bg-paper px-5 py-4 text-[13px] shadow-sh1 " + COLUMNS}>
            <div className="min-w-0">
              <span className="break-words font-serif text-[18px] font-medium leading-tight text-ink2">{entry.name}</span>
              <small className="font-mono-heading mt-1 block truncate text-[11.5px] text-muted">{entry.path}</small>
            </div>
            <div className="flex flex-col items-start gap-1">
              <span className="pill pill-warn">unregistered</span>
              <span className="pill pill-signal">needs decision</span>
            </div>
            <div className="col-span-3 text-ink2">{UNREGISTERED_TEXT}</div>
          </div>
        ))}
      </div>
      <p className="src-note mt-3.5">
        Rows come from the portfolio table in <code>memory/MEMORY.md</code> and each project's <code>PROJECT_MEMORY.md</code> Snapshot.
      </p>
    </div>
  );
}
