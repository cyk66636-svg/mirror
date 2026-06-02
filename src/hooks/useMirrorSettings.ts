import { useCallback, useState } from "react";
import {
  loadSettings,
  normalizeSettings,
  saveSettings,
  type MirrorSettings,
} from "../features/settings/mirrorSettings";

export function useMirrorSettings() {
  const [settings, setSettings] = useState(() => loadSettings(localStorage));

  const patchSettings = useCallback((patch: Partial<MirrorSettings>) => {
    setSettings((current) => {
      const normalizedNext = normalizeSettings({ ...current, ...patch });
      saveSettings(localStorage, normalizedNext);
      return normalizedNext;
    });
  }, []);

  return { settings, patchSettings };
}
