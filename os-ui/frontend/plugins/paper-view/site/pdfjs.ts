/**
 * The vendored PDF.js (vendor/README.md), loaded at run time: its two files
 * ship as they are, so neither tsc, esbuild, nor Vite ever reads them, and the
 * page's own code knows PDF.js only through the few types below. The PDF is
 * untrusted (an agent or a stranger wrote the repository), so the document
 * options turn off everything that would run or fetch something for it.
 */

/** What the page uses of PDF.js 6.5.438's API. */
export interface PdfJs {
  version: string;
  GlobalWorkerOptions: { workerPort: Worker | null };
  getDocument(source: DocumentSource): LoadingTask;
  TextLayer: new (options: { textContentSource: ReadableStream; container: HTMLElement; viewport: Viewport }) => TextLayerTask;
}

export type DocumentSource = typeof DOCUMENT_OPTIONS & { data: Uint8Array };

export interface LoadingTask {
  promise: Promise<PdfDocument>;
  destroy(): Promise<void>;
}

export interface PdfDocument {
  numPages: number;
  getPage(pageNumber: number): Promise<PdfPage>;
  getOutline(): Promise<OutlineItem[] | null>;
  getDestination(id: string): Promise<unknown[] | null>;
  getPageIndex(ref: { num: number; gen: number }): Promise<number>;
}

export interface OutlineItem {
  title: unknown;
  dest: unknown;
  items?: OutlineItem[];
}

export interface PdfPage {
  getViewport(options: { scale: number }): Viewport;
  render(options: { canvasContext: CanvasRenderingContext2D; viewport: Viewport; transform: number[] | null }): RenderTask;
  streamTextContent(): ReadableStream;
}

export interface Viewport {
  width: number;
  height: number;
  scale: number;
  convertToPdfPoint(x: number, y: number): number[];
}

export interface RenderTask {
  promise: Promise<void>;
  cancel(): void;
}

export interface TextLayerTask {
  render(): Promise<void>;
  cancel(): void;
}

/**
 * Every `getDocument` option the page sets; `vendor.test.ts` checks that this
 * PDF.js reads each one. What is left at its default needs nothing: the bytes
 * come as `data`, so PDF.js fetches nothing itself, and no URL is given for
 * character maps, standard fonts, ICC profiles, or wasm (none is vendored).
 * PDF.js 6 has no `isEvalSupported` option: it never evaluates code
 * (`vendor.test.ts` checks the vendored files for `eval(` and `new Function`).
 * The PDF's own JavaScript, XFA scripts, attachments, and links are never run
 * or opened: the page loads no scripting sandbox, builds no annotation layer,
 * and asks for no attachment.
 */
export const DOCUMENT_OPTIONS = {
  /** XFA forms are not built (their HTML layer is not drawn either). */
  enableXfa: false,
  /** No WebAssembly: PostScript functions run as plain JavaScript, so the page's policy needs no 'wasm-unsafe-eval'. */
  useWasm: false,
  /**
   * Glyphs are drawn as paths on the canvas: no font from the PDF is handed to
   * Chromium's font engine, and none needs a font-src or data: URL.
   */
  disableFontFace: true,
  /** No local() lookups of the user's installed fonts for fonts the PDF does not embed. */
  useSystemFonts: false,
  /** The worker never fetches (no URLs are given anyway). */
  useWorkerFetch: false,
  /** Pages are drawn on the page's own thread: pdf.renderer.min.mjs, which draws in a second worker, is not vendored. */
  disableWorkerRendering: true,
  /** An image larger than this many pixels (8192 × 8192) is left out, so a hostile image cannot exhaust memory. */
  maxImageSize: 8192 * 8192,
  /** Warnings and errors only, in the page's console. */
  verbosity: 1,
} as const;

/** A vendored file's URL on this page's own origin (app://paper-view/vendor/...). */
const vendored = (file: string) => new URL(`./vendor/${file}`, location.href).href;

/** How long the worker may take to say it is ready. */
const WORKER_START_MS = 20_000;

/**
 * Starts PDF.js's worker as a module worker from this origin and waits for its
 * first message ("ready"). The page hands PDF.js this worker as its port, so
 * PDF.js never builds a worker of its own: no `blob:` wrapper, and no silent
 * fallback to parsing on the page's thread when the worker cannot start.
 */
function startWorker(url: string): Promise<Worker> {
  return new Promise((resolve, reject) => {
    let worker: Worker;
    try {
      worker = new Worker(url, { type: "module", name: "PDF.js" });
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
      return;
    }
    const waiting = new AbortController();
    const settle = (error: Error | null) => {
      waiting.abort();
      clearTimeout(timer);
      if (error === null) {
        resolve(worker);
        return;
      }
      worker.terminate();
      reject(error);
    };
    const timer = setTimeout(() => settle(new Error("the worker did not start")), WORKER_START_MS);
    worker.addEventListener("error", (event) => settle(new Error(event.message || "the worker failed to load")), { signal: waiting.signal });
    worker.addEventListener(
      "message",
      (event: MessageEvent) => settle((event.data as { action?: unknown } | null)?.action === "ready" ? null : new Error("the worker answered something other than ready")),
      { signal: waiting.signal },
    );
  });
}

let loading: Promise<PdfJs> | null = null;

/** PDF.js with its worker started, loaded once; a failure is not kept, so Try again loads it afresh. */
export function loadPdfJs(): Promise<PdfJs> {
  loading ??= (async () => {
    // A URL computed at run time: no bundler resolves or inlines it.
    const lib = (await import(vendored("pdf.min.mjs"))) as PdfJs;
    lib.GlobalWorkerOptions.workerPort = await startWorker(vendored("pdf.worker.min.mjs"));
    return lib;
  })();
  loading.catch(() => {
    loading = null;
  });
  return loading;
}
