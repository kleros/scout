import { useEffect } from "react";

export const useLockOverlayScroll = (shouldLock: boolean) => {
  useEffect(() => {
    if (!shouldLock) return;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [shouldLock]);
};
