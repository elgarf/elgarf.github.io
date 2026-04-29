import { drawCanvasTooltip } from "./canvas-tooltip.js";

export const setupViewportOverlays = (deps = {}) => {
  const {
    st,
    isMaskMode,
    isCellEditMode,
    cur,
    getMaskNodeAxes,
    rectUVToWorld,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    buildVisibleCabinetSummary,
    getHiddenSet,
    fontFamilyCss,
    rectAABBMasked,
    listSignature,
    t = value => value
  } = deps;

  const LAYER_BUTTONS = [
    { id: "text", icon: "\uf031", title: "Текст" },
    { id: "flow", icon: "\uf542", title: "Потоки" },
    { id: "rig", icon: "\uf0ad", title: "Риг" }
  ];

  const cellBoundaryCache = { key: "", value: [] };
  const cellSummaryCache = { key: "", value: null };
  const cellOverlayPathCache = { key: "", gridPath: null, borderPath: null };
  const maskNodesPathCache = { key: "", dot: 0, path: null };
  const contentBoundsCache = { key: "", value: null };
  const keyOf = (...parts) => parts.join("|");
  const toIntMin = (v, min = 0) => Math.max(min, Math.round(Number(v) || 0));
  const toPosInt = v => toIntMin(v, 1);
  const darkThemeOn = () => (document.documentElement.getAttribute("data-bs-theme") || "light") === "dark";
  const appendGridLines = (path, count, step, extent, cx, cy, vertical = true) => {
    for (let i = 0; i <= count; i += step) {
      if (vertical) {
        const x = Math.min(extent.w, i * cx);
        const lx = -extent.w / 2 + x;
        path.moveTo(lx, -extent.h / 2);
        path.lineTo(lx, extent.h / 2);
      } else {
        const y = Math.min(extent.h, i * cy);
        const ly = -extent.h / 2 + y;
        path.moveTo(-extent.w / 2, ly);
        path.lineTo(extent.w / 2, ly);
      }
    }
    if (count % step !== 0) {
      if (vertical) {
        const lx = -extent.w / 2 + extent.w;
        path.moveTo(lx, -extent.h / 2);
        path.lineTo(lx, extent.h / 2);
      } else {
        const ly = -extent.h / 2 + extent.h;
        path.moveTo(-extent.w / 2, ly);
        path.lineTo(extent.w / 2, ly);
      }
    }
  };

  const getComponentBoundarySegmentsLocalCached = (r, cx, cy, topo) => {
    const key = keyOf(
      toIntMin(r && r.id, 0),
      toPosInt(r && r.width),
      toPosInt(r && r.height),
      toPosInt(cx),
      toPosInt(cy),
      toPosInt(topo && topo.cols),
      toPosInt(topo && topo.rows),
      listSignature(r && r.cellLinks)
    );
    if (cellBoundaryCache.key === key && Array.isArray(cellBoundaryCache.value)) return cellBoundaryCache.value;
    const segs = [];
    const w = toPosInt(r && r.width);
    const h = toPosInt(r && r.height);
    const cols = toPosInt(topo && topo.cols);
    const rows = toPosInt(topo && topo.rows);
    const comp = Array.isArray(topo && topo.comp) ? topo.comp : [];
    const compAt = (x, y) => comp[y * cols + x];
    for (let ky = 0; ky <= rows; ky++) {
      let run = -1;
      const isBoundary = x => {
        if (ky === 0 || ky === rows) return true;
        return compAt(x, ky - 1) !== compAt(x, ky);
      };
      for (let x = 0; x <= cols; x++) {
        const on = x < cols && isBoundary(x);
        if (on && run < 0) run = x;
        if ((!on || x === cols) && run >= 0) {
          const u1 = run * cx, u2 = Math.min(w, x * cx), v = Math.min(h, ky * cy);
          segs.push({ x1: -w / 2 + u1, y1: -h / 2 + v, x2: -w / 2 + u2, y2: -h / 2 + v });
          run = -1;
        }
      }
    }
    for (let kx = 0; kx <= cols; kx++) {
      let run = -1;
      const isBoundary = y => {
        if (kx === 0 || kx === cols) return true;
        return compAt(kx - 1, y) !== compAt(kx, y);
      };
      for (let y = 0; y <= rows; y++) {
        const on = y < rows && isBoundary(y);
        if (on && run < 0) run = y;
        if ((!on || y === rows) && run >= 0) {
          const v1 = run * cy, v2 = Math.min(h, y * cy), u = Math.min(w, kx * cx);
          segs.push({ x1: -w / 2 + u, y1: -h / 2 + v1, x2: -w / 2 + u, y2: -h / 2 + v2 });
          run = -1;
        }
      }
    }
    cellBoundaryCache.key = key;
    cellBoundaryCache.value = segs;
    return segs;
  };

  const getContentBounds = () => {
    if (!st.rects.length) return null;
    const key = (Array.isArray(st.rects) ? st.rects : []).map(r => [
      toIntMin(r && r.id, 0),
      r && r.x || 0,
      r && r.y || 0,
      r && r.width || 0,
      r && r.height || 0,
      Number(r && r.rotation) || 0,
      toPosInt(drawCellX(r)),
      toPosInt(drawCellY(r)),
      listSignature(r && r.hiddenCells)
    ].join(":")).join("|");
    if (contentBoundsCache.key === key && contentBoundsCache.value) return contentBoundsCache.value;
    let minX = 1e9;
    let minY = 1e9;
    let maxX = -1e9;
    let maxY = -1e9;
    for (const r of st.rects) {
      const bb = rectAABBMasked(r);
      minX = Math.min(minX, bb.minX);
      minY = Math.min(minY, bb.minY);
      maxX = Math.max(maxX, bb.maxX);
      maxY = Math.max(maxY, bb.maxY);
    }
    const value = { minX, minY, maxX, maxY, w: Math.ceil(maxX - minX), h: Math.ceil(maxY - minY) };
    contentBoundsCache.key = key;
    contentBoundsCache.value = value;
    return value;
  };

  const drawMaskOverlay = (c, z) => {
    if (!isMaskMode()) return;
    const r = cur();
    if (!r) return;
    const darkTheme = darkThemeOn();
    const nodeCol = darkTheme ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.34)";
    const hoverCol = darkTheme ? "rgba(255,255,255,.9)" : "rgba(0,0,0,.85)";
    const axes = getMaskNodeAxes(r);
    const dot = Math.max(1.8, 2.6 / z);
    const zq = Math.max(1, Math.round((Number(z) || 1) * 100) / 100);
    const nodeKey = keyOf(
      toIntMin(r && r.id, 0),
      toIntMin(r && r.x, 0),
      toIntMin(r && r.y, 0),
      toPosInt(r && r.width),
      toPosInt(r && r.height),
      toIntMin(r && r.rotation, 0),
      toPosInt(drawCellX(r)),
      toPosInt(drawCellY(r)),
      zq
    );
    if (typeof Path2D !== "undefined") {
      if (maskNodesPathCache.key !== nodeKey || !maskNodesPathCache.path || Math.abs((maskNodesPathCache.dot || 0) - dot) > 1e-6) {
        const p = new Path2D();
        for (const gy of axes.ys) {
          for (const gx of axes.xs) {
            const wp = rectUVToWorld(r, gx, gy);
            p.moveTo(wp.x + dot, wp.y);
            p.arc(wp.x, wp.y, dot, 0, Math.PI * 2);
          }
        }
        maskNodesPathCache.key = nodeKey;
        maskNodesPathCache.dot = dot;
        maskNodesPathCache.path = p;
      }
      c.fillStyle = nodeCol;
      c.fill(maskNodesPathCache.path);
    } else {
      for (const gy of axes.ys) {
        for (const gx of axes.xs) {
          const p = rectUVToWorld(r, gx, gy);
          c.fillStyle = nodeCol;
          c.beginPath();
          c.arc(p.x, p.y, dot, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    if (st.maskPath.length) {
      const col = "rgba(120,205,255,.95)";
      c.strokeStyle = col;
      c.lineWidth = Math.max(1.2, 1.8 / z);
      c.fillStyle = "rgba(120,205,255,.18)";
      c.beginPath();
      c.moveTo(st.maskPath[0].x, st.maskPath[0].y);
      for (let i = 1; i < st.maskPath.length; i++) c.lineTo(st.maskPath[i].x, st.maskPath[i].y);
      if (st.maskHover) c.lineTo(st.maskHover.x, st.maskHover.y);
      c.stroke();
      if (st.maskPath.length >= 3) {
        c.closePath();
        c.fill();
      }
      for (const p of st.maskPath) {
        c.fillStyle = col;
        c.beginPath();
        c.arc(p.x, p.y, Math.max(2.8, 3.4 / z), 0, Math.PI * 2);
        c.fill();
      }
    }
    if (st.maskHover) {
      c.fillStyle = hoverCol;
      c.beginPath();
      c.arc(st.maskHover.x, st.maskHover.y, Math.max(2.4, 3 / z), 0, Math.PI * 2);
      c.fill();
    }
  };

  const drawCellEditOverlay = (c, z) => {
    if (!isCellEditMode()) return;
    const r = cur();
    if (!r) return;
    const darkTheme = darkThemeOn();
    const gridCol = darkTheme ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.28)";
    const boundCol = darkTheme ? "rgba(255,255,255,.9)" : "rgba(0,0,0,.78)";
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const topo = getCellTopologyCached(r, cx, cy);
    const w = Math.max(1, Number(r.width) || 1);
    const h = Math.max(1, Number(r.height) || 1);
    const cols = Math.max(1, Math.round(Number(topo && topo.cols) || Math.ceil(w / cx)));
    const rows = Math.max(1, Math.round(Number(topo && topo.rows) || Math.ceil(h / cy)));
    const centerX = (Number(r.x) || 0) + w / 2;
    const centerY = (Number(r.y) || 0) + h / 2;
    const ang = (Number(r.rotation) || 0) * Math.PI / 180;
    c.save();
    c.translate(centerX, centerY);
    c.rotate(ang);
    const hasLinks = Array.isArray(r && r.cellLinks) && r.cellLinks.length > 0;
    const zQuant = Math.max(1, Math.round((Number(z) || 1) * 100) / 100);
    const pathKey = keyOf(
      toIntMin(r && r.id, 0),
      toPosInt(w),
      toPosInt(h),
      toPosInt(cx),
      toPosInt(cy),
      toPosInt(cols),
      toPosInt(rows),
      zQuant,
      listSignature(r && r.cellLinks)
    );
    if (cellOverlayPathCache.key !== pathKey || !cellOverlayPathCache.gridPath || !cellOverlayPathCache.borderPath) {
      const pxStepMin = 6;
      const lineStepX = Math.max(1, Math.ceil(pxStepMin / Math.max(1e-6, cx * Math.max(0.01, z))));
      const lineStepY = Math.max(1, Math.ceil(pxStepMin / Math.max(1e-6, cy * Math.max(0.01, z))));
      const maxLines = 1400;
      const capStep = Math.max(
        1,
        Math.ceil((Math.max(0, Math.ceil(cols / lineStepX)) + Math.max(0, Math.ceil(rows / lineStepY))) / maxLines)
      );
      const xStep = lineStepX * capStep;
      const yStep = lineStepY * capStep;
      const gridPath = new Path2D();
      const extent = { w, h };
      appendGridLines(gridPath, cols, xStep, extent, cx, cy, true);
      appendGridLines(gridPath, rows, yStep, extent, cx, cy, false);
      const borderPath = new Path2D();
      if (hasLinks) {
        const bounds = getComponentBoundarySegmentsLocalCached(r, cx, cy, topo);
        for (const s of bounds) {
          borderPath.moveTo(s.x1, s.y1);
          borderPath.lineTo(s.x2, s.y2);
        }
      } else {
        borderPath.rect(-w / 2, -h / 2, w, h);
      }
      cellOverlayPathCache.key = pathKey;
      cellOverlayPathCache.gridPath = gridPath;
      cellOverlayPathCache.borderPath = borderPath;
    }
    const zoomSafe = Math.max(0.01, Number(z) || 1);
    c.strokeStyle = gridCol;
    c.lineWidth = 1.1 / zoomSafe;
    c.stroke(cellOverlayPathCache.gridPath);
    if (hasLinks) {
      c.strokeStyle = boundCol;
      c.lineWidth = 2.2 / zoomSafe;
      c.stroke(cellOverlayPathCache.borderPath);
    } else {
      // Fast path for large unlinked grids: draw only outer border, skip component-boundary pass.
      c.strokeStyle = boundCol;
      c.lineWidth = 2 / zoomSafe;
      c.stroke(cellOverlayPathCache.borderPath);
    }
    c.restore();
    if (st.cellHover && st.cellHover.p1 && st.cellHover.p2) {
      c.strokeStyle = st.cellHover.canToggle
        ? (st.cellHover.exists ? "rgba(255,205,92,.95)" : "rgba(94,220,143,.95)")
        : "rgba(255,106,106,.95)";
      c.lineWidth = Math.max(2.4, 3.4 / z);
      c.beginPath();
      c.moveTo(st.cellHover.p1.x, st.cellHover.p1.y);
      c.lineTo(st.cellHover.p2.x, st.cellHover.p2.y);
      c.stroke();
    }
    const hp = st.cellHoverPos;
    if (hp && Number.isFinite(Number(hp.x)) && Number.isFinite(Number(hp.y))) {
      const summaryKey = keyOf(
        toIntMin(r && r.id, 0),
        toPosInt(r && r.width),
        toPosInt(r && r.height),
        toPosInt(cx),
        toPosInt(cy),
        toPosInt(topo && topo.cols),
        toPosInt(topo && topo.rows),
        toPosInt(r && r.scale),
        listSignature(r && r.hiddenCells),
        listSignature(r && r.cellLinks)
      );
      if (cellSummaryCache.key !== summaryKey || !cellSummaryCache.value) {
        cellSummaryCache.key = summaryKey;
        cellSummaryCache.value = buildVisibleCabinetSummary(r, cx, cy, topo, getHiddenSet(r));
      }
      const summary = cellSummaryCache.value;
      const lines = [`${t("Кабинетов")}: ${Math.max(0, Math.round(Number(summary && summary.totalCount) || 0))}`];
      for (const row of (summary && summary.groups ? summary.groups : [])) lines.push(String(row || ""));
      const fs = Math.max(8, 11 / Math.max(0.45, z || 1));
      const lh = fs + Math.max(2, 3 / Math.max(0.45, z || 1));
      c.font = `${fs}px ${fontFamilyCss(st.fontFamily)}`;
      c.textAlign = "left";
      c.textBaseline = "top";
      let tw = 0;
      for (const line of lines) tw = Math.max(tw, c.measureText(line).width);
      const pad = Math.max(4, 6 / Math.max(0.45, z || 1));
      const bw = tw + pad * 2;
      const bh = lines.length * lh + pad * 2;
      const off = Math.max(8, 12 / Math.max(0.45, z || 1));
      let bx = (+hp.x || 0) + off;
      let by = (+hp.y || 0) + off;
      const minX = r.x - 10 / Math.max(0.45, z || 1);
      const minY = r.y - 10 / Math.max(0.45, z || 1);
      const maxX = r.x + r.width - bw + 10 / Math.max(0.45, z || 1);
      const maxY = r.y + r.height - bh + 10 / Math.max(0.45, z || 1);
      if (bx > maxX) bx = (+hp.x || 0) - bw - off;
      if (by > maxY) by = (+hp.y || 0) - bh - off;
      bx = Math.max(minX, Math.min(maxX, bx));
      by = Math.max(minY, Math.min(maxY, by));
      c.fillStyle = darkTheme ? "rgba(14,18,24,.92)" : "rgba(255,255,255,.94)";
      c.strokeStyle = darkTheme ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.32)";
      c.lineWidth = Math.max(1, 1.2 / Math.max(0.45, z || 1));
      c.fillRect(bx, by, bw, bh);
      c.strokeRect(bx, by, bw, bh);
      c.fillStyle = darkTheme ? "rgba(255,255,255,.96)" : "rgba(17,24,39,.96)";
      for (let i = 0; i < lines.length; i++) c.fillText(lines[i], bx + pad, by + pad + i * lh);
    }
  };

  const drawContentBounds = (c, z) => {
    const b = getContentBounds();
    if (!b) return;
    const { minX, minY, w, h } = b;
    const darkTheme = darkThemeOn();
    const stroke = darkTheme ? "rgba(255,255,255,.5)" : "rgba(0,0,0,.55)";
    const labelBg = darkTheme ? "rgba(15,19,24,.85)" : "rgba(255,255,255,.88)";
    const labelFg = darkTheme ? "rgba(255,255,255,.92)" : "rgba(17,24,39,.95)";
    c.save();
    c.strokeStyle = stroke;
    c.lineWidth = 1.5 / z;
    c.setLineDash([]);
    c.strokeRect(minX, minY, w, h);
    if (st.fontReady) {
      const label = `${w} x ${h} px`;
      c.font = `${Math.max(10, 12 / z)}px ${fontFamilyCss(st.fontFamily)}`;
      const tw = c.measureText(label).width + 10;
      const th = Math.max(16, 16 / z);
      const y0 = minY + h + 4 / z;
      c.fillStyle = labelBg;
      c.fillRect(minX, y0, tw, th);
      c.fillStyle = labelFg;
      c.textAlign = "left";
      c.textBaseline = "middle";
      c.fillText(label, minX + 5, y0 + th / 2);
    }
    c.restore();
  };

  const layerButtonRects = (z = 1) => {
    if (String(st.viewMode || "") !== "install") return [];
    const b = getContentBounds();
    if (!b) return [];
    const zoom = Math.max(0.25, Number(z) || Number(st.zoom) || 1);
    const size = Math.max(24, 30 / zoom);
    const gap = Math.max(6, 7 / zoom);
    const x = b.minX - size - gap;
    const y0 = b.minY;
    return LAYER_BUTTONS.map((btn, i) => ({ ...btn, x, y: y0 + i * (size + gap), size }));
  };

  const drawLayerButtons = (c, z) => {
    const buttons = layerButtonRects(z);
    if (!buttons.length) return;
    const layers = st.installLayers || {};
    const force = {
      text: false,
      flow: st.mode === "flowEdit",
      rig: st.mode === "rigEdit"
    };
    const roundRect = (x, y, w, h, r) => {
      if (typeof c.roundRect === "function") { c.roundRect(x, y, w, h, r); return; }
      const rr = Math.max(0, Math.min(r, w / 2, h / 2));
      c.moveTo(x + rr, y); c.lineTo(x + w - rr, y); c.quadraticCurveTo(x + w, y, x + w, y + rr);
      c.lineTo(x + w, y + h - rr); c.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
      c.lineTo(x + rr, y + h); c.quadraticCurveTo(x, y + h, x, y + h - rr);
      c.lineTo(x, y + rr); c.quadraticCurveTo(x, y, x + rr, y);
    };
    c.save();
    for (const btn of buttons) {
      const on = force[btn.id] || layers[btn.id] !== false;
      const hover = st.installLayerButtonHover === btn.id;
      c.fillStyle = on ? (hover ? "rgba(13,110,253,.96)" : "rgba(13,110,253,.82)") : (hover ? "rgba(96,104,116,.9)" : "rgba(18,24,32,.72)");
      c.strokeStyle = on ? "rgba(255,255,255,.72)" : "rgba(255,255,255,.34)";
      c.lineWidth = Math.max(1, 1.2 / Math.max(0.5, Number(z) || 1));
      c.beginPath();
      roundRect(btn.x, btn.y, btn.size, btn.size, Math.max(3, 5 / Math.max(0.5, Number(z) || 1)));
      c.fill();
      c.stroke();
      c.font = `900 ${Math.max(12, btn.size * 0.5)}px "Font Awesome 6 Free", "FontAwesome"`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillStyle = on ? "rgba(255,255,255,.98)" : "rgba(255,255,255,.62)";
      c.fillText(btn.icon, btn.x + btn.size / 2, btn.y + btn.size / 2 + btn.size * 0.02);
    }
    const hoveredButton = buttons.find(btn => st.installLayerButtonHover === btn.id);
    if (hoveredButton) {
      drawCanvasTooltip(c, t(hoveredButton.title), hoveredButton.x + hoveredButton.size, hoveredButton.y + hoveredButton.size / 2, z);
    }
    c.restore();
  };

  const hitLayerButton = (x, y, z = 1) => {
    for (const btn of layerButtonRects(z)) {
      if (x >= btn.x && x <= btn.x + btn.size && y >= btn.y && y <= btn.y + btn.size) return btn.id;
    }
    return "";
  };

  const setLayerButtonHover = (x, y, z = 1) => {
    const prev = String(st.installLayerButtonHover || "");
    const next = hitLayerButton(x, y, z);
    st.installLayerButtonHover = next;
    return prev !== next;
  };

  const clearLayerButtonHover = () => {
    const had = !!st.installLayerButtonHover;
    st.installLayerButtonHover = "";
    return had;
  };

  return {
    drawMaskOverlay,
    drawCellEditOverlay,
    drawContentBounds,
    drawLayerButtons,
    hitLayerButton,
    setLayerButtonHover,
    clearLayerButtonHover
  };
};
