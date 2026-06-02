import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";

const appWindow = getCurrentWindow();

export const desktopApi = {
  savePhoto: (pngBytes: Uint8Array) =>
    invoke<string>("save_photo", { pngBytes: Array.from(pngBytes) }),
  setAlwaysOnTop: (enabled: boolean) => appWindow.setAlwaysOnTop(enabled),
  exitFullscreen: () => appWindow.setFullscreen(false),
  async toggleFullscreen() {
    await appWindow.setFullscreen(!(await appWindow.isFullscreen()));
  },
  close: () => appWindow.close(),
};
