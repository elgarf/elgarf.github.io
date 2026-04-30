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
    mkShape,
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
    shapePointHit,
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
  const ensureShapeDraft = () => {
    if (!st.shapeDraft || !Array.isArray(st.shapeDraft.points)) st.shapeDraft = { points: [] };
    return st.shapeDraft;
  };
  const clearShapeDraft = () => {
    st.shapeDraft = null;
  };
  const finalizeShapeDraft = () => {
    const d = st.shapeDraft;
    const pts = d && Array.isArray(d.points) ? d.points : [];
    if (pts.length < 3) return false;
    const created = typeof mkShape === "function" ? mkShape(pts) : null;
    clearShapeDraft();
    if (created) {
      st.rects.unshift(created);
      setMode("select");
      selRect(created.id);
      refreshPanels();
      schedulePersist("project");
    }
    render();
    return true;
  };
  const findShapeEditHit = p => {
    if (!Array.isArray(st && st.rects)) return null;
    for (let i = 0; i < st.rects.length; i++) {
      const r = st.rects[i];
      if (!r || typeof isShapeRect !== "function" || !isShapeRect(r) || isRectLocked(r)) continue;
      const pointIndex = typeof shapePointHit === "function" ? shapePointHit(r, p.x, p.y, st.zoom) : -1;
      if (pointIndex >= 0) return { rect: r, pointIndex, segmentIndex: -1 };
      const segmentIndex = typeof shapeSegmentHit === "function" ? shapeSegmentHit(r, p.x, p.y, st.zoom) : -1;
      if (segmentIndex >= 0) return { rect: r, pointIndex: -1, segmentIndex };
    }
    return null;
  };
  const isSelectedRectId = id => {
    const n = Math.round(Number(id) || 0);
    if (st && st.selSet instanceof Set && st.selSet.has(n)) return true;
    return Math.round(Number(st && st.sel) || 0) === n;
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
    if (!(st.mode === "draw" || isNoteMode())) return false;
    st.draft = null;
    st.draftPending = {
      sx: p.x,
      sy: p.y,
      kind: (isNoteMode() ? "note" : "rect")
    };
    return true;
  };
  const shapeDraftCloseHit = p => {
    const d = st.shapeDraft;
    const pts = d && Array.isArray(d.points) ? d.points : [];
    if (pts.length < 3) return false;
    const first = pts[0];
    const radius = 11 / zoomSafe(st.zoom);
    return Math.hypot((Number(first.x) || 0) - p.x, (Number(first.y) || 0) - p.y) <= radius;
  };
  const handlePointerDownShape = (p, opts = null) => {
    if (st.mode !== "shape") return false;
    if (st.shapeDraft && Math.round(Number(opts && opts.clickCount) || 1) > 1) {
      finalizeShapeDraft();
      st.shapeSuppressNextDoubleClick = true;
      return true;
    }
    const d = ensureShapeDraft();
    const pts = d.points;
    if (shapeDraftCloseHit(p)) {
      finalizeShapeDraft();
      return true;
    }
    if (!pts.length) {
      const editHit = findShapeEditHit(p);
      if (editHit && editHit.rect) {
        const r = editHit.rect;
        if (editHit.segmentIndex >= 0 && Array.isArray(r.shapePoints)) {
          const uv = worldToRectUV(r, p.x, p.y);
          const insertAt = Math.max(0, Math.min(r.shapePoints.length, editHit.segmentIndex + 1));
          r.shapePoints.splice(insertAt, 0, { x: Math.round(Number(uv.u) || 0), y: Math.round(Number(uv.v) || 0) });
          if (typeof normalizeShapeBounds === "function") normalizeShapeBounds(r);
          st.shapePointSel = { id: r.id, index: insertAt };
          setMode("select");
          selRect(r.id);
          refreshPanels();
          schedulePersist("project");
          render();
          return true;
        }
        if (editHit.pointIndex >= 0) {
          st.shapePointSel = { id: r.id, index: editHit.pointIndex };
          setMode("select");
          selRect(r.id);
          syncProps();
          render();
          return true;
        }
      }
    }
    const last = pts[pts.length - 1];
    if (!last || Math.hypot((Number(last.x) || 0) - p.x, (Number(last.y) || 0) - p.y) > 0.001) {
      pts.push({ x: Math.round(p.x), y: Math.round(p.y) });
    }
    d.pointerX = p.x;
    d.pointerY = p.y;
    render();
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
    toggleCellLinkAtPoint(h, p.x, p.y);
    return true;
  };
  const handlePointerDownCluster = p => {
    if (!isClusterEditMode()) return false;
    return !!clusterController.handlePointerDownCluster(p);
  };
  const handlePointerDownRig = p => {
    if (!isRigEditMode()) return false;
    return !!handleRigPointerDown(p);
  };
  const handlePointerDownFlow = (p, opts = null) => {
    if (st.mode !== "flowEdit") return false;
    return !!handleFlowEditPointerDown(p, opts);
  };
  const handlePointerDownSelect = (p, opts = null) => navigationController.handlePointerDownSelect(p, opts);
  const toggleInstallLayer = id => {
    const key = String(id || "");
    if (!key) return false;
    if (!st.installLayers || typeof st.installLayers !== "object") st.installLayers = { text: true, flow: true, rig: true };
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
      const h = hit(p.x, p.y);
      suppressMoveCursorUntilMouseUp = !!(h && !isSelectedRectId(h.id));
    }
    if (handlePointerDownShape(p, opts)) return;
    if (handlePointerDownDrawOrNote(p)) return;
    if (handlePointerDownMask(p)) return;
    if (handlePointerDownCell(p)) return;
    if (handlePointerDownCluster(p)) return;
    if (handlePointerDownRig(p)) return;
    if (handlePointerDownFlow(p, opts)) return;
    if (st.mode === "select") {
      const h = hit(p.x, p.y);
      if (h && typeof isShapeRect === "function" && isShapeRect(h) && !isRectLocked(h) && typeof shapePointHit === "function") {
        const pointIndex = shapePointHit(h, p.x, p.y, st.zoom);
        if (pointIndex >= 0) {
          if (h.id !== st.sel) selRect(h.id);
          st.shapePointSel = { id: h.id, index: pointIndex };
          st.shapePointDrag = { id: h.id, index: pointIndex, changed: false };
          syncProps();
          render();
          return;
        }
      }
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
    if (st.shapePointDrag) {
      const drag = st.shapePointDrag;
      const r = getRectById(drag.id);
      if (!r || !isShapeRect(r) || isRectLocked(r) || !Array.isArray(r.shapePoints)) {
        st.shapePointDrag = null;
        return false;
      }
      const uv = worldToRectUV(r, p.x, p.y);
      const index = Math.max(0, Math.min(r.shapePoints.length - 1, Math.round(Number(drag.index) || 0)));
      r.shapePoints[index] = { x: Math.round(Number(uv.u) || 0), y: Math.round(Number(uv.v) || 0) };
      if (typeof normalizeShapeBounds === "function") normalizeShapeBounds(r);
      drag.changed = true;
      if (typeof syncPropsSmart === "function") syncPropsSmart();
      render();
      return true;
    }
    if (st.mode === "shape" && st.shapeDraft) {
      st.shapeDraft.pointerX = p.x;
      st.shapeDraft.pointerY = p.y;
      render();
      return true;
    }
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
    if (!st.draft && st.draftPending && (st.mode === "draw" || isNoteMode())) {
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
    if (st.shapeSuppressNextDoubleClick) {
      st.shapeSuppressNextDoubleClick = false;
      preventDefault();
      return;
    }
    if (st.mode === "shape" && st.shapeDraft && finalizeShapeDraft()) {
      preventDefault();
      return;
    }
    const h = hit(p.x, p.y);
    if (!h) return;
    if (typeof isShapeRect === "function" && isShapeRect(h)) {
      if (h.id !== st.sel) selRect(h.id);
      const pointIndex = typeof shapePointHit === "function" ? shapePointHit(h, p.x, p.y, st.zoom) : -1;
      if (pointIndex >= 0 && Array.isArray(h.shapePoints) && h.shapePoints.length > 3) {
        h.shapePoints.splice(pointIndex, 1);
        if (typeof normalizeShapeBounds === "function") normalizeShapeBounds(h);
        st.shapePointSel = null;
        schedulePersist("project");
        syncProps();
        render();
        preventDefault();
      }
      return;
    }
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
