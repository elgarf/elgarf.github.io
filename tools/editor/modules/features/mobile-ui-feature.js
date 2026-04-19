export const setupMobileUiFeature = (deps = {}) => {
  const {
    windowRef,
    el,
    setupMobileGestures,
    bindEvent
  } = deps;

  const isMobile = () => windowRef.matchMedia("(max-width:900px)").matches;
  setupMobileGestures({ bindEvent });

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
