import { setupProjectSaveDialogController } from "../project-save-dialog-controller.js";
import { setupProjectLoadController } from "../project-load-controller.js";
import { setupProjectLinkActionsController } from "../ui/project-link-actions-controller.js";
import { setupProjectActionsController } from "../project/actions-controller.js";

export const setupProjectActionsFeature = (deps = {}) => {
  const {
    windowRef = window,
    documentRef = document,
    navigatorRef = navigator,
    locationRef = location,
    promptFn = prompt,
    showErrorModal,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    getCurrentSaveLocationId,

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
    getProjectName,
    PROJECT_QUERY_PARAM,
    PROJECT_ID_PARAM,

    saveButton,
    buildProject,
    projectFileBase,
    getSaveLocationId
  } = deps;

  const projectSaveDialogController = setupProjectSaveDialogController({
    windowRef,
    documentRef,
    navigatorRef,
    locationRef,
    promptFn,
    showErrorModal,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    getCurrentSaveLocationId
  });
  const saveBlobWithSystemDialog = projectSaveDialogController.saveBlobWithSystemDialog;

  const { bindProjectLoadHandlers } = setupProjectLoadController({
    el,
    bindClick,
    withUiErrorBoundary,
    extractProjectFromPngBytes,
    PNG_PROJECT_META_KEY,
    showMessageModal,
    showErrorModal,
    loadProjectIntoActiveState,
    syncActiveTabSnapshot,
    renderProjectTabs,
    schedulePersist
  });

  const { bindProjectLinkHandlers } = setupProjectLinkActionsController({
    el,
    bindEvent,
    eventClosest,
    showProjectLinkModal,
    withUiErrorBoundary,
    encodeProjectToQueryValue,
    buildPortableProject,
    saveProjectToServer,
    getProjectName,
    PROJECT_QUERY_PARAM,
    PROJECT_ID_PARAM
  });

  setupProjectActionsController({
    bindProjectLoadHandlers,
    bindProjectLinkHandlers,
    bindClick,
    saveButton,
    buildProject,
    projectFileBase,
    saveBlobWithSystemDialog,
    getSaveLocationId
  }).bindAll();

  return {
    saveBlobWithSystemDialog
  };
};
