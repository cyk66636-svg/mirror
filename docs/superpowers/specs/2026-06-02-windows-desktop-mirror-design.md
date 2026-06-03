# Windows Desktop Mirror Design

## Summary

Build a Windows-only desktop mirror application. The first release is a practical fullscreen mirror: it opens the selected camera, flips the preview horizontally, uses the display as an adjustable fill light, and keeps controls unobtrusive until needed.

The implementation will use Tauri 2, React, and TypeScript. The design keeps camera capture, fill-light presentation, settings persistence, photo capture, and window control separate so later releases can add beauty effects, filters, and recording without replacing the first-release foundation.

## Scope

### Included In The First Release

- Launch directly into fullscreen mode.
- Show a horizontally mirrored live camera preview.
- Switch between available cameras.
- Adjust fill-light brightness and color temperature.
- Switch between two fill-light layouts:
  - Studio layout: a centered camera preview surrounded by a large fill-light area, matching the reference image.
  - Frame layout: a larger preview with an illuminated border around the edges.
- Zoom the camera preview without changing the captured camera stream.
- Capture a still photo and save it locally.
- Reveal a translucent control bar when the pointer moves into the bottom interaction zone.
- Allow the user to pin the control bar so it remains visible.
- Toggle always-on-top mode.
- Exit fullscreen and close the application from the control bar.
- Persist user preferences locally and restore them on the next launch.
- Show clear recovery UI when camera access fails or no usable device is available.
- Package the Windows installer so it creates and uses `D:\MirrorApp` as the application folder.

### Deferred For Later Releases

- Beauty effects.
- Visual filters.
- Video recording.
- macOS support.
- Cloud sync, user accounts, and sharing.
- Automatic photo editing.

## User Experience

### Startup

The application launches into fullscreen mode. It restores the last selected fill-light layout, brightness, color temperature, zoom level, selected camera when still available, pinned-controls preference, and always-on-top preference.

The default first-run state is:

- Studio layout.
- Neutral-warm fill light.
- Medium-high fill-light brightness.
- 1x zoom.
- Controls hidden until the pointer enters the bottom interaction zone.
- Always-on-top disabled.

### Main Mirror View

The mirror view occupies the entire window. It has three visual layers:

1. The fill-light background, tinted according to brightness and color-temperature settings.
2. The mirrored camera preview, cropped to fit the active layout.
3. The controls and transient status messages.

Studio layout keeps the preview centered with a broad illuminated area around it. Frame layout enlarges the preview and places the illuminated area at the edges as a responsive border sized for the current window. Switching layouts must not interrupt the camera stream.

### Controls

The bottom control bar is translucent and readable against both light and dark backgrounds. It appears when the pointer enters a bottom interaction zone and hides after a short delay when the pointer leaves, unless pinned.

It provides:

- Brightness slider.
- Color-temperature slider.
- Studio/frame layout toggle.
- Camera selector.
- Zoom control.
- Take-photo button.
- Pin-controls toggle.
- Always-on-top toggle.
- Exit-fullscreen action.
- Close-app action.

Keyboard shortcuts:

- `Esc`: exit fullscreen.
- `F11`: enter or exit fullscreen.
- `Space`: take a photo when focus is not inside an interactive control.
- `Ctrl+Shift+T`: toggle always-on-top.

### Photo Capture

Taking a photo saves the current mirrored preview framing, including the active zoom and crop, but excluding the fill-light background and UI controls. The default destination is the user's Windows Pictures folder in a `Mirror` subfolder. Filenames use local time in the form `mirror-YYYYMMDD-HHmmss.png`.

After a successful save, a small non-blocking message displays the saved filename. If saving fails, the application displays a clear error message and keeps the live preview active.

## Architecture

### Desktop Shell

Tauri 2 owns the Windows window lifecycle and native commands:

- Enter and exit fullscreen.
- Toggle always-on-top.
- Resolve the default photo directory.
- Create the photo directory when needed.
- Save PNG image bytes to disk.

The shell exposes a narrow command interface to the webview. Camera frames remain in the webview and are not sent continuously through the Tauri bridge.

### React Application

The React layer is divided into focused modules:

