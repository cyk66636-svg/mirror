# Mirror

Mirror is a Windows desktop mirror app built with Tauri, React, and TypeScript.
It opens fullscreen, shows a horizontally mirrored camera preview, and turns the
display into an adjustable fill light.

## Features

- Fullscreen Windows desktop mirror
- Horizontally mirrored live camera preview
- Studio and frame fill-light layouts
- Brightness, color temperature, and zoom controls
- Camera switching and retry states
- Hidden bottom controls with optional pinning
- Always-on-top, fullscreen toggle, and close controls
- Spacebar/photo button capture
- Saves mirrored PNG photos to `Pictures\Mirror`
- NSIS installer configured to install under `D:\MirrorApp`

## Keyboard Shortcuts

- `Esc`: exit fullscreen
- `F11`: toggle fullscreen
- `Ctrl+Shift+T`: toggle always-on-top
- `Space`: take a photo

## Install

The Windows installer is generated at:

```text
src-tauri\target\release\bundle\nsis\Mirror_0.1.0_x64-setup.exe
```

After installation, the app is placed in:

```text
D:\MirrorApp\Mirror.exe
```

## Development

Install dependencies:

```powershell
npm install
```

Run tests:

```powershell
npm run test:run
cargo test --manifest-path src-tauri\Cargo.toml
```

Run the desktop app in development:

```powershell
npm run tauri dev
```

Build the Windows installer:

```powershell
npm run tauri build
```

## Verification

Current build verification:

- `npm run test:run`: 103 tests passed
- `npm run build`: passed
- `cargo test --manifest-path src-tauri\Cargo.toml`: 5 tests passed
- `npm run tauri build`: generated the NSIS installer
- Silent install verified `D:\MirrorApp\Mirror.exe`
