import { useState } from "react";
import type { ReactNode } from "react";
import type { OsState } from "../types";
import { ProjectHeader } from "../components/ProjectHeader";
import { RoundTrack } from "../components/RoundTrack";
import { RoundCards } from "../components/RoundCards";
import { OsFeedbackPanel } from "../components/OsFeedbackPanel";
import { EvaluationsPanel } from "../components/EvaluationsPanel";
import { LocalSkillsPanel } from "../components/LocalSkillsPanel";
import { AgentChat } from "../components/AgentChat";
import { Chip } from "../components/Chip";
import { Disclosure } from "../components/Disclosure";

interface Props {
  state: OsState;
}

/** The summary row of a collapsed project section: name, count, source. */
function SectionRow({ label, count, source }: { label: string; count: number; source: string }) {
  return (
    <>
      <span className="font-mono-heading text-[12px] font-semibold text-ink">{label}</span>
      <Chip tone={count > 0 ? "ok" : "mute"}>{count}</Chip>
      <span className="section-src min-w-0 flex-1 truncate">{source}</span>
    </>
  );
}

function Section({ label, count, source, open, children }: { label: string; count: number; source: string; open?: boolean; children: ReactNode }) {
  return (
    <Disclosure open={open} className="rounded border border-grid bg-panel px-3.5 py-2.5" summary={<SectionRow label={label} count={count} source={source} />}>
      <div className="pl-5">{children}</div>
    </Disclosure>
  );
}

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
          </div>

          {view === "agent" ? (
            <div className="h-[62vh] min-h-[420px] overflow-hidden rounded border border-grid">
              <AgentChat
                cwd={`projects-folder/${project.name}`}
                heading={`${project.name} agent`}
                intro={`Talk to this project's agent directly. Each message runs one turn inside projects-folder/${project.name}/, on your own login. Runs the root agent dispatched here appear in the list too, and can be continued with your feedback.`}
                examples={[
                  "Summarize the current state of this project from PROJECT_MEMORY.md.",
                  "Run the validation commands in Code/README.md and report the results.",
                  "Add a Progress Log bullet for what you just did.",
                ]}
              />
            </div>
          ) : (
            <>
              <ProjectHeader
                snapshot={project.snapshot}
                counts={{
                  rounds: project.rounds.length,
                  evaluations: project.evaluations.length,
                  feedback: project.os_feedback.length,
                  skills: project.local_skills.length,
                }}
              />

              <div className="mt-3 flex flex-col gap-2">
                <Section label="Round score track" count={project.rounds.length} source="Code/runs/<round>/result.json" open={project.rounds.length > 0}>
                  <RoundTrack rounds={project.rounds} evaluation={project.evaluation} />
                  <RoundCards rounds={project.rounds} />
                </Section>
                <Section label="Evaluations" count={project.evaluations.length} source="Evaluations/">
                  <EvaluationsPanel entries={project.evaluations} />
                </Section>
                <Section label="OS Feedback" count={project.os_feedback.length} source="PROJECT_MEMORY.md · required each round">
                  <OsFeedbackPanel entries={project.os_feedback} />
                </Section>
                <Section label="Local skills" count={project.local_skills.length} source=".claude/skills or .agents/skills">
                  <LocalSkillsPanel skills={project.local_skills} />
                </Section>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
