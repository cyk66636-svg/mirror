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

function renderControlBar({
  visible = true,
  settings = DEFAULT_SETTINGS,
  cameras = [camera("front", "Front camera"), camera("usb", "USB camera")],
  canCapture = true,
}: {
  visible?: boolean;
  settings?: MirrorSettings;
  cameras?: MediaDeviceInfo[];
  canCapture?: boolean;
} = {}) {
  const props = {
    visible,
    settings,
    cameras,
    canCapture,
    onPatchSettings: vi.fn(),
    onSelectCamera: vi.fn(),
    onCapture: vi.fn(),
    onRetry: vi.fn(),
    onToggleAlwaysOnTop: vi.fn(),
    onToggleFullscreen: vi.fn(),
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
    expect(bar).not.toHaveAttribute("aria-hidden");
    expect(bar).not.toHaveAttribute("inert");
    screen.getAllByRole("button").forEach((button) => {
      expect(button).toHaveAttribute("type", "button");
    });

    rerender(<ControlBar {...props} visible={false} />);

    expect(bar).not.toHaveClass("is-visible");
    expect(bar).toHaveAttribute("aria-hidden", "true");
    expect(bar).toHaveAttribute("inert");
  });

  it("patches layout, ranges, and pin state", async () => {
    const user = userEvent.setup();
    const { props } = renderControlBar({
      settings: {
        ...DEFAULT_SETTINGS,
        layout: "studio",
        controlsPinned: false,
      },
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
    fireEvent.change(screen.getByLabelText("选择摄像头"), {
      target: { value: "" },
    });
    await user.click(screen.getByRole("button", { name: "拍照" }));
    await user.click(screen.getByRole("button", { name: "重试" }));
    await user.click(screen.getByRole("button", { name: "窗口置顶" }));
    await user.click(screen.getByRole("button", { name: "切换全屏" }));
    await user.click(screen.getByRole("button", { name: "退出全屏" }));
    await user.click(screen.getByRole("button", { name: "关闭" }));

    expect(props.onSelectCamera).toHaveBeenCalledWith("usb");
    expect(props.onSelectCamera).toHaveBeenCalledWith(undefined);
    expect(props.onCapture).toHaveBeenCalledOnce();
    expect(props.onRetry).toHaveBeenCalledOnce();
    expect(props.onToggleAlwaysOnTop).toHaveBeenCalledOnce();
    expect(props.onToggleFullscreen).toHaveBeenCalledOnce();
    expect(props.onExitFullscreen).toHaveBeenCalledOnce();
    expect(props.onClose).toHaveBeenCalledOnce();
  });

  it("disables unavailable camera selection and capture while keeping retry enabled", async () => {
    const user = userEvent.setup();
    const { props } = renderControlBar({
      cameras: [],
      canCapture: false,
    });

    expect(screen.getByLabelText("选择摄像头")).toBeDisabled();
    expect(screen.getByRole("button", { name: "拍照" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "拍照" }));
    await user.click(screen.getByRole("button", { name: "重试" }));

    expect(props.onCapture).not.toHaveBeenCalled();
    expect(props.onRetry).toHaveBeenCalledOnce();
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
