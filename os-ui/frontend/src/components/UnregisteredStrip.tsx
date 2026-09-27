import type { UnregisteredProject } from "../types";
import { Chip } from "./Chip";
import { Chevron } from "./Disclosure";

interface Props {
  entry: UnregisteredProject;
}

/**
 * Amber strip for a project folder that exists on disk but has no
 * portfolio row / PROJECT_MEMORY.md. A "pending human decision" signal, not
 * an error the UI can fix; the explanation opens on click.
 */
export function UnregisteredStrip({ entry }: Props) {
  return (
    <details className="strip group mb-2 overflow-hidden rounded border border-grid border-l-[6px] border-l-warn bg-panel">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1 basis-56">
          <div className="font-mono-heading truncate text-[13.5px] font-semibold">{entry.name}</div>
          <div className="font-mono-heading mt-[3px] truncate text-[10.5px] text-stale">{entry.path}</div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Chip tone="warn" dot>
            unregistered
          </Chip>
          <Chip tone="signal" dot>
            needs decision
          </Chip>
        </div>
        <Chevron />
      </summary>
      <div className="border-t border-dashed border-grid px-4 py-3 text-[12px] text-ink-soft">
        Found on disk, but missing from the portfolio table: no PROJECT_MEMORY.md and no portfolio
        row. GOAL.md M0: register it, or declare it an exempt zone.
      </div>
    </details>
  );
}
