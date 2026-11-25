import { Fragment } from "react";
import type { ReactNode } from "react";
import type { Meta, Policy } from "../types";
import type { PluginScreen, Screen } from "./layoutState";
import { Icon } from "./icons";
import type { IconName } from "./icons";
import { SnapshotStatus } from "./SnapshotStatus";

interface Props {
  meta: Meta;
  policy: Policy;
  screen: Screen;
  /** The project the workspace shows, when the workspace is the current page. */
  openProject: string | null;
  /** Registered projects (folder names), for Quick access. */
  projects: string[];
  /** The plugins' left-navigation pages, in menu order. */
  pluginItems: readonly { screen: PluginScreen; label: string; icon: IconName }[];
  collapsed: boolean;
  onNavigate: (screen: Screen, project?: string) => void;
  onToggleCollapsed: () => void;
}

/**
 * The left navigation of mockup C: the main pages, with the plugins' pages
 * (Paper wiki, then Skills, from the skills-hub plugin since step 2.5)
 * between Projects and Plugins, Quick access to each registered project,
 * then the snapshot status, Settings, and the collapse control at the
 * bottom. Collapsed, it keeps only the icons; every button keeps its
 * name through aria-label, and the current page is marked with aria-current.
 */
export function Sidebar({ meta, policy, screen, openProject, projects, pluginItems, collapsed, onNavigate, onToggleCollapsed }: Props) {
  const item = (target: Screen, label: string, icon: IconName) => (
    <NavButton label={label} icon={<Icon name={icon} />} current={screen === target} collapsed={collapsed} onClick={() => onNavigate(target)} />
  );

  return (
    <nav
      aria-label="Main navigation"
      className={
        "flex min-h-0 flex-col gap-0.5 overflow-y-auto overflow-x-hidden bg-side shadow-[inset_-1px_0_0_var(--line)] " +
        (collapsed ? "px-2 pb-3 pt-3.5" : "px-2.5 pb-3 pt-3.5")
      }
    >
      <div className={"flex items-center gap-2.5 pb-[18px] pt-1 " + (collapsed ? "justify-center" : "px-1.5")}>
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-[8px] bg-accent text-on-accent">
          <Icon name="book" size={17} />
        </span>
        {!collapsed && (
          <span className="font-serif text-[15px] font-medium leading-[1.12] text-ink">
            AI-Human
            <br />
            Research OS
          </span>
        )}
      </div>

      {item("home", "Home", "home")}
      {item("projects", "Projects", "projects")}
      {pluginItems.map((p) => (
        <Fragment key={p.screen}>{item(p.screen, p.label, p.icon)}</Fragment>
      ))}
      {item("plugins", "Plugins", "puzzle")}

      {collapsed ? <div className="h-3.5" aria-hidden="true" /> : <div className="label px-2.5 pb-1.5 pt-[18px]">Quick access</div>}
      {projects.length === 0 && !collapsed && <p className="px-2.5 text-[12px] text-faint">No registered projects</p>}
      {projects.map((name) => (
        <NavButton
          key={name}
          label={name}
          icon={
            <span aria-hidden="true" className="h-[18px] w-[18px] shrink-0 rounded-[5px] bg-accent-soft text-center text-[10px] font-bold uppercase leading-[18px] text-accent-ink">
              {name.charAt(0)}
            </span>
          }
          current={screen === "workspace" && openProject === name}
          collapsed={collapsed}
          onClick={() => onNavigate("workspace", name)}
        />
      ))}

      <div className="min-h-3 flex-1" aria-hidden="true" />

      <SnapshotStatus meta={meta} policy={policy} collapsed={collapsed} />
      {item("settings", "Settings", "gear")}
      <button
        type="button"
        onClick={onToggleCollapsed}
        aria-expanded={!collapsed}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className={navClass(false, collapsed)}
      >
        <Icon name="chev-left" className={collapsed ? "rotate-180" : ""} />
        {!collapsed && <span className="min-w-0 flex-1 truncate">Collapse</span>}
      </button>
    </nav>
  );
}

function navClass(current: boolean, collapsed: boolean): string {
  return (
    "relative flex w-full items-center gap-2.5 whitespace-nowrap rounded-[9px] text-left text-[13.5px] font-medium " +
    (collapsed ? "justify-center py-[9px] " : "px-2.5 py-2 ") +
    (current ? "bg-card text-ink shadow-sh1 [&>svg]:text-accent" : "text-ink2 hover:bg-hover")
  );
}

function NavButton({
  label,
  icon,
  current,
  collapsed,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  current: boolean;
  collapsed: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={current ? "page" : undefined}
      aria-label={collapsed ? label : undefined}
      title={label}
      className={navClass(current, collapsed)}
    >
      {icon}
      {!collapsed && <span className="min-w-0 flex-1 truncate">{label}</span>}
    </button>
  );
}
