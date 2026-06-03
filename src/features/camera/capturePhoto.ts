import { computeCoverCrop } from "./captureGeometry";

export async function capturePhoto(
  video: HTMLVideoElement,
  viewport: HTMLElement,
  zoom: number,
): Promise<Uint8Array> {
  if (
    video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA ||
    video.videoWidth === 0 ||
    video.videoHeight === 0
  ) {
    throw new Error("The camera frame is not ready.");
  }

  const { sx, sy, sw, sh } = computeCoverCrop(
    video.videoWidth,
    video.videoHeight,
    viewport.clientWidth,
    viewport.clientHeight,
    zoom,
  );
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw));
  canvas.height = Math.max(1, Math.round(sh));
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Canvas is not available.");
  }

  context.translate(canvas.width, 0);
  context.scale(-1, 1);
  context.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (!nextBlob) {
        reject(new Error("PNG capture failed."));
        return;
      }

      resolve(nextBlob);
    }, "image/png");
  });

  return new Uint8Array(await blob.arrayBuffer());
}
