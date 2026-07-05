import type { GovernanceEntry } from "../types";

interface Props {
  entries: GovernanceEntry[];
}

/**
 * Collapsible governance log (<details>): shows the most recent 10 entries,
 * with null-dated entries (undated legacy decisions) sorted to the end
 * rather than treated as "newest".
 */
export function GovernancePanel({ entries }: Props) {
  const sorted = [...entries].sort((a, b) => {
    if (a.date === null && b.date === null) return 0;
    if (a.date === null) return 1;
    if (b.date === null) return -1;
    return b.date.localeCompare(a.date);
  });
  const shown = sorted.slice(0, 10);

  return (
    <details className="gov mt-4 rounded border border-grid bg-panel">
      <summary className="font-mono-heading cursor-pointer px-[18px] py-[11px] text-[12px] text-ink-soft [details[open]_&]:border-b [details[open]_&]:border-grid">
        Governance Log — recent decisions (HANDOFF.md Decisions)
      </summary>
      <div className="gov-in px-[18px] py-3 text-[12.5px]">
        {shown.length === 0 ? (
          <p className="text-stale">No governance records yet.</p>
        ) : (
          <table className="w-full border-collapse">
            <tbody>
              {shown.map((g, idx) => (
                <tr key={idx}>
                  <td className="font-mono-heading whitespace-nowrap border-b border-dashed border-grid py-1.5 pr-2.5 align-top text-[11px] text-stale">
                    {g.date ?? "date unknown"}
                  </td>
                  <td className="border-b border-dashed border-grid py-1.5 pr-2.5 align-top">
                    {g.decision}
                    <span className="font-mono-heading ml-2 text-[10px] text-stale">
                      ({g.source})
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </details>
  );
}
