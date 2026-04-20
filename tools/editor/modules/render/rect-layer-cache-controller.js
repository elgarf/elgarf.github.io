export const setupRectLayerCacheController = (deps = {}) => {
  const {
    getRectCalcCache,
    topoCalcKey,
    listSignature,
    maskCellKey,
    getVisibleBoundarySegmentsLocal,
    hexRgb,
    shadeHex,
    flowDrawKeyForGroups,
    drawDataFlowOnRect
  } = deps;

  const createLayerCanvas = (w, h) => {
    const ww = Math.max(1, Math.round(w)), hh = Math.max(1, Math.round(h));
    if (typeof OffscreenCanvas !== "undefined") return new OffscreenCanvas(ww, hh);
    const cv = document.createElement("canvas");
    cv.width = ww; cv.height = hh;
    return cv;
  };

  const getRectComponentRenderDataCached = (r, cx, cy, topo) => {
    const cache = getRectCalcCache(r);
    const key = [r && r.width || 0, r && r.height || 0, cx || 0, cy || 0, topoCalcKey(r, cx, cy)].join("|");
    if (cache.compRender && cache.compRender.key === key && Array.isArray(cache.compRender.value)) return cache.compRender.value;
    const w = Math.max(1, Math.round(Number(r && r.width) || 1)), h = Math.max(1, Math.round(Number(r && r.height) || 1));
    const byId = new Map();
    for (let y = 0; y < h; y += cy) {
      for (let x = 0; x < w; x += cx) {
        const ix = Math.floor(x / cx), iy = Math.floor(y / cy), idx = iy * topo.cols + ix, compId = topo.comp[idx], seed = topo.seed[compId] || { col: ix, row: iy }, cw = Math.min(cx, w - x), ch = Math.min(cy, h - y), rx = -w / 2 + x, ry = -h / 2 + y;
        let it = byId.get(compId);
        if (!it) {
          const cc = (topo.color && topo.color[compId] !== -1) ? topo.color[compId] : ((seed.col + seed.row) % 2);
          it = { cid: compId, cc, minX: rx, minY: ry, maxX: rx + cw, maxY: ry + ch, minCol: ix, minRow: iy, cells: [] };
          byId.set(compId, it);
        } else {
          it.minX = Math.min(it.minX, rx); it.minY = Math.min(it.minY, ry); it.maxX = Math.max(it.maxX, rx + cw); it.maxY = Math.max(it.maxY, ry + ch);
          it.minCol = Math.min(it.minCol, ix); it.minRow = Math.min(it.minRow, iy);
        }
        it.cells.push({ x: rx, y: ry, w: cw, h: ch });
      }
    }
    const value = [...byId.values()];
    cache.compRender = { key, value };
    return value;
  };

  const getMaskRenderDataCached = (r, cx, cy, hs, topo) => {
    const cache = getRectCalcCache(r), key = [r && r.width || 0, r && r.height || 0, cx || 0, cy || 0, listSignature(r && r.hiddenCells)].join("|");
    if (cache.maskRender && cache.maskRender.key === key && cache.maskRender.value) return cache.maskRender.value;
    const w = Math.max(1, Math.round(Number(r && r.width) || 1)), h = Math.max(1, Math.round(Number(r && r.height) || 1)), hasMask = !!(hs && hs.size);
    if (!hasMask) {
      const value = { hasMask: false, hasVisible: true, hiddenRects: null, visibleCompSet: null };
      cache.maskRender = { key, value };
      return value;
    }
    const hiddenRects = [], visibleCompSet = new Set();
    let visibleCount = 0;
    for (let y = 0, iy = 0; y < h; y += cy, iy++) {
      for (let x = 0, ix = 0; x < w; x += cx, ix++) {
        const cw = Math.min(cx, w - x), ch = Math.min(cy, h - y);
        if (hs.has(maskCellKey(ix, iy))) {
          hiddenRects.push({ x: -w / 2 + x, y: -h / 2 + y, w: cw, h: ch });
          continue;
        }
        visibleCount++;
        if (topo && Array.isArray(topo.comp)) {
          const idx = iy * topo.cols + ix, cid = topo.comp[idx];
          if (Number.isFinite(cid)) visibleCompSet.add(cid | 0);
        }
      }
    }
    const value = { hasMask, hasVisible: visibleCount > 0, hiddenRects, visibleCompSet };
    cache.maskRender = { key, value };
    return value;
  };

  const getVisibleBoundarySegmentsCached = (r, cx, cy, hs) => {
    const cache = getRectCalcCache(r), key = [r && r.width || 0, r && r.height || 0, cx || 0, cy || 0, listSignature(r && r.hiddenCells)].join("|");
    if (cache.boundarySegs && cache.boundarySegs.key === key && Array.isArray(cache.boundarySegs.value)) return cache.boundarySegs.value;
    const value = getVisibleBoundarySegmentsLocal(Math.max(1, Math.round(Number(r && r.width) || 1)), Math.max(1, Math.round(Number(r && r.height) || 1)), cx, cy, hs);
    cache.boundarySegs = { key, value };
    return value;
  };

  const getRectFillLayerCached = (r, cx, cy, topo, maskRender, lowDetail) => {
    const cache = getRectCalcCache(r), w = Math.max(1, Math.round(Number(r && r.width) || 1)), h = Math.max(1, Math.round(Number(r && r.height) || 1));
    const key = [w, h, cx || 0, cy || 0, topoCalcKey(r, cx, cy), listSignature(r && r.hiddenCells), String(r && r.colorA || ""), String(r && r.colorB || ""), lowDetail ? "1" : "0"].join("|");
    if (cache.fillLayer && cache.fillLayer.key === key && cache.fillLayer.canvas) return cache.fillLayer.canvas;
    const layer = createLayerCanvas(w, h), lc = layer.getContext("2d");
    if (!lc) return null;
    if (lowDetail) {
      lc.fillStyle = r.colorA;
      lc.fillRect(0, 0, w, h);
      lc.fillStyle = r.colorB;
      lc.beginPath();
      lc.moveTo(0, 0);
      lc.lineTo(w, 0);
      lc.lineTo(0, h);
      lc.closePath();
      lc.fill();
    } else {
      const comps = getRectComponentRenderDataCached(r, cx, cy, topo), calcAltColor = base => { const rgb = hexRgb(base), lum = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000; return shadeHex(base, lum > 140 ? -0.25 : 0.25); }, altA = calcAltColor(r.colorA), altB = calcAltColor(r.colorB);
      const compColorClass = new Map(comps.map(it => [it.cid | 0, it.cc | 0]));
      const sameColorNear = new Set(), pairSeen = new Set();
      const markPair = (a, b) => {
        if (!Number.isFinite(a) || !Number.isFinite(b) || a === b) return;
        const lo = Math.min(a, b), hi = Math.max(a, b), keyPair = `${lo}:${hi}`;
        if (pairSeen.has(keyPair)) return;
        pairSeen.add(keyPair);
        // For each same-color neighboring pair mirror only one cabinet.
        sameColorNear.add(hi);
      };
      if (topo && Array.isArray(topo.comp) && Number.isFinite(topo.cols) && Number.isFinite(topo.rows)) {
        const cols = Math.max(1, Math.round(Number(topo.cols) || 1)), rows = Math.max(1, Math.round(Number(topo.rows) || 1));
        for (let y = 0; y < rows; y++) {
          for (let x = 0; x < cols; x++) {
            const idx = y * cols + x, cid = topo.comp[idx];
            if (!Number.isFinite(cid)) continue;
            const a = cid | 0;
            if (maskRender && maskRender.visibleCompSet && !maskRender.visibleCompSet.has(a)) continue;
            const ccA = compColorClass.get(a);
            if (!Number.isFinite(ccA)) continue;
            if (x + 1 < cols) {
              const rid = topo.comp[idx + 1];
              if (Number.isFinite(rid)) {
                const b = rid | 0, ccB = compColorClass.get(b);
                if (a !== b && (!maskRender || !maskRender.visibleCompSet || maskRender.visibleCompSet.has(b)) && Number.isFinite(ccB) && ccA === ccB) markPair(a, b);
              }
            }
            if (y + 1 < rows) {
              const did = topo.comp[idx + cols];
              if (Number.isFinite(did)) {
                const b = did | 0, ccB = compColorClass.get(b);
                if (a !== b && (!maskRender || !maskRender.visibleCompSet || maskRender.visibleCompSet.has(b)) && Number.isFinite(ccB) && ccA === ccB) markPair(a, b);
              }
            }
          }
        }
      }
      for (const it of comps) {
        if (maskRender && maskRender.visibleCompSet && !maskRender.visibleCompSet.has(it.cid)) continue;
        const base = (it.cc === 0) ? r.colorA : r.colorB, alt = (it.cc === 0) ? altA : altB;
        lc.save();
        lc.beginPath();
        for (const cl of it.cells) lc.rect(cl.x + w / 2, cl.y + h / 2, cl.w, cl.h);
        lc.clip();
        const bw = it.maxX - it.minX, bh = it.maxY - it.minY, ox = it.minX + w / 2, oy = it.minY + h / 2;
        lc.fillStyle = base; lc.fillRect(ox, oy, bw, bh);
        lc.fillStyle = alt;
        const mirrorHoriz = sameColorNear.has(it.cid | 0);
        lc.beginPath();
        if (mirrorHoriz) {
          lc.moveTo(ox + bw, oy);
          lc.lineTo(ox, oy);
          lc.lineTo(ox + bw, oy + bh);
        } else {
          lc.moveTo(ox, oy);
          lc.lineTo(ox + bw, oy);
          lc.lineTo(ox, oy + bh);
        }
        lc.closePath();
        lc.fill();
        lc.restore();
      }
    }
    if (maskRender && maskRender.hasMask && Array.isArray(maskRender.hiddenRects) && maskRender.hiddenRects.length) {
      lc.save();
      lc.globalCompositeOperation = "destination-out";
      lc.globalAlpha = 1;
      lc.fillStyle = "#000";
      lc.beginPath();
      for (const rc of maskRender.hiddenRects) lc.rect(rc.x + w / 2, rc.y + h / 2, rc.w, rc.h);
      lc.fill();
      lc.restore();
    }
    cache.fillLayer = { key, canvas: layer };
    return layer;
  };

  const getRectDecorLayerCached = (r, maskRender, z) => {
    const cache = getRectCalcCache(r), w = Math.max(1, Math.round(Number(r && r.width) || 1)), h = Math.max(1, Math.round(Number(r && r.height) || 1)), zq = (Math.round((Number(z) || 1) * 100) / 100) || 1;
    const key = [w, h, listSignature(r && r.hiddenCells), zq].join("|");
    if (cache.decorLayer && cache.decorLayer.key === key && cache.decorLayer.canvas) return cache.decorLayer.canvas;
    const layer = createLayerCanvas(w, h), lc = layer.getContext("2d");
    if (!lc) return null;
    lc.strokeStyle = "rgba(255,255,255,.55)";
    lc.lineWidth = 2.4 / Math.max(0.01, zq);
    lc.beginPath();
    lc.moveTo(0, 0); lc.lineTo(w, h); lc.moveTo(w, 0); lc.lineTo(0, h);
    lc.stroke();
    lc.strokeStyle = "rgba(255,255,255,.75)";
    lc.lineWidth = 2.4 / Math.max(0.01, zq);
    lc.beginPath();
    lc.arc(w / 2, h / 2, Math.max(0, Math.min(w, h) / 2 - (2 / Math.max(0.01, zq))), 0, Math.PI * 2);
    lc.stroke();
    if (maskRender && maskRender.hasMask && Array.isArray(maskRender.hiddenRects) && maskRender.hiddenRects.length) {
      lc.save();
      lc.globalCompositeOperation = "destination-out";
      lc.globalAlpha = 1;
      lc.fillStyle = "#000";
      lc.beginPath();
      for (const rc of maskRender.hiddenRects) lc.rect(rc.x + w / 2, rc.y + h / 2, rc.w, rc.h);
      lc.fill();
      lc.restore();
    }
    cache.decorLayer = { key, canvas: layer };
    return layer;
  };

  const getRectFlowPassiveLayerCached = (r, w, h, z, groups, activeRid) => {
    const cache = getRectCalcCache(r), zq = (Math.round((Number(z) || 1) * 100) / 100) || 1, flowKey = flowDrawKeyForGroups(groups), key = [w, h, zq, flowKey, Math.max(0, Math.round(Number(activeRid) || 0))].join("|");
    if (cache.flowPassiveLayer && cache.flowPassiveLayer.key === key && cache.flowPassiveLayer.canvas) return cache.flowPassiveLayer.canvas;
    const passive = (Array.isArray(groups) ? groups : []).filter(g => Math.round(Number(g && g.rid) || 0) !== Math.round(Number(activeRid) || 0));
    if (!passive.length) { cache.flowPassiveLayer = { key, canvas: null }; return null; }
    const layer = createLayerCanvas(w, h), lc = layer.getContext("2d");
    if (!lc) return null;
    lc.save();
    lc.translate(w / 2, h / 2);
    drawDataFlowOnRect(lc, passive, w, h, z, { noBatch: true });
    lc.restore();
    cache.flowPassiveLayer = { key, canvas: layer };
    return layer;
  };

  return {
    getRectComponentRenderDataCached,
    getMaskRenderDataCached,
    getVisibleBoundarySegmentsCached,
    getRectFillLayerCached,
    getRectDecorLayerCached,
    getRectFlowPassiveLayerCached
  };
};

