import { useRef } from "react";
import type { PointerEvent as ReactPointerEvent, ReactNode } from "react";

/** Geometry + stacking info for one open window (owned by Desktop.tsx). */
export interface WinGeom {
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  zoomed: boolean;
}

interface Props {
  title: string;
  icon: ReactNode;
  win: WinGeom;
  focused: boolean;
  onFocus: () => void;
  onClose: () => void;
  onMinimize: () => void;
  onZoom: () => void;
  onMove: (x: number, y: number) => void;
  onResize: (w: number, h: number) => void;
  /** True for content that manages its own edge-to-edge layout and scrolling
   *  (currently the Paper Wiki iframe) — skips the default padded, scrolling
   *  content area every other app uses. */
  fill?: boolean;
  children: ReactNode;
}

const MIN_W = 380;
const MIN_H = 260;
/** How many px of a window must stay visible when dragged toward an edge. */
const EDGE_KEEP = 100;

/**
 * macOS-style window chrome: traffic lights + centered title in the title
 * bar, draggable by the title bar, resizable from the bottom-right corner.
 * Purely presentational + gesture handling — all state lives in Desktop.tsx.
 */
export function WindowFrame({
  title,
  icon,
  win,
  focused,
  onFocus,
  onClose,
  onMinimize,
  onZoom,
  onMove,
  onResize,
  fill = false,
  children,
}: Props) {
  // Gesture bookkeeping: where the pointer went down and the window's
  // geometry at that moment. Refs (not state) — no re-render per pixel needed
  // beyond the onMove/onResize calls themselves.
  const dragStart = useRef<{ px: number; py: number; x: number; y: number } | null>(null);
  const resizeStart = useRef<{ px: number; py: number; w: number; h: number } | null>(null);
  const frameRef = useRef<HTMLElement | null>(null);

  /** Size of the desktop area (this window's positioned ancestor) — the
   *  coordinate space that win.x / win.y live in. */
  function deskSize() {
    const desk = frameRef.current?.offsetParent as HTMLElement | null;
    return {
      w: desk?.clientWidth ?? window.innerWidth,
      h: desk?.clientHeight ?? window.innerHeight,
    };
  }

  function clampX(x: number) {
    return Math.min(Math.max(x, EDGE_KEEP - win.w), deskSize().w - EDGE_KEEP);
  }
  function clampY(y: number) {
    return Math.min(Math.max(y, 0), deskSize().h - EDGE_KEEP);
  }

  function onTitlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    // Left button only; clicks on the traffic lights must not start a drag.
    if (e.button !== 0 || win.zoomed) return;
    if ((e.target as HTMLElement).closest("button")) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { px: e.clientX, py: e.clientY, x: win.x, y: win.y };
  }
  function onTitlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const s = dragStart.current;
    if (s === null) return;
    onMove(clampX(s.x + e.clientX - s.px), clampY(s.y + e.clientY - s.py));
  }
  function onTitlePointerUp() {
    dragStart.current = null;
  }

  function onHandlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || win.zoomed) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    resizeStart.current = { px: e.clientX, py: e.clientY, w: win.w, h: win.h };
  }
  function onHandlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const s = resizeStart.current;
    if (s === null) return;
    const desk = deskSize();
    onResize(
      Math.min(Math.max(s.w + e.clientX - s.px, MIN_W), desk.w),
      Math.min(Math.max(s.h + e.clientY - s.py, MIN_H), desk.h),
    );
  }
  function onHandlePointerUp() {
    resizeStart.current = null;
  }

  // Zoomed = fill the desktop area, leaving room for the dock at the bottom.
  const style = win.zoomed
    ? { left: 16, top: 10, right: 16, bottom: 88, zIndex: win.z }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z };

  return (
    <section
      ref={frameRef}
      role="region"
      aria-label={title}
      style={style}
      onPointerDown={onFocus}
      onFocusCapture={onFocus}
      className={
        "window-shadow absolute flex flex-col overflow-hidden rounded-xl border bg-panel " +
        (focused ? "border-grid" : "border-grid opacity-[.97]")
      }
    >
      <div
        onPointerDown={onTitlePointerDown}
        onPointerMove={onTitlePointerMove}
        onPointerUp={onTitlePointerUp}
        onPointerCancel={onTitlePointerUp}
        onDoubleClick={onZoom}
        className={
          "relative flex h-10 shrink-0 cursor-grab touch-none select-none items-center border-b border-grid px-3 " +
          (focused ? "bg-paper" : "bg-panel")
        }
      >
        {/* Traffic lights, tied to the OS palette: red closes, amber sets
            aside (minimize), teal zooms — same semantics as the badges. */}
        {/* 20px hit targets around 12px visual dots */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            aria-label={`Close ${title}`}
            title="Close"
            onClick={onClose}
            className="flex h-5 w-5 items-center justify-center rounded-full hover:brightness-90"
          >
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-danger" />
          </button>
          <button
            type="button"
            aria-label={`Minimize ${title}`}
            title="Minimize"
            onClick={onMinimize}
            className="flex h-5 w-5 items-center justify-center rounded-full hover:brightness-90"
          >
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-warn" />
          </button>
          <button
            type="button"
            aria-label={`Zoom ${title}`}
            title="Zoom"
            onClick={onZoom}
            className="flex h-5 w-5 items-center justify-center rounded-full hover:brightness-90"
          >
            <span aria-hidden="true" className="h-3 w-3 rounded-full bg-verify" />
          </button>
        </div>

        <span
          className={
            "font-mono-heading pointer-events-none absolute left-1/2 flex -translate-x-1/2 items-center gap-1.5 text-[12.5px] font-semibold " +
            (focused ? "text-ink" : "text-ink-soft")
          }
        >
          <span aria-hidden="true" className="[&>svg]:h-[15px] [&>svg]:w-[15px]">
            {icon}
          </span>
          {title}
        </span>
      </div>

      {/* tabIndex lets keyboard users focus the scroll area and use arrows */}
      <div
        tabIndex={0}
        className={"min-h-0 flex-1 " + (fill ? "overflow-hidden" : "overflow-y-auto px-5 py-4")}
      >
        {children}
      </div>

      {!win.zoomed && (
        <div
          onPointerDown={onHandlePointerDown}
          onPointerMove={onHandlePointerMove}
          onPointerUp={onHandlePointerUp}
          onPointerCancel={onHandlePointerUp}
          aria-hidden="true"
          className="absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none"
        >
          {/* two short diagonal ticks, like the mockup's resize affordance */}
          <svg viewBox="0 0 20 20" className="h-full w-full text-stale">
            <path d="M17 9 L9 17 M17 14 L14 17" stroke="currentColor" strokeWidth="1.5" fill="none" />
          </svg>
        </div>
      )}
    </section>
  );
}
