import { useEffect, useState } from "react";
import type { Meta, Policy } from "../types";
import { formatSnapshotTime, minutesSince } from "../lib/format";
import { LIVE } from "../lib/mode";

const STALE_THRESHOLD_MINUTES = 10;

// Set at build time by the Pages workflow, so the public site links to the
// repository it was built from; unset builds show no link.
const REPO_URL = import.meta.env.VITE_REPO_URL;

// Octicons mark-github (MIT), 16px grid.
const githubMark = (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" className="h-[17px] w-[17px]">
    <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z" />
  </svg>
);

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
  // A published snapshot is as old as its last deploy by design; only the
  // live desktop, which should track the repository, can go stale.
  const isStale = LIVE && ageMinutes !== null && ageMinutes > STALE_THRESHOLD_MINUTES;

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
        <small className="ml-2 hidden font-normal text-ink-soft sm:inline">
          {LIVE ? "Read-only desktop" : "Public snapshot · view only"}
        </small>
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
          title="Research policy agent_led_research (source: memory/MEMORY.md)"
        >
          agent-led <b className="text-signal">{policy.agent_led_research}</b>
        </span>

        {REPO_URL && (
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Source on GitHub"
            title="Source on GitHub"
            className="flex h-[26px] w-[26px] items-center justify-center rounded-full text-ink-soft transition-colors hover:bg-grid hover:text-ink"
          >
            {githubMark}
          </a>
        )}
      </span>
    </div>
  );
}
