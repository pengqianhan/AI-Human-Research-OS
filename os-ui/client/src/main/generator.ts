import type { SnapshotEvent } from "../../../frontend/src/lib/desktop.ts";
import type { RunResult } from "../../../frontend/server/types.ts";

export const GENERATOR_TIMEOUT_MS = 120_000;

/**
 * Serializes runs of os-ui/generator/generate.py. A request while a run is in
 * progress schedules exactly one more run after it, so a burst of file
 * changes costs at most two runs and the last one sees the latest files.
 */
export class Generator {
  private running: Promise<SnapshotEvent> | null = null;
  private queued: Promise<SnapshotEvent> | null = null;
  private lastEvent: SnapshotEvent | null = null;

  private readonly runOnce: () => Promise<RunResult>;
  private readonly onEvent: (event: SnapshotEvent) => void;
  private readonly now: () => number;

  constructor(runOnce: () => Promise<RunResult>, onEvent: (event: SnapshotEvent) => void = () => {}, now: () => number = Date.now) {
    this.runOnce = runOnce;
    this.onEvent = onEvent;
    this.now = now;
  }

  get last(): SnapshotEvent | null {
    return this.lastEvent;
  }

  /** Resolves with the outcome of a run that started after this call. */
  request(): Promise<SnapshotEvent> {
    if (this.running === null) {
      this.running = this.start();
      return this.running;
    }
    if (this.queued === null) {
      this.queued = this.running.then(() => {
        this.queued = null;
        this.running = this.start();
        return this.running;
      });
    }
    return this.queued;
  }

  private async start(): Promise<SnapshotEvent> {
    const started = this.now();
    this.emit({ state: "running", at: new Date(started).toISOString(), error: null, durationMs: null });
    let event: SnapshotEvent;
    try {
      const result = await this.runOnce();
      const finished = this.now();
      event =
        result.code === 0
          ? { state: "ok", at: new Date(finished).toISOString(), error: null, durationMs: finished - started }
          : {
              state: "error",
              at: new Date(finished).toISOString(),
              error: (result.stderr || result.stdout || `generator exited ${result.code}`).trim().slice(-1500),
              durationMs: finished - started,
            };
    } catch (error) {
      const finished = this.now();
      event = {
        state: "error",
        at: new Date(finished).toISOString(),
        error: String((error as Error).message ?? error),
        durationMs: finished - started,
      };
    }
    this.emit(event);
    if (this.queued === null) this.running = null;
    return event;
  }

  private emit(event: SnapshotEvent) {
    this.lastEvent = event;
    this.onEvent(event);
  }
}
