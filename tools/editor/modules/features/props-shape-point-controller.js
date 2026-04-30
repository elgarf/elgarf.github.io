export const getSelectedShapePoint = ({ st, rect, isShapeRect } = {}) => {
  if (!rect || typeof isShapeRect !== "function" || !isShapeRect(rect)) return null;
  const sel = st && st.shapePointSel;
  if (!sel || Math.round(Number(sel.id) || 0) !== Math.round(Number(rect.id) || 0)) return null;
  const points = Array.isArray(rect.shapePoints) ? rect.shapePoints : [];
  const index = Math.round(Number(sel.index) || 0);
  if (index < 0 || index >= points.length) return null;
  return { index, point: points[index] };
};

export const syncShapePointPanel = ({
  st,
  el,
  rect,
  isShapeRect,
  isRectLocked,
  uiSetDisabled,
  uiSetValue,
  uiSetChecked,
  rectUVToWorld
} = {}) => {
  const selected = getSelectedShapePoint({ st, rect, isShapeRect });
  const show = !!selected;
  if (el.shapePointPanel) el.shapePointPanel.classList.toggle("d-none", !show);
  if (el.shapePointX) uiSetDisabled(el.shapePointX, !show || isRectLocked(rect));
  if (el.shapePointY) uiSetDisabled(el.shapePointY, !show || isRectLocked(rect));
  if (el.shapePointType) uiSetDisabled(el.shapePointType, !show || isRectLocked(rect));
  if (!show) {
    uiSetValue(el.shapePointX, "");
    uiSetValue(el.shapePointY, "");
    uiSetChecked(el.shapePointType, false);
    return;
  }
  const wp = typeof rectUVToWorld === "function"
    ? rectUVToWorld(rect, Number(selected.point.x) || 0, Number(selected.point.y) || 0)
    : {
      x: (Number(rect.x) || 0) + (Number(selected.point.x) || 0),
      y: (Number(rect.y) || 0) + (Number(selected.point.y) || 0)
    };
  uiSetValue(el.shapePointX, Math.round(Number(wp.x) || 0));
  uiSetValue(el.shapePointY, Math.round(Number(wp.y) || 0));
  uiSetChecked(el.shapePointType, String(selected.point.type || "") === "bezier");
};

export const applyShapePointProps = ({
  st,
  el,
  rect,
  shouldApply,
  isShapeRect,
  evalExpr,
  rectUVToWorld,
  worldToRectUV,
  normalizeShapeBounds
} = {}) => {
  if (!rect || typeof shouldApply !== "function" || typeof worldToRectUV !== "function") return false;
  if (!(shouldApply("shapePointX") || shouldApply("shapePointY") || shouldApply("shapePointType"))) return false;
  const selectedPoint = getSelectedShapePoint({ st, rect, isShapeRect });
  if (!selectedPoint) return false;
  const point = rect.shapePoints[selectedPoint.index] || selectedPoint.point || {};
  if (shouldApply("shapePointType")) {
    if (!!(el.shapePointType && el.shapePointType.checked)) {
      point.type = "bezier";
      if (!Number.isFinite(Number(point.inX))) point.inX = -48;
      if (!Number.isFinite(Number(point.inY))) point.inY = 0;
      if (!Number.isFinite(Number(point.outX))) point.outX = 48;
      if (!Number.isFinite(Number(point.outY))) point.outY = 0;
    } else {
      delete point.type;
    }
  }
  const currentWorld = typeof rectUVToWorld === "function"
    ? rectUVToWorld(rect, Number(selectedPoint.point.x) || 0, Number(selectedPoint.point.y) || 0)
    : {
      x: (Number(rect.x) || 0) + (Number(selectedPoint.point.x) || 0),
      y: (Number(rect.y) || 0) + (Number(selectedPoint.point.y) || 0)
    };
  const nextWorld = {
    x: shouldApply("shapePointX") ? Math.round(evalExpr(el.shapePointX && el.shapePointX.value, currentWorld.x)) : currentWorld.x,
    y: shouldApply("shapePointY") ? Math.round(evalExpr(el.shapePointY && el.shapePointY.value, currentWorld.y)) : currentWorld.y
  };
  const uv = worldToRectUV(rect, nextWorld.x, nextWorld.y);
  rect.shapePoints[selectedPoint.index] = {
    ...point,
    x: Math.round(Number(uv.u) || 0),
    y: Math.round(Number(uv.v) || 0)
  };
  if (typeof normalizeShapeBounds === "function") normalizeShapeBounds(rect);
  return true;
};
