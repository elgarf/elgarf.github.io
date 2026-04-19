export const setupBootstrapModalFactory = (deps = {}) => {
  const {
    windowRef = window,
    getById,
    helpNode,
    projectLinkNode
  } = deps;

  const modalCache = {
    help: null,
    message: null,
    projectLink: null
  };

  const getOrCreateBootstrapModal = (node, cacheKey) => {
    if (!node || !windowRef.bootstrap || !windowRef.bootstrap.Modal) return null;
    if (!modalCache[cacheKey]) {
      modalCache[cacheKey] = windowRef.bootstrap.Modal.getOrCreateInstance(node, {
        backdrop: true,
        keyboard: true,
        focus: true
      });
    }
    return modalCache[cacheKey];
  };

  const getHelpModal = () => getOrCreateBootstrapModal(helpNode, "help");

  const getMessageModal = () => {
    const node = typeof getById === "function" ? getById("messageModal") : null;
    return getOrCreateBootstrapModal(node, "message");
  };

  const getProjectLinkModal = () => {
    const node = projectLinkNode || (typeof getById === "function" ? getById("projectLinkModal") : null);
    return getOrCreateBootstrapModal(node, "projectLink");
  };

  return {
    getOrCreateBootstrapModal,
    getHelpModal,
    getMessageModal,
    getProjectLinkModal
  };
};
