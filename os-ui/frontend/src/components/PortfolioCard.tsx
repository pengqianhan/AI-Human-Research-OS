import type { PortfolioEntry } from "../types";
import { relativeTime, stripInlineMarkdown } from "../lib/format";
import { Badge } from "./Badge";
import { Chip } from "./Chip";
import type { ChipTone } from "./Chip";
import { Chevron } from "./Disclosure";
import { StageBar } from "./StageBar";

interface Props {
  entry: PortfolioEntry;
}

export function priorityTone(priority: string | null): ChipTone {
  return priority === "P1" ? "signal" : priority === "P2" ? "warn" : "mute";
}

/**
 * The portfolio flight strip (DESIGN.md §7, signature element ①), read at a
 * glance: the left edge and a stage bar say where the project is, chips say
 * who owns it, how urgent it is, whether an evaluator exists, and how fresh
 * the evidence is. Clicking the strip opens the sentences behind them:
 * status, evaluator, next action, and the evidence source.
 */
export function PortfolioCard({ entry }: Props) {
  const stage = entry.stage;
  const edge =
    stage === "complete"
      ? "border-l-verify"
      : stage === "alert"
        ? "border-l-warn"
        : stage === "probe"
          ? "border-l-signal"
          : "border-l-verify";
  const hasEvaluator = entry.evaluator !== "n/a";
  const evaluator = stripInlineMarkdown(entry.evaluator);

  return (
    <details
      className={
        "strip group mb-2 overflow-hidden rounded border border-grid border-l-[6px] bg-panel transition hover:shadow-[0_3px_10px_rgba(23,38,46,.08)] " +
        edge
      }
    >
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <div className="min-w-0 flex-1 basis-56">
          <div className="font-mono-heading truncate text-[13.5px] font-semibold" title={entry.project}>
            {entry.project}
          </div>
          <div className="mt-1.5 max-w-[220px]">
            <StageBar stage={stage} />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Chip tone="ink" title="owner">
            {entry.owner}
          </Chip>
          <Chip tone={priorityTone(entry.priority)} title="priority">
            {entry.priority}
          </Chip>
          <Chip tone={hasEvaluator ? "ok" : "mute"} dot title={hasEvaluator ? evaluator : "no evaluator"}>
            {hasEvaluator ? "evaluator" : "no evaluator"}
          </Chip>
          <Chip title={`evidence: ${entry.evidence.source}`}>{relativeTime(entry.evidence.mtime)}</Chip>
        </div>
        <Chevron />
      </summary>

      <div className="grid gap-3 border-t border-dashed border-grid px-4 py-3 text-[12px] md:grid-cols-3">
        <div className="min-w-0 break-words">
          <div className="font-mono-heading text-[10px] uppercase tracking-[.06em] text-stale">status</div>
          <p className="mt-1 text-ink-soft">{stripInlineMarkdown(entry.status)}</p>
        </div>
        <div className="min-w-0 break-words">
          <div className="font-mono-heading text-[10px] uppercase tracking-[.06em] text-stale">evaluator</div>
          <div className="mt-1">
            {hasEvaluator ? (
              <Badge tone="ok" block>
                {evaluator}
              </Badge>
            ) : (
              <Badge tone="mute">n/a</Badge>
            )}
          </div>
        </div>
        <div className="min-w-0 break-words">
          <div className="font-mono-heading text-[10px] uppercase tracking-[.06em] text-stale">next action</div>
          <p className="mt-1 text-ink">{stripInlineMarkdown(entry.next_action)}</p>
        </div>
        <div className="font-mono-heading text-[10px] text-stale md:col-span-3">
          {entry.path} · evidence {entry.evidence.source} · {relativeTime(entry.evidence.mtime)}
        </div>
      </div>
    </details>
  );
}
