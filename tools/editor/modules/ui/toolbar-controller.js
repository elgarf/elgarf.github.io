export const setupToolbarController = (deps = {}) => {
  const {
    documentRef = document,
    windowRef = window,
    el,
    st,
    bindEvent,
    mobileToolButtons = [],
    applyThemeMode
  } = deps;

  const overflowButtonIds = [
    "toolSelect", "toolDraw", "toolNote", "toolMaskAdd", "toolCellEdit", "toolFlowEdit", "toolClusterEdit", "toolRigEdit", "lockAllToggle",
    "btnCopy", "btnCopyMirror", "btnDelete", "zoomOut", "zoomIn", "zoomReset", "zoomFit", "newProject", "save", "saveLink", "load", "exp", "themeToggle"
  ];

  const overflowButtons = overflowButtonIds.map(id => el && el[id]).filter(Boolean);
  const overflowGroups = [...new Set(overflowButtons.map(b => b.closest(".group")).filter(Boolean))];
  const overflowHiddenButtons = [];

  const on = (node, type, handler) => {
    if (!node || !type || !handler) return;
    if (bindEvent) bindEvent(node, type, handler);
    else node.addEventListener(type, handler);
  };

  const ensureMobileDock = () => {
    const host = documentRef.querySelector(".app") || documentRef.body;
    const dock = documentRef.querySelector(".mobile-dock");
    if (!host || !dock) return;
    if (dock.parentElement !== host) host.appendChild(dock);
  };

  const hideToolbarOverflowPopup = () => {
    if (!el || !el.overflowPopup || !el.overflowToggle) return;
    el.overflowPopup.classList.remove("show");
    el.overflowToggle.setAttribute("aria-expanded", "false");
  };

  const hideThemePopup = () => {
    if (!el || !el.themePopup || !el.themeToggle) return;
    el.themePopup.classList.remove("show");
    el.themeToggle.setAttribute("aria-expanded", "false");
  };

  const showThemePopup = (anchorEl = null) => {
    if (!el || !el.themePopup) return;
    const anchor = anchorEl || el.themeToggle;
    if (!anchor) return;
    const tr = anchor.getBoundingClientRect();
    const vw = windowRef.innerWidth;
    el.themePopup.style.visibility = "hidden";
    el.themePopup.classList.add("show");
    const pw = el.themePopup.offsetWidth || 220;
    const left = Math.max(8, Math.min(vw - 8 - pw, tr.right - pw));
    const top = tr.bottom + 6;
    el.themePopup.style.left = `${left}px`;
    el.themePopup.style.top = `${top}px`;
    el.themePopup.style.visibility = "";
    if (el.themeToggle) el.themeToggle.setAttribute("aria-expanded", "true");
  };

  const showToolbarOverflowPopup = () => {
    if (!el || !el.overflowPopup || !el.overflowToggle || !overflowHiddenButtons.length) return;
    hideThemePopup();
    el.overflowPopup.innerHTML = "";

    for (const b of overflowHiddenButtons) {
      if (b === el.themeToggle) {
        const item = documentRef.createElement("button");
        item.type = "button";
        item.className = "dropdown-item d-flex align-items-center justify-content-between gap-2";
        item.setAttribute("aria-expanded", "false");
        item.innerHTML = '<span class="d-inline-flex align-items-center gap-2"><i class="fa-solid fa-circle-half-stroke"></i><span>Тема</span></span><i class="fa-solid fa-chevron-right small"></i>';

        const submenu = documentRef.createElement("div");
        submenu.className = "d-none ps-4 py-1";

        const themeItems = [
          { mode: "auto", label: "Авто", icon: "fa-solid fa-circle-half-stroke" },
          { mode: "light", label: "Светлая", icon: "fa-regular fa-sun" },
          { mode: "dark", label: "Тёмная", icon: "fa-regular fa-moon" }
        ];

        for (const t of themeItems) {
          const subBtn = documentRef.createElement("button");
          subBtn.type = "button";
          subBtn.className = `dropdown-item d-flex align-items-center gap-2 py-1 ${st && st.themeMode === t.mode ? "active" : ""}`;
          subBtn.innerHTML = `<i class="${t.icon}"></i><span>${t.label}</span>`;
          on(subBtn, "click", () => {
            if (typeof applyThemeMode === "function") applyThemeMode(t.mode, true);
            hideToolbarOverflowPopup();
          });
          submenu.appendChild(subBtn);
        }

        on(item, "click", e => {
          e.preventDefault();
          const open = submenu.classList.contains("d-none");
          submenu.classList.toggle("d-none", !open);
          item.setAttribute("aria-expanded", open ? "true" : "false");
        });

        el.overflowPopup.appendChild(item);
        el.overflowPopup.appendChild(submenu);
        continue;
      }

      const item = documentRef.createElement("button");
      item.type = "button";
      item.className = "dropdown-item d-flex align-items-center gap-2";
      if (b.classList.contains("btn-success") || b.dataset.toggleOn === "1") item.classList.add("active");
      const icon = b.querySelector("i");
      const text = (b.textContent || "").trim();
      const title = b.getAttribute("title") || b.getAttribute("aria-label") || text || "Действие";
      item.innerHTML = `${icon ? `<i class="${icon.className}"></i>` : ""}<span>${title}</span>`;
      on(item, "click", () => {
        hideToolbarOverflowPopup();
        b.click();
      });
      el.overflowPopup.appendChild(item);
    }

    const tr = el.overflowToggle.getBoundingClientRect();
    const vw = windowRef.innerWidth;
    el.overflowPopup.style.visibility = "hidden";
    el.overflowPopup.classList.add("show");
    const pw = el.overflowPopup.offsetWidth || 220;
    const left = Math.max(8, Math.min(vw - 8 - pw, tr.right - pw));
    const top = tr.bottom + 6;
    el.overflowPopup.style.left = `${left}px`;
    el.overflowPopup.style.top = `${top}px`;
    el.overflowPopup.style.visibility = "";
    el.overflowToggle.setAttribute("aria-expanded", "true");
  };

  const applyBootstrapClasses = () => {
    const theme = String(documentRef && documentRef.documentElement && documentRef.documentElement.getAttribute("data-bs-theme") || "").toLowerCase();
    const toolOffClass = theme === "light" ? "btn-outline-dark" : "btn-outline-light";
    for (const b of documentRef.querySelectorAll("button")) {
      if (
        b.classList.contains("btn-close")
        || b.classList.contains("dropdown-item")
        || b.closest(".EasyMDEContainer")
        || b.closest(".editor-toolbar")
      ) continue;
      b.classList.add("btn", "btn-sm");
      b.classList.remove("btn-danger", "btn-outline-light", "btn-outline-dark", "btn-outline-secondary", "btn-success", "btn-info", "btn-primary");
      const isToolButton = /^(?:tool|mTool)/.test(String(b.id || ""));
      const isLockToggle = b === (el && el.lockAllToggle) || b === (el && el.mLockAllToggle);
      if (b === (el && el.helpOpen)) b.classList.add("btn-info");
      else if (isToolButton || mobileToolButtons.includes(b)) b.classList.add(toolOffClass);
      else if (isLockToggle) b.classList.add(toolOffClass);
      else if (b.closest(".toolbar")) b.classList.add("btn-primary");
      else if (b.classList.contains("danger")) b.classList.add("btn-danger");
      else b.classList.add("btn-primary");
    }
    for (const i of documentRef.querySelectorAll("input")) {
      if (i.type === "checkbox") continue;
      if (i.type === "range") {
        i.classList.add("form-range");
        continue;
      }
      if (i.type === "color") i.classList.add("form-control", "form-control-color", "form-control-sm");
      else i.classList.add("form-control", "form-control-sm");
    }
    for (const s of documentRef.querySelectorAll("select")) s.classList.add("form-select", "form-select-sm");
  };

  const updateToolbarOverflow = () => {
    if (!el || !el.toolbar || !el.overflowGroup || !el.overflowPopup) return;
    for (const b of overflowButtons) b.classList.remove("d-none");
    for (const g of overflowGroups) g.classList.remove("d-none");
    overflowHiddenButtons.length = 0;
    hideToolbarOverflowPopup();
    hideThemePopup();
    el.overflowGroup.style.display = "none";

    const isOverflowed = () => el.toolbar.scrollWidth > el.toolbar.clientWidth + 1;
    if (!isOverflowed()) return;

    el.overflowGroup.style.display = "flex";
    const hidden = [];

    const refreshGroupVisibility = () => {
      for (const g of overflowGroups) {
        const hasVisible = [...g.querySelectorAll("button")].some(btn => !btn.classList.contains("d-none"));
        g.classList.toggle("d-none", !hasVisible);
      }
    };

    for (let i = overflowButtons.length - 1; i >= 0 && isOverflowed(); i--) {
      const b = overflowButtons[i];
      if (!b || b.classList.contains("d-none")) continue;
      if (windowRef.getComputedStyle(b).display === "none") continue;
      b.classList.add("d-none");
      hidden.unshift(b);
      refreshGroupVisibility();
    }

    if (!hidden.length) {
      el.overflowGroup.style.display = "none";
      for (const g of overflowGroups) g.classList.remove("d-none");
      return;
    }

    overflowHiddenButtons.push(...hidden);
  };

  return {
    ensureMobileDock,
    hideToolbarOverflowPopup,
    hideThemePopup,
    showThemePopup,
    showToolbarOverflowPopup,
    applyBootstrapClasses,
    updateToolbarOverflow,
    overflowHiddenButtons
  };
};
