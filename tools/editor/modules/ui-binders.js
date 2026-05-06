export const setupUiBinders = (deps = {}) => {
  const {
    st, el, themeMedia, overflowHiddenButtons,
    bindEvent, bindClick, bindWindowEvent,
    bindProxyClick, lsGet, lsSet, HELP_SEEN_KEY,
    openHelpModal, closeHelpModal,
    syncActiveTabSnapshot, renderProjectTabs, syncProps, schedulePersist,
    createProjectTab, makeEmptyProjectData,
    applyThemeMode, hideThemePopup, showThemePopup,
    hideToolbarOverflowPopup, showToolbarOverflowPopup,
    updateMobileDock, updateToolbarOverflow, persistNow, scheduleCanvasResize,
    t = value => value
  } = deps;

  if (!el || !bindEvent || !bindClick || !bindWindowEvent) return {};

  const isViewerMode = (() => {
    try {
      const p = new URLSearchParams((globalThis.location && globalThis.location.search) || "");
      const byParam = p.get("viewer") === "1";
      const path = String((globalThis.location && globalThis.location.pathname) || "").toLowerCase();
      const byPath = path.endsWith("/ledmaskviewer.html") || path.endsWith("ledmaskviewer.html");
      return byParam || byPath;
    } catch {
      return false;
    }
  })();
  if (!isViewerMode && !lsGet(HELP_SEEN_KEY, "")) openHelpModal();
  bindClick(el.helpOpen, openHelpModal);
  bindClick(el.helpClose, closeHelpModal);
  bindEvent(el.helpModal, "hidden.bs.modal", () => { lsSet(HELP_SEEN_KEY, "1"); });

  bindProxyClick(el.mToolMaskAdd, el.toolMaskAdd);
  bindProxyClick(el.mToolCellEdit, el.toolCellEdit);
  bindProxyClick(el.mToolClusterEdit, el.toolClusterEdit);
  bindProxyClick(el.mToolRigEdit, el.toolRigEdit);
  bindProxyClick(el.mCopy, el.btnCopy);
  bindProxyClick(el.mCopyMirror, el.btnCopyMirror);
  bindProxyClick(el.mDelete, el.btnDelete);
  bindEvent(el.mobileMenu, "click", e => {
    if (!el.side) return;
    e.preventDefault();
    e.stopPropagation();
    const bootstrapRef = globalThis && globalThis.bootstrap;
    if (bootstrapRef && bootstrapRef.Offcanvas && typeof bootstrapRef.Offcanvas.getOrCreateInstance === "function") {
      bootstrapRef.Offcanvas.getOrCreateInstance(el.side).show();
      return;
    }
    el.side.classList.add("show");
    el.side.style.visibility = "visible";
  });

  const syncProjectNameInputs = () => {
    if (el.project) el.project.value = st.projectName;
    if (el.projectNamePanel) el.projectNamePanel.value = st.projectName;
  };
  const applyProjectNameInput = (opts = {}) => {
    const source = opts && opts.source ? opts.source : el.project;
    const raw = source ? String(source.value || "") : "";
    st.projectName = opts.syncProps ? raw.trim() : raw;
    syncProjectNameInputs();
    syncActiveTabSnapshot();
    renderProjectTabs();
    if (opts.syncProps) syncProps();
    schedulePersist("all");
  };
  bindEvent(el.project, "input", () => applyProjectNameInput({ syncProps: false, source: el.project }));
  bindEvent(el.project, "change", () => applyProjectNameInput({ syncProps: true, source: el.project }));
  bindEvent(el.projectNamePanel, "input", () => applyProjectNameInput({ syncProps: false, source: el.projectNamePanel }));
  bindEvent(el.projectNamePanel, "change", () => applyProjectNameInput({ syncProps: true, source: el.projectNamePanel }));
  bindEvent(el.projectTabAdd, "click", () => createProjectTab(makeEmptyProjectData(t("Новый проект"))));

  if (el.themePopup) {
    for (const a of el.themePopup.querySelectorAll("[data-theme]")) {
      bindEvent(a, "click", e => { e.preventDefault(); applyThemeMode(a.getAttribute("data-theme"), true); hideThemePopup(); });
    }
  }
  bindEvent(el.themeToggle, "click", e => {
    e.preventDefault();
    hideToolbarOverflowPopup();
    const open = el.themePopup && el.themePopup.classList.contains("show");
    if (open) hideThemePopup();
    else showThemePopup();
  });
  if (themeMedia && typeof themeMedia.addEventListener === "function") {
    themeMedia.addEventListener("change", () => { if (st.themeMode === "auto") applyThemeMode("auto", false); });
  } else if (themeMedia && typeof themeMedia.addListener === "function") {
    themeMedia.addListener(() => { if (st.themeMode === "auto") applyThemeMode("auto", false); });
  }
  bindEvent(el.overflowToggle, "click", e => {
    e.preventDefault();
    if (!overflowHiddenButtons.length) return;
    const open = el.overflowPopup && el.overflowPopup.classList.contains("show");
    if (open) hideToolbarOverflowPopup();
    else showToolbarOverflowPopup();
  });
  bindEvent(document, "click", e => {
    const t = e && e.target;
    if (el.overflowPopup && el.overflowToggle && !(el.overflowPopup.contains(t) || el.overflowToggle.contains(t))) hideToolbarOverflowPopup();
    if (el.themePopup && el.themeToggle && !(el.themePopup.contains(t) || el.themeToggle.contains(t))) hideThemePopup();
  });

  const onViewportUiChange = () => { hideToolbarOverflowPopup(); hideThemePopup(); updateToolbarOverflow(); };
  bindWindowEvent("resize", updateMobileDock);
  bindWindowEvent("orientationchange", updateMobileDock);
  bindWindowEvent("resize", onViewportUiChange);
  bindWindowEvent("orientationchange", onViewportUiChange);
  bindWindowEvent("beforeunload", () => { persistNow(); });
  bindEvent(document, "visibilitychange", () => { if (document.visibilityState !== "visible") persistNow(); });
  if (el.side) {
    bindEvent(el.side, "shown.bs.offcanvas", scheduleCanvasResize);
    bindEvent(el.side, "hidden.bs.offcanvas", scheduleCanvasResize);
  }

  return { applyProjectNameInput };
};

