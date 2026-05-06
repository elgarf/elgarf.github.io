import { setupExportPackageController } from "../export-package-controller.js";
import { buildFlowLinksSpecText, fmtOne, fmtMeters, addCountToMap } from "../spec/build-flow-links-section.js";
import { buildSagBezierControls, estimateBezierLength } from "../flow/bezier-utils.js";
import { buildVisibleComponentStats } from "../calc/visible-cabinet-stats.js";

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
    schedulePersist,
    persistNow,
    flushSpecCustomEditors,
    showMessageModal,
    t = value => value
  } = deps;
  const rectFlowContextCache = new Map();
  const rectFlowContextKey = r => [
    Math.max(1, Math.round(Number(r && r.id) || 0)),
    Math.round(Number(r && r.width) || 0),
    Math.round(Number(r && r.height) || 0),
    Math.round(Number(r && r.scale) || 0),
    Math.round(Number(r && r.areaM2Px) || 0),
    Math.round(Number(r && r.cellX) || 0),
    Math.round(Number(r && r.cellY) || 0),
    String(r && r.dataFlow || ""),
    Math.round(Number(r && r.splitVariant) || 0),
    Array.isArray(r && r.hiddenCells) ? r.hiddenCells.length : 0,
    Array.isArray(r && r.cellLinks) ? r.cellLinks.length : 0,
    Array.isArray(r && r.manualClusters) ? r.manualClusters.length : 0
  ].join("|");
  const getRectFlowContext = (r, options = {}) => {
    const key = rectFlowContextKey(r);
    const cachedOnly = !!(options && options.cachedOnly);
    const cacheKey = cachedOnly ? `${key}|cached` : key;
    const cached = rectFlowContextCache.get(cacheKey);
    if (cached) return cached;
    const cellX = drawCellX(r);
    const cellY = drawCellY(r);
    const topo = getCellTopologyCached(r, cellX, cellY);
    const hs = getHiddenSet(r);
    let regions = null;
    let flowGroups = [];
    if (cachedOnly) {
      const calcCache = getRectCalcCache(r);
      regions = (calcCache && calcCache.regions && !calcCache.regions.pending) ? calcCache.regions.value : null;
      flowGroups = (calcCache && calcCache.flow && !calcCache.flow.pending && Array.isArray(calcCache.flow.value)) ? calcCache.flow.value : [];
    } else {
      regions = planNumberRegions(r, cellX, cellY, topo, hs);
      flowGroups = getDataFlowGroups(r, cellX, cellY, topo, hs, regions);
    }
    const value = { cellX, cellY, topo, hs, regions, flowGroups };
    if (rectFlowContextCache.size > 512) rectFlowContextCache.clear();
    rectFlowContextCache.set(cacheKey, value);
    return value;
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

  const estimateInterScreenCableLenPx = (a, b) => {
    if (!a || !b) return 0;
    const p0 = { x: +a.x || 0, y: +a.y || 0 };
    const p3 = { x: +b.x || 0, y: +b.y || 0 };
    const { c1, c2 } = buildSagBezierControls(p0, p3);
    return estimateBezierLength(p0, c1, c2, p3, 24);
  };

  const buildInterScreenSpecData = (options = {}) => {
    const anchorByKey = new Map();
    const rectById = new Map();
    const specRects = st.rects.filter(r => !isNoteRect(r));
    for (const r of specRects) rectById.set(Math.max(1, Math.round(Number(r && r.id) || 0)), r);
    for (const r of specRects) {
      if (normalizeDataFlow(r && r.dataFlow) === "none") continue;
      const { flowGroups } = getRectFlowContext(r, { cachedOnly: !!(options && options.cachedOnly) });
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

  const buildRectSpecData = (r, options = {}) => {
    const { cellX, cellY, topo, hs, flowGroups } = getRectFlowContext(r, { cachedOnly: !!(options && options.cachedOnly) });
    const visibleStats = buildVisibleComponentStats(r, cellX, cellY, topo, hs, maskCellKey);
    const colPref = visibleStats ? visibleStats.colPref : [0];
    const rowPref = visibleStats ? visibleStats.rowPref : [0];
    const comp = visibleStats ? visibleStats.compStats : new Map();
    const visibleAreaPx = visibleStats ? visibleStats.visibleAreaPx : 0;
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

  const buildFlowSpecText = (options = {}) => buildFlowLinksSpecText({
    projectName: String(st.projectName || "Проект"),
    viewerUrl: (() => {
      try {
        const url = new URL((globalThis.location && globalThis.location.href) || "");
        const viewer = new URL("./LedMaskViewer.html", url);
        const p = new URLSearchParams(url.search || "");
        const idParam = p.get("id") || p.get("projectId");
        if (idParam) viewer.searchParams.set("id", idParam);
        if (p.get("project")) viewer.searchParams.set("project", p.get("project"));
        viewer.searchParams.delete("projectId");
        if (p.get("viewer") === "1") viewer.searchParams.delete("viewer");
        return viewer.toString();
      } catch {
        return "";
      }
    })(),
    rects: st.rects,
    isNoteRect,
    buildInterScreenSpecData: () => buildInterScreenSpecData({ cachedOnly: !!(options && options.cachedOnly) }),
    parseScreenNameGroup,
    buildRectSpecData: r => buildRectSpecData(r, { cachedOnly: !!(options && options.cachedOnly) }),
    buildRectRigSpecData,
    fmtMeters,
    specCustomSections: st.specCustomSections,
    specCustomText: st.specCustomText,
    includeManual: !!(options && options.includeManual),
    t
  });

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const waitForCacheReady = async (r, kind, timeoutMs = 45000) => {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const cache = getRectCalcCache(r);
      const entry = cache && cache[kind];
      if (!entry || !entry.pending) return entry || null;
      await delay(60);
    }
    return (getRectCalcCache(r) || {})[kind] || null;
  };
  const hasReadyRegionsCache = r => {
    const cache = getRectCalcCache(r);
    return !!(cache && cache.regions && !cache.regions.pending && cache.regions.value);
  };
  const hasReadyFlowCache = r => {
    if (normalizeDataFlow(r && r.dataFlow) === "none") return true;
    const cache = getRectCalcCache(r);
    return !!(cache && cache.flow && !cache.flow.pending && Array.isArray(cache.flow.value));
  };
  const ensureExportCaches = async () => {
    let changed = false;
    rectFlowContextCache.clear();
    for (const r of st.rects || []) {
      if (!r || isNoteRect(r)) continue;
      const needsRegions = !hasReadyRegionsCache(r);
      const needsFlow = !hasReadyFlowCache(r);
      if (!needsRegions && !needsFlow) continue;
      changed = true;
      const cellX = drawCellX(r);
      const cellY = drawCellY(r);
      const topo = getCellTopologyCached(r, cellX, cellY);
      const hs = getHiddenSet(r);
      let regions = planNumberRegions(r, cellX, cellY, topo, hs);
      if (needsRegions) {
        const entry = await waitForCacheReady(r, "regions");
        if (entry && entry.value) regions = entry.value;
      }
      if (normalizeDataFlow(r && r.dataFlow) !== "none") {
        getDataFlowGroups(r, cellX, cellY, topo, hs, regions);
        await waitForCacheReady(r, "flow");
      }
    }
    rectFlowContextCache.clear();
    if (changed) {
      if (typeof schedulePersist === "function") schedulePersist("project");
      if (typeof persistNow === "function") persistNow();
    }
  };

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
    buildFlowSpecText: () => {
      if (typeof flushSpecCustomEditors === "function") flushSpecCustomEditors();
      return buildFlowSpecText({ includeManual: true, cachedOnly: true });
    },
    ensureExportCaches,
    showMessageModal,
    t
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

