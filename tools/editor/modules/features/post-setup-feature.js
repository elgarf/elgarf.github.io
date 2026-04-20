export const setupPostSetupFeature = (deps = {}) => {
  const {
    st,
    el,
    buildPortableProject,
    getProjectName,
    getSaveLocationId,
    setupInstallBannerController,
    setupProjectActionsFeature,
    setupSpecExportFeature,
    specExportDeps
  } = deps;

  setupInstallBannerController(deps);

  const { saveBlobWithSystemDialog } = setupProjectActionsFeature({
    ...deps,
    getCurrentSaveLocationId: () => st.saveLocationId,
    buildPortableProject,
    getProjectName: () => getProjectName(),
    saveButton: el.save,
    getSaveLocationId: () => getSaveLocationId()
  });

  const { bindExportHandlers } = setupSpecExportFeature({
    ...specExportDeps,
    saveBlobWithSystemDialog
  });
  bindExportHandlers();

  return { saveBlobWithSystemDialog };
};
