/* build:1779222473 */
export const setupTextLayoutController = (deps = {}) => {
  const { overlapArea, getRectCalcCache } = deps;

  const chooseTextLayout = (r, lines, measureFn, maxW, baseFs, hiddenBoxes, freeRects) => {
    const scales = [1, 0.93, 0.86], inset = 3, padY = 4, minLongSide = 256;
    const score = box => { let oa = 0; for (const hb of hiddenBoxes) oa += overlapArea(box, hb); return oa; };
    const candidates = [];
    const rects = (Array.isArray(freeRects) && freeRects.length ? freeRects : [{ x: r.x, y: r.y, w: r.width, h: r.height }]);
    const bigRects = rects.filter(rr => Math.max(rr.w, rr.h) >= minLongSide);
    const usedRects = bigRects.length ? bigRects : rects;
    const bigOnly = bigRects.length > 0;
    for (const sc of scales) {
      const fs = Math.max(6, Math.round(baseFs * sc * 100) / 100), lh = Math.max(fs + 2, baseFs + 2), est = Math.max(...lines.map(t => measureFn(t, fs))) + 14, tw = Math.min(maxW, est), th = lines.length * lh + 8;
      const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
      const seen = new Set();
      for (const rr of usedRects) {
        const minX = rr.x + inset, maxX = rr.x + rr.w - inset - tw, minY = rr.y + inset, maxY = rr.y + rr.h - inset - th;
        if (maxX < minX || maxY < minY) continue;
        const cx = clamp(rr.x + rr.w / 2 - tw / 2, minX, maxX), cy = clamp(rr.y + rr.h / 2 - th / 2, minY, maxY);
        const cands = [
          { kind: "center", x: cx, y: cy },
          { kind: "top", x: cx, y: minY }, { kind: "bottom", x: cx, y: maxY },
          { kind: "left", x: minX, y: cy }, { kind: "right", x: maxX, y: cy },
          { kind: "tl", x: minX, y: minY }, { kind: "tr", x: maxX, y: minY },
          { kind: "bl", x: minX, y: maxY }, { kind: "br", x: maxX, y: maxY }
        ];
        for (const c of cands) {
          const k = `${Math.round(c.x * 100) / 100},${Math.round(c.y * 100) / 100},${c.kind}`;
          if (seen.has(k)) continue;
          seen.add(k);
          const box = { x: c.x, y: c.y, w: tw, h: th }, ov = score(box), dist = Math.hypot((c.x + tw / 2) - (r.x + r.width / 2), (c.y + th / 2) - (r.y + r.height / 2)), fitArea = rr.w * rr.h, rectPriority = (bigOnly ? 0 : (Math.max(rr.w, rr.h) >= minLongSide ? 0 : 1));
          candidates.push({ ...c, fs, lh, tw, th, ov, dist, fitArea, rectPriority });
        }
      }
    }
    let picked = null;
    for (const it of candidates) {
      if (!picked) { picked = it; continue; }
      if (it.rectPriority !== picked.rectPriority) { if (it.rectPriority < picked.rectPriority) picked = it; continue; }
      if (it.ov !== picked.ov) { if (it.ov < picked.ov) picked = it; continue; }
      if (it.ov === 0 && it.fs !== picked.fs) { if (it.fs > picked.fs) picked = it; continue; }
      if (it.dist !== picked.dist) { if (it.dist < picked.dist) picked = it; continue; }
      if (it.fitArea !== picked.fitArea) { if (it.fitArea > picked.fitArea) picked = it; continue; }
    }
    if (!picked) {
      const fs = Math.max(6, baseFs * 0.86), lh = Math.max(fs + 2, baseFs + 2), est = Math.max(...lines.map(t => measureFn(t, fs))) + 14, tw = Math.min(maxW, est), th = lines.length * lh + 8;
      const x = r.x + Math.max(0, (r.width - tw) / 2), y = r.y + Math.max(0, (r.height - th) / 2);
      picked = { fs, lh, tw, th, x, y };
    }
    const sy = picked.y + padY + picked.lh / 2;
    return { fs: picked.fs, lh: picked.lh, tw: picked.tw, th: picked.th, textLeft: picked.x, textX: picked.x + picked.tw / 2, textTop: picked.y, sy };
  };

  const getRectTextLayoutCached = (r, key, compute) => {
    const cache = getRectCalcCache(r);
    if (cache.textLayout && cache.textLayout.key === key) return cache.textLayout.value;
    const value = compute();
    cache.textLayout = { key, value };
    return value;
  };

  return {
    chooseTextLayout,
    getRectTextLayoutCached
  };
};
