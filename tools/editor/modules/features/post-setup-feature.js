export const setupPostSetupFeature = (deps = {}) => {
  const {
    windowRef,
    documentRef,
    navigatorRef,
    locationRef,
    promptFn,
    st,
    el,
    bindClick,
    bindEvent,
    bindWindowEvent,
    eventClosest,
    lsGet,
    lsSet,
    INSTALL_HINT_KEY,
    isMobile,
    showErrorModal,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    withUiErrorBoundary,
    extractProjectFromPngBytes,
    PNG_PROJECT_META_KEY,
    showMessageModal,
    loadProjectIntoActiveState,
    syncActiveTabSnapshot,
    renderProjectTabs,
    schedulePersist,
    showProjectLinkModal,
    encodeProjectToQueryValue,
    buildPortableProject,
    saveProjectToServer,
    getProjectName,
    PROJECT_QUERY_PARAM,
    PROJECT_ID_PARAM,
    buildProject,
    projectFileBase,
    getSaveLocationId,
    setupInstallBannerController,
    setupProjectActionsFeature,
    setupSpecExportFeature,
    specExportDeps
  } = deps;

  setupInstallBannerController({
    el,
    bindClick: (...args) => bindClick(...args),
    bindWindowEvent: (...args) => bindWindowEvent(...args),
    isMobile: () => isMobile(),
    lsGet,
    lsSet,
    INSTALL_HINT_KEY
  });

  const { saveBlobWithSystemDialog } = setupProjectActionsFeature({
    windowRef,
    documentRef,
    navigatorRef,
    locationRef,
    promptFn,
    showErrorModal,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    getCurrentSaveLocationId: () => st.saveLocationId,
    el,
    bindClick,
    withUiErrorBoundary,
    extractProjectFromPngBytes,
    PNG_PROJECT_META_KEY,
    showMessageModal,
    loadProjectIntoActiveState,
    syncActiveTabSnapshot,
    renderProjectTabs,
    schedulePersist,
    bindEvent,
    eventClosest,
    showProjectLinkModal,
    encodeProjectToQueryValue,
    buildPortableProject,
    saveProjectToServer,
    getProjectName: () => getProjectName(),
    PROJECT_QUERY_PARAM,
    PROJECT_ID_PARAM,
    saveButton: el.save,
    buildProject,
    projectFileBase,
    getSaveLocationId: () => getSaveLocationId()
  });

  const { bindExportHandlers } = setupSpecExportFeature({
    ...specExportDeps,
    saveBlobWithSystemDialog
  });
  bindExportHandlers();

  return { saveBlobWithSystemDialog };
};
