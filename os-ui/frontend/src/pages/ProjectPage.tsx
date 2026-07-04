import { useState } from "react";
import type { OsState } from "../types";
import { SnapshotGrid } from "../components/SnapshotGrid";
import { RoundTrack } from "../components/RoundTrack";
import { RoundCards } from "../components/RoundCards";
import { OsFeedbackPanel } from "../components/OsFeedbackPanel";
import { EvaluationsPanel } from "../components/EvaluationsPanel";
import { LocalSkillsPanel } from "../components/LocalSkillsPanel";

interface Props {
  state: OsState;
}

export function ProjectPage({ state }: Props) {
  const projects = state.projects;
  const [selectedName, setSelectedName] = useState<string | null>(
    projects.length > 0 ? (projects[0]?.name ?? null) : null,
  );

  const project = projects.find((p) => p.name === selectedName) ?? projects[0] ?? null;

  return (
    <section id="page-proj" role="tabpanel" aria-labelledby="tab-proj" className="pt-7">
      <div
        className="store-bar mb-4 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="选择已登记项目"
      >
        {projects.map((p) => {
          const selected = p.name === project?.name;
          return (
            <button
              key={p.name}
              type="button"
              aria-pressed={selected}
              onClick={() => setSelectedName(p.name)}
              className={
                "font-mono-heading rounded-full border px-3.5 py-[5px] text-[12px] " +
                (selected
                  ? "border-ink bg-ink text-white"
                  : "border-grid bg-panel text-ink-soft")
              }
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {project === null ? (
        <p className="text-[13px] text-stale">暂无已登记项目。</p>
      ) : (
        <>
          <div className="crumb font-mono-heading mb-3.5 text-[12px] text-stale">
            项目组合 / <b className="text-ink">{project.name}</b>
          </div>

          <SnapshotGrid snapshot={project.snapshot} />

          <h2 className="section-heading mt-[26px]">
            回合分数轨道<span className="section-src">分数只读 evaluator 落盘的 result.json</span>
          </h2>
          <RoundTrack rounds={project.rounds} evaluation={project.evaluation} />
          <RoundCards rounds={project.rounds} />

          <div className="cols mt-[26px] grid grid-cols-2 gap-4 max-[900px]:grid-cols-1">
            <div>
              <h2 className="section-heading">
                Evaluations<span className="section-src">projects-folder/&lt;P&gt;/Evaluations/</span>
              </h2>
              <div className="panel rounded border border-grid bg-panel p-4 px-[18px]">
                <EvaluationsPanel entries={project.evaluations} />
              </div>
            </div>
            <div>
              <h2 className="section-heading">
                OS Feedback<span className="section-src">PROJECT_MEMORY.md · 每回合必录</span>
              </h2>
              <OsFeedbackPanel entries={project.os_feedback} />
            </div>
          </div>

          <h2 className="section-heading mt-[26px]">私有技能<span className="section-src">项目内 .claude/skills 或 .agents/skills</span></h2>
          <div className="panel rounded border border-grid bg-panel p-4 px-[18px]">
            <LocalSkillsPanel skills={project.local_skills} />
          </div>
        </>
      )}
    </section>
  );
}
