export const setupSelectionActionsFeature = (deps = {}) => {
  const {
    st,
    isRectLocked,
    setSelection,
    resetTransientState,
    refreshPanels,
    updateClusterEditCursor,
    commitUiUpdate,
    normSelSet,
    getSelectedRects,
    cur,
    normalizeFlowLocks,
    normalizeManualClusters,
    normalizeRigData,
    autoContrast,
    withNameSuffixBeforeGroup,
    syncProps,
    listRects,
    setMode,
    schedulePersist
  } = deps;

  const insertCloneAboveSource = (sourceId, clone) => {
    const idx = st.rects.findIndex(v => v.id === sourceId);
    if (idx >= 0) st.rects.splice(idx, 0, clone);
    else st.rects.unshift(clone);
  };

  const cloneRectModel = (src, overrides = null) => {
    const o = (overrides && typeof overrides === "object") ? overrides : {};
    const base = {
      ...src,
      rotation: src.rotation || 0,
      autoContrastB: src.autoContrastB !== false,
      colorB: (src.autoContrastB !== false) ? autoContrast(src.colorA) : src.colorB,
      cellLinks: Array.isArray(src.cellLinks) ? [...src.cellLinks] : [],
      hiddenCells: Array.isArray(src.hiddenCells) ? [...src.hiddenCells] : [],
      flowLocks: normalizeFlowLocks(src && src.flowLocks),
      manualClusters: normalizeManualClusters(src && src.manualClusters),
      rig: normalizeRigData(src && src.rig)
    };
    return { ...base, ...o };
  };

  const cloneRectForClipboard = src => cloneRectModel(src, { id: src.id });
  const cloneRectForDuplicate = src => cloneRectModel(src, { id: st.next++, name: withNameSuffixBeforeGroup(src.name, "copy"), x: src.x + 20, y: src.y + 20 });

  const delSel = () => {
    normSelSet();
    if (!st.selSet.size && st.sel == null) return;
    const ids = st.selSet.size ? new Set(st.selSet) : new Set([st.sel]);
    let removed = false;
    st.rects = st.rects.filter(r => {
      if (!ids.has(r.id)) return true;
      if (isRectLocked(r)) return true;
      removed = true;
      return false;
    });
    if (!removed) return;
    setSelection([], null);
    resetTransientState(false);
    refreshPanels();
    updateClusterEditCursor();
    commitUiUpdate({ persist: true, render: true });
  };

  const dupSel = () => {
    normSelSet();
    const src = getSelectedRects();
    if (!src.length) {
      const r = cur();
      if (!r) return;
      src.push(r);
    }
    const created = [];
    for (const r of src) {
      const c = cloneRectForDuplicate(r);
      insertCloneAboveSource(r.id, c);
      created.push(c.id);
    }
    setSelection(created, created[created.length - 1] || null);
    syncProps();
    listRects();
    setMode("select");
    schedulePersist("project");
  };

  return {
    insertCloneAboveSource,
    cloneRectModel,
    cloneRectForClipboard,
    cloneRectForDuplicate,
    delSel,
    dupSel
  };
};
