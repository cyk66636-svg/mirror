import type { CameraErrorKind } from "../features/camera/cameraState";

type CameraErrorStateProps = {
  error: CameraErrorKind;
  onRetry: () => void;
};

const errorMessages: Record<CameraErrorKind, string> = {
  "permission-denied": "需要摄像头权限才能使用镜子。请允许访问后重试。",
  "no-device": "没有找到可用摄像头。连接摄像头后重试。",
  "stream-error": "摄像头暂时无法启动。请重试或切换设备。",
};

export function CameraErrorState({ error, onRetry }: CameraErrorStateProps) {
  return (
    <section className="camera-error" role="alert">
      <p>{errorMessages[error]}</p>
      <button type="button" onClick={onRetry}>
        重试
      </button>
    </section>
  );
}
