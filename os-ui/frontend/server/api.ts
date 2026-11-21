import { chatApi } from "./chat.ts";
import { paperSourcesApi } from "./paperSources.ts";
import { paperStatusApi } from "./paperStatus.ts";
import type { TrunkMount } from "./registry.ts";
import { skillToggleApi } from "./skillToggle.ts";
import type { ApiContext, ApiHandler } from "./types.ts";

export interface Mount {
  prefix: string;
  handler: ApiHandler;
  /** Whether the endpoint demands this launch's X-OS-UI-Token (see ../api-plugin.ts). */
  token: boolean;
}

/**
 * The app's own endpoints, on app://research-os. Plugin handlers are not
 * listed here: the registry (registry.ts) adds them from each bundled
 * plugin's plugin.json, and the dev server mounts the registry.
 */
export const TRUNK_MOUNTS: readonly TrunkMount[] = [
  { prefix: "/api/skill/toggle", factory: skillToggleApi, token: false },
  { prefix: "/api/paper-sources", factory: paperSourcesApi, token: true },
  { prefix: "/api/chat", factory: chatApi, token: true },
];

/**
 * Every os-ui endpoint, for the desktop client, which still splits them over
 * its two origins itself (client/src/main/protocol.ts). It reads no plugin
 * folder, because the packaged client has none; registry.test.ts checks that
 * the registry the dev server mounts has the same endpoints and token flags.
 */
export function createMounts(ctx: ApiContext): Mount[] {
  return [
    { prefix: "/api/skill/toggle", handler: skillToggleApi(ctx), token: false },
    { prefix: "/api/paper-wiki/status", handler: paperStatusApi(ctx), token: false },
    { prefix: "/api/paper-sources", handler: paperSourcesApi(ctx), token: true },
    { prefix: "/api/chat", handler: chatApi(ctx), token: true },
  ];
}

/**
 * The mount a URL path belongs to and the path below it, the way Connect's
 * `use(prefix)` strips it: the prefix must be followed by "/" or the end.
 */
export function matchMount(mounts: Mount[], pathname: string): { mount: Mount; path: string } | null {
  for (const mount of mounts) {
    if (!pathname.startsWith(mount.prefix)) continue;
    const rest = pathname.slice(mount.prefix.length);
    if (rest === "" || rest.startsWith("/")) return { mount, path: rest === "" ? "/" : rest };
  }
  return null;
}
