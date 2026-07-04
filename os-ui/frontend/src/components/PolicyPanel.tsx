import type { Policy } from "../types";
import { Badge } from "./Badge";

interface Props {
  policy: Policy;
}

/** Research strategy panel: agent_led_research + parallelism, per mockup. */
export function PolicyPanel({ policy }: Props) {
  return (
    <div className="panel rounded border border-grid bg-panel p-4 px-[18px]">
      <ul className="feed">
        <li className="flex gap-3 border-b border-dashed border-grid py-[7px] text-[12.5px]">
          <span className="font-mono-heading">agent_led_research</span>
          <span className="ml-auto">
            <Badge tone="signal">{policy.agent_led_research}</Badge>
          </span>
        </li>
        <li className="flex gap-3 py-[7px] text-[12.5px] last:border-b-0">
          <span>{policy.parallelism}</span>
          <span className="ml-auto">
            <Badge tone="ok">生效中</Badge>
          </span>
        </li>
      </ul>
    </div>
  );
}
