import { setupToolbarWiringFeature } from "./toolbar-wiring-feature.js";
import { setupMobileUiFeature } from "./mobile-ui-feature.js";
import { setupModalWiringFeature } from "./modal-wiring-feature.js";
import { setupResetActionsFeature } from "./reset-actions-feature.js";
import { setupConvertRegionsFeature } from "./convert-regions-feature.js";
import { setupPostSetupFeature } from "./post-setup-feature.js";

export const setupUiTailFeature = (deps = {}) => {
  const { toolbarDeps, mobileDeps, modalDeps, resetDeps, convertDeps, postSetupDeps } = deps;

  const { bindProxyClick } = setupToolbarWiringFeature(toolbarDeps || {});
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
    showMessageModal: (...args) => showMessageModal(...args)
  });

  setupPostSetupFeature({
    ...(postSetupDeps || {}),
    isMobile: () => isMobile(),
    showErrorModal,
    withUiErrorBoundary,
    showMessageModal: (...args) => showMessageModal(...args),
    showProjectLinkModal: (...args) => showProjectLinkModal(...args)
  });

  return {
    bindProxyClick,
    updateMobileDock,
    openHelpModal,
    closeHelpModal,
    showMessageModal
  };
};
