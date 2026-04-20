import { setupAppInitController } from "../app-init-controller.js";
import { setupKeyboardController } from "../keyboard-controller.js";
import { setupUiBinders } from "../ui-binders.js";

export const setupAppBootstrapFeature = (deps = {}) => {
  const {
    createEditorServices,
    st,
    el,
    themeMedia,
    overflowHiddenButtons,
    bindEvent,
    bindClick,
    bindWindowEvent,
    bindProxyClick,
    lsGet,
    lsSet,
    HELP_SEEN_KEY,
    openHelpModal,
    closeHelpModal,
    syncActiveTabSnapshot,
    renderProjectTabs,
    syncProps,
    schedulePersist,
    createProjectTab,
    makeEmptyProjectData,
    applyThemeMode,
    hideThemePopup,
    showThemePopup,
    hideToolbarOverflowPopup,
    showToolbarOverflowPopup,
    updateMobileDock,
    updateToolbarOverflow,
    persistNow,
    scheduleCanvasResize,
    render,
    undoHistory,
    redoHistory,
    setMode,
    isMaskMode,
    applyMaskPath,
    delSel,
    dupSel,
    cur,
    cloneRectForClipboard,
    cloneRectForDuplicate,
    insertCloneAboveSource,
    selRect,
    getEditableSelectedRects,
    commitUiUpdate,
    normalizeThemeMode,
    THEME_MODE_KEY,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    updateAppViewportHeight,
    saveStatus,
    getProjectDataFromQueryParam,
    showMessageModal,
    restoreAutoSave,
    mk,
    autoContrast,
    resize,
    refreshPanels,
    fit,
    cloneProjectData,
    buildProject,
    loadProjectIntoActiveState,
    clearProjectQueryParamFromUrl,
    initHistoryCurrent,
    ensureFontReady,
    PROJECT_QUERY_VERSION,
    PROJECT_QUERY_PARAM,
    encodeProjectToQueryValue,
    decodeProjectFromQueryValue,
    buildPortableProject
  } = deps;

  const bootstrapUiServices = {
    st,
    el,
    themeMedia,
    overflowHiddenButtons,
    bindEvent,
    bindClick,
    bindWindowEvent,
    bindProxyClick,
    lsGet,
    lsSet,
    HELP_SEEN_KEY,
    openHelpModal,
    closeHelpModal,
    syncActiveTabSnapshot,
    renderProjectTabs,
    syncProps,
    schedulePersist,
    createProjectTab,
    makeEmptyProjectData,
    applyThemeMode,
    hideThemePopup,
    showThemePopup,
    hideToolbarOverflowPopup,
    showToolbarOverflowPopup,
    updateMobileDock,
    updateToolbarOverflow,
    persistNow,
    scheduleCanvasResize
  };
  const bootstrapKeyboardDeps = {
    render,
    undoHistory,
    redoHistory,
    closeHelpModal,
    setMode,
    isMaskMode,
    applyMaskPath,
    delSel,
    dupSel,
    cur,
    cloneRectForClipboard,
    cloneRectForDuplicate,
    insertCloneAboveSource,
    selRect,
    getEditableSelectedRects,
    commitUiUpdate
  };
  const bootstrapAppInitDeps = {
    st,
    el,
    setMode,
    normalizeThemeMode,
    lsGet,
    THEME_MODE_KEY,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    applyThemeMode,
    updateAppViewportHeight,
    updateMobileDock,
    updateToolbarOverflow,
    saveStatus,
    getProjectDataFromQueryParam,
    showMessageModal,
    restoreAutoSave,
    mk,
    autoContrast,
    selRect,
    resize,
    refreshPanels,
    fit,
    cloneProjectData,
    buildProject,
    loadProjectIntoActiveState,
    syncActiveTabSnapshot,
    renderProjectTabs,
    clearProjectQueryParamFromUrl,
    initHistoryCurrent,
    ensureFontReady,
    render
  };
  const editorServices = createEditorServices(bootstrapUiServices || {});
  setupUiBinders(editorServices);

  setupKeyboardController({
    ...(bootstrapKeyboardDeps || {}),
    st: editorServices.st,
    el: editorServices.el,
    schedulePersist: editorServices.schedulePersist,
    bindWindowEvent: editorServices.bindWindowEvent
  });

  const appInitServices = createEditorServices(bootstrapAppInitDeps || {});
  const { initializeAppUi, initProjectState } = setupAppInitController(appInitServices);
  initializeAppUi();
  initProjectState();

  try {
    window.ledMaskProjectCodec = {
      version: PROJECT_QUERY_VERSION,
      async toQueryValue() { return await encodeProjectToQueryValue(buildPortableProject()); },
      async toUrl() {
        const u = new URL(location.href);
        u.searchParams.set(PROJECT_QUERY_PARAM, await encodeProjectToQueryValue(buildPortableProject()));
        return u.toString();
      },
      async fromQueryValue(value) { return await decodeProjectFromQueryValue(value); }
    };
  } catch (_e) { }
};
