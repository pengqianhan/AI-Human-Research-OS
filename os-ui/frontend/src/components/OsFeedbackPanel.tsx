import type { OsFeedbackEntry } from "../types";
import { Badge } from "./Badge";

interface Props {
  entries: OsFeedbackEntry[];
}

function severityTone(sev: string): "ok" | "warn" | "signal" | "mute" {
  switch (sev) {
    case "high":
      return "signal";
    case "medium":
      return "warn";
    case "low":
      return "mute";
    case "none":
      return "ok";
    default:
      return "mute";
  }
}

function severityLabel(sev: string): string {
  switch (sev) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    case "none":
      return "无";
    default:
      return sev;
  }
}

/** OS Feedback table: date / mechanism / expected-vs-actual / severity. Empty state when no entries yet. */
export function OsFeedbackPanel({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="panel rounded border border-grid bg-panel p-4 px-[18px] text-[12.5px] text-stale">
        暂无 OS Feedback 记录 — 每回合应在 PROJECT_MEMORY.md 的 OS Feedback 区记一条(或显式记"无")。
      </div>
    );
  }

  return (
    <div className="panel rounded border border-grid bg-panel p-4 px-[18px]">
      <table className="fb-table w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className="font-mono-heading border-b border-grid px-2.5 py-1.5 text-left text-[10.5px] font-medium text-stale">
              日期
            </th>
            <th className="font-mono-heading border-b border-grid px-2.5 py-1.5 text-left text-[10.5px] font-medium text-stale">
              机制
            </th>
            <th className="font-mono-heading border-b border-grid px-2.5 py-1.5 text-left text-[10.5px] font-medium text-stale">
              期望 vs 实际
            </th>
            <th className="font-mono-heading border-b border-grid px-2.5 py-1.5 text-left text-[10.5px] font-medium text-stale">
              严重度
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, idx) => (
            <tr key={idx}>
              <td className="font-mono-heading whitespace-nowrap border-b border-dashed border-grid px-2.5 py-2 align-top text-[11px] text-stale">
                {e.date ?? "—"}
              </td>
              <td className="border-b border-dashed border-grid px-2.5 py-2 align-top">
                {e.mechanism || "—"}
              </td>
              <td className="border-b border-dashed border-grid px-2.5 py-2 align-top">
                {e.expected_vs_actual}
              </td>
              <td className="border-b border-dashed border-grid px-2.5 py-2 align-top">
                <Badge tone={severityTone(e.severity)}>{severityLabel(e.severity)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
