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
          <Badge tone="warn">未登记</Badge>
        </div>
      </div>

      <div className="cell border-l border-dashed border-grid p-3 px-4 max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:border-t">
        <div className="text-[12px] text-ink-soft">在磁盘上发现,但不在 portfolio 表中</div>
        <div className="font-mono-heading mt-[5px] text-[10px] text-stale">
          无 PROJECT_MEMORY.md · 无 portfolio 行
        </div>
      </div>

      <div className="cell border-l border-dashed border-grid p-3 px-4 max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:border-t">
        <Badge tone="signal">待人类决策</Badge>
      </div>

      <div className="cell border-l border-dashed border-grid p-3 px-4 text-[12px] max-[900px]:col-start-2 max-[900px]:border-l-0 max-[900px]:border-t">
        <span className="font-mono-heading block text-[10px] text-stale">GOAL.md M0</span>
        登记入表,或声明为豁免区
      </div>
    </div>
  );
}
