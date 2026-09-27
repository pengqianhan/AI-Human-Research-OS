import type { OsState } from "../types";
import { PortfolioCard } from "../components/PortfolioCard";
import { UnregisteredStrip } from "../components/UnregisteredStrip";
import { ActiveWorkPanel } from "../components/ActiveWorkPanel";
import { ActivityTimeline } from "../components/ActivityTimeline";
import { PolicyPanel } from "../components/PolicyPanel";
import { GovernancePanel } from "../components/GovernancePanel";

interface Props {
  state: OsState;
}

/**
 * Glance first, text on click: portfolio strips with bars and chips, Active
 * Work rows with progress bars, a timeline of activity, policy chips, and a
 * collapsed governance log. Every sentence behind them opens on click.
 */
export function DashboardPage({ state }: Props) {
  return (
    // the WindowFrame already provides the labeled region landmark
    <section>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="section-heading !m-0">
          Portfolio<span className="section-src">memory/MEMORY.md</span>
        </h2>
        <PolicyPanel policy={state.policy} />
      </div>

      <div className="mt-3">
        {state.portfolio.map((entry) => (
          <PortfolioCard key={entry.project} entry={entry} />
        ))}
        {state.unregistered_projects.map((entry) => (
          <UnregisteredStrip key={entry.name} entry={entry} />
        ))}
      </div>

      {/* auto-fit: column count follows the window's real width, not the screen's */}
      <div className="cols mt-[26px] grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-4">
        <div>
          <h2 className="section-heading">
            Active Work<span className="section-src">HANDOFF.md</span>
          </h2>
          <div className="flex flex-col gap-2">
            {state.active_work.map((section, idx) => (
              <ActiveWorkPanel key={idx} section={section} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-heading">
            Recent Activity<span className="section-src">git log + progress logs</span>
          </h2>
          <ActivityTimeline entries={state.activity} />
        </div>
      </div>

      <GovernancePanel entries={state.governance} />
    </section>
  );
}
