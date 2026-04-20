export const setupTabsController = (deps = {}) => {
  const {
    st, el, wrap, bindEvent, eventClosest, render,
    cloneProjectData, makeEmptyProjectData, buildProject,
    loadProjectIntoActiveState, schedulePersist,
    onTabActivated
  } = deps;

  let tabSwitchTimer = 0;
  let persistAfterTabSwitch = null;

  const getActiveTab = () => st.tabs.find(t => t.id === st.activeTabId) || null;
  const isMobileTabStorageMode = () => {
    try {
      const byWidth = window.matchMedia && window.matchMedia("(max-width:900px)").matches;
      const byPointer = window.matchMedia && window.matchMedia("(hover:none) and (pointer:coarse)").matches;
      return !!(byWidth || byPointer);
    } catch (_e) {
      return false;
    }
  };
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
  const activateTabData = tab => {
    if (!tab) return;
    st.activeTabId = tab.id;
    loadProjectIntoActiveState(tab.data || makeEmptyProjectData(tab.title || "Новый проект"));
    if (typeof onTabActivated === "function") onTabActivated(tab);
    renderProjectTabs();
    if (typeof persistAfterTabSwitch === "function") persistAfterTabSwitch();
  };
  const openProjectTab = tabId => {
    const next = st.tabs.find(t => t.id === tabId);
    if (!next || st.activeTabId === tabId) return;
    if (st.activeTabId !== null) syncActiveTabSnapshot();
    runTabSwitchTransition(() => {
      activateTabData(next);
    });
  };
  const createProjectTab = data => {
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
    st.tabs.splice(idx, 1);
    if (!wasActive) { renderProjectTabs(); schedulePersist("tabs"); return; }
    const next = st.tabs[Math.max(0, idx - 1)] || st.tabs[0];
    runTabSwitchTransition(() => {
      activateTabData(next);
    });
    schedulePersist("tabs");
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
  const buildTabsBundle = () => {
    syncActiveTabSnapshot();
    if (isMobileTabStorageMode()) {
      const active = getActiveTab() || st.tabs[0] || { id: 1, title: "Новый проект", data: makeEmptyProjectData("Новый проект") };
      const activeId = Number(active && active.id) || 1;
      return {
        version: 1,
        nextTabId: Math.max(2, activeId + 1),
        activeTabId: activeId,
        tabs: [{ id: activeId, title: active.title || "Новый проект", data: cloneProjectData(active.data || makeEmptyProjectData(active.title || "Новый проект")) }]
      };
    }
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

  return {
    getActiveTab,
    isMobileTabStorageMode,
    runTabSwitchTransition,
    syncActiveTabSnapshot,
    renderProjectTabs,
    buildTabsBundle,
    setPersistAfterTabSwitch,
    openProjectTab,
    createProjectTab,
    closeProjectTab
  };
};
