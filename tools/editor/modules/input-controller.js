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

  const selectHitRectIfNeeded = h => {
    if (h && h.id !== st.sel) selRect(h.id);
    return h || null;
  };
  const selectHoveredRectSmart = h => {
    if (!h || h.id === st.sel) return false;
    setSelection([h.id], h.id);
    syncPropsSmart();
    return true;
  };
  const updateDraftFromPoint = (d, p) => {
    if (!d || !p) return;
    d.x = Math.min(d.sx, p.x);
    d.y = Math.min(d.sy, p.y);
    d.width = Math.abs(p.x - d.sx);
    d.height = Math.abs(p.y - d.sy);
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
    if (beginClusterHandleDragAtPoint(p.x, p.y)) { render(); return true; }
    handleClusterEditAtPoint(p.x, p.y);
    return true;
  };
  const handlePointerDownRig = p => {
    if (!isRigEditMode()) return false;
    return !!handleRigPointerDown(p);
  };
  const handlePointerDownFlow = p => {
    if (st.mode !== "flowEdit") return false;
    return !!handleFlowEditPointerDown(p);
  };
  const handlePointerDownSelect = (p, opts = null) => {
    const o = (opts && typeof opts === "object") ? opts : {};
    const h = hit(p.x, p.y);
    if (h) {
      if (o.shiftToggle) { selRect(h.id, { toggle: true }); render(); return true; }
      if (!isSelected(h.id)) selRect(h.id);
      beginRectDrag(h, p);
    } else {
      beginSelectionBox(p, !!o.shiftToggle, !!o.touchLike);
    }
    render();
    return true;
  };
  const handleCanvasPointerDown = (p, opts = null) => {
    if (handlePointerDownDrawOrNote(p)) return;
    if (handlePointerDownMask(p)) return;
    if (handlePointerDownCell(p)) return;
    if (handlePointerDownCluster(p)) return;
    if (handlePointerDownRig(p)) return;
    if (handlePointerDownFlow(p)) return;
    handlePointerDownSelect(p, opts);
  };
  const handleFlowEditPointerMove = p => {
    if (st.mode !== "flowEdit") return false;
    if (st.flowLinkDrag) {
      updateFlowLinkDragTarget(p.x, p.y);
      resetFlowHoverTransient();
      render();
      return true;
    }
    if (!st.flowDrag) {
      st.flowLinkHover = findFlowLinkAtPoint(p.x, p.y);
      const h = hit(p.x, p.y);
      if (selectHoveredRectSmart(h)) { render(); return true; }
      const startHandle = findFlowStartHandle(p.x, p.y);
      if (startHandle) {
        st.flowHover = { kind: "start", rid: startHandle.rid, cid: startHandle.cid };
        st.flowDirHover = null;
        render();
        return true;
      }
      const dirBtn = findFlowDirectionButton(p.x, p.y);
      st.flowDirHover = dirBtn;
      if (dirBtn) {
        st.flowHover = null;
        render();
        return true;
      }
      st.flowHover = findFlowEditPoint(p.x, p.y);
      render();
      return true;
    }
    const fp = findFlowEditPoint(p.x, p.y, st.flowDrag.rid, st.flowDrag.fromIndex);
    st.flowDrag.currentIndex = fp ? fp.index : st.flowDrag.fromIndex;
    render();
    return true;
  };
  const handleCanvasPointerMove = (p, opts = null) => {
    const o = (opts && typeof opts === "object") ? opts : {};
    if (st.pan && st.panS) { st.camX = st.panS.cx - (o.sx - st.panS.sx) / st.zoom; st.camY = st.panS.cy - (o.sy - st.panS.sy) / st.zoom; render(); return true; }
    if (st.selBox) { updateSelectionBox(p); render(); return true; }
    if (isMaskMode()) { const h = hit(p.x, p.y); selectHoveredRectSmart(h); const r = h || cur(); st.maskHover = r ? snapMaskNode(r, p.x, p.y) : null; render(); return true; }
    if (isCellEditMode()) { const h = hit(p.x, p.y); selectHoveredRectSmart(h); const r = h || cur(); st.cellHover = r ? getCellLinkCandidateAtPoint(r, p.x, p.y) : null; st.cellHoverPos = r ? { x: p.x, y: p.y } : null; render(); return true; }
    if (isRigEditMode()) { if (handleRigPointerMove) return !!handleRigPointerMove(p); const h = hit(p.x, p.y); selectHoveredRectSmart(h); const r = h || cur(); st.rigHover = r ? getRigHitAtPoint(r, p.x, p.y, st.zoom) : null; render(); return true; }
    if (isClusterEditMode()) {
      if (st.clusterDrag) {
        updateClusterHandleDragAtPoint(p.x, p.y);
        updateClusterEditCursor();
        render();
        return true;
      }
      const h = hit(p.x, p.y); selectHoveredRectSmart(h); const r = h || cur(); st.clusterHandleHover = r ? findClusterHandle(p.x, p.y) : null; st.clusterBorderHover = r ? findActiveClusterBorder(r, p.x, p.y) : null; st.clusterStartHover = r ? findClusterStartMarker(r, p.x, p.y) : null; const cc = (r ? cellFromWorldPoint(r, p.x, p.y, true) : null); st.clusterCellHover = (r && cc ? { rectId: r.id, col: cc.col, row: cc.row } : null); updateClusterEditCursor(); render(); return true;
    }
    if (handleFlowEditPointerMove(p)) return true;
    if (st.draft) { updateDraftFromPoint(st.draft, p); render(); return true; }
    if (st.drag) { moveRectDrag(p, !!o.ctrlSnap); render(); return true; }
    return false;
  };
  const finishPointerUp = changed => {
    if (changed) schedulePersist("project");
    render();
    return true;
  };
  const handlePointerUpCluster = () => {
    if (!st.clusterDrag) return false;
    const changed = endClusterHandleDrag();
    finishPointerUp(changed);
    return true;
  };
  const handlePointerUpFlowLink = () => {
    if (!st.flowLinkDrag) return false;
    const fd = st.flowLinkDrag;
    st.flowLinkDrag = null;
    let changed = false;
    if (fd && fd.from && fd.target && fd.canLink) changed = addFlowLinkBetween(fd.from, fd.target);
    st.flowLinkPending = null;
    st.flowLinkHover = null;
    finishPointerUp(changed);
    return true;
  };
  const handlePointerUpFlowDrag = () => {
    if (!st.flowDrag) return false;
    const r = cur(), fd = st.flowDrag; st.flowDrag = null;
    let changed = false;
    if (r) {
      const isStartMove = String(fd && fd.kind || "") === "start";
      const pts = (st.flowEditPoints || []).filter(p => p.rid === fd.rid && (isStartMove ? p.index >= 0 : p.index >= fd.fromIndex)), target = pts.find(p => p.index === fd.currentIndex) || pts[0];
      if (isStartMove) {
        if (target && target.cid !== fd.cid) { setFlowStart(r, fd.rid, target.cid); changed = true; }
      } else if (target && target.index >= fd.fromIndex && target.cid !== fd.cid) { setFlowLock(r, fd.rid, fd.fromIndex, target.cid); changed = true; }
    }
    finishPointerUp(changed);
    return true;
  };
  const handleCanvasPointerUp = () => {
    const hadDrag = !!st.drag; if (st.pan) { st.pan = false; st.panS = null; }
    if (st.selBox) { finishSelectionBox(); return true; }
    if (handlePointerUpCluster()) return true;
    if (handlePointerUpFlowLink()) return true;
    if (handlePointerUpFlowDrag()) return true;
    let created = null; if (st.draft) { const d = st.draft; if (d.width >= 1 && d.height >= 1) { created = (String(d.kind || "") === "note") ? mkNote(d.x, d.y, d.width, d.height) : mk(d.x, d.y, d.width, d.height); st.rects.push(created); } st.draft = null; }
    st.drag = null; st.g.x = null; st.g.y = null; st.dg = null;
    if (created) { setMode("select"); selRect(created.id); if (isNoteRect(created)) openNoteEditor(created.id); }
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
    if (st.mode === "flowEdit" && (st.flowHover || st.flowDirHover || st.flowLinkHover)) {
      resetFlowHoverTransient();
      render();
      return;
    }
    if (isClusterEditMode() && (st.clusterHandleHover || st.clusterCellHover || st.clusterStartHover || st.clusterBorderHover)) {
      resetClusterHoverTransient();
      updateClusterEditCursor();
      render();
      return;
    }
    if (isRigEditMode() && st.rigHover) { if (handleRigPointerLeave) { handleRigPointerLeave(); return; } resetRigHoverTransient(); render(); }
  };
  const touchDist = (a, b) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  const touchMid = (a, b, rect) => ({ sx: ((a.clientX + b.clientX) / 2) - rect.left, sy: ((a.clientY + b.clientY) / 2) - rect.top });
  const handleTouchStart = e => {
    const rect = cv.getBoundingClientRect();
    if (e.touches.length === 2) {
      const m = touchMid(e.touches[0], e.touches[1], rect);
      st.touch = { type: "pinch", startDist: touchDist(e.touches[0], e.touches[1]), startZoom: st.zoom, worldMid: s2w(m.sx, m.sy) };
      st.drag = null;
      st.selBox = null;
      st.pan = false;
      st.draft = null;
      e.preventDefault();
      return;
    }
    if (e.touches.length !== 1) return;
    const t = e.touches[0], sx = t.clientX - rect.left, sy = t.clientY - rect.top, p = s2w(sx, sy);
    st.touch = { type: "single" };
    if (st.lockAll) {
      st.pan = true;
      st.panS = { sx, sy, cx: st.camX, cy: st.camY };
      render();
      e.preventDefault();
      return;
    }
    handleCanvasPointerDown(p, { shiftToggle: false, touchLike: true });
    e.preventDefault();
  };
  const handleTouchMove = e => {
    const rect = cv.getBoundingClientRect();
    if (st.touch && st.touch.type === "pinch" && e.touches.length >= 2) {
      const m = touchMid(e.touches[0], e.touches[1], rect), dist = Math.max(1, touchDist(e.touches[0], e.touches[1])), vm = getViewMetrics();
      st.zoom = zc(st.touch.startZoom * (dist / st.touch.startDist));
      st.camX = st.touch.worldMid.x - (m.sx - vm.centerX) / st.zoom;
      st.camY = st.touch.worldMid.y - (m.sy - vm.centerY) / st.zoom;
      render();
      e.preventDefault();
      return;
    }
    if (e.touches.length !== 1) return;
    const t = e.touches[0], sx = t.clientX - rect.left, sy = t.clientY - rect.top, p = s2w(sx, sy);
    if (handleCanvasPointerMove(p, { sx, sy, ctrlSnap: false })) e.preventDefault();
  };
  const handleTouchEnd = e => {
    if (st.touch && st.touch.type === "pinch" && e.touches.length >= 1) {
      e.preventDefault();
      return;
    }
    if (e.touches.length === 0) {
      st.touch = null;
      handleCanvasPointerUp();
      e.preventDefault();
    }
  };

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
    const h = hit(p.x, p.y); if (!h) return;
    if (isNoteRect(h)) { if (h.id !== st.sel) selRect(h.id); openNoteEditor(h.id); e.preventDefault(); return; }
    if (h.id !== st.sel) return;
    if (st.mode !== "flowEdit") return;
    const r = cur(); if (!r) return;
    const startHandle = findFlowStartHandle(p.x, p.y);
    if (!startHandle) return;
    st.flowRegionRid = startHandle.rid;
    resetFlowRegionOverrides(r, startHandle.rid);
    resetFlowHoverTransient(); st.flowDrag = null;
    schedulePersist("project");
    syncProps();
    render();
    e.preventDefault();
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

