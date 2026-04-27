export const setupRenderPipeline = (deps = {}) => {
  const {
    ctx, st, cv, wrap,
    getViewMetrics, s2w, rectAABB, getOrigin, isSelected,
    drawRect, drawInterScreenFlowLinks, drawMaskOverlay, drawCellEditOverlay, drawContentBounds, drawMultiSelectionActions,
    drawGrid, drawGuides, drawDistanceGuide, drawInstallSummaryOverlay, drawLayerButtons, updateNoteEditorOverlay,
    selBoxBounds, resetClusterHoverTransient, isClusterEditMode
  } = deps;
  let drawGridFn = drawGrid;
  let drawGuidesFn = drawGuides;
  let drawDistanceGuideFn = drawDistanceGuide;

  const resetFrameTransient = () => {
    st.flowEditPoints = [];
    st.flowStartHandles = [];
    st.flowDirButtons = [];
    st.flowLinkAnchors = [];
    st.flowLinkSegments = [];
    st.clusterHandles = [];
    if (!isClusterEditMode()) resetClusterHoverTransient();
  };

  const drawDraftOverlay = z => {
    if (!st.draft) return;
    const d = st.draft;
    const scale = Math.max(1, Math.round(Number(st.globalScale) || 256));
    const roundHalf = v => Math.max(0.5, Math.round(Math.max(0, Number(v) || 0) * 2) / 2);
    const wm = roundHalf(Math.abs(Number(d.width) || 0) / scale);
    const hm = roundHalf(Math.abs(Number(d.height) || 0) / scale);
    const fmt = v => Number.isInteger(v) ? String(v) : String(v).replace(".", ",");
    const meterUnit = (typeof document !== "undefined" && /^en\b/i.test(document.documentElement.getAttribute("lang") || "")) ? "m" : "м";
    const label = `${fmt(wm)} x ${fmt(hm)} ${meterUnit}`;
    ctx.strokeStyle = "#7fd4f8";
    ctx.lineWidth = 1 / z;
    ctx.setLineDash([8 / z, 5 / z]);
    ctx.strokeRect(d.x, d.y, d.width, d.height);
    ctx.setLineDash([]);
    ctx.save();
    const ui = 1 / Math.max(0.01, z);
    ctx.font = `${12 * ui}px sans-serif`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const pad = 5 * ui;
    const tw = ctx.measureText(label).width;
    const bx = (Number.isFinite(Number(d.pointerX)) ? Number(d.pointerX) : d.x) + 8 * ui;
    const by = (Number.isFinite(Number(d.pointerY)) ? Number(d.pointerY) : d.y) + 8 * ui;
    ctx.fillStyle = "rgba(15,19,24,.82)";
    ctx.fillRect(bx - pad, by - pad, tw + pad * 2, 16 * ui + pad * 2);
    ctx.fillStyle = "rgba(255,255,255,.95)";
    ctx.fillText(label, bx, by);
    ctx.restore();
  };

  const drawSelectionBoxOverlay = z => {
    if (!st.selBox) return;
    const b = selBoxBounds(st.selBox);
    ctx.save();
    ctx.strokeStyle = "rgba(125,208,255,.95)";
    ctx.fillStyle = "rgba(125,208,255,.12)";
    ctx.lineWidth = Math.max(1, 1.2 / z);
    ctx.setLineDash([6 / z, 4 / z]);
    ctx.fillRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
    ctx.strokeRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY);
    ctx.restore();
  };

  const drawVisibleRects = (z, forceLowDetail, drawOptions = {}) => {
    const vm = getViewMetrics();
    const vw0 = s2w(0, 0);
    const vw1 = s2w(vm.viewWidth, vm.viewHeight);
    const vmargin = Math.max(48, 80 / Math.max(0.25, z));
    const viewMinX = Math.min(vw0.x, vw1.x) - vmargin;
    const viewMinY = Math.min(vw0.y, vw1.y) - vmargin;
    const viewMaxX = Math.max(vw0.x, vw1.x) + vmargin;
    const viewMaxY = Math.max(vw0.y, vw1.y) + vmargin;
    const origin = getOrigin();
    for (let i = st.rects.length - 1; i >= 0; i--) {
      const rr = st.rects[i];
      const bb = rectAABB(rr);
      if (bb.maxX < viewMinX || bb.minX > viewMaxX || bb.maxY < viewMinY || bb.minY > viewMaxY) continue;
      drawRect(ctx, rr, isSelected(rr.id), z, origin, { designerRender: true, forceLowDetail, ...drawOptions });
    }
  };

  const renderScene = renderState => {
    const dpr = window.devicePixelRatio || 1;
    const vm = getViewMetrics();
    const z = st.zoom || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
    if (typeof drawGridFn === "function") drawGridFn();
    ctx.save();
    ctx.translate(vm.centerX, vm.centerY);
    ctx.scale(z, z);
    ctx.translate(-st.camX, -st.camY);
    const installFlowLayering = String(st.viewMode || "") === "install";
    const showInstallFlowLayer = !(st.installLayers && st.installLayers.flow === false) || st.mode === "flowEdit";
    if (installFlowLayering) {
      drawVisibleRects(z, !!renderState.forceLowDetail, { installTextMode: "skip" });
      if (showInstallFlowLayer) drawInterScreenFlowLinks(ctx);
      drawVisibleRects(z, !!renderState.forceLowDetail, { installTextMode: "only", includeFlow: false });
    } else {
      drawVisibleRects(z, !!renderState.forceLowDetail);
      drawInterScreenFlowLinks(ctx);
    }
    drawDraftOverlay(z);
    drawSelectionBoxOverlay(z);
    if (!renderState.skipHeavyOverlays) {
      drawMaskOverlay(ctx, z);
      drawCellEditOverlay(ctx, z);
    }
    if (!renderState.skipHeavyOverlays || st.pan) {
      drawContentBounds(ctx, z);
    }
    if (!renderState.skipHeavyOverlays && typeof drawMultiSelectionActions === "function") {
      drawMultiSelectionActions(ctx, z);
    }
    if (!renderState.skipHeavyOverlays && typeof drawLayerButtons === "function") {
      drawLayerButtons(ctx, z);
    }
    ctx.restore();
    if (typeof drawGuidesFn === "function") drawGuidesFn();
    if (typeof drawDistanceGuideFn === "function") drawDistanceGuideFn();
    if (typeof drawInstallSummaryOverlay === "function") drawInstallSummaryOverlay(ctx);
    if (wrap) wrap.dataset.panning = st.pan ? "1" : "0";
    updateNoteEditorOverlay();
  };

  return {
    resetFrameTransient,
    renderScene,
    setGridRenderer: fn => { drawGridFn = fn; },
    setGuidesRenderer: fn => { drawGuidesFn = fn; },
    setDistanceGuideRenderer: fn => { drawDistanceGuideFn = fn; }
  };
};
