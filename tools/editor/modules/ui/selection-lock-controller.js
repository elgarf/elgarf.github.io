export const setupSelectionLockController = (deps = {}) => {
  const {
    st,
    getRectById,
    getSelectedRects,
    normSelSet,
    resetMaskTransient,
    resetCellTransient,
    syncProps,
    listRects,
    schedulePersist,
    render
  } = deps;

  const isRectLocked = r => !!(st.lockAll || (r && r.locked));

  const getEditableSelectedRects = () => {
    const selected = getSelectedRects();
    return selected.filter(r => !isRectLocked(r));
  };

  const toggleRectLockById = id => {
    const r = getRectById(id);
    if (!r) return false;
    normSelSet();
    const selected = getSelectedRects();
    const applyToGroup = selected.length > 1 && selected.some(it => it.id === id);
    const targets = applyToGroup ? selected : [r];
    const nextLocked = !r.locked;
    for (const t of targets) t.locked = nextLocked;

    st.drag = null;
    st.flowDrag = null;
    st.flowDragPreview = null;
    st.clusterDrag = null;
    st.draft = null;

    if (nextLocked) {
      resetMaskTransient();
      resetCellTransient();
    }

    normSelSet();
    syncProps();
    listRects();
    schedulePersist("project");
    render();
    return true;
  };

  return {
    isRectLocked,
    getEditableSelectedRects,
    toggleRectLockById
  };
};
