export const setupRectCachePersistenceController = (deps = {}) => {
  const {
    PROJECT_CACHE_VERSION,
    getRectCalcCache,
    toLetters
  } = deps;

  const hasMultipleRegions = regs => {
    const list = Array.isArray(regs) ? regs : [];
    if (list.length > 1) return true;
    const ids = new Set();
    for (const g of list) ids.add(Math.max(0, Math.round(Number(g && g.id) || 0)));
    return ids.size > 1;
  };

  const hasMultipleFlows = groups => {
    const list = Array.isArray(groups) ? groups : [];
    if (list.length > 1) return true;
    const ids = new Set();
    for (const g of list) ids.add(Math.max(0, Math.round(Number(g && g.rid) || 0)));
    return ids.size > 1;
  };

  const buildPersistedRectCache = r => {
    const cache = r && r._calcCache;
    if (!cache || typeof cache !== "object") return null;
    const out = { version: PROJECT_CACHE_VERSION }, topoEntry = cache.topo, regEntry = cache.regions, flowEntry = cache.flow;
    if (topoEntry && typeof topoEntry === "object" && topoEntry.key && topoEntry.value) {
      const t = topoEntry.value, links = t && t.links;
      if (t && Array.isArray(t.comp) && Array.isArray(t.seed) && Array.isArray(t.color)) {
        out.topology = {
          key: String(topoEntry.key),
          cols: Math.max(1, Math.round(Number(t.cols) || 1)),
          rows: Math.max(1, Math.round(Number(t.rows) || 1)),
          count: Math.max(1, Math.round(Number(t.count) || 1)),
          comp: [...t.comp],
          seed: t.seed.map(s => ({ col: Math.max(0, Math.round(Number(s && s.col) || 0)), row: Math.max(0, Math.round(Number(s && s.row) || 0)) })),
          color: [...t.color],
          links: Array.isArray(links) ? [...links] : (links && typeof links.forEach === "function" ? [...links] : [])
        };
      }
    }
    if (regEntry && typeof regEntry === "object" && regEntry.key && regEntry.value && !regEntry.value._timedOut && !regEntry.pending) {
      const v = regEntry.value, regs = Array.isArray(v.regions) ? v.regions : [...(v.regionsById && typeof v.regionsById.values === "function" ? v.regionsById.values() : [])];
      if (Array.isArray(v.colToGroup) && Array.isArray(v.rowToGroup) && Array.isArray(v.cellToRegion) && regs.length && hasMultipleRegions(regs)) {
        out.regions = {
          key: String(regEntry.key),
          nx: Math.max(1, Math.round(Number(v.nx) || 1)),
          ny: Math.max(1, Math.round(Number(v.ny) || 1)),
          colToGroup: [...v.colToGroup],
          rowToGroup: [...v.rowToGroup],
          xCutsPx: Array.isArray(v.xCutsPx) ? [...v.xCutsPx] : [0, Math.max(1, Math.round(Number(r && r.width) || 1))],
          yCutsPx: Array.isArray(v.yCutsPx) ? [...v.yCutsPx] : [0, Math.max(1, Math.round(Number(r && r.height) || 1))],
          cellToRegion: [...v.cellToRegion],
          list: regs.map(g => ({ id: Math.max(0, Math.round(Number(g && g.id) || 0)), label: String(g && g.label || "A"), gx: Math.max(0, Math.round(Number(g && g.gx) || 0)), gy: Math.max(0, Math.round(Number(g && g.gy) || 0)), c0: Math.max(0, Math.round(Number(g && g.c0) || 0)), c1: Math.max(0, Math.round(Number(g && g.c1) || 0)), r0: Math.max(0, Math.round(Number(g && g.r0) || 0)), r1: Math.max(0, Math.round(Number(g && g.r1) || 0)), w: Math.max(0, Number(g && g.w) || 0), h: Math.max(0, Number(g && g.h) || 0) }))
        };
      }
    }
    if (flowEntry && typeof flowEntry === "object" && flowEntry.key && flowEntry.regionKey && flowEntry.value && !flowEntry.pending) {
      const gs = Array.isArray(flowEntry.value) ? flowEntry.value : [];
      if (gs.length && hasMultipleFlows(gs)) {
        out.flow = {
          key: String(flowEntry.key),
          regionKey: String(flowEntry.regionKey || ""),
          list: gs.map(g => ({
            rid: Math.max(0, Math.round(Number(g && g.rid) || 0)),
            label: String(g && g.label || ""),
            rgb: Array.isArray(g && g.rgb) ? [Math.max(0, Math.min(255, Math.round(Number(g.rgb[0]) || 0))), Math.max(0, Math.min(255, Math.round(Number(g.rgb[1]) || 0))), Math.max(0, Math.min(255, Math.round(Number(g.rgb[2]) || 0)))] : [255, 0, 0],
            zFallback: !!(g && g.zFallback),
            points: (Array.isArray(g && g.points) ? g.points : []).map(p => ({
              u: Number(p && p.u) || 0,
              v: Number(p && p.v) || 0,
              cid: Math.max(0, Math.round(Number(p && p.cid) || 0))
            }))
          }))
        };
      }
    }
    if (!out.topology && !out.regions && !out.flow) return null;
    return out;
  };

  const restorePersistedRectCache = (r, raw) => {
    if (!r || !raw || typeof raw !== "object") return;
    if (Number(raw.version) !== PROJECT_CACHE_VERSION) return;
    const cache = getRectCalcCache(r);
    if (raw.topology && typeof raw.topology === "object") {
      const t = raw.topology;
      if (t.key && Number.isFinite(Number(t.cols)) && Number.isFinite(Number(t.rows)) && Array.isArray(t.comp) && Array.isArray(t.seed) && Array.isArray(t.color)) {
        const value = { cols: Math.max(1, Math.round(Number(t.cols) || 1)),
          rows: Math.max(1, Math.round(Number(t.rows) || 1)),
          count: Math.max(1, Math.round(Number(t.count)) || (Math.max(1, Math.round(Number(t.cols) || 1)) * Math.max(1, Math.round(Number(t.rows) || 1)))),
          comp: [...t.comp], seed: t.seed.map(s => ({ col: Math.max(0, Math.round(Number(s && s.col) || 0)),
          row: Math.max(0, Math.round(Number(s && s.row) || 0)) })),
          color: [...t.color], links: new Set(Array.isArray(t.links) ? t.links : []) };
        cache.topo = { key: String(t.key), value };
      }
    }
    if (raw.regions && typeof raw.regions === "object") {
      const g = raw.regions;
      if (g.key && Array.isArray(g.colToGroup) && Array.isArray(g.rowToGroup) && Array.isArray(g.cellToRegion) && Array.isArray(g.list) && g.list.length) {
        const list = g.list.map(it => ({ id: Math.max(0, Math.round(Number(it && it.id) || 0)), label: String(it && it.label || toLetters(Math.max(0, Math.round(Number(it && it.id) || 0)))), gx: Math.max(0, Math.round(Number(it && it.gx) || 0)), gy: Math.max(0, Math.round(Number(it && it.gy) || 0)), c0: Math.max(0, Math.round(Number(it && it.c0) || 0)), c1: Math.max(0, Math.round(Number(it && it.c1) || 0)), r0: Math.max(0, Math.round(Number(it && it.r0) || 0)), r1: Math.max(0, Math.round(Number(it && it.r1) || 0)), w: Math.max(0, Number(it && it.w) || 0), h: Math.max(0, Number(it && it.h) || 0) }));
        if (hasMultipleRegions(list)) {
          const byId = new Map(); for (const it of list) byId.set(it.id, it);
          const value = { nx: Math.max(1, Math.round(Number(g.nx) || 1)), ny: Math.max(1, Math.round(Number(g.ny) || 1)), colToGroup: [...g.colToGroup], rowToGroup: [...g.rowToGroup], regionsById: byId, xCutsPx: Array.isArray(g.xCutsPx) ? [...g.xCutsPx] : [0, Math.max(1, Math.round(Number(r.width) || 1))], yCutsPx: Array.isArray(g.yCutsPx) ? [...g.yCutsPx] : [0, Math.max(1, Math.round(Number(r.height) || 1))], cellToRegion: [...g.cellToRegion], regions: list };
          try { Object.defineProperty(value, "_calcKey", { value: String(g.key), writable: true, configurable: true }); }
          catch (_e) { value._calcKey = String(g.key); }
          cache.regions = { key: String(g.key), value };
        }
      }
    }
    if (raw.flow && typeof raw.flow === "object") {
      const g = raw.flow;
      if (g.key && g.regionKey != null && Array.isArray(g.list) && g.list.length) {
        const list = g.list.map(it => ({
          rid: Math.max(0, Math.round(Number(it && it.rid) || 0)),
          label: String(it && it.label || ""),
          rgb: Array.isArray(it && it.rgb) ? [Math.max(0, Math.min(255, Math.round(Number(it.rgb[0]) || 0))), Math.max(0, Math.min(255, Math.round(Number(it.rgb[1]) || 0))), Math.max(0, Math.min(255, Math.round(Number(it.rgb[2]) || 0)))] : [255, 0, 0],
          zFallback: !!(it && it.zFallback),
          points: (Array.isArray(it && it.points) ? it.points : []).map(p => ({ u: Number(p && p.u) || 0, v: Number(p && p.v) || 0, cid: Math.max(0, Math.round(Number(p && p.cid) || 0)) }))
        }));
        if (hasMultipleFlows(list)) cache.flow = { key: String(g.key), regionKey: String(g.regionKey || ""), value: list, pending: false };
      }
    }
  };

  return {
    buildPersistedRectCache,
    restorePersistedRectCache
  };
};

