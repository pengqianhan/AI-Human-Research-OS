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
      <div className="text-[13px] text-muted">
        No OS Feedback records yet. Each round should add one PROJECT_MEMORY.md OS Feedback entry, or explicitly record none.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="fb-table w-full border-collapse text-[13px]">
        <thead>
          <tr>
            <th className="label border-b border-line2 px-2.5 py-1.5 text-left">
              Date
            </th>
            <th className="label border-b border-line2 px-2.5 py-1.5 text-left">
              Mechanism
            </th>
            <th className="label border-b border-line2 px-2.5 py-1.5 text-left">
              Expected vs Actual
            </th>
            <th className="label border-b border-line2 px-2.5 py-1.5 text-left">
              Severity
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e, idx) => (
            <tr key={idx}>
              <td className="whitespace-nowrap border-b border-line px-2.5 py-2 align-top text-[11.5px] tabular-nums text-muted">
                {e.date ?? "—"}
              </td>
              <td className="border-b border-line px-2.5 py-2 align-top">
                {e.mechanism || "—"}
              </td>
              <td className="border-b border-line px-2.5 py-2 align-top">
                {e.expected_vs_actual}
              </td>
              <td className="border-b border-line px-2.5 py-2 align-top">
                <Badge tone={severityTone(e.severity)}>{severityLabel(e.severity)}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
