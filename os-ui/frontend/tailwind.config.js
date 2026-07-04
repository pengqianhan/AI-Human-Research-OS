/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "var(--paper)",
        panel: "var(--panel)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        grid: "var(--grid)",
        signal: "var(--signal)",
        verify: "var(--verify)",
        warn: "var(--warn)",
        stale: "var(--stale)",
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "ui-monospace", "SF Mono", "Menlo", "monospace"],
        sans: ["IBM Plex Sans", "PingFang SC", "Noto Sans SC", "-apple-system", "sans-serif"],
      },
    },
  },
  plugins: [],
};
