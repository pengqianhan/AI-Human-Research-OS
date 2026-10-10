import { chatApi } from "./chat.ts";
import { paperSourcesApi } from "./paperSources.ts";
import { paperStatusApi } from "./paperStatus.ts";
import { skillToggleApi } from "./skillToggle.ts";
import type { ApiContext, ApiHandler } from "./types.ts";

export interface Mount {
  prefix: string;
  handler: ApiHandler;
  /** Whether the dev server demands X-OS-UI-Token (see chat-plugin.ts). */
  token: boolean;
}

/** Every os-ui endpoint, in the order the dev server registers them. */
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
