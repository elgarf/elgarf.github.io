import {
  controlIn,
  controlOut,
  drawShapePath,
  flattenShapeSegment,
  flattenShapePoints,
  isBezierPoint,
  makeShapePath2D,
  num
} from "../shape/shape-path-utils.js";

import { isShapeRectKind } from "../utils/rect-kind-utils.js";

export const setupShapeRender = (deps = {}) => {
  const {
    st,
    rectUVToWorld,
    worldToRectUV,
    pointInPoly,
    distToSegment
  } = deps;

  const isShapeRect = r => isShapeRectKind(r);
  const shapePoints = r => Array.isArray(r && r.shapePoints) ? r.shapePoints : [];
  const shapeWorldPathPoints = r => shapePoints(r).map(p => {
    const x = Number(p.x) || 0;
    const y = Number(p.y) || 0;
    const w = rectUVToWorld(r, x, y);
    if (!isBezierPoint(p)) return { ...p, x: w.x, y: w.y };
    const ci = rectUVToWorld(r, x + num(p.inX, -48), y + num(p.inY, 0));
    const co = rectUVToWorld(r, x + num(p.outX, 48), y + num(p.outY, 0));
    return { ...p, x: w.x, y: w.y, inX: ci.x - w.x, inY: ci.y - w.y, outX: co.x - w.x, outY: co.y - w.y };
  });
  const shapeFlattenedUvPoints = (r, steps = 16) => flattenShapePoints(shapePoints(r), steps);
  const shapeOpacity = r => {
    const n = Number(r && r.shapeOpacity);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.72;
  };
  const makeScratchCanvas = (w, h) => {
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(w, h);
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      return canvas;
    }
    return null;
  };
  let shapeHitCtx = null;
  const getShapeHitCtx = () => {
    if (shapeHitCtx) return shapeHitCtx;
    const canvas = makeScratchCanvas(1, 1);
    shapeHitCtx = canvas && typeof canvas.getContext === "function" ? canvas.getContext("2d") : null;
    return shapeHitCtx;
  };

  const normalizeShapeBounds = r => {
    if (!isShapeRect(r)) return false;
    const pts = shapePoints(r);
    if (pts.length < 3) return false;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, Number(p.x) || 0);
      minY = Math.min(minY, Number(p.y) || 0);
      maxX = Math.max(maxX, Number(p.x) || 0);
      maxY = Math.max(maxY, Number(p.y) || 0);
    }
    if (!(Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY))) return false;
    const nextW = Math.max(1, Math.round(maxX - minX));
    const nextH = Math.max(1, Math.round(maxY - minY));
    if (Math.abs(minX) < 1e-6 && Math.abs(minY) < 1e-6) {
      r.width = Math.max(1, Math.round(maxX));
      r.height = Math.max(1, Math.round(maxY));
      return true;
    }
    const topLeftWorld = rectUVToWorld(r, minX, minY);
    r.shapePoints = pts.map(p => ({ ...p, x: Math.round((Number(p.x) || 0) - minX), y: Math.round((Number(p.y) || 0) - minY) }));
    r.width = nextW;
    r.height = nextH;
    const originWorld = rectUVToWorld(r, 0, 0);
    r.x = Math.round((Number(r.x) || 0) + (Number(topLeftWorld.x) || 0) - (Number(originWorld.x) || 0));
    r.y = Math.round((Number(r.y) || 0) + (Number(topLeftWorld.y) || 0) - (Number(originWorld.y) || 0));
    return true;
  };

  const pointInShape = (r, wx, wy) => {
    if (!isShapeRect(r)) return false;
    const p = worldToRectUV(r, wx, wy);
    const ctx = getShapeHitCtx();
    const path = ctx && makeShapePath2D(shapePoints(r));
    if (path && typeof ctx.isPointInPath === "function") return !!ctx.isPointInPath(path, p.u, p.v);
    return pointInPoly(p.u, p.v, shapeFlattenedUvPoints(r, 48));
  };

  const shapePointHit = (r, wx, wy, z = 1) => {
    if (!isShapeRect(r)) return -1;
    const pts = shapePoints(r);
    const p = worldToRectUV(r, wx, wy);
    const d = 9 / Math.max(0.25, Number(z) || 1);
    for (let i = pts.length - 1; i >= 0; i--) {
      if (Math.hypot((Number(pts[i].x) || 0) - p.u, (Number(pts[i].y) || 0) - p.v) <= d) return i;
    }
    return -1;
  };
  const shapePointHits = (r, wx, wy, z = 1) => {
    if (!isShapeRect(r)) return [];
    const pts = shapePoints(r);
    const p = worldToRectUV(r, wx, wy);
    const d = 9 / Math.max(0.25, Number(z) || 1);
    const out = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      if (Math.hypot((Number(pts[i].x) || 0) - p.u, (Number(pts[i].y) || 0) - p.v) <= d) out.push(i);
    }
    return out;
  };
  const shapeEditHits = (r, wx, wy, z = 1) => {
    if (!isShapeRect(r)) return [];
    const pts = shapePoints(r);
    const p = worldToRectUV(r, wx, wy);
    const d = 9 / Math.max(0.25, Number(z) || 1);
    const handleHits = [];
    const pointHits = [];
    const sel = st && st.shapePointSel;
    const selectedIndex = sel && Math.round(Number(sel.id) || 0) === Math.round(Number(r && r.id) || 0)
      ? Math.round(Number(sel.index) || 0)
      : -1;
    for (let i = pts.length - 1; i >= 0; i--) {
      const point = pts[i];
      if (isBezierPoint(point) && i === selectedIndex) {
        const ci = controlIn(point);
        const co = controlOut(point);
        if (Math.hypot(co.x - p.u, co.y - p.v) <= d) handleHits.push({ index: i, handle: "out" });
        if (Math.hypot(ci.x - p.u, ci.y - p.v) <= d) handleHits.push({ index: i, handle: "in" });
      }
      if (Math.hypot((Number(point.x) || 0) - p.u, (Number(point.y) || 0) - p.v) <= d) pointHits.push({ index: i, handle: "" });
    }
    return handleHits.concat(pointHits);
  };
  const shapeControlHit = (r, wx, wy, z = 1) => {
    if (!isShapeRect(r)) return null;
    const sel = st && st.shapePointSel;
    if (!sel || Math.round(Number(sel.id) || 0) !== Math.round(Number(r.id) || 0)) return null;
    const pts = shapePoints(r);
    const index = Math.round(Number(sel.index) || 0);
    const point = pts[index];
    if (!isBezierPoint(point)) return null;
    const p = worldToRectUV(r, wx, wy);
    const d = 9 / Math.max(0.25, Number(z) || 1);
    const ci = controlIn(point);
    const co = controlOut(point);
    if (Math.hypot(ci.x - p.u, ci.y - p.v) <= d) return { index, handle: "in" };
    if (Math.hypot(co.x - p.u, co.y - p.v) <= d) return { index, handle: "out" };
    return null;
  };
  const shapeSegmentHit = (r, wx, wy, z = 1) => {
    if (!isShapeRect(r)) return -1;
    const pts = shapePoints(r);
    if (pts.length < 3) return -1;
    const p = worldToRectUV(r, wx, wy);
    const d = 8 / Math.max(0.25, Number(z) || 1);
    let bestIndex = -1;
    let bestDist = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i];
      const b = pts[(i + 1) % pts.length];
      const flat = flattenShapeSegment(a, b, 14);
      let dd = Infinity;
      for (let j = 0; j < flat.length - 1; j++) {
        const cur = typeof distToSegment === "function"
          ? distToSegment(p.u, p.v, flat[j].x, flat[j].y, flat[j + 1].x, flat[j + 1].y)
          : Infinity;
        dd = Math.min(dd, cur);
      }
      if (dd <= d && dd < bestDist) {
        bestDist = dd;
        bestIndex = i;
      }
    }
    return bestIndex;
  };

  let lastShapeFillFrame = null;
  const drawShapeFillPass = (c, z, opts = null) => {
    const sourceRects = opts && Array.isArray(opts.shapeRectsOverride)
      ? opts.shapeRectsOverride
      : (Array.isArray(st && st.rects) ? st.rects : []);
    const shapes = sourceRects.filter(isShapeRect);
    if (!shapes.length) return;
    const canvas = c && c.canvas;
    const w = Math.max(1, Math.ceil(Number(canvas && canvas.width) || 0));
    const h = Math.max(1, Math.ceil(Number(canvas && canvas.height) || 0));
    const colorLayer = makeScratchCanvas(w, h);
    const maskLayer = makeScratchCanvas(w, h);
    const colorCtx = colorLayer && colorLayer.getContext ? colorLayer.getContext("2d") : null;
    const maskCtx = maskLayer && maskLayer.getContext ? maskLayer.getContext("2d") : null;
    if (!colorCtx || !maskCtx) return;
    const transform = typeof c.getTransform === "function" ? c.getTransform() : null;
    if (transform && typeof colorCtx.setTransform === "function") colorCtx.setTransform(transform);
    if (transform && typeof maskCtx.setTransform === "function") maskCtx.setTransform(transform);
    for (let i = shapes.length - 1; i >= 0; i--) {
      const r = shapes[i];
      const pts = shapeWorldPathPoints(r);
      if (pts.length < 3) continue;
      colorCtx.fillStyle = String(r.colorA || "#2fcaaf");
      colorCtx.globalAlpha = shapeOpacity(r);
      colorCtx.beginPath();
      drawShapePath(colorCtx, pts);
      colorCtx.fill();
    }
    colorCtx.globalAlpha = 1;
    maskCtx.beginPath();
    for (let i = shapes.length - 1; i >= 0; i--) {
      drawShapePath(maskCtx, shapeWorldPathPoints(shapes[i]));
    }
    maskCtx.fillStyle = "#fff";
    maskCtx.fill("evenodd");
    if (typeof colorCtx.setTransform === "function") colorCtx.setTransform(1, 0, 0, 1, 0, 0);
    colorCtx.globalCompositeOperation = "destination-in";
    colorCtx.drawImage(maskLayer, 0, 0);
    colorCtx.globalCompositeOperation = "source-over";
    c.save();
    if (typeof c.setTransform === "function") c.setTransform(1, 0, 0, 1, 0, 0);
    c.drawImage(colorLayer, 0, 0);
    c.restore();
  };

  const drawShapeOutline = (c, r, sel, z) => {
    const srcPts = shapePoints(r);
    const pts = shapeWorldPathPoints(r);
    if (pts.length < 3) return;
    c.save();
    c.strokeStyle = sel ? "rgba(13,110,253,.96)" : "rgba(31,41,55,.82)";
    c.lineWidth = Math.max(1, 1.4 / Math.max(0.25, Number(z) || 1));
    c.beginPath();
    drawShapePath(c, pts);
    c.stroke();
    if (sel) {
      const selectedIndex = Math.round(Number(st && st.shapePointSel && st.shapePointSel.id) || 0) === Math.round(Number(r.id) || 0)
        ? Math.round(Number(st.shapePointSel.index) || 0)
        : -1;
      const radius = Math.max(4, 5 / Math.max(0.25, Number(z) || 1));
      if (selectedIndex >= 0 && isBezierPoint(srcPts[selectedIndex])) {
        const p = srcPts[selectedIndex];
        const pw = rectUVToWorld(r, Number(p.x) || 0, Number(p.y) || 0);
        const ci = rectUVToWorld(r, (Number(p.x) || 0) + num(p.inX, -48), (Number(p.y) || 0) + num(p.inY, 0));
        const co = rectUVToWorld(r, (Number(p.x) || 0) + num(p.outX, 48), (Number(p.y) || 0) + num(p.outY, 0));
        c.strokeStyle = "rgba(255,193,7,.72)";
        c.lineWidth = Math.max(1, 1 / Math.max(0.25, Number(z) || 1));
        c.beginPath();
        c.moveTo(ci.x, ci.y);
        c.lineTo(pw.x, pw.y);
        c.lineTo(co.x, co.y);
        c.stroke();
      }
      for (let i = 0; i < pts.length; i++) {
        c.beginPath();
        c.arc(pts[i].x, pts[i].y, radius, 0, Math.PI * 2);
        c.fillStyle = i === selectedIndex ? "rgba(255,193,7,.98)" : "rgba(13,110,253,.95)";
        c.strokeStyle = "rgba(255,255,255,.95)";
        c.lineWidth = Math.max(1, 1 / Math.max(0.25, Number(z) || 1));
        c.fill();
        c.stroke();
      }
      if (selectedIndex >= 0 && isBezierPoint(srcPts[selectedIndex])) {
        const p = srcPts[selectedIndex];
        const handles = [
          rectUVToWorld(r, (Number(p.x) || 0) + num(p.inX, -48), (Number(p.y) || 0) + num(p.inY, 0)),
          rectUVToWorld(r, (Number(p.x) || 0) + num(p.outX, 48), (Number(p.y) || 0) + num(p.outY, 0))
        ];
        const rr = radius * 1.08;
        for (const hp of handles) {
          c.beginPath();
          c.moveTo(hp.x, hp.y - rr);
          c.lineTo(hp.x + rr, hp.y);
          c.lineTo(hp.x, hp.y + rr);
          c.lineTo(hp.x - rr, hp.y);
          c.closePath();
          c.fillStyle = "rgba(255,193,7,.98)";
          c.strokeStyle = "rgba(40,40,40,.82)";
          c.lineWidth = Math.max(1, 1.15 / Math.max(0.25, Number(z) || 1));
          c.fill();
          c.stroke();
        }
      }
    }
    c.restore();
  };

  const drawShapeRect = (c, r, sel, z, opts = null) => {
    const frameId = opts && Object.prototype.hasOwnProperty.call(opts, "shapeFrameId") ? opts.shapeFrameId : null;
    if (frameId != null) {
      if (lastShapeFillFrame !== frameId) {
        lastShapeFillFrame = frameId;
        drawShapeFillPass(c, z, opts);
      }
      drawShapeOutline(c, r, sel, z);
      return;
    }
    drawShapeFillPass(c, z, opts);
    drawShapeOutline(c, r, sel, z);
  };

  return {
    isShapeRect,
    normalizeShapeBounds,
    pointInShape,
    shapePointHit,
    shapePointHits,
    shapeEditHits,
    shapeControlHit,
    shapeSegmentHit,
    drawShapeRect
  };
};
