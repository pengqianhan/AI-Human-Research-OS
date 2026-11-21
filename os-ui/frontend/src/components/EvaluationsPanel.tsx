import type { ProjectEvaluation } from "../types";

interface Props {
  entries: ProjectEvaluation[];
}

/** Review reports list (projects-folder/<P>/Evaluations/). Empty state when none exist yet. */
export function EvaluationsPanel({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <p className="text-[13px] text-muted">
        No review reports yet. Mid-term and final reviews will appear here after they land in Evaluations/.
      </p>
    );
  }

  return (
    <ul className="feed">
      {entries.map((e, idx) => (
        <li
          key={idx}
          className="flex gap-3 border-b border-line py-2 text-[13px] last:border-b-0"
        >
          <time className="whitespace-nowrap pt-px text-[11.5px] text-muted">
            {e.date ?? "todo"}
          </time>
          <span className="flex-1">{e.summary}</span>
          <span className="font-mono-heading ml-auto whitespace-nowrap text-[11px] text-faint">
            {e.source}
          </span>
        </li>
      ))}
    </ul>
  );
}
