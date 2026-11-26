import { chatApi } from "./chat.ts";
import { paperSourcesApi } from "./paperSources.ts";
import type { TrunkMount } from "./registry.ts";
import type { ApiHandler } from "./types.ts";

export interface Mount {
  prefix: string;
  handler: ApiHandler;
  /** Whether the endpoint demands this launch's X-OS-UI-Token (see ../api-plugin.ts). */
  token: boolean;
}

/**
 * The app's own endpoints, on app://superresearch-os. Plugin handlers are not
 * listed here: the registry (registry.ts) adds them from each bundled
 * plugin's plugin.json. The dev server mounts the registry on its one
 * origin; the desktop client serves it per origin (client/src/main/protocol.ts).
 * The skill toggle was one until step 2.5; it is Skills Hub's handler now,
 * reached from app://skills-hub only (pluginHandlers.ts).
 */
export const TRUNK_MOUNTS: readonly TrunkMount[] = [
  { prefix: "/api/paper-sources", factory: paperSourcesApi, token: true },
  { prefix: "/api/chat", factory: chatApi, token: true },
];

/**
 * The mount a URL path belongs to and the path below it, the way Connect's
 * `use(prefix)` strips it: the prefix must be followed by "/" or the end.
 */
export function matchMount(mounts: readonly Mount[], pathname: string): { mount: Mount; path: string } | null {
  for (const mount of mounts) {
    if (!pathname.startsWith(mount.prefix)) continue;
    const rest = pathname.slice(mount.prefix.length);
    if (rest === "" || rest.startsWith("/")) return { mount, path: rest === "" ? "/" : rest };
  }
  return null;
}
