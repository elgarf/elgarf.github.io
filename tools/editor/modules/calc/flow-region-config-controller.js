export const setupFlowRegionConfigController = (deps = {}) => {
  const {
    normalizeFlowLocks,
    normalizeDataFlow,
    FLOW_DIR_SET,
    getRectCalcCache,
    cloneFlowRegionConfig
  } = deps;

  const getFlowRegionConfig = (r, rid) => {
    if (!r || typeof r !== "object") return { locks: [], startCid: null, startDir: "", mode: "", startPinned: false, manual: false, manualOrder: [] };
    if (!r.flowLocks || typeof r.flowLocks !== "object") r.flowLocks = {};
    const key = String(Math.max(0, Math.round(Number(rid) || 0)));
    const norm = normalizeFlowLocks(r.flowLocks), cfg = norm[key] && typeof norm[key] === "object" ? norm[key] : { locks: [], startCid: null, startDir: "", mode: "", startPinned: false, manual: false, manualOrder: [] };
    r.flowLocks = norm;
    r.flowLocks[key] = cfg;
    return cfg;
  };

  const rememberFlowRegionConfig = (r, rid) => {
    if (!r || typeof r !== "object") return;
    const key = String(Math.max(0, Math.round(Number(rid) || 0)));
    const cfg = r.flowLocks && r.flowLocks[key];
    if (!cfg) return;
    const ridToSig = (r._flowLockRidToSig && typeof r._flowLockRidToSig === "object") ? r._flowLockRidToSig : {};
    const sig = String(ridToSig[key] || "");
    if (!sig) return;
    const bySig = (r._flowLockSigToCfg && typeof r._flowLockSigToCfg === "object") ? r._flowLockSigToCfg : {};
    bySig[sig] = cloneFlowRegionConfig(cfg);
    try { r._flowLockSigToCfg = bySig; } catch { /* noop */ }
  };

  const getFlowLocksRegion = (r, rid) => {
    return getFlowRegionConfig(r, rid).locks;
  };

  const getFlowStartRoutingRegion = (r, rid) => {
    const cfg = getFlowRegionConfig(r, rid);
    return { startCid: cfg.startCid, startDir: cfg.startDir || "", startPinned: !!cfg.startPinned };
  };

  const getFlowModeRegion = (r, rid, globalMode) => {
    const cfg = getFlowRegionConfig(r, rid), m = normalizeDataFlow(cfg.mode || "");
    return m !== "none" ? m : normalizeDataFlow(globalMode);
  };

  const setFlowLock = (r, rid, index, cid) => {
    if (!r || typeof r !== "object") return;
    const idx = Math.max(0, Math.round(Number(index) || 0)), cc = Math.max(0, Math.round(Number(cid) || 0));
    const cfg = getFlowRegionConfig(r, rid), arr = Array.isArray(cfg.locks) ? cfg.locks : [];
    const next = arr.filter(it => Math.max(0, Math.round(Number(it && it.index) || 0)) !== idx);
    next.push({ index: idx, cid: cc });
    next.sort((a, b) => a.index - b.index);
    cfg.locks = next;
    cfg.manual = false;
    cfg.manualOrder = [];
    rememberFlowRegionConfig(r, rid);
    const cache = getRectCalcCache(r);
    if (cache && cache.flow && typeof cache.flow === "object") cache.flow.pending = true;
  };

  const setFlowStart = (r, rid, cid) => {
    if (!r || typeof r !== "object") return;
    const cfg = getFlowRegionConfig(r, rid), cc = Math.max(0, Math.round(Number(cid) || 0));
    cfg.startCid = cc;
    cfg.startPinned = true;
    cfg.manual = false;
    cfg.manualOrder = [];
    rememberFlowRegionConfig(r, rid);
    const cache = getRectCalcCache(r);
    if (cache && cache.flow && typeof cache.flow === "object") cache.flow.pending = true;
  };

  const setFlowDirection = (r, rid, dir, startCid) => {
    if (!r || typeof r !== "object") return;
    const d = String(dir || "").toLowerCase();
    if (!FLOW_DIR_SET.has(d)) return;
    const cfg = getFlowRegionConfig(r, rid);
    cfg.startDir = d;
    if (Number.isFinite(Number(startCid))) cfg.startCid = Math.max(0, Math.round(Number(startCid) || 0));
    cfg.startPinned = true;
    cfg.locks = [];
    cfg.manual = false;
    cfg.manualOrder = [];
    rememberFlowRegionConfig(r, rid);
    const cache = getRectCalcCache(r);
    if (cache && cache.flow && typeof cache.flow === "object") cache.flow.pending = true;
  };

  const setFlowRegionMode = (r, rid, mode) => {
    if (!r || typeof r !== "object") return;
    const m = normalizeDataFlow(mode);
    const cfg = getFlowRegionConfig(r, rid);
    if (m === "none") { cfg.mode = ""; cfg.locks = []; cfg.startCid = null; cfg.startDir = ""; cfg.startPinned = false; cfg.manual = false; cfg.manualOrder = []; }
    else cfg.mode = m;
    cfg.locks = [];
    cfg.startCid = null;
    cfg.startDir = "";
    cfg.startPinned = false;
    cfg.manual = false;
    cfg.manualOrder = [];
    rememberFlowRegionConfig(r, rid);
    const cache = getRectCalcCache(r);
    if (cache && cache.flow && typeof cache.flow === "object") cache.flow.pending = true;
  };

  const resetFlowRegionOverrides = (r, rid) => {
    if (!r || typeof r !== "object") return;
    const cfg = getFlowRegionConfig(r, rid);
    cfg.locks = [];
    cfg.startCid = null;
    cfg.startDir = "";
    cfg.mode = "";
    cfg.startPinned = false;
    cfg.manual = false;
    cfg.manualOrder = [];
    rememberFlowRegionConfig(r, rid);
    const cache = getRectCalcCache(r);
    if (cache && cache.flow && typeof cache.flow === "object") cache.flow.pending = true;
  };

  const setManualFlowOrder = (r, rid, order) => {
    if (!r || typeof r !== "object") return;
    const cfg = getFlowRegionConfig(r, rid);
    const next = [];
    const seen = new Set();
    for (const rawCid of (Array.isArray(order) ? order : [])) {
      const cid = Math.max(0, Math.round(Number(rawCid) || 0));
      if (seen.has(cid)) continue;
      seen.add(cid);
      next.push(cid);
    }
    cfg.manual = true;
    cfg.manualOrder = next;
    cfg.locks = [];
    cfg.startCid = next.length ? next[0] : null;
    cfg.startDir = "";
    cfg.startPinned = next.length > 0;
    rememberFlowRegionConfig(r, rid);
    const cache = getRectCalcCache(r);
    if (cache && cache.flow && typeof cache.flow === "object") cache.flow.pending = true;
  };

  const updateManualFlowPoint = (r, rid, cid) => {
    if (!r || typeof r !== "object") return false;
    const cfg = getFlowRegionConfig(r, rid);
    const cc = Math.max(0, Math.round(Number(cid) || 0));
    const order = Array.isArray(cfg.manualOrder) ? cfg.manualOrder.map(v => Math.max(0, Math.round(Number(v) || 0))) : [];
    let next;
    const idx = order.indexOf(cc);
    if (!cfg.manual || !order.length) next = [cc];
    else if (idx === 0) next = [];
    else if (idx > 0) next = order.slice(0, idx + 1);
    else next = [...order, cc];
    const changed = !cfg.manual || next.length !== order.length || next.some((v, i) => v !== order[i]);
    setManualFlowOrder(r, rid, next);
    return changed;
  };

  const dragManualFlowPoint = (r, rid, cid) => {
    if (!r || typeof r !== "object") return false;
    const cfg = getFlowRegionConfig(r, rid);
    const cc = Math.max(0, Math.round(Number(cid) || 0));
    const order = Array.isArray(cfg.manualOrder) ? cfg.manualOrder.map(v => Math.max(0, Math.round(Number(v) || 0))) : [];
    let next;
    const idx = order.indexOf(cc);
    if (!cfg.manual || !order.length) next = [cc];
    else if (idx >= 0) return false;
    else next = [...order, cc];
    const changed = !cfg.manual || next.length !== order.length || next.some((v, i) => v !== order[i]);
    if (changed) setManualFlowOrder(r, rid, next);
    return changed;
  };

  return {
    getFlowRegionConfig,
    rememberFlowRegionConfig,
    getFlowLocksRegion,
    getFlowStartRoutingRegion,
    getFlowModeRegion,
    setFlowLock,
    setFlowStart,
    setFlowDirection,
    setFlowRegionMode,
    resetFlowRegionOverrides,
    setManualFlowOrder,
    updateManualFlowPoint,
    dragManualFlowPoint
  };
};


