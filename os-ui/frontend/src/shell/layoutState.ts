import { useCallback, useState } from "react";

/** The pages the left navigation switches between. "workspace" is one project's page. */
export type Screen = "home" | "projects" | "wiki" | "skills" | "plugins" | "settings" | "workspace";

/** The tabs of a project workspace. Only Overview, Code, and Paper can be selected in step 1. */
export type ViewTab = "overview" | "code" | "paper";

/** What the layout remembers across reloads, per browser profile. */
export interface LayoutState {
  screen: Screen;
  /** The project the workspace shows, by its folder name. */
  project: string | null;
  sidebarCollapsed: boolean;
  /** Home's root-agent bar: open shows the whole conversation. */
  homeConversationOpen: boolean;
  /** The workspace's conversation pane: collapsed leaves a thin strip. */
  conversationCollapsed: boolean;
  tab: ViewTab;
}

const KEY = "osui.layout.v1";
const SCREENS: Screen[] = ["home", "projects", "wiki", "skills", "plugins", "settings", "workspace"];
const TABS: ViewTab[] = ["overview", "code", "paper"];

export const DEFAULT_LAYOUT: LayoutState = {
  screen: "home",
  project: null,
  sidebarCollapsed: false,
  homeConversationOpen: false,
  conversationCollapsed: false,
  tab: "overview",
};

/** Read the saved layout, keeping only values that are still valid. */
function load(): LayoutState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "{}") as Partial<Record<keyof LayoutState, unknown>>;
    return {
      screen: SCREENS.includes(raw.screen as Screen) ? (raw.screen as Screen) : DEFAULT_LAYOUT.screen,
      project: typeof raw.project === "string" ? raw.project : null,
      sidebarCollapsed: raw.sidebarCollapsed === true,
      homeConversationOpen: raw.homeConversationOpen === true,
      conversationCollapsed: raw.conversationCollapsed === true,
      tab: TABS.includes(raw.tab as ViewTab) ? (raw.tab as ViewTab) : DEFAULT_LAYOUT.tab,
    };
  } catch {
    // storage unavailable or unreadable: start from the defaults
    return DEFAULT_LAYOUT;
  }
}

function save(state: LayoutState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage unavailable: the layout still holds for this page
  }
}

/** The layout state with a setter that also saves it. */
export function useLayoutState(): [LayoutState, (patch: Partial<LayoutState>) => void] {
  const [state, setState] = useState<LayoutState>(load);
  const update = useCallback((patch: Partial<LayoutState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);
  return [state, update];
}
