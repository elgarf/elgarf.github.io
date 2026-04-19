export const setupProjectLinkActionsController = (deps = {}) => {
  const {
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
  } = deps;

  let currentProjectShareLink = "";

  const setProjectLinkCopyButtonState = (text, copied = false, disabled = false) => {
    if (!el || !el.projectLinkCopyBtn) return;
    const label = el.projectLinkCopyBtn.querySelector("span");
    const icon = el.projectLinkCopyBtn.querySelector("i");
    if (label) label.textContent = text;
    if (icon) icon.className = copied ? "fa-solid fa-check" : "fa-regular fa-clipboard";
    el.projectLinkCopyBtn.disabled = !!disabled;
  };

  const legacyCopyText = text => {
    try {
      const ta = document.createElement("textarea");
      ta.value = String(text || "");
      ta.setAttribute("readonly", "true");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, ta.value.length);
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return !!ok;
    } catch (_e) {
      return false;
    }
  };

  const verifyClipboardText = async expected => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") return null;
      const got = await navigator.clipboard.readText();
      return String(got || "") === String(expected || "");
    } catch (_e) {
      return null;
    }
  };

  const copyTextSmart = async text => {
    const value = String(text || "");
    let wrote = false;
    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      try {
        await navigator.clipboard.writeText(value);
        wrote = true;
        const verified = await verifyClipboardText(value);
        if (verified === true) return true;
        if (verified === false) wrote = false;
      } catch (_e) { }
    }
    if (!wrote) {
      const legacyOk = legacyCopyText(value);
      if (!legacyOk) return false;
      const verified = await verifyClipboardText(value);
      if (verified === false) return false;
      return true;
    }
    return true;
  };

  const onSaveProjectLinkClick = async () => {
    showProjectLinkModal("", { loading: true, loadingText: "Формируем ссылку..." });
    setProjectLinkCopyButtonState("Подготовка...", false, true);
    currentProjectShareLink = "";
    await new Promise(resolve => setTimeout(resolve, 0));
    await withUiErrorBoundary("Ссылка проекта", async () => {
      const value = await encodeProjectToQueryValue(buildPortableProject());
      const url = new URL(location.href);
      let usedServerId = 0;
      try { usedServerId = await saveProjectToServer(getProjectName(), value); } catch (_e) { usedServerId = 0; }
      if (usedServerId > 0) {
        url.searchParams.delete(PROJECT_QUERY_PARAM);
        url.searchParams.set(PROJECT_ID_PARAM, String(usedServerId));
      } else {
        url.searchParams.set(PROJECT_QUERY_PARAM, value);
        url.searchParams.delete(PROJECT_ID_PARAM);
      }
      const link = url.toString();
      currentProjectShareLink = link;
      setProjectLinkCopyButtonState("Скопировать ссылку", false, false);
      showProjectLinkModal(link, { loading: false });
    }, "Не удалось сформировать ссылку проекта");
    if (!currentProjectShareLink) setProjectLinkCopyButtonState("Скопировать ссылку", false, false);
  };

  const onCopyProjectLinkClick = async () => {
    const link = currentProjectShareLink || (el && el.projectLinkText && el.projectLinkText.value) || "";
    if (!link) return;
    const copied = await copyTextSmart(link);
    if (copied) {
      setProjectLinkCopyButtonState("Ссылка скопирована", true);
      setTimeout(() => setProjectLinkCopyButtonState("Скопировать ссылку", false), 1400);
    } else {
      window.prompt("Скопируйте ссылку проекта", link);
    }
  };

  const bindProjectLinkHandlers = () => {
    bindEvent(el && el.projectLinkCopyBtn, "click", onCopyProjectLinkClick);
    bindEvent(el && el.saveLink, "click", onSaveProjectLinkClick);
    bindEvent(document, "click", e => {
      const btn = eventClosest(e, "#saveProjectLink");
      if (!btn) return;
      if (btn !== (el && el.saveLink)) onSaveProjectLinkClick();
    });
  };

  return {
    setProjectLinkCopyButtonState,
    onSaveProjectLinkClick,
    onCopyProjectLinkClick,
    bindProjectLinkHandlers
  };
};
