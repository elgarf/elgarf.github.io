export const setupCalcWorkerOrchestrator = (deps = {}) => {
  const {
    safeDefine,
    render,
    getRectById,
    getRectCalcCache,
    makeCalcBudget,
    calcNow,
    markCalcMetric,
    logFlowCalcSummary,
    buildSingleRegionPlan,
    syncFlowLocksWithRegions,
    applySplitVariantLimitFromRegions,
    collectSetValues,
    normalizeManualClusters,
    normalizeFlowLocks,
    toLetters,
    buildWorkerMessage,
    isWorkerBootMessage,
    planNumberRegionsUncached,
    getDataFlowGroupsUncached,
    CALC_WORKER_BOOT_URL,
    REGION_WORKER_TIMEOUT_MS,
    FLOW_WORKER_TIMEOUT_MS,
    calcWorkerScript
  } = deps;

  let regionCalcWorker = null;
  let regionCalcReqSeq = 1;
  const regionCalcPending = new Map();
  let flowCalcWorker = null;
  let flowCalcReqSeq = 1;
  const flowCalcPending = new Map();

  const makeRegionValue = (rr, key, cx, cy, topo, hs, timedOut = false) => {
    let value = buildSingleRegionPlan(rr, cx, cy, topo, hs);
    if (timedOut) safeDefine(value, "_timedOut", true);
    if (key != null) safeDefine(value, "_calcKey", key);
    return value;
  };

  const applyRegionValue = (rr, cache, value, topo, metricMs = 0, timedOut = false) => {
    cache.regions.pending = false;
    cache.regions.value = value;
    syncFlowLocksWithRegions(rr, value, topo);
    applySplitVariantLimitFromRegions(rr, value);
    cache.flow = null;
    markCalcMetric("regions", metricMs, timedOut);
  };

  const applyFlowCacheResult = (cache, key, value, metricMs = 0, timedOut = false, logMeta = null) => {
    if (!cache || !cache.flow || cache.flow.key !== key) return;
    cache.flow.pending = false;
    cache.flow.value = timedOut ? [] : (Array.isArray(value) ? value : []);
    markCalcMetric("flow", Math.max(0, Number(metricMs) || 0), !!timedOut);
    if (logMeta && typeof logMeta === "object") {
      logFlowCalcSummary(logMeta.rectId, key, cache.flow.value, logMeta.extra || {});
    }
  };

  const buildRegionWorkerPayload = (r, cx, cy, topo, hs) => ({
    r: {
      id: r && r.id || 0,
      width: r && r.width || 0,
      height: r && r.height || 0,
      widthM: r && r.widthM || 0,
      heightM: r && r.heightM || 0,
      scale: r && r.scale || 256,
      areaM2Px: r && r.areaM2Px || 65536,
      splitVariant: r && r.splitVariant || 0,
      cellLinks: Array.isArray(r && r.cellLinks) ? r.cellLinks : [],
      manualClusters: normalizeManualClusters(r && r.manualClusters)
    },
    cx, cy, topo, hs: collectSetValues(hs)
  });

  const buildFlowWorkerPayload = (r, cx, cy, topo, hs, regions) => ({
    r: {
      id: r && r.id || 0,
      width: r && r.width || 0,
      height: r && r.height || 0,
      dataFlow: r && r.dataFlow || "none",
      dataFlowZ: !!(r && r.dataFlowZ),
      flowLocks: normalizeFlowLocks(r && r.flowLocks),
      manualClusters: normalizeManualClusters(r && r.manualClusters)
    },
    cx, cy, topo, hs: collectSetValues(hs),
    regions: regions ? {
      nx: regions.nx || 1,
      colToGroup: Array.isArray(regions.colToGroup) ? regions.colToGroup : [],
      rowToGroup: Array.isArray(regions.rowToGroup) ? regions.rowToGroup : [],
      cellToRegion: Array.isArray(regions.cellToRegion) ? regions.cellToRegion : [],
      labels: Array.isArray(regions.regions) ? Object.fromEntries(regions.regions.map(it => [String(it.id), String(it.label || toLetters(it.id))])) : {}
    } : null
  });

  const ensureCalcWorker = (kind) => {
    if (kind === "regions") {
      if (regionCalcWorker) return regionCalcWorker;
      try {
        regionCalcWorker = new Worker(CALC_WORKER_BOOT_URL);
        regionCalcWorker.postMessage({ kind: "boot", script: calcWorkerScript });
      } catch (err) {
        try { console.warn("[calc-worker:regions] create failed", err); } catch { /* noop */ }
        regionCalcWorker = null;
        return null;
      }
      regionCalcWorker.onmessage = e => {
        const d = e && e.data ? e.data : {};
        if (isWorkerBootMessage(d)) return;
        if (d.kind !== "regions") return;
        const req = regionCalcPending.get(d.reqId);
        if (!req) return;
        regionCalcPending.delete(d.reqId);
        if (req.timer) clearTimeout(req.timer);
        const rr = getRectById(req.rectId);
        if (!rr) return;
        const cache = getRectCalcCache(rr);
        if (!cache.regions || cache.regions.key !== req.key) return;
        let value = d && d.ok ? d.result : null;
        let timedOut = !!(d && d.timedOut) || !value;
        if ((!d || !d.ok) && rr) {
          try {
            const budget = makeCalcBudget();
            budget.deadline = calcNow() + REGION_WORKER_TIMEOUT_MS;
            value = planNumberRegionsUncached(rr, req.cx, req.cy, req.topo, req.hs, budget);
            timedOut = !!(budget && budget.timedOut) || !!(value && value._timedOut);
            console.warn("[calc-worker:regions] fallback to main thread");
          } catch {
            value = null;
            timedOut = true;
            console.warn("[calc-worker:regions] worker/local failed", _e);
          }
        }
        if (timedOut) {
          value = makeRegionValue(rr, req.key, req.cx, req.cy, req.topo, req.hs, true);
        }
        if (value && typeof value === "object") {
          safeDefine(value, "_calcKey", req.key);
          const p = value && value._profile;
          if (p && typeof p === "object" && Number(p.totalMs) > 500) {
            try { console.info("[regions-profile]", { rectId: req.rectId, key: req.key, ...p }); } catch { /* noop */ }
          }
        }
        applyRegionValue(rr, cache, value, req.topo, Math.max(0, Number(d && d.elapsed) || 0), timedOut);
        if (timedOut) {
          try { console.warn("[regions-timeout] worker returned timedOut", { rectId: req.rectId, key: req.key, elapsed: d && d.elapsed }); } catch { /* noop */ }
        }
        render();
      };
      regionCalcWorker.onerror = (err) => {
        try { console.warn("[calc-worker:regions] worker error", err); } catch { /* noop */ }
        for (const req of regionCalcPending.values()) {
          if (req.timer) clearTimeout(req.timer);
          const rr = getRectById(req.rectId);
          if (!rr) continue;
          const cache = getRectCalcCache(rr);
          if (cache.regions && cache.regions.key === req.key) {
            const value = makeRegionValue(rr, req.key, req.cx, req.cy, req.topo, req.hs, true);
            applyRegionValue(rr, cache, value, req.topo, 0, true);
          }
        }
        regionCalcPending.clear();
        try { regionCalcWorker.terminate() } catch { /* noop */ }
        regionCalcWorker = null;
        render();
      };
      return regionCalcWorker;
    }
    if (flowCalcWorker) return flowCalcWorker;
    try {
      flowCalcWorker = new Worker(CALC_WORKER_BOOT_URL);
      flowCalcWorker.postMessage({ kind: "boot", script: calcWorkerScript });
    } catch (err) {
      try { console.warn("[calc-worker:flow] create failed", err); } catch { /* noop */ }
      flowCalcWorker = null;
      return null;
    }
    flowCalcWorker.onmessage = e => {
      const d = e && e.data ? e.data : {};
      if (isWorkerBootMessage(d)) return;
      if (d.kind !== "flow") return;
      const req = flowCalcPending.get(d.reqId);
      if (!req) return;
      flowCalcPending.delete(d.reqId);
      const rr = getRectById(req.rectId);
      if (!rr) return;
      const cache = getRectCalcCache(rr);
      if (!cache.flow || cache.flow.key !== req.key) return;
      let timedOut = !!(d && d.timedOut) || !Array.isArray(d && d.result);
      let value = Array.isArray(d && d.result) ? d.result : null;
      if ((!d || !d.ok) && rr) {
        try {
          const budget = makeCalcBudget();
          budget.deadline = calcNow() + FLOW_WORKER_TIMEOUT_MS;
          const hs = req.hs || new Set();
          value = getDataFlowGroupsUncached(rr, req.cx, req.cy, req.topo, hs, req.regions, budget);
          timedOut = !!(budget && budget.timedOut) || !Array.isArray(value);
          console.warn("[calc-worker:flow] fallback to main thread");
        } catch {
          value = null;
          timedOut = true;
          console.warn("[calc-worker:flow] worker/local failed", _e);
        }
      }
      applyFlowCacheResult(cache, req.key, value, Math.max(0, Number(d && d.elapsed) || 0), timedOut, {
        rectId: req.rectId,
        extra: { source: (d && d.ok) ? "worker" : "fallback", timedOut: !!timedOut, elapsed: Math.max(0, Number(d && d.elapsed) || 0) }
      });
      render();
    };
    flowCalcWorker.onerror = (err) => {
      try { console.warn("[calc-worker:flow] worker error", err); } catch { /* noop */ }
      for (const req of flowCalcPending.values()) {
        const rr = getRectById(req.rectId);
        if (!rr) continue;
        const cache = getRectCalcCache(rr);
        if (cache.flow && cache.flow.key === req.key) {
          applyFlowCacheResult(cache, req.key, [], 0, true, {
            rectId: req.rectId,
            extra: { source: "worker-error", timedOut: true, elapsed: 0 }
          });
        }
      }
      flowCalcPending.clear();
      try { flowCalcWorker.terminate() } catch { /* noop */ }
      flowCalcWorker = null;
      render();
    };
    return flowCalcWorker;
  };

  const resetCalcWorkers = () => {
    for (const req of regionCalcPending.values()) if (req.timer) clearTimeout(req.timer);
    regionCalcPending.clear();
    flowCalcPending.clear();
    if (regionCalcWorker) { try { regionCalcWorker.terminate() } catch { /* noop */ } }
    if (flowCalcWorker) { try { flowCalcWorker.terminate() } catch { /* noop */ } }
    regionCalcWorker = null;
    flowCalcWorker = null;
  };

  const scheduleRegionCalcWorker = (r, key, cx, cy, topo, hs) => {
    const worker = ensureCalcWorker("regions");
    const reqId = regionCalcReqSeq++;
    const rectId = r.id;
    if (!worker) {
      const rr = getRectById(rectId);
      if (!rr) return;
      const cache = getRectCalcCache(rr);
      if (!cache.regions || cache.regions.key !== key) return;
      try {
        const budget = makeCalcBudget();
        budget.deadline = calcNow() + REGION_WORKER_TIMEOUT_MS;
        let value = planNumberRegionsUncached(rr, cx, cy, topo, hs, budget);
        const timedOut = !!(budget && budget.timedOut) || !!(value && value._timedOut);
        if (timedOut) value = makeRegionValue(rr, key, cx, cy, topo, hs, true);
        safeDefine(value, "_calcKey", key);
        applyRegionValue(rr, cache, value, topo, 0, timedOut);
        render();
      } catch {
        const value = makeRegionValue(rr, key, cx, cy, topo, hs, true);
        applyRegionValue(rr, cache, value, topo, 0, true);
        render();
      }
      return;
    }
    const timer = setTimeout(() => {
      const req = regionCalcPending.get(reqId);
      if (!req) return;
      regionCalcPending.delete(reqId);
      const rr = getRectById(rectId);
      if (!rr) return;
      const cache = getRectCalcCache(rr);
      if (!cache.regions || cache.regions.key !== key) return;
      try {
        const budget = makeCalcBudget();
        budget.deadline = calcNow() + REGION_WORKER_TIMEOUT_MS;
        let value = planNumberRegionsUncached(rr, cx, cy, topo, hs, budget);
        const timedOut = !!(budget && budget.timedOut) || !!(value && value._timedOut);
        if (timedOut) value = makeRegionValue(rr, key, cx, cy, topo, hs, true);
        safeDefine(value, "_calcKey", key);
        applyRegionValue(rr, cache, value, topo, REGION_WORKER_TIMEOUT_MS, true);
        try { console.warn("[regions-watchdog] fallback to local", { rectId, key }); } catch { /* noop */ }
        render();
      } catch (e) {
        const value = makeRegionValue(rr, key, cx, cy, topo, hs, true);
        applyRegionValue(rr, cache, value, topo, REGION_WORKER_TIMEOUT_MS, true);
        try { console.warn("[regions-watchdog] local failed", { rectId, key, error: e && e.message || String(e) }); } catch { /* noop */ }
        render();
      }
    }, REGION_WORKER_TIMEOUT_MS + 5000);
    regionCalcPending.set(reqId, { rectId, key, cx, cy, topo, hs, timer });
    try { console.info("[regions-worker] scheduled", { rectId, key }); } catch { /* noop */ }
    worker.postMessage(buildWorkerMessage("regions", reqId, buildRegionWorkerPayload(r, cx, cy, topo, hs)));
  };

  const scheduleFlowCalcWorker = (r, key, cx, cy, topo, hs, regions) => {
    const worker = ensureCalcWorker("flow");
    const reqId = flowCalcReqSeq++;
    const rectId = r.id;
    if (!worker) {
      const rr = getRectById(rectId);
      if (!rr) return;
      const cache = getRectCalcCache(rr);
      if (!cache.flow || cache.flow.key !== key) return;
      try {
        const budget = makeCalcBudget();
        budget.deadline = calcNow() + FLOW_WORKER_TIMEOUT_MS;
        const value = getDataFlowGroupsUncached(rr, cx, cy, topo, hs, regions, budget);
        const timedOut = !!(budget && budget.timedOut) || !Array.isArray(value);
        applyFlowCacheResult(cache, key, value, 0, timedOut, {
          rectId,
          extra: { source: "main", timedOut: !!timedOut, elapsed: 0 }
        });
        render();
      } catch {
        applyFlowCacheResult(cache, key, [], 0, true, {
          rectId,
          extra: { source: "main-error", timedOut: true, elapsed: 0, error: _e && _e.message || String(_e) }
        });
        render();
      }
      return;
    }
    flowCalcPending.set(reqId, { rectId, key, cx, cy, topo, hs, regions });
    worker.postMessage(buildWorkerMessage("flow", reqId, buildFlowWorkerPayload(r, cx, cy, topo, hs, regions)));
  };

  return {
    resetCalcWorkers,
    scheduleRegionCalcWorker,
    scheduleFlowCalcWorker
  };
};


