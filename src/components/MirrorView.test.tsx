import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { capturePhoto } from "../features/camera/capturePhoto";
import { desktopApi } from "../features/desktop/desktopApi";
import {
  DEFAULT_SETTINGS,
  type MirrorSettings,
} from "../features/settings/mirrorSettings";
import { useCamera } from "../hooks/useCamera";
import { useControlVisibility } from "../hooks/useControlVisibility";
import { useMirrorSettings } from "../hooks/useMirrorSettings";
import { MirrorView } from "./MirrorView";

vi.mock("../hooks/useMirrorSettings", () => ({
  useMirrorSettings: vi.fn(),
}));

vi.mock("../hooks/useCamera", () => ({
  useCamera: vi.fn(),
}));

vi.mock("../hooks/useControlVisibility", () => ({
  useControlVisibility: vi.fn(),
}));

vi.mock("../features/camera/capturePhoto", () => ({
  capturePhoto: vi.fn(),
}));

vi.mock("../features/desktop/desktopApi", () => ({
  desktopApi: {
    savePhoto: vi.fn(),
    setAlwaysOnTop: vi.fn(),
    exitFullscreen: vi.fn(),
    toggleFullscreen: vi.fn(),
    close: vi.fn(),
  },
}));

type CameraState = ReturnType<typeof useCamera>;
type ControlState = ReturnType<typeof useControlVisibility>;

function mediaStream(): MediaStream {
  return {
    getTracks: vi.fn(() => []),
  } as unknown as MediaStream;
}

function camera(deviceId: string, label: string): MediaDeviceInfo {
  return {
    deviceId,
    groupId: "",
    kind: "videoinput",
    label,
    toJSON: () => ({}),
  };
}

function settings(patch: Partial<MirrorSettings> = {}): MirrorSettings {
  return {
    ...DEFAULT_SETTINGS,
    controlsPinned: true,
    selectedCameraId: "front",
    ...patch,
  };
}

function cameraState(patch: Partial<CameraState> = {}): CameraState {
  return {
    stream: mediaStream(),
    cameras: [camera("front", "Front camera"), camera("usb", "USB camera")],
    cameraId: "front",
    error: undefined,
    retry: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    selectCamera: vi
      .fn<(deviceId: string) => Promise<void>>()
      .mockResolvedValue(undefined),
    ...patch,
  };
}

function controlState(patch: Partial<ControlState> = {}): ControlState {
  return {
    visible: true,
    reveal: vi.fn(),
    scheduleHide: vi.fn(),
    ...patch,
  };
}

function renderMirror({
  nextSettings = settings(),
  nextCamera = cameraState(),
  nextControls = controlState(),
}: {
  nextSettings?: MirrorSettings;
  nextCamera?: CameraState;
  nextControls?: ControlState;
} = {}) {
  const patchSettings = vi.fn<(patch: Partial<MirrorSettings>) => void>();
  vi.mocked(useMirrorSettings).mockReturnValue({
    settings: nextSettings,
    patchSettings,
  });
  vi.mocked(useCamera).mockReturnValue(nextCamera);
  vi.mocked(useControlVisibility).mockReturnValue(nextControls);

  return {
    ...render(<MirrorView />),
    patchSettings,
    camera: nextCamera,
    controls: nextControls,
  };
}

