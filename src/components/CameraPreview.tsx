import { useEffect, type RefObject } from "react";

type CameraPreviewProps = {
  stream?: MediaStream;
  zoom: number;
  videoRef: RefObject<HTMLVideoElement | null>;
  viewportRef: RefObject<HTMLDivElement | null>;
};

export function CameraPreview({
  stream,
  zoom,
  videoRef,
  viewportRef,
}: CameraPreviewProps) {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) {
      return;
    }

    video.srcObject = stream ?? null;

    return () => {
      video.srcObject = null;
    };
  }, [stream, videoRef]);

  return (
    <div className="camera-preview" ref={viewportRef}>
      <video
        ref={videoRef}
        className="camera-video"
        autoPlay
        muted
        playsInline
        style={{ transform: `scaleX(-1) scale(${zoom})` }}
      />
    </div>
  );
}
