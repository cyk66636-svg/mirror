import { useCallback, useEffect, useState } from "react";
import {
  loadSettings,
  normalizeSettings,
  saveSettings,
  type MirrorSettings,
} from "../features/settings/mirrorSettings";

export function useMirrorSettings() {
  const [settings, setSettings] = useState(() => loadSettings(localStorage));

  useEffect(() => {
    try {
      saveSettings(localStorage, settings);
    } catch {
      // Keep in-memory settings usable when persistence is unavailable.
    }
  }, [settings]);

  const patchSettings = useCallback((patch: Partial<MirrorSettings>) => {
    setSettings((current) => normalizeSettings({ ...current, ...patch }));
  }, []);

  return { settings, patchSettings };
}
