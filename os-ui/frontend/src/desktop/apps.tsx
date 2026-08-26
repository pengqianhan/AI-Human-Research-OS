import type { ReactNode } from "react";
import type { OsState } from "../types";
import { DashboardPage } from "../pages/DashboardPage";
import { ProjectPage } from "../pages/ProjectPage";
import { StorePage } from "../pages/StorePage";
import { PaperWikiPage } from "../pages/PaperWikiPage";

export type AppId = "dash" | "proj" | "store" | "paperwiki";

/** One dock app: identity, icon, default window size, and page content. */
export interface AppDef {
  id: AppId;
  title: string;
  icon: ReactNode;
  defaultW: number;
  defaultH: number;
  /** True for a page that must fill the window edge-to-edge (its own
   *  scrolling, no chrome padding) instead of the default padded, scrolling
   *  content area — currently only the iframe-embedded Paper Wiki. */
  fill?: boolean;
  render: (state: OsState) => ReactNode;
}

/* Inline line icons (18px grid, stroke = currentColor). Each one echoes the
   app's actual content: flight strips for Dashboard, a folder for Projects,
   a shelf grid for Store, and a node-link graph for Paper Wiki. */

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

const paperWikiIcon = (
  <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M5.6 6 11.4 4.4M6 11.3 4.9 6.9M11.9 6.3 7.6 12" strokeLinecap="round" />
    <circle cx="4" cy="5" r="1.8" />
    <circle cx="13" cy="4" r="1.8" />
    <circle cx="6.6" cy="13.4" r="2.1" />
  </svg>
);

export const APPS: AppDef[] = [
  {
    id: "dash",
    title: "Dashboard",
    icon: stripsIcon,
    defaultW: 1000,
    defaultH: 660,
    render: (state) => <DashboardPage state={state} />,
  },
  {
    id: "proj",
    title: "Projects",
    icon: folderIcon,
    defaultW: 960,
    defaultH: 640,
    render: (state) => <ProjectPage state={state} />,
  },
  {
    id: "store",
    title: "Skill Store",
    icon: storeIcon,
    defaultW: 1000,
    defaultH: 660,
    render: (state) => <StorePage state={state} />,
  },
  {
    id: "paperwiki",
    title: "Paper Wiki",
    icon: paperWikiIcon,
    defaultW: 1120,
    defaultH: 720,
    fill: true,
    render: () => <PaperWikiPage />,
  },
];
