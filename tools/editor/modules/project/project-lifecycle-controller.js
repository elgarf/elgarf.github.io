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
    genSaveLocationId,
    t = value => value
  } = deps;

  const resetProjectCore = () => {
    st.rects = [];
    st.flowLinks = [];
    st.next = 1;
    st.camX = 0;
    st.camY = 0;
    st.zoom = 1;
    st.projectName = t("Новый проект");
    st.saveLocationId = setGlobalSaveLocationId(getGlobalSaveLocationId() || genSaveLocationId(st.projectName));
    st.viewMode = "art";
    st.specCustomText = "";
    st.specCustomSections = {};
    st.textSize = 32;
    st.fontFamily = "Roboto";
    st.globalScale = 256;
    st.installLayers = { contours: true, text: true, flow: true, rig: true };
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
