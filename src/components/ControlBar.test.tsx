import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SETTINGS,
  type MirrorSettings,
} from "../features/settings/mirrorSettings";
import { ControlBar } from "./ControlBar";

function camera(deviceId: string, label: string): MediaDeviceInfo {
  return {
    deviceId,
    groupId: "",
    kind: "videoinput",
    label,
    toJSON: () => ({}),
  };
}

function renderControlBar(settings: MirrorSettings = DEFAULT_SETTINGS) {
  const props = {
    visible: true,
    settings,
    cameras: [camera("front", "Front camera"), camera("usb", "USB camera")],
    onPatchSettings: vi.fn(),
    onSelectCamera: vi.fn(),
    onCapture: vi.fn(),
    onToggleAlwaysOnTop: vi.fn(),
    onExitFullscreen: vi.fn(),
    onClose: vi.fn(),
    onPointerEnter: vi.fn(),
    onPointerLeave: vi.fn(),
  };

  return { ...render(<ControlBar {...props} />), props };
}

describe("ControlBar", () => {
  afterEach(() => {
    cleanup();
  });

  it("toggles the visible class and uses button controls", () => {
    const { rerender, props } = renderControlBar();
    const bar = screen.getByLabelText("镜子控制面板");

    expect(bar).toHaveClass("control-bar", "is-visible");
    screen.getAllByRole("button").forEach((button) => {
      expect(button).toHaveAttribute("type", "button");
    });

    rerender(<ControlBar {...props} visible={false} />);

    expect(bar).not.toHaveClass("is-visible");
  });

  it("patches layout, ranges, and pin state", async () => {
    const user = userEvent.setup();
    const { props } = renderControlBar({
      ...DEFAULT_SETTINGS,
      layout: "studio",
      controlsPinned: false,
    });

    await user.click(screen.getByRole("button", { name: "灯框" }));
    fireEvent.change(screen.getByLabelText("亮度"), {
      target: { value: "42" },
    });
    fireEvent.change(screen.getByLabelText("色温"), {
      target: { value: "64" },
    });
    fireEvent.change(screen.getByLabelText("缩放"), {
      target: { value: "1.35" },
    });
    await user.click(screen.getByRole("button", { name: "固定面板" }));

    expect(props.onPatchSettings).toHaveBeenCalledWith({ layout: "frame" });
    expect(props.onPatchSettings).toHaveBeenCalledWith({ brightness: 42 });
    expect(props.onPatchSettings).toHaveBeenCalledWith({ colorTemperature: 64 });
    expect(props.onPatchSettings).toHaveBeenCalledWith({ zoom: 1.35 });
    expect(props.onPatchSettings).toHaveBeenCalledWith({
      controlsPinned: true,
    });
  });

  it("selects cameras and invokes action buttons", async () => {
    const user = userEvent.setup();
    const { props } = renderControlBar();

    fireEvent.change(screen.getByLabelText("选择摄像头"), {
      target: { value: "usb" },
    });
    await user.click(screen.getByRole("button", { name: "拍照" }));
    await user.click(screen.getByRole("button", { name: "窗口置顶" }));
    await user.click(screen.getByRole("button", { name: "退出全屏" }));
    await user.click(screen.getByRole("button", { name: "关闭" }));

    expect(props.onSelectCamera).toHaveBeenCalledWith("usb");
    expect(props.onCapture).toHaveBeenCalledOnce();
    expect(props.onToggleAlwaysOnTop).toHaveBeenCalledOnce();
    expect(props.onExitFullscreen).toHaveBeenCalledOnce();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("notifies when the pointer enters and leaves the bar", () => {
    const { props } = renderControlBar();
    const bar = screen.getByLabelText("镜子控制面板");

    fireEvent.pointerEnter(bar);
    fireEvent.pointerLeave(bar);

    expect(props.onPointerEnter).toHaveBeenCalledOnce();
    expect(props.onPointerLeave).toHaveBeenCalledOnce();
  });
});
