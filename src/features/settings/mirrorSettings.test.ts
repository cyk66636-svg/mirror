import { describe, expect, it } from "vitest";
import {
  DEFAULT_SETTINGS,
  loadSettings,
  normalizeSettings,
  saveSettings,
} from "./mirrorSettings";

describe("mirror settings", () => {
  it("clamps malformed persisted values", () => {
    expect(
      normalizeSettings({
        layout: "frame",
        brightness: 500,
        colorTemperature: -4,
        zoom: 9,
        controlsPinned: true,
        alwaysOnTop: true,
      }),
    ).toEqual({
      layout: "frame",
      brightness: 100,
      colorTemperature: 0,
      zoom: 2,
      controlsPinned: true,
      alwaysOnTop: true,
    });
  });

  it("falls back to defaults for invalid JSON", () => {
    const storage = { getItem: () => "{", setItem: () => undefined };
    const settings = loadSettings(storage);
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(settings).not.toBe(DEFAULT_SETTINGS);
  });

  it("returns independent defaults when stored settings are missing", () => {
    const storage = { getItem: () => null, setItem: () => undefined };
    const first = loadSettings(storage);
    const defaultBrightness = DEFAULT_SETTINGS.brightness;

    try {
      first.brightness = 0;
      const second = loadSettings(storage);
      expect(second.brightness).toBe(78);
      expect(first).not.toBe(second);
    } finally {
      DEFAULT_SETTINGS.brightness = defaultBrightness;
    }
  });

  it("stores normalized settings", () => {
    let saved = "";
    const storage = {
      getItem: () => null,
      setItem: (_key: string, value: string) => {
        saved = value;
      },
    };
    saveSettings(storage, { ...DEFAULT_SETTINGS, zoom: 99 });
    expect(JSON.parse(saved).zoom).toBe(2);
  });

  it("replaces non-numeric values with defaults", () => {
    expect(normalizeSettings({ brightness: "bright" }).brightness).toBe(78);
  });

  it.each([null, true, "12"])(
    "does not coerce non-number brightness value %j",
    (brightness) => {
      expect(normalizeSettings({ brightness }).brightness).toBe(78);
    },
  );

  it.each([NaN, Infinity, -Infinity])(
    "replaces non-finite brightness value %j with the default",
    (brightness) => {
      expect(normalizeSettings({ brightness }).brightness).toBe(78);
    },
  );
});
