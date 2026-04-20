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
    findFlowEditPoint,
    addFlowLinkBetween,
    setFlowStart,
    setFlowLock,
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

  const handleFlowEditPointerMove = p => {
    if (st.mode !== "flowEdit") return false;
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
