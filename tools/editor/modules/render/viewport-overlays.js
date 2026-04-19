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
    getComponentBoundarySegments,
    buildVisibleCabinetSummary,
    getHiddenSet,
    fontFamilyCss,
    rectAABBMasked,
    listSignature
  } = deps;

  const contentBoundsCache = { key: "", value: null };

  const getContentBounds = () => {
    if (!st.rects.length) return null;
    const key = st.rects
      .map(r => [r.id, r.x, r.y, r.width, r.height, Number(r.rotation) || 0, listSignature(r.hiddenCells), drawCellX(r), drawCellY(r)].join(","))
      .join(";");
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
    const darkTheme = (document.documentElement.getAttribute("data-bs-theme") || "light") === "dark";
    const nodeCol = darkTheme ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.34)";
    const hoverCol = darkTheme ? "rgba(255,255,255,.9)" : "rgba(0,0,0,.85)";
    const axes = getMaskNodeAxes(r);
    const dot = Math.max(1.8, 2.6 / z);
    for (const gy of axes.ys) {
      for (const gx of axes.xs) {
        const p = rectUVToWorld(r, gx, gy);
        c.fillStyle = nodeCol;
        c.beginPath();
        c.arc(p.x, p.y, dot, 0, Math.PI * 2);
        c.fill();
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
    const darkTheme = (document.documentElement.getAttribute("data-bs-theme") || "light") === "dark";
    const gridCol = darkTheme ? "rgba(255,255,255,.18)" : "rgba(0,0,0,.28)";
    const boundCol = darkTheme ? "rgba(255,255,255,.9)" : "rgba(0,0,0,.78)";
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const topo = getCellTopologyCached(r, cx, cy);
    const axes = getMaskNodeAxes(r);
    c.save();
    c.strokeStyle = gridCol;
    c.lineWidth = Math.max(1, 1.1 / z);
    for (const x of axes.xs) {
      const p1 = rectUVToWorld(r, x, 0);
      const p2 = rectUVToWorld(r, x, r.height);
      c.beginPath();
      c.moveTo(p1.x, p1.y);
      c.lineTo(p2.x, p2.y);
      c.stroke();
    }
    for (const y of axes.ys) {
      const p1 = rectUVToWorld(r, 0, y);
      const p2 = rectUVToWorld(r, r.width, y);
      c.beginPath();
      c.moveTo(p1.x, p1.y);
      c.lineTo(p2.x, p2.y);
      c.stroke();
    }
    const bounds = getComponentBoundarySegments(r, cx, cy, topo);
    c.strokeStyle = boundCol;
    c.lineWidth = Math.max(1.8, 2.2 / z);
    for (const s of bounds) {
      c.beginPath();
      c.moveTo(s.p1.x, s.p1.y);
      c.lineTo(s.p2.x, s.p2.y);
      c.stroke();
    }
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
      const summary = buildVisibleCabinetSummary(r, cx, cy, topo, getHiddenSet(r));
      const lines = [`Кабинетов: ${Math.max(0, Math.round(Number(summary && summary.totalCount) || 0))}`];
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
    c.restore();
  };

  const drawContentBounds = (c, z) => {
    const b = getContentBounds();
    if (!b) return;
    const { minX, minY, w, h } = b;
    const darkTheme = (document.documentElement.getAttribute("data-bs-theme") || "light") === "dark";
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

  return {
    drawMaskOverlay,
    drawCellEditOverlay,
    drawContentBounds
  };
};
