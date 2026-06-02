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

export function useCamera(preferredCameraId?: string) {
  const [stream, setStream] = useState<MediaStream>();
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [cameraId, setCameraId] = useState<string>();
  const [error, setError] = useState<CameraErrorKind>();
  const activeStream = useRef<MediaStream | undefined>(undefined);
  const activeCameraId = useRef(preferredCameraId);
  const requestGeneration = useRef(0);

  const stop = useCallback(() => {
    stopTracks(activeStream.current);
    activeStream.current = undefined;
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
        nextStream = await mediaDevices.getUserMedia({
          video: nextCameraId ? { deviceId: { exact: nextCameraId } } : true,
          audio: false,
        });
        if (generation !== requestGeneration.current) {
          stopTracks(nextStream);
          return;
        }

        const refreshed = videoInputs(await mediaDevices.enumerateDevices());
        if (generation !== requestGeneration.current) {
          stopTracks(nextStream);
          return;
        }

        const actualCameraId =
          nextStream.getVideoTracks()[0]?.getSettings().deviceId ?? nextCameraId;
        activeStream.current = nextStream;
        activeCameraId.current = actualCameraId;
        setStream(nextStream);
        setCameras(refreshed);
        setCameraId(actualCameraId);
      } catch (cause) {
        stopTracks(nextStream);
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
    const refresh = () => void start(activeCameraId.current);

    void start(activeCameraId.current);
    mediaDevices?.addEventListener("devicechange", refresh);

    return () => {
      ++requestGeneration.current;
      mediaDevices?.removeEventListener("devicechange", refresh);
      stop();
    };
  }, [start, stop]);

  return {
    stream,
    cameras,
    cameraId,
    error,
    retry: () => start(activeCameraId.current),
    selectCamera: (nextCameraId: string) => start(nextCameraId),
  };
}
