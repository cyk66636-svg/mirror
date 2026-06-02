import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCamera } from "./useCamera";

const originalMediaDevices = Object.getOwnPropertyDescriptor(
  navigator,
  "mediaDevices",
);

function camera(deviceId: string, label = deviceId): MediaDeviceInfo {
  return {
    deviceId,
    groupId: "",
    kind: "videoinput",
    label,
    toJSON: () => ({}),
  };
}

function track(deviceId?: string) {
  return {
    getSettings: vi.fn(() => ({ deviceId })),
    stop: vi.fn(),
  } as unknown as MediaStreamTrack;
}

function stream(videoTrack: MediaStreamTrack) {
  return {
    getTracks: vi.fn(() => [videoTrack]),
    getVideoTracks: vi.fn(() => [videoTrack]),
  } as unknown as MediaStream;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((next) => {
    resolve = next;
  });
  return { promise, resolve };
}

function installMediaDevices({
  devices = [camera("front", "Front camera")],
  getUserMedia = vi.fn(),
}: {
  devices?: MediaDeviceInfo[];
  getUserMedia?: ReturnType<typeof vi.fn>;
} = {}) {
  const enumerateDevices = vi.fn().mockResolvedValue(devices);
  const addEventListener = vi.fn();
  const removeEventListener = vi.fn();
  const mediaDevices = {
    enumerateDevices,
    getUserMedia,
    addEventListener,
    removeEventListener,
  } as unknown as MediaDevices;

  Object.defineProperty(navigator, "mediaDevices", {
    configurable: true,
    value: mediaDevices,
  });

  return {
    addEventListener,
    enumerateDevices,
    getUserMedia,
    mediaDevices,
    removeEventListener,
  };
}

afterEach(() => {
  if (originalMediaDevices) {
    Object.defineProperty(navigator, "mediaDevices", originalMediaDevices);
  } else {
    Reflect.deleteProperty(navigator, "mediaDevices");
  }
});

