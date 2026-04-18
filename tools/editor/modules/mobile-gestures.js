export const setupMobileGestures = (deps = {}) => {
  const { bindEvent } = deps;
  if (!bindEvent) return {};

  const isCoarsePointer = () => window.matchMedia && window.matchMedia("(hover:none) and (pointer:coarse)").matches;
  const isEditableTarget = t => {
    if (!t || !(t instanceof Element)) return false;
    if (t.closest("[contenteditable='true']")) return true;
    const n = t.tagName;
    return n === "INPUT" || n === "TEXTAREA" || n === "SELECT";
  };
  let lastTouchEndTs = 0;
  const handleDocumentTouchEnd = e => {
    if (!isCoarsePointer()) return;
    if (isEditableTarget(e.target)) return;
    const now = Date.now(), dt = now - lastTouchEndTs;
    if (dt > 0 && dt < 320) e.preventDefault();
    lastTouchEndTs = now;
  };
  bindEvent(document, "touchend", handleDocumentTouchEnd, { passive: false });
  return { handleDocumentTouchEnd };
};
