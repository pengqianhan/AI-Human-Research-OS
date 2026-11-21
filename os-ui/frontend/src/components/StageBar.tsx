const STAGES = ["scout", "probe", "develop", "writing", "complete"] as const;

interface Props {
  stage: string | null;
  /** "sm": a thin bar with the current stage as its only label (portfolio
   *  cards). "lg": a thick bar with every stage named (project header). */
  size?: "sm" | "lg";
}

/**
 * The project lifecycle as a segmented bar: passed stages in pale accent,
 * the current one in solid accent, the rest as faint lines. A stage outside
 * the lifecycle (paused, archived, not filled in) shows an all-faint bar with
 * its name, never a guessed position.
 */
export function StageBar({ stage, size = "sm" }: Props) {
  const idx = STAGES.indexOf((stage ?? "") as (typeof STAGES)[number]);
  const label = stage ?? "not filled in";
  const height = size === "lg" ? "h-2" : "h-1.5";

  return (
    <div role="img" aria-label={`stage: ${label}`} title={`stage: ${label}`}>
      <div className="flex gap-[3px]">
        {STAGES.map((s, i) => {
          const fill = idx < 0 ? "bg-line2" : i < idx ? "bg-accent-soft" : i === idx ? "bg-accent" : "bg-line2";
          return <span key={s} className={`${height} flex-1 rounded-full ${fill}`} />;
        })}
      </div>
      {size === "lg" ? (
        <div className="mt-1.5 flex gap-[3px]">
          {STAGES.map((s, i) => (
            <span key={s} className={"flex-1 text-center text-[11px] " + (i === idx ? "font-semibold text-accent-ink" : "text-muted")}>
              {s}
            </span>
          ))}
        </div>
      ) : null}
      {size === "sm" || idx < 0 ? (
        <div className={"mt-1 text-[11px] " + (idx < 0 ? "text-muted" : "text-ink2")}>{label}</div>
      ) : null}
    </div>
  );
}
