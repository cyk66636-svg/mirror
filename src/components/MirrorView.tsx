import { useCallback, useEffect, useRef, useState } from "react";
import { capturePhoto } from "../features/camera/capturePhoto";
import { desktopApi } from "../features/desktop/desktopApi";
import { useCamera } from "../hooks/useCamera";
import { useControlVisibility } from "../hooks/useControlVisibility";
import { useMirrorSettings } from "../hooks/useMirrorSettings";
import { CameraErrorState } from "./CameraErrorState";
import { CameraPreview } from "./CameraPreview";
import { ControlBar } from "./ControlBar";
import { FillLight } from "./FillLight";
import { ToastRegion } from "./ToastRegion";

const CONTROL_REVEAL_EDGE_PX = 120;
const TOAST_DURATION_MS = 3200;

function isTypingTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLSelectElement ||
    target instanceof HTMLButtonElement ||
    target instanceof HTMLTextAreaElement
  );
}

export function MirrorView() {
  const { settings, patchSettings } = useMirrorSettings();
  const camera = useCamera(settings.selectedCameraId);
  const controls = useControlVisibility(settings.controlsPinned);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const initialAlwaysOnTop = useRef(settings.alwaysOnTop);
  const [toast, setToast] = useState("");
  const canCapture = camera.stream !== undefined && camera.error === undefined;

  const showWindowFailure = useCallback(() => {
    setToast("窗口操作失败，请重试。");
  }, []);

  const runWindowAction = useCallback(
    (action: () => Promise<void>) => {
      void action().catch(showWindowFailure);
    },
    [showWindowFailure],
  );

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer = window.setTimeout(() => setToast(""), TOAST_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [toast]);

  useEffect(() => {
    void desktopApi
      .setAlwaysOnTop(initialAlwaysOnTop.current)
      .catch(showWindowFailure);
  }, [showWindowFailure]);

  useEffect(() => {
    if (
      camera.cameraId !== undefined &&
      settings.selectedCameraId !== undefined &&
      camera.cameraId !== settings.selectedCameraId
    ) {
      setToast("摄像头已切换到可用设备。");
      patchSettings({ selectedCameraId: camera.cameraId });
    }
  }, [camera.cameraId, patchSettings, settings.selectedCameraId]);

  const selectCamera = useCallback(
    (deviceId?: string) => {
      patchSettings({ selectedCameraId: deviceId });
      void camera.selectCamera(deviceId);
    },
    [camera, patchSettings],
  );

  const takePhoto = useCallback(async () => {
    const video = videoRef.current;
    const viewport = viewportRef.current;
    if (!canCapture || !video || !viewport) {
      return;
    }

    try {
      const pngBytes = await capturePhoto(video, viewport, settings.zoom);
      const path = await desktopApi.savePhoto(pngBytes);
      setToast(`照片已保存：${path}`);
    } catch {
      setToast("照片保存失败，请重试。");
    }
  }, [canCapture, settings.zoom]);

  const toggleAlwaysOnTop = useCallback(() => {
    const nextAlwaysOnTop = !settings.alwaysOnTop;
    patchSettings({ alwaysOnTop: nextAlwaysOnTop });
    void desktopApi.setAlwaysOnTop(nextAlwaysOnTop).catch(() => {
      patchSettings({ alwaysOnTop: settings.alwaysOnTop });
      showWindowFailure();
    });
  }, [patchSettings, settings.alwaysOnTop, showWindowFailure]);

  const exitFullscreen = useCallback(() => {
    runWindowAction(desktopApi.exitFullscreen);
  }, [runWindowAction]);

  const toggleFullscreen = useCallback(() => {
    runWindowAction(desktopApi.toggleFullscreen);
  }, [runWindowAction]);

  const close = useCallback(() => {
    runWindowAction(desktopApi.close);
  }, [runWindowAction]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        exitFullscreen();
        return;
      }

      if (event.key === "F11") {
        event.preventDefault();
        toggleFullscreen();
        return;
      }

      if (event.ctrlKey && event.shiftKey && event.key.toLowerCase() === "t") {
        event.preventDefault();
        toggleAlwaysOnTop();
        return;
      }

      if (
        (event.key === " " || event.code === "Space") &&
        !isTypingTarget(event.target)
      ) {
        event.preventDefault();
        void takePhoto();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [exitFullscreen, takePhoto, toggleAlwaysOnTop, toggleFullscreen]);

  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (window.innerHeight - event.clientY <= CONTROL_REVEAL_EDGE_PX) {
        controls.reveal();
      }
    },
    [controls],
  );

  return (
    <div
      className={`mirror-shell mirror-shell--${settings.layout}`}
      onPointerMove={handlePointerMove}
    >
      <FillLight
        brightness={settings.brightness}
        colorTemperature={settings.colorTemperature}
        layout={settings.layout}
      />
      <main className="mirror-stage" aria-label="全屏镜子">
        <CameraPreview
          stream={camera.stream}
          zoom={settings.zoom}
          videoRef={videoRef}
          viewportRef={viewportRef}
        />
        {camera.error ? (
          <CameraErrorState error={camera.error} onRetry={camera.retry} />
        ) : null}
      </main>
      <ControlBar
        visible={controls.visible}
        settings={settings}
        cameras={camera.cameras}
        canCapture={canCapture}
        onPatchSettings={patchSettings}
        onSelectCamera={selectCamera}
        onCapture={takePhoto}
        onRetry={camera.retry}
        onToggleAlwaysOnTop={toggleAlwaysOnTop}
        onToggleFullscreen={toggleFullscreen}
        onExitFullscreen={exitFullscreen}
        onClose={close}
        onPointerEnter={controls.reveal}
        onPointerLeave={controls.scheduleHide}
      />
      <ToastRegion message={toast} />
    </div>
  );
}
