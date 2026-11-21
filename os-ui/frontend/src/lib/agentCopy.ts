/**
 * What an empty conversation says before the first message: the agent's
 * intro and three example requests. One place for both conversations, so the
 * new layout and the retired desktop windows say the same thing.
 */

export const ROOT_INTRO =
  "Talk to the root agent. Each message runs one turn at the repository root, on your own login; it reads AGENTS.md and hands project work to project agents through os-harness.";

export const ROOT_EXAMPLES = [
  "What is the state of the portfolio?",
  "Have nanochat_cpu rerun the vocabulary probe with 8,192 tokens.",
  "How is the nanochat_cpu run going?",
];

export function projectIntro(name: string): string {
  return `Talk to this project's agent directly. Each message runs one turn inside projects-folder/${name}/, on your own login. Runs the root agent dispatched here appear in the list too, and can be continued with your feedback.`;
}

export const PROJECT_EXAMPLES = [
  "Summarize the current state of this project from PROJECT_MEMORY.md.",
  "Run the validation commands in Code/README.md and report the results.",
  "Add a Progress Log bullet for what you just did.",
];
