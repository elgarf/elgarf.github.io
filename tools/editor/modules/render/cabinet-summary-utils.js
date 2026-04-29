import { buildVisibleComponentStats } from "../calc/visible-cabinet-stats.js";

export const setupCabinetSummaryUtils = (deps = {}) => {
  const { maskCellKey, mFmt, topoCalcKey = () => "", listSignature = () => "", getRectCalcCache = null, t = value => value } = deps;
  const toPosNum = (v, fallback = 0) => Math.max(0, Number(v) || fallback);
  const sizeKey = (wk, hk) => `${wk}x${hk}`;
  const sizeLine = it => `${it.wk}x${it.hk} ${t("м")} - ${it.count} ${t("шт.")}`;
  const toCount = v => Math.max(0, Math.round(Number(v) || 0));

  const fillPercent = (wm, hm, areaM2Px) => {
    const area = toPosNum(wm) * toPosNum(hm);
    const base = Math.max(1, +areaM2Px || 65536);
    return (100 * (base * area)) / 655360;
  };

  const computeVisibleCabinetSummary = (r, cx, cy, topo, hs) => {
    if (!r || !topo) return { areaM2: 0, totalCount: 0, groupItems: [], groups: [] };
    const visibleStats = buildVisibleComponentStats(r, cx, cy, topo, hs, maskCellKey);
    if (!visibleStats) return { areaM2: 0, totalCount: 0, groupItems: [], groups: [] };
    const { colPref, rowPref, visibleAreaPx, compStats: stats } = visibleStats;
    const bySize = new Map();
    const scalePx = Math.max(1, Number(r && r.scale) || 256);
    for (const s of stats.values()) {
      const wPx = Math.max(0, colPref[s.c1] - colPref[s.c0]);
      const hPx = Math.max(0, rowPref[s.r1] - rowPref[s.r0]);
      if (!(wPx > 0 && hPx > 0)) continue;
      const wm = wPx / scalePx;
      const hm = hPx / scalePx;
      const wk = mFmt(wm), hk = mFmt(hm);
      const key = sizeKey(wk, hk);
      const rec = bySize.get(key) || { w: wm, h: hm, count: 0, wk, hk };
      rec.count += 1;
      bySize.set(key, rec);
    }
    const groupItems = [...bySize.values()].sort((a, b) => (b.w * b.h) - (a.w * a.h) || b.w - a.w || b.h - a.h);
    const groups = groupItems.map(sizeLine);
    const areaM2 = visibleAreaPx / (scalePx * scalePx);
    const totalCount = groupItems.reduce((acc, it) => acc + toCount(it && it.count), 0);
    return { areaM2, totalCount, groupItems, groups };
  };

  const buildVisibleCabinetSummary = (r, cx, cy, topo, hs) => {
    if (!r || !topo || typeof getRectCalcCache !== "function") return computeVisibleCabinetSummary(r, cx, cy, topo, hs);
    const cache = getRectCalcCache(r);
    const key = [
      r && r.width || 0,
      r && r.height || 0,
      r && r.scale || 0,
      cx || 0,
      cy || 0,
      topoCalcKey(r, cx, cy),
      listSignature(r && r.hiddenCells)
    ].join("|");
    if (cache.cabinetSummary && cache.cabinetSummary.key === key && cache.cabinetSummary.value) return cache.cabinetSummary.value;
    const value = computeVisibleCabinetSummary(r, cx, cy, topo, hs);
    cache.cabinetSummary = { key, value };
    return value;
  };

  return {
    fillPercent,
    buildVisibleCabinetSummary
  };
};
