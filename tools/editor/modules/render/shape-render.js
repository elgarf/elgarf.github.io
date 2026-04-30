export const setupShapeRender = (deps = {}) => {
  const {
    st,
    rectUVToWorld,
    worldToRectUV,
    pointInPoly,
    distToSegment
  } = deps;

  const isShapeRect = r => String((r && r.kind) || "").toLowerCase() === "shape";
  const shapePoints = r => Array.isArray(r && r.shapePoints) ? r.shapePoints : [];
  const shapeWorldPoints = r => shapePoints(r).map(p => rectUVToWorld(r, Number(p.x) || 0, Number(p.y) || 0));
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
    r.shapePoints = pts.map(p => ({ x: Math.round((Number(p.x) || 0) - minX), y: Math.round((Number(p.y) || 0) - minY) }));
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
    return pointInPoly(p.u, p.v, shapePoints(r));
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
      const dd = typeof distToSegment === "function"
        ? distToSegment(p.u, p.v, Number(a.x) || 0, Number(a.y) || 0, Number(b.x) || 0, Number(b.y) || 0)
        : Infinity;
      if (dd <= d && dd < bestDist) {
        bestDist = dd;
        bestIndex = i;
      }
    }
    return bestIndex;
  };

  const drawPath = (c, pts) => {
    if (!pts || pts.length < 3) return false;
    c.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) c.lineTo(pts[i].x, pts[i].y);
    c.closePath();
    return true;
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
      const pts = shapeWorldPoints(r);
      if (pts.length < 3) continue;
      colorCtx.fillStyle = String(r.colorA || "#2fcaaf");
      colorCtx.globalAlpha = shapeOpacity(r);
      colorCtx.beginPath();
      drawPath(colorCtx, pts);
      colorCtx.fill();
    }
    colorCtx.globalAlpha = 1;
    maskCtx.beginPath();
    for (let i = shapes.length - 1; i >= 0; i--) drawPath(maskCtx, shapeWorldPoints(shapes[i]));
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
    const pts = shapeWorldPoints(r);
    if (pts.length < 3) return;
    c.save();
    c.strokeStyle = sel ? "rgba(13,110,253,.96)" : "rgba(31,41,55,.82)";
    c.lineWidth = Math.max(1, 1.4 / Math.max(0.25, Number(z) || 1));
    c.beginPath();
    drawPath(c, pts);
    c.stroke();
    if (sel) {
      const selectedIndex = Math.round(Number(st && st.shapePointSel && st.shapePointSel.id) || 0) === Math.round(Number(r.id) || 0)
        ? Math.round(Number(st.shapePointSel.index) || 0)
        : -1;
      const radius = Math.max(4, 5 / Math.max(0.25, Number(z) || 1));
      for (let i = 0; i < pts.length; i++) {
        c.beginPath();
        c.arc(pts[i].x, pts[i].y, radius, 0, Math.PI * 2);
        c.fillStyle = i === selectedIndex ? "rgba(255,193,7,.98)" : "rgba(13,110,253,.95)";
        c.strokeStyle = "rgba(255,255,255,.95)";
        c.lineWidth = Math.max(1, 1 / Math.max(0.25, Number(z) || 1));
        c.fill();
        c.stroke();
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
    shapeSegmentHit,
    drawShapeRect
  };
};
