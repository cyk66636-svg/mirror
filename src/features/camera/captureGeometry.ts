export type Crop = { sx: number; sy: number; sw: number; sh: number };

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

export function computeCoverCrop(
  sourceWidth: number,
  sourceHeight: number,
  viewportWidth: number,
  viewportHeight: number,
  zoom: number,
): Crop {
  const sourceAspectRatio = sourceWidth / sourceHeight;
  const viewportAspectRatio = viewportWidth / viewportHeight;
  const baseWidth =
    sourceAspectRatio > viewportAspectRatio
      ? sourceHeight * viewportAspectRatio
      : sourceWidth;
  const baseHeight =
    sourceAspectRatio > viewportAspectRatio
      ? sourceHeight
      : sourceWidth / viewportAspectRatio;
  const appliedZoom = clamp(zoom, 1, 2);
  const sw = baseWidth / appliedZoom;
  const sh = baseHeight / appliedZoom;

  return {
    sx: (sourceWidth - sw) / 2,
    sy: (sourceHeight - sh) / 2,
    sw,
    sh,
  };
}
