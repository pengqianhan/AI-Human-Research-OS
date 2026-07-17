/**
 * Hand-written TypeScript types for os-ui state.json, schema v0.1.
 *
 * The frontend only knows about this schema — it has no awareness of the
 * Markdown files (memory/MEMORY.md, HANDOFF.md, PROJECT_MEMORY.md, ...) that
 * the Python generator reads to produce state.json. Fields that the
 * generator could not find in the source files are emitted as `null`; the
 * UI must render an honest empty state for those, never invent data.
 *
 * Keep this file in sync with os-ui/DESIGN.md §2 (schema v0.1 skeleton) and
 * with whatever additional fields os-ui/generator/generate.py actually
 * emits. Only ADD fields here as the schema grows — schema_version is
 * additive, old fields are never removed.
 */

// ── meta ──────────────────────────────────────────────────────────────────

export interface Meta {
  schema_version: string;
  /** ISO-8601 timestamp string, e.g. "2026-07-04T21:46:13+12:00". */
  generated_at: string;
  /** Short git commit hash of the repo HEAD at generation time. */
  repo_head: string;
}

// ── policy ────────────────────────────────────────────────────────────────

export type AgentLedResearchPolicy = "off" | "scout_only" | "full_gated";

export interface Policy {
  agent_led_research: AgentLedResearchPolicy | string;
  parallelism: string;
}

// ── portfolio ─────────────────────────────────────────────────────────────

/** Evidence provenance: where a displayed fact came from and how fresh it is. */
export interface Evidence {
  source: string;
  /** ISO-8601 timestamp, or null if unknown. */
  mtime: string | null;
}

export type ProjectStage = "scout" | "probe" | "develop" | "writing" | "complete" | string;

export interface PortfolioEntry {
  project: string;
  path: string;
  owner: string;
  stage: ProjectStage;
  priority: string;
  status: string;
  evaluator: string;
  next_action: string;
  evidence: Evidence;
}

// ── active_work ───────────────────────────────────────────────────────────

export interface ActiveWorkItem {
  /** May contain inline Markdown ([text](path), **bold**, ~~strike~~). */
  text: string;
  done: boolean;
}

export interface ActiveWorkSection {
  /** May contain inline Markdown ([text](path), **bold**, ~~strike~~). */
  title: string;
  items: ActiveWorkItem[];
  source: string;
}

// ── governance ────────────────────────────────────────────────────────────

export interface GovernanceEntry {
  /** ISO date string (YYYY-MM-DD), or null when the source row had no date. */
  date: string | null;
  decision: string;
  source: string;
}

// ── projects ──────────────────────────────────────────────────────────────

/**
 * Per-project Snapshot fields, field names per INSTRUCTION.md's convention.
 * Any field the generator could not find in PROJECT_MEMORY.md is null —
 * the UI must render "not filled in" rather than invent a value.
 */
export interface ProjectSnapshot {
  owner: string | null;
  origin: string | null;
  stage: string | null;
  priority: string | null;
  evaluator_status: string | null;
  current_question: string | null;
  next_action: string | null;
}

export interface EvaluationContract {
  target: number | string | null;
  best_known: number | string | null;
  source: string | null;
}

export interface RoundArtifact {
  path: string;
  label?: string;
}

export interface Round {
  id: string;
  score: number | null;
  valid: boolean;
  /** Free-form note, e.g. reason a round is invalid. */
  note?: string;
  artifacts: string[];
  tasks: string[];
}

export interface ProjectEvaluation {
  date: string | null;
  summary: string;
  source: string;
}

export interface OsFeedbackEntry {
  date: string | null;
  mechanism: string;
  expected_vs_actual: string;
  severity: "low" | "medium" | "high" | "none" | string;
}

export interface LocalSkill {
  name: string;
  /** Optional: whether this project-local skill is a candidate for promotion to the hub. */
  promotion_candidate: boolean | null;
}

export interface Project {
  name: string;
  snapshot: ProjectSnapshot;
  evaluation: EvaluationContract;
  rounds: Round[];
  evaluations: ProjectEvaluation[];
  os_feedback: OsFeedbackEntry[];
  local_skills: LocalSkill[];
}

// ── unregistered_projects ─────────────────────────────────────────────────

export interface UnregisteredProject {
  name: string;
  path: string;
}

// ── store ─────────────────────────────────────────────────────────────────

/**
 * Open map of install-target directory name -> whether the skill is present
 * there. New adapters (beyond .claude/skills and .agents/skills) can be
 * added by the generator with zero schema changes.
 */
export type InstalledMap = Record<string, boolean>;

export type SyncStatus =
  | "synced"
  | "drift"
  | "not_installed"
  | "installed_no_hub_source";

export interface StoreSkill {
  name: string;
  description: string;
  license: string;
  has_scripts: boolean;
  installed: InstalledMap;
  sync: SyncStatus;
}

export interface StoreCollection {
  name: string;
  skills: StoreSkill[];
}

/** Orphan skills: installed in .claude/.agents but with no hub source. */
export interface OrphanSkill {
  name: string;
  description: string;
  installed: InstalledMap;
  sync: SyncStatus;
}

export interface Store {
  collections: StoreCollection[];
  orphans: OrphanSkill[];
}

// ── activity ──────────────────────────────────────────────────────────────

export interface ActivityEntry {
  /** ISO-8601 timestamp, or a coarse string like "2026-06-17" for older entries. */
  when: string;
  what: string;
  source: string;
}

// ── agent_activity (reserved, v1 placeholder per DESIGN §4) ───────────────

export interface AgentActivityEntry {
  agent: string;
  expires_at: string;
  status: string;
}

// ── top-level state ───────────────────────────────────────────────────────

export interface OsState {
  meta: Meta;
  policy: Policy;
  portfolio: PortfolioEntry[];
  active_work: ActiveWorkSection[];
  governance: GovernanceEntry[];
  projects: Project[];
  unregistered_projects: UnregisteredProject[];
  store: Store;
  activity: ActivityEntry[];
  agent_activity: AgentActivityEntry[];
}
