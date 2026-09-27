/** Which agent the Root Agent window starts new conversations with. Chosen in
 *  the window's selector and kept in localStorage so it survives a reload. */
export type AgentId = "claude" | "codex";

const KEY = "osui.agent";

export function getPreferredAgent(): AgentId {
  try {
    return localStorage.getItem(KEY) === "codex" ? "codex" : "claude";
  } catch {
    return "claude";
  }
}

export function setPreferredAgent(agent: AgentId): void {
  try {
    localStorage.setItem(KEY, agent);
  } catch {
    // storage can be unavailable; the selection still holds for this page
  }
}
