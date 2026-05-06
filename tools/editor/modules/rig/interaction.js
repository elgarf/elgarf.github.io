export const setupRigInteractionController = (deps = {}) => {
  const {
    st,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    getHiddenSet,
    maskCellKey,
    normalizeRigData,
    getRectRigData,
    setRectRigData,
    worldToRectUV,
    RIG_DEFAULT_LOAD_KG
  } = deps;
  const toInt0 = v => Math.max(0, Math.round(Number(v) || 0));
  const toInt1 = v => Math.max(1, Math.round(Number(v) || 0));
  const zoomSafe = z => Math.max(0.35, Number(z) || 1);
  const scaleSafe = v => Math.max(1, Number(v) || 1);
  const toLoadKg = v => Math.max(5, Math.round(Math.max(0, Number(v) || 0) / 5) * 5);
  const loadEq = (a, b) => toInt0(a) === toInt0(b);

  const buildRigLayout = (r, cx, cy, topo, hs, z) => {
    const w = toInt1(r && r.width);
    const h = toInt1(r && r.height);
    const cols = toInt1(topo && topo.cols);
    const rows = toInt1(topo && topo.rows);
    const scalePx = Math.max(1, Number(r && r.scale) || 256);
    const hidden = hs || new Set();
    const isVisible = (ix, iy) => (ix >= 0 && ix < cols && iy >= 0 && iy < rows && !hidden.has(maskCellKey(ix, iy)));
    const seams = new Map();
    const bottomLoads = new Map();
    const anchors = new Map();
    const halfRow = toInt0(Math.floor(rows / 2));
    const seamSpansByCol = new Map();

    for (let iy = 0; iy < rows; iy++) {
      for (let c = 1; c < cols; c++) {
        if (!isVisible(c - 1, iy) || !isVisible(c, iy)) continue;
        const y0 = iy * cy;
        const y1 = Math.min(h, (iy + 1) * cy);
        const spans = seamSpansByCol.get(c) || [];
        spans.push({ y0, y1 });
        seamSpansByCol.set(c, spans);
        const key = `${c},${iy}`;
        const x = -w / 2 + c * cx;
        const yy0 = -h / 2 + y0;
        const yy1 = -h / 2 + y1;
        const yBottom = yy1;
        const seam = { key, c, row: iy, x, y0: yy0, y1: yy1, yBottom };
        if (iy >= halfRow) bottomLoads.set(key, seam);
      }
    }

    const meterCount = Math.max(1, Math.ceil(h / scalePx));
    for (let c = 1; c < cols; c++) {
      const spans = seamSpansByCol.get(c);
      if (!Array.isArray(spans) || !spans.length) continue;
      for (let m = 0; m < meterCount; m++) {
        const my0 = m * scalePx;
        const my1 = Math.min(h, (m + 1) * scalePx);
        if (my1 <= my0) continue;
        let hasOverlap = false;
        for (const sp of spans) {
          const ov = Math.min(my1, sp.y1) - Math.max(my0, sp.y0);
          if (ov > 0.5) {
            hasOverlap = true;
            break;
          }
        }
        if (!hasOverlap) continue;
        const key = `${c},${m}`;
        const x = -w / 2 + c * cx;
        const y0 = -h / 2 + my0;
        const y1 = -h / 2 + my1;
        const yBottom = y1;
        const seam = { key, c, meter: m, x, y0, y1, yBottom };
        seams.set(key, seam);
      }
    }

    for (let ix = 0; ix < cols; ix++) {
      let bestRow = null;
      for (let iy = 0; iy < rows; iy++) {
        if (!isVisible(ix, iy)) continue;
        if (iy > halfRow) continue;
        if (iy > 0 && isVisible(ix, iy - 1)) continue;
        bestRow = iy;
        break;
      }
      if (bestRow == null) continue;
      const cw = Math.min(cx, w - ix * cx);
      const x0 = -w / 2 + ix * cx;
      const x1 = x0 + cw;
      const x = x0 + cw / 2;
      const y = -h / 2 + bestRow * cy;
      anchors.set(ix, { col: ix, row: bestRow, x0, x1, x, y });
    }

    const ui = Math.max(0.6, 1 / zoomSafe(z));
    const loadSizePx = Math.max(14, 0.25 * scalePx);
    return { w, h, cols, rows, seams, bottomLoads, anchors, ui, loadSizePx, scalePx };
  };
  const getRigContext = (r, z = 1) => {
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const topo = getCellTopologyCached(r, cx, cy);
    const hs = getHiddenSet(r);
    const layout = buildRigLayout(r, cx, cy, topo, hs, z);
    return { cx, cy, topo, hs, layout };
  };

  const remapRectRigLoadsToBottomSeams = r => {
    if (!r || typeof r !== "object") return false;
    const rig = normalizeRigData(r.rig);
    const srcLoads = (rig && rig.loads && typeof rig.loads === "object") ? rig.loads : {};
    const entries = Object.entries(srcLoads);
    if (!entries.length) {
      r.rig = rig;
      return false;
    }
    const { layout } = getRigContext(r, 1);
    const seams = Array.from(layout.bottomLoads.values());
    if (!seams.length) {
      rig.loads = {};
      r.rig = rig;
      return Object.keys(srcLoads).length > 0;
    }
    let maxBottomY = -Infinity;
    for (const s of seams) maxBottomY = Math.max(maxBottomY, Number(s && s.yBottom) || -Infinity);
    const byCol = new Map();
    for (const s of seams) {
      if (!s) continue;
      const c = toInt1(s.c);
      let rec = byCol.get(c);
      if (!rec) rec = { globalBottom: null, fallback: null };
      if (!rec.fallback || (Number(s.yBottom) || -Infinity) > (Number(rec.fallback.yBottom) || -Infinity)) rec.fallback = s;
      if (Math.abs((Number(s.yBottom) || 0) - maxBottomY) <= 1e-6 && !rec.globalBottom) rec.globalBottom = s;
      byCol.set(c, rec);
    }
    const nextLoads = {};
    let changed = false;
    for (const [k, v] of entries) {
      const p = String(k || "").split(",");
      if (p.length !== 2) {
        changed = true;
        continue;
      }
      const c = toInt1(p[0]);
      const kg = toLoadKg(v);
      if (!kg) {
        changed = true;
        continue;
      }
      const rec = byCol.get(c);
      const target = (rec && (rec.globalBottom || rec.fallback)) || null;
      if (!target || !target.key) {
        changed = true;
        continue;
      }
      const targetKey = String(target.key);
      if (targetKey !== String(k)) changed = true;
      nextLoads[targetKey] = Math.max(toInt0(nextLoads[targetKey]), kg);
    }
    const prevKeys = Object.keys(srcLoads).sort().join("|");
    const nextKeys = Object.keys(nextLoads).sort().join("|");
    if (prevKeys !== nextKeys) changed = true;
    if (!changed) {
      for (const kk of Object.keys(nextLoads)) {
        if (!loadEq(nextLoads[kk], srcLoads[kk])) {
          changed = true;
          break;
        }
      }
    }
    rig.loads = nextLoads;
    r.rig = rig;
    return changed;
  };

  const resolveRigFrameSeam = (layout, cellY, key) => {
    if (!layout || !layout.seams) return null;
    const direct = layout.seams.get(String(key || ""));
    if (direct) return direct;
    const p = String(key || "").split(",");
    if (p.length !== 2) return null;
    const c = toInt1(p[0]);
    const legacyRow = toInt0(p[1]);
    const meter = toInt0(Math.floor(((legacyRow + 0.5) * scaleSafe(cellY)) / scaleSafe(layout.scalePx)));
    return layout.seams.get(`${c},${meter}`) || null;
  };

  const sanitizeRectRigFramesToBounds = r => {
    if (!r || typeof r !== "object") return false;
    const rig = normalizeRigData(r.rig);
    const src = Array.isArray(rig.frames) ? rig.frames : [];
    if (!src.length) {
      r.rig = rig;
      return false;
    }
    const { cy, layout } = getRigContext(r, 1);
    const nextSet = new Set();
    for (const key of src) {
      const seam = resolveRigFrameSeam(layout, cy, String(key || ""));
      if (seam && seam.key) nextSet.add(String(seam.key));
    }
    const next = [...nextSet].sort((a, b) => {
      const pa = a.split(",").map(Number);
      const pb = b.split(",").map(Number);
      return pa[1] - pb[1] || pa[0] - pb[0];
    });
    const prevSig = src.join("|");
    const nextSig = next.join("|");
    rig.frames = next;
    r.rig = rig;
    return prevSig !== nextSig;
  };

  const getRigHitAtPoint = (r, wx, wy, z) => {
    if (!r) return null;
    const { layout } = getRigContext(r, z);
    const rig = getRectRigData(r);
    const uv = worldToRectUV(r, wx, wy);
    const lx = (+uv.u || 0) - layout.w / 2;
    const ly = (+uv.v || 0) - layout.h / 2;
    const ui = layout.ui;
    const loadSize = layout.loadSizePx;
    const scalePx = Math.max(1, Number(r && r.scale) || 256);
    const suspendH = Math.max(10, 0.1 * scalePx);
    const ringD = Math.max(8, 0.1 * scalePx);
    if (lx < -layout.w / 2 - 40 * ui || lx > layout.w / 2 + 40 * ui || ly < -layout.h / 2 - 40 * ui || ly > layout.h / 2 + 70 * ui) return null;
    const loads = rig && rig.loads && typeof rig.loads === "object" ? rig.loads : {};
    const bodyR = loadSize * 0.32;
    const btnR = 8 * ui;
    const btnDx = bodyR + Math.max(10 * ui, loadSize * 0.22);

    for (const [key] of Object.entries(loads)) {
      const seam = layout.bottomLoads.get(String(key || ""));
      if (!seam) continue;
      const y = seam.yBottom - loadSize * 0.5;
      const x = seam.x;
      const lxBtn = x - btnDx;
      const rxBtn = x + btnDx;
      if (Math.hypot(lx - lxBtn, ly - y) <= btnR * 1.5) return { type: "loadMinus", key, rectId: r.id, x: lxBtn, y, hitX: lx, hitY: ly };
      if (Math.hypot(lx - rxBtn, ly - y) <= btnR * 1.5) return { type: "loadPlus", key, rectId: r.id, x: rxBtn, y, hitX: lx, hitY: ly };
    }

    const suspendCols = (rig && Array.isArray(rig.suspends) ? rig.suspends : []).filter(col => layout.anchors.has(col)).sort((a, b) => a - b);
    for (let i = 0; i < suspendCols.length - 1; i++) {
      const a = suspendCols[i];
      const b = suspendCols[i + 1];
      if (Math.abs(a - b) !== 1) continue;
      const ap = layout.anchors.get(a);
      const bp = layout.anchors.get(b);
      if (!ap || !bp) continue;
      const aW = Math.max(1, ap.x1 - ap.x0);
      const bW = Math.max(1, bp.x1 - bp.x0);
      const aBarR = ap.x1 - aW * 0.05;
      const bBarL = bp.x0 + bW * 0.05;
      const yTop = Math.min(ap.y, bp.y) - 2 - suspendH;
      const yMid = yTop + suspendH / 2;
      if (lx >= aBarR && lx <= bBarL && Math.abs(ly - yMid) <= Math.max(6, Math.min(16, suspendH * 0.7))) return { type: "suspendLink", a, b, key: `${Math.min(a, b)}-${Math.max(a, b)}`, rectId: r.id, x: (aBarR + bBarL) / 2, y: yMid, hitX: lx, hitY: ly };
    }

    for (const [col, a] of layout.anchors) {
      const cw = Math.max(1, a.x1 - a.x0);
      const barL = a.x0 + cw * 0.05;
      const barR = a.x1 - cw * 0.05;
      const barTop = a.y - 2 - suspendH;
      const barBottom = barTop + suspendH;
      const ringCx = a.x;
      const ringCy = barTop - ringD * 0.5;
      if (lx >= barL && lx <= barR && ly >= barTop && ly <= barBottom) return { type: "suspend", col, key: String(col), rectId: r.id, x: ringCx, y: ringCy, hitX: lx, hitY: ly };
      if (Math.hypot(lx - ringCx, ly - ringCy) <= ringD * 0.65) return { type: "suspend", col, key: String(col), rectId: r.id, x: ringCx, y: ringCy, hitX: lx, hitY: ly };
      if (ly >= barTop - ringD * 1.3 && ly <= barBottom + Math.max(6, 0.03 * scalePx) && lx >= barL - 6 && lx <= barR + 6) return { type: "suspend", col, key: String(col), rectId: r.id, x: ringCx, y: ringCy, hitX: lx, hitY: ly };
    }

    let maxBottomY = -Infinity;
    for (const seam of layout.bottomLoads.values()) if (seam.yBottom > maxBottomY) maxBottomY = seam.yBottom;
    for (const seam of layout.bottomLoads.values()) {
      if (Math.abs(seam.yBottom - maxBottomY) > 1e-6) continue;
      const hCab = Math.max(1, seam.y1 - seam.y0);
      const yThirdTop = seam.y0 + (hCab * 2 / 3);
      const tx = Math.max(10 * ui, loadSize * 0.22);
      const tolY = Math.max(2, 2.5 * ui);
      const y = seam.yBottom - loadSize * 0.5;
      if (Math.abs(lx - seam.x) <= tx && ly >= yThirdTop - tolY && ly <= seam.y1 + tolY) return { type: "loadToggle", key: seam.key, rectId: r.id, x: seam.x, y, hitX: lx, hitY: ly };
    }

    for (const seam of layout.seams.values()) {
      const tol = 5 * ui;
      if (Math.abs(seam.yBottom - maxBottomY) <= 1e-6) {
        const hCab = Math.max(1, seam.y1 - seam.y0);
        const yThirdTop = seam.y0 + (hCab * 2 / 3);
        if (ly >= yThirdTop - tol && ly <= seam.y1 + tol) continue;
      }
      if (Math.abs(lx - seam.x) <= tol && ly >= seam.y0 - tol && ly <= seam.y1 + tol) return { type: "frame", key: seam.key, rectId: r.id, x: seam.x, y: (seam.y0 + seam.y1) / 2, hitX: lx, hitY: ly };
    }

    return null;
  };

  const applyRigActionAtPoint = (r, wx, wy) => {
    const hit = getRigHitAtPoint(r, wx, wy, st.zoom);
    st.rigHover = hit;
    if (!hit) return false;
    const rig = getRectRigData(r);
    const frames = new Set(Array.isArray(rig.frames) ? rig.frames : []);
    const suspends = new Set(Array.isArray(rig.suspends) ? rig.suspends : []);
    const links = new Set(Array.isArray(rig.suspendLinks) ? rig.suspendLinks : []);
    const loads = { ...(rig.loads && typeof rig.loads === "object" ? rig.loads : {}) };
    const { cy, layout } = getRigContext(r, st.zoom);
    let changed = false;

    if (hit.type === "frame") {
      const targetSeam = resolveRigFrameSeam(layout, cy, String(hit.key || ""));
      if (!targetSeam) return false;
      const mappedKeys = [];
      for (const fk of frames) {
        const sm = resolveRigFrameSeam(layout, cy, String(fk || ""));
        if (sm && sm.key === targetSeam.key) mappedKeys.push(String(fk || ""));
      }
      const hasFrame = mappedKeys.length > 0 || frames.has(targetSeam.key);
      for (const k of mappedKeys) frames.delete(k);
      frames.delete(targetSeam.key);
      if (!hasFrame) frames.add(targetSeam.key);
      changed = true;
    } else if (hit.type === "loadToggle") {
      if (loads[hit.key]) delete loads[hit.key];
      else loads[hit.key] = RIG_DEFAULT_LOAD_KG;
      changed = true;
    } else if (hit.type === "loadPlus") {
      const cur = toInt0(loads[hit.key]);
      loads[hit.key] = toLoadKg(cur + 5);
      changed = true;
    } else if (hit.type === "loadMinus") {
      const cur = toInt0(loads[hit.key]) - 5;
      if (cur <= 0) delete loads[hit.key];
      else loads[hit.key] = toLoadKg(cur);
      changed = true;
    } else if (hit.type === "suspend") {
      const c = toInt0(hit.col);
      if (suspends.has(c)) {
        suspends.delete(c);
        for (const lk of links) {
          const p = String(lk || "").split("-").map(v => toInt0(v));
          if (p.length !== 2) continue;
          if (p[0] === c || p[1] === c) links.delete(lk);
        }
      } else {
        suspends.add(c);
      }
      changed = true;
    } else if (hit.type === "suspendLink") {
      const a = Math.min(hit.a, hit.b);
      const b = Math.max(hit.a, hit.b);
      const k = `${a}-${b}`;
      suspends.add(a);
      suspends.add(b);
      if (links.has(k)) links.delete(k);
      else links.add(k);
      changed = true;
    }

    if (!changed) return false;
    rig.frames = [...frames];
    rig.loads = loads;
    rig.suspends = [...suspends];
    rig.suspendLinks = [...links];
    setRectRigData(r);
    return true;
  };

  return {
    buildRigLayout,
    remapRectRigLoadsToBottomSeams,
    resolveRigFrameSeam,
    sanitizeRectRigFramesToBounds,
    getRigHitAtPoint,
    applyRigActionAtPoint
  };
};
