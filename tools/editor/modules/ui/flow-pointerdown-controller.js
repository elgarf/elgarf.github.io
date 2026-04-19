export const setupFlowPointerDownController = (deps = {}) => {
  const {
    st,
    render,
    hit,
    cur,
    selRect,
    syncProps,
    schedulePersist,
    isRectLocked,
    normalizeFlowLinks,
    flowAnchorKey,
    findFlowLinkAtPoint,
    findFlowStartHandle,
    findFlowDirectionButton,
    setFlowDirection,
    findFlowLinkAnchorAtPoint,
    updateFlowLinkDragTarget,
    findFlowEditPoint
  } = deps;

  const handleFlowEditPointerDown = p => {
    const linkHit = findFlowLinkAtPoint(p.x, p.y);
    if (linkHit && linkHit.link) {
      const killKey = `${flowAnchorKey(linkHit.link.from)}>${flowAnchorKey(linkHit.link.to)}`;
      st.flowLinks = normalizeFlowLinks(st.flowLinks).filter(it => `${flowAnchorKey(it.from)}>${flowAnchorKey(it.to)}` !== killKey);
      st.flowLinkPending = null;
      st.flowLinkDrag = null;
      st.flowLinkHover = null;
      schedulePersist("project");
      render();
      return true;
    }
    const h = hit(p.x, p.y);
    if (h && h.id === st.sel && !isRectLocked(h)) {
      const startHandle = findFlowStartHandle(p.x, p.y);
      if (startHandle) {
        st.flowRegionRid = startHandle.rid;
        st.flowDrag = { kind: "start", rid: startHandle.rid, fromIndex: 0, currentIndex: 0, cid: startHandle.cid };
        syncProps();
        render();
        return true;
      }
      const dirBtn = findFlowDirectionButton(p.x, p.y);
      if (dirBtn) {
        st.flowRegionRid = dirBtn.rid;
        const r = cur();
        if (r) {
          setFlowDirection(r, dirBtn.rid, dirBtn.dir, dirBtn.cid);
          st.flowHover = null;
          st.flowDirHover = dirBtn;
          schedulePersist("project");
          syncProps();
        }
        render();
        return true;
      }
    }
    const endAnchorHit = findFlowLinkAnchorAtPoint(p.x, p.y, "end");
    if (endAnchorHit) {
      st.flowLinkDrag = { from: { rectId: endAnchorHit.rectId, rid: endAnchorHit.rid, cid: endAnchorHit.cid, kind: "end", x: endAnchorHit.x, y: endAnchorHit.y }, x: p.x, y: p.y, target: null, canLink: false };
      updateFlowLinkDragTarget(p.x, p.y);
      st.flowLinkPending = null;
      render();
      return true;
    }
    if (!h) {
      st.flowLinkPending = null;
      st.flowLinkDrag = null;
      selRect(null);
      render();
      return true;
    }
    if (h.id !== st.sel) {
      selRect(h.id);
      render();
      return true;
    }
    if (isRectLocked(h)) {
      render();
      return true;
    }
    const fp = findFlowEditPoint(p.x, p.y);
    if (fp) {
      st.flowRegionRid = fp.rid;
      st.flowDrag = { rid: fp.rid, fromIndex: fp.index, currentIndex: fp.index, cid: fp.cid };
      syncProps();
    }
    render();
    return true;
  };

  return {
    handleFlowEditPointerDown
  };
};
