/* build:1779222473 */
export const drawFlowStartMarker = (c, x, y, label, stroke, outline, dotR = 16) => {
  c.beginPath();
  c.arc(x, y, dotR, 0, Math.PI * 2);
  c.fillStyle = "#fff";
  c.fill();
  c.lineWidth = 7.8;
  c.strokeStyle = outline;
  c.stroke();
  c.lineWidth = 5.2;
  c.strokeStyle = stroke;
  c.stroke();
  c.fillStyle = "#000";
  c.fillText(String(label || ""), x, y);
};

export const drawFlowEndMarker = (c, x, y, angle, stroke, outline, endW = 7.2, endH = 26) => {
  c.save();
  c.translate(x || 0, y || 0);
  c.rotate(Number(angle) || 0);
  c.fillStyle = stroke;
  c.fillRect(-endW / 2, -endH / 2, endW, endH);
  c.strokeStyle = outline;
  c.lineWidth = 1.8;
  c.strokeRect(-endW / 2, -endH / 2, endW, endH);
  c.restore();
};

export const setupFlowDrawController = (deps = {}) => {
  const {
    st,
    FLOW_DRAW_BATCH_THRESHOLD,
    FLOW_DRAW_BATCH_STEP,
    touchProgressState,
    setCacheWithPrune,
    fontFamilyCss,
    getFlowDrawRenderEpoch,
    requestRenderNow
  } = deps;

  const flowDrawProgress = new Map();
  const flowGeomCache = new Map();
  let flowDrawRaf = 0;

  const requestFlowDrawRender = () => {
    if (flowDrawRaf) return;
    if (typeof requestAnimationFrame === "function") {
      flowDrawRaf = requestAnimationFrame(() => {
        flowDrawRaf = 0;
        requestRenderNow();
      });
      return;
    }
    flowDrawRaf = setTimeout(() => {
      flowDrawRaf = 0;
      requestRenderNow();
    }, 16);
  };

  const touchFlowDrawProgress = (key, total) => {
    const now = getFlowDrawRenderEpoch();
    return touchProgressState(flowDrawProgress, key, total, now, 64, 8);
  };

  const flowDrawKeyForGroups = groups => {
    if (!Array.isArray(groups) || !groups.length) return "flow-empty";
    return groups.map(g => {
      const pts = Array.isArray(g && g.points) ? g.points : [];
      const pointKey = pts.map(p => [
        Math.round(Number(p && p.cid) || 0),
        Math.round((Number(p && p.u) || 0) * 100) / 100,
        Math.round((Number(p && p.v) || 0) * 100) / 100,
        Math.round(Number(p && p.spanCols) || 1),
        Math.round(Number(p && p.spanRows) || 1)
      ].join(",")).join(";");
      return [
        Math.round(Number(g && g.rid) || 0),
        String(g && g.label || ""),
        Array.isArray(g && g.rgb) ? g.rgb.join(",") : "",
        pointKey
      ].join(":");
    }).join("|");
  };

  const getFlowDrawGeometry = (groups, w, h, skipCache = false) => {
    const key = `v2|${w}|${h}|${flowDrawKeyForGroups(groups)}`;
    const now = getFlowDrawRenderEpoch();
    if (!skipCache) {
      const rec = flowGeomCache.get(key);
      if (rec) {
        rec.lastSeen = now;
        return rec.geom;
      }
    }
    const dotR = 16;
    const arrow = 14;
    const out = { key, totalSegments: 0, groups: [] };
    const list = Array.isArray(groups) ? groups : [];
    for (const g of list) {
      const ptsRaw = Array.isArray(g && g.points) ? g.points : [];
      const pts = ptsRaw.map(p => ({
        x: -w / 2 + (+p.u || 0),
        y: -h / 2 + (+p.v || 0),
        u: +p.u || 0,
        v: +p.v || 0,
        cid: Math.max(0, Math.round(Number(p && p.cid) || 0)),
        spanCols: Math.max(1, Math.round(Number(p && p.spanCols) || 1)),
        spanRows: Math.max(1, Math.round(Number(p && p.spanRows) || 1)),
        bw: Math.max(1, Number(p && p.bw) || 0),
        bh: Math.max(1, Number(p && p.bh) || 0)
      }));
      if (!pts.length) {
        out.groups.push({
          label: String(g && g.label || ""),
          rgb: Array.isArray(g && g.rgb) ? g.rgb : [255, 0, 0],
          pts: [],
          segments: [],
          start: null,
          end: null,
          endAngle: 0,
          lastEndIndex: 0
        });
        continue;
      }
      let startMarker = { x: pts[0].x, y: pts[0].y };
      let endMarker = { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
      let endAngle = 0;
      if (pts.length > 1) {
        const pLast = pts[pts.length - 1];
        const pPrev = pts[Math.max(0, pts.length - 2)];
        const dx = (pLast.u - pPrev.u);
        const dy = (pLast.v - pPrev.v);
        if (Math.abs(dx) + Math.abs(dy) > 1e-6) endAngle = Math.atan2(dy, dx);
      }
      const pFirst = pts[0];
      const pLast0 = pts[pts.length - 1];
      const sameCab = (pFirst.cid === pLast0.cid) && Math.hypot(pFirst.x - pLast0.x, pFirst.y - pLast0.y) < 1e-6;
      if (sameCab) {
        const boxW = Math.max(8, Number(pFirst.bw) || 0);
        const boxH = Math.max(8, Number(pFirst.bh) || 0);
        const markerOffset = side => {
          const ls = Math.max(8, Number(side) || 0);
          return Math.max(6, Math.min(36, ls * 0.25));
        };
        if (boxW >= boxH) {
          const off = markerOffset(boxW);
          startMarker = { x: pFirst.x - off, y: pFirst.y };
          endMarker = { x: pFirst.x + off, y: pFirst.y };
          if (pts.length <= 1) endAngle = Math.PI / 2;
        } else {
          const off = markerOffset(boxH);
          startMarker = { x: pFirst.x, y: pFirst.y - off };
          endMarker = { x: pFirst.x, y: pFirst.y + off };
          if (pts.length <= 1) endAngle = 0;
        }
      }
      const segments = [];
      let firstSegment = true;
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1];
        const p1 = pts[i];
        const dx = p1.x - p0.x;
        const dy = p1.y - p0.y;
        const len = Math.hypot(dx, dy);
        if (len < 1) continue;
        const ux = dx / len;
        const uy = dy / len;
        const startOffset = firstSegment ? (dotR + 2) : 0;
        const lx1 = p0.x + ux * startOffset;
        const ly1 = p0.y + uy * startOffset;
        const nx = -uy;
        const ny = ux;
        const mx = (lx1 + p1.x) / 2;
        const my = (ly1 + p1.y) / 2;
        const bx = mx - ux * arrow * 0.75;
        const by = my - uy * arrow * 0.75;
        const tx = mx + ux * arrow * 0.95;
        const ty = my + uy * arrow * 0.95;
        const s = arrow * 0.5;
        segments.push({ x1: lx1, y1: ly1, x2: p1.x, y2: p1.y, endIndex: i, arrow: { tx, ty, bx, by, nx, ny, s } });
        firstSegment = false;
      }
      out.totalSegments += segments.length;
      out.groups.push({
        label: String(g && g.label || ""),
        rgb: Array.isArray(g && g.rgb) ? g.rgb : [255, 0, 0],
        pts,
        start: startMarker,
        end: endMarker,
        endAngle,
        segments,
        lastEndIndex: segments.length ? segments[segments.length - 1].endIndex : 0
      });
    }
    if (!skipCache) {
      const rec = { geom: out, lastSeen: now };
      setCacheWithPrune(flowGeomCache, key, rec, now, 96, 8, v => (v && v.lastSeen));
    }
    return out;
  };

  const drawDataFlowOnRect = (c, groups, w, h, z, opts) => {
    const noBatch = !!(opts && opts.noBatch);
    if (!Array.isArray(groups) || !groups.length) return;
    const geom = getFlowDrawGeometry(groups, w, h, st.mode === "flowEdit");
    const totalSegments = Math.max(0, geom.totalSegments | 0);
    const hasPoints = geom.groups.some(g => Array.isArray(g.pts) && g.pts.length);
    if (!hasPoints) return;
    const flowOutline = "rgba(8,12,18,.92)";
    if (totalSegments <= 0) {
      c.save();
      c.lineCap = "round";
      c.lineJoin = "round";
      const dotR = 16;
      c.font = `700 12px ${fontFamilyCss(st.fontFamily)}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      for (const g of geom.groups) {
        if (!g.start) continue;
        const rgb = Array.isArray(g && g.rgb) ? g.rgb : [255, 0, 0];
        const stroke = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.96)`;
        const sx = g.start.x;
        const sy = g.start.y;
        drawFlowStartMarker(c, sx, sy, String(g && g.label || ""), stroke, flowOutline, dotR);
        if (g.end && (Math.hypot((g.end.x || 0) - sx, (g.end.y || 0) - sy) > 0.5)) {
          drawFlowEndMarker(c, g.end.x || 0, g.end.y || 0, Number(g.endAngle) || 0, stroke, flowOutline, 7.2, 26);
        }
      }
      c.restore();
      return;
    }
    const batchEnabled = !noBatch && totalSegments > FLOW_DRAW_BATCH_THRESHOLD;
    const drawKey = flowDrawKeyForGroups(groups);
    const state = touchFlowDrawProgress(drawKey, totalSegments);
    const targetSegments = batchEnabled ? Math.min(totalSegments, (state.drawn | 0) + FLOW_DRAW_BATCH_STEP) : totalSegments;
    c.save();
    c.lineCap = "round";
    c.lineJoin = "round";
    const dotR = 16;
    const nodeR = 6;
    const drawIntermediateNodes = Math.max(0.01, Number(z) || 1) >= 0.45 || st.mode === "flowEdit";
    c.font = `700 12px ${fontFamilyCss(st.fontFamily)}`;
    c.textAlign = "center";
    c.textBaseline = "middle";
    let drawnSegments = 0;
    let pending = false;
    for (const g of geom.groups) {
      if (drawnSegments >= targetSegments) pending = true;
      const pts = Array.isArray(g.pts) ? g.pts : [];
      if (!pts.length || !g.start) continue;
      const rgb = Array.isArray(g.rgb) ? g.rgb : [255, 0, 0];
      const stroke = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.96)`;
      const fill = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},.98)`;
      let drewGroup = false;
      let lastDrawnPointIndex = 0;
      const sx = g.start.x;
      const sy = g.start.y;
      c.strokeStyle = stroke;
      c.fillStyle = fill;
      drawFlowStartMarker(c, sx, sy, String(g.label || ""), stroke, flowOutline, dotR);
      c.fillStyle = fill;
      c.lineWidth = 4.4;
      drewGroup = true;
      c.strokeStyle = stroke;
      c.fillStyle = fill;
      c.beginPath();
      let hasLine = false;
      const arrows = [];
      const left = Math.max(0, targetSegments - drawnSegments);
      const take = Math.max(0, Math.min(g.segments.length, left));
      for (let i = 0; i < take; i++) {
        const seg = g.segments[i];
        c.moveTo(seg.x1, seg.y1);
        c.lineTo(seg.x2, seg.y2);
        hasLine = true;
        arrows.push(seg.arrow);
        lastDrawnPointIndex = seg.endIndex;
      }
      drawnSegments += take;
      if (take < g.segments.length) pending = true;
      if (hasLine) {
        c.strokeStyle = flowOutline;
        c.lineWidth = 6.8;
        c.stroke();
        c.strokeStyle = stroke;
        c.lineWidth = 4.4;
        c.stroke();
      }
      if (arrows.length) {
        c.save();
        c.lineJoin = "round";
        c.lineCap = "round";
        c.beginPath();
        for (const a of arrows) {
          c.moveTo(a.tx, a.ty);
          c.lineTo(a.bx + a.nx * a.s, a.by + a.ny * a.s);
          c.lineTo(a.bx - a.nx * a.s, a.by - a.ny * a.s);
          c.closePath();
        }
        c.strokeStyle = flowOutline;
        c.lineWidth = 2.2;
        c.stroke();
        c.fillStyle = fill;
        c.fill();
        c.restore();
      }
      if (drawIntermediateNodes && drewGroup && lastDrawnPointIndex > 1) {
        c.beginPath();
        const nodeEnd = Math.min(lastDrawnPointIndex, pts.length - 1);
        for (let i = 1; i < nodeEnd; i++) {
          const p = pts[i];
          const px = p.x;
          const py = p.y;
          c.moveTo(px + nodeR, py);
          c.arc(px, py, nodeR, 0, Math.PI * 2);
        }
        c.fill();
        c.strokeStyle = flowOutline;
        c.lineWidth = 1.1;
        c.stroke();
      }
      if (drewGroup && g.segments.length && lastDrawnPointIndex === g.lastEndIndex && !pending) {
        const e = pts[lastDrawnPointIndex];
        const pPrev = pts[Math.max(0, lastDrawnPointIndex - 1)];
        const ex = (g.end && Number.isFinite(Number(g.end.x))) ? g.end.x : e.x;
        const ey = (g.end && Number.isFinite(Number(g.end.y))) ? g.end.y : e.y;
        const dx = (e.u - pPrev.u);
        const dy = (e.v - pPrev.v);
        const aBase = Math.abs(dx) + Math.abs(dy) > 1e-6 ? Math.atan2(dy, dx) : 0;
        const a = Number.isFinite(Number(g.endAngle)) ? Number(g.endAngle) : aBase;
        drawFlowEndMarker(c, ex, ey, a, stroke, flowOutline, 7.2, 26);
      }
    }
    c.restore();
    state.drawn = Math.max(state.drawn | 0, drawnSegments);
    if (batchEnabled && state.drawn < totalSegments) {
      requestFlowDrawRender();
    } else if (state.drawn >= totalSegments) {
      state.drawn = totalSegments;
    }
  };

  return {
    flowDrawKeyForGroups,
    drawDataFlowOnRect
  };
};
