export const setupViewThemeLockController = (deps = {}) => {
  const {
    windowRef = window,
    documentRef = document,
    st,
    el,
    normalizeThemeMode,
    normalizeViewMode,
    syncLockButtons,
    updateInstallToolAvailability,
    onViewModeUiUpdated,
    refreshToolButtons,
    commitProjectChange,
    setMode,
    isInstallOnlyToolMode,
    lsSet,
    THEME_MODE_KEY,
    render
  } = deps;

  const themeMedia = windowRef.matchMedia ? windowRef.matchMedia("(prefers-color-scheme: dark)") : null;
  const isInstallViewMode = () => normalizeViewMode(st.viewMode) === "install";

  const resolveThemeMode = v => normalizeThemeMode(v) === "auto"
    ? (themeMedia && themeMedia.matches ? "dark" : "light")
    : normalizeThemeMode(v);

  const updateViewModeUi = () => {
    const mode = normalizeViewMode(st.viewMode);
    const isInstall = mode === "install";
    const isSpec = mode === "spec";
    const isArt = mode === "art";
    const isMobile = !!(windowRef.matchMedia && windowRef.matchMedia("(max-width:900px)").matches);
    if (el.viewModeArt) {
      el.viewModeArt.classList.remove("btn-secondary");
      el.viewModeArt.classList.toggle("btn-primary", mode === "art");
      el.viewModeArt.classList.toggle("btn-outline-secondary", mode !== "art");
      el.viewModeArt.setAttribute("aria-pressed", mode === "art" ? "true" : "false");
    }
    if (el.viewModeInstall) {
      el.viewModeInstall.classList.remove("btn-secondary");
      el.viewModeInstall.classList.toggle("btn-primary", isInstall);
      el.viewModeInstall.classList.toggle("btn-outline-secondary", !isInstall);
      el.viewModeInstall.setAttribute("aria-pressed", isInstall ? "true" : "false");
    }
    if (el.viewModeSpec) {
      el.viewModeSpec.classList.remove("btn-secondary");
      el.viewModeSpec.classList.toggle("btn-primary", isSpec);
      el.viewModeSpec.classList.toggle("btn-outline-secondary", !isSpec);
      el.viewModeSpec.setAttribute("aria-pressed", isSpec ? "true" : "false");
    }
    if (el.mViewModeToggle) {
      const icon = el.mViewModeToggle.querySelector("i");
      const specOn = isMobile && isSpec;
      el.mViewModeToggle.classList.remove("btn-secondary");
      el.mViewModeToggle.classList.toggle("btn-primary", !!specOn);
      el.mViewModeToggle.classList.toggle("btn-outline-secondary", !specOn);
      el.mViewModeToggle.classList.toggle("mode-art", isArt);
      el.mViewModeToggle.classList.toggle("mode-install", isInstall);
      el.mViewModeToggle.classList.toggle("mode-spec", isSpec);
      el.mViewModeToggle.setAttribute("aria-pressed", specOn ? "true" : "false");
      const modeTitle = isSpec ? "Спецификация" : (isInstall ? "Для монтажников" : "Для художников");
      el.mViewModeToggle.title = `Режим: ${modeTitle}`;
      el.mViewModeToggle.setAttribute("aria-label", `Режим: ${modeTitle}. Нажмите для переключения`);
      if (icon) {
        icon.className = `fa-solid ${isSpec ? "fa-file-lines" : (isInstall ? "fa-screwdriver-wrench" : "fa-palette")}`;
      }
    }
    if (el.mobileDock) {
      const showDock = isMobile && !isSpec;
      el.mobileDock.classList.toggle("force-visible", showDock);
      el.mobileDock.classList.toggle("force-hidden", !showDock);
    }
    if (typeof updateInstallToolAvailability === "function") updateInstallToolAvailability();
    if (typeof onViewModeUiUpdated === "function") onViewModeUiUpdated();
  };

  const updateLockAllUi = () => {
    const on = !!st.lockAll;
    syncLockButtons([el.lockAllToggle, el.mLockAllToggle], on);
  };

  const setLockAll = (next, persist = true) => {
    st.lockAll = !!next;
    st.sel = null;
    if (!(st.selSet instanceof Set)) st.selSet = new Set();
    else st.selSet.clear();
    st.selMultiBase = null;
    updateLockAllUi();
    if (typeof commitProjectChange === "function") {
      commitProjectChange({ syncProps: true, persist, persistKind: "project", render: true });
    }
  };

  const setViewMode = (mode, persist = true) => {
    st.viewMode = normalizeViewMode(mode);
    updateViewModeUi();
    if (!isInstallViewMode() && typeof isInstallOnlyToolMode === "function" && isInstallOnlyToolMode(st.mode)) {
      if (typeof setMode === "function") setMode("select");
      return;
    }
    if (typeof commitProjectChange === "function") {
      commitProjectChange({ persist, persistKind: "project", render: true });
    }
  };

  const updateThemeUi = () => {
    if (el.themeIcon) {
      const icon = st.themeMode === "dark" ? "fa-moon" : st.themeMode === "light" ? "fa-sun" : "fa-circle-half-stroke";
      el.themeIcon.className = `fa-solid ${icon}`;
    }
    if (el.themeToggle) {
      const title = st.themeMode === "dark" ? "Тема: тёмная" : st.themeMode === "light" ? "Тема: светлая" : "Тема: авто";
      el.themeToggle.title = title;
      el.themeToggle.setAttribute("aria-label", title);
    }
    if (el.themePopup) {
      for (const a of el.themePopup.querySelectorAll("[data-theme]")) {
        const on = a.getAttribute("data-theme") === st.themeMode;
        a.classList.toggle("active", on);
      }
    }
  };

  const applyThemeMode = (mode, persist = true) => {
    st.themeMode = normalizeThemeMode(mode);
    documentRef.documentElement.setAttribute("data-bs-theme", resolveThemeMode(st.themeMode));
    updateThemeUi();
    updateLockAllUi();
    if (typeof refreshToolButtons === "function") refreshToolButtons();
    if (persist && typeof lsSet === "function") lsSet(THEME_MODE_KEY, st.themeMode);
    if (typeof render === "function") render();
  };

  return {
    themeMedia,
    isInstallViewMode,
    resolveThemeMode,
    updateViewModeUi,
    updateLockAllUi,
    setLockAll,
    setViewMode,
    updateThemeUi,
    applyThemeMode
  };
};
