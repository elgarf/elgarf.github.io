export const setupRegionsFlowController = (deps = {}) => {
  const {
    st,
    safeDefine,
    getRectCalcCache,
    regionCalcKey,
    flowCalcKey,
    syncFlowLocksWithRegions,
    buildSingleRegionPlan,
    scheduleRegionCalcWorker,
    scheduleFlowCalcWorker,
    planNumberRegionsUncached,
    getDataFlowGroupsUncached,
    makeCalcBudget,
    calcNow,
    markCalcMetric,
    FLOW_WORKER_TIMEOUT_MS,
    REGION_WORKER_TIMEOUT_MS,
    SPLIT_VARIANT_MAX,
    updateSplitVariantControl,
    flowDist
  } = deps;

  const applySplitVariantLimitFromRegions = (r, regions) => {
    if (!r) return;
    const raw = Number(regions && regions.variantCount);
    const cnt = Number.isFinite(raw) && raw > 0 ? Math.max(1, Math.round(raw)) : 1;
    r._splitVariantCount = cnt;
    const maxIdx = Math.max(0, Math.min(Math.max(0, SPLIT_VARIANT_MAX - 1), cnt - 1));
    if (Math.round(Number(r.splitVariant) || 0) !== Math.min(maxIdx, Math.max(0, Math.round(Number(r.splitVariant) || 0)))) {
      r.splitVariant = Math.min(maxIdx, Math.max(0, Math.round(Number(r.splitVariant) || 0)));
    }
    if (st.sel === r.id) updateSplitVariantControl(r);
  };

  const flowGroupsStats = groups => {
    const list = Array.isArray(groups) ? groups : [];
    let total = 0;
    for (const g of list) {
      const pts = Array.isArray(g && g.points) ? g.points : [];
      for (let i = 1; i < pts.length; i++) total += flowDist(pts[i - 1], pts[i]);
    }
    return { flowCount: list.length, totalFlowLen: Math.round(total * 100) / 100 };
  };

  const logFlowCalcSummary = (rectId, key, groups, extra) => {
    try {
      const stats = flowGroupsStats(groups);
      const dbg = [];
      for (const g of Array.isArray(groups) ? groups : []) {
        if (g && g._dbg && typeof g._dbg === "object") dbg.push(g._dbg);
      }
      console.info("[flow-calc]", { rectId, key, ...stats, regions: dbg, ...(extra && typeof extra === "object" ? extra : {}) });
    } catch (_e) { }
  };

  const planNumberRegions = (r, cx, cy, topo, hs, useCache = true) => {
    const cache = useCache ? getRectCalcCache(r) : { regions: null, flow: null };
    const key = regionCalcKey(r, cx, cy, topo);
    if (cache.regions && cache.regions.key === key) {
      syncFlowLocksWithRegions(r, cache.regions.value, topo);
      return cache.regions.value;
    }
    const manualRegionsActive = Array.isArray(r && r.manualClusters) && r.manualClusters.length > 0;
    if (manualRegionsActive) {
      try {
        const budget = makeCalcBudget();
        budget.deadline = calcNow() + REGION_WORKER_TIMEOUT_MS;
        const value = planNumberRegionsUncached(r, cx, cy, topo, hs, budget);
        safeDefine(value, "_calcKey", key);
        cache.regions = { key, value, pending: false };
        syncFlowLocksWithRegions(r, value, topo);
        if (cache.flow && cache.flow.regionKey !== key) cache.flow = null;
        return value;
      } catch (_e) {
        // fallback to async path below
      }
    }
    const value = buildSingleRegionPlan(r, cx, cy, topo, hs);
    safeDefine(value, "_calcKey", key);
    cache.regions = { key, value, pending: true };
    syncFlowLocksWithRegions(r, value, topo);
    if (cache.flow && cache.flow.regionKey !== key) cache.flow = null;
    scheduleRegionCalcWorker(r, key, cx, cy, topo, hs);
    return value;
  };

  const getDataFlowGroups = (r, cx, cy, topo, hs, regions) => {
    if (regions && regions._timedOut) {
      markCalcMetric("flow", 0, true);
      return [];
    }
    const manualRegionsActive = Array.isArray(r && r.manualClusters) && r.manualClusters.length > 0;
    const cache = getRectCalcCache(r);
    const regionKey = (regions && regions._calcKey) || "";
    if (cache.regions && cache.regions.key === regionKey && cache.regions.pending) {
      if (cache.flow && cache.flow.key === flowCalcKey(r, cx, cy, topo, regions)) return cache.flow.value;
      return [];
    }
    const key = flowCalcKey(r, cx, cy, topo, regions);
    if (cache.flow && cache.flow.key === key) return cache.flow.value;
    const staleFlow = (cache.flow && Array.isArray(cache.flow.value)) ? cache.flow.value : null;
    if (manualRegionsActive) {
      try {
        const budget = makeCalcBudget();
        budget.deadline = calcNow() + FLOW_WORKER_TIMEOUT_MS;
        const value = getDataFlowGroupsUncached(r, cx, cy, topo, hs, regions, budget);
        const timedOut = !!(budget && budget.timedOut) || !Array.isArray(value);
        cache.flow = { key, regionKey, value: timedOut ? [] : value, pending: false };
        markCalcMetric("flow", 0, timedOut);
        logFlowCalcSummary(r && r.id || 0, key, cache.flow.value, { source: "main-manual", timedOut: !!timedOut, elapsed: 0 });
        return cache.flow.value;
      } catch (_e) {
        cache.flow = { key, regionKey, value: [], pending: false };
        markCalcMetric("flow", 0, true);
        logFlowCalcSummary(r && r.id || 0, key, cache.flow.value, { source: "main-manual-error", timedOut: true, elapsed: 0, error: _e && _e.message || String(_e) });
        return [];
      }
    }
    cache.flow = { key, regionKey, value: staleFlow || [], pending: true };
    scheduleFlowCalcWorker(r, key, cx, cy, topo, hs, regions);
    return staleFlow || [];
  };

  return {
    planNumberRegions,
    getDataFlowGroups,
    applySplitVariantLimitFromRegions,
    flowGroupsStats,
    logFlowCalcSummary
  };
};
