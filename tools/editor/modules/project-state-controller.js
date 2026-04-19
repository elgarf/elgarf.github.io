export const setupProjectStateController = (deps = {}) => {
  const {
    st,
    resetCalcWorkers,
    parseAreaM2PxInput,
    parseProjectRect,
    pxFromMetric,
    normalizeFlowLinks,
    remapRectRigLoadsToBottomSeams,
    resetTransientState,
    updateViewModeUi,
    updateLockAllUi,
    setSelection,
    syncProps,
    listRects,
    selRect,
    syncActiveTabSnapshot,
    renderProjectTabs,
    resetHistoryUi,
    render,
    cloneProjectData,
    makeEmptyProjectData,
    isMobileTabStorageMode,
    getActiveTab,
    loadProjectIntoActiveState,
    lsGet,
    TABS_SAVE_KEY,
    AUTO_SAVE_KEY,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    genSaveLocationId,
    zc,
    normalizeViewMode,
    evalExpr
  } = deps;

  const applyLoadedProjectSettings = d => {
    if (d && d.camera) {
      st.camX = +d.camera.x || 0;
      st.camY = +d.camera.y || 0;
      st.zoom = zc(+d.camera.zoom || 1);
    }
    if (d && d.settings) {
      st.textSize = Math.max(6, evalExpr(d.settings.textSize, 12));
      st.fontFamily = String(d.settings.fontFamily || "Roboto, Segoe UI, Arial").trim() || "Roboto, Segoe UI, Arial";
      st.globalScale = Math.max(1, Math.round(evalExpr(d.settings.scale, 256)));
      st.viewMode = normalizeViewMode(d.settings.viewMode);
      st.lockAll = !!(d.settings && d.settings.lockAll);
      const ss = (d.settings && d.settings.snap) || {};
      st.snap = { grid: !!ss.grid, objects: ss.objects !== false, centers: ss.centers !== false, gaps: ss.gaps !== false };
    } else {
      st.globalScale = 256;
      st.viewMode = "art";
      st.lockAll = false;
      st.snap = { grid: false, objects: true, centers: true, gaps: true };
    }
    st.projectName = String((d && d.projectName) || "project").trim() || "project";
    st.saveLocationId = setGlobalSaveLocationId((d && d.saveLocationId) || getGlobalSaveLocationId() || genSaveLocationId(st.projectName));
  };

  const applyProjectData = (d, opts) => {
    resetCalcWorkers();
    const o = (opts && typeof opts === "object") ? opts : {};
    const syncTabSnapshot = o.syncTabSnapshot !== false;
    const renderTabs = o.renderTabs !== false;
    const doRender = o.render !== false;
    applyLoadedProjectSettings(d);
    const rs = Array.isArray(d && d.rectangles) ? d.rectangles : [];
    const legacyAreaM2 = parseAreaM2PxInput(d && d.settings ? d.settings.areaM2Px : null, 65536);
    st.rects = rs.map((r, i) => parseProjectRect(r, i, legacyAreaM2));
    const hasGlobalScale = !!(d && d.settings && d.settings.scale != null && d.settings.scale !== "");
    if (hasGlobalScale) {
      const gs = Math.max(1, Math.round(Number(st.globalScale) || 256));
      for (const rr of st.rects) {
        rr.scale = gs;
        pxFromMetric(rr);
      }
    }
    st.flowLinks = normalizeFlowLinks(d && d.flowLinks);
    for (const rr of st.rects) remapRectRigLoadsToBottomSeams(rr);
    st.next = +(d && d.nextId) || (st.rects.reduce((m, r) => Math.max(m, r.id), 0) + 1);
    resetTransientState(false);
    updateViewModeUi();
    updateLockAllUi();
    const firstId = st.rects[0] ? st.rects[0].id : null;
    if (firstId != null && st.lockAll) {
      setSelection([], null);
      syncProps();
      listRects();
    } else {
      selRect(firstId);
    }
    if (syncTabSnapshot) syncActiveTabSnapshot();
    if (renderTabs) renderProjectTabs();
    resetHistoryUi();
    if (doRender) render();
  };

  const restoreAutoSave = () => {
    try {
      const rawTabs = lsGet(TABS_SAVE_KEY, "");
      if (rawTabs) {
        const parsed = JSON.parse(rawTabs);
        if (parsed && Array.isArray(parsed.tabs) && parsed.tabs.length) {
          if (isMobileTabStorageMode()) {
            const activeId = +parsed.activeTabId;
            const src = parsed.tabs.find(t => (+t.id || 0) === activeId) || parsed.tabs[0];
            const oneId = +((src && src.id) || 1) || 1;
            st.tabs = [{ id: oneId, title: String(src && src.title || "Новый проект"), data: cloneProjectData(src && src.data || makeEmptyProjectData("Новый проект")) }];
            st.nextTabId = Math.max(2, oneId + 1);
            st.activeTabId = oneId;
          } else {
            st.tabs = parsed.tabs.map((t, i) => ({ id: +t.id || i + 1, title: String(t && t.title || "Новый проект"), data: cloneProjectData(t && t.data || makeEmptyProjectData("Новый проект")) }));
            st.nextTabId = Math.max((+parsed.nextTabId || 1), st.tabs.reduce((m, t) => Math.max(m, t.id), 0) + 1);
            st.activeTabId = st.tabs.some(t => t.id === +parsed.activeTabId) ? +parsed.activeTabId : st.tabs[0].id;
          }
          const active = getActiveTab();
          loadProjectIntoActiveState(active && active.data || makeEmptyProjectData("Новый проект"));
          renderProjectTabs();
          return true;
        }
      }
    } catch (_e) { }
    try {
      const rawSaved = lsGet(AUTO_SAVE_KEY, "");
      if (!rawSaved) return false;
      const data = JSON.parse(rawSaved);
      st.tabs = [{ id: 1, title: String((data && data.projectName) || "Новый проект"), data: cloneProjectData(data) }];
      st.nextTabId = 2;
      st.activeTabId = 1;
      loadProjectIntoActiveState(data);
      renderProjectTabs();
      return true;
    } catch (_e) {
      return false;
    }
  };

  return {
    applyProjectData,
    restoreAutoSave
  };
};
