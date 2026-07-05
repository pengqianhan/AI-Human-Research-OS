import type { PortfolioEntry } from "../types";
import { relativeTime, stripInlineMarkdown } from "../lib/format";
import { Badge } from "./Badge";

const STAGES = ["scout", "probe", "develop", "writing"] as const;

interface Props {
  entry: PortfolioEntry;
}

/**
 * One row of the signature "flight progress strip" (DESIGN.md §6, signature
 * element ①): left edge color-codes the stage, then name/path/stage-bar,
 * meta line, evaluator status, and next action — each with its evidence
 * source + relative timestamp.
 */
export function PortfolioStrip({ entry }: Props) {
  const stage = entry.stage;
  const isComplete = stage === "complete";
  const isAlert = stage === "alert";
  const edgeClass = isComplete ? "bg-verify" : isAlert ? "bg-warn" : stage === "probe" ? "bg-signal" : "bg-verify";

  return (
    <div className="strip mb-2 grid grid-cols-[8px_200px_1fr_170px_190px] overflow-hidden rounded border border-grid bg-panel transition hover:-translate-y-px hover:shadow-[0_3px_10px_rgba(23,38,46,.08)] max-[900px]:grid-cols-[8px_1fr]">
      <div className={`edge ${edgeClass} max-[900px]:row-span-4`} />

      <div className="cell border-l border-dashed border-grid p-3 px-4 max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:border-t">
        <div className="font-mono-heading text-[13.5px] font-semibold">{entry.project}</div>
        <div className="font-mono-heading mt-[3px] text-[10.5px] text-stale">{entry.path}</div>
        {isComplete ? (
          <div className="mt-1 flex items-center gap-1">
            <span className="font-mono-heading rounded-[2px] border border-verify bg-verify px-[7px] py-px text-[10px] text-white">
              complete
            </span>
          </div>
        ) : (
          <div className="mt-1 flex items-center gap-1">
            {STAGES.map((s) => (
              <span
                key={s}
                className={
                  "font-mono-heading rounded-[2px] border px-[7px] py-px text-[10px] " +
                  (s === stage
                    ? "border-ink bg-ink text-white"
                    : "border-grid text-stale")
                }
              >
                {s}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="cell border-l border-dashed border-grid p-3 px-4 max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:border-t">
        <div className="text-[12px] text-ink-soft">
          owner <b className="font-medium text-ink">{entry.owner}</b> · priority{" "}
          <b className="font-medium text-ink">{entry.priority}</b>
        </div>
        <div className="mt-1 text-[12px] text-ink-soft">{entry.status}</div>
        <div className="font-mono-heading mt-[5px] text-[10px] text-stale">
          evidence {entry.evidence.source} · {relativeTime(entry.evidence.mtime)}
        </div>
      </div>

      <div className="cell border-l border-dashed border-grid p-3 px-4 max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:border-t">
        <div className="text-[12px] text-ink-soft">
          evaluator{" "}
          {entry.evaluator === "n/a" ? (
            <Badge tone="mute">n/a</Badge>
          ) : (
            <Badge tone="ok">{entry.evaluator}</Badge>
          )}
        </div>
      </div>

      <div className="cell border-l border-dashed border-grid p-3 px-4 text-[12px] max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:border-t">
        <span className="font-mono-heading block text-[10px] text-stale">NEXT ACTION</span>
        {stripInlineMarkdown(entry.next_action)}
      </div>
    </div>
  );
}
