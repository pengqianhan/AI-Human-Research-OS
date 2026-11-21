import type { OsState } from "../types";
import { ActiveWorkPanel } from "./ActiveWorkPanel";
import { ActivityTimeline } from "./ActivityTimeline";
import { GovernancePanel } from "./GovernancePanel";
import { PolicyPanel } from "./PolicyPanel";

/**
 * Home's closed-by-default "Workspace status": what the retired Dashboard
 * window showed besides the portfolio, which mockup C has no place for —
 * the research policy chips, HANDOFF.md's Active Work, recent activity, and
 * the governance log.
 */
export function WorkspaceStatus({ state }: { state: OsState }) {
  const openItems = state.active_work.reduce((n, s) => n + s.items.filter((i) => !i.done).length, 0);
  return (
    // A named group (group/status): the panels inside have their own open/closed chevrons.
    <details className="group/status card mt-10">
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-3 gap-y-1 rounded-card px-6 py-4 hover:bg-hover [&::-webkit-details-marker]:hidden">
        <svg aria-hidden="true" viewBox="0 0 12 12" className="h-3 w-3 shrink-0 text-muted transition-transform group-open/status:rotate-90">
          <path d="M4 2.5 7.5 6 4 9.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h2 className="font-serif text-[20px] font-medium">Workspace status</h2>
        <span className="text-[13px] text-muted">
          {state.active_work.length} Active Work sections · {openItems} open items · {state.activity.length} recent events · {state.governance.length} decisions
        </span>
      </summary>
      <div className="border-t border-line px-6 pb-6 pt-4">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="label">
            Policy<span className="section-src">memory/MEMORY.md</span>
          </h3>
          <PolicyPanel policy={state.policy} />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-5">
          <div className="min-w-0">
            <h3 className="section-heading">
              Active Work<span className="section-src">HANDOFF.md</span>
            </h3>
            <div className="flex flex-col gap-2">
              {state.active_work.map((section, idx) => (
                <ActiveWorkPanel key={idx} section={section} />
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <h3 className="section-heading">
              Recent Activity<span className="section-src">git log + progress logs</span>
            </h3>
            <ActivityTimeline entries={state.activity} />
          </div>
        </div>
        <h3 className="section-heading">
          Governance<span className="section-src">HANDOFF.md + memory/MEMORY.md</span>
        </h3>
        <GovernancePanel entries={state.governance} />
      </div>
    </details>
  );
}
