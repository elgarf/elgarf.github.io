import { createDebounced } from "./utils/debounce.js";

export const setupPersistenceController = (deps = {}) => {
  const {
    el, lsSet, lsGet, buildTabsBundle, buildProject,
    TABS_SAVE_KEY, AUTO_SAVE_KEY, PERSIST_DEBOUNCE_MS,
    historyCommitIfChanged
  } = deps;

  let persistTabsDirty = false;
  let persistProjectDirty = false;
  let lastTabsJson = "";
  let lastProjectJson = "";
  const markDirty = kind => {
    if (kind === "tabs" || kind === "all") persistTabsDirty = true;
    if (kind === "project" || kind === "all") {
      persistProjectDirty = true;
      persistTabsDirty = true;
    }
  };
  const saveJsonIfChanged = (key, nextObj, prevJson) => {
    const nextJson = JSON.stringify(nextObj);
    if (nextJson === prevJson) return prevJson;
    lsSet(key, nextJson);
    return nextJson;
  };

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
  const isProjectEffectivelyEmpty = p => {
    const rects = Array.isArray(p && p.rectangles) ? p.rectangles : [];
    const flowLinks = Array.isArray(p && p.flowLinks) ? p.flowLinks : [];
    return rects.length === 0 && flowLinks.length === 0;
  };
  const canOverwriteAutosaveWithProject = nextProject => {
    if (!isProjectEffectivelyEmpty(nextProject)) return true;
    if (typeof lsGet !== "function") return true;
    try {
      const rawPrev = lsGet(AUTO_SAVE_KEY, "");
      if (!rawPrev) return true;
      const prevProject = JSON.parse(rawPrev);
      if (!isProjectEffectivelyEmpty(prevProject)) return false;
    } catch (_e) { }
    return true;
  };
  const persistNow = () => {
    try {
      if (persistTabsDirty) {
        lastTabsJson = saveJsonIfChanged(TABS_SAVE_KEY, buildTabsBundle(), lastTabsJson);
        persistTabsDirty = false;
      }
      if (!persistProjectDirty) { saveStatus.saved(); return; }
      const nextProject = buildProject();
      persistProjectDirty = false;
      if (!canOverwriteAutosaveWithProject(nextProject)) {
        saveStatus.error("Защита автосейва: пустой проект не записан");
        return;
      }
      lastProjectJson = saveJsonIfChanged(AUTO_SAVE_KEY, nextProject, lastProjectJson);
      saveStatus.saved();
    } catch (_e) {
      saveStatus.error();
    }
  };
  const persistDebounced = createDebounced(() => {
    persistNow();
  }, PERSIST_DEBOUNCE_MS);

  const schedulePersist = (kind = "project") => {
    markDirty(kind);
    if ((kind === "project" || kind === "all") && typeof historyCommitIfChanged === "function") historyCommitIfChanged();
    saveStatus.saving();
    persistDebounced.schedule();
  };

  return { setSaveIndicator, saveStatus, persistNow, schedulePersist };
};
