import { afterEach, describe, expect, it, vi } from "vitest";
import { capturePhoto } from "./capturePhoto";

function video(
  videoWidth = 1920,
  videoHeight = 1080,
  readyState: number = HTMLMediaElement.HAVE_CURRENT_DATA,
) {
  return { readyState, videoWidth, videoHeight } as HTMLVideoElement;
}

function viewport(clientWidth = 500, clientHeight = 500) {
  return { clientWidth, clientHeight } as HTMLElement;
}

function context() {
  return {
    drawImage: vi.fn(),
    scale: vi.fn(),
    translate: vi.fn(),
  } as unknown as CanvasRenderingContext2D;
}

function installCanvas(
  drawingContext: CanvasRenderingContext2D | null,
  blob: Blob | null = null,
) {
  const canvas = {
    getContext: vi.fn(() => drawingContext),
    height: 0,
    toBlob: vi.fn((callback: BlobCallback) => callback(blob)),
    width: 0,
  } as unknown as HTMLCanvasElement;
  const createElement = vi
    .spyOn(document, "createElement")
    .mockReturnValue(canvas);

  return { canvas, createElement };
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("capturePhoto", () => {
  it("rejects a camera frame that is not ready before creating a canvas", async () => {
    const createElement = vi.spyOn(document, "createElement");

    await expect(capturePhoto(video(0), viewport(), 1)).rejects.toThrow(
      new Error("The camera frame is not ready."),
    );
    expect(createElement).not.toHaveBeenCalled();
  });

  it("rejects a camera frame without current image data before creating a canvas", async () => {
    const createElement = vi.spyOn(document, "createElement");

    await expect(
      capturePhoto(video(1920, 1080, HTMLMediaElement.HAVE_METADATA), viewport(), 1),
    ).rejects.toThrow(new Error("The camera frame is not ready."));
    expect(createElement).not.toHaveBeenCalled();
  });

  it("captures the mirrored cover crop as PNG bytes", async () => {
    const drawingContext = context();
    const blob = {
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([1, 2, 3]).buffer),
    } as unknown as Blob;
    const { canvas, createElement } = installCanvas(drawingContext, blob);
    const cameraFrame = video(1919, 1079);

    const pngBytes = await capturePhoto(cameraFrame, viewport(), 2);

    expect(createElement).toHaveBeenCalledWith("canvas");
    expect(canvas.width).toBe(540);
    expect(canvas.height).toBe(540);
    expect(canvas.getContext).toHaveBeenCalledWith("2d");
    expect(drawingContext.translate).toHaveBeenCalledWith(540, 0);
    expect(drawingContext.scale).toHaveBeenCalledWith(-1, 1);
    expect(drawingContext.drawImage).toHaveBeenCalledWith(
      cameraFrame,
      689.75,
      269.75,
      539.5,
      539.5,
      0,
      0,
      540,
      540,
    );
    expect(canvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      "image/png",
    );
    expect(pngBytes).toEqual(new Uint8Array([1, 2, 3]));
  });

  it("rounds tiny positive crop dimensions up to a drawable canvas pixel", async () => {
    const drawingContext = context();
    const blob = {
      arrayBuffer: vi.fn().mockResolvedValue(new Uint8Array([4]).buffer),
    } as unknown as Blob;
    const { canvas } = installCanvas(drawingContext, blob);

    const cameraFrame = video(0.4, 1000);

    await capturePhoto(cameraFrame, viewport(1, 5000), 1);

    expect(canvas.width).toBe(1);
    expect(canvas.height).toBe(1000);
    expect(drawingContext.drawImage).toHaveBeenCalledWith(
      cameraFrame,
      0.1,
      0,
      0.2,
      1000,
      0,
      0,
      1,
      1000,
    );
  });

  it("rejects when a 2d canvas context is unavailable", async () => {
    installCanvas(null);

    await expect(capturePhoto(video(), viewport(), 1)).rejects.toThrow(
      new Error("Canvas is not available."),
    );
  });

  it("rejects when PNG encoding fails", async () => {
    installCanvas(context());

    await expect(capturePhoto(video(), viewport(), 1)).rejects.toThrow(
      new Error("PNG capture failed."),
    );
  });

  it("propagates a zero viewport width error", async () => {
    const createElement = vi.spyOn(document, "createElement");

    await expect(capturePhoto(video(), viewport(0), 1)).rejects.toThrow(
      new RangeError("Viewport dimensions must be positive finite numbers."),
    );
    expect(createElement).not.toHaveBeenCalled();
  });
});
