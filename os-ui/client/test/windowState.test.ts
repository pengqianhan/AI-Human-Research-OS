import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_SIZE, restoreBounds } from "../src/main/windowState.ts";

const primary = { x: 0, y: 25, width: 1920, height: 1055 };
const second = { x: 1920, y: 0, width: 1280, height: 800 };

test("no saved bounds: default size, centred by the window manager", () => {
  assert.deepEqual(restoreBounds(null, [primary]), DEFAULT_SIZE);
});

test("saved bounds on a connected display are kept", () => {
  const saved = { x: 100, y: 100, width: 1200, height: 800, maximized: false };
  assert.deepEqual(restoreBounds(saved, [primary, second]), { x: 100, y: 100, width: 1200, height: 800 });
});

test("a window on a display that is gone is dropped to a default position", () => {
  const saved = { x: 4000, y: 100, width: 1200, height: 800, maximized: false };
  assert.deepEqual(restoreBounds(saved, [primary]), { width: 1200, height: 800 });
});

test("a window larger than its display is shrunk and pulled inside", () => {
  const saved = { x: 2000, y: -50, width: 3000, height: 2000, maximized: false };
  assert.deepEqual(restoreBounds(saved, [primary, second]), { x: 1920, y: 0, width: 1280, height: 800 });
});

test("a mostly off-screen window that still overlaps by 120 px is pulled back", () => {
  const saved = { x: 1800, y: 900, width: 1000, height: 700, maximized: false };
  const r = restoreBounds(saved, [primary]);
  assert.deepEqual(r, { x: 920, y: 380, width: 1000, height: 700 });
});

test("saved size without a position", () => {
  assert.deepEqual(restoreBounds({ x: null, y: null, width: 1000, height: 700, maximized: true }, [primary]), { width: 1000, height: 700 });
});

test("a small display never gets a window below its own size floor", () => {
  const small = { x: 0, y: 0, width: 800, height: 600 };
  assert.deepEqual(restoreBounds(null, [small]), { width: 800, height: 600 });
});
