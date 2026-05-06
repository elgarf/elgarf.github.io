import { isScreenRectKind } from "../utils/rect-kind-utils.js";

export const setupShapeInputController = (deps = {}) => {
  const {
    st,
    render,
    getRectById,
    cur,
    selRect,
    isRectLocked,
    isShapeRect,
    mkShape,
    setMode,
    refreshPanels,
    schedulePersist,
    syncProps,
    syncPropsSmart,
    worldToRectUV,
    rectUVToWorld,
    drawCellX,
    drawCellY,
    shapePointHit,
    shapePointHits,
    shapeEditHits,
    shapeSegmentHit,
    normalizeShapeBounds
  } = deps;

  const zoomSafe = z => Math.max(0.25, Number(z) || 1);

  const ensureShapeDraft = () => {
    if (!st.shapeDraft || !Array.isArray(st.shapeDraft.points)) st.shapeDraft = { points: [] };
    return st.shapeDraft;
  };

  const clearShapeDraft = () => {
    st.shapeDraft = null;
  };

  const finalizeShapeDraft = () => {
    const d = st.shapeDraft;
    const pts = d && Array.isArray(d.points) ? d.points : [];
    if (pts.length < 3) return false;
    const created = typeof mkShape === "function" ? mkShape(pts) : null;
    clearShapeDraft();
    if (created) {
      st.rects.unshift(created);
      setMode("select");
      selRect(created.id);
      refreshPanels();
      schedulePersist("project");
    }
    render();
    return true;
  };

  const isScreenRect = r => isScreenRectKind(r);

  const findShapeEditHit = p => {
    if (!Array.isArray(st && st.rects)) return null;
    for (let i = 0; i < st.rects.length; i++) {
      const r = st.rects[i];
      if (!r || typeof isShapeRect !== "function" || !isShapeRect(r) || isRectLocked(r)) continue;
      const pointIndex = typeof shapePointHit === "function" ? shapePointHit(r, p.x, p.y, st.zoom) : -1;
      if (pointIndex >= 0) return { rect: r, pointIndex, segmentIndex: -1 };
      const segmentIndex = typeof shapeSegmentHit === "function" ? shapeSegmentHit(r, p.x, p.y, st.zoom) : -1;
      if (segmentIndex >= 0) return { rect: r, pointIndex: -1, segmentIndex };
    }
    return null;
  };

  const nearestShapeSnapOnScreen = p => {
    if (!p || typeof worldToRectUV !== "function" || typeof rectUVToWorld !== "function") return p;
    if (!Array.isArray(st && st.rects)) return p;
    const threshold = 10 / zoomSafe(st.zoom);
    for (let i = 0; i < st.rects.length; i++) {
      const r = st.rects[i];
      if (!isScreenRect(r)) continue;
      const uv = worldToRectUV(r, p.x, p.y);
      if (!uv || uv.u < 0 || uv.u > r.width || uv.v < 0 || uv.v > r.height) continue;
      const snapAxis = (value, max, step) => {
        const candidates = [0, max];
        const safeStep = Math.max(1, Number(step) || 1);
        candidates.push(Math.max(0, Math.min(max, Math.round(value / safeStep) * safeStep)));
        let best = Number(value) || 0;
        let bestDist = Infinity;
        for (const candidate of candidates) {
          const d = Math.abs((Number(candidate) || 0) - value);
          if (d < bestDist) {
            bestDist = d;
            best = Number(candidate) || 0;
          }
        }
        return bestDist <= threshold ? best : value;
      };
      const stepX = Math.max(1, (typeof drawCellX === "function" ? drawCellX(r) : 128) / 4);
      const stepY = Math.max(1, (typeof drawCellY === "function" ? drawCellY(r) : 128) / 4);
      const u = snapAxis(Number(uv.u) || 0, Math.max(0, Number(r.width) || 0), stepX);
      const v = snapAxis(Number(uv.v) || 0, Math.max(0, Number(r.height) || 0), stepY);
      if (Math.abs(u - uv.u) <= 1e-6 && Math.abs(v - uv.v) <= 1e-6) return p;
      return rectUVToWorld(r, u, v);
    }
    return p;
  };

  const snapShapePoint = (p, opts = null) => {
    const o = (opts && typeof opts === "object") ? opts : {};
    if (o.disableSnap || o.ctrlSnap || o.ctrlKey) return p;
    return nearestShapeSnapOnScreen(p);
  };

  const chooseShapePointHitIndex = (r, wx, wy) => {
    const hits = typeof shapePointHits === "function" ? shapePointHits(r, wx, wy, st.zoom) : [];
    if (!Array.isArray(hits) || !hits.length) return typeof shapePointHit === "function" ? shapePointHit(r, wx, wy, st.zoom) : -1;
    const sel = st && st.shapePointSel;
    const sameRect = sel && Math.round(Number(sel.id) || 0) === Math.round(Number(r && r.id) || 0);
    const current = sameRect ? Math.round(Number(sel.index) || 0) : null;
    if (sameRect && hits.length > 1 && hits.includes(current)) {
      const pos = hits.indexOf(current);
      return hits[(pos + 1) % hits.length];
    }
    return hits[0];
  };

  const chooseShapeEditHit = (r, wx, wy) => {
    const hits = typeof shapeEditHits === "function" ? shapeEditHits(r, wx, wy, st.zoom) : [];
    if (!Array.isArray(hits) || !hits.length) {
      const index = chooseShapePointHitIndex(r, wx, wy);
      return index >= 0 ? { index, handle: "" } : null;
    }
    const sel = st && st.shapePointSel;
    const drag = st && st.shapePointDrag;
    const sameRect = sel && Math.round(Number(sel.id) || 0) === Math.round(Number(r && r.id) || 0);
    const currentIndex = sameRect ? Math.round(Number(sel.index) || 0) : null;
    const currentHandle = drag && Math.round(Number(drag.id) || 0) === Math.round(Number(r && r.id) || 0) && Math.round(Number(drag.index) || 0) === currentIndex
      ? String(drag.handle || "")
      : "";
    const handleHits = hits.filter(hit => hit && String(hit.handle || ""));
    if (handleHits.length) {
      const currentHandlePos = handleHits.findIndex(hit => hit && hit.index === currentIndex && String(hit.handle || "") === currentHandle);
      if (sameRect && currentHandle && handleHits.length > 1 && currentHandlePos >= 0) return handleHits[(currentHandlePos + 1) % handleHits.length];
      return handleHits[0];
    }
    const currentPos = hits.findIndex(hit => hit && hit.index === currentIndex && String(hit.handle || "") === currentHandle);
    if (sameRect && hits.length > 1 && currentPos >= 0) return hits[(currentPos + 1) % hits.length];
    return hits[0];
  };

  const shapeDraftCloseHit = p => {
    const d = st.shapeDraft;
    const pts = d && Array.isArray(d.points) ? d.points : [];
    if (pts.length < 3) return false;
    const first = pts[0];
    const radius = 11 / zoomSafe(st.zoom);
    return Math.hypot((Number(first.x) || 0) - p.x, (Number(first.y) || 0) - p.y) <= radius;
  };

  const handlePointerDownShape = (p, opts = null) => {
    if (st.mode !== "shape") return false;
    const sp = snapShapePoint(p, opts);
    if (st.shapeDraft && Math.round(Number(opts && opts.clickCount) || 1) > 1) {
      finalizeShapeDraft();
      st.shapeSuppressNextDoubleClick = true;
      return true;
    }
    const d = ensureShapeDraft();
    const pts = d.points;
    if (shapeDraftCloseHit(p)) {
      finalizeShapeDraft();
      return true;
    }
    if (!pts.length) {
      const editHit = findShapeEditHit(p);
      if (editHit && editHit.rect) {
        const r = editHit.rect;
        if (editHit.segmentIndex >= 0 && Array.isArray(r.shapePoints)) {
          const uv = worldToRectUV(r, sp.x, sp.y);
          const insertAt = Math.max(0, Math.min(r.shapePoints.length, editHit.segmentIndex + 1));
          r.shapePoints.splice(insertAt, 0, { x: Math.round(Number(uv.u) || 0), y: Math.round(Number(uv.v) || 0) });
          if (typeof normalizeShapeBounds === "function") normalizeShapeBounds(r);
          st.shapePointSel = { id: r.id, index: insertAt };
          setMode("select");
          selRect(r.id);
          refreshPanels();
          schedulePersist("project");
          render();
          return true;
        }
        if (editHit.pointIndex >= 0) {
          st.shapePointSel = { id: r.id, index: editHit.pointIndex };
          setMode("select");
          selRect(r.id);
          syncProps();
          render();
          return true;
        }
      }
    }
    const last = pts[pts.length - 1];
    if (!last || Math.hypot((Number(last.x) || 0) - sp.x, (Number(last.y) || 0) - sp.y) > 0.001) {
      pts.push({ x: Math.round(sp.x), y: Math.round(sp.y) });
    }
    d.pointerX = sp.x;
    d.pointerY = sp.y;
    render();
    return true;
  };

  const handlePointerDownSelectedShape = (p, opts = null) => {
    if (st.mode !== "select" || opts?.shiftToggle) return false;
    const selectedShape = cur();
    if (!selectedShape || typeof isShapeRect !== "function" || !isShapeRect(selectedShape) || isRectLocked(selectedShape)) return false;
    const selectedEditHit = chooseShapeEditHit(selectedShape, p.x, p.y);
    if (!selectedEditHit) return false;
    st.shapePointSel = { id: selectedShape.id, index: selectedEditHit.index };
    st.shapePointDrag = { id: selectedShape.id, index: selectedEditHit.index, handle: selectedEditHit.handle || "", changed: false };
    syncProps();
    render();
    return true;
  };

  const handlePointerDownHitShape = (h, p, opts = null, isSelectedRectId = () => false) => {
    if (st.mode !== "select" || !h || typeof isShapeRect !== "function" || !isShapeRect(h) || isRectLocked(h) || typeof shapePointHit !== "function") return false;
    if (opts?.shiftToggle) {
      selRect(h.id, { toggle: true });
      st.shapePointSel = null;
      syncProps();
      render();
      return true;
    }
    if (!isSelectedRectId(h.id)) {
      selRect(h.id);
      syncProps();
      render();
      return true;
    }
    const editHit = chooseShapeEditHit(h, p.x, p.y);
    if (editHit && editHit.handle) {
      st.shapePointSel = { id: h.id, index: editHit.index };
      st.shapePointDrag = { id: h.id, index: editHit.index, handle: editHit.handle, changed: false };
      syncProps();
      render();
      return true;
    }
    const pointIndex = editHit ? editHit.index : chooseShapePointHitIndex(h, p.x, p.y);
    if (pointIndex >= 0) {
      st.shapePointSel = { id: h.id, index: pointIndex };
      st.shapePointDrag = { id: h.id, index: pointIndex, changed: false };
      syncProps();
      render();
      return true;
    }
    if (st.shapePointSel && Math.round(Number(st.shapePointSel.id) || 0) === Math.round(Number(h.id) || 0)) {
      st.shapePointSel = null;
      syncProps();
      render();
    }
    return false;
  };

  const handlePointerMove = (p, opts = null) => {
    const o = (opts && typeof opts === "object") ? opts : {};
    if (st.shapePointDrag) {
      const drag = st.shapePointDrag;
      const r = getRectById(drag.id);
      if (!r || !isShapeRect(r) || isRectLocked(r) || !Array.isArray(r.shapePoints)) {
        st.shapePointDrag = null;
        return false;
      }
      const sp = snapShapePoint(p, o);
      const uv = worldToRectUV(r, sp.x, sp.y);
      const index = Math.max(0, Math.min(r.shapePoints.length - 1, Math.round(Number(drag.index) || 0)));
      const point = r.shapePoints[index] || {};
      if (drag.handle === "in" || drag.handle === "out") {
        const keyX = drag.handle === "in" ? "inX" : "outX";
        const keyY = drag.handle === "in" ? "inY" : "outY";
        point.type = "bezier";
        point[keyX] = Math.round((Number(uv.u) || 0) - (Number(point.x) || 0));
        point[keyY] = Math.round((Number(uv.v) || 0) - (Number(point.y) || 0));
      } else {
        r.shapePoints[index] = { ...point, x: Math.round(Number(uv.u) || 0), y: Math.round(Number(uv.v) || 0) };
      }
      if (typeof normalizeShapeBounds === "function") normalizeShapeBounds(r);
      drag.changed = true;
      if (typeof syncPropsSmart === "function") syncPropsSmart();
      render();
      return true;
    }
    if (st.mode === "shape" && st.shapeDraft) {
      const sp = snapShapePoint(p, o);
      st.shapeDraft.pointerX = sp.x;
      st.shapeDraft.pointerY = sp.y;
      render();
      return true;
    }
    return false;
  };

  const selectedHandleHit = p => {
    const selectedShape = cur();
    if (!selectedShape || typeof isShapeRect !== "function" || !isShapeRect(selectedShape) || isRectLocked(selectedShape)) return null;
    const hit = chooseShapeEditHit(selectedShape, p.x, p.y);
    return hit && hit.handle ? hit : null;
  };

  const handleDoubleClickShape = (p, preventDefault = () => { }) => {
    if (st.shapeSuppressNextDoubleClick) {
      st.shapeSuppressNextDoubleClick = false;
      preventDefault();
      return true;
    }
    if (st.mode === "shape" && st.shapeDraft && finalizeShapeDraft()) {
      preventDefault();
      return true;
    }
    return false;
  };

  const handleDoubleClickHitShape = (h, p, preventDefault = () => { }) => {
    if (!h || typeof isShapeRect !== "function" || !isShapeRect(h)) return false;
    if (h.id !== st.sel) selRect(h.id);
    const pointIndex = typeof shapePointHit === "function" ? shapePointHit(h, p.x, p.y, st.zoom) : -1;
    if (pointIndex >= 0 && Array.isArray(h.shapePoints) && h.shapePoints.length > 3) {
      h.shapePoints.splice(pointIndex, 1);
      if (typeof normalizeShapeBounds === "function") normalizeShapeBounds(h);
      st.shapePointSel = null;
      schedulePersist("project");
      syncProps();
      render();
      preventDefault();
    }
    return true;
  };

  return {
    chooseShapeEditHit,
    finalizeShapeDraft,
    handlePointerDownShape,
    handlePointerDownSelectedShape,
    handlePointerDownHitShape,
    handlePointerMove,
    handleDoubleClickShape,
    handleDoubleClickHitShape,
    selectedHandleHit
  };
};
