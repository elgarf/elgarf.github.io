const zoomSafe = zoom => Math.max(0.25, Number(zoom) || 1);
const scaleSafe = value => Math.max(1, Number(value) || 256);

export const rigTopPadForRect = (rect, mode) => (
  mode === "rigEdit" ? Math.max(8, 0.22 * scaleSafe(rect && rect.scale)) : 0
);

export const hitShapeRect = ({
  rect,
  x,
  y,
  zoom,
  isShapeRect,
  shapePointHit,
  pointInShape
} = {}) => {
  if (!rect || typeof isShapeRect !== "function" || !isShapeRect(rect)) return false;
  if (typeof shapePointHit === "function" && shapePointHit(rect, x, y, zoomSafe(zoom)) >= 0) return true;
  return !!(typeof pointInShape === "function" && pointInShape(rect, x, y));
};

export const hitRectBody = ({
  rect,
  x,
  y,
  mode,
  worldToRectUV,
  rectAABBMasked,
  cellFromWorldPoint
} = {}) => {
  if (!rect || typeof worldToRectUV !== "function") return false;
  if (typeof rectAABBMasked === "function") {
    const bb = rectAABBMasked(rect);
    const pad = rigTopPadForRect(rect, mode);
    if (x < bb.minX - pad || x > bb.maxX + pad || y < bb.minY - pad || y > bb.maxY + pad) return false;
  }
  const p = worldToRectUV(rect, x, y);
  const inRect = p.u >= 0 && p.u <= rect.width && p.v >= 0 && p.v <= rect.height;
  const rigTopPad = rigTopPadForRect(rect, mode);
  const inRigTopPad = mode === "rigEdit"
    && p.u >= 0
    && p.u <= rect.width
    && p.v >= -rigTopPad
    && p.v < 0;
  if (!inRect && !inRigTopPad) return false;
  if (String(rect?.type || "") !== "note" && inRect && typeof cellFromWorldPoint === "function" && !cellFromWorldPoint(rect, x, y, true)) return false;
  return true;
};

export const createEditorHitTest = ({
  st,
  isRectLocked,
  isShapeRect,
  shapePointHit,
  pointInShape,
  worldToRectUV,
  rectAABBMasked,
  cellFromWorldPoint
} = {}) => {
  const shapeHitEnabled = () => {
    const mode = String(st && st.mode || "");
    if (mode === "shape") return true;
    const installView = String(st && st.viewMode || "") === "install";
    if (!installView) return true;
    const layers = (st && st.installLayers && typeof st.installLayers === "object") ? st.installLayers : {};
    return layers.contours !== false;
  };
  const hit = (x, y) => {
    const rects = Array.isArray(st && st.rects) ? st.rects : [];
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (typeof isRectLocked === "function" && isRectLocked(rect)) continue;
      if (String(st && st.viewMode || "") === "install") {
        const isDeviceRect = String((rect && rect.kind) || "").toLowerCase() === "device";
        const layers = (st && st.installLayers && typeof st.installLayers === "object") ? st.installLayers : {};
        if (isDeviceRect && layers.devices === false) continue;
      }
      if (shapeHitEnabled() && hitShapeRect({ rect, x, y, zoom: st && st.zoom, isShapeRect, shapePointHit, pointInShape })) return rect;
      if (typeof isShapeRect === "function" && isShapeRect(rect)) continue;
      if (hitRectBody({ rect, x, y, mode: st && st.mode, worldToRectUV, rectAABBMasked, cellFromWorldPoint })) return rect;
    }
    return null;
  };
  return { hit };
};
