export const setupAppInitController = (deps = {}) => {
  const {
    st, el,
    setMode, normalizeThemeMode, lsGet, THEME_MODE_KEY,
    setGlobalSaveLocationId, getGlobalSaveLocationId,
    applyThemeMode, updateAppViewportHeight, updateMobileDock, updateToolbarOverflow, saveStatus,
    getProjectDataFromQueryParam, showMessageModal, restoreAutoSave,
    mk, autoContrast, selRect, resize, refreshPanels, fit,
    cloneProjectData, buildProject, loadProjectIntoActiveState, syncActiveTabSnapshot, renderProjectTabs,
    clearProjectQueryParamFromUrl, initHistoryCurrent, ensureFontReady, render, hideStartupLoader,
    t = value => value
  } = deps;

  const initializeAppUi = () => {
    setMode(st.mode);
    st.themeMode = normalizeThemeMode(lsGet(THEME_MODE_KEY, st.themeMode) || st.themeMode);
    st.saveLocationId = setGlobalSaveLocationId(st.saveLocationId || getGlobalSaveLocationId());
    applyThemeMode(st.themeMode, false);
    updateAppViewportHeight();
    updateMobileDock();
    updateToolbarOverflow();
    saveStatus.idle();
  };

  const initProjectState = async () => {
    let queryProjectData = null;
    try {
      queryProjectData = await getProjectDataFromQueryParam();
    } catch (_e) {
      showMessageModal(t("Параметр проекта в URL повреждён или не поддерживается"));
      queryProjectData = null;
    }
    const loaded = restoreAutoSave();
    if (!loaded) {
      const a = mk(-180, -90, 260, 180);
      a.name = "Main";
      const b = mk(180, -30, 220, 160);
      b.name = "Side";
      b.colorA = "#db8f37";
      b.colorB = autoContrast(b.colorA);
      st.rects.push(a, b);
      selRect(a.id);
      resize();
      refreshPanels();
      fit();
    } else {
      resize();
      refreshPanels();
    }
    if (!st.tabs.length) {
      st.tabs = [{ id: 1, title: (st.projectName || t("Новый проект")), data: cloneProjectData(buildProject()) }];
      st.activeTabId = 1;
      st.nextTabId = 2;
    }
    if (queryProjectData && typeof queryProjectData === "object") {
      const tabTitle = String((queryProjectData && queryProjectData.projectName) || t("Новый проект")).trim() || t("Новый проект");
      const nextTabId = Math.max((+st.nextTabId || 1), st.tabs.reduce((m, t) => Math.max(m, Number(t && t.id) || 0), 0) + 1);
      st.nextTabId = nextTabId + 1;
      st.tabs.push({ id: nextTabId, title: tabTitle, data: cloneProjectData(queryProjectData) });
      st.activeTabId = nextTabId;
      loadProjectIntoActiveState(queryProjectData);
      fit();
      syncActiveTabSnapshot();
      renderProjectTabs();
      clearProjectQueryParamFromUrl();
    }
    initHistoryCurrent();
    if (el.undo) el.undo.disabled = !st.history.undo.length;
    if (el.redo) el.redo.disabled = !st.history.redo.length;
    syncActiveTabSnapshot();
    renderProjectTabs();
    render();
    if (typeof hideStartupLoader === "function") hideStartupLoader();
    ensureFontReady()
      .then(() => { render(); })
      .catch(() => { });
  };

  return {
    initializeAppUi,
    initProjectState
  };
};
