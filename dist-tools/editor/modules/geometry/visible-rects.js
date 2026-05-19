/* build:1779222473 */
export const setupVisibleRectGeometry = (deps = {}) => {
  const {
    drawCellX,
    drawCellY,
    getHiddenSet,
    getRectCalcCache,
    buildRectAABBMaskedKey,
    rectAABB,
    rectUVToWorld,
    maskCellKey
  } = deps;

  const computeRectAABBMasked = r => {
    const hs = getHiddenSet(r);
    if (!hs.size) return rectAABB(r);
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const cols = Math.max(1, Math.ceil(r.width / cx));
    const rows = Math.max(1, Math.ceil(r.height / cy));
    let has = false;
    let minX = 1e9;
    let minY = 1e9;
    let maxX = -1e9;
    let maxY = -1e9;
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        if (hs.has(maskCellKey(ix, iy))) continue;
        const u = ix * cx;
        const v = iy * cy;
        const cw = Math.min(cx, r.width - u);
        const ch = Math.min(cy, r.height - v);
        const p1 = rectUVToWorld(r, u, v);
        const p2 = rectUVToWorld(r, u + cw, v);
        const p3 = rectUVToWorld(r, u + cw, v + ch);
        const p4 = rectUVToWorld(r, u, v + ch);
        minX = Math.min(minX, p1.x, p2.x, p3.x, p4.x);
        minY = Math.min(minY, p1.y, p2.y, p3.y, p4.y);
        maxX = Math.max(maxX, p1.x, p2.x, p3.x, p4.x);
        maxY = Math.max(maxY, p1.y, p2.y, p3.y, p4.y);
        has = true;
      }
    }
    return has ? { minX, minY, maxX, maxY } : rectAABB(r);
  };

  const rectAABBMasked = r => {
    const cache = getRectCalcCache(r);
    const key = buildRectAABBMaskedKey(r);
    if (cache.aabb && cache.aabb.key === key) return cache.aabb.value;
    const value = computeRectAABBMasked(r);
    cache.aabb = { key, value };
    return value;
  };

  const rectIntersectsSelectionBoxVisible = (r, b) => {
    if (!r || !b) return false;
    const mb = rectAABBMasked(r);
    const quickHit = !(mb.maxX < b.minX || mb.minX > b.maxX || mb.maxY < b.minY || mb.minY > b.maxY);
    if (!quickHit) return false;
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const cols = Math.max(1, Math.ceil(r.width / cx));
    const rows = Math.max(1, Math.ceil(r.height / cy));
    const hs = getHiddenSet(r);
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        if (hs.has(maskCellKey(ix, iy))) continue;
        const u = ix * cx;
        const v = iy * cy;
        const cw = Math.min(cx, r.width - u);
        const ch = Math.min(cy, r.height - v);
        const p1 = rectUVToWorld(r, u, v);
        const p2 = rectUVToWorld(r, u + cw, v);
        const p3 = rectUVToWorld(r, u + cw, v + ch);
        const p4 = rectUVToWorld(r, u, v + ch);
        const minX = Math.min(p1.x, p2.x, p3.x, p4.x);
        const minY = Math.min(p1.y, p2.y, p3.y, p4.y);
        const maxX = Math.max(p1.x, p2.x, p3.x, p4.x);
        const maxY = Math.max(p1.y, p2.y, p3.y, p4.y);
        if (!(maxX < b.minX || minX > b.maxX || maxY < b.minY || minY > b.maxY)) return true;
      }
    }
    return false;
  };

  return {
    computeRectAABBMasked,
    rectAABBMasked,
    rectIntersectsSelectionBoxVisible
  };
};
