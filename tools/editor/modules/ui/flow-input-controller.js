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
    finishPointerUp
  } = deps;

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
    st.flowDrag.currentIndex = fp ? fp.index : st.flowDrag.fromIndex;
    render();
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
    const r = cur();
    const fd = st.flowDrag;
    st.flowDrag = null;
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
    }
    finishPointerUp(changed);
    return true;
  };

  const handleFlowMouseLeave = () => {
    if (st.mode !== "flowEdit") return false;
    if (!(st.flowHover || st.flowDirHover || st.flowLinkHover)) return false;
    resetFlowHoverTransient();
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
