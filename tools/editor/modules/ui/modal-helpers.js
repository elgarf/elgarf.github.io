export const setupModalHelpers = (deps = {}) => {
  const {
    getMessageModal,
    getHelpModal,
    getById,
    el,
    focusAndSelect,
    lsSet,
    HELP_SEEN_KEY
  } = deps;

  const showMessageModal = (text, title = "Сообщение") => {
    const modal = getMessageModal();
    const titleEl = getById("messageModalTitle");
    const bodyEl = getById("messageModalBody");
    const msg = String(text == null ? "" : text);
    if (modal && titleEl && bodyEl) {
      titleEl.textContent = String(title || "Сообщение");
      bodyEl.textContent = msg;
      modal.show();
      return;
    }
    console.warn(`[modal-fallback] ${title}: ${msg}`);
  };

  const formatErrorMessage = err => (err && err.message ? err.message : String(err));
  const showErrorModal = (title, err, prefix = "Ошибка") => showMessageModal(`${prefix}: ${formatErrorMessage(err)}`, title);

  const withUiErrorBoundary = async (title, task, prefix = "Ошибка") => {
    try {
      return await task();
    } catch (err) {
      showErrorModal(title, err, prefix);
      return null;
    }
  };

  const openHelpModal = () => {
    const modal = getHelpModal();
    if (modal) { modal.show(); return; }
    if (el && el.helpModal) {
      el.helpModal.style.display = "block";
      el.helpModal.classList.add("show");
      el.helpModal.setAttribute("aria-hidden", "false");
    }
  };

  const closeHelpModal = () => {
    const modal = getHelpModal();
    if (modal) { modal.hide(); return; }
    if (el && el.helpModal) {
      el.helpModal.classList.remove("show");
      el.helpModal.style.display = "none";
      el.helpModal.setAttribute("aria-hidden", "true");
    }
    if (typeof lsSet === "function") lsSet(HELP_SEEN_KEY, "1");
  };

  const focusModalTextLater = (txt, loading) => {
    setTimeout(() => {
      if (!txt || loading) return;
      if (typeof focusAndSelect === "function") focusAndSelect(txt);
    }, 0);
  };

  return {
    showMessageModal,
    formatErrorMessage,
    showErrorModal,
    withUiErrorBoundary,
    openHelpModal,
    closeHelpModal,
    focusModalTextLater
  };
};
