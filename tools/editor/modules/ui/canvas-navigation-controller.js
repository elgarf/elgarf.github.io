export const setupCanvasNavigationController = (deps = {}) => {
  const {
    st,
    render,
    hit,
    selRect,
    isSelected,
    beginRectDrag,
    beginSelectionBox,
    updateSelectionBox,
    moveRectDrag
  } = deps;

  const updateDraftFromPoint = (d, p) => {
    if (!d || !p) return;
    d.x = Math.min(d.sx, p.x);
    d.y = Math.min(d.sy, p.y);
    d.width = Math.abs(p.x - d.sx);
    d.height = Math.abs(p.y - d.sy);
    d.pointerX = p.x;
    d.pointerY = p.y;
  };

  const handlePointerDownSelect = (p, opts = null) => {
    const o = (opts && typeof opts === "object") ? opts : {};
    const h = hit(p.x, p.y);
    if (h) {
      if (o.shiftToggle) {
        selRect(h.id, { toggle: true });
        render();
        return true;
      }
      if (!isSelected(h.id)) selRect(h.id);
      beginRectDrag(h, p);
    } else {
      beginSelectionBox(p, !!o.shiftToggle, !!o.touchLike);
    }
    render();
    return true;
  };

  const handlePanPointerMove = (p, opts = null) => {
    const o = (opts && typeof opts === "object") ? opts : {};
    if (!(st.pan && st.panS)) return false;
    st.camX = st.panS.cx - (o.sx - st.panS.sx) / st.zoom;
    st.camY = st.panS.cy - (o.sy - st.panS.sy) / st.zoom;
    render();
    return true;
  };

  const handleSelectionBoxPointerMove = p => {
    if (!st.selBox) return false;
    updateSelectionBox(p);
    render();
    return true;
  };

  const handleDraftPointerMove = p => {
    if (!st.draft) return false;
    updateDraftFromPoint(st.draft, p);
    render();
    return true;
  };

  const handleDragPointerMove = (p, opts = null) => {
    if (!st.drag) return false;
    const o = (opts && typeof opts === "object") ? opts : {};
    moveRectDrag(p, !!o.ctrlSnap);
    render();
    return true;
  };

  return {
    handlePointerDownSelect,
    handlePanPointerMove,
    handleSelectionBoxPointerMove,
    handleDraftPointerMove,
    handleDragPointerMove
  };
};
