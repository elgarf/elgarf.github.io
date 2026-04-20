export const setupFlowGroupsController = (deps = {}) => {
  const {
    normalizeDataFlow,
    maskCellKey,
    buildZOrder,
    buildSnakeOrder,
    getFlowRegionConfig,
    getFlowStartRoutingRegion,
    resolveFlowModeFromStartAndDir,
    getFlowModeRegion,
    getFlowLocksRegion,
    FLOW_DIR_SET,
    pathSelfCrosses,
    refineFlowOrder,
    FLOW_OPTIMIZE_MAX_POINTS,
    optimizeFlowPathShortest,
    flowPathCost,
    applyFlowStartRouting,
    applyFlowLocksToOrdered,
    FLOW_SEARCH_NODE_LIMIT_STRICT,
    flowSearchOrder,
    toLetters,
    REGION_ZONE_COLORS,
    checkCalcTimeout
  } = deps;

  const getDataFlowGroupsUncached = (r, cx, cy, topo, hs, regions, budget) => {
    if (checkCalcTimeout(budget)) return [];
    const mode = normalizeDataFlow(r && r.dataFlow);
    const zMode = !!(r && r.dataFlowZ);
    if (mode === "none") return [];
    const manualRegionsActive = Array.isArray(r && r.manualClusters) && r.manualClusters.length > 0;
    let regionFlowCache = getDataFlowGroupsUncached._regionFlowCache;
    if (!(regionFlowCache instanceof Map)) {
      regionFlowCache = new Map();
      try { Object.defineProperty(getDataFlowGroupsUncached, "_regionFlowCache", { value: regionFlowCache, writable: true, configurable: true }); }
      catch (_e) { getDataFlowGroupsUncached._regionFlowCache = regionFlowCache; }
    }
    const regionGeomKey = arr => {
      const list = (Array.isArray(arr) ? arr : []).map(it => `${Math.max(0, Math.round(Number(it && it.cid) || 0))}:${Math.max(0, Math.round(Number(it && it.col) || 0))},${Math.max(0, Math.round(Number(it && it.row) || 0))}`).sort();
      return `${list.length}|${list.join(";")}`;
    };
    const putRegionFlowCache = (key, value) => {
      if (!key || !value) return;
      regionFlowCache.set(key, value);
      const LIMIT = 4096;
      if (regionFlowCache.size > LIMIT) {
        const drop = regionFlowCache.size - LIMIT;
        let i = 0;
        for (const k of regionFlowCache.keys()) {
          regionFlowCache.delete(k);
          i++;
          if (i >= drop) break;
        }
      }
    };
    const getCachedCidSet = cached => {
      if (!cached || typeof cached !== "object") return null;
      if (cached.cidSet instanceof Set) return cached.cidSet;
      const pts = Array.isArray(cached.points) ? cached.points : [];
      const set = new Set();
      for (const p of pts) set.add(Math.max(0, Math.round(Number(p && p.cid) || 0)));
      try { cached.cidSet = set; } catch (_e) { }
      return set;
    };
    const rebuildOrderedFromCached = (arr, cached) => {
      if (!Array.isArray(arr) || !arr.length || !cached || !Array.isArray(cached.points)) return null;
      const byCid = new Map(arr.map(it => [Math.max(0, Math.round(Number(it && it.cid) || 0)), it]));
      const used = new Set(), rebuilt = [];
      for (const p of cached.points) {
        const cid = Math.max(0, Math.round(Number(p && p.cid) || 0));
        if (used.has(cid)) continue;
        const src = byCid.get(cid);
        if (!src) continue;
        rebuilt.push({ ...src, baseIdx: rebuilt.length });
        used.add(cid);
      }
      if (rebuilt.length !== arr.length) return null;
      return rebuilt;
    };
    const regionOfCell = (ix, iy) => {
      if (regions && Array.isArray(regions.cellToRegion)) {
        const rid = regions.cellToRegion[iy * topo.cols + ix];
        if (Number.isFinite(rid)) return rid >= 0 ? Math.max(0, Math.round(Number(rid) || 0)) : -1;
      }
      if (regions && regions.regionsById && typeof regions.regionsById.values === "function") {
        for (const rg of regions.regionsById.values()) {
          if (!rg) continue;
          const c0 = Math.max(0, Math.round(Number(rg.c0) || 0)), c1 = Math.max(c0 + 1, Math.round(Number(rg.c1) || 0));
          const r0 = Math.max(0, Math.round(Number(rg.r0) || 0)), r1 = Math.max(r0 + 1, Math.round(Number(rg.r1) || 0));
          if (ix >= c0 && ix < c1 && iy >= r0 && iy < r1) return Math.max(0, Math.round(Number(rg.id) || 0));
        }
      }
      return -1;
    };
    const stat = new Map();
    const manualStatKey = (rid, cid) => `${rid}|${cid}`;
    for (let iy = 0; iy < topo.rows; iy++) {
      if (checkCalcTimeout(budget)) return [];
      for (let ix = 0; ix < topo.cols; ix++) {
        if (checkCalcTimeout(budget)) return [];
        if (hs && hs.has(maskCellKey(ix, iy))) continue;
        const ridCell = regionOfCell(ix, iy);
        if (ridCell < 0) continue;
        const idx = iy * topo.cols + ix, cid = topo.comp[idx], cw = Math.min(cx, r.width - ix * cx), ch = Math.min(cy, r.height - iy * cy), u = ix * cx + cw / 2, v = iy * cy + ch / 2, seed = topo.seed[cid] || { col: ix, row: iy };
        const key = manualRegionsActive ? manualStatKey(ridCell, cid) : String(cid);
        let s = stat.get(key);
        if (!s) { s = { cid, rid: ridCell, col: seed.col, row: seed.row, sumU: 0, sumV: 0, count: 0, minCol: ix, maxCol: ix, minRow: iy, maxRow: iy, ridCounts: {} }; stat.set(key, s); }
        s.sumU += u; s.sumV += v; s.count++;
        if (ix < s.minCol) s.minCol = ix; if (ix > s.maxCol) s.maxCol = ix; if (iy < s.minRow) s.minRow = iy; if (iy > s.maxRow) s.maxRow = iy;
        if (!manualRegionsActive) {
          const k = String(ridCell);
          s.ridCounts[k] = (s.ridCounts[k] | 0) + 1;
        } else {
          s.rid = ridCell;
        }
      }
    }
    const list = [...stat.values()].filter(s => s.count > 0).map(s => {
      const u = s.sumU / s.count, v = s.sumV / s.count;
      const rowBand = Math.max(0, Math.min(topo.rows - 1, Math.round(Number(s.minRow) || 0)));
      const colBand = Math.max(0, Math.min(topo.cols - 1, Math.round(Number(s.minCol) || 0)));
      let rid = Math.max(0, Math.round(Number(s.rid) || 0));
      if (!manualRegionsActive) {
        rid = -1;
        let best = 0;
        for (const [rk, rv] of Object.entries(s.ridCounts || {})) {
          const c = rv | 0, id = Math.max(0, Math.round(Number(rk) || 0));
          if (c > best) { best = c; rid = id; }
        }
      }
      return { cid: s.cid, col: colBand, row: rowBand, u, v, minCol: s.minCol, maxCol: s.maxCol, minRow: s.minRow, maxRow: s.maxRow, rid };
    });
    if (!list.length) return [];
    const orderByMode = (arr, m, useZ = zMode) => {
      const src = (Array.isArray(arr) ? arr : []).map(it => ({
        ...it,
        _rowTop: Math.max(0, Math.round(Number(it && it.minRow) || Number(it && it.row) || 0)),
        _rowBottom: Math.max(0, Math.round(Number(it && it.maxRow) || Number(it && it.row) || 0)),
        _colLeft: Math.max(0, Math.round(Number(it && it.minCol) || Number(it && it.col) || 0)),
        _colRight: Math.max(0, Math.round(Number(it && it.maxCol) || Number(it && it.col) || 0))
      }));
      switch (m) {
        case "h_bl_lr": return useZ ? buildZOrder(src, "_rowBottom", "desc", "_colLeft", "asc") : buildSnakeOrder(src, "_rowBottom", "desc", "_colLeft", "asc");
        case "h_tl_lr": return useZ ? buildZOrder(src, "_rowTop", "asc", "_colLeft", "asc") : buildSnakeOrder(src, "_rowTop", "asc", "_colLeft", "asc");
        case "h_br_rl": return useZ ? buildZOrder(src, "_rowBottom", "desc", "_colRight", "desc") : buildSnakeOrder(src, "_rowBottom", "desc", "_colRight", "desc");
        case "h_tr_rl": return useZ ? buildZOrder(src, "_rowTop", "asc", "_colRight", "desc") : buildSnakeOrder(src, "_rowTop", "asc", "_colRight", "desc");
        case "v_lb_bu": return useZ ? buildZOrder(src, "_colLeft", "asc", "_rowBottom", "desc") : buildSnakeOrder(src, "_colLeft", "asc", "_rowBottom", "desc");
        case "v_rb_bu": return useZ ? buildZOrder(src, "_colRight", "desc", "_rowBottom", "desc") : buildSnakeOrder(src, "_colRight", "desc", "_rowBottom", "desc");
        case "v_lt_td": return useZ ? buildZOrder(src, "_colLeft", "asc", "_rowTop", "asc") : buildSnakeOrder(src, "_colLeft", "asc", "_rowTop", "asc");
        case "v_rt_td": return useZ ? buildZOrder(src, "_colRight", "desc", "_rowTop", "asc") : buildSnakeOrder(src, "_colRight", "desc", "_rowTop", "asc");
        default: return buildSnakeOrder(src, "_rowTop", "asc", "_colLeft", "asc");
      }
    };
    const modeAxes = m => {
      switch (String(m || "")) {
        case "h_bl_lr": return { primary: "row", primaryDir: "desc", secondaryStart: "asc" };
        case "h_tl_lr": return { primary: "row", primaryDir: "asc", secondaryStart: "asc" };
        case "h_br_rl": return { primary: "row", primaryDir: "desc", secondaryStart: "desc" };
        case "h_tr_rl": return { primary: "row", primaryDir: "asc", secondaryStart: "desc" };
        case "v_lb_bu": return { primary: "col", primaryDir: "asc", secondaryStart: "desc" };
        case "v_rb_bu": return { primary: "col", primaryDir: "desc", secondaryStart: "desc" };
        case "v_lt_td": return { primary: "col", primaryDir: "asc", secondaryStart: "asc" };
        case "v_rt_td": return { primary: "col", primaryDir: "desc", secondaryStart: "asc" };
        default: return { primary: "row", primaryDir: "asc", secondaryStart: "asc" };
      }
    };
    const buildManualRegionOrdered = (arr, rid, m, useZ) => {
      const items = Array.isArray(arr) ? arr : [];
      if (!items.length) return items;
      const byCid = new Map(items.map(it => [Math.max(0, Math.round(Number(it && it.cid) || 0)), it]));
      const cfg = modeAxes(m), cellsByPrimary = new Map();
      for (let iy = 0; iy < topo.rows; iy++) {
        for (let ix = 0; ix < topo.cols; ix++) {
          if (hs && hs.has(maskCellKey(ix, iy))) continue;
          const rr = regionOfCell(ix, iy);
          if (rr !== rid) continue;
          const cid = Math.max(0, Math.round(Number(topo.comp[iy * topo.cols + ix]) || 0));
          if (!byCid.has(cid)) continue;
          const primary = (cfg.primary === "row") ? iy : ix, secondary = (cfg.primary === "row") ? ix : iy, third = (cfg.primary === "row") ? iy : ix;
          const key = String(primary), bucket = cellsByPrimary.get(key) || [];
          bucket.push({ primary, secondary, third, cid });
          cellsByPrimary.set(key, bucket);
        }
      }
      const primaryVals = [...cellsByPrimary.values()].map(v => v[0].primary).sort((a, b) => cfg.primaryDir === "asc" ? a - b : b - a);
      const cidOrder = [], seen = new Set();
      let dir = cfg.secondaryStart;
      for (const pv of primaryVals) {
        const key = String(pv), band = (cellsByPrimary.get(key) || []).slice().sort((a, b) => {
          const d = dir === "asc" ? (a.secondary - b.secondary) : (b.secondary - a.secondary);
          return d || (a.third - b.third) || ((a.cid | 0) - (b.cid | 0));
        });
        for (const c of band) {
          if (seen.has(c.cid)) continue;
          seen.add(c.cid);
          cidOrder.push(c.cid);
        }
        if (!useZ) dir = (dir === "asc") ? "desc" : "asc";
      }
      const ordered = [];
      for (const cid of cidOrder) {
        const it = byCid.get(cid);
        if (it) ordered.push(it);
      }
      if (ordered.length !== items.length) {
        for (const it of items) {
          const cid = Math.max(0, Math.round(Number(it && it.cid) || 0));
          if (seen.has(cid)) continue;
          ordered.push(it);
        }
      }
      return ordered;
    };
    const orientEndpointsByMode = arr => (Array.isArray(arr) ? arr : []);
    const alignEndpointByMode = arr => (Array.isArray(arr) ? arr : []);
    const groupOf = it => {
      if (Number.isFinite(Number(it && it.rid)) && Number(it.rid) >= 0) return Math.max(0, Math.round(Number(it.rid) || 0));
      if (regions && Array.isArray(regions.cellToRegion)) {
        const idx = it.row * topo.cols + it.col;
        const rid = regions.cellToRegion[idx];
        if (rid >= 0) return rid;
        return -1;
      }
      if (regions && regions.regionsById && typeof regions.regionsById.values === "function") {
        for (const rg of regions.regionsById.values()) {
          if (!rg) continue;
          const c0 = Math.max(0, Math.round(Number(rg.c0) || 0)), c1 = Math.max(c0 + 1, Math.round(Number(rg.c1) || 0));
          const r0 = Math.max(0, Math.round(Number(rg.r0) || 0)), r1 = Math.max(r0 + 1, Math.round(Number(rg.r1) || 0));
          if (it.col >= c0 && it.col < c1 && it.row >= r0 && it.row < r1) return Math.max(0, Math.round(Number(rg.id) || 0));
        }
      }
      if (regions && Array.isArray(regions.colToGroup)) {
        const gx = regions.colToGroup[Math.max(0, Math.min(regions.colToGroup.length - 1, it.col))];
        if (Number.isFinite(gx)) return Math.max(0, Math.round(Number(gx) || 0));
      }
      if (regions && Array.isArray(regions.rowToGroup)) {
        const gy = regions.rowToGroup[Math.max(0, Math.min(regions.rowToGroup.length - 1, it.row))];
        if (Number.isFinite(gy)) return Math.max(0, Math.round(Number(gy) || 0));
      }
      return -1;
    };
    const byRegion = new Map();
    for (const it of list) {
      if (checkCalcTimeout(budget)) return [];
      const rid = groupOf(it);
      if (!(Number.isFinite(rid) && rid >= 0)) continue;
      const arr = byRegion.get(rid) || [];
      arr.push(it); byRegion.set(rid, arr);
    }
    const out = [];
    for (const [rid, arr] of byRegion) {
      if (checkCalcTimeout(budget)) return [];
      const cfgRegion = getFlowRegionConfig(r, rid);
      if (cfgRegion && cfgRegion.startPinned && cfgRegion.startCid != null) {
        const hasStartCid = arr.some(it => Math.max(0, Math.round(Number(it && it.cid) || 0)) === Math.max(0, Math.round(Number(cfgRegion.startCid) || 0)));
        if (!hasStartCid) { cfgRegion.startCid = null; cfgRegion.startPinned = false; cfgRegion.startDir = ""; }
      }
      const routing = getFlowStartRoutingRegion(r, rid);
      const localMode = resolveFlowModeFromStartAndDir(arr, routing, getFlowModeRegion(r, rid, mode));
      const regionLocks = getFlowLocksRegion(r, rid);
      let baseOrderedRaw = orderByMode(arr, localMode, zMode);
      if (manualRegionsActive) baseOrderedRaw = buildManualRegionOrdered(arr, rid, localMode, zMode);
      const baseAligned = alignEndpointByMode(baseOrderedRaw, localMode, routing);
      const baseOrdered = baseAligned.map((it, idx) => ({ ...it, baseIdx: idx }));
      const manualRoute = (routing && (((routing.startPinned && routing.startCid != null) || FLOW_DIR_SET.has(String(routing.startDir || "").toLowerCase()))));
      const hasLocks = Array.isArray(regionLocks) && regionLocks.length > 0;
      const canUseRegionCache = !manualRegionsActive && !manualRoute && !hasLocks;
      const cachePrefix = `v2|${localMode}|${zMode ? 1 : 0}|`;
      const cacheKey = canUseRegionCache ? `${cachePrefix}${regionGeomKey(arr)}` : "";
      let zFallbackUsed = false;
      let ordered = baseOrdered, fromCache = false;
      if (canUseRegionCache && cacheKey) {
        const cached = regionFlowCache.get(cacheKey);
        if (cached && Array.isArray(cached.points) && cached.points.length) {
          const rebuilt = rebuildOrderedFromCached(arr, cached);
          if (rebuilt && !pathSelfCrosses(rebuilt)) {
            ordered = rebuilt;
            zFallbackUsed = !!cached.zFallback;
            fromCache = true;
          }
        }
      }
      if (canUseRegionCache && !fromCache) {
        const curCids = arr.map(it => Math.max(0, Math.round(Number(it && it.cid) || 0)));
        const curSet = new Set(curCids);
        let best = null;
        for (const [k, cached] of regionFlowCache) {
          if (typeof k !== "string" || !k.startsWith(cachePrefix)) continue;
          if (!cached || !Array.isArray(cached.points) || cached.points.length < arr.length) continue;
          const set = getCachedCidSet(cached);
          if (!set || set.size < curSet.size) continue;
          let ok = true;
          for (const cid of curSet) { if (!set.has(cid)) { ok = false; break; } }
          if (!ok) continue;
          const extra = set.size - curSet.size;
          if (!best || extra < best.extra) best = { cached, extra };
          if (extra === 0) break;
        }
        if (best && best.cached) {
          const rebuilt = rebuildOrderedFromCached(arr, best.cached);
          if (rebuilt && !pathSelfCrosses(rebuilt)) {
            ordered = rebuilt;
            zFallbackUsed = !!best.cached.zFallback;
            fromCache = true;
          }
        }
      }
      if (!fromCache) {
        if (!manualRoute && !hasLocks) {
          ordered = baseOrdered;
        } else if (!manualRoute) {
          ordered = (zMode ? baseOrdered : refineFlowOrder(baseOrdered));
          if (!zMode && ordered.length <= FLOW_OPTIMIZE_MAX_POINTS) ordered = optimizeFlowPathShortest(ordered);
          if (pathSelfCrosses(ordered)) {
            const altUseZ = !zMode;
            const altBase = orderByMode(arr, localMode, altUseZ).map((it, idx) => ({ ...it, baseIdx: idx }));
            let altOrdered = altUseZ ? altBase : refineFlowOrder(altBase);
            if (!altUseZ && altOrdered.length <= FLOW_OPTIMIZE_MAX_POINTS) altOrdered = optimizeFlowPathShortest(altOrdered);
            if (!pathSelfCrosses(altOrdered)) { ordered = altOrdered; zFallbackUsed = !!altUseZ; }
            else if (flowPathCost(altOrdered) + 1e-6 < flowPathCost(ordered)) { ordered = altOrdered; zFallbackUsed = !!altUseZ; }
          } else if (!zMode) {
            const baseCost = flowPathCost(baseOrdered), optCost = flowPathCost(ordered);
            if (baseCost + 1e-6 < optCost) ordered = baseOrdered;
          }
        }
        ordered = applyFlowStartRouting(ordered, routing, budget);
        ordered = applyFlowLocksToOrdered(ordered, regionLocks, budget);
        if (pathSelfCrosses(ordered)) {
          const head = ordered[0], rest = ordered.slice(1), base = (head && head.baseIdx != null) ? head.baseIdx : 0, strictState = { nodes: 0, limit: FLOW_SEARCH_NODE_LIMIT_STRICT, aborted: false };
          const strict = flowSearchOrder([head], rest, base, false, strictState);
          if (strict && !pathSelfCrosses(strict)) {
            const relocked = applyFlowLocksToOrdered(strict, regionLocks, budget);
            if (!pathSelfCrosses(relocked)) ordered = relocked;
          } else {
            const opt = optimizeFlowPathShortest(ordered);
            if (!pathSelfCrosses(opt)) {
              const relocked = applyFlowLocksToOrdered(opt, regionLocks, budget);
              if (!pathSelfCrosses(relocked)) ordered = relocked;
            }
          }
        }
        ordered = orientEndpointsByMode(ordered, localMode, routing);
        if (canUseRegionCache && cacheKey) {
          if (!pathSelfCrosses(ordered)) {
            const points = ordered.map(v => ({ cid: Math.max(0, Math.round(Number(v && v.cid) || 0)) }));
            const cidSet = new Set(points.map(p => p.cid));
            putRegionFlowCache(cacheKey, { zFallback: !!zFallbackUsed, points, cidSet });
          }
        }
      }
      const rgb = REGION_ZONE_COLORS[((rid % REGION_ZONE_COLORS.length) + REGION_ZONE_COLORS.length) % REGION_ZONE_COLORS.length];
      const label = (regions && regions.regionsById && regions.regionsById.get(rid) && regions.regionsById.get(rid).label) || toLetters(rid);
      const orderedPoints = ordered.map(v => ({
        u: v.u,
        v: v.v,
        cid: v.cid,
        spanCols: Math.max(1, (Math.max(0, Math.round(Number(v && v.maxCol) || Number(v && v.col) || 0)) - Math.max(0, Math.round(Number(v && v.minCol) || Number(v && v.col) || 0)) + 1)),
        spanRows: Math.max(1, (Math.max(0, Math.round(Number(v && v.maxRow) || Number(v && v.row) || 0)) - Math.max(0, Math.round(Number(v && v.minRow) || Number(v && v.row) || 0)) + 1)),
        bw: Math.max(cx, (Math.max(0, Math.round(Number(v && v.maxCol) || Number(v && v.col) || 0)) - Math.max(0, Math.round(Number(v && v.minCol) || Number(v && v.col) || 0)) + 1) * cx),
        bh: Math.max(cy, (Math.max(0, Math.round(Number(v && v.maxRow) || Number(v && v.row) || 0)) - Math.max(0, Math.round(Number(v && v.minRow) || Number(v && v.row) || 0)) + 1) * cy)
      }));
      const debugInfo = {
        rid,
        label,
        localMode,
        manualRegionsActive: !!manualRegionsActive,
        manualRoute: !!manualRoute,
        hasLocks: !!hasLocks,
        lockCount: Array.isArray(regionLocks) ? regionLocks.length : 0,
        fromCache: !!fromCache,
        zFallback: !!zFallbackUsed,
        startPinned: !!(routing && routing.startPinned),
        startCid: (routing && Number.isFinite(Number(routing.startCid))) ? Math.max(0, Math.round(Number(routing.startCid) || 0)) : null,
        startDir: String(routing && routing.startDir || ""),
        points: orderedPoints.length,
        selfCross: !!pathSelfCrosses(ordered)
      };
      out.push({ rid, label, rgb, zFallback: !!zFallbackUsed, points: orderedPoints, _dbg: debugInfo });
    }
    out.sort((a, b) => a.rid - b.rid);
    return out;
  };

  return {
    getDataFlowGroupsUncached
  };
};

