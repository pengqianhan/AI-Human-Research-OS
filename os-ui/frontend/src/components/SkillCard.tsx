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
      className="skill card-flat flex flex-col gap-2 px-[18px] py-4 text-left transition hover:-translate-y-0.5 hover:shadow-sh3"
    >
      <span className="top flex items-start justify-between gap-2">
        <span className="break-all font-serif text-[16.5px] font-medium leading-tight text-ink">{skill.name}</span>
        <SyncBadge sync={skill.sync} />
      </span>
      <span className="desc line-clamp-2 flex-1 font-serif text-[14px] leading-snug text-ink2">{skill.description}</span>
      <span className="foot flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-mute-soft px-2 py-[2px] text-[11px] text-ink2">
          {skill.collection}
        </span>
        <span className="rounded-full bg-mute-soft px-2 py-[2px] text-[11px] text-muted">
          {skill.license ?? "unknown (see upstream)"}
        </span>
        {skill.hasScripts && (
          <span className="rounded-full bg-warn-soft px-2 py-[2px] text-[11px] text-warn">
            has scripts/ · inspect first
          </span>
        )}
      </span>
    </button>
  );
}
