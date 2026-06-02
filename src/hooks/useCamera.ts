import { useCallback, useEffect, useRef, useState } from "react";
import {
  chooseCameraId,
  classifyCameraError,
  type CameraErrorKind,
} from "../features/camera/cameraState";

function stopTracks(stream?: MediaStream): void {
  stream?.getTracks().forEach((track) => track.stop());
}

function videoInputs(devices: MediaDeviceInfo[]): MediaDeviceInfo[] {
  return devices.filter((device) => device.kind === "videoinput");
}

export function useCamera(initialCameraId?: string) {
  const [stream, setStream] = useState<MediaStream>();
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState<string>();
  const [error, setError] = useState<CameraErrorKind>();
  const activeStream = useRef<MediaStream | undefined>(undefined);
  const activeStreamGeneration = useRef<number | undefined>(undefined);
  const activeCameraId = useRef<string | undefined>(undefined);
  const retryCameraId = useRef(initialCameraId);
  const requestGeneration = useRef(0);

  const stop = useCallback(() => {
    const currentStream = activeStream.current;
    activeStream.current = undefined;
    activeStreamGeneration.current = undefined;
    activeCameraId.current = undefined;
    stopTracks(currentStream);
  }, []);

  const start = useCallback(
    async (requestedId?: string) => {
      const generation = ++requestGeneration.current;
      let nextStream: MediaStream | undefined;

      stop();
      setStream(undefined);
      setError(undefined);

      try {
        const mediaDevices = navigator.mediaDevices;
        if (!mediaDevices) {
          throw new Error("Media devices are unavailable.");
        }

        const available = videoInputs(await mediaDevices.enumerateDevices());
        if (generation !== requestGeneration.current) {
          return;
        }
        setCameras(available);

        const nextCameraId = chooseCameraId(available, requestedId);
        retryCameraId.current = nextCameraId;
        nextStream = await mediaDevices.getUserMedia({
          video: nextCameraId ? { deviceId: { exact: nextCameraId } } : true,
          audio: false,
        });
        if (generation !== requestGeneration.current) {
          stopTracks(nextStream);
          return;
        }
        activeStream.current = nextStream;
        activeStreamGeneration.current = generation;

        const refreshed = videoInputs(await mediaDevices.enumerateDevices());
        if (generation !== requestGeneration.current) {
          if (
            activeStream.current === nextStream &&
            activeStreamGeneration.current === generation
          ) {
            stop();
          }
          return;
        }

        const actualCameraId =
          nextStream.getVideoTracks()[0]?.getSettings().deviceId ??
          chooseCameraId(refreshed, nextCameraId);
        activeCameraId.current = actualCameraId;
        retryCameraId.current = actualCameraId;
        setStream(nextStream);
        setCameras(refreshed);
        setCameraId(actualCameraId);
      } catch (cause) {
        if (
          activeStream.current === nextStream &&
          activeStreamGeneration.current === generation
        ) {
          stop();
        }
        if (generation !== requestGeneration.current) {
          return;
        }
        stop();
        setStream(undefined);
        setError(classifyCameraError(cause));
      }
    },
    [stop],
  );

  useEffect(() => {
    const mediaDevices = navigator.mediaDevices;
    let disposed = false;
    const refresh = async () => {
      try {
        const available = videoInputs(await mediaDevices.enumerateDevices());
        if (disposed) {
          return;
        }
        setCameras(available);

        const activeId = activeCameraId.current;
        const fallbackId = chooseCameraId(
          available,
          activeId ?? retryCameraId.current,
        );
        const activeCameraMissing =
          activeId !== undefined &&
          !available.some((device) => device.deviceId === activeId);
        if (
          activeCameraMissing ||
          (activeStream.current === undefined && fallbackId !== undefined)
        ) {
          void start(fallbackId);
        }
      } catch {
        // Keep an active stream running if a device inventory refresh fails.
      }
    };
    const handleDeviceChange = () => void refresh();

    void start(retryCameraId.current);
    mediaDevices?.addEventListener("devicechange", handleDeviceChange);

    return () => {
      disposed = true;
      ++requestGeneration.current;
      mediaDevices?.removeEventListener("devicechange", handleDeviceChange);
      stop();
    };
  }, [start, stop]);

  return {
    stream,
    cameras,
    cameraId,
    error,
    retry: () => start(retryCameraId.current),
    selectCamera: (nextCameraId: string) => start(nextCameraId),
  };
}
