export const setupPointerOrchestratorController = (deps = {}) => {
  const {
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
    resetFlowRegionOverrides,
    syncProps,
    findFlowStartHandle,
    worldToRectUV
  } = deps;
  const NOTE_RESIZE_HANDLE_PX = 16;
  const DRAFT_START_MOVE_PX = 2;
  const NOTE_RESIZE_CURSOR = "nwse-resize";
  const setNoteResizeCursor = on => {
    if (!cv || !cv.style) return;
    const cur = String(cv.style.cursor || "");
    if (on) {
      if (cur !== NOTE_RESIZE_CURSOR) cv.style.cursor = NOTE_RESIZE_CURSOR;
      return;
    }
    if (cur === NOTE_RESIZE_CURSOR) cv.style.cursor = "";
  };
  const isNoteResizeHit = (r, p) => {
    if (!r || !isNoteRect(r) || !p || typeof worldToRectUV !== "function") return false;
    const uv = worldToRectUV(r, p.x, p.y);
    if (!uv) return false;
    const pad = NOTE_RESIZE_HANDLE_PX / Math.max(0.25, Number(st.zoom) || 1);
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
    const minSize = Math.max(24, 24 / Math.max(0.25, Number(st.zoom) || 1));
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
  const handlePointerDownFlow = p => {
    if (st.mode !== "flowEdit") return false;
    return !!handleFlowEditPointerDown(p);
  };
  const handlePointerDownSelect = (p, opts = null) => navigationController.handlePointerDownSelect(p, opts);

  const handleCanvasPointerDown = (p, opts = null) => {
    if (handlePointerDownDrawOrNote(p)) return;
    if (handlePointerDownMask(p)) return;
    if (handlePointerDownCell(p)) return;
    if (handlePointerDownCluster(p)) return;
    if (handlePointerDownRig(p)) return;
    if (handlePointerDownFlow(p)) return;
    if (st.mode === "select") {
      const h = hit(p.x, p.y);
      if (h && isNoteRect(h) && !isRectLocked(h) && isNoteResizeHit(h, p)) {
        if (h.id !== st.sel) selRect(h.id);
        beginNoteResize(h, p);
        render();
        return;
      }
    }
    handlePointerDownSelect(p, opts);
  };

  const handleFlowEditPointerMove = p => flowController.handleFlowEditPointerMove(p);
  const getHoveredRect = p => {
    const h = hit(p.x, p.y);
    selectHoveredRectSmart(h);
    return h || cur();
  };
  const handleCanvasPointerMove = (p, opts = null) => {
    const o = (opts && typeof opts === "object") ? opts : {};
    if (navigationController.handlePanPointerMove(p, o)) return true;
    if (navigationController.handleSelectionBoxPointerMove(p)) return true;
    if (st.noteResize) setNoteResizeCursor(true);
    if (handleNoteResizePointerMove(p)) return true;
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
    if (st.mode === "select" && !st.drag && !st.selBox && !st.pan) {
      const h = hit(p.x, p.y);
      setNoteResizeCursor(!!(h && isNoteRect(h) && !isRectLocked(h) && isNoteResizeHit(h, p)));
    } else {
      setNoteResizeCursor(false);
    }
    if (!st.draft && st.draftPending && (st.mode === "draw" || isNoteMode())) {
      const ds = st.draftPending;
      const dx = (+p.x || 0) - (+ds.sx || 0);
      const dy = (+p.y || 0) - (+ds.sy || 0);
      const movedPx = Math.hypot(dx, dy) * Math.max(0.1, Number(st.zoom) || 1);
      if (movedPx >= DRAFT_START_MOVE_PX) {
        st.draft = { x: ds.sx, y: ds.sy, width: 0, height: 0, sx: ds.sx, sy: ds.sy, kind: String(ds.kind || "rect") };
      }
    }
    if (navigationController.handleDraftPointerMove(p)) return true;
    if (navigationController.handleDragPointerMove(p, o)) return true;
    return false;
  };

  const handlePointerUpCluster = () => clusterController.handlePointerUpCluster();
  const handlePointerUpFlowLink = () => flowController.handlePointerUpFlowLink();
  const handlePointerUpFlowDrag = () => flowController.handlePointerUpFlowDrag();
  const handleCanvasPointerUp = () => {
    const hadDrag = !!st.drag;
    const hadNoteResize = !!(st.noteResize && st.noteResize.changed);
    if (st.pan) { st.pan = false; st.panS = null; }
    if (st.selBox) { finishSelectionBox(); return true; }
    if (handlePointerUpCluster()) return true;
    if (handlePointerUpFlowLink()) return true;
    if (handlePointerUpFlowDrag()) return true;
    let created = null;
    if (st.draft) {
      const d = st.draft;
      if (d.width >= 1 && d.height >= 1) {
        created = (String(d.kind || "") === "note")
          ? mkNote(d.x, d.y, d.width, d.height)
          : mk(d.x, d.y, d.width, d.height);
        st.rects.push(created);
      }
      st.draft = null;
    }
    st.draftPending = null;
    st.drag = null;
    st.noteResize = null;
    st.g.x = null;
    st.g.y = null;
    st.dg = null;
    if (created) {
      setMode("select");
      selRect(created.id);
      if (isNoteRect(created)) openNoteEditor(created.id);
    }
    if (hadDrag || created || hadNoteResize) { refreshPanels(); schedulePersist("project"); }
    render();
    return true;
  };

  const handleCanvasMouseLeave = () => {
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
    const h = hit(p.x, p.y);
    if (!h) return;
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
