import type { WindowBounds } from "./settings.ts";

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export const DEFAULT_SIZE = { width: 1440, height: 900 };
export const MIN_SIZE = { width: 960, height: 640 };

/**
 * Saved bounds if they still land on a connected display (at least 120 px of
 * the window overlapping a work area), shrunk to fit that display; otherwise
 * a default size, centred by the window manager (x and y left undefined).
 */
export function restoreBounds(saved: WindowBounds | null, workAreas: Rect[]): { x?: number; y?: number; width: number; height: number } {
  const primary = workAreas[0];
  const fit = (size: { width: number; height: number }, area: Rect | undefined) =>
    area === undefined
      ? size
      : {
          width: Math.max(Math.min(size.width, area.width), Math.min(MIN_SIZE.width, area.width)),
          height: Math.max(Math.min(size.height, area.height), Math.min(MIN_SIZE.height, area.height)),
        };
  if (saved === null) return fit(DEFAULT_SIZE, primary);
  if (saved.x === null || saved.y === null) return fit(saved, primary);

  const { x, y } = saved;
  const area = workAreas.find((a) => {
    const overlapX = Math.min(x + saved.width, a.x + a.width) - Math.max(x, a.x);
    const overlapY = Math.min(y + saved.height, a.y + a.height) - Math.max(y, a.y);
    return overlapX >= 120 && overlapY >= 120;
  });
  if (area === undefined) return fit(saved, primary);
  const size = fit(saved, area);
  return {
    x: Math.min(Math.max(x, area.x), area.x + area.width - size.width),
    y: Math.min(Math.max(y, area.y), area.y + area.height - size.height),
    ...size,
  };
}
