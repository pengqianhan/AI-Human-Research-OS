import type { EvaluationContract, Round } from "../types";

interface Props {
  rounds: Round[];
  evaluation: EvaluationContract;
}

const VIEW_W = 860;
const VIEW_H = 250;
const PAD_L = 60;
const PAD_R = 40;
const PAD_TOP = 40;
const PAD_BOTTOM = 40;

interface PlotPoint {
  round: Round;
  x: number;
  y: number;
}

/**
 * The signature "round score track" (DESIGN.md §6, signature element ②).
 *
 * Non-empty branch: plots each round as a node connected by a polyline in
 * score order; rounds sharing the same numeric prefix before a letter
 * suffix (e.g. "R3a"/"R3b"/"R3c") are treated as a parallel fork off the
 * last single-line round and drawn as branch lines instead of chained into
 * the main line. Dashed reference lines are drawn for evaluation.target and
 * evaluation.best_known when present. Invalid rounds (valid === false) are
 * drawn as smaller gray "dead" points.
 *
 * Empty branch: when rounds is [], renders the honest empty state — no
 * fabricated example numbers, per DESIGN.md's data-honesty rule. Real round
 * data depends on circle_packing landing runs/ (M2); this component must
 * still render correctly today via the dev fixture in RoundTrack.fixture.ts.
 */
