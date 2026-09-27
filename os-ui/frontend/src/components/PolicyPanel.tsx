import type { Policy } from "../types";
import { Chip } from "./Chip";

interface Props {
  policy: Policy;
}

/** Research policy as two chips; the full policy text is on hover. */
export function PolicyPanel({ policy }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Chip tone="signal" dot title="agent_led_research (memory/MEMORY.md · Research Policy)">
        agent-led {policy.agent_led_research}
      </Chip>
      <Chip tone="ok" dot title={`parallelism: ${policy.parallelism}`}>
        parallelism
      </Chip>
    </div>
  );
}
