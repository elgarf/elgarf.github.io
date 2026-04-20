export const setupToolbarActionsController = (deps = {}) => {
  const {
    el,
    st,
    bindClick,
    bindEvent,
    setViewMode,
    isInstallViewMode,
    activateToolOrSelect,
    setLockAll,
    newProject,
    dupSel,
    dupMirrorSel,
    delSel,
    getViewMetrics,
    zoomAt,
    render,
    fit,
    getActionTargets,
    applyToTargets,
    autoContrast,
    invalidateRectCache,
    randomColor,
    undoHistory,
    redoHistory,
    commitProjectChange
  } = deps;

  const bindClicks = entries => {
    for (const [btn, fn] of entries) bindClick(btn, fn);
  };

  bindClicks([
    [el.viewModeArt, () => setViewMode("art", true)],
    [el.viewModeInstall, () => setViewMode("install", true)],
    [el.viewModeSpec, () => setViewMode("spec", true)],
    [el.mViewModeToggle, () => setViewMode(isInstallViewMode() ? "art" : "install", true)],
    [el.mViewModeSpec, () => setViewMode("spec", true)],
    [el.toolSelect, () => activateToolOrSelect("select")],
    [el.toolDraw, () => activateToolOrSelect("draw")],
    [el.toolNote, () => activateToolOrSelect("note")],
    [el.toolMaskAdd, () => activateToolOrSelect("maskEdit")],
    [el.toolCellEdit, () => activateToolOrSelect("cellEdit")],
    [el.toolFlowEdit, () => activateToolOrSelect("flowEdit")],
    [el.toolClusterEdit, () => activateToolOrSelect("clusterEdit")],
    [el.toolRigEdit, () => activateToolOrSelect("rigEdit")],
    [el.lockAllToggle, () => setLockAll(!st.lockAll, true)],
    [el.mLockAllToggle, () => setLockAll(!st.lockAll, true)],
    [el.newProject, newProject],
    [el.btnCopy, dupSel],
    [el.btnCopyMirror, dupMirrorSel],
    [el.btnDelete, delSel],
    [el.zoomIn, () => {
      const vm = getViewMetrics();
      zoomAt(vm.centerX, vm.centerY, st.zoom * 1.2);
    }],
    [el.zoomOut, () => {
      const vm = getViewMetrics();
      zoomAt(vm.centerX, vm.centerY, st.zoom / 1.2);
    }],
    [el.zoomReset, () => { st.zoom = 1; render(); }],
    [el.zoomFit, fit],
    [el.btnAutoContrast, () => {
      const ts = getActionTargets();
      if (!ts.length) return;
      const nextAuto = !(ts[0].autoContrastB !== false);
      applyToTargets(r => {
        r.autoContrastB = nextAuto;
        if (r.autoContrastB) r.colorB = autoContrast(r.colorA);
        invalidateRectCache(r, "appearance");
      }, { syncProps: true, listRects: true, persist: true, render: true });
    }],
    [el.randColor, () => {
      const ts = getActionTargets();
      if (!ts.length) return;
      const shared = randomColor();
      applyToTargets(r => {
        r.colorA = shared;
        if (r.autoContrastB !== false) r.colorB = autoContrast(r.colorA);
        invalidateRectCache(r, "appearance");
      }, { syncProps: true, listRects: true, persist: true, render: true });
    }]
  ]);

  bindClick(el.undo, () => undoHistory());
  bindClick(el.redo, () => redoHistory());

  const bindSnapToggles = () => {
    const bindings = [
      [el.snapGrid, "grid"],
      [el.snapObjects, "objects"],
      [el.snapCenters, "centers"],
      [el.snapGaps, "gaps"]
    ];
    for (const [node, key] of bindings) {
      if (!node) continue;
      bindEvent(node, "change", () => {
        st.snap[key] = !!node.checked;
        commitProjectChange({ persist: true, persistKind: "project", render: false });
      });
    }
  };

  bindSnapToggles();

  return { bindSnapToggles };
};
