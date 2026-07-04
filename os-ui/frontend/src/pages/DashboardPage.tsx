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
    <section id="page-dash" role="tabpanel" aria-labelledby="tab-dash" className="pt-7">
      <h2 className="section-heading">
        项目组合<span className="section-src">来源 Memory/MEMORY.md · Active Projects</span>
      </h2>

      {state.portfolio.map((entry) => (
        <PortfolioStrip key={entry.project} entry={entry} />
      ))}
      {state.unregistered_projects.map((entry) => (
        <UnregisteredStrip key={entry.name} entry={entry} />
      ))}

      <div className="cols mt-[26px] grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
        <div>
          <h2 className="section-heading">
            进行中的工作<span className="section-src">来源 HANDOFF.md · Active Work</span>
          </h2>
          <div className="flex flex-col gap-3">
            {state.active_work.map((section, idx) => (
              <ActiveWorkPanel key={idx} section={section} />
            ))}
          </div>
        </div>

        <div>
          <h2 className="section-heading">
            最近活动<span className="section-src">来源 git log + progress logs</span>
          </h2>
          <ActivityFeed entries={state.activity} />

          <h2 className="section-heading mt-[22px]">研究策略<span className="section-src">来源 Memory/MEMORY.md</span></h2>
          <PolicyPanel policy={state.policy} />
        </div>
      </div>

      <GovernancePanel entries={state.governance} />
    </section>
  );
}
