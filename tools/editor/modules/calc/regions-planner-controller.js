export const setupRegionsPlannerController = (deps = {}) => {
  const {
    calcNow,
    checkCalcTimeout,
    buildSingleRegionPlan,
    safeDefine,
    maskCellKey,
    AREA_LIMIT_EPS,
    SPLIT_VARIANT_MAX,
    toLetters
  } = deps;
  const toInt0 = v => Math.max(0, Math.round(Number(v) || 0));
  const clampInt = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(Number(v) || 0)));
  const rectSig = z => `${z.c0},${z.c1},${z.r0},${z.r1}`;
  const regsSig = regs => (Array.isArray(regs) ? regs.map(rectSig).sort().join("|") : "");

const splitIndicesBySize = (sizes, groups) => {
  const n = sizes.length, g = Math.max(1, Math.min(groups, n)); if (g === 1) return [0, n];
  const pref = [0]; for (let i = 0; i < n; i++)pref.push(pref[i] + sizes[i]); const total = pref[n], cuts = [0]; let prev = 0;
  for (let k = 1; k < g; k++) {
    const target = (total * k) / g, minIdx = prev + 1, maxIdx = n - (g - k); let best = minIdx, bestDiff = 1e18;
    for (let idx = minIdx; idx <= maxIdx; idx++) { const diff = Math.abs(pref[idx] - target); if (diff < bestDiff) { bestDiff = diff; best = idx } }
    cuts.push(best); prev = best;
  }
  cuts.push(n); return cuts;
};
const planNumberRegionsUncached = (r, cx, cy, topo, hs, budget) => {
  const startedAt = calcNow();
  const makeSingle = (timedOut = false) => {
    r._splitVariantCount = 1;
    if (r && toInt0(r.splitVariant) !== 0) r.splitVariant = 0;
    const out = buildSingleRegionPlan(r, cx, cy, topo, hs);
    out.variantCount = 1;
    if (timedOut) {
      safeDefine(out, "_timedOut", true);
    }
    return out;
  };
  if (checkCalcTimeout(budget)) return makeSingle(true);
  const cols = Math.max(1, topo && topo.cols || 1), rows = Math.max(1, topo && topo.rows || 1), hset = hs || new Set();
  const cellW = []; for (let x = 0; x < r.width; x += cx)cellW.push(Math.min(cx, r.width - x));
  const cellH = []; for (let y = 0; y < r.height; y += cy)cellH.push(Math.min(cy, r.height - y));
  const prefSum = a => { const p = [0]; for (let i = 0; i < a.length; i++)p.push(p[i] + a[i]); return p };
  const colPref = prefSum(cellW), rowPref = prefSum(cellH);
  const visible = Array.from({ length: rows }, (_, iy) => Array.from({ length: cols }, (_, ix) => !hset.has(maskCellKey(ix, iy))));
  let c0 = cols, c1 = -1, r0 = rows, r1 = -1;
  for (let y = 0; y < rows; y++)for (let x = 0; x < cols; x++) {
    if (!visible[y][x]) continue;
    if (x < c0) c0 = x; if (x + 1 > c1) c1 = x + 1; if (y < r0) r0 = y; if (y + 1 > r1) r1 = y + 1;
  }
  if (c1 < 0) return makeSingle(false);
  const areaRect = (ac0, ac1, ar0, ar1) => (colPref[ac1] - colPref[ac0]) * (rowPref[ar1] - rowPref[ar0]);
  const maxAreaPx = (Math.max(1, r.scale || 256) * Math.max(1, r.scale || 256) * 655360) / Math.max(1, r.areaM2Px || 65536);
  const visibleAreaPx = Math.max(1, areaRect(c0, c1, r0, r1));
  const optimalCount = Math.max(1, Math.ceil(visibleAreaPx / Math.max(1, maxAreaPx)));
  const maxAllowedCount = optimalCount + 2;
  const normalizeManual = raw => {
    if (!Array.isArray(raw)) return [];
    const out = [];
    for (const it of raw) {
      if (!it || typeof it !== "object") continue;
      const sx = toInt0(it.sx), sy = toInt0(it.sy);
      const mc0 = toInt0(it.c0), mc1 = Math.max(mc0 + 1, toInt0(it.c1));
      const mr0 = toInt0(it.r0), mr1 = Math.max(mr0 + 1, toInt0(it.r1));
      const mid = Math.max(1, Math.round(Number(it.id) || out.length + 1));
      out.push({ id: mid, sx, sy, c0: mc0, c1: mc1, r0: mr0, r1: mr1 });
    }
    return out;
  };
  const buildPlanFromRects = rects => {
    const assigned = new Array(rows * cols).fill(-1), regs = [];
    const addRect = (z) => {
      let tc0 = cols, tc1 = -1, tr0 = rows, tr1 = -1, count = 0;
      for (let y = z.r0; y < z.r1; y++)for (let x = z.c0; x < z.c1; x++) {
        if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
        if (!visible[y][x]) continue;
        const idx = y * cols + x;
        if (assigned[idx] >= 0) continue;
        assigned[idx] = regs.length;
        if (x < tc0) tc0 = x; if (x + 1 > tc1) tc1 = x + 1; if (y < tr0) tr0 = y; if (y + 1 > tr1) tr1 = y + 1;
        count++;
      }
      if (count <= 0) return false;
      regs.push({ c0: tc0, c1: tc1, r0: tr0, r1: tr1 });
      return true;
    };
    const manual = Array.isArray(rects) ? rects : [];
    for (const z of manual) {
      const nz = {
        c0: clampInt(z && z.c0, 0, cols - 1),
        c1: Math.max(1, clampInt(z && z.c1, 0, cols)),
        r0: clampInt(z && z.r0, 0, rows - 1),
        r1: Math.max(1, clampInt(z && z.r1, 0, rows))
      }; if (nz.c1 <= nz.c0 || nz.r1 <= nz.r0) continue;
      if (areaRect(nz.c0, nz.c1, nz.r0, nz.r1) > maxAreaPx + AREA_LIMIT_EPS) continue;
      addRect(nz);
    }
    if (!regs.length) return null;
    regs.sort((a, b) => (a.r0 - b.r0) || (a.c0 - b.c0) || (a.r1 - b.r1) || (a.c1 - b.c1));
    const finalRegions = regs.map((z, idx) => ({ id: idx, label: toLetters(idx), gx: idx, gy: 0, c0: z.c0, c1: z.c1, r0: z.r0, r1: z.r1, w: colPref[z.c1] - colPref[z.c0], h: rowPref[z.r1] - rowPref[z.r0] }));
    const byId = new Map(); for (const rg of finalRegions) byId.set(rg.id, rg);
    const cellToRegion = new Array(rows * cols).fill(-1);
    for (const rg of finalRegions) {
      for (let y = rg.r0; y < rg.r1; y++)for (let x = rg.c0; x < rg.c1; x++)if (visible[y][x]) cellToRegion[y * cols + x] = rg.id;
    }
    return { nx: finalRegions.length, ny: 1, colToGroup: [], rowToGroup: [], regionsById: byId, xCutsPx: [0, r.width], yCutsPx: [0, r.height], cellToRegion, regions: finalRegions, variantCount: 1 };
  };
  const manualRects = normalizeManual(r && r.manualClusters);
  if (manualRects.length) {
    const manualPlan = buildPlanFromRects(manualRects);
    if (manualPlan) {
      r._splitVariantCount = 1;
      if (r && toInt0(r.splitVariant) !== 0) r.splitVariant = 0;
      safeDefine(manualPlan, "_profile", { variantCount: 1, optimalCount, maxAllowedCount, totalMs: Math.max(0, calcNow() - startedAt), manual: true });
      return manualPlan;
    }
  }
  const splitStrategies = [];
  const splitRots = [0, 90, -90];
  for (let seed = 0; seed < 3; seed++) {
    for (const rot of splitRots) {
      splitStrategies.push({ kind: "vertical", seed, rot });
      splitStrategies.push({ kind: "horizontal", seed, rot });
      splitStrategies.push({ kind: "block", seed, rot });
    }
  }
  const variants = [], seen = new Set();
  const topoComp = Array.isArray(topo && topo.comp) ? topo.comp : null;
  const compRegionMap = new Map();
  const variantRespectsMergedCells = regs => {
    if (!topoComp || !topoComp.length) return true;
    compRegionMap.clear();
    for (let y = r0; y < r1; y++)for (let x = c0; x < c1; x++) {
      if (!visible[y][x]) continue;
      const cellIdx = y * cols + x, compId = topoComp[cellIdx];
      if (compId === undefined || compId === null) continue;
      let rid = -1;
      for (let i = 0; i < regs.length; i++) {
        const z = regs[i];
        if (x >= z.c0 && x < z.c1 && y >= z.r0 && y < z.r1) { rid = i; break; }
      }
      if (rid < 0) continue;
      const prev = compRegionMap.get(compId);
      if (prev === undefined) compRegionMap.set(compId, rid);
      else if (prev !== rid) return false;
    }
    return true;
  };
  const rectHasVisible = (ac0, ac1, ar0, ar1) => {
    for (let y = ar0; y < ar1; y++)for (let x = ac0; x < ac1; x++)if (visible[y][x]) return true;
    return false;
  };
  const trimVisibleRects = regs => {
    const out = [];
    for (const z of regs) {
      let tc0 = cols, tc1 = -1, tr0 = rows, tr1 = -1;
      for (let y = z.r0; y < z.r1; y++)for (let x = z.c0; x < z.c1; x++) {
        if (!visible[y][x]) continue;
        if (x < tc0) tc0 = x; if (x + 1 > tc1) tc1 = x + 1; if (y < tr0) tr0 = y; if (y + 1 > tr1) tr1 = y + 1;
      }
      if (tc1 < 0) continue;
      out.push({ c0: tc0, c1: tc1, r0: tr0, r1: tr1 });
    }
    return out;
  };
  const coversAllVisible = regs => {
    for (let y = r0; y < r1; y++)for (let x = c0; x < c1; x++) {
      if (!visible[y][x]) continue;
      let ok = false;
      for (const z of regs) { if (x >= z.c0 && x < z.c1 && y >= z.r0 && y < z.r1) { ok = true; break; } }
      if (!ok) return false;
    }
    return true;
  };
  const addVariant = regs => {
    if (!Array.isArray(regs) || !regs.length) return;
    if (checkCalcTimeout(budget)) return;
    const pruned = trimVisibleRects(regs);
    if (!pruned.length) return;
    for (const z of pruned) {
      if (areaRect(z.c0, z.c1, z.r0, z.r1) > maxAreaPx + AREA_LIMIT_EPS) return;
    }
    if (!coversAllVisible(pruned)) return;
    if (!variantRespectsMergedCells(pruned)) return;
    const sig = regsSig(pruned);
    if (seen.has(sig)) return;
    seen.add(sig);
    variants.push(pruned);
  };
  const regionArea = z => areaRect(z.c0, z.c1, z.r0, z.r1);
  const variantBad = regs => {
    let bad = 0;
    for (const z of regs) bad += Math.abs(maxAreaPx - regionArea(z));
    return bad;
  };
  const variantShape = regs => {
    let s = 0;
    for (const z of regs) {
      const w = Math.max(1e-6, colPref[z.c1] - colPref[z.c0]), h = Math.max(1e-6, rowPref[z.r1] - rowPref[z.r0]);
      s += (Math.max(w, h) / Math.min(w, h)) - 1;
    }
    return s;
  };
  const canSplitByComp = (z, dir, cut) => {
    if (!topoComp || !topoComp.length) return true;
    if (dir === "v") {
      if (cut <= z.c0 || cut >= z.c1) return false;
      for (let y = z.r0; y < z.r1; y++) {
        if (!visible[y][cut - 1] || !visible[y][cut]) continue;
        const a = topoComp[y * cols + (cut - 1)], b = topoComp[y * cols + cut];
        if (a === b) return false;
      }
      return true;
    }
    if (cut <= z.r0 || cut >= z.r1) return false;
    for (let x = z.c0; x < z.c1; x++) {
      if (!visible[cut - 1][x] || !visible[cut][x]) continue;
      const a = topoComp[(cut - 1) * cols + x], b = topoComp[cut * cols + x];
      if (a === b) return false;
    }
    return true;
  };
  const resolvePreferredDirs = (z, strategy) => {
    const kind = (strategy && strategy.kind) || "block";
    const rot = ((strategy && strategy.rot) | 0);
    let pref = "v", alt = "h";
    if (kind === "horizontal") { pref = "h"; alt = "v"; }
    else if (kind === "block") {
      let ww = colPref[z.c1] - colPref[z.c0], hh = rowPref[z.r1] - rowPref[z.r0];
      if (rot === 90 || rot === -90) { const t = ww; ww = hh; hh = t; }
      if (ww < hh) { pref = "h"; alt = "v"; }
    }
    if (rot === 90 || rot === -90) { const t = pref; pref = alt; alt = t; }
    return { pref, alt, rot };
  };
  const listCuts = (z, dir, strategy) => {
    const cuts = [];
    const total = regionArea(z);
    const target = Math.min(maxAreaPx, Math.max(1, total / 2));
    const rot = ((strategy && strategy.rot) | 0);
    if (dir === "v") {
      for (let cut = z.c0 + 1; cut < z.c1; cut++) {
        if (!canSplitByComp(z, "v", cut)) continue;
        if (!rectHasVisible(z.c0, cut, z.r0, z.r1)) continue;
        if (!rectHasVisible(cut, z.c1, z.r0, z.r1)) continue;
        const a1 = areaRect(z.c0, cut, z.r0, z.r1), a2 = areaRect(cut, z.c1, z.r0, z.r1);
        const balance = Math.abs(a1 - a2);
        const targetFit = Math.abs(a1 - target) + Math.abs(a2 - target);
        const centerBias = Math.abs(((z.c0 + z.c1) / 2) - cut) * 0.05 * cx * cy;
        let seam = 0;
        for (let y = z.r0; y < z.r1; y++)if (visible[y][cut - 1] && visible[y][cut]) seam++;
        const seamPenalty = seam * cx * cy * 4;
        const sideBias = (rot === 90 ? ((cut - z.c0) * 0.02 * cx * cy) : (rot === -90 ? ((z.c1 - cut) * 0.02 * cx * cy) : 0));
        const score = balance * 0.45 + targetFit * 0.35 + seamPenalty + centerBias + sideBias;
        cuts.push({ cut, score });
      }
    } else {
      for (let cut = z.r0 + 1; cut < z.r1; cut++) {
        if (!canSplitByComp(z, "h", cut)) continue;
        if (!rectHasVisible(z.c0, z.c1, z.r0, cut)) continue;
        if (!rectHasVisible(z.c0, z.c1, cut, z.r1)) continue;
        const a1 = areaRect(z.c0, z.c1, z.r0, cut), a2 = areaRect(z.c0, z.c1, cut, z.r1);
        const balance = Math.abs(a1 - a2);
        const targetFit = Math.abs(a1 - target) + Math.abs(a2 - target);
        const centerBias = Math.abs(((z.r0 + z.r1) / 2) - cut) * 0.05 * cx * cy;
        let seam = 0;
        for (let x = z.c0; x < z.c1; x++)if (visible[cut - 1][x] && visible[cut][x]) seam++;
        const seamPenalty = seam * cx * cy * 4;
        const sideBias = (rot === 90 ? ((cut - z.r0) * 0.02 * cx * cy) : (rot === -90 ? ((z.r1 - cut) * 0.02 * cx * cy) : 0));
        const score = balance * 0.45 + targetFit * 0.35 + seamPenalty + centerBias + sideBias;
        cuts.push({ cut, score });
      }
    }
    cuts.sort((a, b) => a.score - b.score);
    return cuts.map(it => it.cut);
  };
  const tryMergeRects = (a, b) => {
    if (!a || !b) return null;
    const touch = (a.c1 === b.c0) || (b.c1 === a.c0) || (a.r1 === b.r0) || (b.r1 === a.r0);
    if (!touch) return null;
    const overlapW = Math.min(a.c1, b.c1) - Math.max(a.c0, b.c0);
    const overlapH = Math.min(a.r1, b.r1) - Math.max(a.r0, b.r0);
    if (overlapW > 0 && overlapH > 0) return null;
    const u = { c0: Math.min(a.c0, b.c0), c1: Math.max(a.c1, b.c1), r0: Math.min(a.r0, b.r0), r1: Math.max(a.r1, b.r1) };
    const uArea = regionArea(u);
    if (uArea <= maxAreaPx + AREA_LIMIT_EPS) return u;
    return null;
  };
  const rectsOverlap = (a, b) => {
    const ow = Math.min(a.c1, b.c1) - Math.max(a.c0, b.c0);
    const oh = Math.min(a.r1, b.r1) - Math.max(a.r0, b.r0);
    return ow > 0 && oh > 0;
  };
  const mergeWouldConflict = (regs, i, j, u) => {
    for (let k = 0; k < regs.length; k++) {
      if (k === i || k === j) continue;
      if (rectsOverlap(u, regs[k])) return true;
    }
    return false;
  };
  const mergeNeighborRects = regs => {
    const out = Array.isArray(regs) ? regs.map(z => ({ c0: z.c0, c1: z.c1, r0: z.r0, r1: z.r1 })) : [];
    let changed = true, safe = 0;
    while (changed && safe < 1024) {
      safe++;
      changed = false;
      let best = null;
      for (let i = 0; i < out.length; i++) {
        for (let j = i + 1; j < out.length; j++) {
          const a = out[i], b = out[j], u = tryMergeRects(a, b);
          if (!u) continue;
          if (mergeWouldConflict(out, i, j, u)) continue;
          const before = Math.abs(maxAreaPx - regionArea(a)) + Math.abs(maxAreaPx - regionArea(b));
          const after = Math.abs(maxAreaPx - regionArea(u));
          const improve = before - after;
          const score = (-improve * 1e9) + after;
          if (!best || score < best.score) best = { i, j, u, score };
        }
      }
      if (best) {
        out.splice(best.j, 1);
        out.splice(best.i, 1, best.u);
        changed = true;
      }
    }
    return out;
  };
  const estPartsForRect = z => Math.max(1, Math.ceil(regionArea(z) / Math.max(1, maxAreaPx)));
  const makeRng = seed0 => {
    let s = (Math.floor(seed0) || 1) >>> 0;
    if (!s) s = 1;
    return () => {
      s = (1664525 * s + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
  const splitRectBy = (z, dir, cut) => {
    if (dir === "v") {
      return [
        { c0: z.c0, c1: cut, r0: z.r0, r1: z.r1 },
        { c0: cut, c1: z.c1, r0: z.r0, r1: z.r1 }
      ];
    }
    return [
      { c0: z.c0, c1: z.c1, r0: z.r0, r1: cut },
      { c0: z.c0, c1: z.c1, r0: cut, r1: z.r1 }
    ];
  };
  const pickSplitForRect = (regs, rectIndex, strategy, iter, partsEstimate, targetParts) => {
    const seed = Math.max(0, Math.round(Number(strategy && strategy.seed) || 0));
    const z = regs[rectIndex];
    const prefAlt = resolvePreferredDirs(z, strategy), pref = prefAlt.pref, alt = prefAlt.alt;
    const evalDir = (dir, rankBase) => {
      const cuts = listCuts(z, dir, strategy);
      if (!cuts.length) return null;
      const topN = Math.min(8, cuts.length);
      const shift = (seed + iter) % topN;
      let best = null;
      const currentParts = estPartsForRect(z);
      for (let k = 0; k < topN; k++) {
        const idx = (k + shift) % topN, cut = cuts[idx], ab = splitRectBy(z, dir, cut), a = ab[0], b = ab[1];
        if (!rectHasVisible(a.c0, a.c1, a.r0, a.r1) || !rectHasVisible(b.c0, b.c1, b.r0, b.r1)) continue;
        const aArea = regionArea(a), bArea = regionArea(b);
        const aParts = Math.max(1, Math.ceil(aArea / Math.max(1, maxAreaPx))), bParts = Math.max(1, Math.ceil(bArea / Math.max(1, maxAreaPx)));
        const estParts = partsEstimate - currentParts + aParts + bParts;
        const nextCount = regs.length + 1;
        const overflow = Math.max(0, aArea - maxAreaPx) + Math.max(0, bArea - maxAreaPx);
        const balance = Math.abs(aArea - bArea);
        const deltaCount = Math.abs(nextCount - targetParts);
        const deltaParts = Math.abs(estParts - targetParts);
        const score = deltaCount * 1e12 + deltaParts * 1e10 + estParts * 1e8 + overflow * 1e6 + balance + rankBase * 1e4 + k * 10;
        if (!best || score < best.score) best = { dir, cut, left: a, right: b, score };
      }
      return best;
    };
    const p = evalDir(pref, 0), a = evalDir(alt, 1);
    if (p && a) return p.score <= a.score ? p : a;
    return p || a || null;
  };
  const bestSplitForRect = (regs, rectIndex, strategy, iter, targetParts) => {
    const z = regs[rectIndex], prefAlt = resolvePreferredDirs(z, strategy), pref = prefAlt.pref, alt = prefAlt.alt;
    const evalDir = (dir, rankBase) => {
      const cuts = listCuts(z, dir, strategy);
      if (!cuts.length) return null;
      const topN = Math.min(12, cuts.length);
      let best = null;
      for (let k = 0; k < topN; k++) {
        const cut = cuts[k], ab = splitRectBy(z, dir, cut), a = ab[0], b = ab[1];
        const next = [...regs.slice(0, rectIndex), a, b, ...regs.slice(rectIndex + 1)];
        const score = Math.abs(next.length - targetParts) * 1e15 + variantBad(next) * 1e3 + k * 10 + rankBase;
        if (!best || score < best.score) best = { dir, cut, left: a, right: b, score };
      }
      return best;
    };
    const p = evalDir(pref, 0), a = evalDir(alt, 1);
    if (p && a) return p.score <= a.score ? p : a;
    return p || a || null;
  };
  const bestMergeForRegs = (regs, targetParts) => {
    let best = null;
    for (let i = 0; i < regs.length; i++) {
      for (let j = i + 1; j < regs.length; j++) {
        const u = tryMergeRects(regs[i], regs[j]);
        if (!u) continue;
        if (mergeWouldConflict(regs, i, j, u)) continue;
        const next = [...regs];
        next.splice(j, 1);
        next.splice(i, 1, u);
        const score = Math.abs(next.length - targetParts) * 1e15 + variantBad(next) * 1e3;
        if (!best || score < best.score) best = { i, j, u, score };
      }
    }
    return best;
  };
  const refineVariantToTarget = (input, strategy, targetParts) => {
    let regs = Array.isArray(input) ? input.map(z => ({ c0: z.c0, c1: z.c1, r0: z.r0, r1: z.r1 })) : [];
    let safe = 0;
    while (safe < 256) {
      safe++;
      if (checkCalcTimeout(budget)) break;
      if (regs.length === targetParts) break;
      if (regs.length < targetParts) {
        let best = null, bestIdx = -1;
        for (let i = 0; i < regs.length; i++) {
          const z = regs[i];
          if (regionArea(z) <= AREA_LIMIT_EPS) continue;
          const split = bestSplitForRect(regs, i, strategy, safe + i, targetParts);
          if (!split) continue;
          if (!best || split.score < best.score) { best = split; bestIdx = i; }
        }
        if (bestIdx < 0 || !best) break;
        regs.splice(bestIdx, 1, best.left, best.right);
      } else {
        const m = bestMergeForRegs(regs, targetParts);
        if (!m) break;
        regs.splice(m.j, 1);
        regs.splice(m.i, 1, m.u);
      }
    }
    return mergeNeighborRects(regs);
  };
  const regsSignature = regs => regsSig(regs);
  const regsScore = (regs, targetParts) => Math.abs((regs && regs.length || 0) - targetParts) * 1e15 + variantBad(regs) * 1e3 + variantShape(regs);
  const beamImproveVariant = (input, strategy, targetParts) => {
    const canUseBeam = (cols * rows) <= 320 && targetParts <= 12;
    if (!canUseBeam) return input;
    const makeOrientOrder = z => {
      const prefAlt = resolvePreferredDirs(z, strategy), pref = prefAlt.pref, alt = prefAlt.alt;
      return [pref, alt];
    };
    const mkState = regs => ({ regs, score: regsScore(regs, targetParts) });
    let beam = [mkState(Array.isArray(input) ? input.map(z => ({ c0: z.c0, c1: z.c1, r0: z.r0, r1: z.r1 })) : [])];
    let best = beam[0];
    const seen = new Set([regsSignature(best.regs)]);
    const WIDTH = 24, EXPAND = 8, STEPS = 18;
    for (let step = 0; step < STEPS; step++) {
      if (checkCalcTimeout(budget)) break;
      beam.sort((a, b) => a.score - b.score);
      beam = beam.slice(0, WIDTH);
      if (beam[0] && beam[0].score < best.score) best = beam[0];
      const nextStates = [];
      const expandList = beam.slice(0, EXPAND);
      for (const st0 of expandList) {
        if (checkCalcTimeout(budget)) break;
        const regs = st0.regs;
        if (!Array.isArray(regs) || !regs.length) continue;
        if (regs.length < targetParts) {
          const splitRects = [...regs.keys()].sort((ia, ib) => regionArea(regs[ib]) - regionArea(regs[ia])).slice(0, 6);
          for (const i of splitRects) {
            const z = regs[i];
            const dirs = makeOrientOrder(z);
            for (const dir of dirs) {
              const cuts = listCuts(z, dir, strategy).slice(0, 4);
              for (const cut of cuts) {
                const ab = splitRectBy(z, dir, cut), a = ab[0], b = ab[1];
                if (!rectHasVisible(a.c0, a.c1, a.r0, a.r1) || !rectHasVisible(b.c0, b.c1, b.r0, b.r1)) continue;
                const nr = [...regs.slice(0, i), a, b, ...regs.slice(i + 1)];
                const merged = mergeNeighborRects(nr);
                const sig = regsSignature(merged);
                if (seen.has(sig)) continue;
                seen.add(sig);
                nextStates.push(mkState(merged));
              }
            }
          }
        } else if (regs.length > targetParts) {
          const pairs = [];
          for (let i = 0; i < regs.length; i++)for (let j = i + 1; j < regs.length; j++) {
            const u = tryMergeRects(regs[i], regs[j]);
            if (!u) continue;
            if (mergeWouldConflict(regs, i, j, u)) continue;
            const nr = [...regs];
            nr.splice(j, 1);
            nr.splice(i, 1, u);
            pairs.push(nr);
          }
          pairs.sort((a, b) => regsScore(a, targetParts) - regsScore(b, targetParts));
          for (const nr0 of pairs.slice(0, 16)) {
            const nr = mergeNeighborRects(nr0), sig = regsSignature(nr);
            if (seen.has(sig)) continue;
            seen.add(sig);
            nextStates.push(mkState(nr));
          }
        } else {
          const splitRects = [...regs.keys()].sort((ia, ib) => regionArea(regs[ib]) - regionArea(regs[ia])).slice(0, 2);
          for (const i of splitRects) {
            const z = regs[i], dirs = makeOrientOrder(z);
            for (const dir of dirs) {
              const cut = listCuts(z, dir, strategy)[0];
              if (cut == null) continue;
              const ab = splitRectBy(z, dir, cut), a = ab[0], b = ab[1];
              const tmp = [...regs.slice(0, i), a, b, ...regs.slice(i + 1)];
              const merged = bestMergeForRegs(tmp, targetParts);
              if (!merged) continue;
              const nr = [...tmp];
              nr.splice(merged.j, 1);
              nr.splice(merged.i, 1, merged.u);
              const fin = mergeNeighborRects(nr), sig = regsSignature(fin);
              if (seen.has(sig)) continue;
              seen.add(sig);
              nextStates.push(mkState(fin));
            }
          }
        }
      }
      if (!nextStates.length) break;
      beam = nextStates;
    }
    return best && Array.isArray(best.regs) ? best.regs : input;
  };
  const buildVariantByStrategy = strategy => {
    const kind = (strategy && strategy.kind) || "block";
    const seed = Math.max(0, Math.round(Number(strategy && strategy.seed) || 0));
    const rot = ((strategy && strategy.rot) | 0);
    const regs = [{ c0, c1, r0, r1 }];
    if (kind === "block") {
      const base = regs[0];
      const wCells = Math.max(1, base.c1 - base.c0), hCells = Math.max(1, base.r1 - base.r0);
      if (wCells >= 3 && hCells >= 3) {
        const rng = makeRng(((r && r.id) || 0) * 2654435761 + (seed + 1) * 1013904223 + wCells * 73856093 + hCells * 19349663);
        let sx = base.c0 + 1 + Math.floor(rng() * (wCells - 1));
        let sy = base.r0 + 1 + Math.floor(rng() * (hCells - 1));
        if (rot === 90) { sx = base.c0 + 1 + Math.floor(rng() * (wCells - 1)); sy = base.r1 - 1 - Math.floor(rng() * (hCells - 1)); }
        else if (rot === -90) { sx = base.c1 - 1 - Math.floor(rng() * (wCells - 1)); sy = base.r0 + 1 + Math.floor(rng() * (hCells - 1)); }
        const canV = canSplitByComp(base, "v", sx) && rectHasVisible(base.c0, sx, base.r0, base.r1) && rectHasVisible(sx, base.c1, base.r0, base.r1);
        const canH = canSplitByComp(base, "h", sy) && rectHasVisible(base.c0, base.c1, base.r0, sy) && rectHasVisible(base.c0, base.c1, sy, base.r1);
        if (canV || canH) {
          regs.length = 0;
          if (canV && canH) {
            const chunks = [
              { c0: base.c0, c1: sx, r0: base.r0, r1: sy },
              { c0: sx, c1: base.c1, r0: base.r0, r1: sy },
              { c0: base.c0, c1: sx, r0: sy, r1: base.r1 },
              { c0: sx, c1: base.c1, r0: sy, r1: base.r1 }
            ];
            for (const z of chunks) if (rectHasVisible(z.c0, z.c1, z.r0, z.r1)) regs.push(z);
          } else if (canV) {
            regs.push({ c0: base.c0, c1: sx, r0: base.r0, r1: base.r1 }, { c0: sx, c1: base.c1, r0: base.r0, r1: base.r1 });
          } else {
            regs.push({ c0: base.c0, c1: base.c1, r0: base.r0, r1: sy }, { c0: base.c0, c1: base.c1, r0: sy, r1: base.r1 });
          }
        }
      }
    }
    let safe = 0;
    while (safe < 4096) {
      safe++;
      if (checkCalcTimeout(budget)) return null;
      let partsEstimate = 0;
      for (const z of regs) partsEstimate += estPartsForRect(z);
      let bestGlobal = null, bestIdx = -1;
      for (let i = 0; i < regs.length; i++) {
        const z = regs[i], a = regionArea(z), over = a - maxAreaPx;
        if (over <= AREA_LIMIT_EPS) continue;
        const pick = pickSplitForRect(regs, i, strategy, safe + i, partsEstimate, optimalCount);
        if (!pick) continue;
        if (!bestGlobal || pick.score < bestGlobal.score) { bestGlobal = pick; bestIdx = i; }
      }
      if (bestIdx < 0 || !bestGlobal) break;
      regs.splice(bestIdx, 1, bestGlobal.left, bestGlobal.right);
    }
    return mergeNeighborRects(regs);
  };
  addVariant([{ c0, c1, r0, r1 }]);
  for (const strategy of splitStrategies) {
    if (checkCalcTimeout(budget)) return makeSingle(true);
    const regs = buildVariantByStrategy(strategy);
    if (!regs) return makeSingle(true);
    addVariant(regs);
    const tuned = refineVariantToTarget(regs, strategy, optimalCount);
    addVariant(tuned);
    const tunedBeam = beamImproveVariant(tuned, strategy, optimalCount);
    addVariant(tunedBeam);
    const tunedPlus = refineVariantToTarget(regs, strategy, Math.min(maxAllowedCount, optimalCount + 1));
    addVariant(tunedPlus);
  }
  if (!variants.length) return makeSingle(false);
  const compactVariant = regs => {
    let cur = trimVisibleRects(Array.isArray(regs) ? regs : []);
    let safe = 0;
    while (safe < 64) {
      safe++;
      const sig0 = cur.map(z => `${z.c0},${z.c1},${z.r0},${z.r1}`).sort().join("|");
      const merged = mergeNeighborRects(cur);
      const next = trimVisibleRects(merged);
      const sig1 = next.map(z => `${z.c0},${z.c1},${z.r0},${z.r1}`).sort().join("|");
      cur = next;
      if (sig0 === sig1) break;
    }
    if (!cur.length) return null;
    for (const z of cur) if (areaRect(z.c0, z.c1, z.r0, z.r1) > maxAreaPx + AREA_LIMIT_EPS) return null;
    if (!coversAllVisible(cur)) return null;
    if (!variantRespectsMergedCells(cur)) return null;
    return cur;
  };
  const compacted = [], compSeen = new Set();
  for (const v of variants) {
    const c = compactVariant(v);
    if (!c) continue;
    const sig = c.map(z => `${z.c0},${z.c1},${z.r0},${z.r1}`).sort().join("|");
    if (compSeen.has(sig)) continue;
    compSeen.add(sig);
    compacted.push(c);
  }
  if (compacted.length) {
    variants.length = 0;
    for (const v of compacted) variants.push(v);
  }
  if (!variants.length) return makeSingle(false);
  const shapeScore = variantShape;
  const sizeEntropyScore = regs => {
    if (!Array.isArray(regs) || regs.length <= 1) return 0;
    const areas = regs.map(z => Math.max(1e-6, areaRect(z.c0, z.c1, z.r0, z.r1)));
    const mean = areas.reduce((a, b) => a + b, 0) / areas.length;
    let sumSq = 0;
    for (const a of areas) { const d = a - mean; sumSq += d * d; }
    const std = Math.sqrt(sumSq / areas.length);
    return std / Math.max(1e-6, mean);
  };
  const regularityScore = regs => {
    if (!Array.isArray(regs) || !regs.length) return 1e9;
    const ws = regs.map(z => Math.max(1e-6, colPref[z.c1] - colPref[z.c0]));
    const hs = regs.map(z => Math.max(1e-6, rowPref[z.r1] - rowPref[z.r0]));
    const wMean = ws.reduce((a, b) => a + b, 0) / ws.length, hMean = hs.reduce((a, b) => a + b, 0) / hs.length;
    let wVar = 0, hVar = 0;
    for (const w of ws) { const d = w - wMean; wVar += d * d; }
    for (const h of hs) { const d = h - hMean; hVar += d * d; }
    const wCv = Math.sqrt(wVar / ws.length) / Math.max(1e-6, wMean);
    const hCv = Math.sqrt(hVar / hs.length) / Math.max(1e-6, hMean);
    const sameRows = regs.every(z => z.r0 === regs[0].r0 && z.r1 === regs[0].r1);
    const sameCols = regs.every(z => z.c0 === regs[0].c0 && z.c1 === regs[0].c1);
    const stripePenalty = (sameRows || sameCols) ? 0 : 1;
    return stripePenalty * 10 + Math.min(wCv, hCv) * 5 + Math.max(wCv, hCv);
  };
  const cmpRank = (a, b) =>
    (a.delta - b.delta) ||
    (a.regularity - b.regularity) ||
    (a.entropy - b.entropy) ||
    (a.bad - b.bad) ||
    (a.shape - b.shape) ||
    (a.count - b.count);
  const ranked = variants.map(v => {
    const count = v.length, delta = Math.abs(count - optimalCount), shape = shapeScore(v), entropy = sizeEntropyScore(v), regularity = regularityScore(v), bad = v.reduce((acc, z) => acc + Math.abs(maxAreaPx - areaRect(z.c0, z.c1, z.r0, z.r1)), 0);
    return { v, count, delta, regularity, entropy, shape, bad };
  }).sort(cmpRank);
  const rankedWithinLimit = ranked.filter(it => it.count <= maxAllowedCount);
  const notAboveOptimal = rankedWithinLimit.filter(it => it.count <= optimalCount);
  const sourceList = (notAboveOptimal.length ? notAboveOptimal : rankedWithinLimit);
  const ordered = sourceList.slice(0, SPLIT_VARIANT_MAX);
  if (!ordered.length) return makeSingle(false);
  const variantCount = Math.max(1, ordered.length);
  r._splitVariantCount = variantCount;
  const variantIndex = Math.max(0, Math.min(variantCount - 1, toInt0(r && r.splitVariant)));
  if (r && toInt0(r.splitVariant) !== variantIndex) r.splitVariant = variantIndex;
  const finalRegions = (ordered[variantIndex] ? ordered[variantIndex].v : ordered[0].v).map((z, idx) => ({ id: idx, label: toLetters(idx), gx: idx, gy: 0, c0: z.c0, c1: z.c1, r0: z.r0, r1: z.r1, w: colPref[z.c1] - colPref[z.c0], h: rowPref[z.r1] - rowPref[z.r0] }));
  const byId = new Map(); for (const rg of finalRegions) byId.set(rg.id, rg);
  const colToGroup = new Array(cols).fill(-1), rowToGroup = new Array(rows).fill(-1), cellToRegion = new Array(rows * cols).fill(-1);
  for (const rg of finalRegions) {
    for (let x = rg.c0; x < rg.c1; x++)if (colToGroup[x] === -1) colToGroup[x] = rg.id;
    for (let y = rg.r0; y < rg.r1; y++)if (rowToGroup[y] === -1) rowToGroup[y] = rg.id;
    for (let y = rg.r0; y < rg.r1; y++)for (let x = rg.c0; x < rg.c1; x++)if (visible[y][x]) cellToRegion[y * cols + x] = rg.id;
  }
  for (let i = 0; i < cols; i++)if (colToGroup[i] === -1) colToGroup[i] = 0;
  for (let i = 0; i < rows; i++)if (rowToGroup[i] === -1) rowToGroup[i] = 0;
  const out = { nx: finalRegions.length, ny: 1, colToGroup, rowToGroup, regionsById: byId, xCutsPx: [0, r.width], yCutsPx: [0, r.height], cellToRegion, regions: finalRegions, variantCount };
  const profile = { variantCount, optimalCount, maxAllowedCount, totalMs: Math.max(0, calcNow() - startedAt) };
  safeDefine(out, "_profile", profile);
  return out;
};

  return {
    splitIndicesBySize,
    planNumberRegionsUncached
  };
};
