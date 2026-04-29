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
  const ensureFlowVariantBadge = btn => {
    if (!btn) return null;
    let badge = btn.querySelector(".tool-mode-letter");
    if (!badge) {
      badge = documentRef.createElement("span");
      badge.className = "tool-mode-letter";
      btn.appendChild(badge);
    }
    return badge;
  };
  const updateFlowVariantButtons = () => {
    const text = String(st.flowEditVariant || "auto") === "manual" ? "М" : "А";
    for (const b of [el.toolFlowEdit, el.mToolFlowEdit]) {
      const badge = ensureFlowVariantBadge(b);
      if (badge) badge.textContent = text;
      if (b) {
        b.dataset.flowVariant = String(st.flowEditVariant || "auto");
        b.title = text === "М" ? "Ручная расстановка потока" : "Правка автоматического потока";
        b.setAttribute("aria-label", b.title);
      }
    }
  };

  const setMode = m => {
    m = toolFsm.resolve(m);
    if (typeof cancelActiveDrag === "function") cancelActiveDrag();
    if (st.mode !== m && m !== "note") closeNoteEditor(true);
    st.mode = m;
    if (m === "flowEdit" && !["auto", "manual"].includes(String(st.flowEditVariant || ""))) st.flowEditVariant = "auto";
    st.flowDrag = null;
    st.manualFlowDrag = null;
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
    updateFlowVariantButtons();
    render();
  };

  const activateToolOrSelect = mode => {
    if (mode === "flowEdit") {
      if (st.mode !== "flowEdit") {
        if (!["auto", "manual"].includes(String(st.flowEditVariant || ""))) st.flowEditVariant = "auto";
        setMode("flowEdit");
      } else if (String(st.flowEditVariant || "auto") === "auto") {
        st.flowEditVariant = "manual";
        setMode("flowEdit");
      } else {
        st.flowEditVariant = "auto";
        setMode("flowEdit");
      }
      return;
    }
    setMode(toolFsm.nextOnToolClick(st.mode, mode));
  };

  updateFlowVariantButtons();

  return {
    setMode,
    activateToolOrSelect,
    updateModeBadges
  };
};
