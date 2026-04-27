import { setupFlowInputController } from "./ui/flow-input-controller.js";
import { setupClusterInputController } from "./ui/cluster-input-controller.js";
import { setupCanvasNavigationController } from "./ui/canvas-navigation-controller.js";
import { setupPointerOrchestratorController } from "./ui/pointer-orchestrator-controller.js";
import { setupTouchInputController } from "./ui/touch-input-controller.js";

export const setupInputController = (deps = {}) => {
  const {
    cv, st, render, hit, s2w, zc, getViewMetrics,
    getRectById, worldToRectUV,
    isNoteMode, isMaskMode, isCellEditMode, isClusterEditMode, isRigEditMode,
    cur, isRectLocked, addMaskPoint, toggleCellLinkAtPoint,
    beginClusterHandleDragAtPoint, handleClusterEditAtPoint,
    handleRigPointerDown, handleRigPointerMove, handleRigPointerLeave, handleFlowEditPointerDown,
    selRect, isSelected, beginRectDrag, beginSelectionBox,
    setSelection, syncPropsSmart, snapMaskNode, getCellLinkCandidateAtPoint, getRigHitAtPoint,
    updateClusterHandleDragAtPoint, updateClusterEditCursor,
    findClusterHandle, findActiveClusterBorder, findClusterStartMarker, cellFromWorldPoint,
    updateFlowLinkDragTarget, resetFlowHoverTransient,
    findFlowLinkAtPoint, findFlowStartHandle, findFlowDirectionButton, findFlowEditPoint,
    moveRectDrag, updateSelectionBox, finishSelectionBox,
    endClusterHandleDrag, addFlowLinkBetween, setFlowStart, setFlowLock,
    mkNote, mk, isNoteRect, openNoteEditor, setMode, refreshPanels, schedulePersist,
    resetCellTransient, resetClusterHoverTransient, resetRigHoverTransient,
    resetFlowRegionOverrides, syncProps,
    buildRebuiltFlowPreview, rebuildAndPatchFlowRegion,
    hitLayerButton, setLayerButtonHover, clearLayerButtonHover,
    hitMultiSelectionAction, hitMultiSelectionResizeHandle, setMultiSelectionActionHover, clearMultiSelectionActionHover, applyMultiSelectionAction,
    beginMultiSelectionResize, updateMultiSelectionResize, endMultiSelectionResize,
    bindEvent, bindWindowEvent
  } = deps;

  if (!cv || !st || !render) return {};

  const selectHoveredRectSmart = h => {
    if (!h || h.id === st.sel) return false;
    setSelection([h.id], h.id);
    syncPropsSmart();
    return true;
  };
  const finishPointerUp = changed => {
    if (changed) schedulePersist("project");
    render();
    return true;
  };
  const navigationController = setupCanvasNavigationController({
    st,
    render,
    hit,
    selRect,
    isSelected,
    beginRectDrag,
    beginSelectionBox,
    updateSelectionBox,
    moveRectDrag
  });
  const clusterController = setupClusterInputController({
    st,
    render,
    hit,
    cur,
    selectHoveredRectSmart,
    beginClusterHandleDragAtPoint,
    handleClusterEditAtPoint,
    updateClusterHandleDragAtPoint,
    updateClusterEditCursor,
    findClusterHandle,
    findActiveClusterBorder,
    findClusterStartMarker,
    cellFromWorldPoint,
    endClusterHandleDrag,
    finishPointerUp,
    resetClusterHoverTransient
  });
  const flowController = setupFlowInputController({
    st,
    render,
    hit,
    cur,
    selectHoveredRectSmart,
    updateFlowLinkDragTarget,
    resetFlowHoverTransient,
    findFlowLinkAtPoint,
    findFlowStartHandle,
    findFlowDirectionButton,
    findFlowEditPoint,
    addFlowLinkBetween,
    setFlowStart,
    setFlowLock,
    buildRebuiltFlowPreview,
    rebuildAndPatchFlowRegion,
    finishPointerUp
  });
  const pointerOrchestrator = setupPointerOrchestratorController({
    st,
    cv,
    render,
    getRectById,
    hit,
    cur,
    selRect,
    isRectLocked,
    isNoteMode,
    isMaskMode,
    isCellEditMode,
    isClusterEditMode,
    isRigEditMode,
    addMaskPoint,
    toggleCellLinkAtPoint,
    snapMaskNode,
    getCellLinkCandidateAtPoint,
    getRigHitAtPoint,
    handleRigPointerDown,
    handleRigPointerMove,
    handleRigPointerLeave,
    handleFlowEditPointerDown,
    navigationController,
    clusterController,
    flowController,
    resetFlowHoverTransient,
    selectHoveredRectSmart,
    finishPointerUp,
    finishSelectionBox,
    mkNote,
    mk,
    isNoteRect,
    openNoteEditor,
    setMode,
    refreshPanels,
    schedulePersist,
    resetCellTransient,
    resetRigHoverTransient,
    setSelection,
    syncPropsSmart,
    resetFlowRegionOverrides,
    syncProps,
    findFlowStartHandle,
    worldToRectUV,
    hitLayerButton,
    setLayerButtonHover,
    clearLayerButtonHover,
    hitMultiSelectionAction,
    hitMultiSelectionResizeHandle,
    setMultiSelectionActionHover,
    clearMultiSelectionActionHover,
    applyMultiSelectionAction,
    beginMultiSelectionResize,
    updateMultiSelectionResize,
    endMultiSelectionResize
  });
  const handleCanvasPointerDown = (p, opts = null) => pointerOrchestrator.handleCanvasPointerDown(p, opts);
  const handleCanvasPointerMove = (p, opts = null) => pointerOrchestrator.handleCanvasPointerMove(p, opts);
  const handleCanvasPointerUp = () => pointerOrchestrator.handleCanvasPointerUp();
  const handleCanvasMouseLeave = () => pointerOrchestrator.handleCanvasMouseLeave();
  const touchController = setupTouchInputController({
    cv,
    st,
    render,
    s2w,
    zc,
    getViewMetrics,
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    hitLayerButton
  });
  const handleTouchStart = e => touchController.handleTouchStart(e);
  const handleTouchMove = e => touchController.handleTouchMove(e);
  const handleTouchEnd = e => touchController.handleTouchEnd(e);
  let canvasRectCache = null;
  const invalidateCanvasRectCache = () => { canvasRectCache = null; };
  const getCanvasRect = () => {
    if (!canvasRectCache) canvasRectCache = cv.getBoundingClientRect();
    return canvasRectCache;
  };
  const getCanvasPoint = e => {
    const b = getCanvasRect();
    const sx = e.clientX - b.left;
    const sy = e.clientY - b.top;
    return { sx, sy, p: s2w(sx, sy) };
  };

  bindEvent(cv, "contextmenu", e => e.preventDefault());
  bindEvent(cv, "mousedown", e => {
    invalidateCanvasRectCache();
    const { sx, sy, p } = getCanvasPoint(e);
    if (e.button === 0 && typeof hitLayerButton === "function" && hitLayerButton(p.x, p.y)) {
      handleCanvasPointerDown(p, { shiftToggle: !!e.shiftKey, touchLike: false });
      return;
    }
    const panWithLeft = e.button === 0 && (st.keys.space || st.lockAll);
    const pan = e.button === 1 || e.button === 2 || panWithLeft;
    if (pan) { st.pan = true; st.panS = { sx, sy, cx: st.camX, cy: st.camY }; render(); return; }
    if (e.button !== 0) return;
    handleCanvasPointerDown(p, { shiftToggle: !!e.shiftKey, touchLike: false });
  });
  bindWindowEvent("mousemove", e => {
    const { sx, sy, p } = getCanvasPoint(e);
    handleCanvasPointerMove(p, { sx, sy, ctrlSnap: !!(e.ctrlKey || st.keys.ctrl), altResize: !!e.altKey });
  });
  bindEvent(cv, "mouseleave", handleCanvasMouseLeave);
  bindWindowEvent("mouseup", () => { handleCanvasPointerUp(); });
  bindEvent(cv, "wheel", e => {
    invalidateCanvasRectCache();
    e.preventDefault();
    const { sx, sy } = getCanvasPoint(e);
    deps.zoomAt(sx, sy, st.zoom * (e.deltaY < 0 ? 1.1 : .9));
  }, { passive: false });
  bindEvent(cv, "dblclick", e => {
    invalidateCanvasRectCache();
    const { p } = getCanvasPoint(e);
    pointerOrchestrator.handleCanvasDoubleClick(p, () => e.preventDefault());
  });
  bindEvent(cv, "touchstart", handleTouchStart, { passive: false });
  bindEvent(cv, "touchmove", handleTouchMove, { passive: false });
  bindEvent(cv, "touchend", handleTouchEnd, { passive: false });
  bindWindowEvent("resize", invalidateCanvasRectCache);
  bindWindowEvent("scroll", invalidateCanvasRectCache);

  return {
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasMouseLeave,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};

