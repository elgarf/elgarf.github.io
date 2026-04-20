export const setupMobileUiFeature = (deps = {}) => {
  const {
    windowRef,
    el,
    bindEvent
  } = deps;

  const isMobile = () => windowRef.matchMedia("(max-width:900px)").matches;
  if (bindEvent) {
    const isCoarsePointer = () => windowRef.matchMedia && windowRef.matchMedia("(hover:none) and (pointer:coarse)").matches;
    const isEditableTarget = t => {
      if (!t || !(t instanceof Element)) return false;
      if (t.closest("[contenteditable='true']")) return true;
      const n = t.tagName;
      return n === "INPUT" || n === "TEXTAREA" || n === "SELECT";
    };
    let lastTouchEndTs = 0;
    bindEvent(document, "touchend", e => {
      if (!isCoarsePointer()) return;
      if (isEditableTarget(e.target)) return;
      const now = Date.now();
      const dt = now - lastTouchEndTs;
      if (dt > 0 && dt < 320) e.preventDefault();
      lastTouchEndTs = now;
    }, { passive: false });
  }

  const updateMobileDock = () => {
    if (!el.mobileDock) return;
    const show = isMobile();
    el.mobileDock.classList.toggle("force-visible", show);
    el.mobileDock.classList.toggle("force-hidden", !show);
  };

  return {
    isMobile,
    updateMobileDock
  };
};
