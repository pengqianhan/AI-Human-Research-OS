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
      return "high";
    case "medium":
      return "medium";
    case "low":
      return "low";
    case "none":
      return "none";
    default:
      return sev;
  }
}

/** OS Feedback table: date / mechanism / expected-vs-actual / severity. Empty state when no entries yet. */
export function OsFeedbackPanel({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <div className="panel rounded border border-grid bg-panel p-4 px-[18px] text-[12.5px] text-stale">
        No OS Feedback records yet. Each round should add one PROJECT_MEMORY.md OS Feedback entry, or explicitly record none.
      </div>
    );
  }

  return (
    <div className="panel rounded border border-grid bg-panel p-4 px-[18px]">
      <table className="fb-table w-full border-collapse text-[12.5px]">
        <thead>
          <tr>
            <th className="font-mono-heading border-b border-grid px-2.5 py-1.5 text-left text-[10.5px] font-medium text-stale">
              Date
            </th>
            <th className="font-mono-heading border-b border-grid px-2.5 py-1.5 text-left text-[10.5px] font-medium text-stale">
              Mechanism
            </th>
            <th className="font-mono-heading border-b border-grid px-2.5 py-1.5 text-left text-[10.5px] font-medium text-stale">
              Expected vs Actual
            </th>
            <th className="font-mono-heading border-b border-grid px-2.5 py-1.5 text-left text-[10.5px] font-medium text-stale">
              Severity
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
