import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS } from "../features/settings/mirrorSettings";
import { useMirrorSettings } from "./useMirrorSettings";

const SETTINGS_KEY = "mirror.settings.v1";

beforeEach(() => {
  localStorage.clear();
});

describe("useMirrorSettings", () => {
  it("loads validated persisted settings", () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({
        ...DEFAULT_SETTINGS,
        layout: "frame",
        brightness: 32,
        zoom: 99,
      }),
    );

    const { result } = renderHook(() => useMirrorSettings());

    expect(result.current.settings).toEqual({
      ...DEFAULT_SETTINGS,
      layout: "frame",
      brightness: 32,
      zoom: 2,
    });
  });

  it("retains two patches applied in one React batch", () => {
    const { result } = renderHook(() => useMirrorSettings());

    act(() => {
      result.current.patchSettings({ brightness: 14 });
      result.current.patchSettings({ alwaysOnTop: true });
    });

    expect(result.current.settings.brightness).toBe(14);
    expect(result.current.settings.alwaysOnTop).toBe(true);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}")).toMatchObject({
      brightness: 14,
      alwaysOnTop: true,
    });
  });

  it("normalizes patched zoom before updating state and storage", () => {
    const { result } = renderHook(() => useMirrorSettings());

    act(() => {
      result.current.patchSettings({ zoom: 99 });
    });

    expect(result.current.settings.zoom).toBe(2);
    expect(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}").zoom).toBe(2);
  });
});
