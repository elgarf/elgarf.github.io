/* build:1779222473 */
export const setupDragSnapController = (deps = {}) => {
  const {
    st,
    getRectById,
    rectAABBMasked,
    isRectLocked,
    normSelSet,
    isSelected,
    selectOnly,
    getEditableSelectedRects,
    canSnapRect
  } = deps;

  const flowEndpointRectId = endpoint => Math.max(1, Math.round(Number(endpoint && endpoint.rectId) || 0));
  const flowEndpointCid = endpoint => Math.max(0, Math.round(Number(endpoint && endpoint.cid) || 0));
  const flowLinkDragKey = link => {
    const from = link && link.from;
    const to = link && link.to;
    if (!from || !to) return "";
    return `${flowEndpointRectId(from)}:${flowEndpointCid(from)}>${flowEndpointRectId(to)}:${flowEndpointCid(to)}`;
  };
  if (st && typeof st.debugSnap === "undefined") st.debugSnap = false;
  const snapDebug = (tag, payload) => {
    if (!st || !st.debugSnap) return;
    try { console.info(`[snap-debug:${tag}]`, payload); } catch { /* noop */ }
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
  const midpointOverlap = (a0, a1, b0, b1) => {
    const lo = Math.max(a0, b0), hi = Math.min(a1, b1);
    return lo < hi ? (lo + hi) / 2 : null;
  };
  const makeGapGuide = (base, targetBb, movingEdge, targetEdge) => ({ ...base, targetBb, movingEdge, targetEdge });
  const normalizeGapGuide = (guide, moved) => {
    if (!guide) return null;
    let out = guide;
    const target = guide.targetBb;
    if (target && moved) {
      if (guide.axis === "x") {
        const y = midpointOverlap(moved.minY, moved.maxY, target.minY, target.maxY);
        if (y == null) return null;
        const movingX = guide.movingEdge === "maxX" ? moved.maxX : moved.minX;
        const targetX = guide.targetEdge === "maxX" ? target.maxX : target.minX;
        out = { ...guide, x1: targetX, y1: y, x2: movingX, y2: y, v: Math.abs(Math.round(movingX - targetX)) };
      } else if (guide.axis === "y") {
        const x = midpointOverlap(moved.minX, moved.maxX, target.minX, target.maxX);
        if (x == null) return null;
        const movingY = guide.movingEdge === "maxY" ? moved.maxY : moved.minY;
        const targetY = guide.targetEdge === "maxY" ? target.maxY : target.minY;
        out = { ...guide, x1: x, y1: targetY, x2: x, y2: movingY, v: Math.abs(Math.round(movingY - targetY)) };
      }
    }
    const ref = normalizeGapGuide(out.ref, moved);
    const refs = Array.isArray(out.refs) ? out.refs.map(r => normalizeGapGuide(r, moved)).filter(Boolean) : null;
    if (ref || refs) return { ...out, ...(ref ? { ref } : {}), ...(refs ? { refs } : {}) };
    const { ref: _ref, refs: _refs, ...rest } = out;
    return rest;
  };
  const hasObstacleBetween = (a, b, list, axis, cross = null) => {
    const crossPinned = Number.isFinite(cross);
    const ai = axis === "x";
    const sideA = ai ? "minX" : "minY";
    const sideB = ai ? "maxX" : "maxY";
    const crossMin = ai ? "minY" : "minX";
    const crossMax = ai ? "maxY" : "maxX";
    const left = a[sideA] <= b[sideA] ? a : b;
    const right = left === a ? b : a;
    for (const it of list) {
      const c = it && it.bb;
      if (!c || c === left || c === right) continue;
      if (crossPinned) {
        if (!(cross > c[crossMin] && cross < c[crossMax])) continue;
        if (!(cross > left[crossMin] && cross < left[crossMax] && cross > right[crossMin] && cross < right[crossMax])) continue;
      } else {
        const lo = Math.max(left[crossMin], right[crossMin], c[crossMin]);
        const hi = Math.min(left[crossMax], right[crossMax], c[crossMax]);
        if (hi - lo <= 0) continue;
      }
      if (c[sideA] <= right[sideA] && c[sideB] >= left[sideB]) return it;
    }
    return null;
  };
  const hasObstacleBetweenX = (l, r, list) => hasObstacleBetween(l, r, list, "x");
  const hasObstacleBetweenXAtY = (l, r, list, y) => hasObstacleBetween(l, r, list, "x", y);
  const hasObstacleBetweenY = (t, b, list) => hasObstacleBetween(t, b, list, "y");
  const hasObstacleBetweenYAtX = (t, b, list, x) => hasObstacleBetween(t, b, list, "y", x);
  const explainSnapOnAxisCore = (a, b, axis, list, cross = null) => {
    if (!a || !b) return { ok: false, reason: "missing_box", blockerId: null };
    if (axis === "x") {
      if (overlap1d(a.minY, a.maxY, b.minY, b.maxY) <= 0) return { ok: true, reason: "no_shadow_overlap", blockerId: null };
      const l = a.minX <= b.minX ? a : b;
      const r = l === a ? b : a;
      if (l.maxX >= r.minX) return { ok: true, reason: "touch_or_overlap", blockerId: null };
      const blocker = Number.isFinite(cross) ? hasObstacleBetweenXAtY(l, r, list, cross) : hasObstacleBetweenX(l, r, list);
      if (blocker) return { ok: false, reason: "obstacle", blockerId: blocker && blocker.r ? blocker.r.id : null };
      return { ok: true, reason: "clear", blockerId: null };
    }
    if (overlap1d(a.minX, a.maxX, b.minX, b.maxX) <= 0) return { ok: true, reason: "no_shadow_overlap", blockerId: null };
    const t = a.minY <= b.minY ? a : b;
    const bt = t === a ? b : a;
    if (t.maxY >= bt.minY) return { ok: true, reason: "touch_or_overlap", blockerId: null };
    const blocker = Number.isFinite(cross) ? hasObstacleBetweenYAtX(t, bt, list, cross) : hasObstacleBetweenY(t, bt, list);
    if (blocker) return { ok: false, reason: "obstacle", blockerId: blocker && blocker.r ? blocker.r.id : null };
    return { ok: true, reason: "clear", blockerId: null };
  };
  const explainSnapOnAxis = (a, b, axis, list) => explainSnapOnAxisCore(a, b, axis, list);
  const explainSnapOnAxisAt = (a, b, axis, list, cross) => explainSnapOnAxisCore(a, b, axis, list, cross);
  const shiftedBox = (bb, dx, dy) => ({
    minX: bb.minX + (dx || 0),
    minY: bb.minY + (dy || 0),
    maxX: bb.maxX + (dx || 0),
    maxY: bb.maxY + (dy || 0)
  });
  const calcOthersStats = (others) => {
    if (!Array.isArray(others) || !others.length) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const o of others) {
      const bb = o && o.bb;
      if (!bb) continue;
      if (bb.minX < minX) minX = bb.minX;
      if (bb.minY < minY) minY = bb.minY;
      if (bb.maxX > maxX) maxX = bb.maxX;
      if (bb.maxY > maxY) maxY = bb.maxY;
    }
    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
    return { minX, minY, maxX, maxY, cx: (minX + maxX) / 2, cy: (minY + maxY) / 2 };
  };
  const buildGapPairs = (list, axis, obstacleList = null) => {
    const src = Array.isArray(list) ? list : [];
    const blockers = Array.isArray(obstacleList) ? obstacleList : src;
    const out = [];
    for (let i = 0; i < src.length; i++) {
      for (let j = i + 1; j < src.length; j++) {
        const a = src[i] && src[i].bb, b = src[j] && src[j].bb;
        if (!a || !b) continue;
        if (axis === "x") {
          const l = a.minX <= b.minX ? a : b, r = l === a ? b : a;
          if (l.maxX >= r.minX) continue;
          if (overlap1d(l.minY, l.maxY, r.minY, r.maxY) <= 0) continue;
          if (hasObstacleBetweenX(l, r, blockers)) continue;
          const g = Math.round(r.minX - l.maxX);
          if (g >= 0) out.push({ g, x1: l.maxX, x2: r.minX, y: pickY(l, r) });
        } else {
          const t = a.minY <= b.minY ? a : b, bt = t === a ? b : a;
          if (t.maxY >= bt.minY) continue;
          if (overlap1d(t.minX, t.maxX, bt.minX, bt.maxX) <= 0) continue;
          if (hasObstacleBetweenY(t, bt, blockers)) continue;
          const g = Math.round(bt.minY - t.maxY);
          if (g >= 0) out.push({ g, y1: t.maxY, y2: bt.minY, x: pickX(t, bt) });
        }
      }
    }
    return out;
  };
  const intersectsAabb = (a, b) => {
    if (!a || !b) return false;
    return !(a.maxX < b.minX || a.minX > b.maxX || a.maxY < b.minY || a.minY > b.maxY);
  };
  const collectGapZone = (mb, others, axis) => {
    const src = Array.isArray(others) ? others : [];
    if (!mb || !src.length) return [];
    let minX = mb.minX, minY = mb.minY, maxX = mb.maxX, maxY = mb.maxY;
    for (const o of src) {
      const bb = o && o.bb;
      if (!bb) continue;
      if (bb.minX < minX) minX = bb.minX;
      if (bb.minY < minY) minY = bb.minY;
      if (bb.maxX > maxX) maxX = bb.maxX;
      if (bb.maxY > maxY) maxY = bb.maxY;
    }
    const zone = (axis === "x")
      ? { minX, minY: mb.minY, maxX, maxY: mb.maxY }
      : { minX: mb.minX, minY, maxX: mb.maxX, maxY };
    return src.filter(o => {
      const bb = o && o.bb;
      if (!bb) return false;
      return intersectsAabb(bb, zone);
    });
  };
  const getGapAxisData = (mb, others, axis, cache = null) => {
    if (cache && cache[axis]) return cache[axis];
    const shadow = collectGapZone(mb, others, axis);
    const pairs = shadow.length ? buildGapPairs(shadow, axis, shadow) : [];
    const data = { shadow, pairs };
    if (cache) cache[axis] = data;
    return data;
  };
  const findGapSnapCandidate = (mb, mw, mh, others, d, axis, gapCache = null) => {
    const { shadow, pairs } = getGapAxisData(mb, others, axis, gapCache);
    if (!shadow.length) return null;
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
            const ex = explainSnapOnAxisAt(moved, ob, "x", shadow, myv);
            if (!ex.ok) {
              if (ex.reason === "obstacle") snapDebug("gap-obstacle-x", { movingId: null, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd, gap: p.g });
              continue;
            }
            const cand = {
              d: dd,
              gap: p.g,
              guide: makeGapGuide(
                { axis: "x", x1: ob.maxX, y1: myv, x2: targetMinX, y2: myv, v: p.g, ref: { axis: "x", x1: p.x1, y1: p.y, x2: p.x2, y2: p.y, v: p.g } },
                ob,
                "minX",
                "maxX"
              )
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
            const ex = explainSnapOnAxisAt(moved, ob, "x", shadow, myv);
            if (!ex.ok) {
              if (ex.reason === "obstacle") snapDebug("gap-obstacle-x", { movingId: null, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd, gap: p.g });
              continue;
            }
            const cand = {
              d: dd,
              gap: p.g,
              guide: makeGapGuide(
                { axis: "x", x1: targetMinX + mw, y1: myv, x2: ob.minX, y2: myv, v: p.g, ref: { axis: "x", x1: p.x1, y1: p.y, x2: p.x2, y2: p.y, v: p.g } },
                ob,
                "maxX",
                "minX"
              )
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
            const ex = explainSnapOnAxisAt(moved, ob, "y", shadow, mxv);
            if (!ex.ok) {
              if (ex.reason === "obstacle") snapDebug("gap-obstacle-y", { movingId: null, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd, gap: p.g });
              continue;
            }
            const cand = {
              d: dd,
              gap: p.g,
              guide: makeGapGuide(
                { axis: "y", x1: mxv, y1: ob.maxY, x2: mxv, y2: targetMinY, v: p.g, ref: { axis: "y", x1: p.x, y1: p.y1, x2: p.x, y2: p.y2, v: p.g } },
                ob,
                "minY",
                "maxY"
              )
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
            const ex = explainSnapOnAxisAt(moved, ob, "y", shadow, mxv);
            if (!ex.ok) {
              if (ex.reason === "obstacle") snapDebug("gap-obstacle-y", { movingId: null, targetId: o && o.r ? o.r.id : null, blockerId: ex.blockerId, dd, gap: p.g });
              continue;
            }
            const cand = {
              d: dd,
              gap: p.g,
              guide: makeGapGuide(
                { axis: "y", x1: mxv, y1: targetMinY + mh, x2: mxv, y2: ob.minY, v: p.g, ref: { axis: "y", x1: p.x, y1: p.y1, x2: p.x, y2: p.y2, v: p.g } },
                ob,
                "maxY",
                "minY"
              )
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
  const findEqualGapSnapCandidate = (mb, mw, mh, others, d, axis, gapCache = null) => {
    const shadow = getGapAxisData(mb, others, axis, gapCache).shadow;
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
          const y = pickY(l, r);
          const exL = explainSnapOnAxisAt(moved, l, "x", shadow, y);
          const exR = explainSnapOnAxisAt(moved, r, "x", shadow, y);
          if (!exL.ok || !exR.ok) continue;
          const gapL = Math.round((targetMinX) - l.maxX);
          const gapR = Math.round(r.minX - (targetMinX + mw));
          if (gapL < 0 || gapR < 0) continue;
          const cand = {
            kind: "equal",
            d: dd,
            gap: Math.round((gapL + gapR) / 2),
            guide: makeGapGuide({
              axis: "x",
              x1: l.maxX,
              y1: y,
              x2: targetMinX,
              y2: y,
              v: gapL,
              ref: makeGapGuide({ axis: "x", x1: targetMinX + mw, y1: y, x2: r.minX, y2: y, v: gapR }, r, "maxX", "minX")
            }, l, "minX", "maxX")
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
          const x = pickX(t, bt);
          const exT = explainSnapOnAxisAt(moved, t, "y", shadow, x);
          const exB = explainSnapOnAxisAt(moved, bt, "y", shadow, x);
          if (!exT.ok || !exB.ok) continue;
          const gapT = Math.round(targetMinY - t.maxY);
          const gapB = Math.round(bt.minY - (targetMinY + mh));
          if (gapT < 0 || gapB < 0) continue;
          const cand = {
            kind: "equal",
            d: dd,
            gap: Math.round((gapT + gapB) / 2),
            guide: makeGapGuide({
              axis: "y",
              x1: x,
              y1: t.maxY,
              x2: x,
              y2: targetMinY,
              v: gapT,
              ref: makeGapGuide({ axis: "y", x1: x, y1: targetMinY + mh, x2: x, y2: bt.minY, v: gapB }, bt, "maxY", "minY")
            }, t, "minY", "maxY")
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
  const mergeGapGuides = (gxGuide, gyGuide) => {
    if (gxGuide && gyGuide) return { ...gxGuide, refs: [gyGuide] };
    return gxGuide || gyGuide || null;
  };
  const emptySnapResult = (x, y) => ({ x: Math.round(x), y: Math.round(y), gx: null, gy: null, dg: null });
  const getDragAnchor = drag => (drag && (drag.anchor || (Array.isArray(drag.items) ? (drag.items.find(it => it.id === drag.id) || drag.items[0]) : null))) || null;
  const buildSnapOthersExcluding = excluded => st.rects
    .filter(r => {
      if (typeof canSnapRect === "function" && !canSnapRect(r)) return false;
      if (excluded instanceof Set) return !excluded.has(r.id);
      return r.id !== excluded;
    })
    .map(r => ({ r, bb: rectAABBMasked(r) }));
  const resolveOthersAndStats = (othersInput, statsInput, excluded) => {
    const others = Array.isArray(othersInput) ? othersInput : buildSnapOthersExcluding(excluded);
    return { others, othersStats: statsInput || calcOthersStats(others) };
  };
  const getSnapCfg = () => (st.snap || { grid: false, objects: true, centers: true, gaps: true });
  const findBestAxisDelta = (mb, targetBb, axis, others, d, points, targets, currentBest, mode, movingId, targetId = null) => {
    let best = currentBest || null;
    const tag = axis === "x" ? "obstacle-x" : "obstacle-y";
    for (const p of points) for (const t of targets) {
      const dd = t - p;
      const ad = Math.abs(dd);
      if (ad > d) continue;
      const moved = axis === "x" ? shiftedBox(mb, dd, 0) : shiftedBox(mb, 0, dd);
      const ex = explainSnapOnAxis(moved, targetBb, axis, others);
      if (!ex.ok) {
        if (ex.reason === "obstacle") snapDebug(tag, { mode, movingId, targetId, blockerId: ex.blockerId, dd });
        continue;
      }
      if (!best || ad < Math.abs(best.d)) best = { d: dd, g: t };
    }
    return best;
  };
  const computeSnapDeltas = (mb, mw, mh, others, d, snapCfg, othersStats, mode = "single", movingId = null, gridBaseX = mb.minX, gridBaseY = mb.minY) => {
    let bx = null;
    let by = null;
    if (snapCfg.grid) {
      const step = 10;
      bx = { d: (Math.round(gridBaseX / step) * step) - gridBaseX, g: null };
      by = { d: (Math.round(gridBaseY / step) * step) - gridBaseY, g: null };
    }
    if (snapCfg.objects || snapCfg.centers) {
      const mx = (snapCfg.objects && snapCfg.centers) ? [mb.minX, (mb.minX + mb.maxX) / 2, mb.maxX] : (snapCfg.centers ? [(mb.minX + mb.maxX) / 2] : [mb.minX, mb.maxX]);
      const my = (snapCfg.objects && snapCfg.centers) ? [mb.minY, (mb.minY + mb.maxY) / 2, mb.maxY] : (snapCfg.centers ? [(mb.minY + mb.maxY) / 2] : [mb.minY, mb.maxY]);
      for (const o of others) {
        const ox = (snapCfg.objects && snapCfg.centers) ? [o.bb.minX, (o.bb.minX + o.bb.maxX) / 2, o.bb.maxX] : (snapCfg.centers ? [(o.bb.minX + o.bb.maxX) / 2] : [o.bb.minX, o.bb.maxX]);
        const oy = (snapCfg.objects && snapCfg.centers) ? [o.bb.minY, (o.bb.minY + o.bb.maxY) / 2, o.bb.maxY] : (snapCfg.centers ? [(o.bb.minY + o.bb.maxY) / 2] : [o.bb.minY, o.bb.maxY]);
        bx = findBestAxisDelta(mb, o.bb, "x", others, d, mx, ox, bx, mode, movingId, o && o.r ? o.r.id : null);
        by = findBestAxisDelta(mb, o.bb, "y", others, d, my, oy, by, mode, movingId, o && o.r ? o.r.id : null);
      }
      if (snapCfg.centers && others.length) {
        const bbCx = othersStats ? othersStats.cx : null;
        const bbCy = othersStats ? othersStats.cy : null;
        const mcx = (mb.minX + mb.maxX) / 2;
        const mcy = (mb.minY + mb.maxY) / 2;
        if (Number.isFinite(bbCx)) {
          const ddx = bbCx - mcx;
          const adx = Math.abs(ddx);
          if (adx <= d && (!bx || adx < Math.abs(bx.d))) bx = { d: ddx, g: bbCx };
        }
        if (Number.isFinite(bbCy)) {
          const ddy = bbCy - mcy;
          const ady = Math.abs(ddy);
          if (ady <= d && (!by || ady < Math.abs(by.d))) by = { d: ddy, g: bbCy };
        }
      }
    }
    let bdx = null;
    let bdy = null;
    let bex = null;
    let bey = null;
    if (snapCfg.gaps) {
      const gapCache = {};
      bdx = findGapSnapCandidate(mb, mw, mh, others, d, "x", gapCache);
      bdy = findGapSnapCandidate(mb, mw, mh, others, d, "y", gapCache);
      bex = findEqualGapSnapCandidate(mb, mw, mh, others, d, "x", gapCache);
      bey = findEqualGapSnapCandidate(mb, mw, mh, others, d, "y", gapCache);
    }
    const gxCand = pickBestGapCandidate(bdx, bex);
    const gyCand = pickBestGapCandidate(bdy, bey);
    let dx = bx ? bx.d : 0;
    let dy = by ? by.d : 0;
    let gx = bx ? bx.g : null;
    let gy = by ? by.g : null;
    let dg = null;
    let usedX = false;
    let usedY = false;
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
    if (usedX && usedY) dg = mergeGapGuides(gxCand && gxCand.guide, gyCand && gyCand.guide);
    else if (usedX) dg = gxCand.guide;
    else if (usedY) dg = gyCand.guide;
    dg = normalizeGapGuide(dg, shiftedBox(mb, dx, dy));
    return { dx, dy, gx, gy, dg };
  };

  const snap = (x, y, id, w, h, off, othersInput = null, othersStatsInput = null) => {
    if (off) return emptySnapResult(x, y);
    const self = getRectById(id); if (!self) return emptySnapResult(x, y);
    const moving = { ...self, x, y }, mb = rectAABBMasked(moving), mw = mb.maxX - mb.minX, mh = mb.maxY - mb.minY, d = 8 / st.zoom;
    const { others, othersStats } = resolveOthersAndStats(othersInput, othersStatsInput, id);
    const snapCfg = getSnapCfg();
    const { dx, dy, gx, gy, dg } = computeSnapDeltas(mb, mw, mh, others, d, snapCfg, othersStats, "single", id, x, y);
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
    const selectedIds = new Set(items.map(it => it.id));
    const snapOthers = buildSnapOthersExcluding(selectedIds);
    const anchor = items.find(it => it.id === target.id) || items[0] || null;
    const snapStats = calcOthersStats(snapOthers);
    const startPosById = new Map(items.map(it => [Math.max(1, Math.round(Number(it.id) || 0)), { x: Number(it.rx) || 0, y: Number(it.ry) || 0 }]));
    const orthogonalByKey = new Map();
    const links = Array.isArray(st.flowLinks) ? st.flowLinks : [];
    for (const ln of links) {
      if (!Array.isArray(ln && ln.orthogonalPoints) || !ln.orthogonalPoints.length) continue;
      const fromRectId = flowEndpointRectId(ln && ln.from);
      const toRectId = flowEndpointRectId(ln && ln.to);
      if (!startPosById.has(fromRectId) && !startPosById.has(toRectId)) continue;
      const key = flowLinkDragKey(ln);
      if (!key) continue;
      orthogonalByKey.set(key, ln.orthogonalPoints.map(pt => ({ x: Number(pt && pt.x) || 0, y: Number(pt && pt.y) || 0 })));
    }
    st.drag = {
      id: target.id, sx: p.x, sy: p.y, moved: false, items, anchor,
      groupBb: { minX, minY, maxX, maxY }, selectedIds, snapOthers, snapStats,
      startPosById, orthogonalByKey
    };
  };

  const snapGroup = (nx, ny, drag, off) => {
    if (off || !drag || !Array.isArray(drag.items) || drag.items.length < 2) return emptySnapResult(nx, ny);
    const anchor = getDragAnchor(drag);
    if (!anchor) return emptySnapResult(nx, ny);
    const dx0 = nx - anchor.rx, dy0 = ny - anchor.ry, g0 = drag.groupBb || { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    const mb = { minX: g0.minX + dx0, minY: g0.minY + dy0, maxX: g0.maxX + dx0, maxY: g0.maxY + dy0 }, mw = mb.maxX - mb.minX, mh = mb.maxY - mb.minY, d = 8 / st.zoom;
    const selectedIds = drag.selectedIds instanceof Set ? drag.selectedIds : new Set(drag.items.map(it => it.id));
    const { others, othersStats } = resolveOthersAndStats(drag.snapOthers, drag.snapStats, selectedIds);
    const snapCfg = getSnapCfg();
    const { dx, dy, gx, gy, dg } = computeSnapDeltas(mb, mw, mh, others, d, snapCfg, othersStats, "group", anchor.id, nx, ny);
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
    const anchor = getDragAnchor(st.drag);
    if (!anchor) return;
    const nx = anchor.rx + (p.x - st.drag.sx), ny = anchor.ry + (p.y - st.drag.sy), sn = (st.drag.items.length > 1) ? snapGroup(nx, ny, st.drag, disableSnap) : snap(nx, ny, anchor.id, anchor.w, anchor.h, disableSnap, st.drag.snapOthers, st.drag.snapStats), dx = sn.x - anchor.rx, dy = sn.y - anchor.ry;
    for (const it of st.drag.items) {
      const rr = getRectById(it.id);
      if (!rr) continue;
      rr.x = Math.round(it.rx + dx);
      rr.y = Math.round(it.ry + dy);
    }
    // Keep orthogonal path intermediate points attached to moved endpoints.
    {
      const links = Array.isArray(st.flowLinks) ? st.flowLinks : null;
      const startPosById = st.drag && st.drag.startPosById instanceof Map ? st.drag.startPosById : null;
      const orthogonalByKey = st.drag && st.drag.orthogonalByKey instanceof Map ? st.drag.orthogonalByKey : null;
      if (links && startPosById && orthogonalByKey && orthogonalByKey.size) {
        const currentPosDelta = rectId => {
          const base = startPosById.get(rectId);
          const rr = getRectById(rectId);
          if (!base || !rr) return null;
          return {
            dx: (Number(rr.x) || 0) - (Number(base.x) || 0),
            dy: (Number(rr.y) || 0) - (Number(base.y) || 0)
          };
        };
        for (const ln of links) {
          if (!Array.isArray(ln && ln.orthogonalPoints) || !ln.orthogonalPoints.length) continue;
          const key = flowLinkDragKey(ln);
          if (!key || !orthogonalByKey.has(key)) continue;
          const original = orthogonalByKey.get(key);
          if (!Array.isArray(original) || !original.length) continue;
          const fromRectId = flowEndpointRectId(ln && ln.from);
          const toRectId = flowEndpointRectId(ln && ln.to);
          const dFrom = currentPosDelta(fromRectId);
          const dTo = currentPosDelta(toRectId);
          const eps = 0.5;
          const fromDx = Number(dFrom && dFrom.dx) || 0;
          const fromDy = Number(dFrom && dFrom.dy) || 0;
          const toDx = Number(dTo && dTo.dx) || 0;
          const toDy = Number(dTo && dTo.dy) || 0;
          const movedFrom = !!dFrom && (Math.abs(fromDx) > eps || Math.abs(fromDy) > eps);
          const movedTo = !!dTo && (Math.abs(toDx) > eps || Math.abs(toDy) > eps);
          if (!movedFrom && !movedTo) continue;
          const n = original.length;
          const midL = Math.floor((n - 1) / 2);
          const midR = Math.ceil((n - 1) / 2);
          ln.orthogonalPoints = original.map((pt, idx) => {
            let sx = 0;
            let sy = 0;
            if (idx < midL) {
              if (movedFrom) { sx = fromDx; sy = fromDy; }
            } else if (idx > midR) {
              if (movedTo) { sx = toDx; sy = toDy; }
            } else {
              // Central point(s): move only when both endpoints move.
              if (movedFrom && movedTo) {
                sx = (fromDx + toDx) * 0.5;
                sy = (fromDy + toDy) * 0.5;
              }
            }
            return {
              x: (Number(pt && pt.x) || 0) + sx,
              y: (Number(pt && pt.y) || 0) + sy
            };
          });
        }
      }
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

