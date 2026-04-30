export const num = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;

export const shapePoint = p => ({ x: Number(p && p.x) || 0, y: Number(p && p.y) || 0 });

export const isBezierPoint = p => String((p && p.type) || "") === "bezier";

export const controlIn = p => ({
  x: (Number(p && p.x) || 0) + num(p && p.inX, -48),
  y: (Number(p && p.y) || 0) + num(p && p.inY, 0)
});

export const controlOut = p => ({
  x: (Number(p && p.x) || 0) + num(p && p.outX, 48),
  y: (Number(p && p.y) || 0) + num(p && p.outY, 0)
});

export const cubicPoint = (a, c1, c2, b, t) => {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * a.x + 3 * mt * mt * t * c1.x + 3 * mt * t * t * c2.x + t * t * t * b.x,
    y: mt * mt * mt * a.y + 3 * mt * mt * t * c1.y + 3 * mt * t * t * c2.y + t * t * t * b.y
  };
};

export const flattenShapeSegment = (a, b, steps = 16) => {
  const a0 = shapePoint(a);
  const b0 = shapePoint(b);
  if (!isBezierPoint(a) && !isBezierPoint(b)) return [a0, b0];
  const c1 = isBezierPoint(a) ? controlOut(a) : a0;
  const c2 = isBezierPoint(b) ? controlIn(b) : b0;
  const out = [a0];
  const safeSteps = Math.max(1, Math.round(Number(steps) || 1));
  for (let s = 1; s <= safeSteps; s++) out.push(cubicPoint(a0, c1, c2, b0, s / safeSteps));
  return out;
};

export const flattenShapePoints = (points, steps = 16) => {
  const pts = Array.isArray(points) ? points : [];
  if (pts.length < 3) return pts.map(shapePoint);
  const out = [shapePoint(pts[0])];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    if (i === pts.length - 1 && !isBezierPoint(a) && !isBezierPoint(b)) continue;
    const segment = flattenShapeSegment(a, b, steps);
    for (let j = 1; j < segment.length; j++) out.push(segment[j]);
  }
  return out;
};

export const drawShapePath = (ctx, points) => {
  const pts = Array.isArray(points) ? points : [];
  if (!ctx || pts.length < 3) return false;
  ctx.moveTo(Number(pts[0].x) || 0, Number(pts[0].y) || 0);
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const b0 = shapePoint(b);
    if (isBezierPoint(a) || isBezierPoint(b)) {
      const c1 = isBezierPoint(a) ? controlOut(a) : shapePoint(a);
      const c2 = isBezierPoint(b) ? controlIn(b) : b0;
      ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, b0.x, b0.y);
    } else {
      ctx.lineTo(b0.x, b0.y);
    }
  }
  ctx.closePath();
  return true;
};

export const makeShapePath2D = points => {
  if (typeof Path2D === "undefined") return null;
  const pts = Array.isArray(points) ? points : [];
  if (pts.length < 3) return null;
  const path = new Path2D();
  drawShapePath(path, pts);
  return path;
};
