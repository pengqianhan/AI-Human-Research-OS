/**
 * The bridge between the sandboxed renderer and the main process: six calls
 * and this launch's endpoint token on `window.osDesktop`, no Node objects.
 * The renderer detects the client by this object's presence
 * (os-ui/frontend/src/lib/mode.ts).
 */
import { contextBridge, ipcRenderer } from "electron";
import type { IpcRendererEvent } from "electron";
import type { DesktopBridge, DesktopCommand, SnapshotEvent } from "../../../frontend/src/lib/desktop.ts";
import { CHANNELS } from "../shared/channels.ts";

function subscribe<T>(channel: string, callback: (value: T) => void): () => void {
  const listener = (_event: IpcRendererEvent, value: T) => callback(value);
  ipcRenderer.on(channel, listener);
  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

/** This launch's endpoint token, passed by the main process as an extra argument. */
const token = process.argv.find((arg) => arg.startsWith("--os-desktop-token="))?.slice("--os-desktop-token=".length) ?? "";

const bridge: DesktopBridge = {
  token,
  info: () => ipcRenderer.invoke(CHANNELS.info),
  chooseWorkspace: () => ipcRenderer.invoke(CHANNELS.chooseWorkspace),
  regenerate: () => ipcRenderer.invoke(CHANNELS.regenerate),
  doctor: () => ipcRenderer.invoke(CHANNELS.doctor),
  onSnapshot: (callback) => subscribe<SnapshotEvent>(CHANNELS.snapshot, callback),
  onCommand: (callback) => subscribe<DesktopCommand>(CHANNELS.command, callback),
};

contextBridge.exposeInMainWorld("osDesktop", bridge);
