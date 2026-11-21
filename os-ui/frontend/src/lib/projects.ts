import type { OsState, PortfolioEntry, Project } from "../types";
import { stripInlineMarkdown } from "./format";

/**
 * One project as Home and Projects show it: its portfolio row
 * (memory/MEMORY.md) joined by name with its folder's PROJECT_MEMORY.md
 * snapshot. Either side can be missing: a portfolio row whose folder has no
 * snapshot cannot be opened, and a registered folder missing from the
 * portfolio table still gets a card from its snapshot alone.
 */
export interface ProjectRow {
  name: string;
  path: string;
  entry: PortfolioEntry | null;
  project: Project | null;
  stage: string | null;
  priority: string | null;
  owner: string | null;
  status: string | null;
  nextAction: string | null;
  evaluator: string | null;
  hasEvaluator: boolean;
  question: string | null;
}

function plain(value: string | null | undefined): string | null {
  if (value === null || value === undefined || value.trim() === "") return null;
  return stripInlineMarkdown(value);
}

function evaluatorPresent(text: string | null): boolean {
  return text !== null && !/^(n\/a|none)\b/i.test(text);
}

export function projectRows(state: OsState): ProjectRow[] {
  const byName = new Map(state.projects.map((p) => [p.name, p]));
  const rows: ProjectRow[] = state.portfolio.map((entry) => {
    const project = byName.get(entry.project) ?? null;
    const evaluator = plain(entry.evaluator) ?? plain(project?.snapshot.evaluator_status);
    return {
      name: entry.project,
      path: entry.path.replace(/\/+$/, ""),
      entry,
      project,
      stage: entry.stage || project?.snapshot.stage || null,
      priority: entry.priority || project?.snapshot.priority || null,
      owner: entry.owner || project?.snapshot.owner || null,
      status: plain(entry.status),
      nextAction: plain(entry.next_action) ?? plain(project?.snapshot.next_action),
      evaluator,
      hasEvaluator: evaluatorPresent(evaluator),
      question: plain(project?.snapshot.current_question),
    };
  });
  const listed = new Set(rows.map((r) => r.name));
  for (const project of state.projects) {
    if (listed.has(project.name)) continue;
    const evaluator = plain(project.snapshot.evaluator_status);
    rows.push({
      name: project.name,
      path: `projects-folder/${project.name}`,
      entry: null,
      project,
      stage: project.snapshot.stage,
      priority: project.snapshot.priority,
      owner: project.snapshot.owner,
      status: null,
      nextAction: plain(project.snapshot.next_action),
      evaluator,
      hasEvaluator: evaluatorPresent(evaluator),
      question: plain(project.snapshot.current_question),
    });
  }
  return rows;
}
