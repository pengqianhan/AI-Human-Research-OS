import { useCallback, useState } from "react";

/** The app's own pages. "workspace" is one project's page. */
export type TrunkScreen = "home" | "projects" | "skills" | "plugins" | "settings" | "workspace";
/** A plugin's left-navigation page, by its key "<plugin>/<page>" (src/plugins/pages.ts). */
export type PluginScreen = `${string}/${string}`;
/** The pages the left navigation switches between. */
export type Screen = TrunkScreen | PluginScreen;

/** A plugin's project view, by its key "<plugin>/<page>" (src/plugins/pages.ts): the Code tab is "code-view/code", the Paper tab "paper-view/paper". */
export type PluginTab = `${string}/${string}`;
/** The tabs of a project workspace: the app's Overview and the plugins' project views. */
export type ViewTab = "overview" | PluginTab;

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
const TRUNK_TABS: ViewTab[] = ["overview"];
/** Tabs saved before a plugin's project view replaced them: the trunk's placeholder tabs "code" until S6a-2 and "paper" until S6b. */
const RENAMED_TABS: ReadonlyMap<string, PluginTab> = new Map([
  ["code", "code-view/code"],
  ["paper", "paper-view/paper"],
]);

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
 * the plugin page that replaced it. `pluginTabs`, the keys of their project
 * views, do the same for the workspace's tab, which falls back to Overview.
 */
export function readLayout(raw: unknown, pluginScreens: readonly string[], pluginTabs: readonly string[] = []): LayoutState {
  const saved = (typeof raw === "object" && raw !== null ? raw : {}) as Partial<Record<keyof LayoutState, unknown>>;
  const name = typeof saved.screen === "string" ? (RENAMED.get(saved.screen) ?? saved.screen) : null;
  const tabName = typeof saved.tab === "string" ? (RENAMED_TABS.get(saved.tab) ?? saved.tab) : null;
  const tab: ViewTab | null =
    tabName !== null && (TRUNK_TABS.includes(tabName as ViewTab) || pluginTabs.includes(tabName)) ? (tabName as ViewTab) : null;
  const screen: Screen | null =
    name !== null && (TRUNK_SCREENS.includes(name as TrunkScreen) || pluginScreens.includes(name)) ? (name as Screen) : null;
  return {
    screen: screen ?? DEFAULT_LAYOUT.screen,
    project: typeof saved.project === "string" ? saved.project : null,
    sidebarCollapsed: saved.sidebarCollapsed === true,
    homeConversationOpen: saved.homeConversationOpen === true,
    conversationCollapsed: saved.conversationCollapsed === true,
    tab: tab ?? DEFAULT_LAYOUT.tab,
  };
}

/** Read the saved layout from localStorage. */
function load(pluginScreens: readonly string[], pluginTabs: readonly string[]): LayoutState {
  try {
    return readLayout(JSON.parse(localStorage.getItem(KEY) ?? "{}"), pluginScreens, pluginTabs);
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

/** The layout state with a setter that also saves it. `pluginScreens` and `pluginTabs` as for readLayout; read once. */
export function useLayoutState(pluginScreens: readonly string[], pluginTabs: readonly string[]): [LayoutState, (patch: Partial<LayoutState>) => void] {
  const [state, setState] = useState<LayoutState>(() => load(pluginScreens, pluginTabs));
  const update = useCallback((patch: Partial<LayoutState>) => {
    setState((prev) => {
      const next = { ...prev, ...patch };
      save(next);
      return next;
    });
  }, []);
  return [state, update];
}

/** One tab of the workspace's tab row: selectable (`id`), or a later view's badge (`later`). */
export interface WorkspaceTab {
  id: ViewTab | null;
  label: string;
  later?: string;
}

/** Where a bundled plugin's project view sits in mockup C's tab row. */
const PLACED_VIEWS: readonly string[] = ["idea-view/idea", "code-view/code", "skeleton-view/skeleton", "assets-view/assets", "paper-view/paper"];

/**
 * The workspace's tab row, in mockup C's order: Overview, the Idea view, the
 * Code view, the Skeleton view, the Assets view, any other plugin project
 * view, then the Paper view. `views` are the loaded plugins' project views
 * (key and title); a placed view whose plugin is not loaded leaves no tab.
 */
export function workspaceTabs(views: readonly { key: PluginTab; title: string }[]): WorkspaceTab[] {
  const tab = (key: string): WorkspaceTab[] => views.filter((v) => v.key === key).map((v) => ({ id: v.key, label: v.title }));
  return [
    { id: "overview", label: "Overview" },
    ...tab("idea-view/idea"),
    ...tab("code-view/code"),
    ...tab("skeleton-view/skeleton"),
    ...tab("assets-view/assets"),
    ...views.filter((v) => !PLACED_VIEWS.includes(v.key)).map((v) => ({ id: v.key, label: v.title })),
    ...tab("paper-view/paper"),
  ];
}
