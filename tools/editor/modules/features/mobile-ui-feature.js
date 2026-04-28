export const setupMobileUiFeature = (deps = {}) => {
  const {
    windowRef,
    el,
    bindEvent,
    st,
    normalizeViewMode = v => v,
    t = value => value
  } = deps;

  const isMobile = () => windowRef.matchMedia("(max-width:900px)").matches;
  if (bindEvent) {
    const isCoarsePointer = () => windowRef.matchMedia && windowRef.matchMedia("(hover:none) and (pointer:coarse)").matches;
    const isEditableTarget = t => {
      if (!t || !(t instanceof Element)) return false;
      if (t.closest("[contenteditable='true']")) return true;
      const n = t.tagName;
      return n === "INPUT" || n === "TEXTAREA" || n === "SELECT";
    };
    let lastTouchEndTs = 0;
    bindEvent(document, "touchend", e => {
      if (!isCoarsePointer()) return;
      if (isEditableTarget(e.target)) return;
      const now = Date.now();
      const dt = now - lastTouchEndTs;
      if (dt > 0 && dt < 320) e.preventDefault();
      lastTouchEndTs = now;
    }, { passive: false });
  }

  const syncDockToggle = collapsed => {
    const btn = el && el.mDockToggle;
    if (!btn) return;
    btn.setAttribute("aria-expanded", collapsed ? "false" : "true");
    btn.title = t(collapsed ? "Развернуть инструменты" : "Свернуть инструменты");
    btn.setAttribute("aria-label", btn.title);
    const icon = btn.querySelector("i");
    if (icon) {
      const dock = el && el.mobileDock;
      const flexDirection = dock && windowRef.getComputedStyle ? windowRef.getComputedStyle(dock).flexDirection : "";
      const isVerticalDock = flexDirection === "column" || flexDirection === "column-reverse";
      const iconName = isVerticalDock
        ? (collapsed ? "fa-chevron-up" : "fa-chevron-down")
        : (collapsed ? "fa-chevron-left" : "fa-chevron-right");
      icon.className = `fa-solid ${iconName}`;
    }
  };
  const setDockCollapsed = collapsed => {
    const dock = el && el.mobileDock;
    if (!dock) return;
    const reduceMotion = windowRef.matchMedia && windowRef.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fromWidth = dock.offsetWidth;
    const fromHeight = dock.offsetHeight;
    if (!fromWidth || !fromHeight || reduceMotion) {
      dock.classList.toggle("is-collapsed", collapsed);
      syncDockToggle(collapsed);
      return;
    }
    dock.style.width = `${fromWidth}px`;
    dock.style.height = `${fromHeight}px`;
    dock.classList.toggle("is-collapsed", collapsed);
    syncDockToggle(collapsed);
    dock.style.width = "auto";
    dock.style.height = "auto";
    const toWidth = dock.offsetWidth;
    const toHeight = dock.offsetHeight;
    dock.style.width = `${fromWidth}px`;
    dock.style.height = `${fromHeight}px`;
    dock.classList.add("is-resizing");
    dock.offsetWidth;
    windowRef.requestAnimationFrame(() => {
      dock.style.width = `${toWidth}px`;
      dock.style.height = `${toHeight}px`;
    });
    const finish = e => {
      if (e && e.target !== dock) return;
      dock.classList.remove("is-resizing");
      dock.style.width = "";
      dock.style.height = "";
      dock.removeEventListener("transitionend", finish);
    };
    dock.addEventListener("transitionend", finish);
    windowRef.setTimeout(finish, 260);
  };
  if (bindEvent && el && el.mDockToggle && el.mobileDock) {
    bindEvent(el.mDockToggle, "click", e => {
      e.preventDefault();
      const collapsed = !el.mobileDock.classList.contains("is-collapsed");
      setDockCollapsed(collapsed);
    });
    syncDockToggle(el.mobileDock.classList.contains("is-collapsed"));
  }

  const updateMobileDock = () => {
    if (!el.mobileDock) return;
    const show = isMobile() && normalizeViewMode(st && st.viewMode) !== "spec";
    el.mobileDock.classList.toggle("force-visible", show);
    el.mobileDock.classList.toggle("force-hidden", !show);
    syncDockToggle(el.mobileDock.classList.contains("is-collapsed"));
  };

  return {
    isMobile,
    updateMobileDock
  };
};
