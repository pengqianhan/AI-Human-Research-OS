import type { OsState } from "../types";
import { PortfolioStrip } from "../components/PortfolioStrip";
import { UnregisteredStrip } from "../components/UnregisteredStrip";
import { ActiveWorkPanel } from "../components/ActiveWorkPanel";
import { ActivityFeed } from "../components/ActivityFeed";
import { PolicyPanel } from "../components/PolicyPanel";
import { GovernancePanel } from "../components/GovernancePanel";

interface Props {
  state: OsState;
}

export function DashboardPage({ state }: Props) {
  return (
    // the WindowFrame already provides the labeled region landmark
    <section>
      <h2 className="section-heading">
        Portfolio<span className="section-src">Source: memory/MEMORY.md · Active Projects</span>
      </h2>

      {state.portfolio.map((entry) => (
        <PortfolioStrip key={entry.project} entry={entry} />
      ))}
      {state.unregistered_projects.map((entry) => (
        <UnregisteredStrip key={entry.name} entry={entry} />
      ))}

      {/* auto-fit: column count follows the window's real width, not the screen's */}
      <div className="cols mt-[26px] grid grid-cols-[repeat(auto-fit,minmax(330px,1fr))] gap-4">
        <div>
          <h2 className="section-heading">
            Active Work<span className="section-src">Source: HANDOFF.md · Active Work</span>
          </h2>
          <div className="flex flex-col gap-3">
            {state.active_work.map((section, idx) => (
              <ActiveWorkPanel key={idx} section={section} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-heading">
            Recent Activity<span className="section-src">Source: git log + progress logs</span>
          </h2>
          <ActivityFeed entries={state.activity} />

          <h2 className="section-heading mt-[22px]">Research Policy<span className="section-src">Source: memory/MEMORY.md</span></h2>
          <PolicyPanel policy={state.policy} />
        </div>
      </div>

      <GovernancePanel entries={state.governance} />
    </section>
  );
}
