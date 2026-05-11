import { useEffect } from "react";

let lockCount = 0;
let savedScrollY = 0;
let savedStyles: Partial<CSSStyleDeclaration> | null = null;

const lockBody = () => {
  if (lockCount === 0) {
    savedScrollY = window.scrollY;
    const { body } = document;
    savedStyles = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      overflow: body.style.overflow,
    };
    body.style.position = "fixed";
    body.style.top = `-${savedScrollY}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";
    body.style.overflow = "hidden";
  }
  lockCount++;
};

const unlockBody = () => {
  if (lockCount === 0) return;
  lockCount--;
  if (lockCount === 0 && savedStyles) {
    const { body } = document;
    body.style.position = savedStyles.position ?? "";
    body.style.top = savedStyles.top ?? "";
    body.style.left = savedStyles.left ?? "";
    body.style.right = savedStyles.right ?? "";
    body.style.width = savedStyles.width ?? "";
    body.style.overflow = savedStyles.overflow ?? "";
    savedStyles = null;
    window.scrollTo(0, savedScrollY);
  }
};

export const useLockOverlayScroll = (shouldLock: boolean) => {
  useEffect(() => {
    if (!shouldLock) return;
    lockBody();
    return () => unlockBody();
  }, [shouldLock]);
};