export function RoundTrack({ rounds, evaluation }: Props) {
  if (rounds.length === 0) {
    return (
      <div className="track-wrap rounded border border-grid bg-panel p-[18px]">
        <p className="text-[13px] text-stale">
          No round data yet. Round data will appear after circle_packing M2 lands.
        </p>
      </div>
    );
  }

  const validScores = rounds.filter((r) => r.score !== null).map((r) => r.score as number);
  const targetNum = typeof evaluation.target === "number" ? evaluation.target : null;
  const bestKnownNum = typeof evaluation.best_known === "number" ? evaluation.best_known : null;

  const allNums = [...validScores, targetNum, bestKnownNum].filter(
    (n): n is number => n !== null,
  );
  const minScore = allNums.length > 0 ? Math.min(...allNums) : 0;
  const maxScore = allNums.length > 0 ? Math.max(...allNums) : 1;
  const scoreRange = maxScore - minScore || 1;

  function yFor(score: number): number {
    // Higher score = higher on the chart (smaller y), matching the mockup's
    // ascending-climb visual.
    const t = (score - minScore) / scoreRange;
    return PAD_TOP + (1 - t) * (VIEW_H - PAD_TOP - PAD_BOTTOM);
  }

  // Split rounds into "main line" (single-threaded rounds) vs "fork"
  // (rounds sharing a base id, e.g. R3a/R3b/R3c off R3's parent).
  const mainRounds: Round[] = [];
  const forkGroups = new Map<string, Round[]>();
  for (const r of rounds) {
    const forkMatch = /^(.*\d)([a-z])$/.exec(r.id);
    if (forkMatch) {
      const base = forkMatch[1] as string;
      const group = forkGroups.get(base) ?? [];
      group.push(r);
      forkGroups.set(base, group);
    } else {
      mainRounds.push(r);
    }
  }

  const plotW = VIEW_W - PAD_L - PAD_R;
  const mainCount = mainRounds.length + (forkGroups.size > 0 ? 1 : 0);
  const step = mainCount > 1 ? plotW / (mainCount - 1) : 0;

  const mainPoints: PlotPoint[] = mainRounds.map((r, i) => ({
    round: r,
    x: PAD_L + step * i,
    y: yFor(r.score ?? minScore),
  }));

  const lastMainX = mainPoints.length > 0 ? (mainPoints[mainPoints.length - 1] as PlotPoint).x : PAD_L;
  const lastMainY = mainPoints.length > 0 ? (mainPoints[mainPoints.length - 1] as PlotPoint).y : yFor(minScore);

  const forkEntries = [...forkGroups.entries()];
  const forkX = lastMainX + step;
  const forkPoints: PlotPoint[] = forkEntries.flatMap(([, group]) =>
    group.map((r, gi) => {
      const spread = 70;
      const centerOffset = (gi - (group.length - 1) / 2) * spread;
      return {
        round: r,
        x: forkX,
        y: yFor(r.score ?? minScore) + (r.valid ? 0 : centerOffset * 0), // keep y from score; x fixed
      };
    }),
  );

  const bestInFork = forkPoints.reduce<PlotPoint | null>((best, p) => {
    if (!p.round.valid || p.round.score === null) return best;
    if (best === null || (p.round.score ?? -Infinity) > (best.round.score ?? -Infinity)) return p;
    return best;
  }, null);

  const polylinePoints = mainPoints.map((p) => `${p.x},${p.y}`).join(" ");

  return (
    <div className="track-wrap rounded border border-grid bg-panel p-[18px]">
      <svg
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`Round score track: score trend from ${rounds[0]?.id ?? ""} to ${rounds[rounds.length - 1]?.id ?? ""}`}
        className="block h-auto w-full"
      >
        {bestKnownNum !== null && (
          <>
            <line
              x1={PAD_L - 20}
              y1={yFor(bestKnownNum)}
              x2={VIEW_W - PAD_R + 20}
              y2={yFor(bestKnownNum)}
              stroke="var(--stale)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />
            <text x={PAD_L - 18} y={yFor(bestKnownNum) - 6} className="text-[10px]" fill="var(--stale)">
              Best known {bestKnownNum}
              {evaluation.source ? `(source: ${evaluation.source})` : ""}
            </text>
          </>
        )}
        {targetNum !== null && (
          <>
            <line
              x1={PAD_L - 20}
              y1={yFor(targetNum)}
              x2={VIEW_W - PAD_R + 20}
              y2={yFor(targetNum)}
              stroke="var(--signal)"
              strokeWidth={1}
              strokeDasharray="6 4"
            />
            <text x={PAD_L - 14} y={yFor(targetNum) - 5} className="text-[11px]" fill="var(--signal)">
              Target {targetNum}
            </text>
          </>
        )}

        {mainPoints.length > 1 && (
          <polyline points={polylinePoints} stroke="var(--ink)" strokeWidth={1.6} fill="none" />
        )}

        {forkPoints.map((p, idx) => (
          <line
            key={`branch-${idx}`}
            x1={lastMainX}
            y1={lastMainY}
            x2={p.x}
            y2={p.y}
            stroke={p.round === bestInFork?.round ? "var(--verify)" : "var(--stale)"}
            strokeWidth={p.round === bestInFork?.round ? 1.6 : 1.2}
            strokeDasharray={p.round === bestInFork?.round ? undefined : "3 3"}
          />
        ))}

        {mainPoints.map((p, idx) => (
          <circle
            key={`main-pt-${idx}`}
            cx={p.x}
            cy={p.y}
            r={5}
            fill="var(--panel)"
            stroke={p.round.valid ? "var(--ink)" : "var(--stale)"}
            strokeWidth={1.6}
          />
        ))}
        {forkPoints.map((p, idx) => (
          <circle
            key={`fork-pt-${idx}`}
            cx={p.x}
            cy={p.y}
            r={p.round === bestInFork?.round ? 6 : p.round.valid ? 5 : 4}
            fill={
              p.round === bestInFork?.round
                ? "var(--verify)"
                : !p.round.valid
                  ? "var(--panel)"
                  : "var(--panel)"
            }
            stroke={p.round === bestInFork?.round ? "var(--verify)" : p.round.valid ? "var(--ink)" : "var(--stale)"}
            strokeWidth={1.6}
          />
        ))}

        {mainPoints.map((p, idx) => (
          <text
            key={`main-lab-${idx}`}
            x={p.x - 14}
            y={p.y + 22}
            className="font-mono-heading text-[11px]"
            fill="var(--ink)"
          >
            {p.round.id} {p.round.score !== null ? `· ${p.round.score}` : ""}
          </text>
        ))}
        {forkPoints.map((p, idx) => (
          <text
            key={`fork-lab-${idx}`}
            x={p.x + 14}
            y={p.y + (p.round === bestInFork?.round ? -8 : 5)}
            className="font-mono-heading text-[11px]"
            fill={p.round === bestInFork?.round ? "var(--verify)" : "var(--stale)"}
          >
            {p.round.id} {p.round.valid ? (p.round.score !== null ? `· ${p.round.score}` : "") : `· invalid${p.round.note ? ` (${p.round.note})` : ""}`}
            {p.round === bestInFork?.round ? " ★" : ""}
          </text>
        ))}
      </svg>
    </div>
  );
}
