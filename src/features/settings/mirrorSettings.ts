export type FillLightLayout = "studio" | "frame";

export type MirrorSettings = {
  layout: FillLightLayout;
  brightness: number;
  colorTemperature: number;
  zoom: number;
  selectedCameraId?: string;
  controlsPinned: boolean;
  alwaysOnTop: boolean;
};

type StorageLike = Pick<Storage, "getItem" | "setItem">;

const SETTINGS_KEY = "mirror.settings.v1";
const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const numberInRange = (
  value: unknown,
  fallback: number,
  min: number,
  max: number,
) => {
  return typeof value === "number" && Number.isFinite(value)
    ? clamp(value, min, max)
    : fallback;
};

export const DEFAULT_SETTINGS: MirrorSettings = {
  layout: "studio",
  brightness: 78,
  colorTemperature: 58,
  zoom: 1,
  controlsPinned: false,
  alwaysOnTop: false,
};

export function normalizeSettings(value: unknown): MirrorSettings {
  const input =
    typeof value === "object" && value !== null
      ? (value as Partial<MirrorSettings>)
      : {};

  return {
    layout: input.layout === "frame" ? "frame" : "studio",
    brightness: numberInRange(input.brightness, DEFAULT_SETTINGS.brightness, 0, 100),
    colorTemperature: numberInRange(
      input.colorTemperature,
      DEFAULT_SETTINGS.colorTemperature,
      0,
      100,
    ),
    zoom: numberInRange(input.zoom, DEFAULT_SETTINGS.zoom, 1, 2),
    ...(typeof input.selectedCameraId === "string" && input.selectedCameraId
      ? { selectedCameraId: input.selectedCameraId }
      : {}),
    controlsPinned: input.controlsPinned === true,
    alwaysOnTop: input.alwaysOnTop === true,
  };
}

export function loadSettings(storage: StorageLike): MirrorSettings {
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    return raw ? normalizeSettings(JSON.parse(raw)) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(storage: StorageLike, settings: MirrorSettings): void {
  storage.setItem(SETTINGS_KEY, JSON.stringify(normalizeSettings(settings)));
}
