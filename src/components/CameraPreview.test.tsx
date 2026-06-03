import { cleanup, render } from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CameraPreview } from "./CameraPreview";

function mediaStream(): MediaStream {
  return {
    getTracks: vi.fn(() => []),
  } as unknown as MediaStream;
}

describe("CameraPreview", () => {
  afterEach(() => {
    cleanup();
  });

  it("binds the stream to the mirrored video and clears it on cleanup", () => {
    const stream = mediaStream();
    const videoRef = createRef<HTMLVideoElement>();
    const viewportRef = createRef<HTMLDivElement>();

    const { container, unmount } = render(
      <CameraPreview
        stream={stream}
        zoom={1.4}
        videoRef={videoRef}
        viewportRef={viewportRef}
      />,
    );

    const wrapper = container.querySelector(".camera-preview");
    const video = container.querySelector(".camera-video") as HTMLVideoElement;

    expect(wrapper).toBe(viewportRef.current);
    expect(video).toBe(videoRef.current);
    expect(video.srcObject).toBe(stream);
    expect(video.autoplay).toBe(true);
    expect(video.muted).toBe(true);
    expect(video.playsInline).toBe(true);
    expect(video).toHaveStyle({ transform: "scaleX(-1) scale(1.4)" });

    unmount();

    expect(video.srcObject).toBeNull();
  });

  it("clears the video when the stream is removed", () => {
    const stream = mediaStream();
    const videoRef = createRef<HTMLVideoElement>();
    const viewportRef = createRef<HTMLDivElement>();

    const { container, rerender } = render(
      <CameraPreview
        stream={stream}
        zoom={1}
        videoRef={videoRef}
        viewportRef={viewportRef}
      />,
    );
    const video = container.querySelector(".camera-video") as HTMLVideoElement;

    rerender(
      <CameraPreview
        stream={undefined}
        zoom={1}
        videoRef={videoRef}
        viewportRef={viewportRef}
      />,
    );

    expect(video.srcObject).toBeNull();
  });
});
