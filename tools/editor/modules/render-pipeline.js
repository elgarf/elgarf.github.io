export const setupRenderPipeline = (deps = {}) => {
  const {
    ctx, st, cv, wrap,
    getViewMetrics, s2w, rectAABB, getOrigin, isSelected,
    drawRect, drawInterScreenFlowLinks, drawMaskOverlay, drawCellEditOverlay, drawContentBounds,
    drawGrid, drawGuides, drawDistanceGuide, updateNoteEditorOverlay,
    selBoxBounds, resetClusterHoverTransient, isClusterEditMode
  } = deps;

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
    ctx.strokeStyle = "#7fd4f8";
    ctx.lineWidth = 1 / z;
    ctx.setLineDash([8 / z, 5 / z]);
    ctx.strokeRect(d.x, d.y, d.width, d.height);
    ctx.setLineDash([]);
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

  const drawVisibleRects = (z, forceLowDetail) => {
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
      drawRect(ctx, rr, isSelected(rr.id), z, origin, { designerRender: true, forceLowDetail });
    }
  };

  const renderScene = renderState => {
    const dpr = window.devicePixelRatio || 1;
    const vm = getViewMetrics();
    const z = st.zoom || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cv.clientWidth, cv.clientHeight);
    drawGrid();
    ctx.save();
    ctx.translate(vm.centerX, vm.centerY);
    ctx.scale(z, z);
    ctx.translate(-st.camX, -st.camY);
    drawVisibleRects(z, !!renderState.forceLowDetail);
    drawInterScreenFlowLinks(ctx);
    drawDraftOverlay(z);
    drawSelectionBoxOverlay(z);
    if (!renderState.skipHeavyOverlays) {
      drawMaskOverlay(ctx, z);
      drawCellEditOverlay(ctx, z);
      drawContentBounds(ctx, z);
    }
    ctx.restore();
    drawGuides();
    drawDistanceGuide();
    if (wrap) wrap.dataset.panning = st.pan ? "1" : "0";
    updateNoteEditorOverlay();
  };

  return {
    resetFrameTransient,
    renderScene
  };
};
