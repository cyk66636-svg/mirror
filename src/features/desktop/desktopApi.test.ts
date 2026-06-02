import { beforeEach, describe, expect, it, vi } from "vitest";

const { appWindow, invoke } = vi.hoisted(() => ({
  appWindow: {
    close: vi.fn(),
    isFullscreen: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    setFullscreen: vi.fn(),
  },
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke }));
vi.mock("@tauri-apps/api/window", () => ({
  getCurrentWindow: () => appWindow,
}));

import { desktopApi } from "./desktopApi";

describe("desktop API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("saves PNG bytes through the native command", async () => {
    const savedPath = "C:\\Pictures\\Mirror\\mirror-20260603-123456.png";
    invoke.mockResolvedValue(savedPath);

    const result = desktopApi.savePhoto(new Uint8Array([1, 2, 3]));

    expect(invoke).toHaveBeenCalledWith("save_photo", {
      pngBytes: [1, 2, 3],
    });
    expect(result).toBe(invoke.mock.results[0].value);
    await expect(result).resolves.toBe(savedPath);
  });

  it("exits fullscreen when toggled from fullscreen", async () => {
    appWindow.isFullscreen.mockResolvedValue(true);

    await desktopApi.toggleFullscreen();

    expect(appWindow.setFullscreen).toHaveBeenCalledWith(false);
  });

  it("enters fullscreen when toggled from windowed mode", async () => {
    appWindow.isFullscreen.mockResolvedValue(false);

    await desktopApi.toggleFullscreen();

    expect(appWindow.setFullscreen).toHaveBeenCalledWith(true);
  });

  it("delegates always-on-top changes", () => {
    desktopApi.setAlwaysOnTop(true);

    expect(appWindow.setAlwaysOnTop).toHaveBeenCalledWith(true);
  });

  it("closes the current window", () => {
    desktopApi.close();

    expect(appWindow.close).toHaveBeenCalledOnce();
  });

  it("exits fullscreen", () => {
    desktopApi.exitFullscreen();

    expect(appWindow.setFullscreen).toHaveBeenCalledWith(false);
  });
});
