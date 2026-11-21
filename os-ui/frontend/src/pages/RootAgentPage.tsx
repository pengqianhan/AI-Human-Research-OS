import { AgentChat } from "../components/AgentChat";
import { ROOT_EXAMPLES, ROOT_INTRO } from "../lib/agentCopy";

/** The root agent (GOAL.md H2): the human's single point of contact, which
 *  reads AGENTS.md at the repository root and hands project work to project
 *  agents through project-dispatch. Each project's own agent is reached from
 *  the Projects window instead. Used by the retired desktop shell
 *  (src/desktop/); the new layout shows the root agent on Home
 *  (components/RootAgentBar.tsx). */
export function RootAgentPage() {
  return <AgentChat cwd="" heading="Root Agent" intro={ROOT_INTRO} examples={ROOT_EXAMPLES} />;
}
