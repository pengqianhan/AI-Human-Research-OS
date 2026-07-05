import type { ReactNode } from "react";
import type { OsState } from "../types";
import { DashboardPage } from "../pages/DashboardPage";
import { ProjectPage } from "../pages/ProjectPage";
import { StorePage } from "../pages/StorePage";

export type AppId = "dash" | "proj" | "store";

/** One dock app: identity, icon, default window size, and page content. */
export interface AppDef {
  id: AppId;
  title: string;
  icon: ReactNode;
  defaultW: number;
  defaultH: number;
  render: (state: OsState) => ReactNode;
}

/* Inline line icons (18px grid, stroke = currentColor). Each one echoes the
   app's actual content: flight strips for 总览, a folder for 项目, a shelf
   grid for 技能商店. */

const stripsIcon = (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="3" width="14" height="3.4" rx="1" />
    <rect x="2" y="9" width="10.5" height="3.4" rx="1" />
    <path d="M2 15.6h14" strokeLinecap="round" />
  </svg>
);

const folderIcon = (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M2 5.5c0-.8.7-1.5 1.5-1.5h3l1.6 2h6.4c.8 0 1.5.7 1.5 1.5v6c0 .8-.7 1.5-1.5 1.5h-11A1.5 1.5 0 0 1 2 13.5v-8Z" />
  </svg>
);

const storeIcon = (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2.5" y="2.5" width="5.4" height="5.4" rx="1.2" />
    <rect x="10.1" y="2.5" width="5.4" height="5.4" rx="1.2" />
    <rect x="2.5" y="10.1" width="5.4" height="5.4" rx="1.2" />
    <rect x="10.1" y="10.1" width="5.4" height="5.4" rx="1.2" />
  </svg>
);

export const APPS: AppDef[] = [
  {
    id: "dash",
    title: "总览",
    icon: stripsIcon,
    defaultW: 1000,
    defaultH: 660,
    render: (state) => <DashboardPage state={state} />,
  },
  {
    id: "proj",
    title: "项目",
    icon: folderIcon,
    defaultW: 960,
    defaultH: 640,
    render: (state) => <ProjectPage state={state} />,
  },
  {
    id: "store",
    title: "技能商店",
    icon: storeIcon,
    defaultW: 1000,
    defaultH: 660,
    render: (state) => <StorePage state={state} />,
  },
];
