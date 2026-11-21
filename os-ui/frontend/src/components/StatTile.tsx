interface Props {
  value: number | string;
  label: string;
  tone?: "ok" | "warn" | "signal" | "mute";
  hint?: string;
}

const COLOR = {
  ok: "text-accent",
  warn: "text-warn",
  signal: "text-signal",
  mute: "text-ink",
};

/** One number and one word: how much of something a project has. */
export function StatTile({ value, label, tone = "mute", hint }: Props) {
  return (
    <div className="card-flat px-4 py-3" title={hint}>
      <div className={"font-serif text-[26px] font-medium leading-none tabular-nums " + COLOR[tone]}>{value}</div>
      <div className="label mt-1.5">{label}</div>
    </div>
  );
}
