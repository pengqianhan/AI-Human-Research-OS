import { useState } from "react";
import type { OsState } from "../types";
import { ProjectOverview } from "../components/ProjectOverview";
import { AgentChat } from "../components/AgentChat";
import { LIVE } from "../lib/mode";
import { PROJECT_EXAMPLES, projectIntro } from "../lib/agentCopy";

interface Props {
  state: OsState;
}

/** The retired desktop shell's Projects window (src/desktop/). The new layout uses pages/WorkspacePage.tsx. */
export function ProjectPage({ state }: Props) {
  const projects = state.projects;
  const [selectedName, setSelectedName] = useState<string | null>(
    projects.length > 0 ? (projects[0]?.name ?? null) : null,
  );

  const project = projects.find((p) => p.name === selectedName) ?? projects[0] ?? null;
  // "overview" is the glanceable page; "agent" is the direct conversation with
  // this project's agent (an os-harness session inside the project directory).
  const [view, setView] = useState<"overview" | "agent">("overview");

  return (
    <section>
      <div
        className="store-bar mb-4 flex flex-wrap items-center gap-2"
        role="group"
        aria-label="Select registered project"
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
                (selected ? "border-ink bg-ink text-white" : "border-grid bg-panel text-ink-soft")
              }
            >
              {p.name}
            </button>
          );
        })}
      </div>

      {project === null ? (
        <p className="text-[13px] text-stale">No registered projects.</p>
      ) : (
        <>
          <div className="crumb font-mono-heading mb-3.5 flex flex-wrap items-center gap-3 text-[12px] text-stale">
            <span>
              Portfolio / <b className="text-ink">{project.name}</b>
            </span>
            {/* The Agent view talks to the dev server; a published build has only the overview. */}
            {LIVE && (
              <span className="ml-auto flex gap-1" role="group" aria-label="Project view">
                {(["overview", "agent"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    aria-pressed={view === v}
                    onClick={() => setView(v)}
                    className={
                      "rounded border px-2.5 py-[3px] text-[11.5px] " +
                      (view === v ? "border-ink bg-ink text-white" : "border-grid bg-panel text-ink-soft")
                    }
                  >
                    {v === "overview" ? "Overview" : "Agent"}
                  </button>
                ))}
              </span>
            )}
          </div>

          {LIVE && view === "agent" ? (
            <div className="h-[62vh] min-h-[420px] overflow-hidden rounded border border-grid">
              <AgentChat
                cwd={`projects-folder/${project.name}`}
                heading={`${project.name} agent`}
                intro={projectIntro(project.name)}
                examples={PROJECT_EXAMPLES}
              />
            </div>
          ) : (
            <ProjectOverview project={project} />
          )}
        </>
      )}
    </section>
  );
}
