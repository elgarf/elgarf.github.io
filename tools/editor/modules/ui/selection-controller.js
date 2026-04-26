export const setupSelectionController = (deps = {}) => {
  const {
    st,
    getRectById,
    isRectLocked,
    rectAABB,
    rectAABBMasked,
    rectIntersectsSelectionBoxVisible,
    refreshPropsListRender
  } = deps;

  const getRectsBBox = rects => {
    const list = Array.isArray(rects) ? rects : [];
    if (!list.length) return null;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const r of list) {
      const bb = rectAABB(r);
      if (!bb) continue;
      if (bb.minX < minX) minX = bb.minX;
      if (bb.minY < minY) minY = bb.minY;
      if (bb.maxX > maxX) maxX = bb.maxX;
      if (bb.maxY > maxY) maxY = bb.maxY;
    }
    if (!(Number.isFinite(minX) && Number.isFinite(minY) && Number.isFinite(maxX) && Number.isFinite(maxY))) return null;
    return { minX, minY, maxX, maxY, width: Math.max(0, maxX - minX), height: Math.max(0, maxY - minY) };
  };

  const normSelSet = () => {
    if (!(st.selSet instanceof Set)) st.selSet = new Set();
    for (const id of [...st.selSet]) {
      const rr = getRectById(id);
      if (!rr || isRectLocked(rr)) st.selSet.delete(id);
    }
    if (st.sel != null) {
      const sr = getRectById(st.sel);
      if (sr && !isRectLocked(sr)) st.selSet.add(st.sel);
    }
    if (!st.selSet.size) st.sel = null;
    if (st.sel != null && !st.selSet.has(st.sel)) st.sel = [...st.selSet][0] || null;
  };

  const refreshMultiSelectionBase = () => {
    normSelSet();
    const rects = [];
    for (const id of st.selSet) {
      const r = getRectById(id);
      if (r) rects.push(r);
    }
    if (rects.length <= 1) { st.selMultiBase = null; return; }
    const bbox = getRectsBBox(rects);
    if (!bbox) { st.selMultiBase = null; return; }
    const items = rects.map(r => {
      const bb = rectAABB(r);
      return {
        id: r.id,
        x: r.x,
        y: r.y,
        rotation: Number(r.rotation) || 0,
        minX: bb.minX,
        maxX: bb.maxX,
        minY: bb.minY,
        maxY: bb.maxY,
        w: Math.max(0, bb.maxX - bb.minX),
        h: Math.max(0, bb.maxY - bb.minY),
        cx: (bb.minX + bb.maxX) / 2,
        cy: (bb.minY + bb.maxY) / 2
      };
    });
    const ids = [...st.selSet].sort((a, b) => a - b);
    const activeItem = items.find(it => it.id === st.sel) || items[0];
    st.selMultiBase = { idsKey: ids.join(","), bbox, items, activeRotation: activeItem ? Number(activeItem.rotation) || 0 : 0 };
  };

  const setSelection = (ids, activeId = null) => {
    const next = new Set((Array.isArray(ids) ? ids : []).filter(id => {
      const rr = getRectById(id);
      return !!rr && !isRectLocked(rr);
    }));
    st.selSet = next;
    st.sel = (activeId != null && next.has(activeId)) ? activeId : ([...(next || [])][0] || null);
    refreshMultiSelectionBase();
  };

  const selBoxBounds = box => {
    if (!box) return null;
    return {
      minX: Math.min(Number(box.sx) || 0, Number(box.x) || 0),
      minY: Math.min(Number(box.sy) || 0, Number(box.y) || 0),
      maxX: Math.max(Number(box.sx) || 0, Number(box.x) || 0),
      maxY: Math.max(Number(box.sy) || 0, Number(box.y) || 0)
    };
  };

  const boxSize = box => {
    const b = selBoxBounds(box);
    if (!b) return { w: 0, h: 0 };
    return { w: Math.max(0, b.maxX - b.minX), h: Math.max(0, b.maxY - b.minY) };
  };

  const rectIntersectsBox = (bb, b) => {
    if (!bb || !b) return false;
    return !(bb.maxX < b.minX || bb.minX > b.maxX || bb.maxY < b.minY || bb.minY > b.maxY);
  };

  const beginSelectionBox = (p, append = false, touch = false) => {
    st.selBox = { sx: p.x, sy: p.y, x: p.x, y: p.y, append: !!append, touch: !!touch, moved: false };
  };

  const updateSelectionBox = p => {
    if (!st.selBox) return;
    st.selBox.x = p.x;
    st.selBox.y = p.y;
    const s = boxSize(st.selBox);
    if (s.w > 2 / st.zoom || s.h > 2 / st.zoom) st.selBox.moved = true;
  };

  const finishSelectionBox = () => {
    const box = st.selBox;
    st.selBox = null;
    if (!box) return false;
    const b = selBoxBounds(box);
    const s = boxSize(box);
    const clickLike = s.w < 3 / st.zoom && s.h < 3 / st.zoom;
    if (clickLike) {
      if (!box.append) setSelection([], null);
      refreshPropsListRender();
      return true;
    }
    const intersects = typeof rectIntersectsSelectionBoxVisible === "function"
      ? rectIntersectsSelectionBoxVisible
      : ((r, boxBounds) => rectIntersectsBox(rectAABBMasked(r), boxBounds));
    const ids = st.rects
      .filter(r => !isRectLocked(r) && intersects(r, b))
      .map(r => r.id);
    if (box.append) {
      normSelSet();
      const set = new Set(st.selSet);
      for (const id of ids) set.add(id);
      setSelection([...set], ids[ids.length - 1] || st.sel || null);
    } else {
      setSelection(ids, ids[ids.length - 1] || null);
    }
    refreshPropsListRender();
    return true;
  };

  const isSelected = id => {
    normSelSet();
    return st.selSet.has(id);
  };

  const getSelectedRects = () => {
    normSelSet();
    const out = [];
    for (const id of st.selSet) {
      const r = getRectById(id);
      if (r) out.push(r);
    }
    return out;
  };

  const selectOnly = id => setSelection(id == null ? [] : [id], id);

  const toggleSelect = id => {
    normSelSet();
    if (id == null) return;
    const rr = getRectById(id);
    if (!rr || isRectLocked(rr)) return;
    if (st.selSet.has(id)) st.selSet.delete(id);
    else st.selSet.add(id);
    st.sel = st.selSet.has(id) ? id : ([...(st.selSet || [])][0] || null);
    refreshMultiSelectionBase();
  };

  return {
    getRectsBBox,
    normSelSet,
    refreshMultiSelectionBase,
    setSelection,
    selBoxBounds,
    boxSize,
    rectIntersectsBox,
    beginSelectionBox,
    updateSelectionBox,
    finishSelectionBox,
    isSelected,
    getSelectedRects,
    selectOnly,
    toggleSelect
  };
};
