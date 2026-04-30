export const setupToolbarController = (deps = {}) => {
  const {
    documentRef = document,
    windowRef = window,
    el,
    st,
    bindEvent,
    mobileToolButtons = [],
    applyThemeMode,
    t = value => value
  } = deps;

  const overflowButtonIds = [
    "toolSelect", "toolDraw", "toolMaskAdd", "toolCellEdit", "toolFlowEdit", "toolClusterEdit", "toolRigEdit", "lockAllToggle",
    "btnCopy", "btnCopyMirror", "btnDelete", "zoomOut", "zoomIn", "zoomReset", "zoomFit", "newProject", "save", "saveLink", "load", "exp", "languageToggle", "themeToggle"
  ];

  const overflowButtons = overflowButtonIds.map(id => el && el[id]).filter(Boolean);
  const overflowGroups = [...new Set(overflowButtons.map(b => b.closest(".group")).filter(Boolean))];
  const overflowHiddenButtons = [];

  const on = (node, type, handler) => {
    if (!node || !type || !handler) return;
    if (bindEvent) bindEvent(node, type, handler);
    else node.addEventListener(type, handler);
  };
  const tooltipButtonSelector = ".toolbar button, .mobile-dock button, .toolbar-overflow-popup button, .tool-cycle-menu button";
  let activeTooltipButton = null;
  let hoveredTooltipButton = null;
  let tooltipShowTimer = 0;
  let tooltipHideTimer = 0;
  let tooltipSuppressUntilPointerUp = false;
  const tooltipButtonFromEvent = target => {
    const btn = target && target.closest ? target.closest(tooltipButtonSelector) : null;
    if (!btn || btn.closest(".EasyMDEContainer") || btn.closest(".editor-toolbar")) return null;
    return btn;
  };
  const tooltipLabel = btn => String(
    btn && (
      btn.getAttribute("title")
      || btn.getAttribute("data-bs-title")
      || btn.getAttribute("data-bs-original-title")
      || btn.getAttribute("aria-label")
    ) || ""
  ).trim();
  const tooltipPlacement = btn => {
    if (!btn || !windowRef.getComputedStyle) return "auto";
    const menu = btn.closest(".tool-cycle-menu");
    if (menu) {
      if (menu.classList.contains("tool-cycle-menu-bottom")) return "top";
      if (menu.classList.contains("tool-cycle-menu-side")) return "right";
      return "bottom";
    }
    const dock = btn.closest(".mobile-dock");
    if (dock) {
      const direction = String(windowRef.getComputedStyle(dock).flexDirection || "");
      return direction.includes("column") ? "right" : "top";
    }
    if (btn.closest(".toolbar")) return "bottom";
    if (btn.closest(".toolbar-overflow-popup")) return "bottom";
    return "auto";
  };
  const isToolCycleMenuButton = btn => !!(btn && btn.closest && btn.closest(".tool-cycle-menu"));
  const showButtonTooltip = btn => {
    if (!btn || !windowRef.bootstrap || !windowRef.bootstrap.Tooltip) return;
    const label = tooltipLabel(btn);
    if (!label) return;
    if (activeTooltipButton && activeTooltipButton !== btn) hideButtonTooltip(activeTooltipButton);
    activeTooltipButton = btn;
    btn.setAttribute("data-bs-title", label);
    btn.setAttribute("data-bs-toggle", "tooltip");
    btn.removeAttribute("title");
    const placement = tooltipPlacement(btn);
    const existingPlacement = btn.getAttribute("data-tooltip-placement") || "";
    if (existingPlacement && existingPlacement !== placement) {
      const old = windowRef.bootstrap.Tooltip.getInstance(btn);
      if (old) old.dispose();
    }
    btn.setAttribute("data-tooltip-placement", placement);
    const instance = windowRef.bootstrap.Tooltip.getOrCreateInstance(btn, {
      animation: false,
      container: "body",
      placement,
      fallbackPlacements: [placement],
      boundary: documentRef.body,
      trigger: "manual"
    });
    if (typeof instance.setContent === "function") instance.setContent({ ".tooltip-inner": label });
    instance.show();
  };
  const hideButtonTooltip = btn => {
    if (!btn || !windowRef.bootstrap || !windowRef.bootstrap.Tooltip) return;
    const instance = windowRef.bootstrap.Tooltip.getInstance(btn);
    if (instance) {
      instance.hide();
      instance.dispose();
    }
    if (activeTooltipButton === btn) activeTooltipButton = null;
  };
  const clearTooltipTimers = () => {
    if (tooltipShowTimer) {
      windowRef.clearTimeout(tooltipShowTimer);
      tooltipShowTimer = 0;
    }
    if (tooltipHideTimer) {
      windowRef.clearTimeout(tooltipHideTimer);
      tooltipHideTimer = 0;
    }
  };
  const scheduleTooltipShow = btn => {
    if (!btn || (tooltipSuppressUntilPointerUp && !isToolCycleMenuButton(btn))) return;
    hoveredTooltipButton = btn;
    if (tooltipHideTimer) {
      windowRef.clearTimeout(tooltipHideTimer);
      tooltipHideTimer = 0;
    }
    if (activeTooltipButton === btn) return;
    if (tooltipShowTimer) windowRef.clearTimeout(tooltipShowTimer);
    tooltipShowTimer = windowRef.setTimeout(() => {
      tooltipShowTimer = 0;
      if (hoveredTooltipButton === btn) showButtonTooltip(btn);
    }, 90);
  };
  const scheduleTooltipHide = btn => {
    if (!btn) return;
    if (hoveredTooltipButton === btn) hoveredTooltipButton = null;
    if (tooltipShowTimer) {
      windowRef.clearTimeout(tooltipShowTimer);
      tooltipShowTimer = 0;
    }
    if (tooltipHideTimer) windowRef.clearTimeout(tooltipHideTimer);
    tooltipHideTimer = windowRef.setTimeout(() => {
      tooltipHideTimer = 0;
      if (!hoveredTooltipButton) hideButtonTooltip(btn);
    }, 80);
  };
  const hideAnyButtonTooltip = () => {
    clearTooltipTimers();
    const btn = activeTooltipButton || hoveredTooltipButton;
    hoveredTooltipButton = null;
    if (btn) hideButtonTooltip(btn);
  };
  const setupButtonTooltips = () => {
    if (!documentRef || !windowRef.bootstrap || !windowRef.bootstrap.Tooltip) return;
    on(documentRef, "pointerdown", e => {
      const btn = tooltipButtonFromEvent(e.target);
      if (!btn) return;
      tooltipSuppressUntilPointerUp = true;
      clearTooltipTimers();
      hoveredTooltipButton = null;
      if (activeTooltipButton) hideButtonTooltip(activeTooltipButton);
      hideButtonTooltip(btn);
    });
    const releaseTooltipSuppress = () => {
      tooltipSuppressUntilPointerUp = false;
    };
    on(documentRef, "pointerup", releaseTooltipSuppress);
    on(documentRef, "pointercancel", releaseTooltipSuppress);
    on(documentRef, "tool-cycle-menu-open", e => {
      tooltipSuppressUntilPointerUp = false;
      const btn = e && e.detail && e.detail.button;
      clearTooltipTimers();
      if (!btn) {
        hideAnyButtonTooltip();
        return;
      }
      hoveredTooltipButton = btn;
      if (activeTooltipButton !== btn) {
        if (activeTooltipButton) hideButtonTooltip(activeTooltipButton);
        showButtonTooltip(btn);
      }
    });
    on(documentRef, "pointerover", e => {
      const btn = tooltipButtonFromEvent(e.target);
      if (!btn || btn === activeTooltipButton || btn.contains(e.relatedTarget)) return;
      scheduleTooltipShow(btn);
    });
    on(documentRef, "pointermove", e => {
      const btn = tooltipButtonFromEvent(e.target);
      if (!btn) {
        if (hoveredTooltipButton || activeTooltipButton) hideAnyButtonTooltip();
        return;
      }
      if (!isToolCycleMenuButton(btn) || btn === activeTooltipButton) return;
      scheduleTooltipShow(btn);
    });
    on(documentRef, "pointerout", e => {
      const btn = tooltipButtonFromEvent(e.target);
      if (!btn || btn.contains(e.relatedTarget)) return;
      if (e.relatedTarget && e.relatedTarget.closest && e.relatedTarget.closest(".tool-cycle-menu")) {
        hideButtonTooltip(btn);
        return;
      }
      scheduleTooltipHide(btn);
    });
    on(documentRef, "focusin", e => showButtonTooltip(tooltipButtonFromEvent(e.target)));
    on(documentRef, "focusout", e => {
      clearTooltipTimers();
      hoveredTooltipButton = null;
      hideButtonTooltip(tooltipButtonFromEvent(e.target));
    });
    on(documentRef, "mouseleave", hideAnyButtonTooltip);
    on(windowRef, "blur", hideAnyButtonTooltip);
    on(windowRef, "scroll", hideAnyButtonTooltip);
    on(documentRef, "visibilitychange", () => {
      if (documentRef.visibilityState !== "visible") hideAnyButtonTooltip();
    });
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
  const placePopupNearAnchor = (popupEl, anchorEl, defaultWidth = 220) => {
    if (!popupEl || !anchorEl) return;
    const tr = anchorEl.getBoundingClientRect();
    const vw = windowRef.innerWidth;
    popupEl.style.visibility = "hidden";
    popupEl.classList.add("show");
    const pw = popupEl.offsetWidth || defaultWidth;
    const left = Math.max(8, Math.min(vw - 8 - pw, tr.right - pw));
    const top = tr.bottom + 6;
    popupEl.style.left = `${left}px`;
    popupEl.style.top = `${top}px`;
    popupEl.style.visibility = "";
  };
  const getThemeItems = () => [
    { mode: "auto", label: t("Авто"), icon: "fa-solid fa-circle-half-stroke" },
    { mode: "light", label: t("Светлая"), icon: "fa-regular fa-sun" },
    { mode: "dark", label: t("Тёмная"), icon: "fa-regular fa-moon" }
  ];

  const syncThemePopupLabels = () => {
    if (!el || !el.themePopup) return;
    const labels = new Map(getThemeItems().map(item => [item.mode, item.label]));
    for (const btn of el.themePopup.querySelectorAll("[data-theme]")) {
      const mode = String(btn.getAttribute("data-theme") || "");
      const label = labels.get(mode);
      if (!label) continue;
      const span = btn.querySelector("span");
      if (span) span.textContent = label;
      else btn.textContent = label;
    }
  };

  const showThemePopup = (anchorEl = null) => {
    if (!el || !el.themePopup) return;
    const anchor = anchorEl || el.themeToggle;
    if (!anchor) return;
    syncThemePopupLabels();
    placePopupNearAnchor(el.themePopup, anchor, 220);
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
        item.innerHTML = `<span class="d-inline-flex align-items-center gap-2"><i class="fa-solid fa-circle-half-stroke"></i><span>${t("Тема")}</span></span><i class="fa-solid fa-chevron-right small"></i>`;

        const submenu = documentRef.createElement("div");
        submenu.className = "d-none ps-4 py-1";

        const themeItems = getThemeItems();

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

      if (b === el.languageToggle) {
        const item = documentRef.createElement("button");
        item.type = "button";
        item.className = "dropdown-item d-flex align-items-center gap-2";
        item.innerHTML = `<i class="fa-solid fa-language"></i><span>${b.getAttribute("title") || t("Язык")}</span>`;
        on(item, "click", () => {
          hideToolbarOverflowPopup();
          b.click();
        });
        el.overflowPopup.appendChild(item);
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

    placePopupNearAnchor(el.overflowPopup, el.overflowToggle, 220);
    el.overflowToggle.setAttribute("aria-expanded", "true");
  };

  const applyBootstrapClasses = () => {
    const theme = String(documentRef && documentRef.documentElement && documentRef.documentElement.getAttribute("data-bs-theme") || "").toLowerCase();
    const toolOffClass = theme === "light" ? "btn-outline-dark" : "btn-outline-light";
    for (const b of documentRef.querySelectorAll("button")) {
      if (
        b.classList.contains("btn-close")
        || b.classList.contains("dropdown-item")
        || b.closest(".tool-cycle-menu")
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

  setupButtonTooltips();

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
    syncThemePopupLabels,
    overflowHiddenButtons
  };
};
