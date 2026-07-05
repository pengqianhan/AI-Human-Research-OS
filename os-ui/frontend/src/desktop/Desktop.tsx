import { useEffect, useRef, useState } from "react";
import type { OsState } from "../types";
import { SnapshotHeader } from "../components/SnapshotHeader";
import { APPS } from "./apps";
import type { AppId } from "./apps";
import { Dock } from "./Dock";
import { WindowFrame } from "./WindowFrame";
import type { WinGeom } from "./WindowFrame";

interface Win extends WinGeom {
  minimized: boolean;
}

type WinMap = Partial<Record<AppId, Win>>;

/** Initial geometry for a newly opened window: centered in the desktop area,
 *  then cascaded by how many windows are already open, clamped to fit. */
function spawnWin(id: AppId, nth: number, z: number, desk: { w: number; h: number }): Win {
  const app = APPS.find((a) => a.id === id);
  // Floor the area just enough to survive an unmeasured 0×0 container (an
  // embedding iframe racing layout): sizes must never go negative/invalid.
  // Keep the floor below real phone viewports so those still fit on screen.
  const vw = Math.max(desk.w, 320);
  const vh = Math.max(desk.h, 320);
  const w = Math.min(app?.defaultW ?? 900, vw - 24);
  const h = Math.min(app?.defaultH ?? 600, vh - 96);
  return {
    x: Math.max(12, (vw - w) / 2 + nth * 30),
    y: Math.max(10, (vh - h) / 2 - 30 + nth * 26),
    w,
    h,
    z,
    zoomed: false,
    minimized: false,
  };
}

/**
 * The desktop shell: menu bar (persistent snapshot card) on top, draggable
 * windows in the middle, dock at the bottom. Which windows are open — and
 * where — lives here; everything inside a window is the same read-only page
 * content as before.
 */
export function Desktop({ state }: { state: OsState }) {
  const zTop = useRef(10);
  const deskRef = useRef<HTMLDivElement | null>(null);
  const [wins, setWins] = useState<WinMap>({});

  // Open Dashboard once the desktop area actually has a size. Embedding iframes
  // can mount us at 0×0 and only get real dimensions a few frames later, so
  // retry per animation frame instead of trusting the first layout.
  // openApp is idempotent, so StrictMode's double effect run is harmless.
  useEffect(() => {
    let raf = 0;
    const tryOpen = () => {
      const el = deskRef.current;
      if (el !== null && el.clientWidth > 0 && el.clientHeight > 0) {
        openApp("dash");
      } else {
        raf = requestAnimationFrame(tryOpen);
      }
    };
    tryOpen();
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the browser window shrinks, pull every window back into reach so
  // none is stranded fully off the desktop.
  useEffect(() => {
    function onWindowResize() {
      const el = deskRef.current;
      if (el === null || el.clientWidth === 0) return;
      const maxX = el.clientWidth - 100;
      const maxY = el.clientHeight - 100;
      setWins((m) => {
        const next: WinMap = {};
        for (const [id, w] of Object.entries(m) as [AppId, Win][]) {
          next[id] = { ...w, x: Math.min(w.x, maxX), y: Math.min(w.y, Math.max(maxY, 0)) };
        }
        return next;
      });
    }
    window.addEventListener("resize", onWindowResize);
    return () => window.removeEventListener("resize", onWindowResize);
  }, []);

  function patch(id: AppId, p: Partial<Win>) {
    setWins((m) => (m[id] === undefined ? m : { ...m, [id]: { ...m[id]!, ...p } }));
  }

  function openApp(id: AppId) {
    zTop.current += 1;
    const desk = {
      w: deskRef.current?.clientWidth ?? window.innerWidth,
      h: deskRef.current?.clientHeight ?? window.innerHeight,
    };
    setWins((m) => {
      const existing = m[id];
      if (existing !== undefined) {
        return { ...m, [id]: { ...existing, minimized: false, z: zTop.current } };
      }
      return { ...m, [id]: spawnWin(id, Object.keys(m).length, zTop.current, desk) };
    });
  }

  function focusApp(id: AppId) {
    const win = wins[id];
    if (win === undefined || win.z === zTop.current) return;
    zTop.current += 1;
    patch(id, { z: zTop.current });
  }

  function closeApp(id: AppId) {
    setWins((m) => {
      const next = { ...m };
      delete next[id];
      return next;
    });
    focusDockButton(id);
  }

  function minimizeApp(id: AppId) {
    patch(id, { minimized: true });
    focusDockButton(id);
  }

  /** Closing/minimizing unmounts the window — and with it whatever element
   *  held keyboard focus. Hand focus to the app's dock icon so a keyboard
   *  user isn't silently dropped back to <body>. */
  function focusDockButton(id: AppId) {
    document.querySelector<HTMLElement>(`[data-dock-app="${id}"]`)?.focus();
  }

  const openApps = new Map(
    (Object.entries(wins) as [AppId, Win][]).map(([id, w]) => [id, { minimized: w.minimized }]),
  );

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <header className="shrink-0 border-b border-grid bg-paper-glass backdrop-blur">
        <SnapshotHeader meta={state.meta} policy={state.policy} />
      </header>

      {/* desktop area: the positioning context all windows live in */}
      <div ref={deskRef} className="relative min-h-0 flex-1">
          {APPS.map((app) => {
          const win = wins[app.id];
          if (win === undefined || win.minimized) return null;
          return (
            <WindowFrame
              key={app.id}
              title={app.title}
              icon={app.icon}
              win={win}
              focused={win.z === zTop.current}
              onFocus={() => focusApp(app.id)}
              onClose={() => closeApp(app.id)}
              onMinimize={() => minimizeApp(app.id)}
              onZoom={() => patch(app.id, { zoomed: !win.zoomed })}
              onMove={(x, y) => patch(app.id, { x, y })}
              onResize={(w, h) => patch(app.id, { w, h })}
            >
              {app.render(state)}
            </WindowFrame>
          );
        })}

        <Dock apps={APPS} openApps={openApps} onAppClick={openApp} />
      </div>
    </div>
  );
}
