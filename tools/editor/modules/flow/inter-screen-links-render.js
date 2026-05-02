import { sampleBezier, buildSagBezierControls } from "./bezier-utils.js";

export const setupInterScreenLinksRender = (deps = {}) => {
  const {
    st,
    isCellEditMode,
    isRigEditMode,
    normalizeViewMode,
    normalizeFlowLinks,
    flowAnchorKey,
    findFlowAnchorByEndpoint
  } = deps;
  const rectById = id => {
    const rid = Math.max(1, Math.round(Number(id) || 0));
    return (Array.isArray(st && st.rects) ? st.rects : []).find(r => Math.max(1, Math.round(Number(r && r.id) || 0)) === rid) || null;
  };
  const isDevice = r => String((r && r.kind) || "").toLowerCase() === "device";
  const deviceType = r => {
    const v = String((r && r.deviceType) || "controller").toLowerCase();
    return (v === "pc" || v === "mixer" || v === "camera") ? v : "controller";
  };
  const isPcLike = type => type === "pc" || type === "mixer" || type === "camera";
  const outPurePalette = [
    "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff",
    "#ff8000", "#8000ff", "#00ff80", "#ff0080", "#ffffff"
  ];
  const outControllerColor = cid => outPurePalette[Math.max(0, Math.round(Number(cid) || 1) - 1) % outPurePalette.length];
  const withAlpha = (hex, alpha = 0.58) => {
    const h = String(hex || "").trim();
    const m = h.match(/^#([0-9a-f]{6})$/i);
    if (!m) return hex;
    const n = m[1];
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  };

  const curveCache = new Map();
  const toNum = v => +v || 0;
  const zoomSafe = (z, min = 0.2) => Math.max(min, toNum(z) || 1);
  const rounded1 = v => Math.round(toNum(v) * 10) / 10;
  const outlineWidthForZoom = z => Math.max(1.2, 1.8 / zoomSafe(z, 0.25));
  const strokeWidthForZoom = (z, min = 1.2, factor = 2.2) => Math.max(min, factor / zoomSafe(z));
  const anchorRadiusForZoom = z => Math.max(4, 6 / zoomSafe(z, 0.6));

  const getCurveGeom = (a, b, steps = 18) => {
    const ax = toNum(a.x), ay = toNum(a.y), bx = toNum(b.x), by = toNum(b.y);
    const key = `${rounded1(ax)},${rounded1(ay)},${rounded1(bx)},${rounded1(by)},${steps}`;
    const cached = curveCache.get(key);
    if (cached) return cached;
    const { c1, c2 } = buildSagBezierControls({ x: ax, y: ay }, { x: bx, y: by });
    const pts = [];
    for (let i = 1; i <= steps; i++) {
      pts.push(sampleBezier({ x: ax, y: ay }, c1, c2, { x: bx, y: by }, i / steps));
    }
    const value = {
      c1, c2, pts,
      t0: sampleBezier({ x: ax, y: ay }, c1, c2, { x: bx, y: by }, 0.48),
      t1: sampleBezier({ x: ax, y: ay }, c1, c2, { x: bx, y: by }, 0.52)
    };
    if (curveCache.size > 1024) curveCache.clear();
    curveCache.set(key, value);
    return value;
  };
  const deviceOutTailPoint = (a, b, cid = 1, sideDir = null, aimPoint = null) => {
    const ax = toNum(a.x), ay = toNum(a.y);
    const hasAim = !!(aimPoint && typeof aimPoint === "object");
    const tx = hasAim && Number.isFinite(Number(aimPoint.x)) ? toNum(aimPoint.x) : toNum(b && b.x);
    const ty = hasAim && Number.isFinite(Number(aimPoint.y)) ? toNum(aimPoint.y) : toNum(b && b.y);
    const bx = toNum(b && b.x), by = toNum(b && b.y);
    let dx = tx - ax;
    let dy = ty - ay;
    let d = Math.hypot(dx, dy);
    if (d <= 1e-6) {
      const dir = Number(sideDir) === -1 ? -1 : Number(sideDir) === 1 ? 1 : (bx >= ax ? 1 : -1);
      dx = dir;
      dy = 1;
      d = Math.hypot(dx, dy);
    }
    const ux = dx / d;
    const uy = dy / d;
    const idx = Math.max(0, Math.round(Number(cid) || 1) - 1);
    const len = 16 + idx * 7;
    return { x: ax + ux * len, y: ay + uy * len };
  };
  const deviceInTailPoint = (a, b, cid = 1, sideDir = null, aimPoint = null) => {
    const hasAim = !!(aimPoint && typeof aimPoint === "object");
    const ax = hasAim && Number.isFinite(Number(aimPoint.x)) ? toNum(aimPoint.x) : toNum(a && a.x);
    const ay = hasAim && Number.isFinite(Number(aimPoint.y)) ? toNum(aimPoint.y) : toNum(a && a.y);
    const bx = toNum(b.x), by = toNum(b.y);
    let dx = ax - bx;
    let dy = ay - by;
    let d = Math.hypot(dx, dy);
    if (d <= 1e-6) {
      const dir = Number(sideDir) === -1 ? -1 : Number(sideDir) === 1 ? 1 : (bx >= ax ? 1 : -1);
      dx = dir;
      dy = -1;
      d = Math.hypot(dx, dy);
    }
    const ux = dx / d;
    const uy = dy / d;
    const idx = Math.max(0, Math.round(Number(cid) || 1) - 1);
    const len = 16 + idx * 7;
    return { x: bx + ux * len, y: by + uy * len };
  };
  const screenStartTailPoint = (fromPoint, toPoint, len = 16, sideDir = 1, aimPoint = null) => {
    const fx = toNum(fromPoint && fromPoint.x);
    const fy = toNum(fromPoint && fromPoint.y);
    const tx = toNum(toPoint && toPoint.x);
    const ty = toNum(toPoint && toPoint.y);
    const ax = (aimPoint && Number.isFinite(Number(aimPoint.x))) ? toNum(aimPoint.x) : fx;
    const ay = (aimPoint && Number.isFinite(Number(aimPoint.y))) ? toNum(aimPoint.y) : fy;
    const dx = ax - tx;
    const dy = ay - ty;
    const d = Math.hypot(dx, dy);
    if (d <= 1e-6) return { x: tx, y: ty - len };
    const ux = dx / d;
    const uy = dy / d;
    if (aimPoint && Number.isFinite(Number(aimPoint.x)) && Number.isFinite(Number(aimPoint.y))) {
      return { x: tx + ux * len, y: ty + uy * len };
    }
    const nx = -uy;
    const ny = ux;
    const dev = Math.max(6, Math.min(18, len * 0.45));
    const s = Number(sideDir) === -1 ? -1 : 1;
    return { x: tx + ux * len + nx * dev * s, y: ty + uy * len + ny * dev * s };
  };
  const getStemSmoothGeom = (pStart, pEnd, opts = {}, steps = 18) => {
    const {
      stemStartAnchor = null, // point before pStart (for tangent direction at start)
      stemEndAnchor = null,   // point after pEnd (for tangent direction at end)
      radiusMul = 1
    } = (opts && typeof opts === "object") ? opts : {};
    const dx = toNum(pEnd.x) - toNum(pStart.x);
    const dy = toNum(pEnd.y) - toNum(pStart.y);
    const dist = Math.max(1, Math.hypot(dx, dy));
    const rm = Math.max(0.5, Number(radiusMul) || 1);
    const lead = Math.max(26 * rm, Math.min(dist * (0.78 * rm), 162 * rm));
    const norm = (vx, vy) => {
      const len = Math.hypot(vx, vy);
      if (len <= 1e-6) return { x: 0, y: 1 };
      return { x: vx / len, y: vy / len };
    };
    const tStart = stemStartAnchor
      ? norm(toNum(pStart.x) - toNum(stemStartAnchor.x), toNum(pStart.y) - toNum(stemStartAnchor.y))
      : norm(dx, dy);
    const tEnd = stemEndAnchor
      ? norm(toNum(stemEndAnchor.x) - toNum(pEnd.x), toNum(stemEndAnchor.y) - toNum(pEnd.y))
      : norm(dx, dy);
    const nearX = Math.abs(dx) <= Math.max(18, dist * 0.08);
    const nearY = Math.abs(dy) <= Math.max(18, dist * 0.08);
    const sideSign = dx >= 0 ? 1 : -1;
    const swayX = nearX ? sideSign * Math.max(14, Math.min(42, dist * 0.22)) : 0;
    const swayY = nearY ? Math.max(10, Math.min(30, dist * 0.16)) : 0;
    const c1 = { x: toNum(pStart.x) + tStart.x * lead + swayX, y: toNum(pStart.y) + tStart.y * lead + swayY };
    const c2 = { x: toNum(pEnd.x) - tEnd.x * lead + swayX, y: toNum(pEnd.y) - tEnd.y * lead + swayY };
    const pts = [];
    for (let i = 1; i <= steps; i++) pts.push(sampleBezier(pStart, c1, c2, pEnd, i / steps));
    return {
      c1, c2, pts,
      t0: sampleBezier(pStart, c1, c2, pEnd, 0.48),
      t1: sampleBezier(pStart, c1, c2, pEnd, 0.52)
    };
  };

  const drawFlowLinkArrow = (c, tail, head, color, z = 1) => {
    const dx = toNum(head.x) - toNum(tail.x);
    const dy = toNum(head.y) - toNum(tail.y);
    const len = Math.hypot(dx, dy);
    if (len <= 1e-6) return;
    const ux = dx / len;
    const uy = dy / len;
    const size = Math.max(6, 12 / zoomSafe(z, 0.3));
    const halfW = size * 0.48;
    const bx = toNum(head.x) - ux * size;
    const by = toNum(head.y) - uy * size;
    const nx = -uy;
    const ny = ux;
    c.save();
    c.fillStyle = color;
    c.strokeStyle = "rgba(0,0,0,.55)";
    c.lineWidth = Math.max(0.8, 1 / zoomSafe(z, 0.3));
    c.beginPath();
    c.moveTo(toNum(head.x), toNum(head.y));
    c.lineTo(bx + nx * halfW, by + ny * halfW);
    c.lineTo(bx - nx * halfW, by - ny * halfW);
    c.closePath();
    c.fill();
    c.stroke();
    c.restore();
  };

  const drawInterScreenFlowLinks = (c, force = false) => {
    if (isCellEditMode() || isRigEditMode()) return;
    if (!force && normalizeViewMode(st.viewMode) !== "install" && st.mode !== "flowEdit") return;
    const links = normalizeFlowLinks(st.flowLinks);
    const exportPass = !!force;
    st.flowLinkSegments = [];
    st.flowLinkCurveHandles = [];
    const strokeOutlinedPath = (path, outlineColor, outlineWidth, color, width) => {
      c.lineCap = "round";
      c.lineJoin = "round";
      c.strokeStyle = outlineColor;
      c.lineWidth = outlineWidth;
      c.stroke(path);
      c.strokeStyle = color;
      c.lineWidth = width;
      c.stroke(path);
    };
    const drawLinkPath = (path, color, width) => {
      strokeOutlinedPath(
        path,
        "rgba(12,16,22,.92)",
        width + outlineWidthForZoom(st.zoom),
        color,
        width
      );
    };
    const hoverSegKey = st.flowLinkHover && st.flowLinkHover.key ? String(st.flowLinkHover.key) : "";
    const linkDrag = st.flowLinkDrag || null;
    const dragTargetKey = (linkDrag && linkDrag.target) ? flowAnchorKey(linkDrag.target) : "";
    for (const ln of links) {
      const a = findFlowAnchorByEndpoint(ln.from);
      const b = findFlowAnchorByEndpoint(ln.to);
      if (!a || !b) continue;
      const key = `${flowAnchorKey(ln.from)}>${flowAnchorKey(ln.to)}`;
      const geom = getCurveGeom(a, b, 18);
      const fromRect = rectById(ln && ln.from && ln.from.rectId);
      const toRect = rectById(ln && ln.to && ln.to.rectId);
      const fromType = deviceType(fromRect);
      const toType = deviceType(toRect);
      const fromCid = Math.max(1, Math.round(Number(ln && ln.from && ln.from.cid) || 1));
      const toCid = Math.max(1, Math.round(Number(ln && ln.to && ln.to.cid) || 1));
      const fromIsDevice = isDevice(fromRect);
      const toIsDevice = isDevice(toRect);
      const devicesLayerOn = !(st.installLayers && st.installLayers.devices === false);
      if (!force && !devicesLayerOn && (fromIsDevice || toIsDevice)) continue;
      const isPcLikeToController = isDevice(fromRect) && isPcLike(fromType) && isDevice(toRect) && toType === "controller";
      const isPcLikeToPcLike = isDevice(fromRect) && isPcLike(fromType) && isDevice(toRect) && isPcLike(toType);
      const isControllerOut = isDevice(fromRect) && fromType === "controller";
      const baseColor = isControllerOut
        ? outControllerColor(fromCid)
        : isPcLikeToPcLike
        ? "rgba(170,120,255,.95)"
        : isPcLikeToController
          ? "rgba(80,220,180,.95)"
          : "rgba(255,193,7,.95)";
      const strokeColorRaw = (key === hoverSegKey) ? "rgba(255,99,99,.98)" : baseColor;
      const strokeColor = fromIsDevice ? withAlpha(strokeColorRaw, 0.56) : strokeColorRaw;
      c.save();
      const baseW = exportPass ? strokeWidthForZoom(st.zoom, 0.85, 1.45) : strokeWidthForZoom(st.zoom, 1.2, 2.2);
      if (fromIsDevice || toIsDevice) {
        const sideDir = (toNum(b.x) - toNum(a.x)) >= 0 ? 1 : -1;
        const legacyManualAbs = ln && ln.manualBezier && ln.manualBezier.c1 && ln.manualBezier.c2
          ? { c1: { x: toNum(ln.manualBezier.c1.x), y: toNum(ln.manualBezier.c1.y) }, c2: { x: toNum(ln.manualBezier.c2.x), y: toNum(ln.manualBezier.c2.y) } }
          : null;
        const manualRelStored = (ln && ln.manualBezierRel && ln.manualBezierRel.c1 && ln.manualBezierRel.c2)
          ? {
            c1: { x: toNum(ln.manualBezierRel.c1.x), y: toNum(ln.manualBezierRel.c1.y) },
            c2: { x: toNum(ln.manualBezierRel.c2.x), y: toNum(ln.manualBezierRel.c2.y) }
          }
          : null;
        const manualRel = manualRelStored || (legacyManualAbs
          ? {
            c1: { x: legacyManualAbs.c1.x - toNum(a.x), y: legacyManualAbs.c1.y - toNum(a.y) },
            c2: { x: legacyManualAbs.c2.x - toNum(b.x), y: legacyManualAbs.c2.y - toNum(b.y) }
          }
          : null);
        const manualAbsByEndpoints = manualRel
          ? {
            c1: { x: a.x + manualRel.c1.x, y: a.y + manualRel.c1.y },
            c2: { x: b.x + manualRel.c2.x, y: b.y + manualRel.c2.y }
          }
          : legacyManualAbs;
        const pStart = fromIsDevice ? deviceOutTailPoint(a, b, fromCid, sideDir, manualAbsByEndpoints ? manualAbsByEndpoints.c1 : null) : { x: a.x, y: a.y };
        let screenAim = null;
        if (!toIsDevice && fromIsDevice) {
          if (manualAbsByEndpoints && manualAbsByEndpoints.c2) screenAim = manualAbsByEndpoints.c2;
          else {
            const probe = getStemSmoothGeom(
              pStart,
              { x: b.x, y: b.y },
              { stemStartAnchor: a, stemEndAnchor: null, radiusMul: 1.85 },
              18
            );
            screenAim = probe && probe.c2 ? probe.c2 : null;
          }
        }
        const pEnd = toIsDevice
          ? deviceInTailPoint(a, b, toCid, sideDir, manualAbsByEndpoints ? manualAbsByEndpoints.c2 : null)
          : (fromIsDevice ? screenStartTailPoint(pStart, b, 28, sideDir, screenAim) : { x: b.x, y: b.y });
        if (fromIsDevice) st.flowLinkSegments.push({ key, a: { x: a.x, y: a.y }, b: { x: pStart.x, y: pStart.y }, link: ln });
        const autoGeom = getStemSmoothGeom(
          pStart,
          pEnd,
          {
            stemStartAnchor: fromIsDevice ? a : null,
            stemEndAnchor: (toIsDevice || fromIsDevice) ? b : null,
            radiusMul: (fromIsDevice && !toIsDevice) ? 1.85 : 1
          },
          18
        );
        const manualAbs = manualAbsByEndpoints;
        const geom2 = manualAbs
          ? {
            c1: manualAbs.c1,
            c2: manualAbs.c2,
            pts: (() => {
              const pts = [];
              for (let i = 1; i <= 18; i++) pts.push(sampleBezier(pStart, manualAbs.c1, manualAbs.c2, pEnd, i / 18));
              return pts;
            })(),
            t0: sampleBezier(pStart, manualAbs.c1, manualAbs.c2, pEnd, 0.48),
            t1: sampleBezier(pStart, manualAbs.c1, manualAbs.c2, pEnd, 0.52)
          }
          : autoGeom;
        let prev = { x: pStart.x, y: pStart.y };
        for (let i = 0; i < geom2.pts.length; i++) {
          const p = geom2.pts[i];
          st.flowLinkSegments.push({ key, a: prev, b: p, link: ln });
          prev = p;
        }
        if (toIsDevice || fromIsDevice) st.flowLinkSegments.push({ key, a: { x: pEnd.x, y: pEnd.y }, b: { x: b.x, y: b.y }, link: ln });
        const path = new Path2D();
        path.moveTo(a.x, a.y);
        if (fromIsDevice) path.lineTo(pStart.x, pStart.y);
        path.bezierCurveTo(geom2.c1.x, geom2.c1.y, geom2.c2.x, geom2.c2.y, pEnd.x, pEnd.y);
        if (toIsDevice || fromIsDevice) path.lineTo(b.x, b.y);
        drawLinkPath(path, strokeColor, baseW);
        if (fromIsDevice && toIsDevice) drawFlowLinkArrow(c, geom2.t0, geom2.t1, strokeColor, st.zoom || 1);
        else if (toIsDevice) drawFlowLinkArrow(c, pEnd, b, strokeColor, st.zoom || 1);
        else drawFlowLinkArrow(c, geom2.t0, geom2.t1, strokeColor, st.zoom || 1);
        if (!exportPass && String(st.mode || "") === "select" && String(st.flowLinkSelectedKey || "") === key) {
          const drawHandle = (pt, handle, anchor) => {
            st.flowLinkCurveHandles.push({
              key,
              handle,
              x: pt.x,
              y: pt.y,
              ax: anchor && Number.isFinite(Number(anchor.x)) ? Number(anchor.x) : null,
              ay: anchor && Number.isFinite(Number(anchor.y)) ? Number(anchor.y) : null,
              fallback: { c1: autoGeom.c1, c2: autoGeom.c2, start: a, end: b }
            });
          };
          drawHandle(geom2.c1, "c1", pStart);
          drawHandle(geom2.c2, "c2", pEnd);
        }
      } else {
        const pts = geom.pts;
        let prev = { x: a.x, y: a.y };
        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];
          st.flowLinkSegments.push({ key, a: prev, b: p, link: ln });
          prev = p;
        }
        const path = new Path2D();
        path.moveTo(a.x, a.y);
        for (const p of pts) path.lineTo(p.x, p.y);
        drawLinkPath(path, strokeColor, baseW);
        drawFlowLinkArrow(c, geom.t0, geom.t1, strokeColor, st.zoom || 1);
      }
      c.restore();
    }
    if (linkDrag && linkDrag.from) {
      const a = linkDrag.from;
      const b = { x: toNum(linkDrag.x), y: toNum(linkDrag.y) };
      const geom = getCurveGeom(a, b, 24);
      c.save();
      const previewColor = linkDrag.canLink ? "rgba(255,193,7,.98)" : "rgba(255,99,99,.98)";
      const previewW = exportPass ? strokeWidthForZoom(st.zoom, 1.0, 1.7) : strokeWidthForZoom(st.zoom, 1.4, 2.4);
      c.setLineDash([7 / zoomSafe(st.zoom), 5 / zoomSafe(st.zoom)]);
      const previewPath = new Path2D();
      previewPath.moveTo(a.x, a.y);
      previewPath.bezierCurveTo(geom.c1.x, geom.c1.y, geom.c2.x, geom.c2.y, b.x, b.y);
      drawLinkPath(previewPath, previewColor, previewW);
      c.setLineDash([]);
      c.restore();
      drawFlowLinkArrow(c, geom.t0, geom.t1, previewColor, st.zoom || 1);
    }
    if (st.mode === "flowEdit") {
      for (const a of st.flowLinkAnchors) {
        const isStart = a.kind === "start";
        const k = flowAnchorKey(a);
        const isDragTarget = (dragTargetKey && dragTargetKey === k);
        c.save();
        c.fillStyle = isStart ? "rgba(64,190,255,.92)" : "rgba(255,170,64,.92)";
        if (isDragTarget) c.fillStyle = linkDrag && linkDrag.canLink ? "rgba(255,193,7,.96)" : "rgba(255,99,99,.96)";
        c.strokeStyle = "rgba(0,0,0,.75)";
        c.lineWidth = Math.max(1, 1.2 / zoomSafe(st.zoom));
        c.beginPath();
        c.arc(a.x, a.y, anchorRadiusForZoom(st.zoom), 0, Math.PI * 2);
        c.fill();
        c.stroke();
        c.restore();
      }
    }
  };

  const drawFlowLinkCurveHandlesOverlay = c => {
    if (!c || String(st.mode || "") !== "select") return;
    const handles = Array.isArray(st.flowLinkCurveHandles) ? st.flowLinkCurveHandles : [];
    if (!handles.length) return;
    const size = Math.max(5, 8 / zoomSafe(st.zoom, 0.35));
    const drawDiamond = (x, y) => {
      c.beginPath();
      c.moveTo(x, y - size);
      c.lineTo(x + size, y);
      c.lineTo(x, y + size);
      c.lineTo(x - size, y);
      c.closePath();
    };
    c.save();
    for (const h of handles) {
      const x = toNum(h && h.x);
      const y = toNum(h && h.y);
      const ax = Number.isFinite(Number(h && h.ax)) ? Number(h.ax) : null;
      const ay = Number.isFinite(Number(h && h.ay)) ? Number(h.ay) : null;
      if (ax != null && ay != null) {
        c.strokeStyle = "rgba(150,220,255,.82)";
        c.lineWidth = Math.max(1, 1.15 / zoomSafe(st.zoom, 0.35));
        c.setLineDash([5 / zoomSafe(st.zoom, 0.35), 4 / zoomSafe(st.zoom, 0.35)]);
        c.beginPath();
        c.moveTo(ax, ay);
        c.lineTo(x, y);
        c.stroke();
        c.setLineDash([]);
      }
      c.fillStyle = "rgba(80,220,180,.97)";
      c.strokeStyle = "rgba(0,0,0,.9)";
      c.lineWidth = Math.max(1, 1.35 / zoomSafe(st.zoom, 0.35));
      drawDiamond(x, y);
      c.fill();
      c.stroke();
    }
    c.restore();
  };

  return {
    drawInterScreenFlowLinks,
    drawFlowLinkCurveHandlesOverlay
  };
};
