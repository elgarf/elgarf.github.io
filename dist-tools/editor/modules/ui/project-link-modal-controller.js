/* build:1779222473 */
export const setupProjectLinkModalController = (deps = {}) => {
  const {
    el,
    getProjectLinkModal,
    getById,
    showMessageModal,
    focusModalTextLater
  } = deps;

  const buildQrDataUrl = value => {
    const text = String(value || "");
    if (!text) return "";
    if (typeof qrcode !== "function") return "";
    const levels = ["L", "M", "Q", "H"];
    for (const lvl of levels) {
      try {
        const qr = qrcode(0, lvl);
        qr.addData(text);
        qr.make();
        return qr.createDataURL(14, 3);
      } catch {
        // try next correction level; L gives max capacity
      }
    }
    return "";
  };

  const showProjectLinkModal = (link, opts = {}) => {
    const modal = getProjectLinkModal();
    const qr = (el && el.projectLinkQr) || getById("projectLinkQr");
    const txt = (el && el.projectLinkText) || getById("projectLinkText");
    const loadingNode = (el && el.projectLinkLoading) || getById("projectLinkLoading");
    const loading = !!(opts && opts.loading);
    const loadingText = String((opts && opts.loadingText) || "Формируем ссылку...");
    const value = String(link || "");

    if (txt) txt.value = loading ? loadingText : value;

    if (loadingNode) {
      loadingNode.classList.toggle("d-none", !loading);
      const msg = loadingNode.querySelector("div:last-child");
      if (msg) msg.textContent = loadingText;
    }

    if (qr) {
      qr.classList.toggle("d-none", loading);
      if (loading) {
        qr.removeAttribute("src");
      } else {
        const dataUrl = buildQrDataUrl(value);
        if (dataUrl) qr.src = dataUrl;
      }
    }

    if (modal) {
      modal.show();
      focusModalTextLater(txt, loading);
      return;
    }
    showMessageModal(value, "Ссылка проекта");
  };

  return { buildQrDataUrl, showProjectLinkModal };
};

