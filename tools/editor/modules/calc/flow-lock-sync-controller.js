export const setupFlowLockSyncController = (deps = {}) => {
  const {
    normalizeFlowLocks,
    FLOW_DIR_SET,
    DATA_FLOW_MODES,
    getRectRuntime
  } = deps;

  const cloneFlowRegionConfig = cfg => {
    const c = cfg && typeof cfg === "object" ? cfg : {};
    const locks = Array.isArray(c.locks) ? c.locks : [];
    return {
      locks: locks.map(it => ({ index: Math.max(0, Math.round(Number(it && it.index) || 0)), cid: Math.max(0, Math.round(Number(it && it.cid) || 0)) })).sort((a, b) => a.index - b.index),
      startCid: (c.startCid != null && Number.isFinite(Number(c.startCid))) ? Math.max(0, Math.round(Number(c.startCid) || 0)) : null,
      startDir: FLOW_DIR_SET.has(String(c.startDir || "").toLowerCase()) ? String(c.startDir || "").toLowerCase() : "",
      mode: (DATA_FLOW_MODES.has(String(c.mode || "")) && String(c.mode || "") !== "none") ? String(c.mode || "") : "",
      startPinned: !!c.startPinned,
      manual: !!c.manual,
      manualOrder: (Array.isArray(c.manualOrder) ? c.manualOrder : []).map(v => Math.max(0, Math.round(Number(v) || 0))).filter((v, i, arr) => arr.indexOf(v) === i)
    };
  };

  const buildRegionSignatureMap = (regions, topo) => {
    const out = new Map();
    if (!regions || !topo) return out;
    const cols = Math.max(1, Math.round(Number(topo && topo.cols) || 1)), rows = Math.max(1, Math.round(Number(topo && topo.rows) || 1));
    const byRid = new Map();
    const cellToRegion = Array.isArray(regions.cellToRegion) ? regions.cellToRegion : [];
    if (cellToRegion.length >= cols * rows) {
      for (let iy = 0; iy < rows; iy++) for (let ix = 0; ix < cols; ix++) {
        const ridRaw = Number(cellToRegion[iy * cols + ix]);
        if (!Number.isFinite(ridRaw) || ridRaw < 0) continue;
        const rid = Math.max(0, Math.round(ridRaw || 0));
        let s = byRid.get(rid);
        if (!s) { s = { minX: ix, minY: iy, maxX: ix, maxY: iy, count: 0, hash: 2166136261 >>> 0 }; byRid.set(rid, s); }
        s.count++;
        if (ix < s.minX) s.minX = ix; if (iy < s.minY) s.minY = iy; if (ix > s.maxX) s.maxX = ix; if (iy > s.maxY) s.maxY = iy;
        const v = ((((ix + 1) * 73856093) ^ ((iy + 1) * 19349663)) >>> 0);
        s.hash ^= v; s.hash = Math.imul(s.hash, 16777619) >>> 0;
      }
    } else {
      const regs = Array.isArray(regions.regions) ? regions.regions : [];
      for (const rg of regs) {
        const rid = Math.max(0, Math.round(Number(rg && rg.id) || 0)), c0 = Math.max(0, Math.round(Number(rg && rg.c0) || 0)), c1 = Math.max(c0 + 1, Math.round(Number(rg && rg.c1) || 0)), r0 = Math.max(0, Math.round(Number(rg && rg.r0) || 0)), r1 = Math.max(r0 + 1, Math.round(Number(rg && rg.r1) || 0));
        byRid.set(rid, { minX: c0, minY: r0, maxX: c1 - 1, maxY: r1 - 1, count: Math.max(1, (c1 - c0) * (r1 - r0)), hash: (((c0 + 1) * 73856093) ^ ((r0 + 1) * 19349663) ^ ((c1 + 1) * 83492791) ^ ((r1 + 1) * 2654435761)) >>> 0 });
      }
    }
    for (const [rid, s] of byRid.entries()) out.set(rid, `${s.count}|${s.minX},${s.minY},${s.maxX},${s.maxY}|${(s.hash >>> 0).toString(16)}`);
    return out;
  };

  const buildFlowLockSignatureSnapshot = r => {
    try {
      if (!r || typeof r !== "object") return { ridToSig: {}, cidToSeed: {} };
      const locks = normalizeFlowLocks(r.flowLocks);
      if (!Object.keys(locks).length) return { ridToSig: {}, cidToSeed: {} };
      const rt = getRectRuntime(r, { withRegions: true }), topo = rt.topo, regions = rt.regions;
      const sigByRid = buildRegionSignatureMap(regions, topo);
      const ridToSig = {};
      for (const key of Object.keys(locks)) {
        const rid = Math.max(0, Math.round(Number(key) || 0));
        const sig = String(sigByRid.get(rid) || "");
        if (!sig) continue;
        ridToSig[String(rid)] = sig;
      }
      const cidToSeed = {};
      const seeds = Array.isArray(topo && topo.seed) ? topo.seed : [];
      for (let cid = 0; cid < seeds.length; cid++) {
        const s = seeds[cid];
        if (!s) continue;
        const col = Math.max(0, Math.round(Number(s.col) || 0));
        const row = Math.max(0, Math.round(Number(s.row) || 0));
        cidToSeed[String(Math.max(0, Math.round(Number(cid) || 0)))] = `${col},${row}`;
      }
      return { ridToSig, cidToSeed };
    } catch {
      return { ridToSig: {}, cidToSeed: {} };
    }
  };

  const syncFlowLocksWithRegions = (r, regions, topo) => {
    if (!r || typeof r !== "object" || !regions || !topo) return;
    const currentSigByRid = buildRegionSignatureMap(regions, topo);
    if (!currentSigByRid.size) return;
    const buildCidSeedMap = tp => {
      const out = {};
      const seeds = Array.isArray(tp && tp.seed) ? tp.seed : [];
      for (let cid = 0; cid < seeds.length; cid++) {
        const s = seeds[cid];
        if (!s) continue;
        const col = Math.max(0, Math.round(Number(s.col) || 0));
        const row = Math.max(0, Math.round(Number(s.row) || 0));
        out[String(Math.max(0, Math.round(Number(cid) || 0)))] = `${col},${row}`;
      }
      return out;
    };
    const prevCidToSeed = (r._flowLockCidToSeed && typeof r._flowLockCidToSeed === "object") ? r._flowLockCidToSeed : {};
    const nextCidToSeed = buildCidSeedMap(topo);
    const remapCidToTopo = cidRaw => {
      if (cidRaw == null || !Number.isFinite(Number(cidRaw))) return null;
      const cid = Math.max(0, Math.round(Number(cidRaw) || 0));
      const seed = String(prevCidToSeed[String(cid)] || "");
      if (!seed) return cid;
      const p = seed.split(",");
      if (p.length !== 2) return cid;
      const col = Math.max(0, Math.round(Number(p[0]) || 0));
      const row = Math.max(0, Math.round(Number(p[1]) || 0));
      const cols = Math.max(1, Math.round(Number(topo && topo.cols) || 1));
      const rows = Math.max(1, Math.round(Number(topo && topo.rows) || 1));
      if (col < 0 || col >= cols || row < 0 || row >= rows) return cid;
      const idx = row * cols + col;
      const comp = Array.isArray(topo && topo.comp) ? topo.comp : null;
      if (!comp || idx < 0 || idx >= comp.length) return cid;
      return Math.max(0, Math.round(Number(comp[idx]) || 0));
    };
    const remapFlowCfgToTopo = cfg => {
      const base = cloneFlowRegionConfig(cfg);
      if (base.startCid != null) base.startCid = remapCidToTopo(base.startCid);
      base.manualOrder = (Array.isArray(base.manualOrder) ? base.manualOrder : []).map(cid => remapCidToTopo(cid)).filter((cid, i, arr) => cid != null && arr.indexOf(cid) === i);
      const seenIdx = new Set();
      const remappedLocks = [];
      for (const it of (Array.isArray(base.locks) ? base.locks : [])) {
        const idx = Math.max(0, Math.round(Number(it && it.index) || 0));
        if (seenIdx.has(idx)) continue;
        seenIdx.add(idx);
        remappedLocks.push({ index: idx, cid: remapCidToTopo(it && it.cid) });
      }
      base.locks = remappedLocks.sort((a, b) => a.index - b.index);
      return base;
    };
    const norm = normalizeFlowLocks(r.flowLocks);
    const prevRidToSig = (r._flowLockRidToSig && typeof r._flowLockRidToSig === "object") ? r._flowLockRidToSig : {};
    const prevSigToCfgSrc = (r._flowLockSigToCfg && typeof r._flowLockSigToCfg === "object") ? r._flowLockSigToCfg : {};
    const prevSigToCfg = {};
    for (const [sig, cfg] of Object.entries(prevSigToCfgSrc)) prevSigToCfg[String(sig)] = remapFlowCfgToTopo(cfg);
    for (const [rk, cfg] of Object.entries(norm)) {
      const sig = String(prevRidToSig[rk] || "");
      if (!sig) continue;
      if (!prevSigToCfg[sig]) prevSigToCfg[sig] = remapFlowCfgToTopo(cfg);
    }
    let changed = false;
    const nextNorm = {};
    const nextRidToSig = {};
    const nextSigToCfg = { ...prevSigToCfg };
    for (const [rid, sig] of currentSigByRid.entries()) {
      const key = String(Math.max(0, Math.round(Number(rid) || 0)));
      const existing = norm[key];
      const existingSig = String(prevRidToSig[key] || "");
      let cfg = null;
      if (existing && existingSig && existingSig === sig) cfg = remapFlowCfgToTopo(existing);
      else if (prevSigToCfg[sig]) cfg = cloneFlowRegionConfig(prevSigToCfg[sig]);
      else if (existing && !existingSig) cfg = remapFlowCfgToTopo(existing);
      if (cfg) nextNorm[key] = cfg;
      nextRidToSig[key] = sig;
      if (cfg) nextSigToCfg[sig] = cloneFlowRegionConfig(cfg);
    }
    const oldKeys = Object.keys(norm).sort(), newKeys = Object.keys(nextNorm).sort();
    if (oldKeys.length !== newKeys.length || oldKeys.some((k, i) => k !== newKeys[i])) changed = true;
    if (!changed) {
      for (const k of newKeys) {
        const a = JSON.stringify(cloneFlowRegionConfig(norm[k]));
        const b = JSON.stringify(cloneFlowRegionConfig(nextNorm[k]));
        if (a !== b) { changed = true; break; }
      }
    }
    if (changed) r.flowLocks = nextNorm;
    else r.flowLocks = norm;
    try { r._flowLockRidToSig = nextRidToSig; } catch { /* noop */ }
    try { r._flowLockSigToCfg = nextSigToCfg; } catch { /* noop */ }
    try { r._flowLockCidToSeed = nextCidToSeed; } catch { /* noop */ }
  };

  return {
    cloneFlowRegionConfig,
    buildFlowLockSignatureSnapshot,
    syncFlowLocksWithRegions
  };
};



