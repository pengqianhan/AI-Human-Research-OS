/**
 * Opening a document, one at a time, each in a PDF.js worker of its own
 * (os-ui/PLUGINS.md, S6b; its review). Opening a document closes the one
 * before; a closed document's worker is terminated once PDF.js has let it go,
 * or after RELEASE_GRACE_MS if the worker no longer answers, and nothing waits
 * for that. An open that takes longer than OPEN_BUDGET_MS (the worker not
 * starting, or not answering) ends with "timeout" and its worker terminated,
 * never an endless "Loading". No DOM and no PDF.js here: the worker, the
 * document, and the clock come in as arguments, so `npm test` runs it with
 * stand-ins.
 */

/** How long a worker may take to start and open a document (a 32 MB file of 300,000 pages opens in about 1 s; the read channel serves at most 32 MiB). */
export const OPEN_BUDGET_MS = 20_000;
/** How long a closed document's worker gets to let PDF.js finish with it before it is terminated. */
export const RELEASE_GRACE_MS = 2_000;

/** What opener.ts needs of a worker: only to be able to end it. */
export interface WorkerLike {
  terminate(): void;
}

/** A loading document, as PDF.js's loading task gives it, and the PDF.js handle on its worker. */
export interface Made<Doc> {
  task: { promise: Promise<Doc>; destroy(): Promise<void> };
  pdfWorker: { destroy(): void };
}

export interface Clock {
  set(fn: () => void, ms: number): unknown;
  clear(handle: unknown): void;
}

const realClock: Clock = {
  set: (fn, ms) => setTimeout(fn, ms),
  clear: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type Opened<Doc> =
  | { kind: "open"; doc: Doc; generation: number }
  /** Another open, or close(), came first: nothing to show from this one. */
  | { kind: "stale" }
  | { kind: "timeout"; stage: "start" | "open" }
  | { kind: "failed"; stage: "start" | "open"; error: unknown };

interface Live {
  generation: number;
  closed: boolean;
  worker: WorkerLike | null;
  made: Made<unknown> | null;
  stop: () => void;
}

export class Opener<Doc> {
  #generation = 0;
  #live: Live | null = null;
  readonly #start: () => Promise<WorkerLike>;
  readonly #clock: Clock;

  constructor(start: () => Promise<WorkerLike>, clock: Clock = realClock) {
    this.#start = start;
    this.#clock = clock;
  }

  /** Whether `generation` is the document open now (or opening). */
  isCurrent(generation: number): boolean {
    return this.#live !== null && this.#live.generation === generation;
  }

  /**
   * Closes the document before, starts a worker, and opens a document on it
   * with `make`, all within OPEN_BUDGET_MS. Never rejects.
   */
  async open(make: (worker: WorkerLike) => Made<Doc>): Promise<Opened<Doc>> {
    this.close();
    let stop = () => {};
    const stopped = new Promise<"closed">((resolve) => (stop = () => resolve("closed")));
    const live: Live = { generation: ++this.#generation, closed: false, worker: null, made: null, stop };
    this.#live = live;
    let timer: unknown;
    const expired = new Promise<"timeout">((resolve) => (timer = this.#clock.set(() => resolve("timeout"), OPEN_BUDGET_MS)));
    try {
      const starting = this.#start();
      // A worker that starts after this open was closed, or gave up, is ended at once.
      starting.then(
        (worker) => {
          if (live.closed) worker.terminate();
          else live.worker = worker;
        },
        () => {},
      );
      const started = await Promise.race([starting.then((worker) => ({ worker }), (error: unknown) => ({ error })), stopped, expired]);
      if (started === "closed") return { kind: "stale" };
      if (started === "timeout") {
        this.#end(live);
        return { kind: "timeout", stage: "start" };
      }
      if ("error" in started) {
        this.#end(live);
        return { kind: "failed", stage: "start", error: started.error };
      }
      let made: Made<Doc>;
      try {
        made = make(started.worker);
      } catch (error) {
        this.#end(live);
        return { kind: "failed", stage: "open", error };
      }
      live.made = made as Made<unknown>;
      made.task.promise.catch(() => {});
      const opened = await Promise.race([made.task.promise.then((doc) => ({ doc }), (error: unknown) => ({ error })), stopped, expired]);
      if (opened === "closed") return { kind: "stale" };
      if (opened === "timeout") {
        this.#end(live);
        return { kind: "timeout", stage: "open" };
      }
      if ("error" in opened) {
        this.#end(live);
        return { kind: "failed", stage: "open", error: opened.error };
      }
      return { kind: "open", doc: opened.doc, generation: live.generation };
    } finally {
      this.#clock.clear(timer);
    }
  }

  /** Closes the document open now, if any; its worker ends without anyone waiting for it. */
  close(): void {
    if (this.#live !== null) this.#end(this.#live);
  }

  #end(live: Live): void {
    if (live.closed) return;
    live.closed = true;
    if (this.#live === live) this.#live = null;
    live.stop();
    const { made } = live;
    let ended = false;
    let grace: unknown = null;
    const kill = () => {
      if (ended) return;
      ended = true;
      if (grace !== null) this.#clock.clear(grace);
      try {
        made?.pdfWorker.destroy();
      } catch {
        // already destroyed
      }
      live.worker?.terminate();
    };
    if (made === null) {
      kill();
      return;
    }
    grace = this.#clock.set(kill, RELEASE_GRACE_MS);
    made.task.destroy().then(kill, kill);
  }
}
