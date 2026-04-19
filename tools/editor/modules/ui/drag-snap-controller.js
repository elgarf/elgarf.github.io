export const setupDragSnapController = (deps = {}) => {
  const {
    st,
    getRectById,
    rectAABBMasked,
    isRectLocked,
    normSelSet,
    isSelected,
    selectOnly,
    getEditableSelectedRects
  } = deps;

  const snap = (x, y, id, w, h, off) => {
    if (off) return { x: Math.round(x), y: Math.round(y), gx: null, gy: null, dg: null };
    const self = getRectById(id); if (!self) return { x: Math.round(x), y: Math.round(y), gx: null, gy: null, dg: null };
    const moving = { ...self, x, y }, mb = rectAABBMasked(moving), mw = mb.maxX - mb.minX, mh = mb.maxY - mb.minY, d = 8 / st.zoom, othersAll = st.rects.filter(r => r.id !== id).map(r => ({ r, bb: rectAABBMasked(r) })); let bx = null, by = null;
    const others = othersAll;
    const snapCfg = st.snap || { grid: false, objects: true, centers: true, gaps: true };
    if (snapCfg.grid) {
      const step = 10;
      bx = { d: (Math.round(x / step) * step) - x, g: null };
      by = { d: (Math.round(y / step) * step) - y, g: null };
    }
    if (snapCfg.objects || snapCfg.centers) {
      const mx = (snapCfg.objects && snapCfg.centers) ? [mb.minX, (mb.minX + mb.maxX) / 2, mb.maxX] : (snapCfg.centers ? [(mb.minX + mb.maxX) / 2] : [mb.minX, mb.maxX]);
      const my = (snapCfg.objects && snapCfg.centers) ? [mb.minY, (mb.minY + mb.maxY) / 2, mb.maxY] : (snapCfg.centers ? [(mb.minY + mb.maxY) / 2] : [mb.minY, mb.maxY]);
      for (const o of others) {
        const ox = (snapCfg.objects && snapCfg.centers) ? [o.bb.minX, (o.bb.minX + o.bb.maxX) / 2, o.bb.maxX] : (snapCfg.centers ? [(o.bb.minX + o.bb.maxX) / 2] : [o.bb.minX, o.bb.maxX]);
        const oy = (snapCfg.objects && snapCfg.centers) ? [o.bb.minY, (o.bb.minY + o.bb.maxY) / 2, o.bb.maxY] : (snapCfg.centers ? [(o.bb.minY + o.bb.maxY) / 2] : [o.bb.minY, o.bb.maxY]);
        for (const p of mx) for (const t of ox) { const dd = t - p, ad = Math.abs(dd); if (ad <= d && (!bx || ad < Math.abs(bx.d))) bx = { d: dd, g: t }; }
        for (const p of my) for (const t of oy) { const dd = t - p, ad = Math.abs(dd); if (ad <= d && (!by || ad < Math.abs(by.d))) by = { d: dd, g: t }; }
      }
      if (snapCfg.centers && others.length) {
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9; for (const o of others) { minX = Math.min(minX, o.bb.minX); minY = Math.min(minY, o.bb.minY); maxX = Math.max(maxX, o.bb.maxX); maxY = Math.max(maxY, o.bb.maxY) }
        const bbCx = (minX + maxX) / 2, bbCy = (minY + maxY) / 2, mcx = (mb.minX + mb.maxX) / 2, mcy = (mb.minY + mb.maxY) / 2;
        const ddx = bbCx - mcx, adx = Math.abs(ddx); if (adx <= d && (!bx || adx < Math.abs(bx.d))) bx = { d: ddx, g: bbCx };
        const ddy = bbCy - mcy, ady = Math.abs(ddy); if (ady <= d && (!by || ady < Math.abs(by.d))) by = { d: ddy, g: bbCy };
      }
    }
    const betterDist = (cand, current) => { if (!current) return true; const cv = Math.round(current.guide.v), nv = Math.round(cand.guide.v); if (nv !== cv) return nv < cv; const cd = Math.abs(current.d), nd = Math.abs(cand.d); return nd < cd; };
    const hSource = others.filter(o => Math.min(mb.maxY, o.bb.maxY) - Math.max(mb.minY, o.bb.minY) > 0), vSource = others.filter(o => Math.min(mb.maxX, o.bb.maxX) - Math.max(mb.minX, o.bb.minX) > 0);
    const pickY = (a, b) => { const lo = Math.max(a.minY, b.minY), hi = Math.min(a.maxY, b.maxY); return lo < hi ? (lo + hi) / 2 : (a.minY + a.maxY) / 2 };
    const pickX = (a, b) => { const lo = Math.max(a.minX, b.minX), hi = Math.min(a.maxX, b.maxX); return lo < hi ? (lo + hi) / 2 : (a.minX + a.maxX) / 2 };
    let bdx = null, bdy = null;
    if (snapCfg.gaps) {
      const hpairs = []; for (let i = 0; i < hSource.length; i++)for (let j = 0; j < hSource.length; j++) { if (i === j) continue; const l = hSource[i].bb, r = hSource[j].bb; if (l.maxX > r.minX) continue; const g = Math.round(r.minX - l.maxX); if (g > 0) hpairs.push({ g, x1: l.maxX, x2: r.minX, y: pickY(l, r) }) }
      const hGapVals = [...new Set(hpairs.map(p => p.g))];
      for (const o of hSource) { const ob = o.bb, myv = pickY(mb, ob); if (ob.maxX <= mb.maxX) { for (const g of hGapVals) { const targetMinX = ob.maxX + g, dd = targetMinX - mb.minX, ad = Math.abs(dd); if (ad <= d) { const ref = hpairs.find(p => p.g === g) || { g, x1: ob.maxX, x2: targetMinX, y: myv }; const cand = { d: dd, guide: { axis: "x", x1: ob.maxX, y1: myv, x2: targetMinX, y2: myv, v: g, ref: { axis: "x", x1: ref.x1, y1: ref.y, x2: ref.x2, y2: ref.y, v: ref.g } } }; if (betterDist(cand, bdx)) bdx = cand } } } if (ob.minX >= mb.minX) { for (const g of hGapVals) { const targetMinX = ob.minX - mw - g, dd = targetMinX - mb.minX, ad = Math.abs(dd); if (ad <= d) { const ref = hpairs.find(p => p.g === g) || { g, x1: targetMinX + mw, x2: ob.minX, y: myv }; const cand = { d: dd, guide: { axis: "x", x1: targetMinX + mw, y1: myv, x2: ob.minX, y2: myv, v: g, ref: { axis: "x", x1: ref.x1, y1: ref.y, x2: ref.x2, y2: ref.y, v: ref.g } } }; if (betterDist(cand, bdx)) bdx = cand } } } }
      const vpairs = []; for (let i = 0; i < vSource.length; i++)for (let j = 0; j < vSource.length; j++) { if (i === j) continue; const t = vSource[i].bb, b = vSource[j].bb; if (t.maxY > b.minY) continue; const g = Math.round(b.minY - t.maxY); if (g > 0) vpairs.push({ g, y1: t.maxY, y2: b.minY, x: pickX(t, b) }) }
      const vGapVals = [...new Set(vpairs.map(p => p.g))];
      for (const o of vSource) { const ob = o.bb, mxv = pickX(mb, ob); if (ob.maxY <= mb.maxY) { for (const g of vGapVals) { const targetMinY = ob.maxY + g, dd = targetMinY - mb.minY, ad = Math.abs(dd); if (ad <= d) { const ref = vpairs.find(p => p.g === g) || { g, y1: ob.maxY, y2: targetMinY, x: mxv }; const cand = { d: dd, guide: { axis: "y", x1: mxv, y1: ob.maxY, x2: mxv, y2: targetMinY, v: g, ref: { axis: "y", x1: ref.x, y1: ref.y1, x2: ref.x, y2: ref.y2, v: ref.g } } }; if (betterDist(cand, bdy)) bdy = cand } } } if (ob.minY >= mb.minY) { for (const g of vGapVals) { const targetMinY = ob.minY - mh - g, dd = targetMinY - mb.minY, ad = Math.abs(dd); if (ad <= d) { const ref = vpairs.find(p => p.g === g) || { g, y1: targetMinY + mh, y2: ob.minY, x: mxv }; const cand = { d: dd, guide: { axis: "y", x1: mxv, y1: targetMinY + mh, x2: mxv, y2: ob.minY, v: g, ref: { axis: "y", x1: ref.x, y1: ref.y1, x2: ref.x, y2: ref.y2, v: ref.g } } }; if (betterDist(cand, bdy)) bdy = cand } } } }
    }
    let dx = bx ? bx.d : 0, dy = by ? by.d : 0, gx = bx ? bx.g : null, gy = by ? by.g : null, dg = null, usedX = false, usedY = false;
    if (bdx && (!bx || Math.abs(bdx.d) <= Math.abs(bx.d))) { dx = bdx.d; gx = null; usedX = true }
    if (bdy && (!by || Math.abs(bdy.d) <= Math.abs(by.d))) { dy = bdy.d; gy = null; usedY = true }
    if (usedX && usedY) dg = Math.abs(bdx.d) <= Math.abs(bdy.d) ? bdx.guide : bdy.guide; else if (usedX) dg = bdx.guide; else if (usedY) dg = bdy.guide;
    return { x: Math.round(x + dx), y: Math.round(y + dy), gx, gy, dg }
  };

  const beginRectDrag = (target, p) => {
    if (!target) return;
    if (isRectLocked(target)) return;
    normSelSet();
    if (!isSelected(target.id)) selectOnly(target.id);
    const selected = getEditableSelectedRects();
    if (!selected.length) return;
    const items = selected.map(r => ({ id: r.id, rx: r.x, ry: r.y, w: r.width, h: r.height, bb: rectAABBMasked(r) }));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const it of items) {
      const bb = it.bb;
      if (!bb) continue;
      if (bb.minX < minX) minX = bb.minX;
      if (bb.minY < minY) minY = bb.minY;
      if (bb.maxX > maxX) maxX = bb.maxX;
      if (bb.maxY > maxY) maxY = bb.maxY;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) { minX = minY = maxX = maxY = 0; }
    st.drag = { id: target.id, sx: p.x, sy: p.y, items, groupBb: { minX, minY, maxX, maxY }, selectedIds: new Set(items.map(it => it.id)) };
  };

  const snapGroup = (nx, ny, drag, off) => {
    if (off || !drag || !Array.isArray(drag.items) || drag.items.length < 2) return { x: Math.round(nx), y: Math.round(ny), gx: null, gy: null, dg: null };
    const anchor = drag.items.find(it => it.id === drag.id) || drag.items[0];
    if (!anchor) return { x: Math.round(nx), y: Math.round(ny), gx: null, gy: null, dg: null };
    const dx0 = nx - anchor.rx, dy0 = ny - anchor.ry, g0 = drag.groupBb || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const mb = { minX: g0.minX + dx0, minY: g0.minY + dy0, maxX: g0.maxX + dx0, maxY: g0.maxY + dy0 }, mw = mb.maxX - mb.minX, mh = mb.maxY - mb.minY, d = 8 / st.zoom;
    const selectedIds = drag.selectedIds instanceof Set ? drag.selectedIds : new Set(drag.items.map(it => it.id));
    const others = st.rects.filter(r => !selectedIds.has(r.id)).map(r => ({ r, bb: rectAABBMasked(r) }));
    let bx = null, by = null;
    const snapCfg = st.snap || { grid: false, objects: true, centers: true, gaps: true };
    if (snapCfg.grid) {
      const step = 10;
      bx = { d: (Math.round(nx / step) * step) - nx, g: null };
      by = { d: (Math.round(ny / step) * step) - ny, g: null };
    }
    if (snapCfg.objects || snapCfg.centers) {
      const mx = (snapCfg.objects && snapCfg.centers) ? [mb.minX, (mb.minX + mb.maxX) / 2, mb.maxX] : (snapCfg.centers ? [(mb.minX + mb.maxX) / 2] : [mb.minX, mb.maxX]);
      const my = (snapCfg.objects && snapCfg.centers) ? [mb.minY, (mb.minY + mb.maxY) / 2, mb.maxY] : (snapCfg.centers ? [(mb.minY + mb.maxY) / 2] : [mb.minY, mb.maxY]);
      for (const o of others) {
        const ox = (snapCfg.objects && snapCfg.centers) ? [o.bb.minX, (o.bb.minX + o.bb.maxX) / 2, o.bb.maxX] : (snapCfg.centers ? [(o.bb.minX + o.bb.maxX) / 2] : [o.bb.minX, o.bb.maxX]);
        const oy = (snapCfg.objects && snapCfg.centers) ? [o.bb.minY, (o.bb.minY + o.bb.maxY) / 2, o.bb.maxY] : (snapCfg.centers ? [(o.bb.minY + o.bb.maxY) / 2] : [o.bb.minY, o.bb.maxY]);
        for (const p of mx) for (const t of ox) { const dd = t - p, ad = Math.abs(dd); if (ad <= d && (!bx || ad < Math.abs(bx.d))) bx = { d: dd, g: t }; }
        for (const p of my) for (const t of oy) { const dd = t - p, ad = Math.abs(dd); if (ad <= d && (!by || ad < Math.abs(by.d))) by = { d: dd, g: t }; }
      }
      if (snapCfg.centers && others.length) {
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
        for (const o of others) { minX = Math.min(minX, o.bb.minX); minY = Math.min(minY, o.bb.minY); maxX = Math.max(maxX, o.bb.maxX); maxY = Math.max(maxY, o.bb.maxY); }
        const bbCx = (minX + maxX) / 2, bbCy = (minY + maxY) / 2, mcx = (mb.minX + mb.maxX) / 2, mcy = (mb.minY + mb.maxY) / 2;
        const ddx = bbCx - mcx, adx = Math.abs(ddx); if (adx <= d && (!bx || adx < Math.abs(bx.d))) bx = { d: ddx, g: bbCx };
        const ddy = bbCy - mcy, ady = Math.abs(ddy); if (ady <= d && (!by || ady < Math.abs(by.d))) by = { d: ddy, g: bbCy };
      }
    }
    const betterDist = (cand, current) => { if (!current) return true; const cv = Math.round(current.guide.v), nv = Math.round(cand.guide.v); if (nv !== cv) return nv < cv; const cd = Math.abs(current.d), nd = Math.abs(cand.d); return nd < cd; };
    const hSource = others.filter(o => Math.min(mb.maxY, o.bb.maxY) - Math.max(mb.minY, o.bb.minY) > 0), vSource = others.filter(o => Math.min(mb.maxX, o.bb.maxX) - Math.max(mb.minX, o.bb.minX) > 0);
    const pickY = (a, b) => { const lo = Math.max(a.minY, b.minY), hi = Math.min(a.maxY, b.maxY); return lo < hi ? (lo + hi) / 2 : (a.minY + a.maxY) / 2 };
    const pickX = (a, b) => { const lo = Math.max(a.minX, b.minX), hi = Math.min(a.maxX, b.maxX); return lo < hi ? (lo + hi) / 2 : (a.minX + a.maxX) / 2 };
    let bdx = null, bdy = null;
    if (snapCfg.gaps) {
      const hpairs = []; for (let i = 0; i < hSource.length; i++)for (let j = 0; j < hSource.length; j++) { if (i === j) continue; const l = hSource[i].bb, r = hSource[j].bb; if (l.maxX > r.minX) continue; const g = Math.round(r.minX - l.maxX); if (g > 0) hpairs.push({ g, x1: l.maxX, x2: r.minX, y: pickY(l, r) }) }
      const hGapVals = [...new Set(hpairs.map(p => p.g))];
      for (const o of hSource) { const ob = o.bb, myv = pickY(mb, ob); if (ob.maxX <= mb.maxX) { for (const g of hGapVals) { const targetMinX = ob.maxX + g, dd = targetMinX - mb.minX, ad = Math.abs(dd); if (ad <= d) { const ref = hpairs.find(p => p.g === g) || { g, x1: ob.maxX, x2: targetMinX, y: myv }; const cand = { d: dd, guide: { axis: "x", x1: ob.maxX, y1: myv, x2: targetMinX, y2: myv, v: g, ref: { axis: "x", x1: ref.x1, y1: ref.y, x2: ref.x2, y2: ref.y, v: ref.g } } }; if (betterDist(cand, bdx)) bdx = cand } } } if (ob.minX >= mb.minX) { for (const g of hGapVals) { const targetMinX = ob.minX - mw - g, dd = targetMinX - mb.minX, ad = Math.abs(dd); if (ad <= d) { const ref = hpairs.find(p => p.g === g) || { g, x1: targetMinX + mw, x2: ob.minX, y: myv }; const cand = { d: dd, guide: { axis: "x", x1: targetMinX + mw, y1: myv, x2: ob.minX, y2: myv, v: g, ref: { axis: "x", x1: ref.x1, y1: ref.y, x2: ref.x2, y2: ref.y, v: ref.g } } }; if (betterDist(cand, bdx)) bdx = cand } } } }
      const vpairs = []; for (let i = 0; i < vSource.length; i++)for (let j = 0; j < vSource.length; j++) { if (i === j) continue; const t = vSource[i].bb, b = vSource[j].bb; if (t.maxY > b.minY) continue; const g = Math.round(b.minY - t.maxY); if (g > 0) vpairs.push({ g, y1: t.maxY, y2: b.minY, x: pickX(t, b) }) }
      const vGapVals = [...new Set(vpairs.map(p => p.g))];
      for (const o of vSource) { const ob = o.bb, mxv = pickX(mb, ob); if (ob.maxY <= mb.maxY) { for (const g of vGapVals) { const targetMinY = ob.maxY + g, dd = targetMinY - mb.minY, ad = Math.abs(dd); if (ad <= d) { const ref = vpairs.find(p => p.g === g) || { g, y1: ob.maxY, y2: targetMinY, x: mxv }; const cand = { d: dd, guide: { axis: "y", x1: mxv, y1: ob.maxY, x2: mxv, y2: targetMinY, v: g, ref: { axis: "y", x1: ref.x, y1: ref.y1, x2: ref.x, y2: ref.y2, v: ref.g } } }; if (betterDist(cand, bdy)) bdy = cand } } } if (ob.minY >= mb.minY) { for (const g of vGapVals) { const targetMinY = ob.minY - mh - g, dd = targetMinY - mb.minY, ad = Math.abs(dd); if (ad <= d) { const ref = vpairs.find(p => p.g === g) || { g, y1: targetMinY + mh, y2: ob.minY, x: mxv }; const cand = { d: dd, guide: { axis: "y", x1: mxv, y1: targetMinY + mh, x2: mxv, y2: ob.minY, v: g, ref: { axis: "y", x1: ref.x, y1: ref.y1, x2: ref.x, y2: ref.y2, v: ref.g } } }; if (betterDist(cand, bdy)) bdy = cand } } } }
    }
    let dx = bx ? bx.d : 0, dy = by ? by.d : 0, gx = bx ? bx.g : null, gy = by ? by.g : null, dg = null, usedX = false, usedY = false;
    if (bdx && (!bx || Math.abs(bdx.d) <= Math.abs(bx.d))) { dx = bdx.d; gx = null; usedX = true; }
    if (bdy && (!by || Math.abs(bdy.d) <= Math.abs(by.d))) { dy = bdy.d; gy = null; usedY = true; }
    if (usedX && usedY) dg = Math.abs(bdx.d) <= Math.abs(bdy.d) ? bdx.guide : bdy.guide; else if (usedX) dg = bdx.guide; else if (usedY) dg = bdy.guide;
    return { x: Math.round(nx + dx), y: Math.round(ny + dy), gx, gy, dg };
  };

  const moveRectDrag = (p, disableSnap) => {
    if (!st.drag || !Array.isArray(st.drag.items) || !st.drag.items.length) return;
    const anchor = st.drag.items.find(it => it.id === st.drag.id) || st.drag.items[0];
    if (!anchor) return;
    const nx = anchor.rx + (p.x - st.drag.sx), ny = anchor.ry + (p.y - st.drag.sy), sn = (st.drag.items.length > 1) ? snapGroup(nx, ny, st.drag, disableSnap) : snap(nx, ny, anchor.id, anchor.w, anchor.h, disableSnap), dx = sn.x - anchor.rx, dy = sn.y - anchor.ry;
    for (const it of st.drag.items) {
      const rr = getRectById(it.id);
      if (!rr) continue;
      rr.x = Math.round(it.rx + dx);
      rr.y = Math.round(it.ry + dy);
    }
    st.g.x = sn.gx; st.g.y = sn.gy; st.dg = sn.dg;
  };

  return {
    snap,
    beginRectDrag,
    snapGroup,
    moveRectDrag
  };
};
