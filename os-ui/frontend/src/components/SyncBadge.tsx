import type { SyncStatus } from "../types";
import { Badge } from "./Badge";

const LABELS: Record<SyncStatus, string> = {
  synced: "installed · synced",
  drift: "installed · drift ⚠",
  not_installed: "not installed",
  installed_no_hub_source: "installed · no hub source ⚠",
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
