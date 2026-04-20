import { setupExportPackageController } from "../export-package-controller.js";
import { buildFlowLinksSpecText, fmtOne, fmtMeters, addCountToMap } from "../spec/build-flow-links-section.js";

export const setupSpecExportFeature = (deps = {}) => {
  const {
    st,
    el,
    bindClick,
    isNoteRect,
    getRectRigData,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    getHiddenSet,
    buildRigLayout,
    resolveRigFrameSeam,
    RIG_DEFAULT_LOAD_KG,
    parseScreenNameGroup,
    flowAnchorKey,
    normalizeFlowLinks,
    normalizeDataFlow,
    rectUVToWorld,
    planNumberRegions,
    getDataFlowGroups,
    maskCellKey,
    ensureFontReady,
    rectAABBMasked,
    drawRect,
    drawInterScreenFlowLinks,
    getRectCalcCache,
    embedProjectIntoPngBlob,
    buildProject,
    PNG_PROJECT_META_KEY,
    projectFileBase,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    saveStatus,
    saveBlobWithSystemDialog,
    showMessageModal
  } = deps;
  const getRectFlowContext = r => {
    const cellX = drawCellX(r);
    const cellY = drawCellY(r);
    const topo = getCellTopologyCached(r, cellX, cellY);
    const hs = getHiddenSet(r);
    const regions = planNumberRegions(r, cellX, cellY, topo, hs);
    const flowGroups = getDataFlowGroups(r, cellX, cellY, topo, hs, regions);
    return { cellX, cellY, topo, hs, regions, flowGroups };
  };
  const bumpMap = (map, key, delta = 1) => {
    map.set(key, (map.get(key) || 0) + delta);
  };

  const buildRectRigSpecData = r => {
    const rig = getRectRigData(r) || {};
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const topo = getCellTopologyCached(r, cx, cy);
    const hs = getHiddenSet(r);
    const layout = buildRigLayout(r, cx, cy, topo, hs, 1.0);
    const scalePx = Math.max(1, Number(r && r.scale) || 256);
    const pxToM = px => px / scalePx;

    const supportBySize = new Map();
    let frameCount = 0;
    let bottomRowFrameCount = 0;
    const bottomLoadByKg = new Map();

    const suspends = (Array.isArray(rig.suspends) ? rig.suspends : [])
      .filter(col => layout.anchors.has(col))
      .sort((a, b) => a - b);
    const suspendSet = new Set(suspends);
    const links = new Set(Array.isArray(rig.suspendLinks) ? rig.suspendLinks : []);
    const frames = new Set(Array.isArray(rig.frames) ? rig.frames : []);
    const loads = (rig && rig.loads && typeof rig.loads === "object") ? rig.loads : {};

    if (suspends.length) {
      const visited = new Set();
      for (const col of suspends) {
        if (visited.has(col)) continue;
        let start = col;
        let end = col;
        visited.add(col);
        while (links.has(`${end}-${end + 1}`) && suspendSet.has(end + 1)) {
          end += 1;
          visited.add(end);
        }
        let widthPx = 0;
        for (let i = start; i <= end; i++) {
          const a = layout.anchors.get(i);
          if (!a) continue;
          widthPx += Math.max(1, a.x1 - a.x0);
        }
        const sizeM = Math.round(pxToM(widthPx) * 100) / 100;
        addCountToMap(supportBySize, sizeM, 1);
      }
    }

    const frameRows = [];
    const uniqFrameSeams = new Set();
    for (const key of frames) {
      const seam = resolveRigFrameSeam(layout, cy, String(key || ""));
      if (!seam) continue;
      if (uniqFrameSeams.has(seam.key)) continue;
      uniqFrameSeams.add(seam.key);
      frameCount += 1;
      frameRows.push({ meters: 1, y1: seam.y1 });
    }

    if (frameRows.length) {
      const maxY = Math.max(...frameRows.map(x => x.y1));
      const EPS = 0.5;
      bottomRowFrameCount = frameRows
        .filter(x => Math.abs(x.y1 - maxY) <= EPS)
        .reduce((sum, x) => sum + x.meters, 0);
    }

    for (const val of Object.values(loads)) {
      const kg = Math.max(5, Math.round(Number(val) || RIG_DEFAULT_LOAD_KG));
      addCountToMap(bottomLoadByKg, kg, 1);
    }

    return {
      supportBySize,
      frameCount,
      bottomRowFrameCount,
      bottomLoadByKg
    };
  };

  const sampleBezier = (p0, p1, p2, p3, t) => {
    const u = 1 - t;
    return {
      x: (u * u * u) * p0.x + 3 * (u * u) * t * p1.x + 3 * u * (t * t) * p2.x + (t * t * t) * p3.x,
      y: (u * u * u) * p0.y + 3 * (u * u) * t * p1.y + 3 * u * (t * t) * p2.y + (t * t * t) * p3.y
    };
  };
  const estimateInterScreenCableLenPx = (a, b) => {
    if (!a || !b) return 0;
    const dx = (+b.x || 0) - (+a.x || 0);
    const dy = (+b.y || 0) - (+a.y || 0);
    const len = Math.max(20, Math.hypot(dx, dy));
    const sag = Math.max(8, Math.min(120, len * 0.18));
    const c1 = { x: (+a.x || 0) + dx * 0.25, y: (+a.y || 0) + dy * 0.25 + sag };
    const c2 = { x: (+a.x || 0) + dx * 0.75, y: (+a.y || 0) + dy * 0.75 + sag };
    let total = 0;
    let prev = { x: +a.x || 0, y: +a.y || 0 };
    for (let i = 1; i <= 24; i++) {
      const p = sampleBezier({ x: +a.x || 0, y: +a.y || 0 }, c1, c2, { x: +b.x || 0, y: +b.y || 0 }, i / 24);
      total += Math.hypot((+p.x || 0) - (+prev.x || 0), (+p.y || 0) - (+prev.y || 0));
      prev = p;
    }
    return total;
  };

  const buildInterScreenSpecData = () => {
    const anchorByKey = new Map();
    const rectById = new Map();
    const specRects = st.rects.filter(r => !isNoteRect(r));
    for (const r of specRects) rectById.set(Math.max(1, Math.round(Number(r && r.id) || 0)), r);
    for (const r of specRects) {
      if (normalizeDataFlow(r && r.dataFlow) === "none") continue;
      const { flowGroups } = getRectFlowContext(r);
      for (const g of flowGroups || []) {
        const rid = Math.max(0, Math.round(Number(g && g.rid) || 0));
        const pts = Array.isArray(g && g.points) ? g.points : [];
        if (!pts.length) continue;
        const s = pts[0], e = pts[pts.length - 1];
        const su = +s.u || 0, sv = +s.v || 0, eu = +e.u || 0, ev = +e.v || 0;
        const scid = Math.max(0, Math.round(Number(s && s.cid) || 0));
        const ecid = Math.max(0, Math.round(Number(e && e.cid) || 0));
        const sw = rectUVToWorld(r, su, sv);
        const ew = rectUVToWorld(r, eu, ev);
        const sa = { rectId: r.id, rid, cid: scid, kind: "start", x: sw.x, y: sw.y, scale: Math.max(1, Number(r && r.scale) || 256) };
        const ea = { rectId: r.id, rid, cid: ecid, kind: "end", x: ew.x, y: ew.y, scale: Math.max(1, Number(r && r.scale) || 256) };
        anchorByKey.set(flowAnchorKey(sa), sa);
        anchorByKey.set(flowAnchorKey(ea), ea);
      }
    }
    const byRectOut = new Map();
    const byGroupOut = new Map();
    const links = normalizeFlowLinks(st.flowLinks);
    for (const ln of links) {
      const from = anchorByKey.get(flowAnchorKey(ln.from));
      const to = anchorByKey.get(flowAnchorKey(ln.to));
      if (!from || !to) continue;
      const fromRect = rectById.get(Math.max(1, Math.round(Number(from.rectId) || 0)));
      const toRect = rectById.get(Math.max(1, Math.round(Number(to.rectId) || 0)));
      if (!fromRect || !toRect) continue;
      const fromMeta = parseScreenNameGroup(fromRect);
      const toMeta = parseScreenNameGroup(toRect);
      const lenPx = estimateInterScreenCableLenPx(from, to);
      if (!(lenPx > 0)) continue;
      const mPerPx = (1 / Math.max(1, Number(from.scale) || 256) + 1 / Math.max(1, Number(to.scale) || 256)) / 2;
      const lenM = lenPx * mPerPx * 1.3;
      const lenKey = `${fmtOne(lenM)}м`;
      let rectRec = byRectOut.get(fromRect.id);
      if (!rectRec) {
        rectRec = { cableByLen: new Map(), targets: new Map() };
        byRectOut.set(fromRect.id, rectRec);
      }
      bumpMap(rectRec.cableByLen, lenKey, 1);
      const targetLabel = `${toMeta.name}${toMeta.group && toMeta.group !== "Общая" ? ` @${toMeta.group}` : ""}`;
      bumpMap(rectRec.targets, targetLabel, 1);

      let grpRec = byGroupOut.get(fromMeta.group);
      if (!grpRec) {
        grpRec = { cableByLen: new Map(), routes: new Map() };
        byGroupOut.set(fromMeta.group, grpRec);
      }
      bumpMap(grpRec.cableByLen, lenKey, 1);
      const routeLabel = `${fromMeta.group} → ${toMeta.group}`;
      bumpMap(grpRec.routes, routeLabel, 1);
    }
    return { byRectOut, byGroupOut };
  };

  const buildRectSpecData = r => {
    const { cellX, cellY, topo, hs, flowGroups } = getRectFlowContext(r);
    const cols = Math.max(1, topo && topo.cols || 1);
    const rows = Math.max(1, topo && topo.rows || 1);
    const colW = [];
    for (let x = 0; x < r.width; x += cellX) colW.push(Math.min(cellX, r.width - x));
    const rowH = [];
    for (let y = 0; y < r.height; y += cellY) rowH.push(Math.min(cellY, r.height - y));
    const colPref = [0];
    for (let i = 0; i < colW.length; i++) colPref.push(colPref[i] + colW[i]);
    const rowPref = [0];
    for (let i = 0; i < rowH.length; i++) rowPref.push(rowPref[i] + rowH[i]);
    const comp = new Map();
    let visibleAreaPx = 0;
    for (let iy = 0; iy < rows; iy++) for (let ix = 0; ix < cols; ix++) {
      if (hs && hs.has(maskCellKey(ix, iy))) continue;
      visibleAreaPx += Math.max(0, (colW[ix] || 0) * (rowH[iy] || 0));
      const idx = iy * cols + ix;
      const cid = ((topo && Array.isArray(topo.comp) ? topo.comp[idx] : 0) | 0);
      let it = comp.get(cid);
      if (!it) {
        it = { c0: ix, c1: ix + 1, r0: iy, r1: iy + 1, cells: 1 };
        comp.set(cid, it);
        continue;
      }
      if (ix < it.c0) it.c0 = ix;
      if (ix + 1 > it.c1) it.c1 = ix + 1;
      if (iy < it.r0) it.r0 = iy;
      if (iy + 1 > it.r1) it.r1 = iy + 1;
      it.cells++;
    }
    const cabinetBySize = new Map();
    for (const it of comp.values()) {
      const wPx = Math.max(1, Math.round((colPref[it.c1] || 0) - (colPref[it.c0] || 0)));
      const hPx = Math.max(1, Math.round((rowPref[it.r1] || 0) - (rowPref[it.r0] || 0)));
      const wM = fmtMeters(wPx / Math.max(1, +r.scale || 256));
      const hM = fmtMeters(hPx / Math.max(1, +r.scale || 256));
      const k = `${wM} x ${hM}`;
      cabinetBySize.set(k, (cabinetBySize.get(k) || 0) + 1);
    }
    const cableByLen = new Map();
    for (const g of flowGroups || []) {
      const pts = Array.isArray(g && g.points) ? g.points : [];
      for (let i = 1; i < pts.length; i++) {
        const p0 = pts[i - 1], p1 = pts[i];
        const dx = (+p1.u || 0) - (+p0.u || 0);
        const dy = (+p1.v || 0) - (+p0.v || 0);
        const lenPx = Math.hypot(dx, dy);
        if (!(lenPx > 0)) continue;
        const lenM = (lenPx / Math.max(1, +r.scale || 256)) * 1.3;
        const k = `${fmtOne(lenM)}м`;
        cableByLen.set(k, (cableByLen.get(k) || 0) + 1);
      }
    }
    const scale = Math.max(1, +r.scale || 256);
    const visibleAreaM2 = visibleAreaPx / (scale * scale);
    return { cabinetBySize, cableByLen, visibleAreaM2 };
  };

  const buildFlowSpecText = () => buildFlowLinksSpecText({
    rects: st.rects,
    isNoteRect,
    buildInterScreenSpecData,
    parseScreenNameGroup,
    buildRectSpecData,
    buildRectRigSpecData,
    fmtMeters
  });

  const { exportPackage } = setupExportPackageController({
    st,
    ensureFontReady,
    rectAABBMasked,
    getRectRigData,
    normalizeDataFlow,
    drawRect,
    drawInterScreenFlowLinks,
    getRectCalcCache,
    embedProjectIntoPngBlob,
    buildProject,
    PNG_PROJECT_META_KEY,
    projectFileBase,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    saveStatus,
    saveBlobWithSystemDialog,
    buildFlowSpecText,
    showMessageModal
  });

  const bindExportHandlers = () => {
    bindClick(el.exp, async () => { await exportPackage(); });
  };

  return {
    exportPackage,
    bindExportHandlers,
    buildFlowSpecText
  };
};
