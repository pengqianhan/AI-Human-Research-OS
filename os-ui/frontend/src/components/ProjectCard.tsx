import type { UnregisteredProject } from "../types";
import type { ProjectRow } from "../lib/projects";
import { relativeTime } from "../lib/format";
import { Icon } from "../shell/icons";

/** Explanation shown for a project folder that has no portfolio row and no PROJECT_MEMORY.md. */
export const UNREGISTERED_TEXT =
  "Found on disk, but missing from the portfolio table: no PROJECT_MEMORY.md and no portfolio row. GOAL.md M0: register it, or declare it an exempt zone.";

/**
 * The whole card opens the workspace: its "Open workspace" button is
 * stretched over the card (::after), so the card's text stays readable to
 * screen readers instead of being swallowed by a button.
 */
export const stretchedButton =
  "after:absolute after:inset-0 after:rounded-[inherit] after:content-[''] focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-offset-2 focus-visible:after:outline-accent";

/** A Home card for one project, in mockup C's style, from the real snapshot only. */
export function ProjectCard({ row, onOpen }: { row: ProjectRow; onOpen: () => void }) {
  const openable = row.project !== null;
  return (
    <article
      className={
        "card relative flex min-h-[270px] flex-col rounded-card px-6 pb-[18px] pt-5 transition-[transform,box-shadow] duration-150 " +
        (openable ? "hover:-translate-y-0.5 hover:shadow-sh3 has-[button:focus-visible]:-translate-y-0.5" : "")
      }
    >
      <div className="mb-2.5 flex items-center gap-2">
        <span className="font-mono-heading min-w-0 flex-1 truncate text-[11.5px] text-muted" title={row.path}>
          {row.path}
        </span>
        <span className="pill">Stage · {row.stage ?? "not filled in"}</span>
        {row.priority && <span className="pill pill-neutral">{row.priority}</span>}
      </div>
      <h3 className="font-serif text-[25px] font-medium leading-tight tracking-[-.005em]">{row.name}</h3>
      <div aria-hidden="true" className="my-3 h-px bg-accent opacity-35" />
      {row.question && <p className="prose-serif mb-4">{row.question}</p>}
      <dl className="grid grid-cols-[94px_minmax(0,1fr)] gap-x-3.5 gap-y-2 text-[13px] leading-[1.45]">
        <Fact label="Status" text={row.status} lines={2} />
        <Fact label="Next action" text={row.nextAction} lines={3} />
        <Fact label="Evaluator" text={row.hasEvaluator ? row.evaluator : "none yet"} lines={2} />
        <Fact label="Owner" text={row.owner} lines={1} />
      </dl>
      <div className="mt-auto flex items-center gap-2.5 pt-4">
        {openable ? (
          <button
            type="button"
            onClick={onOpen}
            aria-label={`Open workspace: ${row.name}`}
            className={"inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent " + stretchedButton}
          >
            Open workspace <Icon name="arrow" size={14} />
          </button>
        ) : (
          <span className="text-[12.5px] text-muted">No PROJECT_MEMORY.md snapshot, so no workspace</span>
        )}
        {row.entry && (
          <span className="src-note ml-auto">
            from {row.entry.evidence.source} · {relativeTime(row.entry.evidence.mtime)}
          </span>
        )}
      </div>
    </article>
  );
}

function Fact({ label, text, lines }: { label: string; text: string | null; lines: 1 | 2 | 3 }) {
  const clamp = lines === 1 ? "truncate" : lines === 2 ? "line-clamp-2" : "line-clamp-3";
  return (
    <>
      <dt className="label !leading-[1.9]">{label}</dt>
      <dd className={clamp + " " + (text === null ? "text-muted" : "text-ink")} title={text ?? undefined}>
        {text ?? "not filled in"}
      </dd>
    </>
  );
}

/** A folder under projects-folder/ that is not registered: an amber card, nothing to open. */
export function UnregisteredCard({ entry }: { entry: UnregisteredProject }) {
  return (
    <article className="relative flex min-h-[200px] flex-col rounded-card bg-paper px-6 pb-[18px] pt-5 shadow-sh1">
      <div className="mb-2.5 flex items-center gap-2">
        <span className="font-mono-heading min-w-0 flex-1 truncate text-[11.5px] text-muted">{entry.path}</span>
        <span className="pill pill-warn">unregistered</span>
        <span className="pill pill-signal">needs decision</span>
      </div>
      <h3 className="font-serif text-[25px] font-medium leading-tight text-ink2">{entry.name}</h3>
      <div aria-hidden="true" className="my-3 h-px bg-warn opacity-35" />
      <p className="prose-serif">{UNREGISTERED_TEXT}</p>
    </article>
  );
}
