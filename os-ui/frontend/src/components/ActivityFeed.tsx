import type { ActivityEntry } from "../types";
import { relativeTime } from "../lib/format";

interface Props {
  entries: ActivityEntry[];
}

/** Recent activity stream: relative time + what + source, per mockup .feed. */
export function ActivityFeed({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="panel rounded border border-grid bg-panel p-4 px-[18px] text-[12.5px] text-stale">
        暂无活动记录。
      </div>
    );
  }

  return (
    <div className="panel rounded border border-grid bg-panel p-4 px-[18px]">
      <ul className="feed">
        {entries.map((e, idx) => (
          <li
            key={idx}
            className="flex gap-3 border-b border-dashed border-grid py-[7px] text-[12.5px] last:border-b-0"
          >
            <time className="font-mono-heading whitespace-nowrap pt-px text-[11px] text-stale">
              {relativeTime(e.when)}
            </time>
            <span className="flex-1">{e.what}</span>
            <span className="font-mono-heading ml-auto whitespace-nowrap text-[10.5px] text-stale">
              {e.source}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