- `MirrorView`: composes the full-window mirror experience.
- `CameraPreview`: attaches the active media stream to a video element and applies mirroring, crop, and zoom.
- `FillLight`: renders the selected studio or frame layout and maps user settings to visible light color and intensity.
- `ControlBar`: exposes controls and manages hidden, visible, and pinned states.
- `CameraErrorState`: displays camera permission and device recovery states.
- `ToastRegion`: displays save confirmations and recoverable errors.

### Hooks And Services

- `useCamera`: enumerates video devices, requests the active stream, switches cameras, and cleans up tracks.
- `useMirrorSettings`: loads, validates, updates, and persists preferences.
- `useControlVisibility`: handles pointer-zone reveal, hide delay, and pinning.
- `capturePhoto`: renders the mirrored and cropped camera frame into a canvas and returns PNG bytes.
- `desktopApi`: wraps Tauri commands so React components do not depend directly on bridge details.

This boundary leaves room for later media-processing modules between the camera stream and preview/capture rendering.

## Data Flow

1. On startup, `useMirrorSettings` loads validated local preferences.
2. `useCamera` requests camera permission, enumerates devices, selects the saved camera when available, and starts a video stream.
3. `CameraPreview` displays the active stream with horizontal mirroring and the active zoom/crop.
4. `FillLight` renders behind or around the preview according to layout, brightness, and temperature settings.
5. Control changes update React state immediately and persist the validated settings locally.
6. Photo capture draws the visible mirrored preview framing to an off-screen canvas.
7. The PNG bytes are passed once to a Tauri command for saving in the Pictures folder.

## Settings Model

Persisted preferences:

```ts
type MirrorSettings = {
  layout: "studio" | "frame";
  brightness: number;
  colorTemperature: number;
  zoom: number;
  selectedCameraId?: string;
  controlsPinned: boolean;
  alwaysOnTop: boolean;
};
```

Numeric values are clamped to supported ranges when loaded and when changed. If saved data is malformed, the application falls back to defaults rather than blocking startup.

## Error Handling

- Permission denied: explain that camera permission is required and offer a retry action.
- No camera found: show a no-device message and allow retry after a device is connected.
- Selected camera removed: attempt to move to another available camera and notify the user.
- Stream startup failed: show a retryable camera error without closing the application.
- Photo save failed: show an error message while preserving the preview.
- Invalid saved settings: silently restore safe defaults.

## Visual Direction

The application should feel like a dedicated mirror rather than a conventional settings window:

- Fullscreen black canvas with the light area as the visual focus.
- Rounded preview container in studio layout.
- Soft, neutral shadows and a subtle glow around illuminated areas.
- Minimal bottom controls with large touch-friendly targets.
- White, translucent, or dark glass-like control surfaces selected for legibility.
- Restrained animations for control reveal, layout switching, and status messages.

The visual treatment should remain simple enough that the display continues to function as useful fill light.

## Testing Strategy

### Automated Tests

- Settings validation, fallback behavior, and persistence.
- Brightness and color-temperature mapping.
- Control-bar visibility and pinning state.
- Photo filename formatting.
- Canvas crop and zoom calculations.
- Desktop API wrapper calls with mocked Tauri commands.

### Manual Verification On Windows

- First launch prompts for camera permission and reaches the live mirror view.
- App launches directly into fullscreen.
- `Esc` exits fullscreen and `F11` toggles it.
- Preview is horizontally mirrored.
- Both fill-light layouts work without restarting the stream.
- Brightness, temperature, zoom, and camera selection update correctly.
- Control bar reveal, delayed hide, and pinned mode behave correctly.
- Always-on-top toggles correctly.
- Photo output matches the visible mirrored crop and saves under `Pictures\Mirror`.
- Settings restore correctly after restarting the application.
- Permission-denied and no-camera states are understandable and retryable.
- Installing the packaged NSIS setup creates `D:\MirrorApp` and places the application there.

## Delivery Boundary

The first implementation is complete when the Windows Tauri application can be run locally, produces a packaged Windows build that installs under `D:\MirrorApp`, and passes the automated and manual verification checks above. Later beauty, filter, and recording work will be planned separately.
