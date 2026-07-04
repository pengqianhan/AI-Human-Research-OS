import type { SyncStatus } from "../types";
import { Badge } from "./Badge";

const LABELS: Record<SyncStatus, string> = {
  synced: "已安装 · 同步",
  drift: "已安装 · 漂移 ⚠",
  not_installed: "未安装",
  installed_no_hub_source: "已安装 · hub 无源 ⚠",
};

const TONES: Record<SyncStatus, "ok" | "warn" | "mute"> = {
  synced: "ok",
  drift: "warn",
  not_installed: "mute",
  installed_no_hub_source: "warn",
};

interface Props {
  sync: SyncStatus;
}

/** Four-state sync badge for store cards / drawer, matching mockup's SYNC_BADGE map. */
export function SyncBadge({ sync }: Props) {
  return <Badge tone={TONES[sync]}>{LABELS[sync]}</Badge>;
}
