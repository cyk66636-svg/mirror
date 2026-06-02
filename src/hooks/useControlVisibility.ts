import { useCallback, useEffect, useRef, useState } from "react";
import { reduceControlVisibility } from "../features/controls/controlVisibility";

const HIDE_DELAY_MS = 1200;

export function useControlVisibility(pinned: boolean) {
  const [visible, setVisible] = useState(pinned);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const pinnedRef = useRef(pinned);
  pinnedRef.current = pinned;

  const clearPendingHide = useCallback(() => {
    if (hideTimer.current !== undefined) {
      clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
    }
  }, []);

  const reveal = useCallback(() => {
    clearPendingHide();
    setVisible((current) =>
      reduceControlVisibility(current, pinnedRef.current, "reveal"),
    );
  }, [clearPendingHide]);

  const scheduleHide = useCallback(() => {
    clearPendingHide();
    hideTimer.current = setTimeout(() => {
      hideTimer.current = undefined;
      setVisible((current) =>
        reduceControlVisibility(current, pinnedRef.current, "hide"),
      );
    }, HIDE_DELAY_MS);
  }, [clearPendingHide]);

  useEffect(() => {
    if (pinned) {
      reveal();
    }
  }, [pinned, reveal]);

  useEffect(() => clearPendingHide, [clearPendingHide]);

  return { visible, reveal, scheduleHide };
}
