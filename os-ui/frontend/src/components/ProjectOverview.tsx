import type { ReactNode } from "react";
import type { Project } from "../types";
import { ProjectHeader } from "./ProjectHeader";
import { RoundTrack } from "./RoundTrack";
import { RoundCards } from "./RoundCards";
import { OsFeedbackPanel } from "./OsFeedbackPanel";
import { EvaluationsPanel } from "./EvaluationsPanel";
import { LocalSkillsPanel } from "./LocalSkillsPanel";
import { Chip } from "./Chip";
import { Disclosure } from "./Disclosure";

/** The summary row of a collapsed project section: name, count, source. */
function SectionRow({ label, count, source }: { label: string; count: number; source: string }) {
  return (
    <>
      <span className="text-[13.5px] font-semibold text-ink">{label}</span>
      <Chip tone={count > 0 ? "ok" : "mute"}>{count}</Chip>
      <span className="section-src min-w-0 flex-1 truncate">{source}</span>
    </>
  );
}

function Section({ label, count, source, open, children }: { label: string; count: number; source: string; open?: boolean; children: ReactNode }) {
  return (
    <Disclosure open={open} className="card-flat px-4 py-3" summary={<SectionRow label={label} count={count} source={source} />}>
      <div className="pl-5">{children}</div>
    </Disclosure>
  );
}

/**
 * A project at a glance, as the Projects window's Overview showed it before
 * the 2026-11-21 layout: the header (stage bar, chips, four counts, the
 * Snapshot sentences), then collapsed sections for the round score track,
 * evaluations, OS Feedback, and local skills.
 */
export function ProjectOverview({ project }: { project: Project }) {
  return (
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
  );
}
