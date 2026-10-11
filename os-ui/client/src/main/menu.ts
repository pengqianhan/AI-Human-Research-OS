import type { MenuItemConstructorOptions } from "electron";

export interface MenuActions {
  openWorkspace(): void;
  openRecent(dir: string): void;
  revealWorkspace(): void;
  regenerate(): void;
  showSystem(): void;
  setNotifications(on: boolean): void;
  showLog(): void;
  openDocs(): void;
}

/** The application menu. Pure data, so its shape is testable without Electron. */
export function menuTemplate(options: {
  platform: NodeJS.Platform;
  appName: string;
  recent: string[];
  hasWorkspace: boolean;
  notifications: boolean;
  actions: MenuActions;
}): MenuItemConstructorOptions[] {
  const { platform, actions } = options;
  const mac = platform === "darwin";
  const fileManager = mac ? "Finder" : platform === "win32" ? "Explorer" : "File Manager";

  const appMenu: MenuItemConstructorOptions[] = mac
    ? [
        {
          label: options.appName,
          submenu: [
            { role: "about" },
            { type: "separator" },
            { role: "services" },
            { type: "separator" },
            { role: "hide" },
            { role: "hideOthers" },
            { role: "unhide" },
            { type: "separator" },
            { role: "quit" },
          ],
        },
      ]
    : [];

  const recent: MenuItemConstructorOptions[] =
    options.recent.length === 0
      ? [{ label: "No Recent Folders", enabled: false }]
      : options.recent.map((dir) => ({ label: dir, click: () => actions.openRecent(dir) }));

  return [
    ...appMenu,
    {
      label: "File",
      submenu: [
        { label: "Open Research OS Folder…", accelerator: "CmdOrCtrl+O", click: () => actions.openWorkspace() },
        { label: "Open Recent", submenu: recent },
        { type: "separator" },
        { label: `Reveal Folder in ${fileManager}`, enabled: options.hasWorkspace, click: () => actions.revealWorkspace() },
        ...(mac ? [] : [{ type: "separator" } as MenuItemConstructorOptions, { role: "quit" } as MenuItemConstructorOptions]),
      ],
    },
    { role: "editMenu" },
    {
      label: "View",
      submenu: [
        { label: "Regenerate Snapshot", accelerator: "CmdOrCtrl+Shift+R", enabled: options.hasWorkspace, click: () => actions.regenerate() },
        {
          label: "Notify When Agent Turns End",
          type: "checkbox",
          checked: options.notifications,
          click: (item) => actions.setNotifications(item.checked),
        },
        { type: "separator" },
        { role: "reload" },
        { role: "toggleDevTools" },
        { type: "separator" },
        { role: "resetZoom" },
        { role: "zoomIn" },
        { role: "zoomOut" },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
    { role: "windowMenu" },
    {
      role: "help",
      submenu: [
        { label: "System and Prerequisites", click: () => actions.showSystem() },
        { label: "Show Log File", click: () => actions.showLog() },
        { label: "Desktop Client Documentation", click: () => actions.openDocs() },
        ...(mac ? [] : [{ type: "separator" } as MenuItemConstructorOptions, { role: "about" } as MenuItemConstructorOptions]),
      ],
    },
  ];
}
