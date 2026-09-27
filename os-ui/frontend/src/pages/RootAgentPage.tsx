import { AgentChat } from "../components/AgentChat";

/** The root agent (GOAL.md H2): the human's single point of contact, which
 *  reads AGENTS.md at the repository root and hands project work to project
 *  agents through project-dispatch. Each project's own agent is reached from
 *  the Projects window instead. */
export function RootAgentPage() {
  return (
    <AgentChat
      cwd=""
      heading="Root Agent"
      intro="Talk to the root agent. Each message runs one turn at the repository root, on your own login; it reads AGENTS.md and hands project work to project agents through os-harness."
      examples={[
        "What is the state of the portfolio?",
        "Have nanochat_cpu rerun the vocabulary probe with 8,192 tokens.",
        "How is the Example_Project run going?",
      ]}
    />
  );
}
