export const setupToolModeController = (deps = {}) => {
  const {
    documentRef = document,
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
    cancelActiveDrag,
    isMaskMode,
    isCellEditMode,
    isRigEditMode,
    updateToolbarOverflow,
    updateClusterEditCursor,
    render
  } = deps;

  const getInactiveOutlineClass = () => {
    const theme = String(documentRef && documentRef.documentElement && documentRef.documentElement.getAttribute("data-bs-theme") || "").toLowerCase();
    return theme === "light" ? "btn-outline-dark" : "btn-outline-light";
  };

  const updateModeBadges = (_r) => {};
  const AUTO_SELECTION_MODES = new Set(["maskEdit", "cellEdit", "flowEdit", "clusterEdit", "rigEdit"]);

  const setMode = m => {
    m = toolFsm.resolve(m);
    if (typeof cancelActiveDrag === "function") cancelActiveDrag();
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
    const inactiveClass = getInactiveOutlineClass();

    for (const [mode, ...btns] of map) {
      const on = m === mode;
      for (const b of btns) {
        if (!b) continue;
        b.classList.remove("btn-outline-light", "btn-outline-dark");
        b.classList.toggle("btn-success", on);
        if (!on) b.classList.add(inactiveClass);
      }
    }

    if (!isMaskMode()) resetMaskTransient();
    if (!isCellEditMode()) resetCellTransient();
    if (!isRigEditMode()) resetRigHoverTransient();
    wrap.dataset.mode = m;
    if (el && el.side) el.side.classList.toggle("tool-auto-select-guard", AUTO_SELECTION_MODES.has(m));
    st.draft = null;
    st.draftPending = null;
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
