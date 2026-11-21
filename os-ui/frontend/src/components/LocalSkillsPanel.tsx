import type { LocalSkill } from "../types";
import { Badge } from "./Badge";

interface Props {
  skills: LocalSkill[];
}

/** Project-local skills list (.claude/skills or .agents/skills inside the project). Empty state when none exist. */
export function LocalSkillsPanel({ skills }: Props) {
  if (skills.length === 0) {
    return <p className="text-[13px] text-muted">This project has no local skills.</p>;
  }

  return (
    <ul className="feed">
      {skills.map((s) => (
        <li
          key={s.name}
          className="flex gap-3 border-b border-line py-2 text-[13px] last:border-b-0"
        >
          <span className="label whitespace-nowrap pt-px">local</span>
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
