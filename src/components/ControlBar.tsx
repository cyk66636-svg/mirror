import type { MirrorSettings } from "../features/settings/mirrorSettings";

export type ControlBarProps = {
  visible: boolean;
  settings: MirrorSettings;
  cameras: MediaDeviceInfo[];
  canCapture: boolean;
  onPatchSettings: (patch: Partial<MirrorSettings>) => void;
  onSelectCamera: (deviceId?: string) => void;
  onCapture: () => void;
  onRetry: () => void;
  onToggleAlwaysOnTop: () => void;
  onToggleFullscreen: () => void;
  onExitFullscreen: () => void;
  onClose: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
};

function cameraLabel(device: MediaDeviceInfo, index: number): string {
  return device.label || `摄像头 ${index + 1}`;
}

export function ControlBar({
  visible,
  settings,
  cameras,
  canCapture,
  onPatchSettings,
  onSelectCamera,
  onCapture,
  onRetry,
  onToggleAlwaysOnTop,
  onToggleFullscreen,
  onExitFullscreen,
  onClose,
  onPointerEnter,
  onPointerLeave,
}: ControlBarProps) {
  const selectedCameraMissing =
    settings.selectedCameraId !== undefined &&
    !cameras.some((camera) => camera.deviceId === settings.selectedCameraId);

  return (
    <aside
      className={`control-bar${visible ? " is-visible" : ""}`}
      aria-label="镜子控制面板"
      aria-hidden={visible ? undefined : true}
      inert={!visible}
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
    >
      <div className="control-bar__group control-bar__group--ranges">
        <label className="control-field">
          <span>亮度</span>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.brightness}
            onChange={(event) =>
              onPatchSettings({ brightness: Number(event.currentTarget.value) })
            }
          />
        </label>
        <label className="control-field">
          <span>色温</span>
          <input
            type="range"
            min="0"
            max="100"
            value={settings.colorTemperature}
            onChange={(event) =>
              onPatchSettings({
                colorTemperature: Number(event.currentTarget.value),
              })
            }
          />
        </label>
        <label className="control-field">
          <span>缩放</span>
          <input
            type="range"
            min="1"
            max="2"
            step="0.05"
            value={settings.zoom}
            onChange={(event) =>
              onPatchSettings({ zoom: Number(event.currentTarget.value) })
            }
          />
        </label>
      </div>

      <div className="control-bar__group">
        <button
          type="button"
          className={settings.layout === "studio" ? "is-active" : ""}
          aria-pressed={settings.layout === "studio"}
          onClick={() => onPatchSettings({ layout: "studio" })}
        >
          补光镜
        </button>
        <button
          type="button"
          className={settings.layout === "frame" ? "is-active" : ""}
          aria-pressed={settings.layout === "frame"}
          onClick={() => onPatchSettings({ layout: "frame" })}
        >
          灯框
        </button>
      </div>

      <div className="control-bar__group">
        <select
          aria-label="选择摄像头"
          value={settings.selectedCameraId ?? ""}
          disabled={cameras.length === 0}
          onChange={(event) =>
            onSelectCamera(event.currentTarget.value || undefined)
          }
        >
          <option value="">自动选择摄像头</option>
          {selectedCameraMissing ? (
            <option value={settings.selectedCameraId}>当前摄像头</option>
          ) : null}
          {cameras.map((camera, index) => (
            <option key={camera.deviceId} value={camera.deviceId}>
              {cameraLabel(camera, index)}
            </option>
          ))}
        </select>
      </div>

      <div className="control-bar__group">
        <button type="button" disabled={!canCapture} onClick={onCapture}>
          拍照
        </button>
        <button type="button" onClick={onRetry}>
          重试
        </button>
        <button
          type="button"
          aria-pressed={settings.controlsPinned}
          onClick={() =>
            onPatchSettings({ controlsPinned: !settings.controlsPinned })
          }
        >
          固定面板
        </button>
        <button
          type="button"
          aria-pressed={settings.alwaysOnTop}
          onClick={onToggleAlwaysOnTop}
        >
          窗口置顶
        </button>
        <button type="button" onClick={onToggleFullscreen}>
          切换全屏
        </button>
        <button type="button" onClick={onExitFullscreen}>
          退出全屏
        </button>
        <button type="button" onClick={onClose}>
          关闭
        </button>
      </div>
    </aside>
  );
}
