export const setupRigInputController = (deps = {}) => {
  const {
    st,
    cur,
    hit,
    render,
    selRect,
    setSelection,
    syncPropsSmart,
    isRectLocked,
    getRigHitAtPoint,
    applyRigActionAtPoint,
    resetRigHoverTransient,
    commitUiUpdate
  } = deps;

  const selectHoveredRectSmart = h => {
    if (!h || h.id === st.sel) return false;
    setSelection([h.id], h.id);
    syncPropsSmart();
    return true;
  };

  const handleRigPointerDown = p => {
    const rc = cur();
    if (rc && !isRectLocked(rc)) {
      const hover0 = getRigHitAtPoint(rc, p.x, p.y, st.zoom);
      if (hover0 && hover0.rectId === rc.id) {
        const changed = applyRigActionAtPoint(rc, p.x, p.y);
        if (changed) commitUiUpdate({ syncProps: true, persist: true, render: true });
        else render();
        return true;
      }
    }
    const h = hit(p.x, p.y);
    if (!h) {
      st.rigHover = null;
      render();
      return true;
    }
    if (h.id !== st.sel) selRect(h.id);
    if (isRectLocked(h)) {
      st.rigHover = null;
      render();
      return true;
    }
    const changed = applyRigActionAtPoint(h, p.x, p.y);
    if (changed) commitUiUpdate({ syncProps: true, persist: true, render: true });
    else render();
    return true;
  };

  const handleRigPointerMove = p => {
    const h = hit(p.x, p.y);
    selectHoveredRectSmart(h);
    const r = h || cur();
    st.rigHover = r ? getRigHitAtPoint(r, p.x, p.y, st.zoom) : null;
    render();
    return true;
  };

  const handleRigPointerLeave = () => {
    if (!st.rigHover) return false;
    resetRigHoverTransient();
    render();
    return true;
  };

  return {
    handleRigPointerDown,
    handleRigPointerMove,
    handleRigPointerLeave
  };
};
