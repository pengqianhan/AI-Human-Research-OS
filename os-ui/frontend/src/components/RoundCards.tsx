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
        <div key={r.id} className="rc card-flat px-4 py-3">
          <div className="font-mono-heading text-[11px] text-muted">
            {r.artifacts.join(" · ") || r.id}
          </div>
          <div className="my-0.5 font-serif text-[20px] font-medium">
            {r.valid ? (
              <>
                {r.score ?? "—"} <small className="font-sans text-[11px] font-normal text-accent">valid ✓</small>
              </>
            ) : (
              <span className="text-muted">
                invalid{" "}
                <small className="font-sans text-[11px] font-normal">
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
                  className="font-mono-heading rounded-[5px] bg-mute-soft px-2 py-0.5 text-[11px] text-ink2"
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
