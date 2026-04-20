export const setupPointerOrchestratorController = (deps = {}) => {
  const {
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
    resetFlowRegionOverrides,
    syncProps,
    findFlowStartHandle
  } = deps;

  const selectHitRectIfNeeded = h => {
    if (h && h.id !== st.sel) selRect(h.id);
    return h || null;
  };
  const handlePointerDownDrawOrNote = p => {
    if (!(st.mode === "draw" || isNoteMode())) return false;
    st.draft = { x: p.x, y: p.y, width: 0, height: 0, sx: p.x, sy: p.y, kind: (isNoteMode() ? "note" : "rect") };
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
    if (isMaskMode()) {
      const r = getHoveredRect(p);
      st.maskHover = r ? snapMaskNode(r, p.x, p.y) : null;
      render();
      return true;
    }
    if (isCellEditMode()) {
      const r = getHoveredRect(p);
      st.cellHover = r ? getCellLinkCandidateAtPoint(r, p.x, p.y) : null;
      st.cellHoverPos = r ? { x: p.x, y: p.y } : null;
      render();
      return true;
    }
    if (isRigEditMode()) {
      if (handleRigPointerMove) return !!handleRigPointerMove(p);
      const r = getHoveredRect(p);
      st.rigHover = r ? getRigHitAtPoint(r, p.x, p.y, st.zoom) : null;
      render();
      return true;
    }
    if (isClusterEditMode()) return !!clusterController.handleClusterPointerMove(p);
    if (handleFlowEditPointerMove(p)) return true;
    if (navigationController.handleDraftPointerMove(p)) return true;
    if (navigationController.handleDragPointerMove(p, o)) return true;
    return false;
  };

  const handlePointerUpCluster = () => clusterController.handlePointerUpCluster();
  const handlePointerUpFlowLink = () => flowController.handlePointerUpFlowLink();
  const handlePointerUpFlowDrag = () => flowController.handlePointerUpFlowDrag();
  const handleCanvasPointerUp = () => {
    const hadDrag = !!st.drag;
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
    st.drag = null;
    st.g.x = null;
    st.g.y = null;
    st.dg = null;
    if (created) {
      setMode("select");
      selRect(created.id);
      if (isNoteRect(created)) openNoteEditor(created.id);
    }
    if (hadDrag || created) { refreshPanels(); schedulePersist("project"); }
    render();
    return true;
  };

  const handleCanvasMouseLeave = () => {
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
