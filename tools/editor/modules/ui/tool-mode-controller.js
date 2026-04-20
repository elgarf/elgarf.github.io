export const setupToolModeController = (deps = {}) => {
  const {
    st,
    el,
    wrap,
    toolFsm,
    closeNoteEditor,
    resetFlowHoverTransient,
    resetClusterHoverTransient,
    resetRigHoverTransient,
    resetMaskTransient,
    resetCellTransient,
    isMaskMode,
    isCellEditMode,
    isRigEditMode,
    updateToolbarOverflow,
    updateClusterEditCursor,
    render
  } = deps;

  const updateModeBadges = (_r) => {};

  const setMode = m => {
    m = toolFsm.resolve(m);
    if (st.mode !== m && m !== "note") closeNoteEditor(true);
    st.mode = m;
    st.flowDrag = null;
    st.flowDragPreview = null;
    st.selBox = null;
    resetFlowHoverTransient();
    st.clusterDrag = null;
    st.clusterStartHover = null;
    st.clusterBorderHover = null;
    resetRigHoverTransient();
    if (m !== "flowEdit") {
      st.flowRegionRid = null;
      st.flowLinkPending = null;
      st.flowLinkDrag = null;
    }
    if (m !== "clusterEdit") {
      st.clusterHandles = [];
      resetClusterHoverTransient();
    }

    const map = [
      ["select", el.toolSelect, el.mToolSelect],
      ["draw", el.toolDraw, el.mToolDraw],
      ["note", el.toolNote, el.mToolNote],
      ["maskEdit", el.toolMaskAdd, el.mToolMaskAdd],
      ["cellEdit", el.toolCellEdit, el.mToolCellEdit],
      ["flowEdit", el.toolFlowEdit, el.mToolFlowEdit],
      ["clusterEdit", el.toolClusterEdit, el.mToolClusterEdit],
      ["rigEdit", el.toolRigEdit, el.mToolRigEdit]
    ];

    for (const [mode, ...btns] of map) {
      const on = m === mode;
      for (const b of btns) {
        if (!b) continue;
        b.classList.toggle("btn-success", on);
        b.classList.toggle("btn-secondary", !on);
      }
    }

    if (!isMaskMode()) resetMaskTransient();
    if (!isCellEditMode()) resetCellTransient();
    if (!isRigEditMode()) resetRigHoverTransient();
    wrap.dataset.mode = m;
    st.draft = null;
    st.drag = null;
    updateToolbarOverflow();
    updateClusterEditCursor();
    render();
  };

  const activateToolOrSelect = mode => {
    setMode(toolFsm.nextOnToolClick(st.mode, mode));
  };

  return {
    setMode,
    activateToolOrSelect,
    updateModeBadges
  };
};
