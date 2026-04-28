import { setupMobileUiFeature } from "./mobile-ui-feature.js";
import { setupModalWiringFeature } from "./modal-wiring-feature.js";
import { setupResetActionsFeature } from "./reset-actions-feature.js";
import { setupConvertRegionsFeature } from "./convert-regions-feature.js";
import { setupInstallBannerController } from "../ui/install-banner-controller.js";
import { setupProjectActionsFeature } from "./project-actions-feature.js";
import { setupSpecExportFeature } from "./spec-export-feature.js";

export const setupUiTailFeature = (deps = {}) => {
  const { toolbarDeps, mobileDeps, modalDeps, resetDeps, convertDeps, postSetupDeps } = deps;

  const toolbar = toolbarDeps || {};
  const bindProxyClick = (source, target) => toolbar.bindClick(source, () => { if (target) target.click(); });
  toolbar.setupToolbarActionsController(toolbar);

  const { isMobile, updateMobileDock } = setupMobileUiFeature(mobileDeps || {});
  const {
    showMessageModal,
    showErrorModal,
    withUiErrorBoundary,
    openHelpModal,
    closeHelpModal,
    showProjectLinkModal
  } = setupModalWiringFeature(modalDeps || {});

  setupResetActionsFeature(resetDeps || {});
  setupConvertRegionsFeature({
    ...(convertDeps || {}),
    showMessageModal
  });

  const postSetup = postSetupDeps || {};
  setupInstallBannerController({
    ...postSetup,
    isMobile,
    showErrorModal,
    withUiErrorBoundary,
    showMessageModal,
    showProjectLinkModal
  });
  const { saveBlobWithSystemDialog } = setupProjectActionsFeature({
    ...postSetup,
    isMobile,
    showErrorModal,
    withUiErrorBoundary,
    showMessageModal,
    showProjectLinkModal,
    getCurrentSaveLocationId: () => postSetup.st.saveLocationId,
    saveButton: postSetup.el.save
  });
  const { bindExportHandlers, buildFlowSpecText } = setupSpecExportFeature({
    ...(postSetup.specExportDeps || {}),
    saveBlobWithSystemDialog
  });
  bindExportHandlers();

  return {
    bindProxyClick,
    updateMobileDock,
    openHelpModal,
    closeHelpModal,
    showMessageModal,
    buildFlowSpecText: typeof buildFlowSpecText === "function" ? buildFlowSpecText : (() => "")
  };
};
