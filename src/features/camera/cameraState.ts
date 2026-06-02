export type CameraErrorKind = "permission-denied" | "no-device" | "stream-error";
export type CameraOption = Pick<MediaDeviceInfo, "deviceId" | "label">;

export function chooseCameraId(
  cameras: CameraOption[],
  preferred?: string,
): string | undefined {
  if (preferred && cameras.some((camera) => camera.deviceId === preferred)) {
    return preferred;
  }
  return cameras[0]?.deviceId;
}

export function classifyCameraError(error: unknown): CameraErrorKind {
  if (error instanceof DOMException && error.name === "NotAllowedError") {
    return "permission-denied";
  }
  if (
    error instanceof DOMException &&
    ["NotFoundError", "DevicesNotFoundError"].includes(error.name)
  ) {
    return "no-device";
  }
  return "stream-error";
}
