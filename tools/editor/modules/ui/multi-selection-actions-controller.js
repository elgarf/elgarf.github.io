export const setupMultiSelectionActionsController = (deps = {}) => {
  const {
    st,
    getSelectedRects,
    rectAABB,
    refreshMultiSelectionBase,
    refreshPanels,
    schedulePersist,
    render,
    mFmt,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    getHiddenSet,
    buildVisibleCabinetSummary
  } = deps;

  const ACTIONS = [
    { id: "packX", title: "Расставить рядом по горизонтали", icon: "\uf07e", marker: "packX" },
    { id: "packY", title: "Расставить рядом по вертикали", icon: "\uf07d", marker: "packY" },
    { id: "distX", title: "Распределить по горизонтали", icon: "\uf337", marker: "distX" },
    { id: "distY", title: "Распределить по вертикали", icon: "\uf338", marker: "distY" }
  ];

  const selectedItems = () => {
    const rects = typeof getSelectedRects === "function" ? getSelectedRects() : [];
    return rects
      .filter(r => r && typeof rectAABB === "function")
      .map(r => {
        const bb = rectAABB(r);
        return bb ? {
          rect: r,
          minX: bb.minX,
          minY: bb.minY,
          maxX: bb.maxX,
          maxY: bb.maxY,
          width: Math.max(0, bb.maxX - bb.minX),
          height: Math.max(0, bb.maxY - bb.minY)
        } : null;
      })
      .filter(Boolean);
  };

  const itemsBounds = items => {
    if (!items || items.length < 2) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const it of items) {
      minX = Math.min(minX, it.minX);
      minY = Math.min(minY, it.minY);
      maxX = Math.max(maxX, it.maxX);
      maxY = Math.max(maxY, it.maxY);
    }
    if (!(Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY))) return null;
    return { minX, minY, maxX, maxY };
  };

  const getButtons = (z = 1) => {
    if (!st || st.mode !== "select" || st.drag || st.selBox || st.pan || st.draft) return [];
    const items = selectedItems();
    const b = itemsBounds(items);
    if (!b) return [];
    const zoom = Math.max(0.25, Number(z) || Number(st.zoom) || 1);
    const size = Math.max(22, 28 / zoom);
    const gap = Math.max(4, 5 / zoom);
    const y = b.minY - size - gap;
    return ACTIONS.map((action, i) => ({
      ...action,
      x: b.minX + i * (size + gap),
      y,
      size
    }));
  };

  const getSelectionBounds = () => itemsBounds(selectedItems());

  const formatMeters = value => {
    if (typeof mFmt === "function") return mFmt(value);
    const n = Math.round((Number(value) || 0) * 10000) / 10000;
    return Number.isInteger(n) ? String(n) : String(n);
  };

  const meterAreaUnit = () => {
    if (typeof document !== "undefined" && /^en\b/i.test(document.documentElement.getAttribute("lang") || "")) return "m²";
    return "м²";
  };

  const selectedAreaM2 = () => selectedItems().reduce((sum, it) => {
    const r = it && it.rect;
    if (!r || String(r.kind || "").toLowerCase() === "note") return sum;
    if (
      typeof drawCellX === "function"
      && typeof drawCellY === "function"
      && typeof getCellTopologyCached === "function"
      && typeof getHiddenSet === "function"
      && typeof buildVisibleCabinetSummary === "function"
    ) {
      const cx = drawCellX(r);
      const cy = drawCellY(r);
      const topo = getCellTopologyCached(r, cx, cy);
      const summary = buildVisibleCabinetSummary(r, cx, cy, topo, getHiddenSet(r));
      return sum + Math.max(0, Number(summary && summary.areaM2) || 0);
    }
    const scale = Math.max(1, Math.round(Number(r.scale) || 256));
    const wm = Number(r.widthM) > 0 ? Number(r.widthM) : Math.max(0, Number(r.width) || 0) / scale;
    const hm = Number(r.heightM) > 0 ? Number(r.heightM) : Math.max(0, Number(r.height) || 0) / scale;
    return sum + Math.max(0, wm * hm);
  }, 0);

  const bootstrapPrimary = () => {
    if (typeof document !== "undefined" && typeof getComputedStyle === "function") {
      const value = getComputedStyle(document.documentElement).getPropertyValue("--bs-primary").trim();
      if (value) return value;
    }
    return "#0d6efd";
  };

  const hitAction = (x, y, z = 1) => {
    for (const btn of getButtons(z)) {
      if (x >= btn.x && x <= btn.x + btn.size && y >= btn.y && y <= btn.y + btn.size) return btn.id;
    }
    return "";
  };

  const setHover = (x, y, z = 1) => {
    const prev = String(st.multiSelectionActionHover || "");
    const next = hitAction(x, y, z);
    st.multiSelectionActionHover = next;
    return prev !== next;
  };

  const clearHover = () => {
    const had = !!st.multiSelectionActionHover;
    st.multiSelectionActionHover = "";
    return had;
  };

  const moveItemTo = (item, axis, nextMin) => {
    const delta = nextMin - (axis === "x" ? item.minX : item.minY);
    if (axis === "x") item.rect.x = Math.round((Number(item.rect.x) || 0) + delta);
    else item.rect.y = Math.round((Number(item.rect.y) || 0) + delta);
  };

  const pack = axis => {
    const items = selectedItems().sort((a, b) => {
      const am = axis === "x" ? a.minX : a.minY;
      const bm = axis === "x" ? b.minX : b.minY;
      return am - bm || a.rect.id - b.rect.id;
    });
    if (items.length < 2) return false;
    let cursor = axis === "x" ? items[0].minX : items[0].minY;
    for (const it of items) {
      moveItemTo(it, axis, cursor);
      cursor += axis === "x" ? it.width : it.height;
    }
    return true;
  };

  const distribute = axis => {
    const items = selectedItems().sort((a, b) => a.minX - b.minX || a.minY - b.minY || a.rect.id - b.rect.id);
    if (items.length < 3) return false;
    if (axis === "y") {
      const first = items[0];
      const last = items[items.length - 1];
      const step = (last.minY - first.minY) / Math.max(1, items.length - 1);
      for (let i = 1; i < items.length - 1; i++) moveItemTo(items[i], "y", first.minY + step * i);
      return true;
    }
    const start = items[0].minX;
    const end = items[items.length - 1].maxX;
    const total = items.reduce((sum, it) => sum + (axis === "x" ? it.width : it.height), 0);
    const gap = (end - start - total) / Math.max(1, items.length - 1);
    let cursor = start;
    for (const it of items) {
      moveItemTo(it, axis, cursor);
      cursor += (axis === "x" ? it.width : it.height) + gap;
    }
    return true;
  };

  const applyAction = id => {
    let changed = false;
    if (id === "packX") changed = pack("x");
    else if (id === "packY") changed = pack("y");
    else if (id === "distX") changed = distribute("x");
    else if (id === "distY") changed = distribute("y");
    if (!changed) return false;
    if (typeof refreshMultiSelectionBase === "function") refreshMultiSelectionBase();
    if (typeof refreshPanels === "function") refreshPanels();
    if (typeof schedulePersist === "function") schedulePersist("project");
    if (typeof render === "function") render();
    return true;
  };

  const drawFontAwesomeIcon = (c, btn) => {
    const hover = st.multiSelectionActionHover === btn.id;
    c.save();
    c.font = `900 ${Math.max(12, btn.size * 0.52)}px "Font Awesome 6 Free", "FontAwesome"`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillStyle = hover ? "rgba(255,255,255,1)" : "rgba(255,255,255,.95)";
    c.fillText(btn.icon, btn.x + btn.size / 2, btn.y + btn.size / 2 + btn.size * 0.03);
    if (btn.marker === "distX" || btn.marker === "distY") {
      c.strokeStyle = hover ? "rgba(255,255,255,.95)" : "rgba(255,255,255,.72)";
      c.lineWidth = Math.max(1, btn.size * 0.055);
      c.beginPath();
      if (btn.marker === "distX") {
        c.moveTo(btn.x + btn.size * 0.2, btn.y + btn.size * 0.22);
        c.lineTo(btn.x + btn.size * 0.2, btn.y + btn.size * 0.78);
        c.moveTo(btn.x + btn.size * 0.8, btn.y + btn.size * 0.22);
        c.lineTo(btn.x + btn.size * 0.8, btn.y + btn.size * 0.78);
      } else {
        c.moveTo(btn.x + btn.size * 0.22, btn.y + btn.size * 0.2);
        c.lineTo(btn.x + btn.size * 0.78, btn.y + btn.size * 0.2);
        c.moveTo(btn.x + btn.size * 0.22, btn.y + btn.size * 0.8);
        c.lineTo(btn.x + btn.size * 0.78, btn.y + btn.size * 0.8);
      }
      c.stroke();
    }
    c.restore();
  };

  const drawActions = (c, z = 1) => {
    const buttons = getButtons(z);
    const bounds = getSelectionBounds();
    if (!buttons.length && !bounds) return;
    const roundedRect = (x, y, w, h, r) => {
      if (typeof c.roundRect === "function") {
        c.roundRect(x, y, w, h, r);
        return;
      }
      const rr = Math.max(0, Math.min(r, w / 2, h / 2));
      c.moveTo(x + rr, y);
      c.lineTo(x + w - rr, y);
      c.quadraticCurveTo(x + w, y, x + w, y + rr);
      c.lineTo(x + w, y + h - rr);
      c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      c.lineTo(x + rr, y + h);
      c.quadraticCurveTo(x, y + h, x, y + h - rr);
      c.lineTo(x, y + rr);
      c.quadraticCurveTo(x, y, x + rr, y);
    };
    c.save();
    if (bounds) {
      const zoom = Math.max(0.25, Number(z) || Number(st.zoom) || 1);
      c.strokeStyle = "rgba(255,224,138,.95)";
      c.lineWidth = Math.max(1.2, 1.6 / zoom);
      c.setLineDash([7 / zoom, 5 / zoom]);
      c.strokeRect(bounds.minX, bounds.minY, bounds.maxX - bounds.minX, bounds.maxY - bounds.minY);
      c.setLineDash([]);
    }
    for (const btn of buttons) {
      const hover = st.multiSelectionActionHover === btn.id;
      const primary = bootstrapPrimary();
      c.fillStyle = hover ? primary : "rgba(18,24,32,.88)";
      c.strokeStyle = hover ? primary : "rgba(255,255,255,.45)";
      c.lineWidth = Math.max(1, 1.2 / Math.max(0.5, Number(z) || 1));
      c.beginPath();
      roundedRect(btn.x, btn.y, btn.size, btn.size, Math.max(3, 5 / Math.max(0.5, Number(z) || 1)));
      c.fill();
      c.stroke();
      drawFontAwesomeIcon(c, btn);
    }
    if (buttons.length) {
      const zoom = Math.max(0.25, Number(z) || Number(st.zoom) || 1);
      const last = buttons[buttons.length - 1];
      const label = `${formatMeters(selectedAreaM2())} ${meterAreaUnit()}`;
      const fontSize = 12 / zoom;
      const padX = 7 / zoom;
      const gap = 7 / zoom;
      const x = last.x + last.size + gap;
      const y = last.y + (last.size - 22 / zoom) / 2;
      c.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
      c.textAlign = "left";
      c.textBaseline = "middle";
      const tw = c.measureText(label).width;
      const h = 22 / zoom;
      c.fillStyle = "rgba(18,24,32,.88)";
      c.strokeStyle = "rgba(255,255,255,.35)";
      c.lineWidth = Math.max(1, 1.1 / zoom);
      c.beginPath();
      roundedRect(x, y, tw + padX * 2, h, Math.max(3, 5 / zoom));
      c.fill();
      c.stroke();
      c.fillStyle = "rgba(255,255,255,.95)";
      c.fillText(label, x + padX, y + h / 2);
    }
    c.restore();
  };

  return {
    drawActions,
    hitAction,
    setHover,
    clearHover,
    applyAction
  };
};
