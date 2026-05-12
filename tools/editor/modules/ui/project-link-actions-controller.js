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
    getProjectGuid,
    PROJECT_QUERY_PARAM,
    PROJECT_ID_PARAM
  } = deps;

  let currentProjectShareLink = "";

  const parseShareOriginOverride = rawValue => {
    const raw = String(rawValue || "").trim();
    if (!raw) return null;
    const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(raw) ? raw : `https://${raw}`;
    try {
      const parsed = new URL(withScheme);
      const hostInput = withScheme.replace(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//, "").split("/")[0].trim();
      if (!parsed.hostname || !hostInput) return null;
      const hostForDisplay = (() => {
        const normalized = hostInput.toLowerCase();
        if (normalized === "xn--80aakd1abmpcmfoi.xn--p1ai") return "редактормасок.рф";
        return hostInput;
      })();
      const displayOrigin = `${parsed.protocol}//${hostForDisplay}`.replace(/\/+$/, "");
      const asciiOrigin = `${parsed.protocol}//${parsed.host}`;
      return { displayOrigin, asciiOrigin };
    } catch {
      return null;
    }
  };

  const getShareOriginOverride = () => {
    const fromGlobal = typeof window !== "undefined" && typeof window.LED_MASK_SHARE_ORIGIN === "string"
      ? window.LED_MASK_SHARE_ORIGIN
      : "";
    return parseShareOriginOverride(fromGlobal)
      || parseShareOriginOverride((typeof location !== "undefined" && location.origin) ? String(location.origin) : "");
  };

  const resolveHostMode = () => {
    const host = String((typeof location !== "undefined" && location.hostname) || "").toLowerCase();
    if (host === "127.0.0.1" || host === "localhost") return "local";
    if (host === "elgarf.github.io") return "github";
    return "other";
  };

  const resolveShareTarget = viewerOnly => {
    const mode = resolveHostMode();
    if (mode === "local" || mode === "github") {
      return {
        path: viewerOnly ? "/tools/LedMaskViewer.html" : "/tools/LEDMaskEditor.html",
        idParam: "projectid"
      };
    }
    return {
      path: viewerOnly ? "/viewer.php" : "/index.php",
      idParam: "id"
    };
  };

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
    } catch {
      return false;
    }
  };

  const verifyClipboardText = async expected => {
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.readText !== "function") return null;
      const got = await navigator.clipboard.readText();
      return String(got || "") === String(expected || "");
    } catch {
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
      } catch { /* noop */ }
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
      const viewerOnly = !(el && el.projectLinkViewerOnly) || !!el.projectLinkViewerOnly.checked;
      const value = await encodeProjectToQueryValue(buildPortableProject());
      const target = resolveShareTarget(viewerOnly);
      const originOverride = getShareOriginOverride();
      const url = new URL(target.path, originOverride ? `${originOverride.asciiOrigin}/` : location.href);
      let usedServerId = 0;
      try { usedServerId = await saveProjectToServer(getProjectName(), value, getProjectGuid()); } catch { usedServerId = 0; }
      if (usedServerId > 0) {
        url.searchParams.delete(PROJECT_QUERY_PARAM);
        url.searchParams.delete("id");
        url.searchParams.delete("projectId");
        url.searchParams.delete("projectid");
        url.searchParams.delete(PROJECT_ID_PARAM);
        url.searchParams.set(target.idParam, String(usedServerId));
      } else {
        url.searchParams.set(PROJECT_QUERY_PARAM, value);
        url.searchParams.delete(PROJECT_ID_PARAM);
        url.searchParams.delete("projectId");
        url.searchParams.delete("projectid");
        url.searchParams.delete("id");
      }
      const link = originOverride
        ? `${originOverride.displayOrigin}${url.pathname}${url.search}${url.hash}`
        : url.toString();
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
    bindEvent(el && el.projectLinkViewerOnly, "change", () => {
      onSaveProjectLinkClick();
    });
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
