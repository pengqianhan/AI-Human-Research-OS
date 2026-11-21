import type { ProjectSnapshot } from "../types";
import { stripInlineMarkdown } from "../lib/format";
import { Chip } from "./Chip";
import { Disclosure } from "./Disclosure";
import { priorityTone } from "./PortfolioCard";
import { StageBar } from "./StageBar";
import { StatTile } from "./StatTile";

interface Counts {
  rounds: number;
  evaluations: number;
  feedback: number;
  skills: number;
}

interface Props {
  snapshot: ProjectSnapshot;
  counts: Counts;
}

const FIELDS: { key: keyof ProjectSnapshot; label: string }[] = [
  { key: "current_question", label: "question" },
  { key: "next_action", label: "next action" },
  { key: "evaluator_status", label: "evaluator" },
  { key: "origin", label: "origin" },
];

/**
 * The project at a glance: the lifecycle bar, three chips, and four counts.
 * The Snapshot sentences (question, next action, evaluator, origin) sit
 * below as one-line previews that open on click. A null field still reads
 * "not filled in" rather than a guess (DESIGN.md §5).
 */
export function ProjectHeader({ snapshot, counts }: Props) {
  const evaluator = snapshot.evaluator_status;
  const hasEvaluator = evaluator !== null && !/^(n\/a|none)\b/i.test(evaluator);

  return (
    // minmax(0,1fr): the single column must not grow to the max-content width of
    // the nowrap preview lines below, or `truncate` would never truncate.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
      <div className="card-flat px-5 py-4">
        <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
          <div className="min-w-0 flex-1 basis-64">
            <StageBar stage={snapshot.stage} size="lg" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            <Chip tone="ink" title="owner">
              {snapshot.owner ?? "owner ?"}
            </Chip>
            <Chip tone={priorityTone(snapshot.priority)} title="priority">
              {snapshot.priority ?? "priority ?"}
            </Chip>
            <Chip tone={hasEvaluator ? "ok" : "mute"} dot title={evaluator ?? "not filled in"}>
              {hasEvaluator ? "evaluator" : "no evaluator"}
            </Chip>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2.5">
        <StatTile value={counts.rounds} label="rounds" tone={counts.rounds > 0 ? "ok" : "mute"} hint="Code/runs/<round>/result.json" />
        <StatTile value={counts.evaluations} label="evaluations" tone={counts.evaluations > 0 ? "ok" : "mute"} hint="Evaluations/" />
        <StatTile value={counts.feedback} label="os feedback" tone={counts.feedback > 0 ? "warn" : "mute"} hint="PROJECT_MEMORY.md · OS Feedback" />
        <StatTile value={counts.skills} label="local skills" tone={counts.skills > 0 ? "ok" : "mute"} hint=".claude/skills or .agents/skills" />
      </div>

      <div className="card-flat px-5 py-1">
        {FIELDS.map(({ key, label }) => {
          const value = snapshot[key];
          const text = value === null ? null : stripInlineMarkdown(value);
          return (
            <Disclosure key={key} className="border-b border-line py-2.5 last:border-b-0" summary={
              <>
                <span className="label w-24 shrink-0">{label}</span>
                <span className={"min-w-0 flex-1 truncate text-[13px] " + (text === null ? "text-stale" : "text-ink-soft")}>
                  {text ?? "not filled in"}
                </span>
              </>
            }>
              <p className={"prose-serif whitespace-pre-wrap break-words pl-5 text-[14.5px] " + (text === null ? "text-stale" : "text-ink")}>
                {text ?? "not filled in"}
              </p>
            </Disclosure>
          );
        })}
      </div>
    </div>
  );
}
