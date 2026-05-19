/* build:1779222473 */
export const setupViewportMetricsController = (deps = {}) => {
  const {
    windowRef = window,
    documentRef = document,
    canvas,
    getSidePanel,
    getCamX,
    getCamY,
    getZoom
  } = deps;

  const getDesktopSidePanelWidthPx = side => {
    if (!side) return 0;
    const stl = windowRef.getComputedStyle(side);
    if (stl.display === "none") return 0;
    const cssWidth = Number.parseFloat(stl.width);
    const offsetWidth = Number(side.offsetWidth) || 0;
    return Math.max(0, offsetWidth, Number.isFinite(cssWidth) ? cssWidth : 0);
  };

  const getRightPanelOcclusionPx = () => {
    if (!windowRef.matchMedia("(min-width:901px)").matches) return 0;
    const side = typeof getSidePanel === "function" ? getSidePanel() : documentRef.getElementById("sidePanel");
    if (!side || !canvas) return 0;
    const stl = windowRef.getComputedStyle(side);
    if (stl.display === "none") return 0;
    const reservedWidth = getDesktopSidePanelWidthPx(side);
    if (reservedWidth > 0) return Math.max(0, Math.min(canvas.clientWidth, reservedWidth));
    const cr = canvas.getBoundingClientRect();
    const sr = side.getBoundingClientRect();
    const overlap = Math.max(0, Math.min(cr.right, sr.right) - Math.max(cr.left, sr.left));
    return Math.max(0, Math.min(canvas.clientWidth, overlap));
  };

  const getViewMetrics = () => {
    const occRight = getRightPanelOcclusionPx();
    const viewWidth = Math.max(1, (canvas ? canvas.clientWidth : 1) - occRight);
    const viewHeight = Math.max(1, canvas ? canvas.clientHeight : 1);
    return {
      viewWidth,
      viewHeight,
      centerX: viewWidth / 2,
      centerY: viewHeight / 2
    };
  };

  const w2s = (x, y) => {
    const vm = getViewMetrics();
    return {
      x: (x - Number(getCamX?.() || 0)) * Number(getZoom?.() || 1) + vm.centerX,
      y: (y - Number(getCamY?.() || 0)) * Number(getZoom?.() || 1) + vm.centerY
    };
  };

  const s2w = (x, y) => {
    const vm = getViewMetrics();
    const zoom = Number(getZoom?.() || 1) || 1;
    return {
      x: (x - vm.centerX) / zoom + Number(getCamX?.() || 0),
      y: (y - vm.centerY) / zoom + Number(getCamY?.() || 0)
    };
  };

  const zc = v => {
    const min = windowRef.matchMedia("(max-width:900px)").matches ? 0.01 : 0.1;
    return Math.min(2.5, Math.max(min, v));
  };

  return {
    getRightPanelOcclusionPx,
    getViewMetrics,
    w2s,
    s2w,
    zc
  };
};
