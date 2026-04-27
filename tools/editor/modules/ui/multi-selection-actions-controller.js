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

  const axisClusters = (items, axis) => {
    const entries = (Array.isArray(items) ? items : []).map(it => ({
      min: axis === "x" ? it.minX : it.minY,
      max: axis === "x" ? it.maxX : it.maxY
    })).sort((a, b) => (a.min - b.min) || (a.max - b.max));
    const clusters = [];
    const EPS = 1e-6;
    for (const e of entries) {
      const last = clusters[clusters.length - 1];
      if (!last || e.min >= last.max - EPS) clusters.push({ min: e.min, max: e.max });
      else last.max = Math.max(last.max, e.max);
    }
    return clusters;
  };

  const getResizeHandles = (z = 1) => {
    if (!st || st.mode !== "select" || st.drag || st.selBox || st.pan || st.draft) return [];
    const items = selectedItems();
    const b = itemsBounds(items);
    if (!b) return [];
    const zoom = Math.max(0.25, Number(z) || Number(st.zoom) || 1);
    const size = Math.max(9, 12 / zoom);
    const half = size / 2;
    const midX = (b.minX + b.maxX) / 2;
    const midY = (b.minY + b.maxY) / 2;
    const out = [];
    if (axisClusters(items, "x").length > 1) {
      out.push({ id: "w", cursor: "ew-resize", x: b.minX - half, y: midY - half, size });
      out.push({ id: "e", cursor: "ew-resize", x: b.maxX - half, y: midY - half, size });
    }
    if (axisClusters(items, "y").length > 1) {
      out.push({ id: "n", cursor: "ns-resize", x: midX - half, y: b.minY - half, size });
      out.push({ id: "s", cursor: "ns-resize", x: midX - half, y: b.maxY - half, size });
    }
    return out;
  };

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

  const hitResizeHandle = (x, y, z = 1) => {
    for (const h of getResizeHandles(z)) {
      if (x >= h.x && x <= h.x + h.size && y >= h.y && y <= h.y + h.size) return h.id;
    }
    return "";
  };

  const setHover = (x, y, z = 1) => {
    const prev = String(st.multiSelectionActionHover || "");
    const prevResize = String(st.multiSelectionResizeHover || "");
    const resize = hitResizeHandle(x, y, z);
    const next = resize ? "" : hitAction(x, y, z);
    st.multiSelectionResizeHover = resize;
    st.multiSelectionActionHover = next;
    return prev !== next || prevResize !== resize;
  };

  const clearHover = () => {
    const had = !!st.multiSelectionActionHover || !!st.multiSelectionResizeHover;
    st.multiSelectionActionHover = "";
    st.multiSelectionResizeHover = "";
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

  const axisCompactSpan = (items, axis) => Math.max(1, axisClusters(items, axis).reduce((sum, c) => sum + Math.max(0, c.max - c.min), 0));

  const mapAxis = (items, axis, targetMin, targetSpan) => {
    const entries = items.map(it => {
      const min = axis === "x" ? it.minX : it.minY;
      const max = axis === "x" ? it.maxX : it.maxY;
      const pos = axis === "x" ? it.x : it.y;
      return { id: it.id, min, max, pos };
    }).sort((a, b) => (a.min - b.min) || (a.max - b.max) || (a.id - b.id));
    const clusters = [];
    const EPS = 1e-6;
    for (const e of entries) {
      const last = clusters[clusters.length - 1];
      if (!last || e.min >= last.max - EPS) clusters.push({ min: e.min, max: e.max, members: [e] });
      else { last.max = Math.max(last.max, e.max); last.members.push(e); }
    }
    let fixedSpan = 0;
    let sumGaps = 0;
    for (let i = 0; i < clusters.length; i++) {
      fixedSpan += Math.max(0, clusters[i].max - clusters[i].min);
      if (i + 1 < clusters.length) sumGaps += Math.max(0, clusters[i + 1].min - clusters[i].max);
    }
    const targetGap = Math.max(0, targetSpan - fixedSpan);
    const gapScale = sumGaps > EPS ? targetGap / sumGaps : 0;
    const equalGap = sumGaps > EPS || clusters.length < 2 ? null : targetGap / Math.max(1, clusters.length - 1);
    const next = new Map();
    let cursor = targetMin;
    for (let i = 0; i < clusters.length; i++) {
      const c = clusters[i];
      const shift = cursor - c.min;
      for (const m of c.members) next.set(m.id, Math.round(m.pos + shift));
      const width = Math.max(0, c.max - c.min);
      const baseGap = (i + 1 < clusters.length) ? Math.max(0, clusters[i + 1].min - c.max) : 0;
      cursor += width + (equalGap == null ? baseGap * gapScale : equalGap);
    }
    return next;
  };

  const getSnapCfg = () => st && st.snap ? st.snap : { grid: false, objects: true, centers: true, gaps: true };

  const snapResizeEdge = (axis, value, drag, opts = {}) => {
    const cfg = getSnapCfg();
    if (opts.disableSnap || !(cfg.grid || cfg.objects || cfg.centers)) return { value, guide: null };
    const threshold = 8 / Math.max(0.25, Number(st && st.zoom) || 1);
    const selectedIds = new Set((drag.items || []).map(it => it.id));
    const candidates = [];
    if (cfg.grid) {
      const step = 10;
      candidates.push(Math.round(value / step) * step);
    }
    if (cfg.objects || cfg.centers) {
      const rects = Array.isArray(st && st.rects) ? st.rects : [];
      for (const r of rects) {
        if (!r || selectedIds.has(r.id) || typeof rectAABB !== "function") continue;
        const bb = rectAABB(r);
        if (!bb) continue;
        if (axis === "x") {
          if (cfg.objects) candidates.push(bb.minX, bb.maxX);
          if (cfg.centers) candidates.push((bb.minX + bb.maxX) / 2);
        } else {
          if (cfg.objects) candidates.push(bb.minY, bb.maxY);
          if (cfg.centers) candidates.push((bb.minY + bb.maxY) / 2);
        }
      }
    }
    let best = null;
    for (const c of candidates) {
      if (!Number.isFinite(Number(c))) continue;
      const d = Number(c) - value;
      if (Math.abs(d) > threshold) continue;
      if (!best || Math.abs(d) < Math.abs(best.d)) best = { d, guide: Number(c) };
    }
    return best ? { value: value + best.d, guide: best.guide } : { value, guide: null };
  };

  const resolveResizeAxis = (axis, edge, pointerValue, drag, minSpan, opts = {}) => {
    const b = drag.bbox;
    const fromCenter = !!opts.fromCenter;
    const minEdge = axis === "x" ? b.minX : b.minY;
    const maxEdge = axis === "x" ? b.maxX : b.maxY;
    if (fromCenter) {
      const center = (minEdge + maxEdge) / 2;
      const rawHalf = Math.max(minSpan / 2, Math.abs((Number(pointerValue) || 0) - center));
      const snapEdge = edge === "min" ? center - rawHalf : center + rawHalf;
      const snapped = snapResizeEdge(axis, snapEdge, drag, opts);
      const half = Math.max(minSpan / 2, Math.abs(snapped.value - center));
      return { min: center - half, span: half * 2, guide: half > minSpan / 2 + 1e-6 ? snapped.guide : null };
    }
    const snapped = snapResizeEdge(axis, Number(pointerValue) || 0, drag, opts);
    if (edge === "min") {
      const min = Math.min(maxEdge - minSpan, snapped.value);
      return { min, span: maxEdge - min, guide: maxEdge - snapped.value >= minSpan ? snapped.guide : null };
    }
    const span = Math.max(minSpan, snapped.value - minEdge);
    return { min: minEdge, span, guide: snapped.value - minEdge >= minSpan ? snapped.guide : null };
  };

  const projectedBounds = (items, nextX, nextY) => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const it of items) {
      const nx = nextX.has(it.id) ? nextX.get(it.id) : it.x;
      const ny = nextY.has(it.id) ? nextY.get(it.id) : it.y;
      const dx = nx - it.x;
      const dy = ny - it.y;
      minX = Math.min(minX, it.minX + dx);
      minY = Math.min(minY, it.minY + dy);
      maxX = Math.max(maxX, it.maxX + dx);
      maxY = Math.max(maxY, it.maxY + dy);
    }
    if (!(Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY))) return null;
    return { minX, minY, maxX, maxY };
  };

  const actualGuide = (axis, edge, guide, bounds, drag, opts = {}) => {
    if (!Number.isFinite(Number(guide)) || !bounds || !drag || !drag.bbox) return null;
    const fromCenter = !!opts.fromCenter;
    const EPS = 0.75;
    if (axis === "x") {
      const currentMin = drag.bbox.minX;
      const currentMax = drag.bbox.maxX;
      if (fromCenter) {
        const moved = Math.abs(bounds.minX - currentMin) > EPS || Math.abs(bounds.maxX - currentMax) > EPS;
        const actual = edge === "min" ? bounds.minX : bounds.maxX;
        return moved && Math.abs(actual - guide) <= EPS ? guide : null;
      }
      const actual = edge === "min" ? bounds.minX : bounds.maxX;
      const current = edge === "min" ? currentMin : currentMax;
      return Math.abs(actual - current) > EPS && Math.abs(actual - guide) <= EPS ? guide : null;
    }
    const currentMin = drag.bbox.minY;
    const currentMax = drag.bbox.maxY;
    if (fromCenter) {
      const moved = Math.abs(bounds.minY - currentMin) > EPS || Math.abs(bounds.maxY - currentMax) > EPS;
      const actual = edge === "min" ? bounds.minY : bounds.maxY;
      return moved && Math.abs(actual - guide) <= EPS ? guide : null;
    }
    const actual = edge === "min" ? bounds.minY : bounds.maxY;
    const current = edge === "min" ? currentMin : currentMax;
    return Math.abs(actual - current) > EPS && Math.abs(actual - guide) <= EPS ? guide : null;
  };

  const beginResize = (handle, p) => {
    const items = selectedItems().map(it => ({
      id: it.rect.id,
      rect: it.rect,
      x: Number(it.rect.x) || 0,
      y: Number(it.rect.y) || 0,
      minX: it.minX,
      minY: it.minY,
      maxX: it.maxX,
      maxY: it.maxY
    }));
    const bbox = itemsBounds(items);
    if (!bbox || !items.length || !handle) return false;
    st.multiSelectionResize = {
      handle,
      sx: Number(p && p.x) || 0,
      sy: Number(p && p.y) || 0,
      bbox,
      items,
      changed: false
    };
    st.multiSelectionActionHover = "";
    st.multiSelectionResizeHover = handle;
    return true;
  };

  const updateResize = (p, opts = {}) => {
    const drag = st && st.multiSelectionResize;
    if (!drag || !drag.bbox || !Array.isArray(drag.items)) return false;
    const b = drag.bbox;
    let nextW = Math.max(1, b.maxX - b.minX);
    let nextH = Math.max(1, b.maxY - b.minY);
    let nextMinX = b.minX;
    let nextMinY = b.minY;
    let gx = null;
    let gy = null;
    let xEdge = "max";
    let yEdge = "max";
    if (drag.handle === "w" || drag.handle === "e") {
      xEdge = drag.handle === "w" ? "min" : "max";
      const x = resolveResizeAxis("x", xEdge, p && p.x, drag, axisCompactSpan(drag.items, "x"), opts);
      nextMinX = x.min;
      nextW = x.span;
      gx = x.guide;
    }
    if (drag.handle === "n" || drag.handle === "s") {
      yEdge = drag.handle === "n" ? "min" : "max";
      const y = resolveResizeAxis("y", yEdge, p && p.y, drag, axisCompactSpan(drag.items, "y"), opts);
      nextMinY = y.min;
      nextH = y.span;
      gy = y.guide;
    }
    const nextX = mapAxis(drag.items, "x", nextMinX, nextW);
    const nextY = mapAxis(drag.items, "y", nextMinY, nextH);
    const projected = projectedBounds(drag.items, nextX, nextY);
    let changed = false;
    for (const it of drag.items) {
      const r = it.rect;
      if (!r) continue;
      const nx = nextX.has(it.id) ? nextX.get(it.id) : it.x;
      const ny = nextY.has(it.id) ? nextY.get(it.id) : it.y;
      if (r.x !== nx) { r.x = nx; changed = true; }
      if (r.y !== ny) { r.y = ny; changed = true; }
    }
    st.g.x = actualGuide("x", xEdge, gx, projected, drag, opts);
    st.g.y = actualGuide("y", yEdge, gy, projected, drag, opts);
    st.dg = null;
    drag.changed = drag.changed || changed;
    return true;
  };

  const endResize = () => {
    const changed = !!(st && st.multiSelectionResize && st.multiSelectionResize.changed);
    st.multiSelectionResize = null;
    st.multiSelectionResizeHover = "";
    st.g.x = null;
    st.g.y = null;
    st.dg = null;
    if (!changed) return false;
    if (typeof refreshMultiSelectionBase === "function") refreshMultiSelectionBase();
    if (typeof refreshPanels === "function") refreshPanels();
    if (typeof schedulePersist === "function") schedulePersist("project");
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
      for (const h of getResizeHandles(z)) {
        const hover = st.multiSelectionResizeHover === h.id || (st.multiSelectionResize && st.multiSelectionResize.handle === h.id);
        const primary = bootstrapPrimary();
        c.fillStyle = hover ? primary : "rgba(18,24,32,.92)";
        c.strokeStyle = "rgba(255,255,255,.85)";
        c.lineWidth = Math.max(1, 1.2 / zoom);
        c.beginPath();
        roundedRect(h.x, h.y, h.size, h.size, Math.max(2, 3 / zoom));
        c.fill();
        c.stroke();
      }
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
    hitResizeHandle,
    setHover,
    clearHover,
    applyAction,
    beginResize,
    updateResize,
    endResize
  };
};
