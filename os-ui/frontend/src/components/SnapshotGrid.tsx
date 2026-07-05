import type { ProjectSnapshot } from "../types";
import { stripInlineMarkdown } from "../lib/format";

interface Props {
  snapshot: ProjectSnapshot;
}

const FIELDS: { key: keyof ProjectSnapshot; label: string; mono?: boolean }[] = [
  { key: "stage", label: "stage", mono: true },
  { key: "owner", label: "owner", mono: true },
  { key: "priority", label: "priority", mono: true },
  { key: "evaluator_status", label: "evaluator", mono: true },
  { key: "current_question", label: "current question" },
  { key: "origin", label: "origin" },
  { key: "next_action", label: "next action" },
];

/**
 * Snapshot field cards for the Project page. Any null field renders the
 * honest "not filled in" placeholder in gray rather than inventing
 * a value — per DESIGN.md's data-honesty rule.
 */
export function SnapshotGrid({ snapshot }: Props) {
  return (
    <div className="snap-grid grid grid-cols-4 gap-2.5 max-[900px]:grid-cols-1">
      {FIELDS.map(({ key, label, mono }) => {
        const value = snapshot[key];
        return (
          <div key={key} className="snap-card rounded border border-grid bg-panel p-3 px-3.5">
            <div className="font-mono-heading text-[10px] uppercase tracking-[.06em] text-stale">
              {label}
            </div>
            <div
              className={
                "mt-[3px] " +
                (value === null
                  ? "text-[13px] text-stale"
                  : mono
                    ? "font-mono-heading text-[13px] font-medium"
                    : "text-[12.5px] font-medium")
              }
            >
              {value === null ? "not filled in" : stripInlineMarkdown(value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
