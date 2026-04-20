import { setupFlowInputController } from "./ui/flow-input-controller.js";
import { setupClusterInputController } from "./ui/cluster-input-controller.js";
import { setupCanvasNavigationController } from "./ui/canvas-navigation-controller.js";
import { setupPointerOrchestratorController } from "./ui/pointer-orchestrator-controller.js";
import { setupTouchInputController } from "./ui/touch-input-controller.js";

export const setupInputController = (deps = {}) => {
  const {
    cv, st, render, hit, s2w, zc, getViewMetrics,
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
    finishPointerUp
  });
  const pointerOrchestrator = setupPointerOrchestratorController({
    st,
    render,
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
    findFlowStartHandle
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
    handleCanvasPointerUp
  });
  const handleTouchStart = e => touchController.handleTouchStart(e);
  const handleTouchMove = e => touchController.handleTouchMove(e);
  const handleTouchEnd = e => touchController.handleTouchEnd(e);
  const getCanvasPoint = e => {
    const b = cv.getBoundingClientRect();
    const sx = e.clientX - b.left;
    const sy = e.clientY - b.top;
    return { sx, sy, p: s2w(sx, sy) };
  };

  bindEvent(cv, "contextmenu", e => e.preventDefault());
  bindEvent(cv, "mousedown", e => {
    const { sx, sy, p } = getCanvasPoint(e);
    const pan = e.button === 1 || e.button === 2 || (st.keys.space && e.button === 0);
    if (pan) { st.pan = true; st.panS = { sx, sy, cx: st.camX, cy: st.camY }; render(); return; }
    if (e.button !== 0) return;
    handleCanvasPointerDown(p, { shiftToggle: !!e.shiftKey, touchLike: false });
  });
  bindWindowEvent("mousemove", e => {
    const { sx, sy, p } = getCanvasPoint(e);
    handleCanvasPointerMove(p, { sx, sy, ctrlSnap: !!(e.ctrlKey || st.keys.ctrl) });
  });
  bindEvent(cv, "mouseleave", handleCanvasMouseLeave);
  bindWindowEvent("mouseup", () => { handleCanvasPointerUp(); });
  bindEvent(cv, "wheel", e => {
    e.preventDefault();
    const { sx, sy } = getCanvasPoint(e);
    deps.zoomAt(sx, sy, st.zoom * (e.deltaY < 0 ? 1.1 : .9));
  }, { passive: false });
  bindEvent(cv, "dblclick", e => {
    const { p } = getCanvasPoint(e);
    pointerOrchestrator.handleCanvasDoubleClick(p, () => e.preventDefault());
  });
  bindEvent(cv, "touchstart", handleTouchStart, { passive: false });
  bindEvent(cv, "touchmove", handleTouchMove, { passive: false });
  bindEvent(cv, "touchend", handleTouchEnd, { passive: false });

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

