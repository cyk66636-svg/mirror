import { describe, expect, it } from "vitest";
import { chooseCameraId, classifyCameraError } from "./cameraState";

describe("camera state", () => {
  const cameras = [
    { deviceId: "front", label: "Front camera" },
    { deviceId: "usb", label: "USB camera" },
  ];

  it("keeps the selected camera when it is still attached", () => {
    expect(chooseCameraId(cameras, "usb")).toBe("usb");
  });

  it("falls back to the first camera when the saved device is gone", () => {
    expect(chooseCameraId(cameras, "missing")).toBe("front");
  });

  it("classifies denied permission", () => {
    expect(classifyCameraError(new DOMException("", "NotAllowedError"))).toBe(
      "permission-denied",
    );
  });

  it.each(["NotFoundError", "DevicesNotFoundError"])(
    "classifies %s as no device",
    (name) => {
      expect(classifyCameraError(new DOMException("", name))).toBe("no-device");
    },
  );

  it("classifies unknown errors as stream errors", () => {
    expect(classifyCameraError(new Error("unknown"))).toBe("stream-error");
  });
});
