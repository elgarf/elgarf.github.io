export const setupCabinetSummaryUtils = (deps = {}) => {
  const { maskCellKey, mFmt } = deps;

  const fillPercent = (wm, hm, areaM2Px) => {
    const area = Math.max(0, (+wm || 0) * (+hm || 0));
    const base = Math.max(1, +areaM2Px || 65536);
    return (100 * (base * area)) / 655360;
  };

  const buildVisibleCabinetSummary = (r, cx, cy, topo, hs) => {
    if (!r || !topo) return { areaM2: 0, totalCount: 0, groupItems: [], groups: [] };
    const cols = Math.max(1, Math.round(Number(topo && topo.cols) || 1));
    const rows = Math.max(1, Math.round(Number(topo && topo.rows) || 1));
    const comp = Array.isArray(topo && topo.comp) ? topo.comp : [];
    if (!comp.length) return { areaM2: 0, totalCount: 0, groupItems: [], groups: [] };
    const colPref = [0], rowPref = [0];
    for (let x = 0; x < cols; x++) colPref.push(colPref[x] + Math.min(cx, Math.max(0, r.width - x * cx)));
    for (let y = 0; y < rows; y++) rowPref.push(rowPref[y] + Math.min(cy, Math.max(0, r.height - y * cy)));
    const stats = new Map();
    let visibleAreaPx = 0;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (hs && hs.has(maskCellKey(x, y))) continue;
        const idx = y * cols + x;
        const cid = Math.max(0, Math.round(Number(comp[idx]) || 0));
        const cw = Math.min(cx, Math.max(0, r.width - x * cx));
        const ch = Math.min(cy, Math.max(0, r.height - y * cy));
        if (!(cw > 0 && ch > 0)) continue;
        visibleAreaPx += cw * ch;
        let s = stats.get(cid);
        if (!s) { s = { c0: x, c1: x + 1, r0: y, r1: y + 1 }; stats.set(cid, s); }
        else {
          if (x < s.c0) s.c0 = x;
          if (x + 1 > s.c1) s.c1 = x + 1;
          if (y < s.r0) s.r0 = y;
          if (y + 1 > s.r1) s.r1 = y + 1;
        }
      }
    }
    const bySize = new Map();
    const scalePx = Math.max(1, Number(r && r.scale) || 256);
    for (const s of stats.values()) {
      const wPx = Math.max(0, colPref[s.c1] - colPref[s.c0]);
      const hPx = Math.max(0, rowPref[s.r1] - rowPref[s.r0]);
      if (!(wPx > 0 && hPx > 0)) continue;
      const wm = wPx / scalePx;
      const hm = hPx / scalePx;
      const wk = mFmt(wm), hk = mFmt(hm);
      const key = `${wk}x${hk}`;
      const rec = bySize.get(key) || { w: wm, h: hm, count: 0, wk, hk };
      rec.count += 1;
      bySize.set(key, rec);
    }
    const groupItems = [...bySize.values()].sort((a, b) => (b.w * b.h) - (a.w * a.h) || b.w - a.w || b.h - a.h);
    const groups = groupItems.map(it => `${it.wk}x${it.hk}м - ${it.count} шт.`);
    const areaM2 = visibleAreaPx / (scalePx * scalePx);
    const totalCount = groupItems.reduce((acc, it) => acc + Math.max(0, Math.round(Number(it && it.count) || 0)), 0);
    return { areaM2, totalCount, groupItems, groups };
  };

  return {
    fillPercent,
    buildVisibleCabinetSummary
  };
};
