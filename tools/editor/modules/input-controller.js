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
    normalizeFlowLocks, drawCellX, drawCellY, getCellTopologyCached, getHiddenSet,
    planNumberRegionsUncached, getDataFlowGroupsUncached, makeCalcBudget, calcNow,
    getRectCalcCache,
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
  const buildRebuiltFlowPreview = flowDrag => {
    if (!flowDrag) return null;
    if (typeof drawCellX !== "function" || typeof drawCellY !== "function" || typeof getCellTopologyCached !== "function") return null;
    if (typeof getHiddenSet !== "function" || typeof planNumberRegionsUncached !== "function" || typeof getDataFlowGroupsUncached !== "function") return null;
    const r = cur();
    if (!r || isRectLocked(r)) return null;
    const rid = Math.max(0, Math.round(Number(flowDrag.rid) || 0));
    const fromIndex = Math.max(0, Math.round(Number(flowDrag.fromIndex) || 0));
    const currentIndex = Math.max(fromIndex, Math.round(Number(flowDrag.currentIndex) || fromIndex));
    const regionPoints = (st.flowEditPoints || []).filter(p => Math.max(0, Math.round(Number(p && p.rid) || 0)) === rid);
    if (!regionPoints.length) return null;
    const target = regionPoints.find(p => Math.max(0, Math.round(Number(p && p.index) || 0)) === currentIndex);
    if (!target) return null;
    const rr = {
      ...r,
      flowLocks: typeof normalizeFlowLocks === "function" ? normalizeFlowLocks(r.flowLocks) : (r.flowLocks && typeof r.flowLocks === "object" ? { ...r.flowLocks } : {})
    };
    if (String(flowDrag.kind || "") === "start") setFlowStart(rr, rid, target.cid);
    else setFlowLock(rr, rid, fromIndex, target.cid);
    const cx = drawCellX(rr), cy = drawCellY(rr);
    const topo = getCellTopologyCached(rr, cx, cy);
    const hs = getHiddenSet(rr);
    const budget = typeof makeCalcBudget === "function" ? makeCalcBudget() : { timedOut: false, deadline: 0 };
    if (typeof calcNow === "function") budget.deadline = calcNow() + 5000;
    const regions = planNumberRegionsUncached(rr, cx, cy, topo, hs, budget);
    if (!regions || budget.timedOut) return null;
    const groups = getDataFlowGroupsUncached(rr, cx, cy, topo, hs, regions, budget, { onlyRid: rid });
    if (!Array.isArray(groups) || budget.timedOut) return null;
    const g = groups.find(it => Math.max(0, Math.round(Number(it && it.rid) || 0)) === rid);
    if (!g || !Array.isArray(g.points) || g.points.length < 2) return null;
    return {
      rid,
      fromIndex,
      currentIndex,
      kind: String(flowDrag.kind || "") === "start" ? "start" : "lock",
      points: g.points.map((p, i) => ({
        u: +p.u || 0,
        v: +p.v || 0,
        index: i,
        cid: Math.max(0, Math.round(Number(p && p.cid) || 0))
      }))
    };
  };
  const rebuildAndPatchFlowRegion = (r, rid, timeoutMs = 5000) => {
    if (!r || typeof getRectCalcCache !== "function") return false;
    const rg = Math.max(0, Math.round(Number(rid) || 0));
    if (typeof drawCellX !== "function" || typeof drawCellY !== "function" || typeof getCellTopologyCached !== "function") return false;
    if (typeof getHiddenSet !== "function" || typeof planNumberRegionsUncached !== "function" || typeof getDataFlowGroupsUncached !== "function") return false;
    const cx = drawCellX(r), cy = drawCellY(r);
    const topo = getCellTopologyCached(r, cx, cy);
    const hs = getHiddenSet(r);
    const budget = typeof makeCalcBudget === "function" ? makeCalcBudget() : { timedOut: false, deadline: 0 };
    if (typeof calcNow === "function") budget.deadline = calcNow() + Math.max(50, Math.round(Number(timeoutMs) || 0));
    const regions = planNumberRegionsUncached(r, cx, cy, topo, hs, budget);
    if (!regions || budget.timedOut) return false;
    const groups = getDataFlowGroupsUncached(r, cx, cy, topo, hs, regions, budget, { onlyRid: rg });
    if (!Array.isArray(groups) || budget.timedOut) return false;
    const group = groups.find(it => Math.max(0, Math.round(Number(it && it.rid) || 0)) === rg) || null;
    const cache = getRectCalcCache(r);
    if (!cache) return false;
    const prev = (cache.flow && Array.isArray(cache.flow.value)) ? cache.flow.value : [];
    const next = prev.filter(it => Math.max(0, Math.round(Number(it && it.rid) || 0)) !== rg);
    if (group) next.push(group);
    next.sort((a, b) => Math.max(0, Math.round(Number(a && a.rid) || 0)) - Math.max(0, Math.round(Number(b && b.rid) || 0)));
    if (cache.flow && typeof cache.flow === "object") {
      cache.flow.value = next;
      cache.flow.pending = false;
    } else {
      cache.flow = { key: "", regionKey: "", value: next, pending: false };
    }
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
    const panWithLeft = e.button === 0 && (st.keys.space || st.lockAll);
    const pan = e.button === 1 || e.button === 2 || panWithLeft;
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

