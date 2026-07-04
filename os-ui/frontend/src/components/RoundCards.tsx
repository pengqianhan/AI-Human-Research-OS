import type { Round } from "../types";

interface Props {
  rounds: Round[];
}

/** Per-round detail cards below the track: id/artifacts, score, validity, tasks. */
export function RoundCards({ rounds }: Props) {
  if (rounds.length === 0) return null;

  return (
    <div className="round-cards mt-3.5 grid grid-cols-3 gap-2.5 max-[900px]:grid-cols-1">
      {rounds.map((r) => (
        <div key={r.id} className="rc rounded border border-grid bg-panel p-3 px-3.5">
          <div className="font-mono-heading text-[11px] text-stale">
            {r.artifacts.join(" · ") || r.id}
          </div>
          <div className="font-mono-heading my-0.5 text-[19px] font-semibold">
            {r.valid ? (
              <>
                {r.score ?? "—"} <small className="text-[11px] font-normal text-stale">valid ✓</small>
              </>
            ) : (
              <span className="text-stale">
                无效{" "}
                <small className="text-[11px] font-normal">
                  {r.note ?? "invalid"}
                </small>
              </span>
            )}
          </div>
          {r.tasks.length > 0 && (
            <div className="taskchips mt-2 flex flex-col gap-1">
              {r.tasks.map((t) => (
                <span
                  key={t}
                  className="font-mono-heading rounded-[2px] border border-dashed border-grid px-2 py-0.5 text-[10.5px] text-ink-soft"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
