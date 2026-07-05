import type { UnregisteredProject } from "../types";
import { Badge } from "./Badge";

interface Props {
  entry: UnregisteredProject;
}

/**
 * Amber warning strip for a project folder that exists on disk but has no
 * portfolio row / PROJECT_MEMORY.md — mirrors the mockup's Paper_VAE strip.
 * This is a "pending human decision" signal, not an error the UI can fix.
 */
export function UnregisteredStrip({ entry }: Props) {
  return (
    <div className="strip mb-2 grid grid-cols-[8px_200px_1fr_170px_190px] overflow-hidden rounded border border-grid bg-panel transition hover:-translate-y-px hover:shadow-[0_3px_10px_rgba(23,38,46,.08)] max-[900px]:grid-cols-[8px_1fr]">
      <div className="edge bg-warn max-[900px]:row-span-4" />

      <div className="cell border-l border-dashed border-grid p-3 px-4 max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:border-t">
        <div className="font-mono-heading text-[13.5px] font-semibold">{entry.name}</div>
        <div className="font-mono-heading mt-[3px] text-[10.5px] text-stale">{entry.path}</div>
        <div className="mt-1">
          <Badge tone="warn">unregistered</Badge>
        </div>
      </div>

      <div className="cell border-l border-dashed border-grid p-3 px-4 max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:border-t">
        <div className="text-[12px] text-ink-soft">Found on disk, but missing from the portfolio table</div>
        <div className="font-mono-heading mt-[5px] text-[10px] text-stale">
          No PROJECT_MEMORY.md · no portfolio row
        </div>
      </div>

      <div className="cell border-l border-dashed border-grid p-3 px-4 max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:border-t">
        <Badge tone="signal">needs human decision</Badge>
      </div>

      <div className="cell border-l border-dashed border-grid p-3 px-4 text-[12px] max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:border-t">
        <span className="font-mono-heading block text-[10px] text-stale">GOAL.md M0</span>
        Register it, or declare it an exempt zone
      </div>
    </div>
  );
}
