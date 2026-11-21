import { useOsState } from "./useOsState";
import { StateMissing } from "./components/StateMissing";
import { Shell } from "./shell/Shell";

// The desktop-OS shell of 2026-07-05 (src/desktop/) is superseded by the
// layout in src/shell/ but kept for now; to go back, render
// `<Desktop state={status.state} />` from "./desktop/Desktop" instead of Shell.

export function App() {
  const status = useOsState();

  if (status.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[13px] text-muted">Loading…</p>
      </div>
    );
  }

  if (status.kind === "error") {
    return <StateMissing />;
  }

  return <Shell state={status.state} />;
}
