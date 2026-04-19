export const setupViewThemeLockController = (deps = {}) => {
  const {
    windowRef = window,
    documentRef = document,
    st,
    el,
    normalizeThemeMode,
    normalizeViewMode,
    syncModeToggleButton,
    syncLockButtons,
    updateInstallToolAvailability,
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
    const isInstall = isInstallViewMode();
    if (el.viewModeArt) {
      el.viewModeArt.classList.remove("btn-secondary");
      el.viewModeArt.classList.toggle("btn-primary", !isInstall);
      el.viewModeArt.classList.toggle("btn-outline-secondary", isInstall);
      el.viewModeArt.setAttribute("aria-pressed", !isInstall ? "true" : "false");
    }
    if (el.viewModeInstall) {
      el.viewModeInstall.classList.remove("btn-secondary");
      el.viewModeInstall.classList.toggle("btn-primary", isInstall);
      el.viewModeInstall.classList.toggle("btn-outline-secondary", !isInstall);
      el.viewModeInstall.setAttribute("aria-pressed", isInstall ? "true" : "false");
    }
    if (el.mViewModeToggle) {
      syncModeToggleButton(el.mViewModeToggle, isInstall, "Режим: Для монтажников", "Режим: Для художников");
    }
    if (typeof updateInstallToolAvailability === "function") updateInstallToolAvailability();
  };

  const updateLockAllUi = () => {
    const on = !!st.lockAll;
    syncLockButtons([el.lockAllToggle, el.mLockAllToggle], on);
  };

  const setLockAll = (next, persist = true) => {
    st.lockAll = !!next;
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
