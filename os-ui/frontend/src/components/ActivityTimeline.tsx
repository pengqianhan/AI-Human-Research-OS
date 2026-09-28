import type { ActivityEntry } from "../types";
import { relativeTime, stripInlineMarkdown } from "../lib/format";
import { Chip } from "./Chip";
import { Disclosure } from "./Disclosure";

interface Props {
  entries: ActivityEntry[];
}

/**
 * Recent activity as a timeline: a rail with one dot per event, colored by
 * where it came from (git commit or a project's progress log), a relative
 * time, and the event's first line. The full text and its source open on
 * click.
 */
export function ActivityTimeline({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="panel rounded border border-grid bg-panel p-4 px-[18px] text-[12.5px] text-stale">
        No activity yet.
      </div>
    );
  }

  return (
    <div className="panel rounded border border-grid bg-panel px-[18px] py-3">
      <div className="mb-2 flex gap-2">
        <Chip tone="ink" dot>
          git
        </Chip>
        <Chip tone="signal" dot>
          progress log
        </Chip>
      </div>
      <ol className="relative ml-1 border-l border-grid">
        {entries.map((e, idx) => {
          const isGit = e.source.startsWith("git");
          const text = stripInlineMarkdown(e.what);
          const firstLine = text.split(/\r?\n/)[0] ?? "";
          return (
            <li key={idx} className="relative py-1 pl-4">
              <span
                aria-hidden="true"
                className={
                  "absolute -left-[5px] top-[11px] h-[9px] w-[9px] rounded-full border-2 border-panel " +
                  (isGit ? "bg-ink" : "bg-signal")
                }
              />
              <Disclosure
                summary={
                  <>
                    <time className="font-mono-heading shrink-0 text-[11px] text-stale">{relativeTime(e.when)}</time>
                    <span className="min-w-0 flex-1 truncate text-[12.5px] text-ink">{firstLine}</span>
                  </>
                }
              >
                <p className="whitespace-pre-wrap break-words text-[12px] text-ink-soft">{text}</p>
                <div className="font-mono-heading mt-1 text-[10.5px] text-stale">{e.source}</div>
              </Disclosure>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
