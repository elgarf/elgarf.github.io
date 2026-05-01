export const setupToolbarActionsController = (deps = {}) => {
  const {
    el,
    st,
    bindClick,
    bindEvent,
    setViewMode,
    activateToolOrSelect,
    setMode,
    setLockAll,
    newProject,
    dupSel,
    dupMirrorSel,
    delSel,
    getViewMetrics,
    zoomAt,
    render,
    fit,
    getActionTargets,
    applyToTargets,
    autoContrast,
    invalidateRectCache,
    randomColor,
    undoHistory,
    redoHistory,
    commitProjectChange,
    windowRef = window
  } = deps;

  const bindClicks = entries => {
    for (const [btn, fn] of entries) bindClick(btn, fn);
  };
  const nextMobileViewMode = () => {
    const mode = String(st && st.viewMode || "art");
    if (mode === "art") return "install";
    if (mode === "install") return "spec";
    return "art";
  };
  const previousCanvasViewMode = () => {
    const mode = String(st && st.prevViewMode || "art");
    return mode === "install" ? "install" : "art";
  };
  const closeSpecViewMode = () => {
    const isMobile = !!(windowRef.matchMedia && windowRef.matchMedia("(max-width:900px)").matches);
    setViewMode(isMobile ? "art" : previousCanvasViewMode(), true);
  };
  const CREATE_TOOL_ITEMS = [
    { mode: "draw", label: "Добавить экран", icon: "fa-regular fa-square-plus" },
    { mode: "note", label: "Добавить примечание", icon: "fa-solid fa-note-sticky" },
    { mode: "shape", label: "Добавить контур", icon: "fa-solid fa-draw-polygon" },
    { mode: "device", label: "Добавить устройство", icon: "fa-solid fa-microchip" }
  ];
  const FLOW_TOOL_ITEMS = [
    { variant: "auto", label: "Правка автоматического потока", badge: "А", icon: "fa-solid fa-route" },
    { variant: "manual", label: "Ручная расстановка потока", badge: "М", icon: "fa-solid fa-route" }
  ];
  const SELECT_TOOL_ITEMS = [
    { mode: "select", label: "Выделение", icon: "fa-solid fa-arrow-pointer" },
    { mode: "cabinetEdit", label: "Выделение кабинетов", icon: "fa-solid fa-vector-square" }
  ];
  const documentRef = windowRef.document || (typeof document !== "undefined" ? document : null);
  const createToolMenuController = ({
    items,
    datasetKey,
    renderItem,
    choose,
    cycle
  }) => {
    let menu = null;
    let pointer = null;
    let suppressClick = false;
    let ignorePointerUntil = 0;
    const holdMs = 420;
    const attr = `data-${datasetKey}`;
    const boundAttr = `data-${datasetKey}-bound`;
    const ensureMenu = () => {
      if (menu || !documentRef) return menu;
      menu = documentRef.createElement("div");
      menu.className = "tool-cycle-menu dropdown-menu";
      menu.setAttribute("role", "menu");
      for (const item of items) {
        const btn = documentRef.createElement("button");
        btn.type = "button";
        btn.className = "icon-btn tool-cycle-item";
        btn.setAttribute(attr, item.value);
        btn.setAttribute("role", "menuitem");
        btn.title = item.label;
        btn.setAttribute("aria-label", item.label);
        btn.innerHTML = renderItem(item);
        menu.appendChild(btn);
      }
      documentRef.body.appendChild(menu);
      return menu;
    };
    const hideMenu = () => {
      if (menu) {
        for (const btn of menu.querySelectorAll(".tool-cycle-item.active")) btn.classList.remove("active");
        menu.classList.remove("show");
      }
    };
    const getMenuPlacement = anchor => {
      const dock = anchor && anchor.closest ? anchor.closest(".mobile-dock") : null;
      if (!dock || !windowRef.getComputedStyle) return "desktop";
      const style = windowRef.getComputedStyle(dock);
      const flexDirection = String(style.flexDirection || "");
      return flexDirection.includes("column") ? "side-dock" : "bottom-dock";
    };
    const placeMenu = anchor => {
      const node = ensureMenu();
      if (!node || !anchor) return;
      const r = anchor.getBoundingClientRect();
      const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
      const placement = getMenuPlacement(anchor);
      node.classList.toggle("tool-cycle-menu-side", placement === "side-dock");
      node.classList.toggle("tool-cycle-menu-bottom", placement === "bottom-dock");
      node.classList.toggle("tool-cycle-menu-desktop", placement === "desktop");
      node.style.minWidth = "";
      node.style.width = "";
      node.style.visibility = "hidden";
      node.classList.add("show");
      const vw = windowRef.innerWidth || documentRef.documentElement.clientWidth || 0;
      const vh = windowRef.innerHeight || documentRef.documentElement.clientHeight || 0;
      const maxLeft = Math.max(6, vw - node.offsetWidth - 6);
      const maxTop = Math.max(6, vh - node.offsetHeight - 6);
      if (placement === "side-dock") {
        node.style.left = `${Math.round(clamp(r.right + 8, 6, maxLeft))}px`;
        node.style.top = `${Math.round(clamp(r.top + (r.height - node.offsetHeight) / 2, 6, maxTop))}px`;
      } else if (placement === "bottom-dock") {
        node.style.left = `${Math.round(clamp(r.left + (r.width - node.offsetWidth) / 2, 6, maxLeft))}px`;
        node.style.top = `${Math.round(clamp(r.top - node.offsetHeight - 8, 6, maxTop))}px`;
      } else {
        node.style.left = `${Math.round(clamp(r.left, 6, maxLeft))}px`;
        node.style.top = `${Math.round(clamp(r.bottom + 6, 6, maxTop))}px`;
      }
      node.style.visibility = "";
    };
    const itemAtPoint = (clientX, clientY) => {
      const node = ensureMenu();
      if (!node || !node.classList.contains("show")) return null;
      const elAtPoint = documentRef.elementFromPoint(clientX, clientY);
      return elAtPoint && elAtPoint.closest ? elAtPoint.closest(`.tool-cycle-menu [${attr}]`) : null;
    };
    const valueAtPoint = (clientX, clientY) => {
      const item = itemAtPoint(clientX, clientY);
      return item ? String(item.getAttribute(attr) || "") : "";
    };
    const updateMenuHover = (clientX, clientY) => {
      const node = ensureMenu();
      if (!node || !node.classList.contains("show")) return "";
      const item = itemAtPoint(clientX, clientY);
      for (const btn of node.querySelectorAll(".tool-cycle-item.active")) {
        if (btn !== item) btn.classList.remove("active");
      }
      if (item) item.classList.add("active");
      return item ? String(item.getAttribute(attr) || "") : "";
    };
    const notifyMenuOpen = button => {
      if (!documentRef || typeof windowRef.CustomEvent !== "function") return;
      documentRef.dispatchEvent(new windowRef.CustomEvent("tool-cycle-menu-open", {
        detail: { button: button || null },
        bubbles: false
      }));
    };
    const clearHoldTimer = () => {
      if (pointer && pointer.timer) {
        windowRef.clearTimeout(pointer.timer);
        pointer.timer = 0;
      }
    };
    const cancelPointer = () => {
      clearHoldTimer();
      if (pointer && pointer.button) {
        try { pointer.button.releasePointerCapture(pointer.id); } catch (_err) { }
      }
      pointer = null;
      hideMenu();
    };
    const beginHold = (btn, id, clientX, clientY, source = "pointer") => {
      cancelPointer();
      pointer = {
        id,
        source,
        button: btn,
        sx: clientX,
        sy: clientY,
        x: clientX,
        y: clientY,
        hoverValue: "",
        menu: false,
        timer: windowRef.setTimeout(() => {
          if (!pointer || pointer.id !== id || pointer.source !== source) return;
          pointer.menu = true;
          placeMenu(pointer.button);
          if (source === "pointer" && pointer.button) {
            try { pointer.button.releasePointerCapture(id); } catch (_err) { }
          }
          pointer.hoverValue = updateMenuHover(pointer.x, pointer.y);
          notifyMenuOpen(itemAtPoint(pointer.x, pointer.y));
        }, holdMs)
      };
    };
    const finishHold = (id, clientX, clientY, source = "pointer") => {
      if (!pointer || pointer.id !== id || pointer.source !== source) return false;
      const active = pointer;
      const wasMenu = active.menu;
      clearHoldTimer();
      pointer = null;
      if (active.button && source === "pointer") {
        try { active.button.releasePointerCapture(id); } catch (_err) { }
      }
      if (wasMenu) {
        const value = valueAtPoint(clientX, clientY) || active.hoverValue || "";
        hideMenu();
        suppressClick = true;
        if (value) choose(value);
        return true;
      }
      cycle();
      suppressClick = true;
      return true;
    };
    const onPointerMove = e => {
      if (!pointer || pointer.source !== "pointer" || pointer.id !== e.pointerId) return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      if (!pointer.menu) return;
      pointer.hoverValue = updateMenuHover(e.clientX, e.clientY);
      notifyMenuOpen(itemAtPoint(e.clientX, e.clientY));
      e.preventDefault();
    };
    const onPointerUp = e => {
      if (finishHold(e.pointerId, e.clientX, e.clientY, "pointer")) e.preventDefault();
    };
    const bind = btn => {
      if (!btn || btn.getAttribute(boundAttr) === "1") return;
      btn.setAttribute(boundAttr, "1");
      const down = e => {
        if (Date.now() < ignorePointerUntil) return;
        if (e.button != null && e.button !== 0) return;
        beginHold(btn, e.pointerId, e.clientX, e.clientY, "pointer");
        try { btn.setPointerCapture(e.pointerId); } catch (_err) { }
        if (e.pointerType === "touch") e.preventDefault();
      };
      const touchId = touch => touch ? `touch:${touch.identifier}` : "touch";
      const firstTouch = e => e.changedTouches && e.changedTouches.length ? e.changedTouches[0] : null;
      bindEvent(btn, "touchstart", e => {
        const touch = firstTouch(e);
        if (!touch) return;
        ignorePointerUntil = Date.now() + 900;
        beginHold(btn, touchId(touch), touch.clientX, touch.clientY, "touch");
        e.preventDefault();
      }, { passive: false });
      bindEvent(documentRef, "touchmove", e => {
        if (!pointer || pointer.source !== "touch") return;
        const touches = Array.from(e.changedTouches || []);
        const touch = touches.find(t => touchId(t) === pointer.id);
        if (!touch) return;
        pointer.x = touch.clientX;
        pointer.y = touch.clientY;
        if (pointer.menu) {
          pointer.hoverValue = updateMenuHover(touch.clientX, touch.clientY);
          notifyMenuOpen(itemAtPoint(touch.clientX, touch.clientY));
        }
        e.preventDefault();
      }, { passive: false });
      bindEvent(documentRef, "touchend", e => {
        if (!pointer || pointer.source !== "touch") return;
        const touches = Array.from(e.changedTouches || []);
        const touch = touches.find(t => touchId(t) === pointer.id);
        if (!touch) return;
        finishHold(pointer.id, touch.clientX, touch.clientY, "touch");
        e.preventDefault();
      }, { passive: false });
      bindEvent(documentRef, "touchcancel", e => {
        if (!pointer || pointer.source !== "touch") return;
        const touches = Array.from(e.changedTouches || []);
        if (!touches.some(t => touchId(t) === pointer.id)) return;
        cancelPointer();
        e.preventDefault();
      }, { passive: false });
      bindEvent(btn, "pointerdown", down);
      bindEvent(btn, "click", e => {
        if (suppressClick) {
          suppressClick = false;
          e.preventDefault();
          return;
        }
        cycle();
      });
    };
    if (documentRef) {
      bindEvent(documentRef, "pointermove", onPointerMove);
      bindEvent(documentRef, "pointerup", onPointerUp);
      bindEvent(documentRef, "pointercancel", cancelPointer);
    }
    return { bind, hide: hideMenu };
  };
  const chooseCreateTool = mode => {
    const next = CREATE_TOOL_ITEMS.some(it => it.mode === mode) ? mode : "draw";
    st.createToolMode = next;
    if (typeof setMode === "function") setMode(next);
    else activateToolOrSelect(next);
  };
  const cycleCreateTool = () => {
    const current = st.mode === "draw" || st.mode === "note" || st.mode === "shape" || st.mode === "device" ? st.mode : String(st.createToolMode || "draw");
    const index = CREATE_TOOL_ITEMS.findIndex(it => it.mode === current);
    const next = CREATE_TOOL_ITEMS[(index + 1 + CREATE_TOOL_ITEMS.length) % CREATE_TOOL_ITEMS.length].mode;
    chooseCreateTool(st.mode === "draw" || st.mode === "note" || st.mode === "shape" || st.mode === "device" ? next : current);
  };
  const chooseFlowTool = variant => {
    st.flowEditVariant = FLOW_TOOL_ITEMS.some(it => it.variant === variant) ? variant : "auto";
    if (typeof setMode === "function") setMode("flowEdit");
    else activateToolOrSelect("flowEdit");
  };
  const cycleFlowTool = () => {
    const current = String(st.flowEditVariant || "auto") === "manual" ? "manual" : "auto";
    if (st.mode !== "flowEdit") {
      chooseFlowTool(current);
      return;
    }
    chooseFlowTool(current === "auto" ? "manual" : "auto");
  };
  const chooseSelectTool = mode => {
    const next = SELECT_TOOL_ITEMS.some(it => it.mode === mode) ? mode : "select";
    st.selectToolMode = next;
    if (typeof setMode === "function") setMode(next);
    else activateToolOrSelect(next);
  };
  const cycleSelectTool = () => {
    const current = (st.mode === "cabinetEdit") ? "cabinetEdit" : "select";
    if (st.mode !== "select" && st.mode !== "cabinetEdit") {
      chooseSelectTool(String(st.selectToolMode || "select"));
      return;
    }
    chooseSelectTool(current === "select" ? "cabinetEdit" : "select");
  };
  const createToolGroup = createToolMenuController({
    items: CREATE_TOOL_ITEMS.map(item => ({ ...item, value: item.mode })),
    datasetKey: "tool-mode",
    renderItem: item => `<i class="${item.icon}"></i>`,
    choose: chooseCreateTool,
    cycle: cycleCreateTool
  });
  const flowToolGroup = createToolMenuController({
    items: FLOW_TOOL_ITEMS.map(item => ({ ...item, value: item.variant })),
    datasetKey: "flow-variant",
    renderItem: item => `<i class="${item.icon}"></i><span class="tool-cycle-badge">${item.badge}</span>`,
    choose: chooseFlowTool,
    cycle: cycleFlowTool
  });
  const selectToolGroup = createToolMenuController({
    items: SELECT_TOOL_ITEMS.map(item => ({ ...item, value: item.mode })),
    datasetKey: "select-mode",
    renderItem: item => `<i class="${item.icon}"></i>`,
    choose: chooseSelectTool,
    cycle: cycleSelectTool
  });

  bindClicks([
    [el.viewModeArt, () => setViewMode("art", true)],
    [el.viewModeInstall, () => setViewMode("install", true)],
    [el.viewModeSpec, () => setViewMode("spec", true)],
    [el.mViewModeToggle, () => setViewMode(nextMobileViewMode(), true)],
    [el.specModeClose, closeSpecViewMode],
    [el.toolMaskAdd, () => activateToolOrSelect("maskEdit")],
    [el.toolCellEdit, () => activateToolOrSelect("cellEdit")],
    [el.toolClusterEdit, () => activateToolOrSelect("clusterEdit")],
    [el.toolRigEdit, () => activateToolOrSelect("rigEdit")],
    [el.lockAllToggle, () => setLockAll(!st.lockAll, true)],
    [el.mLockAllToggle, () => setLockAll(!st.lockAll, true)],
    [el.newProject, newProject],
    [el.btnCopy, dupSel],
    [el.btnCopyMirror, dupMirrorSel],
    [el.btnDelete, delSel],
    [el.zoomIn, () => {
      const vm = getViewMetrics();
      zoomAt(vm.centerX, vm.centerY, st.zoom * 1.2);
    }],
    [el.zoomOut, () => {
      const vm = getViewMetrics();
      zoomAt(vm.centerX, vm.centerY, st.zoom / 1.2);
    }],
    [el.zoomReset, () => { st.zoom = 1; render(); }],
    [el.zoomFit, fit],
    [el.btnAutoContrast, () => {
      const ts = getActionTargets();
      if (!ts.length) return;
      const nextAuto = !(ts[0].autoContrastB !== false);
      applyToTargets(r => {
        r.autoContrastB = nextAuto;
        if (r.autoContrastB) r.colorB = autoContrast(r.colorA);
        invalidateRectCache(r, "appearance");
      }, { syncProps: true, listRects: true, persist: true, render: true });
    }],
    [el.randColor, () => {
      const ts = getActionTargets();
      if (!ts.length) return;
      const shared = randomColor();
      applyToTargets(r => {
        r.colorA = shared;
        if (r.autoContrastB !== false) r.colorB = autoContrast(r.colorA);
        invalidateRectCache(r, "appearance");
      }, { syncProps: true, listRects: true, persist: true, render: true });
    }]
  ]);
  selectToolGroup.bind(el.toolSelect);
  selectToolGroup.bind(el.mToolSelect);
  createToolGroup.bind(el.toolDraw);
  createToolGroup.bind(el.mToolDraw);
  flowToolGroup.bind(el.toolFlowEdit);
  flowToolGroup.bind(el.mToolFlowEdit);
  if (el.toolNote) el.toolNote.classList.add("d-none");
  if (el.mToolNote) el.mToolNote.classList.add("d-none");

  bindClick(el.undo, () => undoHistory());
  bindClick(el.redo, () => redoHistory());

  const bindSnapToggles = () => {
    const bindings = [
      [el.snapGrid, "grid"],
      [el.snapObjects, "objects"],
      [el.snapCenters, "centers"],
      [el.snapGaps, "gaps"]
    ];
    for (const [node, key] of bindings) {
      if (!node) continue;
      bindEvent(node, "change", () => {
        st.snap[key] = !!node.checked;
        commitProjectChange({ persist: true, persistKind: "project", render: false });
      });
    }
  };

  bindSnapToggles();

  return { bindSnapToggles };
};
