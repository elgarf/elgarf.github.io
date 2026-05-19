/* build:1779222473 */
export const setupViewportResizeController = (deps = {}) => {
  const {
    st,
    cv,
    overlayCanvas,
    wrap,
    bindWindowEvent,
    bindEvent,
    render,
    zc,
    s2w,
    observeMainSelector = ".main"
  } = deps;

  const updateAppViewportHeight = () => {
    const h = (window.visualViewport && Number.isFinite(window.visualViewport.height) && window.visualViewport.height > 0)
      ? window.visualViewport.height
      : window.innerHeight;
    if (Number.isFinite(h) && h > 0) document.documentElement.style.setProperty("--app-vh", `${Math.round(h)}px`);
  };

  const resize = () => {
    const r = window.devicePixelRatio || 1;
    const b = cv.getBoundingClientRect();
    const width = Math.max(1, Math.floor(b.width * r));
    const height = Math.max(1, Math.floor(b.height * r));
    cv.width = width;
    cv.height = height;
    if (overlayCanvas) {
      overlayCanvas.width = width;
      overlayCanvas.height = height;
    }
    render(true);
  };

  let canvasResizeRaf = 0;
  let canvasResizeTimer = 0;

  const runCanvasResize = () => {
    updateAppViewportHeight();
    resize();
  };

  const scheduleCanvasResize = () => {
    if (!canvasResizeRaf && typeof requestAnimationFrame === "function") {
      canvasResizeRaf = requestAnimationFrame(() => {
        canvasResizeRaf = 0;
        runCanvasResize();
      });
    } else if (!canvasResizeRaf) {
      runCanvasResize();
    }
    if (canvasResizeTimer) clearTimeout(canvasResizeTimer);
    canvasResizeTimer = setTimeout(() => {
      canvasResizeTimer = 0;
      runCanvasResize();
    }, 120);
  };

  const bindResizeListeners = () => {
    bindWindowEvent("resize", scheduleCanvasResize);
    if (typeof ResizeObserver !== "undefined") {
      const canvasResizeObserver = new ResizeObserver(() => scheduleCanvasResize());
      if (wrap) canvasResizeObserver.observe(wrap);
      const main = document.querySelector(observeMainSelector);
      if (main) canvasResizeObserver.observe(main);
    }
    bindWindowEvent("orientationchange", scheduleCanvasResize);
    if (window.visualViewport && window.visualViewport.addEventListener) {
      bindEvent(window.visualViewport, "resize", scheduleCanvasResize);
    }
  };

  const zoomAt = (sx, sy, nz) => {
    const b = s2w(sx, sy);
    st.zoom = zc(nz);
    const a = s2w(sx, sy);
    st.camX += b.x - a.x;
    st.camY += b.y - a.y;
    render();
  };

  return {
    updateAppViewportHeight,
    resize,
    scheduleCanvasResize,
    bindResizeListeners,
    zoomAt
  };
};
