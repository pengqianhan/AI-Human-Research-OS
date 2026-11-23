/**
 * The Assets view's image queue (os-ui/PLUGINS.md Part 3, §4.3): at most
 * QUEUE.loads images load at once, leaving most of the read channel's 16 open
 * files per origin for previews and Markdown reads. A card's image is wanted
 * when the card comes near the view, and the nearest in list order starts
 * first. A load the channel answered 503 (or that failed while the channel
 * answers 200, which a busy moment can also give) is tried once more after
 * QUEUE.retryMs; then the card shows "Try again". A load that takes longer
 * than QUEUE.timeoutMs is ended.
 *
 * Pure: the loader and the timer are the caller's (main.ts makes an <img>, the
 * tests a fake), so `npm test` runs it in Node. No state can stick: every
 * load frees its slot exactly once, when it ends, times out, or is cancelled
 * by reset(), whichever is first; an answer from before a reset() is dropped.
 */

export const QUEUE = {
  /** Image loads in flight at most. */
  loads: 4,
  /** Wait before the one retry of a busy load. */
  retryMs: 1000,
  /** A load that has not ended by then is cancelled and shown as failed. */
  timeoutMs: 30_000,
} as const;

/** How a load ended: drawn, or the channel's status for the file (0: the app could not be reached). */
export type LoadOutcome = { kind: "ok" } | { kind: "error"; status: number };

/** One load: it ends once, with `done`; `cancel` stops it (its `done` may then never settle). */
export interface Load {
  done: Promise<LoadOutcome>;
  cancel(): void;
}

/** What a card shows. `failed` carries the status of the last try, or "timeout". */
export type JobState = { state: "waiting" } | { state: "loading" } | { state: "retrying" } | { state: "loaded" } | { state: "failed"; status: number | "timeout" };

export interface QueueOptions {
  loads?: number;
  retryMs?: number;
  timeoutMs?: number;
  /** Runs `fn` after `ms`; returns how to cancel it. */
  later: (fn: () => void, ms: number) => () => void;
  /** Called on every change of a job's state, never for a job from before a reset(). */
  onChange: (key: string, state: JobState) => void;
}

interface Job {
  key: string;
  order: number;
  start: () => Load;
  tries: number;
  state: JobState;
  /** While loading: the load, and whether its slot has been freed. */
  load: Load | null;
  freed: boolean;
  /** A pending retry or time-out. */
  stopTimer: (() => void) | null;
}

export class ImageQueue {
  private readonly options: QueueOptions;
  private readonly loads: number;
  private readonly retryMs: number;
  private readonly timeoutMs: number;
  private jobs = new Map<string, Job>();
  private running = 0;

  constructor(options: QueueOptions) {
    this.options = options;
    this.loads = options.loads ?? QUEUE.loads;
    this.retryMs = options.retryMs ?? QUEUE.retryMs;
    this.timeoutMs = options.timeoutMs ?? QUEUE.timeoutMs;
  }

  /** Loads in flight. */
  get inFlight(): number {
    return this.running;
  }

  /** The state of `key`'s job, or null when nothing was asked for it. */
  stateOf(key: string): JobState | null {
    return this.jobs.get(key)?.state ?? null;
  }

  /**
   * Asks for `key`'s image (a card came near the view, or Show was
   * clicked); `order` places it among those waiting, lowest first. A job that
   * is waiting, loading, retrying, loaded, or failed is left as it is.
   */
  want(key: string, order: number, start: () => Load): void {
    const job = this.jobs.get(key);
    if (job !== undefined) {
      if (job.state.state === "waiting") job.order = Math.min(job.order, order);
      return;
    }
    this.jobs.set(key, { key, order, start, tries: 0, state: { state: "waiting" }, load: null, freed: true, stopTimer: null });
    this.options.onChange(key, { state: "waiting" });
    this.pump();
  }

  /** "Try again" on a failed card: it waits for a slot again, with its tries counted afresh. */
  retry(key: string): void {
    const job = this.jobs.get(key);
    if (job === undefined || job.state.state !== "failed") return;
    job.tries = 0;
    this.set(job, { state: "waiting" });
    this.pump();
  }

  /** Forgets `key`'s job (the panel's image of an item the user left): a load is cancelled and its slot freed; a later answer is dropped. */
  drop(key: string): void {
    const job = this.jobs.get(key);
    if (job === undefined) return;
    this.jobs.delete(key);
    this.stop(job);
    this.pump();
  }

  /** Reload, or the page leaving: every load is cancelled and its slot freed; answers that arrive later are dropped. */
  reset(): void {
    const old = this.jobs;
    this.jobs = new Map();
    for (const job of old.values()) this.stop(job);
  }

  /** Cancels a job's timer and load, freeing its slot. */
  private stop(job: Job): void {
    job.stopTimer?.();
    job.stopTimer = null;
    if (job.load !== null) {
      this.free(job);
      job.load.cancel();
      job.load = null;
    }
  }

  private set(job: Job, state: JobState): void {
    job.state = state;
    if (this.jobs.get(job.key) === job) this.options.onChange(job.key, state);
  }

  /** Frees `job`'s slot, once. */
  private free(job: Job): void {
    if (job.freed) return;
    job.freed = true;
    this.running--;
  }

  private pump(): void {
    while (this.running < this.loads) {
      let next: Job | null = null;
      for (const job of this.jobs.values()) if (job.state.state === "waiting" && (next === null || job.order < next.order)) next = job;
      if (next === null) return;
      this.begin(next);
    }
  }

  private begin(job: Job): void {
    job.tries++;
    job.freed = false;
    this.running++;
    this.set(job, { state: "loading" });
    let load: Load;
    try {
      load = job.start();
    } catch {
      load = { done: Promise.resolve({ kind: "error", status: 0 }), cancel() {} };
    }
    job.load = load;
    job.stopTimer = this.options.later(() => {
      if (job.load !== load) return;
      job.stopTimer = null;
      job.load = null;
      this.free(job);
      load.cancel();
      this.set(job, { state: "failed", status: "timeout" });
      this.pump();
    }, this.timeoutMs);
    load.done.then(
      (outcome) => this.end(job, load, outcome),
      () => this.end(job, load, { kind: "error", status: 0 }),
    );
  }

  private end(job: Job, load: Load, outcome: LoadOutcome): void {
    // Not this load any more: it timed out, or a reset() cancelled it; its slot is already free.
    if (job.load !== load) return;
    job.load = null;
    job.stopTimer?.();
    job.stopTimer = null;
    this.free(job);
    if (this.jobs.get(job.key) !== job) return;
    if (outcome.kind === "ok") this.set(job, { state: "loaded" });
    else if ((outcome.status === 503 || outcome.status === 200) && job.tries < 2) {
      // Busy, or failed while the file is there: once more, after a moment.
      this.set(job, { state: "retrying" });
      job.stopTimer = this.options.later(() => {
        job.stopTimer = null;
        if (this.jobs.get(job.key) !== job || job.state.state !== "retrying") return;
        this.set(job, { state: "waiting" });
        this.pump();
      }, this.retryMs);
    } else this.set(job, { state: "failed", status: outcome.status });
    this.pump();
  }
}
