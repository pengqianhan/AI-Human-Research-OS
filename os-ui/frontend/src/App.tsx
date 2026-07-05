import { useOsState } from "./useOsState";
import { StateMissing } from "./components/StateMissing";
import { Desktop } from "./desktop/Desktop";

export function App() {
  const status = useOsState();

  if (status.kind === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="font-mono-heading text-[13px] text-stale">加载中…</p>
      </div>
    );
  }

  if (status.kind === "error") {
    return <StateMissing />;
  }

  return <Desktop state={status.state} />;
}
