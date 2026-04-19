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
    hit: (x, y) => hit(x, y),
    selRect: (id, opts) => selRect(id, opts),
    isSelected: id => isSelected(id),
    beginRectDrag: (h, p) => beginRectDrag(h, p),
    beginSelectionBox: (p, shiftToggle, touchLike) => beginSelectionBox(p, shiftToggle, touchLike),
    updateSelectionBox: p => updateSelectionBox(p),
    moveRectDrag: (p, disableSnap) => moveRectDrag(p, disableSnap)
  });
  const clusterController = setupClusterInputController({
    st,
    render,
    hit: (x, y) => hit(x, y),
    cur: () => cur(),
    selectHoveredRectSmart: h => selectHoveredRectSmart(h),
    beginClusterHandleDragAtPoint: (x, y) => beginClusterHandleDragAtPoint(x, y),
    handleClusterEditAtPoint: (x, y) => handleClusterEditAtPoint(x, y),
    updateClusterHandleDragAtPoint: (x, y) => updateClusterHandleDragAtPoint(x, y),
    updateClusterEditCursor: () => updateClusterEditCursor(),
    findClusterHandle: (x, y) => findClusterHandle(x, y),
    findActiveClusterBorder: (r, x, y) => findActiveClusterBorder(r, x, y),
    findClusterStartMarker: (r, x, y) => findClusterStartMarker(r, x, y),
    cellFromWorldPoint: (r, x, y, skipHidden) => cellFromWorldPoint(r, x, y, skipHidden),
    endClusterHandleDrag: () => endClusterHandleDrag(),
    finishPointerUp: changed => finishPointerUp(changed),
    resetClusterHoverTransient: () => resetClusterHoverTransient()
  });
  const flowController = setupFlowInputController({
    st,
    render,
    hit: (x, y) => hit(x, y),
    cur: () => cur(),
    selectHoveredRectSmart: h => selectHoveredRectSmart(h),
    updateFlowLinkDragTarget: (x, y) => updateFlowLinkDragTarget(x, y),
    resetFlowHoverTransient: () => resetFlowHoverTransient(),
    findFlowLinkAtPoint: (x, y) => findFlowLinkAtPoint(x, y),
    findFlowStartHandle: (x, y) => findFlowStartHandle(x, y),
    findFlowDirectionButton: (x, y) => findFlowDirectionButton(x, y),
    findFlowEditPoint: (x, y, rid, fromIndex) => findFlowEditPoint(x, y, rid, fromIndex),
    addFlowLinkBetween: (from, to) => addFlowLinkBetween(from, to),
    setFlowStart: (r, rid, cid) => setFlowStart(r, rid, cid),
    setFlowLock: (r, rid, fromIndex, cid) => setFlowLock(r, rid, fromIndex, cid),
    finishPointerUp: changed => finishPointerUp(changed)
  });
  const pointerOrchestrator = setupPointerOrchestratorController({
    st,
    render,
    hit: (x, y) => hit(x, y),
    cur: () => cur(),
    selRect: (id, opts) => selRect(id, opts),
    isRectLocked: r => isRectLocked(r),
    isNoteMode: () => isNoteMode(),
    isMaskMode: () => isMaskMode(),
    isCellEditMode: () => isCellEditMode(),
    isClusterEditMode: () => isClusterEditMode(),
    isRigEditMode: () => isRigEditMode(),
    addMaskPoint: (x, y) => addMaskPoint(x, y),
    toggleCellLinkAtPoint: (r, x, y) => toggleCellLinkAtPoint(r, x, y),
    snapMaskNode: (r, x, y) => snapMaskNode(r, x, y),
    getCellLinkCandidateAtPoint: (r, x, y) => getCellLinkCandidateAtPoint(r, x, y),
    getRigHitAtPoint: (r, x, y, z) => getRigHitAtPoint(r, x, y, z),
    handleRigPointerDown,
    handleRigPointerMove,
    handleRigPointerLeave,
    handleFlowEditPointerDown,
    navigationController,
    clusterController,
    flowController,
    resetFlowHoverTransient: () => resetFlowHoverTransient(),
    selectHoveredRectSmart: h => selectHoveredRectSmart(h),
    finishPointerUp: changed => finishPointerUp(changed),
    finishSelectionBox: () => finishSelectionBox(),
    mkNote: (x, y, w, h) => mkNote(x, y, w, h),
    mk: (x, y, w, h) => mk(x, y, w, h),
    isNoteRect: r => isNoteRect(r),
    openNoteEditor: id => openNoteEditor(id),
    setMode: mode => setMode(mode),
    refreshPanels: () => refreshPanels(),
    schedulePersist: kind => schedulePersist(kind),
    resetCellTransient: () => resetCellTransient(),
    resetRigHoverTransient: () => resetRigHoverTransient(),
    setSelection: (ids, activeId) => setSelection(ids, activeId),
    syncPropsSmart: () => syncPropsSmart(),
    resetFlowRegionOverrides: (r, rid) => resetFlowRegionOverrides(r, rid),
    syncProps: () => syncProps(),
    findFlowStartHandle: (x, y) => findFlowStartHandle(x, y)
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
    handleCanvasPointerDown: (p, opts) => handleCanvasPointerDown(p, opts),
    handleCanvasPointerMove: (p, opts) => handleCanvasPointerMove(p, opts),
    handleCanvasPointerUp: () => handleCanvasPointerUp()
  });
  const handleTouchStart = e => touchController.handleTouchStart(e);
  const handleTouchMove = e => touchController.handleTouchMove(e);
  const handleTouchEnd = e => touchController.handleTouchEnd(e);

  bindEvent(cv, "contextmenu", e => e.preventDefault());
  bindEvent(cv, "mousedown", e => {
    const b = cv.getBoundingClientRect(), sx = e.clientX - b.left, sy = e.clientY - b.top, p = s2w(sx, sy), pan = e.button === 1 || e.button === 2 || (st.keys.space && e.button === 0);
    if (pan) { st.pan = true; st.panS = { sx, sy, cx: st.camX, cy: st.camY }; render(); return; }
    if (e.button !== 0) return;
    handleCanvasPointerDown(p, { shiftToggle: !!e.shiftKey, touchLike: false });
  });
  bindWindowEvent("mousemove", e => {
    const b = cv.getBoundingClientRect(), sx = e.clientX - b.left, sy = e.clientY - b.top, p = s2w(sx, sy);
    handleCanvasPointerMove(p, { sx, sy, ctrlSnap: !!(e.ctrlKey || st.keys.ctrl) });
  });
  bindEvent(cv, "mouseleave", handleCanvasMouseLeave);
  bindWindowEvent("mouseup", () => { handleCanvasPointerUp(); });
  bindEvent(cv, "wheel", e => { e.preventDefault(); const b = cv.getBoundingClientRect(); deps.zoomAt(e.clientX - b.left, e.clientY - b.top, st.zoom * (e.deltaY < 0 ? 1.1 : .9)); }, { passive: false });
  bindEvent(cv, "dblclick", e => {
    const b = cv.getBoundingClientRect(), sx = e.clientX - b.left, sy = e.clientY - b.top, p = s2w(sx, sy);
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

