import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useControlVisibility } from "./useControlVisibility";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useControlVisibility", () => {
  it.each([
    [false, false],
    [true, true],
  ])("starts with visibility matching pinned=%s", (pinned, visible) => {
    const { result } = renderHook(() => useControlVisibility(pinned));

    expect(result.current.visible).toBe(visible);
  });

  it("reveals controls and clears a pending hide", () => {
    const { result } = renderHook(() => useControlVisibility(false));

    act(() => {
      result.current.reveal();
      result.current.scheduleHide();
      vi.advanceTimersByTime(600);
      result.current.reveal();
      vi.advanceTimersByTime(1200);
    });

    expect(result.current.visible).toBe(true);
  });

  it("hides unpinned controls after the delay", () => {
    const { result } = renderHook(() => useControlVisibility(false));

    act(() => {
      result.current.reveal();
      result.current.scheduleHide();
      vi.advanceTimersByTime(1199);
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.visible).toBe(false);
  });

  it("restarts the delay when hiding is scheduled again", () => {
    const { result } = renderHook(() => useControlVisibility(false));

    act(() => {
      result.current.reveal();
      result.current.scheduleHide();
      vi.advanceTimersByTime(600);
      result.current.scheduleHide();
      vi.advanceTimersByTime(600);
    });
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(result.current.visible).toBe(false);
  });

  it("keeps pinned controls visible when a scheduled hide runs", () => {
    const { result } = renderHook(() => useControlVisibility(true));

    act(() => {
      result.current.scheduleHide();
      vi.advanceTimersByTime(1200);
    });

    expect(result.current.visible).toBe(true);
  });

  it("reveals controls when they become pinned without hiding on unpin", () => {
    const { result, rerender } = renderHook(
      ({ pinned }) => useControlVisibility(pinned),
      { initialProps: { pinned: false } },
    );

    rerender({ pinned: true });
    expect(result.current.visible).toBe(true);

    rerender({ pinned: false });
    expect(result.current.visible).toBe(true);
  });

  it("uses the latest pinned value when a pending hide runs", () => {
    const { result, rerender } = renderHook(
      ({ pinned }) => useControlVisibility(pinned),
      { initialProps: { pinned: true } },
    );

    act(() => {
      result.current.scheduleHide();
    });
    rerender({ pinned: false });
    expect(result.current.visible).toBe(true);

    act(() => {
      vi.advanceTimersByTime(1200);
    });
    expect(result.current.visible).toBe(false);
  });

  it("keeps callbacks stable when pinned changes", () => {
    const { result, rerender } = renderHook(
      ({ pinned }) => useControlVisibility(pinned),
      { initialProps: { pinned: false } },
    );
    const { reveal, scheduleHide } = result.current;

    rerender({ pinned: true });

    expect(result.current.reveal).toBe(reveal);
    expect(result.current.scheduleHide).toBe(scheduleHide);
  });

  it("clears a pending hide on cleanup", () => {
    const { result, unmount } = renderHook(() => useControlVisibility(false));

    act(() => {
      result.current.scheduleHide();
    });
    expect(vi.getTimerCount()).toBe(1);

    unmount();

    expect(vi.getTimerCount()).toBe(0);
  });
});
