import { useEffect, useState } from "react";
import type { Meta, Policy } from "../types";
import { formatSnapshotTime, minutesSince } from "../lib/format";

const STALE_THRESHOLD_MINUTES = 10;

interface Props {
  meta: Meta;
  policy: Policy;
}

/**
 * Persistent snapshot card in the page header: generated_at + schema_version
 * + repo_head. This is DESIGN.md §4's "honest staleness over lying realtime"
 * made concrete — if generated_at is more than 10 minutes old, the card
 * turns amber and says so, rather than silently pretending to be live.
 */
export function SnapshotHeader({ meta, policy }: Props) {
  const [, forceTick] = useState(0);

  // Re-evaluate staleness once a minute so the amber warning appears even if
  // no new state.json arrives (e.g. generator not running).
  useEffect(() => {
    const id = window.setInterval(() => forceTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const ageMinutes = minutesSince(meta.generated_at);
  const isStale = ageMinutes !== null && ageMinutes > STALE_THRESHOLD_MINUTES;

  return (
    <div className="head-in mx-auto flex max-w-[1080px] flex-wrap items-baseline gap-[18px] px-6 py-3.5">
      <span className="font-mono-heading text-[15px] font-semibold tracking-[.04em]">
        AI-HUMAN RESEARCH OS{" "}
        <small className="font-normal text-ink-soft">/ 只读仪表盘</small>
      </span>

      <span
        className={
          "font-mono-heading rounded-[3px] border px-2.5 py-[3px] text-[11.5px] " +
          (isStale
            ? "border-warn bg-[#F7EEDB] text-warn"
            : "border-grid bg-panel text-ink-soft")
        }
        title={meta.generated_at}
      >
        快照 <b className={isStale ? "font-semibold text-warn" : "font-semibold text-verify"}>
          {formatSnapshotTime(meta.generated_at)}
        </b>{" "}
        · schema v{meta.schema_version} · HEAD {meta.repo_head}
        {isStale ? " · 快照可能过时" : ""}
      </span>

      <span className="font-mono-heading ml-auto rounded-[3px] border border-ink bg-panel px-2.5 py-[3px] text-[11.5px]">
        agent_led_research: <b className="text-signal">{policy.agent_led_research}</b>
      </span>
    </div>
  );
}
