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

  // Kept deliberately sparse: name on the left, two quiet status chips on
  // the right. Details (full timestamp, schema, HEAD, policy key) live in
  // hover tooltips instead of crowding the bar.
  return (
    <div className="head-in flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-[7px]">
      <span
        className="font-mono-heading whitespace-nowrap text-[13px] font-semibold tracking-[.04em]"
        title="Read-only desktop: the file system is the source of truth; this UI executes nothing"
      >
        AI-HUMAN RESEARCH OS
        <small className="ml-2 hidden font-normal text-ink-soft sm:inline">Read-only desktop</small>
      </span>

      <span className="ml-auto flex items-center gap-2">
        <span
          className={
            "font-mono-heading flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-[3px] text-[11.5px] " +
            (isStale ? "border-warn text-warn" : "border-grid text-ink-soft")
          }
          title={`Generated at ${meta.generated_at} · schema v${meta.schema_version} · HEAD ${meta.repo_head}`}
        >
          <span
            aria-hidden="true"
            className={"h-[7px] w-[7px] rounded-full " + (isStale ? "bg-warn" : "bg-verify")}
          />
          Snapshot {formatSnapshotTime(meta.generated_at)}
          {isStale && <b className="font-semibold">stale</b>}
        </span>

        <span
          className="font-mono-heading whitespace-nowrap rounded-full border border-grid px-2.5 py-[3px] text-[11.5px] text-ink-soft"
          title="Research policy agent_led_research (source: Memory/MEMORY.md)"
        >
          agent-led <b className="text-signal">{policy.agent_led_research}</b>
        </span>
      </span>
    </div>
  );
}
