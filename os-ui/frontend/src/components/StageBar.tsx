const STAGES = ["scout", "probe", "develop", "writing", "complete"] as const;

interface Props {
  stage: string | null;
  /** "sm": a thin bar with the current stage as its only label (portfolio
   *  cards). "lg": a thick bar with every stage named (project header). */
  size?: "sm" | "lg";
}

/**
 * The project lifecycle as a segmented bar: passed stages in verify green,
 * the current one in signal orange, the rest in grid grey. A stage outside
 * the lifecycle (paused, archived, not filled in) shows an all-grey bar with
 * its name, never a guessed position.
 */
export function StageBar({ stage, size = "sm" }: Props) {
  const idx = STAGES.indexOf((stage ?? "") as (typeof STAGES)[number]);
  const label = stage ?? "not filled in";
  const height = size === "lg" ? "h-2.5" : "h-1.5";

  return (
    <div role="img" aria-label={`stage: ${label}`} title={`stage: ${label}`}>
      <div className="flex gap-[3px]">
        {STAGES.map((s, i) => {
          const fill =
            idx < 0
              ? "bg-grid"
              : i < idx
                ? "bg-verify"
                : i === idx
                  ? s === "complete"
                    ? "bg-verify"
                    : "bg-signal"
                  : "bg-grid";
          return <span key={s} className={`${height} flex-1 rounded-[2px] ${fill}`} />;
        })}
      </div>
      {size === "lg" ? (
        <div className="mt-1 flex gap-[3px]">
          {STAGES.map((s, i) => (
            <span
              key={s}
              className={
                "font-mono-heading flex-1 text-center text-[10px] " +
                (i === idx ? "font-semibold text-ink" : "text-stale")
              }
            >
              {s}
            </span>
          ))}
        </div>
      ) : null}
      {size === "sm" || idx < 0 ? (
        <div className={"font-mono-heading mt-[3px] text-[10px] " + (idx < 0 ? "text-stale" : "text-ink-soft")}>
          {label}
        </div>
      ) : null}
    </div>
  );
}
