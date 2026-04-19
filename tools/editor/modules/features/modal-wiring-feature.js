export const setupModalWiringFeature = (deps = {}) => {
  const {
    windowRef,
    getById,
    el,
    focusAndSelect,
    lsSet,
    HELP_SEEN_KEY,
    setupBootstrapModalFactory,
    setupModalHelpers,
    setupProjectLinkModalController
  } = deps;

  const bootstrapModalFactory = setupBootstrapModalFactory({
    windowRef,
    getById,
    helpNode: el.helpModal,
    projectLinkNode: el.projectLinkModal
  });
  const getHelpModal = bootstrapModalFactory.getHelpModal;
  const getMessageModal = bootstrapModalFactory.getMessageModal;
  const getProjectLinkModal = bootstrapModalFactory.getProjectLinkModal;

  const {
    showMessageModal,
    showErrorModal,
    withUiErrorBoundary,
    openHelpModal,
    closeHelpModal,
    focusModalTextLater
  } = setupModalHelpers({
    getMessageModal,
    getHelpModal,
    getById,
    el,
    focusAndSelect,
    lsSet,
    HELP_SEEN_KEY
  });

  const { showProjectLinkModal } = setupProjectLinkModalController({
    el,
    getProjectLinkModal: () => getProjectLinkModal(),
    getById,
    showMessageModal: (...args) => showMessageModal(...args),
    focusModalTextLater: (...args) => focusModalTextLater(...args)
  });

  return {
    showMessageModal,
    showErrorModal,
    withUiErrorBoundary,
    openHelpModal,
    closeHelpModal,
    focusModalTextLater,
    showProjectLinkModal
  };
};