describe("useCamera", () => {
  it("starts the preferred camera, refreshes labels, and cleans up on unmount", async () => {
    const videoTrack = track("usb");
    const activeStream = stream(videoTrack);
    const media = installMediaDevices({
      devices: [camera("usb", "")],
      getUserMedia: vi.fn().mockResolvedValue(activeStream),
    });
    media.enumerateDevices
      .mockResolvedValueOnce([camera("usb", "")])
      .mockResolvedValueOnce([camera("usb", "USB camera")]);

    const { result, unmount } = renderHook(() => useCamera("usb"));

    await waitFor(() => expect(result.current.stream).toBe(activeStream));
    expect(media.enumerateDevices).toHaveBeenCalledTimes(2);
    expect(media.getUserMedia).toHaveBeenCalledWith({
      video: { deviceId: { exact: "usb" } },
      audio: false,
    });
    expect(result.current.cameraId).toBe("usb");
    expect(result.current.cameras[0]?.label).toBe("USB camera");
    expect(media.addEventListener).toHaveBeenCalledWith(
      "devicechange",
      expect.any(Function),
    );

    const changeListener = media.addEventListener.mock.calls[0]?.[1];
    unmount();

    expect(media.removeEventListener).toHaveBeenCalledWith(
      "devicechange",
      changeListener,
    );
    expect(videoTrack.stop).toHaveBeenCalledOnce();
  });

  it("stops a newly acquired stream promptly when unmounted during refresh", async () => {
    const videoTrack = track("front");
    const activeStream = stream(videoTrack);
    const pendingRefresh = deferred<MediaDeviceInfo[]>();
    const media = installMediaDevices({
      devices: [camera("front")],
      getUserMedia: vi.fn().mockResolvedValue(activeStream),
    });
    media.enumerateDevices
      .mockResolvedValueOnce([camera("front")])
      .mockReturnValueOnce(pendingRefresh.promise);

    const { unmount } = renderHook(() => useCamera("front"));
    await waitFor(() => expect(media.enumerateDevices).toHaveBeenCalledTimes(2));

    unmount();

    expect(videoTrack.stop).toHaveBeenCalledOnce();

    await act(async () => {
      pendingRefresh.resolve([camera("front")]);
      await pendingRefresh.promise;
    });
    expect(videoTrack.stop).toHaveBeenCalledOnce();
  });

  it("falls back before startup when the preferred camera is disconnected", async () => {
    const activeStream = stream(track("front"));
    const media = installMediaDevices({
      devices: [camera("front", "Front camera")],
      getUserMedia: vi.fn().mockResolvedValue(activeStream),
    });

    const { result } = renderHook(() => useCamera("missing"));

    await waitFor(() => expect(result.current.stream).toBe(activeStream));
    expect(media.getUserMedia).toHaveBeenCalledWith({
      video: { deviceId: { exact: "front" } },
      audio: false,
    });
    expect(result.current.cameraId).toBe("front");
  });

  it("stops the previous stream when selecting another camera", async () => {
    const frontTrack = track("front");
    const usbTrack = track("usb");
    const frontStream = stream(frontTrack);
    const usbStream = stream(usbTrack);
    const media = installMediaDevices({
      devices: [camera("front"), camera("usb")],
      getUserMedia: vi
        .fn()
        .mockResolvedValueOnce(frontStream)
        .mockResolvedValueOnce(usbStream),
    });
    const { result } = renderHook(() => useCamera("front"));
    await waitFor(() => expect(result.current.stream).toBe(frontStream));

    await act(() => result.current.selectCamera("usb"));

    expect(result.current.stream).toBe(usbStream);
    expect(result.current.cameraId).toBe("usb");
    expect(frontTrack.stop).toHaveBeenCalledOnce();
    expect(media.getUserMedia).toHaveBeenLastCalledWith({
      video: { deviceId: { exact: "usb" } },
      audio: false,
    });
  });

  it("stops a stale stream instead of replacing a newer stream", async () => {
    const frontTrack = track("front");
    const usbTrack = track("usb");
    const frontStream = stream(frontTrack);
    const usbStream = stream(usbTrack);
    const pendingFront = deferred<MediaStream>();
    const media = installMediaDevices({
      devices: [camera("front"), camera("usb")],
      getUserMedia: vi
        .fn()
        .mockReturnValueOnce(pendingFront.promise)
        .mockResolvedValueOnce(usbStream),
    });
    const { result } = renderHook(() => useCamera("front"));

    await waitFor(() => expect(media.getUserMedia).toHaveBeenCalledOnce());
    await act(() => result.current.selectCamera("usb"));
    expect(result.current.stream).toBe(usbStream);

    await act(async () => {
      pendingFront.resolve(frontStream);
      await pendingFront.promise;
    });

    expect(result.current.stream).toBe(usbStream);
    expect(result.current.cameraId).toBe("usb");
    expect(frontTrack.stop).toHaveBeenCalledOnce();
    expect(usbTrack.stop).not.toHaveBeenCalled();
  });

  it("retries the active camera after a startup failure", async () => {
    const activeStream = stream(track("front"));
    const media = installMediaDevices({
      devices: [camera("front")],
      getUserMedia: vi
        .fn()
        .mockRejectedValueOnce(new DOMException("", "NotAllowedError"))
        .mockResolvedValueOnce(activeStream),
    });
    const { result } = renderHook(() => useCamera("front"));
    await waitFor(() => expect(result.current.error).toBe("permission-denied"));

    await act(() => result.current.retry());

    expect(result.current.stream).toBe(activeStream);
    expect(media.getUserMedia).toHaveBeenLastCalledWith({
      video: { deviceId: { exact: "front" } },
      audio: false,
    });
  });

  it("retries a failed camera switch with the requested camera", async () => {
    const frontStream = stream(track("front"));
    const usbStream = stream(track("usb"));
    const media = installMediaDevices({
      devices: [camera("front"), camera("usb")],
      getUserMedia: vi
        .fn()
        .mockResolvedValueOnce(frontStream)
        .mockRejectedValueOnce(new Error("switch failed"))
        .mockResolvedValueOnce(usbStream),
    });
    const { result } = renderHook(() => useCamera("front"));
    await waitFor(() => expect(result.current.stream).toBe(frontStream));

    await act(() => result.current.selectCamera("usb"));
    expect(result.current.error).toBe("stream-error");

    await act(() => result.current.retry());

    expect(result.current.stream).toBe(usbStream);
    expect(media.getUserMedia).toHaveBeenLastCalledWith({
      video: { deviceId: { exact: "usb" } },
      audio: false,
    });
  });

  it("falls back to a refreshed camera when the acquired track omits its device id", async () => {
    const activeStream = stream(track());
    const media = installMediaDevices({
      getUserMedia: vi.fn().mockResolvedValue(activeStream),
    });
    media.enumerateDevices
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([camera("front")]);
    const { result } = renderHook(() => useCamera());

    await waitFor(() => expect(result.current.stream).toBe(activeStream));

    expect(media.getUserMedia).toHaveBeenCalledWith({
      video: true,
      audio: false,
    });
    expect(result.current.cameraId).toBe("front");
  });

  it("switches to an attached fallback camera after the active camera is removed", async () => {
    const frontTrack = track("front");
    const usbTrack = track("usb");
    const frontStream = stream(frontTrack);
    const usbStream = stream(usbTrack);
    const media = installMediaDevices({
      devices: [camera("front"), camera("usb")],
      getUserMedia: vi
        .fn()
        .mockResolvedValueOnce(frontStream)
        .mockResolvedValueOnce(usbStream),
    });
    media.enumerateDevices
      .mockResolvedValueOnce([camera("front"), camera("usb")])
      .mockResolvedValueOnce([camera("front"), camera("usb")])
      .mockResolvedValue([camera("usb")]);
    const { result } = renderHook(() => useCamera("front"));
    await waitFor(() => expect(result.current.stream).toBe(frontStream));
    const changeListener = media.addEventListener.mock.calls[0]?.[1] as () => void;

    await act(async () => {
      changeListener();
    });
    await waitFor(() => expect(result.current.stream).toBe(usbStream));

    expect(frontTrack.stop).toHaveBeenCalledOnce();
    expect(media.getUserMedia).toHaveBeenLastCalledWith({
      video: { deviceId: { exact: "usb" } },
      audio: false,
    });
    expect(result.current.cameras.map(({ deviceId }) => deviceId)).toEqual([
      "usb",
    ]);
    expect(result.current.cameraId).toBe("usb");
  });

  it("refreshes camera options without restarting when another camera is connected", async () => {
    const frontTrack = track("front");
    const frontStream = stream(frontTrack);
    const media = installMediaDevices({
      devices: [camera("front"), camera("usb")],
      getUserMedia: vi.fn().mockResolvedValue(frontStream),
    });
    media.enumerateDevices
      .mockResolvedValueOnce([camera("front")])
      .mockResolvedValueOnce([camera("front")])
      .mockResolvedValueOnce([camera("front"), camera("usb")]);
    const { result } = renderHook(() => useCamera("front"));
    await waitFor(() => expect(result.current.stream).toBe(frontStream));
    const changeListener = media.addEventListener.mock.calls[0]?.[1] as () => void;

    await act(async () => {
      changeListener();
    });
    await waitFor(() => expect(result.current.cameras).toHaveLength(2));

    expect(result.current.stream).toBe(frontStream);
    expect(media.getUserMedia).toHaveBeenCalledOnce();
    expect(frontTrack.stop).not.toHaveBeenCalled();
  });

  it("ignores a stale camera inventory when device changes overlap", async () => {
    const frontTrack = track("front");
    const frontStream = stream(frontTrack);
    const usbStream = stream(track("usb"));
    const olderRefresh = deferred<MediaDeviceInfo[]>();
    const newerRefresh = deferred<MediaDeviceInfo[]>();
    const media = installMediaDevices({
      devices: [camera("usb")],
      getUserMedia: vi
        .fn()
        .mockResolvedValueOnce(frontStream)
        .mockResolvedValueOnce(usbStream),
    });
    media.enumerateDevices
      .mockResolvedValueOnce([camera("front")])
      .mockResolvedValueOnce([camera("front")])
      .mockReturnValueOnce(olderRefresh.promise)
      .mockReturnValueOnce(newerRefresh.promise);
    const { result } = renderHook(() => useCamera("front"));
    await waitFor(() => expect(result.current.stream).toBe(frontStream));
    const changeListener = media.addEventListener.mock.calls[0]?.[1] as () => void;

    act(() => {
      changeListener();
      changeListener();
    });
    await waitFor(() => expect(media.enumerateDevices).toHaveBeenCalledTimes(4));

    await act(async () => {
      newerRefresh.resolve([camera("front"), camera("usb")]);
      await newerRefresh.promise;
    });
    await waitFor(() => expect(result.current.cameras).toHaveLength(2));

    await act(async () => {
      olderRefresh.resolve([camera("usb")]);
      await olderRefresh.promise;
    });

    expect(result.current.cameras.map(({ deviceId }) => deviceId)).toEqual([
      "front",
      "usb",
    ]);
    expect(result.current.stream).toBe(frontStream);
    expect(media.getUserMedia).toHaveBeenCalledOnce();
    expect(frontTrack.stop).not.toHaveBeenCalled();
  });

  it("reports a stream error when media devices are unavailable", async () => {
    Reflect.deleteProperty(navigator, "mediaDevices");

    const { result } = renderHook(() => useCamera());

    await waitFor(() => expect(result.current.error).toBe("stream-error"));
    expect(result.current.stream).toBeUndefined();
  });
});
