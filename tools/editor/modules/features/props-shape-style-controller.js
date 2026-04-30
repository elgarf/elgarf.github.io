export const shapeOpacityValue = rect => {
  const value = Number(rect && rect.shapeOpacity);
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.72;
};

export const shapeTransparencyPercent = rect => Math.round((1 - shapeOpacityValue(rect)) * 100);

export const shapeOpacityFromTransparencyInput = ({ inputValue, fallbackRect, evalExpr } = {}) => {
  const fallback = shapeTransparencyPercent(fallbackRect);
  const transparency = Math.max(0, Math.min(100, evalExpr(inputValue, fallback)));
  return Math.max(0, Math.min(1, 1 - transparency / 100));
};

export const scaleShapePointsForRectResize = ({ rect, oldWidth, oldHeight, normalizeShapeBounds } = {}) => {
  if (!rect || !Array.isArray(rect.shapePoints)) return false;
  const sx = Math.max(0.000001, (Number(rect.width) || oldWidth) / Math.max(1, Number(oldWidth) || 1));
  const sy = Math.max(0.000001, (Number(rect.height) || oldHeight) / Math.max(1, Number(oldHeight) || 1));
  rect.shapePoints = rect.shapePoints.map(point => ({
    ...point,
    x: Math.round((Number(point.x) || 0) * sx),
    y: Math.round((Number(point.y) || 0) * sy),
    inX: point.inX == null ? point.inX : Math.round((Number(point.inX) || 0) * sx),
    inY: point.inY == null ? point.inY : Math.round((Number(point.inY) || 0) * sy),
    outX: point.outX == null ? point.outX : Math.round((Number(point.outX) || 0) * sx),
    outY: point.outY == null ? point.outY : Math.round((Number(point.outY) || 0) * sy)
  }));
  if (typeof normalizeShapeBounds === "function") normalizeShapeBounds(rect);
  return true;
};
