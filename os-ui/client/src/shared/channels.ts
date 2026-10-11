/** IPC channel names shared by the main process and the preload script. */
export const CHANNELS = {
  info: "os-desktop:info",
  chooseWorkspace: "os-desktop:choose-workspace",
  regenerate: "os-desktop:regenerate",
  doctor: "os-desktop:doctor",
  snapshot: "os-desktop:snapshot",
  command: "os-desktop:command",
} as const;
