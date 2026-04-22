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
  if (st && typeof st.debugSnap === "undefined") st.debugSnap = true;
  const snapDebug = (tag, payload) => {
    if (!st || !st.debugSnap) return;
    try { console.info(`[snap-debug:${tag}]`, payload); } catch {}
  };
  const overlap1d = (a0, a1, b0, b1) => Math.min(a1, b1) - Math.max(a0, b0);
  const pickY = (a, b) => {
    const lo = Math.max(a.minY, b.minY), hi = Math.min(a.maxY, b.maxY);
    return lo < hi ? (lo + hi) / 2 : (a.minY + a.maxY) / 2;
  };
  const pickX = (a, b) => {
    const lo = Math.max(a.minX, b.minX), hi = Math.min(a.maxX, b.maxX);
    return lo < hi ? (lo + hi) / 2 : (a.minX + a.maxX) / 2;
  };
  const hasObstacleBetweenX = (l, r, list) => {
    for (const it of list) {
      const c = it && it.bb;
      if (!c || c === l || c === r) continue;
      if (overlap1d(l.minY, l.maxY, c.minY, c.maxY) <= 0) continue;
      if (overlap1d(r.minY, r.maxY, c.minY, c.maxY) <= 0) continue;
      if (c.minX <= r.minX && c.maxX >= l.maxX) return it;
    }
    return null;
  };
  const hasObstacleBetweenY = (t, b, list) => {
    for (const it of list) {
      const c = it && it.bb;
      if (!c || c === t || c === b) continue;
      if (overlap1d(t.minX, t.maxX, c.minX, c.maxX) <= 0) continue;
      if (overlap1d(b.minX, b.maxX, c.minX, c.maxX) <= 0) continue;
      if (c.minY <= b.minY && c.maxY >= t.maxY) return it;
    }
    return null;
  };
  const canSnapOnAxis = (a, b, axis, list) => {
    if (!a || !b) return false;
    if (axis === "x") {
      if (overlap1d(a.minY, a.maxY, b.minY, b.maxY) <= 0) return true;
      const l = a.minX <= b.minX ? a : b;
      const r = l === a ? b : a;
      if (l.maxX >= r.minX) return true;
      return !hasObstacleBetweenX(l, r, list);
    }
    if (overlap1d(a.minX, a.maxX, b.minX, b.maxX) <= 0) return true;
    const t = a.minY <= b.minY ? a : b;
    const bt = t === a ? b : a;
    if (t.maxY >= bt.minY) return true;
    return !hasObstacleBetweenY(t, bt, list);
  };
  const explainSnapOnAxis = (a, b, axis, list) => {
    if (!a || !b) return { ok: false, reason: "missing_box", blockerId: null };
    if (axis === "x") {
      if (overlap1d(a.minY, a.maxY, b.minY, b.maxY) <= 0) return { ok: true, reason: "no_shadow_overlap", blockerId: null };
      const l = a.minX <= b.minX ? a : b;
      const r = l === a ? b : a;
      if (l.maxX >= r.minX) return { ok: true, reason: "touch_or_overlap", blockerId: null };
      const blocker = hasObstacleBetweenX(l, r, list);
      if (blocker) return { ok: false, reason: "obstacle", blockerId: blocker && blocker.r ? blocker.r.id : null };
      return { ok: true, reason: "clear", blockerId: null };
    }
    if (overlap1d(a.minX, a.maxX, b.minX, b.maxX) <= 0) return { ok: true, reason: "no_shadow_overlap", blockerId: null };
    const t = a.minY <= b.minY ? a : b;
    const bt = t === a ? b : a;
    if (t.maxY >= bt.minY) return { ok: true, reason: "touch_or_overlap", blockerId: null };
    const blocker = hasObstacleBetweenY(t, bt, list);
    if (blocker) return { ok: false, reason: "obstacle", blockerId: blocker && blocker.r ? blocker.r.id : null };
    return { ok: true, reason: "clear", blockerId: null };
  };
  const shiftedBox = (bb, dx, dy) => ({
    minX: bb.minX + (dx || 0),
    minY: bb.minY + (dy || 0),
    maxX: bb.maxX + (dx || 0),
    maxY: bb.maxY + (dy || 0)
  });
  const buildGapPairs = (shadow, axis) => {
    const out = [];
    for (let i = 0; i < shadow.length; i++) {
      for (let j = i + 1; j < shadow.length; j++) {
        const a = shadow[i] && shadow[i].bb, b = shadow[j] && shadow[j].bb;
        if (!a || !b) continue;
        if (axis === "x") {
          const l = a.minX <= b.minX ? a : b, r = l === a ? b : a;
          if (l.maxX >= r.minX) continue;
          if (overlap1d(l.minY, l.maxY, r.minY, r.maxY) <= 0) continue;
          if (hasObstacleBetweenX(l, r, shadow)) continue;
          const g = Math.round(r.minX - l.maxX);
          if (g > 0) out.push({ g, x1: l.maxX, x2: r.minX, y: pickY(l, r) });
        } else {
          const t = a.minY <= b.minY ? a : b, bt = t === a ? b : a;
          if (t.maxY >= bt.minY) continue;
          if (overlap1d(t.minX, t.maxX, bt.minX, bt.maxX) <= 0) continue;
          if (hasObstacleBetweenY(t, bt, shadow)) continue;
          const g = Math.round(bt.minY - t.maxY);
          if (g > 0) out.push({ g, y1: t.maxY, y2: bt.minY, x: pickX(t, bt) });
        }
      }
    }
    return out;
  };
  const findGapSnapCandidate = (mb, mw, mh, others, d, axis) => {
    const shadow = others.filter(o => {
      const bb = o && o.bb;
      if (!bb) return false;
      return axis === "x"
        ? overlap1d(mb.minY, mb.maxY, bb.minY, bb.maxY) > 0
        : overlap1d(mb.minX, mb.maxX, bb.minX, bb.maxX) > 0;
    });
    if (!shadow.length) return null;
    const pairs = buildGapPairs(shadow, axis);
    if (!pairs.length) return null;
    const betterDist = (cand, current) => {
      if (!current) return true;
      const cd = Math.abs(current.d), nd = Math.abs(cand.d);
      if (nd !== cd) return nd < cd;
      const cg = Math.round(Number(current.gap) || 0), ng = Math.round(Number(cand.gap) || 0);
      return ng < cg;
    };
    let best = null;
    for (const o of shadow) {
      const ob = o && o.bb;
      if (!ob) continue;
      if (axis === "x") {
        const myv = pickY(mb, ob);
        if (ob.maxX <= mb.maxX) {
          for (const p of pairs) {
            const targetMinX = ob.maxX + p.g;
            const dd = targetMinX - mb.minX, ad = Math.abs(dd);
            if (ad > d) continue;
            const moved = shiftedBox(mb, dd, 0);
            const ex = explainSnapOnAxis(moved, ob, "x", others);
            if (!ex.ok) {
              if (ex.reason === "obstacle") snapDebug("gap-obstacle-x", { movingId: null, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd, gap: p.g });
              continue;
            }
            const cand = {
              d: dd,
              gap: p.g,
              guide: { axis: "x", x1: ob.maxX, y1: myv, x2: targetMinX, y2: myv, v: p.g, ref: { axis: "x", x1: p.x1, y1: p.y, x2: p.x2, y2: p.y, v: p.g } }
            };
            if (betterDist(cand, best)) best = cand;
          }
        }
        if (ob.minX >= mb.minX) {
          for (const p of pairs) {
            const targetMinX = ob.minX - mw - p.g;
            const dd = targetMinX - mb.minX, ad = Math.abs(dd);
            if (ad > d) continue;
            const moved = shiftedBox(mb, dd, 0);
            const ex = explainSnapOnAxis(moved, ob, "x", others);
            if (!ex.ok) {
              if (ex.reason === "obstacle") snapDebug("gap-obstacle-x", { movingId: null, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd, gap: p.g });
              continue;
            }
            const cand = {
              d: dd,
              gap: p.g,
              guide: { axis: "x", x1: targetMinX + mw, y1: myv, x2: ob.minX, y2: myv, v: p.g, ref: { axis: "x", x1: p.x1, y1: p.y, x2: p.x2, y2: p.y, v: p.g } }
            };
            if (betterDist(cand, best)) best = cand;
          }
        }
      } else {
        const mxv = pickX(mb, ob);
        if (ob.maxY <= mb.maxY) {
          for (const p of pairs) {
            const targetMinY = ob.maxY + p.g;
            const dd = targetMinY - mb.minY, ad = Math.abs(dd);
            if (ad > d) continue;
            const moved = shiftedBox(mb, 0, dd);
            const ex = explainSnapOnAxis(moved, ob, "y", others);
            if (!ex.ok) {
              if (ex.reason === "obstacle") snapDebug("gap-obstacle-y", { movingId: null, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd, gap: p.g });
              continue;
            }
            const cand = {
              d: dd,
              gap: p.g,
              guide: { axis: "y", x1: mxv, y1: ob.maxY, x2: mxv, y2: targetMinY, v: p.g, ref: { axis: "y", x1: p.x, y1: p.y1, x2: p.x, y2: p.y2, v: p.g } }
            };
            if (betterDist(cand, best)) best = cand;
          }
        }
        if (ob.minY >= mb.minY) {
          for (const p of pairs) {
            const targetMinY = ob.minY - mh - p.g;
            const dd = targetMinY - mb.minY, ad = Math.abs(dd);
            if (ad > d) continue;
            const moved = shiftedBox(mb, 0, dd);
            const ex = explainSnapOnAxis(moved, ob, "y", others);
            if (!ex.ok) {
              if (ex.reason === "obstacle") snapDebug("gap-obstacle-y", { movingId: null, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd, gap: p.g });
              continue;
            }
            const cand = {
              d: dd,
              gap: p.g,
              guide: { axis: "y", x1: mxv, y1: targetMinY + mh, x2: mxv, y2: ob.minY, v: p.g, ref: { axis: "y", x1: p.x, y1: p.y1, x2: p.x, y2: p.y2, v: p.g } }
            };
            if (betterDist(cand, best)) best = cand;
          }
        }
      }
    }
    return best;
  };
  const pickBestGapCandidate = (a, b) => {
    if (!a) return b || null;
    if (!b) return a || null;
    const ad = Math.abs(a.d), bd = Math.abs(b.d);
    if (ad !== bd) return ad < bd ? a : b;
    if ((a.kind === "equal") !== (b.kind === "equal")) return a.kind === "equal" ? a : b;
    const ag = Math.abs(Math.round(Number(a.gap) || 0));
    const bg = Math.abs(Math.round(Number(b.gap) || 0));
    return ag <= bg ? a : b;
  };
  const findEqualGapSnapCandidate = (mb, mw, mh, others, d, axis) => {
    const shadow = others.filter(o => {
      const bb = o && o.bb;
      if (!bb) return false;
      return axis === "x"
        ? overlap1d(mb.minY, mb.maxY, bb.minY, bb.maxY) > 0
        : overlap1d(mb.minX, mb.maxX, bb.minX, bb.maxX) > 0;
    });
    if (shadow.length < 2) return null;
    let best = null;
    for (let i = 0; i < shadow.length; i++) {
      for (let j = i + 1; j < shadow.length; j++) {
        const a = shadow[i] && shadow[i].bb, b = shadow[j] && shadow[j].bb;
        if (!a || !b) continue;
        if (axis === "x") {
          const l = a.minX <= b.minX ? a : b, r = l === a ? b : a;
          if (l.maxX >= r.minX) continue;
          if (overlap1d(l.minY, l.maxY, r.minY, r.maxY) <= 0) continue;
          const blocker = hasObstacleBetweenX(l, r, shadow);
          if (blocker) continue;
          const targetMinX = (l.maxX + r.minX - mw) / 2;
          const dd = targetMinX - mb.minX, ad = Math.abs(dd);
          if (ad > d) continue;
          const moved = shiftedBox(mb, dd, 0);
          const exL = explainSnapOnAxis(moved, l, "x", others);
          const exR = explainSnapOnAxis(moved, r, "x", others);
          if (!exL.ok || !exR.ok) continue;
          const gapL = Math.round((targetMinX) - l.maxX);
          const gapR = Math.round(r.minX - (targetMinX + mw));
          if (gapL < 0 || gapR < 0) continue;
          const y = pickY(l, r);
          const cand = {
            kind: "equal",
            d: dd,
            gap: Math.round((gapL + gapR) / 2),
            guide: {
              axis: "x",
              x1: l.maxX,
              y1: y,
              x2: targetMinX,
              y2: y,
              v: gapL,
              ref: { axis: "x", x1: targetMinX + mw, y1: y, x2: r.minX, y2: y, v: gapR }
            }
          };
          if (!best || Math.abs(cand.d) < Math.abs(best.d)) best = cand;
        } else {
          const t = a.minY <= b.minY ? a : b, bt = t === a ? b : a;
          if (t.maxY >= bt.minY) continue;
          if (overlap1d(t.minX, t.maxX, bt.minX, bt.maxX) <= 0) continue;
          const blocker = hasObstacleBetweenY(t, bt, shadow);
          if (blocker) continue;
          const targetMinY = (t.maxY + bt.minY - mh) / 2;
          const dd = targetMinY - mb.minY, ad = Math.abs(dd);
          if (ad > d) continue;
          const moved = shiftedBox(mb, 0, dd);
          const exT = explainSnapOnAxis(moved, t, "y", others);
          const exB = explainSnapOnAxis(moved, bt, "y", others);
          if (!exT.ok || !exB.ok) continue;
          const gapT = Math.round(targetMinY - t.maxY);
          const gapB = Math.round(bt.minY - (targetMinY + mh));
          if (gapT < 0 || gapB < 0) continue;
          const x = pickX(t, bt);
          const cand = {
            kind: "equal",
            d: dd,
            gap: Math.round((gapT + gapB) / 2),
            guide: {
              axis: "y",
              x1: x,
              y1: t.maxY,
              x2: x,
              y2: targetMinY,
              v: gapT,
              ref: { axis: "y", x1: x, y1: targetMinY + mh, x2: x, y2: bt.minY, v: gapB }
            }
          };
          if (!best || Math.abs(cand.d) < Math.abs(best.d)) best = cand;
        }
      }
    }
    if (best) snapDebug("equal-gap", { axis, d: best.d, gap: best.gap });
    return best;
  };
  const findPerpEdgeSnap = (mb, others, d, axis) => {
    let best = null;
    for (const o of others) {
      const ob = o && o.bb;
      if (!ob) continue;
      if (axis === "x") {
        for (const p of [mb.minX, mb.maxX]) for (const t of [ob.minX, ob.maxX]) {
          const dd = t - p, ad = Math.abs(dd);
          if (ad > d) continue;
          const moved = shiftedBox(mb, dd, 0);
          const ex = explainSnapOnAxis(moved, ob, "x", others);
          if (!ex.ok) continue;
          if (!best || ad < Math.abs(best.d)) best = { d: dd, g: t };
        }
      } else {
        for (const p of [mb.minY, mb.maxY]) for (const t of [ob.minY, ob.maxY]) {
          const dd = t - p, ad = Math.abs(dd);
          if (ad > d) continue;
          const moved = shiftedBox(mb, 0, dd);
          const ex = explainSnapOnAxis(moved, ob, "y", others);
          if (!ex.ok) continue;
          if (!best || ad < Math.abs(best.d)) best = { d: dd, g: t };
        }
      }
    }
    return best;
  };

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
        for (const p of mx) for (const t of ox) {
          const dd = t - p, ad = Math.abs(dd);
          if (ad > d) continue;
          const moved = shiftedBox(mb, dd, 0);
          const ex = explainSnapOnAxis(moved, o.bb, "x", others);
          if (!ex.ok) {
            if (ex.reason === "obstacle") snapDebug("obstacle-x", { mode: "single", movingId: id, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd });
            continue;
          }
          if (!bx || ad < Math.abs(bx.d)) bx = { d: dd, g: t };
        }
        for (const p of my) for (const t of oy) {
          const dd = t - p, ad = Math.abs(dd);
          if (ad > d) continue;
          const moved = shiftedBox(mb, 0, dd);
          const ex = explainSnapOnAxis(moved, o.bb, "y", others);
          if (!ex.ok) {
            if (ex.reason === "obstacle") snapDebug("obstacle-y", { mode: "single", movingId: id, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd });
            continue;
          }
          if (!by || ad < Math.abs(by.d)) by = { d: dd, g: t };
        }
      }
      if (snapCfg.centers && others.length) {
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9; for (const o of others) { minX = Math.min(minX, o.bb.minX); minY = Math.min(minY, o.bb.minY); maxX = Math.max(maxX, o.bb.maxX); maxY = Math.max(maxY, o.bb.maxY) }
        const bbCx = (minX + maxX) / 2, bbCy = (minY + maxY) / 2, mcx = (mb.minX + mb.maxX) / 2, mcy = (mb.minY + mb.maxY) / 2;
        const ddx = bbCx - mcx, adx = Math.abs(ddx); if (adx <= d && (!bx || adx < Math.abs(bx.d))) bx = { d: ddx, g: bbCx };
        const ddy = bbCy - mcy, ady = Math.abs(ddy); if (ady <= d && (!by || ady < Math.abs(by.d))) by = { d: ddy, g: bbCy };
      }
    }
    let bdx = null, bdy = null, bex = null, bey = null;
    if (snapCfg.gaps) {
      bdx = findGapSnapCandidate(mb, mw, mh, others, d, "x");
      bdy = findGapSnapCandidate(mb, mw, mh, others, d, "y");
      bex = findEqualGapSnapCandidate(mb, mw, mh, others, d, "x");
      bey = findEqualGapSnapCandidate(mb, mw, mh, others, d, "y");
    }
    const gxCand = pickBestGapCandidate(bdx, bex);
    const gyCand = pickBestGapCandidate(bdy, bey);
    let dx = bx ? bx.d : 0, dy = by ? by.d : 0, gx = bx ? bx.g : null, gy = by ? by.g : null, dg = null, usedX = false, usedY = false;
    if (gxCand && (!bx || Math.abs(gxCand.d) <= Math.abs(bx.d))) { dx = gxCand.d; gx = null; usedX = true }
    if (gyCand && (!by || Math.abs(gyCand.d) <= Math.abs(by.d))) { dy = gyCand.d; gy = null; usedY = true }
    if (usedX && !usedY) {
      const movedX = shiftedBox(mb, dx, 0);
      const py = findPerpEdgeSnap(movedX, others, d, "y");
      if (py && (!by || Math.abs(py.d) <= Math.abs(dy || Infinity))) { dy = py.d; gy = py.g; }
    }
    if (usedY && !usedX) {
      const movedY = shiftedBox(mb, 0, dy);
      const px = findPerpEdgeSnap(movedY, others, d, "x");
      if (px && (!bx || Math.abs(px.d) <= Math.abs(dx || Infinity))) { dx = px.d; gx = px.g; }
    }
    if (usedX && usedY) dg = Math.abs(gxCand.d) <= Math.abs(gyCand.d) ? gxCand.guide : gyCand.guide; else if (usedX) dg = gxCand.guide; else if (usedY) dg = gyCand.guide;
    const out = { x: Math.round(x + dx), y: Math.round(y + dy), gx, gy, dg };
    snapDebug("result-single", { id, x: out.x, y: out.y, gx: out.gx, gy: out.gy, gapSnap: !!out.dg });
    return out
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
    st.drag = { id: target.id, sx: p.x, sy: p.y, moved: false, items, groupBb: { minX, minY, maxX, maxY }, selectedIds: new Set(items.map(it => it.id)) };
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
        for (const p of mx) for (const t of ox) {
          const dd = t - p, ad = Math.abs(dd);
          if (ad > d) continue;
          const moved = shiftedBox(mb, dd, 0);
          const ex = explainSnapOnAxis(moved, o.bb, "x", others);
          if (!ex.ok) {
            if (ex.reason === "obstacle") snapDebug("obstacle-x", { mode: "group", movingId: anchor.id, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd });
            continue;
          }
          if (!bx || ad < Math.abs(bx.d)) bx = { d: dd, g: t };
        }
        for (const p of my) for (const t of oy) {
          const dd = t - p, ad = Math.abs(dd);
          if (ad > d) continue;
          const moved = shiftedBox(mb, 0, dd);
          const ex = explainSnapOnAxis(moved, o.bb, "y", others);
          if (!ex.ok) {
            if (ex.reason === "obstacle") snapDebug("obstacle-y", { mode: "group", movingId: anchor.id, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd });
            continue;
          }
          if (!by || ad < Math.abs(by.d)) by = { d: dd, g: t };
        }
      }
      if (snapCfg.centers && others.length) {
        let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
        for (const o of others) { minX = Math.min(minX, o.bb.minX); minY = Math.min(minY, o.bb.minY); maxX = Math.max(maxX, o.bb.maxX); maxY = Math.max(maxY, o.bb.maxY); }
        const bbCx = (minX + maxX) / 2, bbCy = (minY + maxY) / 2, mcx = (mb.minX + mb.maxX) / 2, mcy = (mb.minY + mb.maxY) / 2;
        const ddx = bbCx - mcx, adx = Math.abs(ddx); if (adx <= d && (!bx || adx < Math.abs(bx.d))) bx = { d: ddx, g: bbCx };
        const ddy = bbCy - mcy, ady = Math.abs(ddy); if (ady <= d && (!by || ady < Math.abs(by.d))) by = { d: ddy, g: bbCy };
      }
    }
    let bdx = null, bdy = null, bex = null, bey = null;
    if (snapCfg.gaps) {
      bdx = findGapSnapCandidate(mb, mw, mh, others, d, "x");
      bdy = findGapSnapCandidate(mb, mw, mh, others, d, "y");
      bex = findEqualGapSnapCandidate(mb, mw, mh, others, d, "x");
      bey = findEqualGapSnapCandidate(mb, mw, mh, others, d, "y");
    }
    const gxCand = pickBestGapCandidate(bdx, bex);
    const gyCand = pickBestGapCandidate(bdy, bey);
    let dx = bx ? bx.d : 0, dy = by ? by.d : 0, gx = bx ? bx.g : null, gy = by ? by.g : null, dg = null, usedX = false, usedY = false;
    if (gxCand && (!bx || Math.abs(gxCand.d) <= Math.abs(bx.d))) { dx = gxCand.d; gx = null; usedX = true; }
    if (gyCand && (!by || Math.abs(gyCand.d) <= Math.abs(by.d))) { dy = gyCand.d; gy = null; usedY = true; }
    if (usedX && !usedY) {
      const movedX = shiftedBox(mb, dx, 0);
      const py = findPerpEdgeSnap(movedX, others, d, "y");
      if (py && (!by || Math.abs(py.d) <= Math.abs(dy || Infinity))) { dy = py.d; gy = py.g; }
    }
    if (usedY && !usedX) {
      const movedY = shiftedBox(mb, 0, dy);
      const px = findPerpEdgeSnap(movedY, others, d, "x");
      if (px && (!bx || Math.abs(px.d) <= Math.abs(dx || Infinity))) { dx = px.d; gx = px.g; }
    }
    if (usedX && usedY) dg = Math.abs(gxCand.d) <= Math.abs(gyCand.d) ? gxCand.guide : gyCand.guide; else if (usedX) dg = gxCand.guide; else if (usedY) dg = gyCand.guide;
    const out = { x: Math.round(nx + dx), y: Math.round(ny + dy), gx, gy, dg };
    snapDebug("result-group", { id: anchor.id, x: out.x, y: out.y, gx: out.gx, gy: out.gy, gapSnap: !!out.dg, count: drag.items.length });
    return out;
  };

  const moveRectDrag = (p, disableSnap) => {
    if (!st.drag || !Array.isArray(st.drag.items) || !st.drag.items.length) return;
    const DRAG_START_THRESHOLD_PX = 8;
    const thresholdWorld = DRAG_START_THRESHOLD_PX / Math.max(0.2, Number(st.zoom) || 1);
    const movedDist = Math.hypot((+p.x || 0) - (+st.drag.sx || 0), (+p.y || 0) - (+st.drag.sy || 0));
    if (!st.drag.moved && movedDist < thresholdWorld) {
      st.g.x = null;
      st.g.y = null;
      st.dg = null;
      return;
    }
    st.drag.moved = true;
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
