import { setupRenderPipeline } from "../render-pipeline.js";
import { setupRenderRuntimeController } from "../render/runtime-controller.js";
import { setupViewportResizeController } from "../render/viewport-resize-controller.js";

export const setupRenderRuntimeFeature = (deps = {}) => {
  const {
    ctx,
    st,
    cv,
    wrap,
    getViewMetrics,
    s2w,
    w2s,
    rectAABB,
    getOrigin,
    isSelected,
    drawRect,
    drawInterScreenFlowLinks,
    drawMaskOverlay,
    drawCellEditOverlay,
    drawContentBounds,
    drawMultiSelectionActions,
    drawInstallSummaryOverlay,
    updateNoteEditorOverlay,
    selBoxBounds,
    resetClusterHoverTransient,
    isClusterEditMode,
    fontFamilyCss,
    el,
    onBeforeRenderFrame,
    bindWindowEvent,
    bindEvent,
    zc
  } = deps;

  const renderPipeline = setupRenderPipeline({
    ctx, st, cv, wrap,
    getViewMetrics,
    s2w,
    rectAABB,
    getOrigin,
    isSelected,
    drawRect,
    drawInterScreenFlowLinks,
    drawMaskOverlay,
    drawCellEditOverlay,
    drawContentBounds,
    drawMultiSelectionActions,
    drawInstallSummaryOverlay,
    drawGrid: () => { },
    drawGuides: () => { },
    drawDistanceGuide: () => { },
    updateNoteEditorOverlay,
    selBoxBounds,
    resetClusterHoverTransient,
    isClusterEditMode
  });

  const { render, renderNow } = setupRenderRuntimeController({
    ctx,
    st,
    cv,
    wrap,
    s2w,
    w2s,
    fontFamilyCss,
    el,
    renderPipeline,
    onBeforeRenderFrame
  });

  const viewportResizeController = setupViewportResizeController({
    st,
    cv,
    wrap,
    bindWindowEvent,
    bindEvent,
    render: immediate => render(immediate),
    zc,
    s2w
  });
  viewportResizeController.bindResizeListeners();

  return {
    render,
    renderNow,
    updateAppViewportHeight: viewportResizeController.updateAppViewportHeight,
    resize: viewportResizeController.resize,
    scheduleCanvasResize: viewportResizeController.scheduleCanvasResize,
    zoomAt: viewportResizeController.zoomAt
  };
};
