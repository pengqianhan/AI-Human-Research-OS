import { useCallback, useState } from "react";

/** The app's own pages. "workspace" is one project's page. */
export type TrunkScreen = "home" | "projects" | "skills" | "plugins" | "settings" | "workspace";
/** A plugin's left-navigation page, by its key "<plugin>/<page>" (src/plugins/pages.ts). */
export type PluginScreen = `${string}/${string}`;
/** The pages the left navigation switches between. */
export type Screen = TrunkScreen | PluginScreen;

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
const TRUNK_SCREENS: TrunkScreen[] = ["home", "projects", "skills", "plugins", "settings", "workspace"];
/** Screens saved before a plugin's page replaced them: the Paper wiki page was "wiki" until S4. */
const RENAMED: ReadonlyMap<string, PluginScreen> = new Map([["wiki", "paper-wiki/viewer"]]);
const TABS: ViewTab[] = ["overview", "code", "paper"];

export const DEFAULT_LAYOUT: LayoutState = {
  screen: "home",
  project: null,
  sidebarCollapsed: false,
  homeConversationOpen: false,
  conversationCollapsed: false,
  tab: "overview",
};

/**
 * A saved layout, keeping only values that are still valid. `pluginScreens`
 * are the keys of the loaded plugins' left-navigation pages: a saved plugin
 * page whose plugin is not loaded opens Home, and an old screen name opens
 * the plugin page that replaced it.
 */
export function readLayout(raw: unknown, pluginScreens: readonly string[]): LayoutState {
  const saved = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<Record<keyof LayoutState, unknown>>;
  const name = typeof saved.screen === "string" ? (RENAMED.get(saved.screen) ?? saved.screen) : null;
  const screen: Screen | null =
    name !== null && (TRUNK_SCREENS.includes(name as TrunkScreen) || pluginScreens.includes(name)) ? (name as Screen) : null;
  return {
    screen: screen ?? DEFAULT_LAYOUT.screen,
    project: typeof saved.project === "string" ? saved.project : null,
    sidebarCollapsed: saved.sidebarCollapsed === true,
    homeConversationOpen: saved.homeConversationOpen === true,
    conversationCollapsed: saved.conversationCollapsed === true,
    tab: TABS.includes(saved.tab as ViewTab) ? (saved.tab as ViewTab) : DEFAULT_LAYOUT.tab,
  };
}

/** Read the saved layout from localStorage. */
function load(pluginScreens: readonly string[]): LayoutState {
  try {
    return readLayout(JSON.parse(localStorage.getItem(KEY) ?? "{}"), pluginScreens);
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

/** The layout state with a setter that also saves it. `pluginScreens` as for readLayout; read once. */
export function useLayoutState(pluginScreens: readonly string[]): [LayoutState, (patch: Partial<LayoutState>) => void] {
  const [state, setState] = useState<LayoutState>(() => load(pluginScreens));
  const update = useCallback((patch: Partial<LayoutState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);
  return [state, update];
}
