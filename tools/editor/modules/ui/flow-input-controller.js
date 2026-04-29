export const setupFlowInputController = (deps = {}) => {
  const {
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
    findFlowResetButton,
    findFlowEditPoint,
    addFlowLinkBetween,
    setFlowStart,
    setFlowLock,
    updateManualFlowPoint,
    dragManualFlowPoint,
    worldToRectUV,
    buildRebuiltFlowPreview,
    rebuildAndPatchFlowRegion,
    finishPointerUp
  } = deps;

  const buildFlowDragPreview = () => {
    const fd = st.flowDrag;
    if (!fd) return null;
    const rid = Math.max(0, Math.round(Number(fd.rid) || 0));
    const fromIndex = Math.max(0, Math.round(Number(fd.fromIndex) || 0));
    const currentIndex = Math.max(fromIndex, Math.round(Number(fd.currentIndex) || fromIndex));
    const points = (st.flowEditPoints || [])
      .filter(p => Math.max(0, Math.round(Number(p && p.rid) || 0)) === rid)
      .sort((a, b) => (Number(a && a.index) || 0) - (Number(b && b.index) || 0));
    if (!points.length) return null;

    const isStartMove = String((fd && fd.kind) || "") === "start";
    const prefix = isStartMove ? [] : points.filter(p => (Number(p && p.index) || 0) < fromIndex);
    const suffix = points.filter(p => (Number(p && p.index) || 0) >= currentIndex);
    const merged = [...prefix, ...suffix];
    if (!merged.length) return null;
    return {
      rid,
      fromIndex,
      currentIndex,
      kind: isStartMove ? "start" : "lock",
      points: merged.map(p => ({ u: +p.u || 0, v: +p.v || 0, index: Math.max(0, Math.round(Number(p.index) || 0)) }))
    };
  };
  const clearDragPreview = () => {
    st.flowDragPreview = null;
  };
  const localCursorForRect = (r, p) => {
    if (!r || !p || typeof worldToRectUV !== "function") return null;
    const uv = worldToRectUV(r, +p.x || 0, +p.y || 0);
    if (!uv) return null;
    return { u: +uv.u || 0, v: +uv.v || 0 };
  };

  const handleFlowEditPointerMove = p => {
    if (st.mode !== "flowEdit") return false;
    if (String(st.flowEditVariant || "auto") === "manual") {
      if (st.manualFlowDrag) {
        const md = st.manualFlowDrag;
        const dx = (+p.x || 0) - (+md.downX || 0);
        const dy = (+p.y || 0) - (+md.downY || 0);
        if (!md.moved && Math.hypot(dx, dy) < Math.max(4, 5 / Math.max(0.2, st.zoom || 1))) {
          render();
          return true;
        }
        const r = cur();
        if (r && typeof dragManualFlowPoint === "function") {
          const cursorLocal = localCursorForRect(r, p);
          if (!md.appliedStart) {
            if (dragManualFlowPoint(r, md.rid, md.cid)) md.changed = true;
            md.appliedStart = true;
            const startPoint = findFlowEditPoint(md.downX, md.downY, md.rid);
            if (startPoint) st.flowDragPreview = { rid: md.rid, kind: "manual", points: [{ u: +startPoint.u || 0, v: +startPoint.v || 0, index: 0 }], cursorU: cursorLocal ? cursorLocal.u : (+startPoint.u || 0), cursorV: cursorLocal ? cursorLocal.v : (+startPoint.v || 0) };
          }
          md.moved = true;
          const fp = findFlowEditPoint(p.x, p.y, md.rid);
          if (fp && fp.cid !== md.lastCid) {
            md.lastCid = fp.cid;
            if (dragManualFlowPoint(r, md.rid, fp.cid)) md.changed = true;
            if (typeof rebuildAndPatchFlowRegion === "function") rebuildAndPatchFlowRegion(r, md.rid, 5000);
          }
          const previewPoints = (st.flowEditPoints || [])
            .filter(pt => pt.rid === md.rid && pt.manualActive)
            .sort((a, b) => (Number(a.manualIndex) || 0) - (Number(b.manualIndex) || 0))
            .map(pt => ({ u: +pt.u || 0, v: +pt.v || 0, index: Math.max(0, Math.round(Number(pt.manualIndex) || 0)) }));
          const hoverPoint = fp || findFlowEditPoint(p.x, p.y, md.rid);
          if (hoverPoint && !previewPoints.some(pt => Math.hypot((+pt.u || 0) - (+hoverPoint.u || 0), (+pt.v || 0) - (+hoverPoint.v || 0)) < 1e-6)) {
            previewPoints.push({ u: +hoverPoint.u || 0, v: +hoverPoint.v || 0, index: previewPoints.length });
          }
          st.flowDragPreview = { rid: md.rid, kind: "manual", points: previewPoints, cursorU: cursorLocal ? cursorLocal.u : null, cursorV: cursorLocal ? cursorLocal.v : null };
        }
        st.flowHover = findFlowEditPoint(p.x, p.y, md.rid);
        st.flowResetHover = null;
        render();
        return true;
      }
      if (st.flowLinkDrag) {
        st.flowLinkDrag = null;
        st.flowLinkPending = null;
      }
      clearDragPreview();
      const resetBtn = typeof findFlowResetButton === "function" ? findFlowResetButton(p.x, p.y) : null;
      st.flowLinkHover = null;
      st.flowDirHover = null;
      st.flowResetHover = resetBtn;
      if (resetBtn) {
        st.flowHover = null;
        render();
        return true;
      }
      const h = hit(p.x, p.y);
      if (selectHoveredRectSmart(h)) {
        render();
        return true;
      }
      st.flowHover = findFlowEditPoint(p.x, p.y);
      render();
      return true;
    }
    if (st.flowLinkDrag) {
      updateFlowLinkDragTarget(p.x, p.y);
      resetFlowHoverTransient();
      clearDragPreview();
      render();
      return true;
    }
    if (!st.flowDrag) {
      clearDragPreview();
      st.flowLinkHover = findFlowLinkAtPoint(p.x, p.y);
      const h = hit(p.x, p.y);
      if (selectHoveredRectSmart(h)) {
        render();
        return true;
      }
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
    const prevIndex = Math.max(0, Math.round(Number(st.flowDrag.currentIndex) || 0));
    st.flowDrag.currentIndex = fp ? fp.index : st.flowDrag.fromIndex;
    if (st.flowDrag.currentIndex !== prevIndex || !st.flowDragPreview) {
      const rebuilt = typeof buildRebuiltFlowPreview === "function" ? buildRebuiltFlowPreview(st.flowDrag) : null;
      st.flowDragPreview = rebuilt || buildFlowDragPreview();
    }
    render();
    return true;
  };

  const handlePointerUpFlowLink = () => {
    if (!st.flowLinkDrag) return false;
    const fd = st.flowLinkDrag;
    st.flowLinkDrag = null;
    clearDragPreview();
    let changed = false;
    if (fd && fd.from && fd.target && fd.canLink) changed = addFlowLinkBetween(fd.from, fd.target);
    st.flowLinkPending = null;
    st.flowLinkHover = null;
    finishPointerUp(changed);
    return true;
  };

  const handlePointerUpFlowDrag = () => {
    if (st.manualFlowDrag) {
      const r = cur();
      const md = st.manualFlowDrag;
      st.manualFlowDrag = null;
      clearDragPreview();
      let changed = !!(md && md.changed);
      if (r && md && !md.moved && typeof updateManualFlowPoint === "function") {
        changed = !!updateManualFlowPoint(r, md.rid, md.cid);
      }
      if (r && md && changed && typeof rebuildAndPatchFlowRegion === "function") rebuildAndPatchFlowRegion(r, md.rid, 5000);
      finishPointerUp(changed);
      return true;
    }
    if (!st.flowDrag) return false;
    const r = cur();
    const fd = st.flowDrag;
    st.flowDrag = null;
    clearDragPreview();
    let changed = false;
    if (r) {
      const isStartMove = String((fd && fd.kind) || "") === "start";
      const pts = (st.flowEditPoints || []).filter(p => p.rid === fd.rid && (isStartMove ? p.index >= 0 : p.index >= fd.fromIndex));
      const target = pts.find(p => p.index === fd.currentIndex) || pts[0];
      if (isStartMove) {
        if (target && target.cid !== fd.cid) {
          setFlowStart(r, fd.rid, target.cid);
          changed = true;
        }
      } else if (target && target.index >= fd.fromIndex && target.cid !== fd.cid) {
        setFlowLock(r, fd.rid, fd.fromIndex, target.cid);
        changed = true;
      }
      if (changed && typeof rebuildAndPatchFlowRegion === "function") rebuildAndPatchFlowRegion(r, fd.rid, 5000);
    }
    finishPointerUp(changed);
    return true;
  };

  const handleFlowMouseLeave = () => {
    if (st.mode !== "flowEdit") return false;
    if (!(st.flowHover || st.flowDirHover || st.flowLinkHover)) return false;
    resetFlowHoverTransient();
    clearDragPreview();
    render();
    return true;
  };

  return {
    handleFlowEditPointerMove,
    handlePointerUpFlowLink,
    handlePointerUpFlowDrag,
    handleFlowMouseLeave
  };
};
