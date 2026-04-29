export const setupRectCacheCore = (deps = {}) => {
  const { makeNonEnumerableCalcCache, topoCalcKey, getCellTopology } = deps;

  const getRectCalcCache = r => {
    if (!r || typeof r !== "object") return { regions: null, flow: null };
    if (!r._calcCache || typeof r._calcCache !== "object") {
      makeNonEnumerableCalcCache(r, { regions: null, flow: null, topo: null, compRender: null, maskRender: null, boundarySegs: null, fillLayer: null, decorLayer: null, flowPassiveLayer: null, cabinetSummary: null, aabb: null });
    } else if (Object.prototype.propertyIsEnumerable.call(r, "_calcCache")) {
      const cur = r._calcCache;
      try { delete r._calcCache; } catch (_e) { }
      makeNonEnumerableCalcCache(r, cur);
    }
    if (!r._calcCache.topo) r._calcCache.topo = null;
    if (!r._calcCache.regions) r._calcCache.regions = null;
    if (!r._calcCache.flow) r._calcCache.flow = null;
    if (!r._calcCache.compRender) r._calcCache.compRender = null;
    if (!r._calcCache.maskRender) r._calcCache.maskRender = null;
    if (!r._calcCache.boundarySegs) r._calcCache.boundarySegs = null;
    if (!r._calcCache.fillLayer) r._calcCache.fillLayer = null;
    if (!r._calcCache.decorLayer) r._calcCache.decorLayer = null;
    if (!r._calcCache.flowPassiveLayer) r._calcCache.flowPassiveLayer = null;
    if (!r._calcCache.cabinetSummary) r._calcCache.cabinetSummary = null;
    if (!r._calcCache.aabb) r._calcCache.aabb = null;
    return r._calcCache;
  };

  const invalidateRectCache = (r, kind = "all") => {
    const c = getRectCalcCache(r);
    if (kind === "all") {
      c.aabb = null; c.topo = null; c.compRender = null; c.maskRender = null; c.boundarySegs = null; c.fillLayer = null; c.decorLayer = null; c.flowPassiveLayer = null; c.cabinetSummary = null; c.regions = null; c.flow = null;
      return;
    }
    if (kind === "appearance") { c.fillLayer = null; c.decorLayer = null; return; }
    if (kind === "flow") { c.flow = null; c.flowPassiveLayer = null; return; }
    if (kind === "regions") { c.regions = null; c.flow = null; c.flowPassiveLayer = null; c.cabinetSummary = null; return; }
    if (kind === "topology") { c.topo = null; c.compRender = null; c.maskRender = null; c.boundarySegs = null; c.fillLayer = null; c.decorLayer = null; c.regions = null; c.flow = null; c.flowPassiveLayer = null; c.cabinetSummary = null; c.aabb = null; return; }
  };

  const getCellTopologyCached = (r, cx, cy) => {
    const cache = getRectCalcCache(r);
    const key = topoCalcKey(r, cx, cy);
    if (cache.topo && cache.topo.key === key) return cache.topo.value;
    const value = getCellTopology(r, cx, cy);
    cache.topo = { key, value };
    cache.compRender = null;
    cache.maskRender = null;
    cache.boundarySegs = null;
    cache.fillLayer = null;
    cache.decorLayer = null;
    cache.flowPassiveLayer = null;
    cache.cabinetSummary = null;
    return value;
  };

  return {
    getRectCalcCache,
    invalidateRectCache,
    getCellTopologyCached
  };
};
