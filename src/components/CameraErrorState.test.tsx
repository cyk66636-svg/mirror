import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CameraErrorKind } from "../features/camera/cameraState";
import { CameraErrorState } from "./CameraErrorState";

const messages: Array<[CameraErrorKind, string]> = [
  [
    "permission-denied",
    "需要摄像头权限才能使用镜子。请允许访问后重试。",
  ],
  ["no-device", "没有找到可用摄像头。连接摄像头后重试。"],
  ["stream-error", "摄像头暂时无法启动。请重试或切换设备。"],
];

describe("CameraErrorState", () => {
  afterEach(() => {
    cleanup();
  });

  it.each(messages)("shows the %s message in an alert", (error, message) => {
    render(<CameraErrorState error={error} onRetry={vi.fn()} />);

    expect(screen.getByRole("alert")).toHaveTextContent(message);
  });

  it("calls retry when the retry button is clicked", async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn();

    render(<CameraErrorState error="stream-error" onRetry={onRetry} />);
    await user.click(screen.getByRole("button", { name: "重试" }));

    expect(onRetry).toHaveBeenCalledOnce();
  });
});
