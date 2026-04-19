export const setupPersistenceController = (deps = {}) => {
  const {
    el, lsSet, buildTabsBundle, buildProject,
    TABS_SAVE_KEY, AUTO_SAVE_KEY, PERSIST_DEBOUNCE_MS,
    historyCommitIfChanged
  } = deps;

  let persistTimer = null;
  let persistTabsDirty = false;
  let persistProjectDirty = false;

  const formatTimeHHMMSS = d => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}:${String(d.getSeconds()).padStart(2, "0")}`;
  const setSaveIndicator = (text, tone = "secondary") => {
    if (!el || !el.saveIndicator) return;
    el.saveIndicator.textContent = text;
    el.saveIndicator.title = text;
    el.saveIndicator.setAttribute("aria-label", text);
    el.saveIndicator.classList.remove("text-secondary", "text-success", "text-warning", "text-danger");
    el.saveIndicator.classList.add(`text-${tone}`);
  };
  const saveStatus = {
    saving() { setSaveIndicator("Сохранение...", "warning"); },
    saved(text) { setSaveIndicator(text || `Сохранено ${formatTimeHHMMSS(new Date())}`, "success"); },
    error(text) { setSaveIndicator(text || "Ошибка автосейва", "danger"); },
    idle(text) { setSaveIndicator(text || "Автосейв включен", "secondary"); }
  };
  const persistNow = () => {
    try {
      if (persistTabsDirty) { lsSet(TABS_SAVE_KEY, JSON.stringify(buildTabsBundle())); persistTabsDirty = false; }
      if (persistProjectDirty) { lsSet(AUTO_SAVE_KEY, JSON.stringify(buildProject())); persistProjectDirty = false; }
      saveStatus.saved();
    } catch (_e) {
      saveStatus.error();
    }
  };
  const schedulePersist = (kind = "project") => {
    if (kind === "tabs" || kind === "all") persistTabsDirty = true;
    if (kind === "project" || kind === "all") {
      persistProjectDirty = true;
      persistTabsDirty = true;
      if (typeof historyCommitIfChanged === "function") historyCommitIfChanged();
    }
    saveStatus.saving();
    if (persistTimer) clearTimeout(persistTimer);
    persistTimer = setTimeout(() => {
      persistTimer = null;
      persistNow();
    }, PERSIST_DEBOUNCE_MS);
  };

  return { setSaveIndicator, saveStatus, persistNow, schedulePersist };
};
