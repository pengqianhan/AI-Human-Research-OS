import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { OsState } from "../types";
import { desktop } from "../lib/desktop";
import { PageHeader } from "../components/PageHeader";
import { HomePage } from "../pages/HomePage";
import { ProjectsPage } from "../pages/ProjectsPage";
import { WorkspacePage } from "../pages/WorkspacePage";
import { PaperWikiScreen } from "../pages/PaperWikiScreen";
import { StorePage } from "../pages/StorePage";
import { PluginsPage } from "../pages/PluginsPage";
import { SettingsPage } from "../pages/SettingsPage";
import { useLayoutState } from "./layoutState";
import type { Screen } from "./layoutState";
import { Sidebar } from "./Sidebar";
import { ToastProvider } from "./Toast";

/**
 * The application layout chosen on 2026-11-21 (mockup C, "document first";
 * HANDOFF.md Decisions, "Layout"): left navigation, and one page at a time
 * on the right. It replaces the desktop-OS shell in src/desktop/, which is
 * still in the repository but no longer used.
 *
 * A page stays mounted (hidden) once it has been opened, so leaving and
 * coming back keeps a conversation's draft and selected session, a running
 * turn's polling, and the Paper Wiki viewer where it was — as the old
 * windows did when they stood side by side.
 */
export function Shell({ state }: { state: OsState }) {
  const [layout, setLayout] = useLayoutState();
  const [visited, setVisited] = useState<Set<Screen>>(() => new Set([layout.screen]));
  const mainRef = useRef<HTMLElement | null>(null);
  const focusTitle = useRef(false);

  const openProject = state.projects.find((p) => p.name === layout.project) ?? null;
  // A remembered project can be gone (renamed or removed): show the project list instead.
  const screen: Screen = layout.screen === "workspace" && openProject === null ? "projects" : layout.screen;

  /** Go to a page. `focus` moves the keyboard focus to its title (used when the click came from inside a page). */
  const navigate = useCallback(
    (next: Screen, project?: string, focus = false) => {
      setLayout(project === undefined ? { screen: next } : { screen: next, project });
      setVisited((prev) => (prev.has(next) ? prev : new Set(prev).add(next)));
      focusTitle.current = focus;
    },
    [setLayout],
  );

  // The desktop client's Help menu ("System and Prerequisites") opens Settings.
  useEffect(
    () =>
      desktop?.onCommand((command) => {
        if (command === "open-system") navigate("settings");
      }),
    [navigate],
  );

  useEffect(() => {
    if (!focusTitle.current) return;
    focusTitle.current = false;
    mainRef.current?.querySelector<HTMLElement>(`[data-screen="${screen}"] [data-page-title]`)?.focus();
  }, [screen, layout.project]);

  const mounted = (id: Screen) => visited.has(id) || id === screen;
  const openFromPage = (name: string) => navigate("workspace", name, true);

  return (
    <ToastProvider>
      <div
        className="grid h-screen overflow-hidden transition-[grid-template-columns] duration-200"
        style={{ gridTemplateColumns: `${layout.sidebarCollapsed ? "var(--sbw-collapsed)" : "var(--sbw)"} minmax(0, 1fr)` }}
      >
        <Sidebar
          meta={state.meta}
          screen={screen}
          openProject={openProject?.name ?? null}
          projects={state.projects.map((p) => p.name)}
          collapsed={layout.sidebarCollapsed}
          onNavigate={(next, project) => navigate(next, project)}
          onToggleCollapsed={() => setLayout({ sidebarCollapsed: !layout.sidebarCollapsed })}
        />

        <main ref={mainRef} className="relative min-h-0 min-w-0 overflow-hidden">
          {mounted("home") && (
            <Page id="home" label="Home" screen={screen}>
              <HomePage
                state={state}
                conversationOpen={layout.homeConversationOpen}
                onConversationOpenChange={(open) => setLayout({ homeConversationOpen: open })}
                onOpenProject={openFromPage}
              />
            </Page>
          )}
          {mounted("projects") && (
            <Page id="projects" label="Projects" screen={screen}>
              <ProjectsPage state={state} onOpenProject={openFromPage} />
            </Page>
          )}
          {mounted("workspace") && openProject !== null && (
            <Page id="workspace" label={`Project ${openProject.name}`} screen={screen} fill>
              <WorkspacePage
                key={openProject.name}
                state={state}
                project={openProject}
                tab={layout.tab}
                onTab={(tab) => setLayout({ tab })}
                conversationCollapsed={layout.conversationCollapsed}
                onConversationCollapsed={(collapsed) => setLayout({ conversationCollapsed: collapsed })}
                onBack={() => navigate("projects", undefined, true)}
              />
            </Page>
          )}
          {mounted("wiki") && (
            <Page id="wiki" label="Paper wiki" screen={screen} fill>
              <PaperWikiScreen />
            </Page>
          )}
          {mounted("skills") && (
            <Page id="skills" label="Skills" screen={screen}>
              <SkillsScreen state={state} />
            </Page>
          )}
          {mounted("plugins") && (
            <Page id="plugins" label="Plugins" screen={screen}>
              <PluginsPage />
            </Page>
          )}
          {mounted("settings") && (
            <Page id="settings" label="Settings" screen={screen}>
              <SettingsPage />
            </Page>
          )}
        </main>
      </div>
    </ToastProvider>
  );
}

/** One page of the layout: hidden, not unmounted, while another page shows. `fill` pages scroll inside themselves. */
function Page({ id, label, screen, fill = false, children }: { id: Screen; label: string; screen: Screen; fill?: boolean; children: ReactNode }) {
  return (
    <section data-screen={id} aria-label={label} hidden={screen !== id} className={"absolute inset-0 " + (fill ? "overflow-hidden" : "overflow-y-auto")}>
      {children}
    </section>
  );
}

/** Skills: the skill store as it works today, under a page header. */
function SkillsScreen({ state }: { state: OsState }) {
  return (
    <div className="page">
      <PageHeader
        eyebrow="research-skills-hub/"
        title="Skills"
        lede="The research skills hub and where each skill is installed. Installing copies a command for a terminal; the one change made here is disabling or enabling a single install."
      />
      <div className="mt-6">
        <StorePage state={state} />
      </div>
    </div>
  );
}
