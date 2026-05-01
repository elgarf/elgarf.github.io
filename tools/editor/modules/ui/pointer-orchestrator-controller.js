import { setupShapeInputController } from "../shape/shape-input-controller.js";

export const setupPointerOrchestratorController = (deps = {}) => {
  const {
    st,
    cv,
    render,
    renderOverlay = render,
    getRectById,
    hit,
    cur,
    selRect,
    isRectLocked,
    isNoteMode,
    isMaskMode,
    isCellEditMode,
    isCabinetEditMode,
    isClusterEditMode,
    isRigEditMode,
    addMaskPoint,
    toggleCellLinkAtPoint,
    beginCellKnifeDragAtPoint,
    updateCellKnifeDragAtPoint,
    snapMaskNode,
    getCellLinkCandidateAtPoint,
    getRigHitAtPoint,
    handleRigPointerDown,
    handleRigPointerMove,
    handleRigPointerLeave,
    handleFlowEditPointerDown,
    handleCabinetEditPointerDown,
    handleCabinetEditPointerMove,
    navigationController,
    clusterController,
    flowController,
    resetFlowHoverTransient,
    selectHoveredRectSmart,
    finishPointerUp,
    finishSelectionBox,
    mkNote,
    mk,
    mkShape,
    mkDevice,
    isNoteRect,
    isShapeRect,
    openNoteEditor,
    setMode,
    refreshPanels,
    schedulePersist,
    refreshMultiSelectionBase,
    resetCellTransient,
    resetRigHoverTransient,
    resetFlowRegionOverrides,
    syncProps,
    syncPropsSmart,
    findFlowStartHandle,
    worldToRectUV,
    rectUVToWorld,
    drawCellX,
    drawCellY,
    shapePointHit,
    shapePointHits,
    shapeEditHits,
    shapeSegmentHit,
    normalizeShapeBounds,
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
  } = deps;
  const NOTE_RESIZE_HANDLE_PX = 16;
  const DRAFT_START_MOVE_PX = 2;
  const NOTE_RESIZE_CURSOR = "nwse-resize";
  const MOVE_CURSOR = "move";
  const RESIZE_CURSORS = ["ew-resize", "ns-resize", "nwse-resize"];
  let lastPointer = null;
  let suppressMoveCursorUntilMouseUp = false;
  const zoomSafe = z => Math.max(0.25, Number(z) || 1);
  const noteResizePad = () => NOTE_RESIZE_HANDLE_PX / zoomSafe(st.zoom);
  const noteResizeMin = () => Math.max(24, 24 / zoomSafe(st.zoom));
  const draftMovePx = (dx, dy) => Math.hypot(dx, dy) * Math.max(0.1, Number(st.zoom) || 1);
  const isSelectedRectId = id => {
    const n = Math.round(Number(id) || 0);
    if (st && st.selSet instanceof Set && st.selSet.has(n)) return true;
    return Math.round(Number(st && st.sel) || 0) === n;
  };
  const pickFlowAnchorAtPoint = (wx, wy, kind = "") => {
    const pts = Array.isArray(st.flowLinkAnchors) ? st.flowLinkAnchors : [];
    const tol = Math.max(6, 9 / Math.max(0.35, st.zoom || 1));
    const kindNorm = String(kind || "").toLowerCase();
    let best = null;
    let bestD = Infinity;
    for (const p of pts) {
      if (kindNorm && String(p && p.kind || "").toLowerCase() !== kindNorm) continue;
      const d = Math.hypot((+p.x || 0) - (+wx || 0), (+p.y || 0) - (+wy || 0));
      if (d < bestD) { bestD = d; best = p; }
    }
    return (best && bestD <= tol) ? best : null;
  };
  const selectDevicePortAtPoint = p => {
    if (!p) return false;
    const a = pickFlowAnchorAtPoint(p.x, p.y);
    if (!a) return false;
    const r = getRectById(a.rectId);
    if (!r || String((r && r.kind) || "").toLowerCase() !== "device") return false;
    st.devicePortSelection = {
      rectId: Math.max(1, Math.round(Number(a.rectId) || 1)),
      cid: Math.max(1, Math.round(Number(a.cid) || 1)),
      kind: String(a.kind || "").toLowerCase() === "end" ? "end" : "start"
    };
    if (r.id !== st.sel) selRect(r.id);
    if (typeof syncProps === "function") syncProps();
    render();
    return true;
  };
  const setCanvasCursor = cursor => {
    if (!cv || !cv.style) return;
    const next = String(cursor || "");
    if (String(cv.style.cursor || "") !== next) cv.style.cursor = next;
  };
  const clearCursorIf = (...values) => {
    if (!cv || !cv.style) return;
    if (values.includes(String(cv.style.cursor || ""))) cv.style.cursor = "";
  };
  const setNoteResizeCursor = on => {
    if (on) setCanvasCursor(NOTE_RESIZE_CURSOR);
    else clearCursorIf(NOTE_RESIZE_CURSOR);
  };
  const multiResizeCursor = handle => (handle === "w" || handle === "e") ? "ew-resize" : (handle === "n" || handle === "s") ? "ns-resize" : "nwse-resize";
  const shapeInput = setupShapeInputController({
    st,
    render,
    getRectById,
    cur,
    selRect,
    isRectLocked,
    isNoteRect,
    isShapeRect,
    mkShape,
    setMode,
    refreshPanels,
    schedulePersist,
    syncProps,
    syncPropsSmart,
    worldToRectUV,
    rectUVToWorld,
    drawCellX,
    drawCellY,
    shapePointHit,
    shapePointHits,
    shapeEditHits,
    shapeSegmentHit,
    normalizeShapeBounds
  });
  const updateSelectHoverCursor = p => {
    if (st.mode !== "select" || st.drag || st.selBox || st.pan) {
      clearCursorIf(MOVE_CURSOR);
      return;
    }
    const h = hit(p.x, p.y);
    if (h && isNoteRect(h) && !isRectLocked(h) && isNoteResizeHit(h, p)) {
      setCanvasCursor(NOTE_RESIZE_CURSOR);
      return;
    }
    const selectedShape = cur();
    if (selectedShape && typeof isShapeRect === "function" && isShapeRect(selectedShape) && !isRectLocked(selectedShape)) {
      const selectedEditHit = shapeInput.chooseShapeEditHit(selectedShape, p.x, p.y);
      if (selectedEditHit && selectedEditHit.handle) {
        setCanvasCursor(MOVE_CURSOR);
        return;
      }
    }
    clearCursorIf(NOTE_RESIZE_CURSOR);
    if (!suppressMoveCursorUntilMouseUp && h && !isRectLocked(h) && isSelectedRectId(h.id)) setCanvasCursor(MOVE_CURSOR);
    else clearCursorIf(MOVE_CURSOR);
  };
  const isNoteResizeHit = (r, p) => {
    if (!r || !isNoteRect(r) || !p || typeof worldToRectUV !== "function") return false;
    const uv = worldToRectUV(r, p.x, p.y);
    if (!uv) return false;
    const pad = noteResizePad();
    return uv.u >= (r.width - pad) && uv.u <= (r.width + pad * .5) && uv.v >= (r.height - pad) && uv.v <= (r.height + pad * .5);
  };
  const beginNoteResize = (r, p) => {
    if (!r || !p) return false;
    st.noteResize = {
      id: r.id,
      sx: p.x,
      sy: p.y,
      x: r.x,
      y: r.y,
      width: r.width,
      height: r.height,
      changed: false
    };
    return true;
  };
  const handleNoteResizePointerMove = p => {
    const rs = st.noteResize;
    if (!rs) return false;
    const r = getRectById(rs.id);
    if (!r || !isNoteRect(r) || isRectLocked(r)) { st.noteResize = null; return false; }
    const minSize = noteResizeMin();
    const nextW = Math.max(minSize, rs.width + ((+p.x || 0) - (+rs.sx || 0)));
    const nextH = Math.max(minSize, rs.height + ((+p.y || 0) - (+rs.sy || 0)));
    if (Math.abs(nextW - r.width) < 0.001 && Math.abs(nextH - r.height) < 0.001) return true;
    r.width = nextW;
    r.height = nextH;
    rs.changed = true;
    render();
    return true;
  };

  const selectHitRectIfNeeded = h => {
    if (h && h.id !== st.sel) selRect(h.id);
    return h || null;
  };
  const handlePointerDownDrawOrNote = p => {
    if (!(st.mode === "draw" || isNoteMode() || st.mode === "device")) return false;
    st.draft = null;
      st.draftPending = {
      sx: p.x,
      sy: p.y,
      kind: (isNoteMode() ? "note" : (st.mode === "device" ? "device" : "rect"))
    };
    return true;
  };
  const handlePointerDownMask = p => {
    if (!isMaskMode()) return false;
    selectHitRectIfNeeded(hit(p.x, p.y));
    if (isRectLocked(cur())) return true;
    addMaskPoint(p.x, p.y);
    return true;
  };
  const handlePointerDownCell = p => {
    if (!isCellEditMode()) return false;
    const h = selectHitRectIfNeeded(hit(p.x, p.y));
    if (!h) { selRect(null); return true; }
    if (isRectLocked(h)) return true;
    st.cellKnifeDrag = beginCellKnifeDragAtPoint ? beginCellKnifeDragAtPoint(h, p.x, p.y) : null;
    if (!st.cellKnifeDrag) {
      st.cellHover = h ? getCellLinkCandidateAtPoint(h, p.x, p.y) : null;
      st.cellHoverPos = h ? { x: p.x, y: p.y } : null;
    }
    return true;
  };
  const handlePointerDownCluster = p => {
    if (!isClusterEditMode()) return false;
    return !!clusterController.handlePointerDownCluster(p);
  };
  const handlePointerDownCabinet = p => {
    if (!isCabinetEditMode()) return false;
    return !!handleCabinetEditPointerDown(p);
  };
  const handlePointerDownRig = p => {
    if (!isRigEditMode()) return false;
    return !!handleRigPointerDown(p);
  };
  const handlePointerDownFlow = (p, opts = null) => {
    if (st.mode === "flowEdit") return !!handleFlowEditPointerDown(p, opts);
    if (st.mode === "select") return !!handleFlowEditPointerDown(p, { ...(opts || {}), allowLinkOnly: true });
    return false;
  };
  const handlePointerDownSelect = (p, opts = null) => navigationController.handlePointerDownSelect(p, opts);
  const toggleInstallLayer = id => {
    const key = String(id || "");
    if (!key) return false;
    if (!st.installLayers || typeof st.installLayers !== "object") st.installLayers = { contours: true, text: true, flow: true, rig: true };
    st.installLayers[key] = st.installLayers[key] === false;
    schedulePersist("project");
    render();
    return true;
  };

  const handleCanvasPointerDown = (p, opts = null) => {
    suppressMoveCursorUntilMouseUp = false;
    if (typeof hitLayerButton === "function") {
      const layerId = hitLayerButton(p.x, p.y);
      if (layerId && toggleInstallLayer(layerId)) return;
    }
    if (st.mode === "select" && typeof hitMultiSelectionResizeHandle === "function" && typeof beginMultiSelectionResize === "function") {
      const resizeHandle = hitMultiSelectionResizeHandle(p.x, p.y);
      if (resizeHandle && beginMultiSelectionResize(resizeHandle, p)) {
        setCanvasCursor(multiResizeCursor(resizeHandle));
        render();
        return;
      }
    }
    if (st.mode === "select" && typeof hitMultiSelectionAction === "function" && typeof applyMultiSelectionAction === "function") {
      const action = hitMultiSelectionAction(p.x, p.y);
      if (action) {
        applyMultiSelectionAction(action);
        if (typeof clearMultiSelectionActionHover === "function") clearMultiSelectionActionHover();
        clearCursorIf("pointer");
        return;
      }
    }
    if (st.mode === "select") {
      const pickedDevicePort = selectDevicePortAtPoint(p);
      if (pickedDevicePort) {
        const picked = st.devicePortSelection;
        if (picked && picked.kind === "start") return;
      } else if (st.devicePortSelection) {
        st.devicePortSelection = null;
      }
      if (shapeInput.handlePointerDownSelectedShape(p, opts)) return;
      const h = hit(p.x, p.y);
      suppressMoveCursorUntilMouseUp = !!(h && !isSelectedRectId(h.id));
    }
    if (shapeInput.handlePointerDownShape(p, opts)) return;
    if (handlePointerDownDrawOrNote(p)) return;
    if (handlePointerDownMask(p)) return;
    if (handlePointerDownCell(p)) return;
    if (handlePointerDownCabinet(p)) return;
    if (handlePointerDownCluster(p)) return;
    if (handlePointerDownRig(p)) return;
    if (handlePointerDownFlow(p, opts)) return;
    if (st.mode === "select") {
      const h = hit(p.x, p.y);
      if (shapeInput.handlePointerDownHitShape(h, p, opts, isSelectedRectId)) return;
      if (h && isNoteRect(h) && !isRectLocked(h) && isNoteResizeHit(h, p)) {
        if (h.id !== st.sel) selRect(h.id);
        beginNoteResize(h, p);
        render();
        return;
      }
    }
    lastPointer = p;
    handlePointerDownSelect(p, opts);
  };

  const handleFlowEditPointerMove = p => flowController.handleFlowEditPointerMove(p);
  const getHoveredRect = p => {
    const h = hit(p.x, p.y);
    selectHoveredRectSmart(h);
    return h || cur();
  };
  const handleCanvasPointerMove = (p, opts = null) => {
    lastPointer = p;
    const o = (opts && typeof opts === "object") ? opts : {};
    if (navigationController.handlePanPointerMove(p, o)) return true;
    if (navigationController.handleSelectionBoxPointerMove(p)) return true;
    if (st.multiSelectionResize && typeof updateMultiSelectionResize === "function") {
      updateMultiSelectionResize(p, { disableSnap: !!o.ctrlSnap, fromCenter: !!o.altResize });
      setCanvasCursor(multiResizeCursor(st.multiSelectionResize.handle));
      if (typeof syncPropsSmart === "function") syncPropsSmart();
      render();
      return true;
    }
    if (st.noteResize) setNoteResizeCursor(true);
    if (handleNoteResizePointerMove(p)) return true;
    if (shapeInput.handlePointerMove(p, o)) return true;
    if (isMaskMode()) {
      setNoteResizeCursor(false);
      const r = getHoveredRect(p);
      st.maskHover = r ? snapMaskNode(r, p.x, p.y) : null;
      render();
      return true;
    }
    if (isCellEditMode()) {
      setNoteResizeCursor(false);
      const r = getHoveredRect(p);
      if (st.cellKnifeDrag && r && Number(r.id) === Number(st.cellKnifeDrag.rectId) && typeof updateCellKnifeDragAtPoint === "function") {
        if (updateCellKnifeDragAtPoint(r, st.cellKnifeDrag, p.x, p.y)) render();
      }
      st.cellHover = r ? getCellLinkCandidateAtPoint(r, p.x, p.y) : null;
      st.cellHoverPos = r ? { x: p.x, y: p.y } : null;
      render();
      return true;
    }
    if (isRigEditMode()) {
      setNoteResizeCursor(false);
      if (handleRigPointerMove) return !!handleRigPointerMove(p);
      const r = getHoveredRect(p);
      st.rigHover = r ? getRigHitAtPoint(r, p.x, p.y, st.zoom) : null;
      render();
      return true;
    }
    if (isCabinetEditMode()) {
      setNoteResizeCursor(false);
      if (typeof handleCabinetEditPointerMove === "function") return !!handleCabinetEditPointerMove(p);
      return true;
    }
    if (isClusterEditMode()) {
      setNoteResizeCursor(false);
      return !!clusterController.handleClusterPointerMove(p);
    }
    if (handleFlowEditPointerMove(p)) return true;
    if (typeof setLayerButtonHover === "function" && String(st.viewMode || "") === "install") {
      const changed = setLayerButtonHover(p.x, p.y);
      const hoveringLayer = !!st.installLayerButtonHover;
      if (hoveringLayer) setCanvasCursor("pointer");
      else clearCursorIf("pointer");
      if (changed) renderOverlay();
      if (hoveringLayer) return true;
    } else if (typeof clearLayerButtonHover === "function" && clearLayerButtonHover()) {
      clearCursorIf("pointer");
      renderOverlay();
    }
    if (st.mode === "select" && !st.drag && !st.selBox && !st.pan && typeof setMultiSelectionActionHover === "function") {
      const changed = setMultiSelectionActionHover(p.x, p.y);
      const hoveringAction = !!st.multiSelectionActionHover;
      const resizeHover = String(st.multiSelectionResizeHover || "");
      if (resizeHover) setCanvasCursor(multiResizeCursor(resizeHover));
      if (hoveringAction) setCanvasCursor("pointer");
      if (!hoveringAction && !resizeHover) clearCursorIf("pointer", ...RESIZE_CURSORS);
      if (changed) renderOverlay();
      if (hoveringAction || resizeHover) return true;
    } else if (typeof clearMultiSelectionActionHover === "function" && clearMultiSelectionActionHover()) {
      clearCursorIf("pointer", ...RESIZE_CURSORS);
      renderOverlay();
    }
    if (st.mode === "select" && !st.drag && !st.selBox && !st.pan) {
      updateSelectHoverCursor(p);
    } else {
      setNoteResizeCursor(false);
      if (!st.drag) clearCursorIf(MOVE_CURSOR);
    }
    if (!st.draft && st.draftPending && (st.mode === "draw" || isNoteMode() || st.mode === "device")) {
      const ds = st.draftPending;
      const dx = (+p.x || 0) - (+ds.sx || 0);
      const dy = (+p.y || 0) - (+ds.sy || 0);
      const movedPx = draftMovePx(dx, dy);
      if (movedPx >= DRAFT_START_MOVE_PX) {
        st.draft = { x: ds.sx, y: ds.sy, width: 0, height: 0, sx: ds.sx, sy: ds.sy, kind: String(ds.kind || "rect") };
      }
    }
    if (navigationController.handleDraftPointerMove(p)) return true;
    if (navigationController.handleDragPointerMove(p, o)) {
      setCanvasCursor(MOVE_CURSOR);
      if (typeof syncPropsSmart === "function") syncPropsSmart();
      return true;
    }
    return false;
  };

  const handlePointerUpCluster = () => clusterController.handlePointerUpCluster();
  const handlePointerUpFlowLink = () => flowController.handlePointerUpFlowLink();
  const handlePointerUpFlowDrag = () => flowController.handlePointerUpFlowDrag();
  const roundDraftSizePx = value => {
    const scale = Math.max(1, Math.round(Number(st.globalScale) || 256));
    const meters = Math.max(0.5, Math.round((Math.max(0, Number(value) || 0) / scale) * 2) / 2);
    return Math.max(1, Math.round(meters * scale));
  };
  const handleCanvasPointerUp = () => {
    const hadDrag = !!st.drag;
    const hadMovedDrag = !!(st.drag && st.drag.moved);
    const hadMultiSelectionResize = !!(st.multiSelectionResize && st.multiSelectionResize.changed);
    const hadNoteResize = !!(st.noteResize && st.noteResize.changed);
    const hadShapePointDrag = !!(st.shapePointDrag && st.shapePointDrag.changed);
    if (st.pan) { st.pan = false; st.panS = null; }
    if (isCellEditMode() && st.cellKnifeDrag) {
      const d = st.cellKnifeDrag;
      const r = getRectById(d.rectId);
      let changed = !!d.changed;
      if (r && !d.active) changed = !!toggleCellLinkAtPoint(r, d.startX, d.startY);
      st.cellKnifeDrag = null;
      if (changed) schedulePersist("project");
      render();
      return true;
    }
    if (st.selBox) { finishSelectionBox(); return true; }
    if (handlePointerUpCluster()) return true;
    if (handlePointerUpFlowLink()) return true;
    if (handlePointerUpFlowDrag()) return true;
    if (st.multiSelectionResize && typeof endMultiSelectionResize === "function") {
      endMultiSelectionResize();
      clearCursorIf(...RESIZE_CURSORS);
      render();
      return true;
    }
    let created = null;
    if (st.draft) {
      const d = st.draft;
      if (d.width >= 1 && d.height >= 1) {
        const width = roundDraftSizePx(d.width);
        const height = roundDraftSizePx(d.height);
        created = (String(d.kind || "") === "note")
          ? mkNote(d.x, d.y, width, height)
          : (String(d.kind || "") === "device")
            ? mkDevice(d.x, d.y, width, height)
          : mk(d.x, d.y, width, height);
        st.rects.unshift(created);
      }
      st.draft = null;
    }
    st.draftPending = null;
    st.drag = null;
    st.noteResize = null;
    st.shapePointDrag = null;
    st.g.x = null;
    st.g.y = null;
    st.dg = null;
    clearCursorIf(MOVE_CURSOR);
    suppressMoveCursorUntilMouseUp = false;
    if (created) {
      setMode("select");
      selRect(created.id);
      if (isNoteRect(created)) openNoteEditor(created.id);
    }
    if (hadMovedDrag && typeof refreshMultiSelectionBase === "function") refreshMultiSelectionBase();
    if (hadDrag || created || hadNoteResize || hadMultiSelectionResize || hadShapePointDrag) { refreshPanels(); schedulePersist("project"); }
    if (!created && lastPointer && st.mode === "select") updateSelectHoverCursor(lastPointer);
    render();
    return true;
  };

  const handleCanvasMouseLeave = () => {
    if (typeof clearLayerButtonHover === "function" && clearLayerButtonHover()) renderOverlay();
    if (typeof clearMultiSelectionActionHover === "function" && clearMultiSelectionActionHover()) renderOverlay();
    clearCursorIf("pointer", MOVE_CURSOR, ...RESIZE_CURSORS);
    setNoteResizeCursor(false);
    if (isCellEditMode() && (st.cellHover || st.cellHoverPos)) {
      resetCellTransient();
      render();
      return;
    }
    if (flowController.handleFlowMouseLeave()) return;
    if (isClusterEditMode() && clusterController.handleClusterMouseLeave()) return;
    if (isRigEditMode() && st.rigHover) {
      if (handleRigPointerLeave) { handleRigPointerLeave(); return; }
      resetRigHoverTransient();
      render();
    }
  };

  const handleCanvasDoubleClick = (p, preventDefault = () => { }) => {
    if (shapeInput.handleDoubleClickShape(p, preventDefault)) return;
    const h = hit(p.x, p.y);
    if (!h) return;
    if (shapeInput.handleDoubleClickHitShape(h, p, preventDefault)) return;
    if (isNoteRect(h)) {
      if (h.id !== st.sel) selRect(h.id);
      openNoteEditor(h.id);
      preventDefault();
      return;
    }
    if (h.id !== st.sel) return;
    if (st.mode !== "flowEdit") return;
    const r = cur();
    if (!r) return;
    const startHandle = findFlowStartHandle(p.x, p.y);
    if (!startHandle) return;
    st.flowRegionRid = startHandle.rid;
    resetFlowRegionOverrides(r, startHandle.rid);
    resetFlowHoverTransient();
    st.flowDrag = null;
    st.flowDragPreview = null;
    schedulePersist("project");
    syncProps();
    render();
    preventDefault();
  };

  return {
    handleCanvasPointerDown,
    handleCanvasPointerMove,
    handleCanvasPointerUp,
    handleCanvasMouseLeave,
    handleCanvasDoubleClick
  };
};
