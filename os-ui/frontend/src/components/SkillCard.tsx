import type { DisplaySkill } from "../lib/skills";
import { SyncBadge } from "./SyncBadge";

interface Props {
  skill: DisplaySkill;
  onOpen: (trigger: HTMLButtonElement) => void;
}

/** One skill card in the Store grid: name, 2-line-clamped description, tags, sync badge. */
export function SkillCard({ skill, onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={(e) => onOpen(e.currentTarget)}
      className="skill flex flex-col gap-2 rounded border border-grid bg-panel p-3.5 px-4 text-left font-sans transition hover:-translate-y-0.5 hover:shadow-[0_4px_14px_rgba(23,38,46,.09)]"
    >
      <span className="top flex items-start justify-between gap-2">
        <span className="font-mono-heading break-all text-[13px] font-semibold">{skill.name}</span>
        <SyncBadge sync={skill.sync} />
      </span>
      <span className="desc line-clamp-2 flex-1 text-[12px] text-ink-soft">{skill.description}</span>
      <span className="foot flex flex-wrap items-center gap-1.5">
        <span className="font-mono-heading rounded-[2px] border border-grid px-[7px] py-px text-[10px] text-stale">
          {skill.collection}
        </span>
        <span className="font-mono-heading rounded-[2px] border border-grid px-[7px] py-px text-[10px] text-stale">
          {skill.license ?? "unknown(见上游)"}
        </span>
        {skill.hasScripts && (
          <span className="font-mono-heading rounded-[2px] border border-warn px-[7px] py-px text-[10px] text-warn">
            含 scripts/ · 装前浏览
          </span>
        )}
      </span>
    </button>
  );
}
