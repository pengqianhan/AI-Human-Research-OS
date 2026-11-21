/** @type {import('tailwindcss').Config} */
// Tailwind names for the design tokens in src/index.css. Change a colour
// there, not here: every name below only points at a CSS variable.
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // mockup C tokens
        bg: "var(--bg)",
        side: "var(--side)",
        paper: "var(--paper)",
        card: "var(--card)",
        ink: "var(--ink)",
        ink2: "var(--ink2)",
        muted: "var(--muted)",
        faint: "var(--faint)",
        line: "var(--line)",
        line2: "var(--line2)",
        hover: "var(--hover)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        "accent-soft": "var(--accent-soft)",
        "accent-tint": "var(--accent-tint)",
        "on-accent": "var(--on-accent)",
        warn: "var(--warn)",
        "warn-soft": "var(--warn-soft)",
        signal: "var(--signal)",
        "signal-soft": "var(--signal-soft)",
        danger: "var(--danger)",
        "danger-soft": "var(--danger-soft)",
        "mute-soft": "var(--mute-soft)",
        bubble: "var(--bubble)",
        night: "var(--night)",
        "on-night": "var(--on-night)",
        // older names, kept so existing components restyle with the palette
        panel: "var(--panel)",
        "ink-soft": "var(--ink-soft)",
        grid: "var(--grid)",
        verify: "var(--verify)",
        stale: "var(--stale)",
        "paper-glass": "var(--paper-glass)",
        "panel-glass": "var(--panel-glass)",
      },
      fontFamily: {
        serif: ["var(--serif)"],
        sans: ["var(--sans)"],
        mono: ["var(--mono)"],
      },
      boxShadow: {
        sh1: "var(--sh1)",
        sh2: "var(--sh2)",
        sh3: "var(--sh3)",
      },
      borderRadius: {
        // `rounded` on boxes and buttons: mockup C's 9px, not Tailwind's 4px
        DEFAULT: "9px",
        card: "var(--r)",
      },
    },
  },
  plugins: [],
};
