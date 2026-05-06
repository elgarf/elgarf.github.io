import { createDebounced } from "../utils/debounce.js";

export const setupProjectSessionController = (deps = {}) => {
  const {
    st,
    el,
    wrap,
    bindEvent,
    eventClosest,
    render,
    cloneProjectData,
    makeEmptyProjectData,
    buildProject,
    loadProjectIntoActiveState,
    onTabActivated,
    cancelActiveDrag,
    schedulePersistRef,
    lsGet,
    lsSet,
    TABS_SAVE_KEY,
    AUTO_SAVE_KEY,
    PERSIST_DEBOUNCE_MS,
    historyCommitIfChanged
  } = deps;

  let schedulePersist = (_kind = "project") => {};
  let tabSwitchTimer = 0;
  let persistAfterTabSwitch = null;
  let persistTabsDirty = false;
  let persistProjectDirty = false;
  let lastTabsJson = "";
  let lastProjectJson = "";

  const getActiveTab = () => st.tabs.find(t => t.id === st.activeTabId) || null;
  const runTabSwitchTransition = task => {
    const host = wrap;
    if (!host) { task(); return; }
    if (tabSwitchTimer) { clearTimeout(tabSwitchTimer); tabSwitchTimer = 0; }
    const runTask = () => {
      task();
      const finishSwitch = () => {
        render();
        if (typeof requestAnimationFrame === "function") {
          requestAnimationFrame(() => {
            host.classList.remove("tab-switching");
            render();
          });
        } else {
          host.classList.remove("tab-switching");
          render();
        }
      };
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(finishSwitch);
      else finishSwitch();
    };
    host.classList.add("tab-switching");
    tabSwitchTimer = setTimeout(() => {
      tabSwitchTimer = 0;
      runTask();
    }, 170);
  };
  const syncActiveTabSnapshot = () => {
    const t = getActiveTab();
    if (!t) return;
    t.title = (st.projectName || "Новый проект").trim() || "Новый проект";
    t.data = cloneProjectData(buildProject());
  };
  const renderProjectTabs = () => {
    if (!el.projectTabsList) return;
    el.projectTabsList.innerHTML = "";
    for (const t of st.tabs) {
      const li = document.createElement("li");
      li.className = "nav-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = `nav-link ${t.id === st.activeTabId ? "active" : ""}`;
      btn.title = t.title || "Новый проект";
      btn.setAttribute("aria-selected", t.id === st.activeTabId ? "true" : "false");
      const title = document.createElement("span");
      title.className = "tab-title";
      title.textContent = t.title || "Новый проект";
      const close = document.createElement("span");
      close.className = "tab-close-icon";
      close.title = "Закрыть вкладку";
      close.setAttribute("aria-label", "Закрыть вкладку");
      close.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      btn.appendChild(title);
      btn.appendChild(close);
      bindEvent(btn, "click", e => {
        const closeEl = eventClosest(e, ".tab-close-icon");
        if (closeEl) { closeProjectTab(t.id); return; }
        openProjectTab(t.id);
      });
      li.appendChild(btn);
      el.projectTabsList.appendChild(li);
    }
  };
  const activateTabData = tab => {
    if (!tab) return;
    if (typeof cancelActiveDrag === "function") cancelActiveDrag();
    st.activeTabId = tab.id;
    loadProjectIntoActiveState(tab.data || makeEmptyProjectData(tab.title || "Новый проект"));
    if (typeof onTabActivated === "function") onTabActivated(tab);
    renderProjectTabs();
    if (typeof persistAfterTabSwitch === "function") persistAfterTabSwitch();
  };
  const openProjectTab = tabId => {
    const next = st.tabs.find(t => t.id === tabId);
    if (!next || st.activeTabId === tabId) return;
    if (typeof cancelActiveDrag === "function") cancelActiveDrag();
    if (st.activeTabId !== null) syncActiveTabSnapshot();
    runTabSwitchTransition(() => {
      activateTabData(next);
    });
  };
  const createProjectTab = data => {
    if (typeof cancelActiveDrag === "function") cancelActiveDrag();
    syncActiveTabSnapshot();
    const d = cloneProjectData(data || makeEmptyProjectData("Новый проект"));
    const title = (d.projectName || "Новый проект").trim() || "Новый проект";
    const tab = { id: st.nextTabId++, title, data: d };
    st.tabs.push(tab);
    activateTabData(tab);
    schedulePersist("all");
  };
  const closeProjectTab = tabId => {
    if (st.tabs.length <= 1) return;
    const idx = st.tabs.findIndex(t => t.id === tabId);
    if (idx < 0) return;
    const wasActive = st.activeTabId === tabId;
    if (wasActive && typeof cancelActiveDrag === "function") cancelActiveDrag();
    st.tabs.splice(idx, 1);
    if (!wasActive) { renderProjectTabs(); schedulePersist("tabs"); return; }
    const next = st.tabs[Math.max(0, idx - 1)] || st.tabs[0];
    runTabSwitchTransition(() => {
      activateTabData(next);
    });
    schedulePersist("tabs");
  };
  const buildTabsBundle = () => {
    syncActiveTabSnapshot();
    return {
      version: 1,
      nextTabId: st.nextTabId,
      activeTabId: st.activeTabId,
      tabs: st.tabs.map(t => ({ id: t.id, title: t.title || "Новый проект", data: cloneProjectData(t.data || makeEmptyProjectData(t.title || "Новый проект")) }))
    };
  };
  const setPersistAfterTabSwitch = fn => {
    persistAfterTabSwitch = typeof fn === "function" ? fn : null;
  };

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
    } catch { /* noop */ }
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
    } catch {
      saveStatus.error();
    }
  };
  const persistDebounced = createDebounced(() => {
    persistNow();
  }, PERSIST_DEBOUNCE_MS);

  schedulePersist = (kind = "project") => {
    markDirty(kind);
    if ((kind === "project" || kind === "all") && typeof historyCommitIfChanged === "function") historyCommitIfChanged();
    saveStatus.saving();
    persistDebounced.schedule();
  };

  setPersistAfterTabSwitch(() => {
    schedulePersist("all");
    persistNow();
  });
  if (typeof schedulePersistRef === "function") schedulePersistRef(schedulePersist);

  return {
    getActiveTab,
    runTabSwitchTransition,
    syncActiveTabSnapshot,
    renderProjectTabs,
    buildTabsBundle,
    setPersistAfterTabSwitch,
    openProjectTab,
    createProjectTab,
    closeProjectTab,
    setSaveIndicator,
    saveStatus,
    persistNow,
    schedulePersist
  };
};


