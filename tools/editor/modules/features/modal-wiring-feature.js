export const setupModalWiringFeature = (deps = {}) => {
  const {
    windowRef,
    getById,
    el,
    focusAndSelect,
    lsSet,
    HELP_SEEN_KEY,
    setupProjectLinkModalController,
    t = value => value
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
  const bootstrapModalFactory = {
    getHelpModal: () => getOrCreateBootstrapModal(el.helpModal, "help"),
    getMessageModal: () => getOrCreateBootstrapModal(getById("messageModal"), "message"),
    getProjectLinkModal: () => getOrCreateBootstrapModal(el.projectLinkModal || getById("projectLinkModal"), "projectLink")
  };
  const modalHelpers = {
    showMessageModal: (text, title = t("Сообщение")) => {
      const modal = bootstrapModalFactory.getMessageModal();
      const titleEl = getById("messageModalTitle");
      const bodyEl = getById("messageModalBody");
      const msg = String(text == null ? "" : text);
      if (modal && titleEl && bodyEl) {
        titleEl.textContent = String(title || t("Сообщение"));
        bodyEl.textContent = msg;
        modal.show();
        return;
      }
      console.warn(`[modal-fallback] ${title}: ${msg}`);
    },
    showErrorModal: (title, err, prefix = t("Ошибка")) => {
      const msg = (err && err.message ? err.message : String(err));
      modalHelpers.showMessageModal(`${prefix}: ${msg}`, title);
    },
    withUiErrorBoundary: async (title, task, prefix = t("Ошибка")) => {
      try {
        return await task();
      } catch (err) {
        modalHelpers.showErrorModal(title, err, prefix);
        return null;
      }
    },
    openHelpModal: () => {
      const modal = bootstrapModalFactory.getHelpModal();
      if (modal) { modal.show(); return; }
      if (el.helpModal) {
        el.helpModal.style.display = "block";
        el.helpModal.classList.add("show");
        el.helpModal.setAttribute("aria-hidden", "false");
      }
    },
    closeHelpModal: () => {
      const modal = bootstrapModalFactory.getHelpModal();
      if (modal) { modal.hide(); return; }
      if (el.helpModal) {
        el.helpModal.classList.remove("show");
        el.helpModal.style.display = "none";
        el.helpModal.setAttribute("aria-hidden", "true");
      }
      if (typeof lsSet === "function") lsSet(HELP_SEEN_KEY, "1");
    },
    focusModalTextLater: (txt, loading) => {
      setTimeout(() => {
        if (!txt || loading) return;
        try {
          if (typeof focusAndSelect === "function") focusAndSelect(txt);
        } catch { /* noop */ }
      }, 0);
    }
  };

  const getProjectLinkModal = bootstrapModalFactory.getProjectLinkModal;

  const {
    showMessageModal,
    showErrorModal,
    withUiErrorBoundary,
    openHelpModal,
    closeHelpModal,
    focusModalTextLater
  } = modalHelpers;

  const { showProjectLinkModal } = setupProjectLinkModalController({
    el,
    getProjectLinkModal,
    getById,
    showMessageModal,
    focusModalTextLater
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


