export const setupProjectLifecycleController = (deps = {}) => {
  const {
    st,
    el,
    setSelection,
    resetTransientState,
    setMode,
    refreshPanels,
    syncActiveTabSnapshot,
    renderProjectTabs,
    commitUiUpdate,
    updateViewModeUi,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    genSaveLocationId
  } = deps;

  const resetProjectCore = () => {
    st.rects = [];
    st.flowLinks = [];
    st.next = 1;
    st.camX = 0;
    st.camY = 0;
    st.zoom = 1;
    st.projectName = "Новый проект";
    st.saveLocationId = setGlobalSaveLocationId(getGlobalSaveLocationId() || genSaveLocationId(st.projectName));
    st.viewMode = "art";
    st.specCustomText = "";
    st.specCustomSections = {};
    st.globalScale = 256;
    if (el.cUnit) el.cUnit.value = "m";
    setSelection([], null);
    resetTransientState(true);
  };

  const newProject = () => {
    resetProjectCore();
    updateViewModeUi();
    refreshPanels();
    setMode("select");
    syncActiveTabSnapshot();
    renderProjectTabs();
    commitUiUpdate({ persist: true, persistKind: "all", render: true });
  };

  return {
    resetProjectCore,
    newProject
  };
};
