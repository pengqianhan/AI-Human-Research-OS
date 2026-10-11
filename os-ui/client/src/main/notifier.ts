import { readdirSync, readFileSync, statSync } from "node:fs";
import { basename, join, resolve } from "node:path";

export interface TurnEnd {
  session: string;
  turn: number;
  ok: boolean;
  agent: string;
  cwd: string;
  /** First line of the result (or the error), clipped. */
  summary: string;
}

type Record_ = Record<string, unknown>;

/**
 * The last finished turn in an os-harness trace (header line, then records
 * stamped with `turn`). Unparsable lines — a record still being written — are
 * skipped, so a trace read mid-write is never an error.
 */
export function lastTurnEnd(session: string, text: string): TurnEnd | null {
  const records: Record_[] = [];
  for (const line of text.split("\n")) {
    if (line.trim() === "") continue;
    try {
      records.push(JSON.parse(line) as Record_);
    } catch {
      // partial line
    }
  }
  const meta = records[0];
  if (meta === undefined) return null;
  const events = records.slice(1);
  let prompts = 0;
  let last: { record: Record_; turn: number } | null = null;
  for (const record of events) {
    if (record.type === "prompt") prompts += 1;
    if (record.type === "done") last = { record, turn: typeof record.turn === "number" ? record.turn : prompts };
  }
  if (last === null) return null;
  const raw = String((last.record.ok ? last.record.result : last.record.error) ?? "").trim();
  const firstLine = raw.split(/\r?\n/).find((line) => line.trim() !== "") ?? "";
  return {
    session,
    turn: last.turn,
    ok: last.record.ok === true,
    agent: String(meta.agent ?? "agent"),
    cwd: String(meta.cwd ?? ""),
    summary: firstLine.length > 140 ? `${firstLine.slice(0, 137)}...` : firstLine,
  };
}

/** Notification text: where the turn ran (root agent or project) and how it ended. */
export function describeTurn(end: TurnEnd, workspace: string): { title: string; body: string } {
  const norm = (p: string) => resolve(p).replace(/[\\/]+$/, "").toLowerCase();
  const where = end.cwd === "" || norm(end.cwd) === norm(workspace) ? "Root agent" : basename(end.cwd);
  const agent = end.agent === "codex" ? "Codex" : end.agent === "claude" ? "Claude Code" : end.agent;
  const outcome = end.summary || (end.ok ? "done" : "failed");
  return {
    title: end.ok ? "Agent turn finished" : "Agent turn failed",
    body: `${where} · ${agent}: ${outcome}`,
  };
}

/**
 * Polls a sessions folder by modification time and reports each turn that
 * ends after `prime()`. Turns that had already ended are never reported.
 */
export class TurnWatcher {
  private readonly mtimes = new Map<string, number>();
  private readonly seen = new Set<string>();

  private readonly dir: string;
  private readonly onTurnEnd: (end: TurnEnd) => void;

  constructor(dir: string, onTurnEnd: (end: TurnEnd) => void) {
    this.dir = dir;
    this.onTurnEnd = onTurnEnd;
  }

  prime(): void {
    this.scan(false);
  }

  poll(): void {
    this.scan(true);
  }

  private scan(report: boolean): void {
    let names: string[];
    try {
      names = readdirSync(this.dir).filter((name) => name.endsWith(".jsonl"));
    } catch {
      return; // no sessions yet
    }
    for (const name of names) {
      const file = join(this.dir, name);
      let mtime: number;
      try {
        mtime = statSync(file).mtimeMs;
      } catch {
        continue;
      }
      if (this.mtimes.get(name) === mtime) continue;
      this.mtimes.set(name, mtime);
      let text: string;
      try {
        text = readFileSync(file, "utf8");
      } catch {
        continue;
      }
      const end = lastTurnEnd(name.slice(0, -".jsonl".length), text);
      if (end === null) continue;
      const key = `${end.session}:${end.turn}`;
      if (this.seen.has(key)) continue;
      this.seen.add(key);
      if (report) this.onTurnEnd(end);
    }
  }
}
