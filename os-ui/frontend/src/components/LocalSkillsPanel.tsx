import type { LocalSkill } from "../types";
import { Badge } from "./Badge";

interface Props {
  skills: LocalSkill[];
}

/** Project-local skills list (.claude/skills or .agents/skills inside the project). Empty state when none exist. */
export function LocalSkillsPanel({ skills }: Props) {
  if (skills.length === 0) {
    return <p className="text-[12.5px] text-stale">This project has no local skills.</p>;
  }

  return (
    <ul className="feed">
      {skills.map((s) => (
        <li
          key={s.name}
          className="flex gap-3 border-b border-dashed border-grid py-[7px] text-[12.5px] last:border-b-0"
        >
          <time className="font-mono-heading whitespace-nowrap pt-px text-[11px] text-stale">local</time>
          <span className="font-mono-heading flex-1">{s.name}</span>
          {s.promotion_candidate === true && (
            <span className="ml-auto">
              <Badge tone="warn">promotion candidate</Badge>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
