import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * The files and folders os-ui/generator/generate.py reads, as paths to stat.
 * A folder's mtime changes when an entry is added, removed, or renamed, so
 * folders stand in for their listings. Deliberately narrow: a project's code,
 * virtual environments, and caches are never visited, however large.
 */
export function inputPaths(root: string): string[] {
  const paths: string[] = [];
  const add = (...parts: string[]) => paths.push(join(root, ...parts));
  const dirs = (...parts: string[]): string[] => {
    try {
      return readdirSync(join(root, ...parts), { withFileTypes: true })
        .filter((e) => e.isDirectory() || e.isSymbolicLink())
        .map((e) => e.name)
        .sort();
    } catch {
      return [];
    }
  };

  add("HANDOFF.md");
  add("memory");
  add("memory", "MEMORY.md");
  // New commits feed Recent Activity.
  add(".git", "HEAD");
  add(".git", "logs", "HEAD");

  add("projects-folder");
  for (const project of dirs("projects-folder")) {
    add("projects-folder", project);
    add("projects-folder", project, "PROJECT_MEMORY.md");
    add("projects-folder", project, "Code", "runs");
    for (const round of dirs("projects-folder", project, "Code", "runs")) {
      add("projects-folder", project, "Code", "runs", round, "result.json");
    }
    add("projects-folder", project, "Evaluations");
    for (const agentDir of [".claude", ".agents"]) {
      add("projects-folder", project, agentDir, "skills");
      for (const skill of dirs("projects-folder", project, agentDir, "skills")) {
        add("projects-folder", project, agentDir, "skills", skill);
      }
    }
  }

  add("research-skills-hub");
  for (const collection of dirs("research-skills-hub")) {
    add("research-skills-hub", collection);
    for (const skill of dirs("research-skills-hub", collection)) {
      add("research-skills-hub", collection, skill, "SKILL.md");
    }
  }

  for (const agentDir of [".claude", ".agents"]) {
    add(agentDir, "skills");
    add(agentDir, "skills", ".disabled");
    for (const skill of dirs(agentDir, "skills")) {
      add(agentDir, "skills", skill);
      add(agentDir, "skills", skill, "SKILL.md");
      add(agentDir, "skills", skill, "SKILL.md.disabled");
    }
  }
  return paths;
}

export type StatFn = (path: string) => { mtimeMs: number; size: number } | null;

const statOrNull: StatFn = (path) => {
  try {
    const s = statSync(path);
    return { mtimeMs: s.mtimeMs, size: s.size };
  } catch {
    return null;
  }
};

/** One string that changes whenever any input is added, removed, or modified. */
export function signature(paths: string[], stat: StatFn = statOrNull): string {
  return paths
    .map((path) => {
      const s = stat(path);
      return s === null ? `${path}|-` : `${path}|${s.mtimeMs}|${s.size}`;
    })
    .join("\n");
}

/**
 * Polls the generator's inputs and calls `onChange` after they change. A poll
 * costs a few hundred stat calls, on every platform alike, and holds no
 * watcher; changes closer together than one interval cost one run.
 */
export class InputPoller {
  private last: string | null = null;
  private timer: NodeJS.Timeout | undefined;

  private readonly root: string;
  private readonly onChange: () => void;
  private readonly read: (root: string) => string;

  constructor(root: string, onChange: () => void, read: (root: string) => string = (r) => signature(inputPaths(r))) {
    this.root = root;
    this.onChange = onChange;
    this.read = read;
  }

  /** Compare with the previous poll; the first poll only records a baseline. */
  check(): boolean {
    const now = this.read(this.root);
    const changed = this.last !== null && now !== this.last;
    this.last = now;
    if (changed) this.onChange();
    return changed;
  }

  start(intervalMs = 4000): void {
    this.check();
    this.timer = setInterval(() => this.check(), intervalMs);
  }

  stop(): void {
    clearInterval(this.timer);
  }
}