beforeEach(() => {
  vi.mocked(capturePhoto).mockResolvedValue(new Uint8Array([1, 2, 3]));
  vi.mocked(desktopApi.savePhoto).mockResolvedValue("C:\\Photos\\mirror.png");
  vi.mocked(desktopApi.setAlwaysOnTop).mockResolvedValue(undefined);
  vi.mocked(desktopApi.exitFullscreen).mockResolvedValue(undefined);
  vi.mocked(desktopApi.toggleFullscreen).mockResolvedValue(undefined);
  vi.mocked(desktopApi.close).mockResolvedValue(undefined);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MirrorView", () => {
  it("restores the persisted always-on-top preference on mount", async () => {
    renderMirror({ nextSettings: settings({ alwaysOnTop: true }) });

    await waitFor(() => {
      expect(desktopApi.setAlwaysOnTop).toHaveBeenCalledWith(true);
    });
  });

  it("captures a photo, saves it, and shows the saved path", async () => {
    const user = userEvent.setup();
    const pngBytes = new Uint8Array([9, 8, 7]);
    vi.mocked(capturePhoto).mockResolvedValue(pngBytes);
    vi.mocked(desktopApi.savePhoto).mockResolvedValue("C:\\Photos\\saved.png");

    renderMirror({ nextSettings: settings({ zoom: 1.5 }) });

    await user.click(screen.getByRole("button", { name: "拍照" }));

    await waitFor(() => {
      expect(capturePhoto).toHaveBeenCalledWith(
        expect.any(HTMLVideoElement),
        expect.any(HTMLDivElement),
        1.5,
      );
    });
    expect(desktopApi.savePhoto).toHaveBeenCalledWith(pngBytes);
    expect(await screen.findByText("照片已保存：C:\\Photos\\saved.png")).toBeVisible();
  });

  it("shows a failure toast when capture or save fails", async () => {
    const user = userEvent.setup();
    vi.mocked(capturePhoto).mockRejectedValue(new Error("camera not ready"));

    renderMirror();

    await user.click(screen.getByRole("button", { name: "拍照" }));

    expect(await screen.findByText("照片保存失败，请重试。")).toBeVisible();
    expect(desktopApi.savePhoto).not.toHaveBeenCalled();
  });

  it("routes keyboard shortcuts to desktop actions", () => {
    const { patchSettings } = renderMirror({
      nextSettings: settings({ alwaysOnTop: false }),
    });
    vi.mocked(desktopApi.setAlwaysOnTop).mockClear();

    fireEvent.keyDown(window, { key: "Escape" });
    const f11 = new KeyboardEvent("keydown", {
      key: "F11",
      bubbles: true,
      cancelable: true,
    });
    window.dispatchEvent(f11);
    fireEvent.keyDown(window, { key: "T", ctrlKey: true, shiftKey: true });

    expect(desktopApi.exitFullscreen).toHaveBeenCalledOnce();
    expect(f11.defaultPrevented).toBe(true);
    expect(desktopApi.toggleFullscreen).toHaveBeenCalledOnce();
    expect(patchSettings).toHaveBeenCalledWith({ alwaysOnTop: true });
    expect(desktopApi.setAlwaysOnTop).toHaveBeenCalledWith(true);
  });

  it("captures with the Space shortcut outside form controls", async () => {
    renderMirror();

    fireEvent.keyDown(window, { key: " ", code: "Space" });
    fireEvent.keyDown(screen.getByLabelText("亮度"), {
      key: " ",
      code: "Space",
    });

    await waitFor(() => {
      expect(capturePhoto).toHaveBeenCalledOnce();
    });
  });

  it("reveals controls when the pointer moves near the bottom edge", () => {
    const controls = controlState({ visible: false });
    const { container } = renderMirror({ nextControls: controls });
    const shell = container.querySelector(".mirror-shell") as HTMLElement;

    fireEvent.pointerMove(shell, { clientY: window.innerHeight - 10 });
    fireEvent.pointerMove(shell, { clientY: 10 });

    expect(controls.reveal).toHaveBeenCalledOnce();
  });

  it("wires hidden controls and pinned settings to the visibility hook", () => {
    const controls = controlState({ visible: false });

    renderMirror({
      nextSettings: settings({ controlsPinned: false }),
      nextControls: controls,
    });

    const bar = screen.getByLabelText("镜子控制面板");
    expect(useControlVisibility).toHaveBeenCalledWith(false);
    expect(bar).not.toHaveClass("is-visible");

    fireEvent.pointerEnter(bar);
    fireEvent.pointerLeave(bar);

    expect(controls.reveal).toHaveBeenCalledOnce();
    expect(controls.scheduleHide).toHaveBeenCalledOnce();
  });

  it("renders the selected fill-light layout and camera preview composition", () => {
    const activeStream = mediaStream();
    const { container } = renderMirror({
      nextSettings: settings({ layout: "frame", zoom: 1.25 }),
      nextCamera: cameraState({ stream: activeStream }),
    });

    expect(container.querySelector(".fill-light--frame")).toBeInTheDocument();
    expect(container.querySelector(".fill-light-frame")).toBeInTheDocument();
    expect(container.querySelector(".camera-preview")).toBeInTheDocument();
    const video = container.querySelector(".camera-video") as HTMLVideoElement;

    expect(video.srcObject).toBe(activeStream);
    expect(video).toHaveStyle({ transform: "scaleX(-1) scale(1.25)" });
  });

  it("wires control retry and fullscreen toggle actions", async () => {
    const user = userEvent.setup();
    const activeCamera = cameraState();

    renderMirror({ nextCamera: activeCamera });

    await user.click(screen.getByRole("button", { name: "重试" }));
    await user.click(screen.getByRole("button", { name: "切换全屏" }));

    expect(activeCamera.retry).toHaveBeenCalledOnce();
    expect(desktopApi.toggleFullscreen).toHaveBeenCalledOnce();
  });

  it("disables capture when the camera is unavailable or in an error state", async () => {
    const user = userEvent.setup();
    const activeCamera = cameraState({
      stream: undefined,
      error: "stream-error",
    });

    renderMirror({ nextCamera: activeCamera });

    const capture = screen.getByRole("button", { name: "拍照" });
    expect(capture).toBeDisabled();
    await user.click(capture);

    expect(capturePhoto).not.toHaveBeenCalled();
    expect(screen.getByLabelText("选择摄像头")).toBeEnabled();
  });

  it("shows the camera error state and retries from the overlay", async () => {
    const user = userEvent.setup();
    const activeCamera = cameraState({
      stream: undefined,
      error: "permission-denied",
    });

    renderMirror({ nextCamera: activeCamera });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "需要摄像头权限才能使用镜子。请允许访问后重试。",
    );
    await user.click(screen.getAllByRole("button", { name: "重试" })[0]);

    expect(activeCamera.retry).toHaveBeenCalledOnce();
  });

  it("patches settings when the active camera id differs", async () => {
    const { patchSettings } = renderMirror({
      nextSettings: settings({ selectedCameraId: "front" }),
      nextCamera: cameraState({ cameraId: "usb" }),
    });

    await waitFor(() => {
      expect(patchSettings).toHaveBeenCalledWith({ selectedCameraId: "usb" });
    });
  });

  it("patches settings and asks the camera hook to switch cameras", () => {
    const { patchSettings, camera: activeCamera } = renderMirror();

    fireEvent.change(screen.getByLabelText("选择摄像头"), {
      target: { value: "usb" },
    });

    expect(patchSettings).toHaveBeenCalledWith({ selectedCameraId: "usb" });
    expect(activeCamera.selectCamera).toHaveBeenCalledWith("usb");
  });
});
