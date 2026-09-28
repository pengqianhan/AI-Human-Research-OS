interface Props {
  value: number | string;
  label: string;
  tone?: "ok" | "warn" | "signal" | "mute";
  hint?: string;
}

const COLOR = {
  ok: "text-verify",
  warn: "text-warn",
  signal: "text-signal",
  mute: "text-ink",
};

/** One number and one word: how much of something a project has. */
export function StatTile({ value, label, tone = "mute", hint }: Props) {
  return (
    <div className="rounded border border-grid bg-panel px-3.5 py-2.5" title={hint}>
      <div className={"font-mono-heading text-[22px] font-semibold leading-none tabular-nums " + COLOR[tone]}>
        {value}
      </div>
      <div className="font-mono-heading mt-1 text-[10px] uppercase tracking-[.06em] text-stale">{label}</div>
    </div>
  );
}
