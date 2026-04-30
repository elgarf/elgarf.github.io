export const setupPropsPanelFeature = (deps = {}) => {
  const {
    st,
    el,
    cur,
    isRectLocked,
    getSelectedRects,
    uiSetDisabled,
    uiSetValue,
    uiSetChecked,
    uiSetText,
    updateThemeUi,
    updateViewModeUi,
    updateLockAllUi,
    mFmt,
    updateSplitVariantModeUi,
    updateModeBadges,
    updateRectTextSizeLabel,
    autoContrast,
    SPLIT_VARIANT_MAX,
    normalizeCabinetUnit,
    metricFromPx,
    normalizeDataFlow,
    getFlowRegionConfig,
    resolveFlowModeFromStartAndDir,
    getFlowModeRegion,
    updateSplitVariantControl,
    cabinetPxToUi,
    getRectsBBox,
    evalExpr,
    parseAreaM2PxInput,
    pxFromMetric,
    refreshMultiSelectionBase,
    rectAABB,
    cabinetUiToPx,
    setFlowRegionMode,
    remapRectRigLoadsToBottomSeams,
    invalidateRectCache,
    listRects,
    schedulePersist,
    render,
    createRectPropSchema,
    getAreaM2BadgeLabel,
    getAreaM2PresetValues,
    updateAreaM2Badge,
    isShapeRect,
    rectUVToWorld,
    worldToRectUV,
    normalizeShapeBounds
  } = deps;

  const rectPropSchema = createRectPropSchema({
    evalExpr,
    parseAreaM2PxInput,
    cabinetUiToPx,
    normalizeDataFlow
  });
  const selectionKey = () => {
    const ids = getSelectedRects().map(r => Math.max(0, Math.round(Number(r && r.id) || 0))).sort((a, b) => a - b);
    return ids.length ? ids.join(",") : String(cur() && cur().id || "");
  };
  const splitNameGroup = name => {
    const raw = String(name || "").trim();
    const at = raw.indexOf("@");
    const groupName = at >= 0 ? raw.slice(at + 1).split("@")[0].trim() : "";
    return {
      stem: (at >= 0 ? raw.slice(0, at) : raw).trim(),
      group: groupName ? `@${groupName}` : ""
    };
  };
  const normalizeNumberedBaseInput = value => {
    const parts = splitNameGroup(value);
    const m = parts.stem.match(/^(.*?)\s+\d+$/);
    return String(m ? m[1] : parts.stem).trim();
  };
  const parseNumberedBaseInput = value => {
    const parts = splitNameGroup(value);
    const m = parts.stem.match(/^(.*?)\s+(\d+)$/);
    return {
      base: String(m ? m[1] : parts.stem).trim(),
      startNumber: m ? Math.max(1, Math.round(Number(m[2]) || 1)) : null,
      group: parts.group || ""
    };
  };
  const parseNumberedName = name => {
    const parts = splitNameGroup(name);
    const m = parts.stem.match(/^(.*?)\s+(\d+)$/);
    if (!m) return null;
    const base = String(m[1] || "").trim();
    if (!base) return null;
    return { base, number: Math.max(1, Math.round(Number(m[2]) || 1)), group: parts.group };
  };
  const multiNumberedBase = rects => {
    if (!Array.isArray(rects) || !rects.length) return "";
    let base = null;
    let group = null;
    for (const r of rects) {
      const parsed = parseNumberedName(r && r.name);
      if (!parsed) return "";
      if (base == null) base = parsed.base;
      else if (base !== parsed.base) return "";
      if (group == null) group = parsed.group || "";
      else if (group !== (parsed.group || "")) group = "";
    }
    return `${base || ""}${group || ""}`.trim();
  };
  const multiNumberedStart = rects => {
    if (!Array.isArray(rects) || !rects.length) return null;
    const items = rects
      .map(r => ({ r, parsed: parseNumberedName(r && r.name) }))
      .filter(it => it.parsed)
      .sort((a, b) => (Number(a.r && a.r.x) || 0) - (Number(b.r && b.r.x) || 0) || (Number(a.r && a.r.y) || 0) - (Number(b.r && b.r.y) || 0) || (Number(a.r && a.r.id) || 0) - (Number(b.r && b.r.id) || 0));
    if (items.length !== rects.length) return null;
    return items[0].parsed.number;
  };
  const numberedNameFor = (base, index, prevName, groupOverride = null) => {
    const parts = splitNameGroup(prevName);
    const group = groupOverride != null ? groupOverride : parts.group;
    return `${String(base || "").trim()} ${index}${group || ""}`.trim();
  };
  const axisCompactSpan = (items, axis) => {
    const EPS = 1e-6;
    const entries = items.map(it => ({
      min: axis === "x" ? it.minX : it.minY,
      max: axis === "x" ? it.maxX : it.maxY
    })).sort((a, b) => (a.min - b.min) || (a.max - b.max));
    const clusters = [];
    for (const e of entries) {
      const last = clusters[clusters.length - 1];
      if (!last || e.min > last.max + EPS) clusters.push({ min: e.min, max: e.max });
      else last.max = Math.max(last.max, e.max);
    }
    return Math.max(1, clusters.reduce((sum, c) => sum + Math.max(0, c.max - c.min), 0));
  };
  const syncPropsBySchema = (rect, unit) => {
    for (const f of rectPropSchema) {
      if (!f || typeof f.sync !== "function") continue;
      f.sync({ el, rect, unit, mFmt, cabinetPxToUi });
    }
  };
  const applyPropsBySchema = (rect, multi, unit) => {
    for (const f of rectPropSchema) {
      if (!f || typeof f.apply !== "function") continue;
      f.apply({ el, rect, multi, unit, evalExpr, parseAreaM2PxInput, cabinetUiToPx, normalizeDataFlow });
    }
  };
  const getAreaM2BadgeEl = () => el.propAreaM2Badge || (typeof document !== "undefined" ? document.getElementById("propAreaM2Badge") : null);
  const getSelectedShapePoint = r => {
    if (!r || typeof isShapeRect !== "function" || !isShapeRect(r)) return null;
    const sel = st && st.shapePointSel;
    if (!sel || Math.round(Number(sel.id) || 0) !== Math.round(Number(r.id) || 0)) return null;
    const points = Array.isArray(r.shapePoints) ? r.shapePoints : [];
    const index = Math.round(Number(sel.index) || 0);
    if (index < 0 || index >= points.length) return null;
    return { index, point: points[index] };
  };
  const syncShapePointPanel = r => {
    const selected = getSelectedShapePoint(r);
    const show = !!selected;
    if (el.shapePointPanel) el.shapePointPanel.classList.toggle("d-none", !show);
    if (el.shapePointX) uiSetDisabled(el.shapePointX, !show || isRectLocked(r));
    if (el.shapePointY) uiSetDisabled(el.shapePointY, !show || isRectLocked(r));
    if (!show) {
      uiSetValue(el.shapePointX, "");
      uiSetValue(el.shapePointY, "");
      return;
    }
    const wp = typeof rectUVToWorld === "function"
      ? rectUVToWorld(r, Number(selected.point.x) || 0, Number(selected.point.y) || 0)
      : { x: (Number(r.x) || 0) + (Number(selected.point.x) || 0), y: (Number(r.y) || 0) + (Number(selected.point.y) || 0) };
    uiSetValue(el.shapePointX, Math.round(Number(wp.x) || 0));
    uiSetValue(el.shapePointY, Math.round(Number(wp.y) || 0));
  };
  const setPanelHidden = (node, hidden) => {
    if (!node || !node.classList) return;
    node.classList.toggle("d-none", !!hidden);
  };
  const shapeOpacityValue = r => {
    const n = Number(r && r.shapeOpacity);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.72;
  };
  const shapeTransparencyPercent = r => Math.round((1 - shapeOpacityValue(r)) * 100);
  const shapeOpacityFromTransparencyInput = (inputValue, fallbackRect) => {
    const fallback = shapeTransparencyPercent(fallbackRect);
    const transparency = Math.max(0, Math.min(100, evalExpr(inputValue, fallback)));
    return Math.max(0, Math.min(1, 1 - transparency / 100));
  };
  const syncDynamicPanelVisibility = (r, multi) => {
    const hasSelection = !!r;
    const isShape = !!(hasSelection && typeof isShapeRect === "function" && isShapeRect(r));
    const isNote = !!(hasSelection && typeof deps.isNoteRect === "function" && deps.isNoteRect(r));
    const isScreen = !!(hasSelection && !isShape && !isNote);
    const isObject = !!(hasSelection || multi);
    setPanelHidden(el.emptySelectionHint, isObject);
    setPanelHidden(el.objectNameField, !isObject);
    setPanelHidden(el.rectTextSizeField, !(isScreen || isNote));
    setPanelHidden(el.quickGeoPanel, !isObject);
    setPanelHidden(el.areaM2Field, !isScreen);
    setPanelHidden(el.colorPanel, !isObject);
    setPanelHidden(el.shapeOpacityField, !isShape);
    setPanelHidden(el.autoContrastField, !isScreen);
    setPanelHidden(el.randomColorField, !isObject);
    setPanelHidden(el.cabinetSizePanel, !isScreen);
    setPanelHidden(el.flowField, !isScreen);
    setPanelHidden(el.numberCellsField, !isScreen);
    setPanelHidden(el.splitVariantField, !isScreen);
    setPanelHidden(el.screenActionsField, !isScreen);
    setPanelHidden(el.convertRegionsField, !isScreen);
    setPanelHidden(el.list, false);
    if (!isShape) setPanelHidden(el.shapePointPanel, true);
  };

  const syncProps = () => {
    const r = cur(), locked = !!(r && isRectLocked(r)), on = !!r && !locked, multi = getSelectedRects().length > 1;
    syncDynamicPanelVisibility(r, multi);
    [el.name, el.rectTextSize, el.x, el.y, el.rot, el.wm, el.hm, el.a, el.b, el.shapeOpacity, el.cx, el.cy, el.cUnit, el.dataFlow, el.dataFlowZ, el.numCells, el.splitVariant].forEach(v => uiSetDisabled(v, !on));
    if (el.multiEditBadge) {
      const show = !!r && (multi || locked);
      el.multiEditBadge.classList.toggle("d-none", !show);
      if (show) el.multiEditBadge.textContent = locked ? "Текущий экран заблокирован. Разблокируйте слой для редактирования." : "Групповое редактирование: W/H масштабируют расстояния, поворот идёт вокруг центра группы";
    }
    if (el.areaM2) uiSetDisabled(el.areaM2, !on);
    uiSetDisabled(el.randColor, !on);
    if (el.btnClearMasks) uiSetDisabled(el.btnClearMasks, !on);
    if (el.btnResetFlowLocks) uiSetDisabled(el.btnResetFlowLocks, !on);
    if (el.btnResetManualClusters) uiSetDisabled(el.btnResetManualClusters, !on);
    if (el.btnConvertRegionsToScreens) uiSetDisabled(el.btnConvertRegionsToScreens, !on || (typeof deps.isNoteRect === "function" && deps.isNoteRect(r)));
    if (el.btnAutoContrast) uiSetDisabled(el.btnAutoContrast, !on);
    uiSetValue(el.project, st.projectName);
    uiSetValue(el.projectNamePanel, st.projectName);
    updateThemeUi(); updateViewModeUi(); updateLockAllUi();
    uiSetValue(el.textSize, mFmt(st.textSize));
    uiSetValue(el.font, st.fontFamily);
    if (el.snapGrid) uiSetChecked(el.snapGrid, !!(st.snap && st.snap.grid));
    if (el.snapObjects) uiSetChecked(el.snapObjects, !!(st.snap && st.snap.objects));
    if (el.snapCenters) uiSetChecked(el.snapCenters, !!(st.snap && st.snap.centers));
    if (el.snapGaps) uiSetChecked(el.snapGaps, !!(st.snap && st.snap.gaps));
    if (el.areaM2) uiSetValue(el.areaM2, r ? mFmt(r.areaM2Px || 65536) : "65536");
    if (typeof updateAreaM2Badge === "function") {
      updateAreaM2Badge(
        getAreaM2BadgeEl(),
        r && typeof getAreaM2BadgeLabel === "function" ? getAreaM2BadgeLabel(el.areaM2 && el.areaM2.value, r.areaM2Px || 65536, r._areaM2Expression, typeof getAreaM2PresetValues === "function" ? getAreaM2PresetValues() : []) : ""
      );
    }
    if (!r) {
      syncShapePointPanel(null);
      updateSplitVariantModeUi(null); updateModeBadges(null);
      uiSetValue(el.name, ""); uiSetValue(el.rectTextSize, "0"); updateRectTextSizeLabel(null);
      uiSetValue(el.x, ""); uiSetValue(el.y, ""); uiSetValue(el.wm, ""); uiSetValue(el.hm, "");
      uiSetValue(el.rot, "0"); uiSetValue(el.scale, String(Math.max(1, Math.round(Number(st.globalScale) || 256))));
      uiSetValue(el.a, "#2fcaaf"); uiSetValue(el.b, autoContrast("#2fcaaf"));
      uiSetValue(el.shapeOpacity, "28");
      uiSetValue(el.dataFlow, "none"); uiSetChecked(el.dataFlowZ, false); uiSetChecked(el.numCells, false);
      if (el.splitVariant) {
        const maxv = String(Math.max(0, SPLIT_VARIANT_MAX - 1));
        if (el.splitVariant.max !== maxv) el.splitVariant.max = maxv;
      }
      uiSetValue(el.splitVariant, "0");
      if (el.splitVariantDec) uiSetDisabled(el.splitVariantDec, true);
      if (el.splitVariantInc) uiSetDisabled(el.splitVariantInc, true);
      if (typeof deps.updateSplitVariantLabel === "function") deps.updateSplitVariantLabel(null);
      if (el.btnAutoContrast) uiSetText(el.btnAutoContrast, "Авто дополнительный: вкл");
      uiSetValue(el.cUnit, normalizeCabinetUnit("m"));
      uiSetValue(el.cx, "128"); uiSetValue(el.cy, "128");
      return;
    }
    syncShapePointPanel(r);
    metricFromPx(r); if (r.autoContrastB !== false) r.colorB = autoContrast(r.colorA);
    uiSetValue(el.name, r.name);
    uiSetValue(el.rectTextSize, String(Math.max(0, Math.min(128, Math.round(Number(r.textSize) || 0)))));
    updateRectTextSizeLabel(r);
    uiSetValue(el.x, r.x); uiSetValue(el.y, r.y); uiSetValue(el.rot, mFmt(r.rotation || 0));
    uiSetValue(el.wm, mFmt(r.widthM)); uiSetValue(el.hm, mFmt(r.heightM)); uiSetValue(el.scale, String(Math.max(1, Math.round(Number(st.globalScale) || 256))));
    uiSetValue(el.a, r.colorA); uiSetValue(el.b, r.colorB);
    uiSetValue(el.shapeOpacity, mFmt(shapeTransparencyPercent(r)));
    {
      const globalMode = normalizeDataFlow(r.dataFlow), rid = (st.mode === "flowEdit" && Number.isFinite(Number(st.flowRegionRid))) ? Math.max(0, Math.round(Number(st.flowRegionRid) || 0)) : null, cfg = (rid != null) ? getFlowRegionConfig(r, rid) : null, pts = (rid != null) ? (st.flowEditPoints || []).filter(p => p.rid === rid) : [], computedMode = (rid != null) ? resolveFlowModeFromStartAndDir(pts, cfg, getFlowModeRegion(r, rid, globalMode)) : "none";
      uiSetValue(el.dataFlow, (computedMode !== "none") ? computedMode : globalMode);
    }
    uiSetChecked(el.dataFlowZ, !!r.dataFlowZ); uiSetChecked(el.numCells, !!r.numberCells);
    updateSplitVariantControl(r);
    if (el.btnAutoContrast) uiSetText(el.btnAutoContrast, `Авто дополнительный: ${r.autoContrastB !== false ? "вкл" : "выкл"}`);
    const unit = normalizeCabinetUnit(el.cUnit && el.cUnit.value);
    uiSetValue(el.cx, cabinetPxToUi(r.cellX, unit, r));
    uiSetValue(el.cy, cabinetPxToUi(r.cellY, unit, r));
    updateModeBadges(r);
    if (multi) {
      const selected = getSelectedRects(), bb = getRectsBBox(selected);
      const commonBase = multiNumberedBase(selected);
      uiSetValue(el.name, commonBase);
      if (el.name) {
        const start = commonBase ? multiNumberedStart(selected) : null;
        el.name.dataset.multiStartNumber = start != null ? String(start) : "";
        el.name.placeholder = commonBase ? "" : "Редактирование имени пронумерует экраны";
      }
      if (bb) {
        uiSetValue(el.x, mFmt(bb.minX)); uiSetValue(el.y, mFmt(bb.minY));
        uiSetValue(el.wm, mFmt(bb.width / Math.max(1, r.scale || 256)));
        uiSetValue(el.hm, mFmt(bb.height / Math.max(1, r.scale || 256)));
      }
      if (st.selMultiBase && Number.isFinite(Number(st.selMultiBase.activeRotation))) {
        uiSetValue(el.rot, mFmt(Number(st.selMultiBase.activeRotation) || 0));
      }
    } else if (el.name) {
      el.name.placeholder = "";
      if (el.name.dataset) el.name.dataset.multiStartNumber = "";
    }
  };

  const applyProps = opts => {
    const o = (opts && typeof opts === "object") ? opts : {}, needList = o.list !== false, needPersist = o.persist !== false, needRender = o.render !== false;
    const applyColor = !!o.applyColor;
    const field = String(o.field || "");
    const shouldApply = id => !field || field === id;
    const r = cur(); if (!r) return;
    const selected = getSelectedRects(), targetsRaw = selected.length > 1 ? selected : [r], targets = targetsRaw.filter(t => !isRectLocked(t));
    if (!targets.length) return;
    const multi = targets.length > 1;
    if (o.selectionKey && o.selectionKey !== selectionKey()) return;
    if (!multi && (shouldApply("shapePointX") || shouldApply("shapePointY"))) {
      const selectedPoint = getSelectedShapePoint(r);
      if (selectedPoint && typeof worldToRectUV === "function") {
        const currentWorld = typeof rectUVToWorld === "function"
          ? rectUVToWorld(r, Number(selectedPoint.point.x) || 0, Number(selectedPoint.point.y) || 0)
          : { x: (Number(r.x) || 0) + (Number(selectedPoint.point.x) || 0), y: (Number(r.y) || 0) + (Number(selectedPoint.point.y) || 0) };
        const nextWorld = {
          x: shouldApply("shapePointX") ? Math.round(evalExpr(el.shapePointX && el.shapePointX.value, currentWorld.x)) : currentWorld.x,
          y: shouldApply("shapePointY") ? Math.round(evalExpr(el.shapePointY && el.shapePointY.value, currentWorld.y)) : currentWorld.y
        };
        const uv = worldToRectUV(r, nextWorld.x, nextWorld.y);
        r.shapePoints[selectedPoint.index] = { x: Math.round(Number(uv.u) || 0), y: Math.round(Number(uv.v) || 0) };
        if (typeof normalizeShapeBounds === "function") normalizeShapeBounds(r);
      }
    }
    if (!multi && shouldApply("name")) r.name = el.name.value || `Rect ${r.id}`;
    if (!multi) {
      let metricChanged = false;
      if (shouldApply("x")) r.x = Math.round(evalExpr(el.x.value, r.x));
      if (shouldApply("y")) r.y = Math.round(evalExpr(el.y.value, r.y));
      if (shouldApply("rotation")) r.rotation = evalExpr(el.rot.value, r.rotation || 0);
      if (shouldApply("widthM")) { r.widthM = Math.max(0.001, evalExpr(el.wm.value, r.widthM || 0.001)); metricChanged = true; }
      if (shouldApply("heightM")) { r.heightM = Math.max(0.001, evalExpr(el.hm.value, r.heightM || 0.001)); metricChanged = true; }
      if (shouldApply("areaM2Px")) r.areaM2Px = parseAreaM2PxInput(el.areaM2.value, r.areaM2Px || 65536);
      if (shouldApply("shapeOpacity") && typeof isShapeRect === "function" && isShapeRect(r)) r.shapeOpacity = shapeOpacityFromTransparencyInput(el.shapeOpacity && el.shapeOpacity.value, r);
      if (metricChanged) {
        const oldW = Math.max(1, Number(r.width) || 1);
        const oldH = Math.max(1, Number(r.height) || 1);
        pxFromMetric(r);
        if (typeof isShapeRect === "function" && isShapeRect(r) && Array.isArray(r.shapePoints)) {
          const sx = Math.max(0.000001, (Number(r.width) || oldW) / oldW);
          const sy = Math.max(0.000001, (Number(r.height) || oldH) / oldH);
          r.shapePoints = r.shapePoints.map(p => ({ x: Math.round((Number(p.x) || 0) * sx), y: Math.round((Number(p.y) || 0) * sy) }));
          if (typeof normalizeShapeBounds === "function") normalizeShapeBounds(r);
        }
      }
    } else {
      const ids = [...st.selSet].sort((a, b) => a - b), idsKey = ids.join(",");
      if (!st.selMultiBase || st.selMultiBase.idsKey !== idsKey) refreshMultiSelectionBase();
      const base = st.selMultiBase && st.selMultiBase.idsKey === idsKey ? st.selMultiBase : null;
      const curBb = getRectsBBox(targets) || { minX: r.x, minY: r.y, width: Math.max(1, r.width), height: Math.max(1, r.height), maxX: r.x + r.width, maxY: r.y + r.height };
      const baseBb = (base && base.bbox) ? base.bbox : curBb;
      const scaleForBox = Math.max(1, Number(r.scale) || Number(st.globalScale) || 256);
      const transformFromBase = !!(base && (shouldApply("widthM") || shouldApply("heightM") || shouldApply("rotation")));
      const boxForTransform = transformFromBase ? baseBb : curBb;
      const curWm = boxForTransform.width / scaleForBox, curHm = boxForTransform.height / scaleForBox;
      const srcItems = (base && Array.isArray(base.items) && base.items.length) ? base.items.map(it => ({ ...it })) : targets.map(t => { const bb = rectAABB(t); return { id: t.id, x: t.x, y: t.y, rotation: Number(t.rotation) || 0, minX: bb.minX, maxX: bb.maxX, minY: bb.minY, maxY: bb.maxY, cx: (bb.minX + bb.maxX) / 2, cy: (bb.minY + bb.maxY) / 2 }; });
      const desiredW = shouldApply("widthM") ? Math.max(axisCompactSpan(srcItems, "x"), Math.round(Math.max(0.001, evalExpr(el.wm.value, curWm)) * scaleForBox)) : boxForTransform.width;
      const desiredH = shouldApply("heightM") ? Math.max(axisCompactSpan(srcItems, "y"), Math.round(Math.max(0.001, evalExpr(el.hm.value, curHm)) * scaleForBox)) : boxForTransform.height;
      const inputMinX = shouldApply("x") ? Math.round(evalExpr(el.x.value, curBb.minX)) : boxForTransform.minX;
      const inputMinY = shouldApply("y") ? Math.round(evalExpr(el.y.value, curBb.minY)) : boxForTransform.minY;
      const widthChanged = Math.abs(desiredW - boxForTransform.width) > 0.5;
      const heightChanged = Math.abs(desiredH - boxForTransform.height) > 0.5;
      const transformCx = (boxForTransform.minX + boxForTransform.maxX) / 2;
      const transformCy = (boxForTransform.minY + boxForTransform.maxY) / 2;
      const nextMinX = widthChanged ? Math.round(transformCx - desiredW / 2) : inputMinX;
      const nextMinY = heightChanged ? Math.round(transformCy - desiredH / 2) : inputMinY;
      const nameInputParts = parseNumberedBaseInput(el.name && el.name.value);
      const nextNameBase = nameInputParts.base || normalizeNumberedBaseInput(el.name && el.name.value);
      const storedStartNumber = el.name && el.name.dataset ? Math.max(1, Math.round(Number(el.name.dataset.multiStartNumber) || 0)) : 0;
      const startNumber = nameInputParts.startNumber || storedStartNumber || 1;
      const nextNameGroup = nameInputParts.group || null;
      if (shouldApply("name") && nextNameBase) {
        targets
          .slice()
          .sort((a, b) => (Number(a.x) || 0) - (Number(b.x) || 0) || (Number(a.y) || 0) - (Number(b.y) || 0) || (Number(a.id) || 0) - (Number(b.id) || 0))
          .forEach((t, i) => { t.name = numberedNameFor(nextNameBase, startNumber + i, t.name, nextNameGroup); });
      }
      const mapAxis = (axis, targetMin, targetSpan) => {
        const EPS = 1e-6;
        const entries = srcItems.map(it => {
          const min = axis === "x" ? it.minX : it.minY, max = axis === "x" ? it.maxX : it.maxY, pos = axis === "x" ? it.x : it.y;
          return { id: it.id, min, max, pos };
        }).sort((a, b) => (a.min - b.min) || (a.max - b.max) || (a.id - b.id));
        if (!entries.length) return new Map();
        const clusters = [];
        for (const e of entries) {
          const last = clusters[clusters.length - 1];
          if (!last || e.min >= last.max - EPS) clusters.push({ min: e.min, max: e.max, members: [e] });
          else { last.max = Math.max(last.max, e.max); last.members.push(e); }
        }
        let sumGaps = 0, fixedSpan = 0;
        for (let i = 0; i < clusters.length; i++) {
          fixedSpan += Math.max(0, clusters[i].max - clusters[i].min);
          if (i + 1 < clusters.length) sumGaps += Math.max(0, clusters[i + 1].min - clusters[i].max);
        }
        let gapScale = 0;
        if (sumGaps > EPS) {
          const targetGap = Math.max(0, targetSpan - fixedSpan);
          gapScale = targetGap / sumGaps;
        }
        const equalGap = sumGaps > EPS || clusters.length < 2 ? null : Math.max(0, targetSpan - fixedSpan) / Math.max(1, clusters.length - 1);
        const nextPos = new Map();
        let curMin = targetMin;
        for (let i = 0; i < clusters.length; i++) {
          const c = clusters[i];
          const shift = curMin - c.min;
          for (const m of c.members) nextPos.set(m.id, Math.round(m.pos + shift));
          const width = Math.max(0, c.max - c.min);
          const baseGap = (i + 1 < clusters.length) ? Math.max(0, clusters[i + 1].min - c.max) : 0;
          curMin = curMin + width + (equalGap == null ? baseGap * gapScale : equalGap);
        }
        return nextPos;
      };
      const nextX = mapAxis("x", nextMinX, desiredW), nextY = mapAxis("y", nextMinY, desiredH);
      const baseRot = base && Number.isFinite(Number(base.activeRotation))
        ? Number(base.activeRotation)
        : Number(r.rotation) || 0;
      const desiredRot = shouldApply("rotation") ? evalExpr(el.rot && el.rot.value, baseRot) : baseRot;
      const rotDelta = desiredRot - baseRot;
      const rotRad = rotDelta * Math.PI / 180;
      const rotCx = nextMinX + desiredW / 2;
      const rotCy = nextMinY + desiredH / 2;
      const itemById = new Map(srcItems.map(it => [it.id, it]));
      const axisXActive = !!(shouldApply("x") || shouldApply("widthM"));
      const axisYActive = !!(shouldApply("y") || shouldApply("heightM"));
      const rotationActive = shouldApply("rotation");
      if (axisXActive || axisYActive || rotationActive) for (const t of targets) {
        const item = itemById.get(t.id);
        const nx = (axisXActive || rotationActive) && nextX.has(t.id) ? nextX.get(t.id) : t.x;
        const ny = (axisYActive || rotationActive) && nextY.has(t.id) ? nextY.get(t.id) : t.y;
        if (rotationActive && item) {
          const localCx = (Number(item.cx) || 0) - (Number(item.x) || 0);
          const localCy = (Number(item.cy) || 0) - (Number(item.y) || 0);
          const cx0 = nx + localCx;
          const cy0 = ny + localCy;
          const dx = cx0 - rotCx;
          const dy = cy0 - rotCy;
          const cx1 = rotCx + dx * Math.cos(rotRad) - dy * Math.sin(rotRad);
          const cy1 = rotCy + dx * Math.sin(rotRad) + dy * Math.cos(rotRad);
          t.x = Math.round(cx1 - localCx);
          t.y = Math.round(cy1 - localCy);
          t.rotation = (Number(item.rotation) || 0) + rotDelta;
        } else {
          if (axisXActive && nextX.has(t.id)) t.x = nx;
          if (axisYActive && nextY.has(t.id)) t.y = ny;
        }
      }
    }
    for (const t of targets) {
      const prev = { cellX: t.cellX, cellY: t.cellY, colorA: t.colorA, colorB: t.colorB, shapeOpacity: t.shapeOpacity, dataFlow: t.dataFlow, dataFlowZ: !!t.dataFlowZ, areaM2Px: t.areaM2Px, splitVariant: t.splitVariant };
      if (applyColor || shouldApply("colorA")) {
        t.colorA = el.a.value || "#2fcaaf";
        if (t.autoContrastB !== false) t.colorB = autoContrast(t.colorA); else t.colorB = el.b.value || t.colorB;
      }
      if (shouldApply("shapeOpacity") && typeof isShapeRect === "function" && isShapeRect(t)) t.shapeOpacity = shapeOpacityFromTransparencyInput(el.shapeOpacity && el.shapeOpacity.value, t);
      if (shouldApply("cellX")) t.cellX = cabinetUiToPx(el.cx && el.cx.value, el.cUnit && el.cUnit.value, t.cellX || 128, t);
      if (shouldApply("cellY")) t.cellY = cabinetUiToPx(el.cy && el.cy.value, el.cUnit && el.cUnit.value, t.cellY || 128, t);
      if (shouldApply("dataFlowZ")) t.dataFlowZ = !!el.dataFlowZ.checked;
      if (shouldApply("numberCells")) t.numberCells = !!el.numCells.checked;
      if (shouldApply("areaM2Px")) t.areaM2Px = parseAreaM2PxInput(el.areaM2.value, t.areaM2Px || 65536);
      const selectedMode = normalizeDataFlow(el.dataFlow.value), rid = (st.mode === "flowEdit" && Number.isFinite(Number(st.flowRegionRid))) ? Math.max(0, Math.round(Number(st.flowRegionRid) || 0)) : null;
      if (shouldApply("dataFlow") && rid != null && t.id === r.id) {
        const cfg = getFlowRegionConfig(t, rid), curMode = normalizeDataFlow(cfg && cfg.mode || "none");
        if (curMode !== selectedMode) setFlowRegionMode(t, rid, selectedMode);
      } else if (shouldApply("dataFlow")) t.dataFlow = selectedMode;
      const maxSplit = Math.max(0, Math.round(evalExpr(el.splitVariant.max, Math.max(0, SPLIT_VARIANT_MAX - 1))));
      const prevSplit = Math.max(0, Math.round(Number(t.splitVariant) || 0));
      if (shouldApply("splitVariant")) t.splitVariant = Math.max(0, Math.min(maxSplit, Math.round(evalExpr(el.splitVariant.value, t.splitVariant || 0))));
      if (t.splitVariant !== prevSplit) { try { delete t._splitVariantCount; } catch (_e) { t._splitVariantCount = NaN; } }
      const topoChanged = (prev.cellX !== t.cellX || prev.cellY !== t.cellY);
      if (topoChanged) {
        if (prev.cellX !== t.cellX || prev.cellY !== t.cellY) remapRectRigLoadsToBottomSeams(t);
        invalidateRectCache(t, "topology");
      } else {
        if (prev.colorA !== t.colorA || prev.colorB !== t.colorB || prev.shapeOpacity !== t.shapeOpacity) invalidateRectCache(t, "appearance");
        if (prev.areaM2Px !== t.areaM2Px || prev.splitVariant !== t.splitVariant) invalidateRectCache(t, "regions");
        if (prev.dataFlow !== t.dataFlow || prev.dataFlowZ !== !!t.dataFlowZ) invalidateRectCache(t, "flow");
      }
    }
    updateSplitVariantControl(r); el.b.value = r.colorB; if (el.btnAutoContrast) el.btnAutoContrast.textContent = `Авто дополнительный: ${r.autoContrastB !== false ? "вкл" : "выкл"}`;
    if (needList) listRects();
    if (needPersist) schedulePersist("project");
    if (needRender) render();
  };

  return {
    rectPropSchema,
    syncPropsBySchema,
    applyPropsBySchema,
    syncProps,
    applyProps
  };
};

const formatAreaBadgeNum = value => {
  const n = Number(value);
  if (!Number.isFinite(n)) return "";
  if (Math.abs(n - Math.round(n)) < 1e-6) return String(Math.round(n));
  return String(Math.round(n * 100) / 100).replace(".", ",");
};

export const getAreaM2ExpressionLabel = input => {
  const source = String(input ?? "").trim();
  if (!source) return "";
  const match = source.match(/^\s*(\d+(?:[.,]\d+)?)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)\s*$/i);
  if (!match) return "";
  const a = Number(String(match[1]).replace(",", "."));
  const b = Number(String(match[2]).replace(",", "."));
  if (!(a > 0 && b > 0)) return "";
  return `${formatAreaBadgeNum(a)}×${formatAreaBadgeNum(b)}`;
};

export const getAreaM2SqrtLabel = value => {
  const n = Math.max(0, Number(value) || 0);
  if (!(n > 0)) return "";
  const side = Math.sqrt(n);
  return `≈${formatAreaBadgeNum(side)}×${formatAreaBadgeNum(side)}`;
};

export const getAreaM2PresetLabel = (parsedValue, presetValues = []) => {
  const target = Math.max(1, Math.round(Number(parsedValue) || 0));
  for (const preset of Array.isArray(presetValues) ? presetValues : []) {
    const label = getAreaM2ExpressionLabel(preset);
    if (!label) continue;
    const parts = label.split("×").map(v => Number(String(v).replace(",", ".")));
    const product = Math.max(1, Math.round((parts[0] || 0) * (parts[1] || 0)));
    if (product === target) return label;
  }
  return "";
};

export const getAreaM2PresetValues = (root = document) => (
  Array.from(root.querySelectorAll("[data-area-m2-preset]"))
    .map(node => node.getAttribute("data-area-m2-preset") || "")
    .filter(Boolean)
);

export const getAreaM2BadgeLabel = (input, parsedValue, savedExpression = "", presetValues = []) => (
  getAreaM2PresetLabel(parsedValue, presetValues)
  || getAreaM2ExpressionLabel(input)
  || getAreaM2ExpressionLabel(savedExpression)
  || getAreaM2SqrtLabel(parsedValue)
);

export const setAreaM2ExpressionSource = (rect, input) => {
  if (!rect || typeof rect !== "object") return "";
  const expression = getAreaM2ExpressionLabel(input);
  if (expression) {
    try { Object.defineProperty(rect, "_areaM2Expression", { value: expression, writable: true, configurable: true }); }
    catch (_e) { rect._areaM2Expression = expression; }
  } else {
    try { delete rect._areaM2Expression; } catch (_e) { rect._areaM2Expression = ""; }
  }
  return expression;
};

export const updateAreaM2Badge = (badgeEl, label) => {
  if (!badgeEl) return;
  const value = String(label || "").trim();
  badgeEl.textContent = value;
  badgeEl.hidden = !value;
};

export const setupPropertiesSyncController = (deps = {}) => {
  const {
    st,
    syncProps,
    requestFrame = cb => requestAnimationFrame(cb),
    cancelFrame = id => cancelAnimationFrame(id),
    setDelay = (cb, ms) => setTimeout(cb, ms),
    clearDelay = id => clearTimeout(id)
  } = deps;

  let syncPropsRaf = 0;

  const scheduleSyncProps = () => {
    if (syncPropsRaf) return;
    if (typeof requestFrame === "function") {
      syncPropsRaf = requestFrame(() => {
        syncPropsRaf = 0;
        syncProps();
      });
    } else {
      syncPropsRaf = setDelay(() => {
        syncPropsRaf = 0;
        syncProps();
      }, 16);
    }
  };

  const syncPropsSmart = () => {
    const hot = !!(st.drag || st.flowDrag || st.clusterDrag || st.pan || (st.touch && st.touch.type === "pinch"));
    if (hot) {
      scheduleSyncProps();
      return;
    }
    if (syncPropsRaf) {
      if (typeof cancelFrame === "function") {
        try { cancelFrame(syncPropsRaf); } catch (_e) { }
      } else {
        clearDelay(syncPropsRaf);
      }
      syncPropsRaf = 0;
    }
    syncProps();
  };

  return {
    scheduleSyncProps,
    syncPropsSmart
  };
};

export const setupPropsUiUtils = (deps = {}) => {
  const {
    st,
    cur,
    normalizeCabinetUnit,
    mFmt,
    toPositiveInt,
    evalExpr
  } = deps;

  const uiSetValue = (node, v) => { if (!node) return; const s = String(v ?? ""); if (node.value !== s) node.value = s; };
  const uiSetChecked = (node, v) => { if (!node) return; const n = !!v; if (node.checked !== n) node.checked = n; };
  const uiSetDisabled = (node, v) => { if (!node) return; const n = !!v; if (node.disabled !== n) node.disabled = n; };
  const uiSetText = (node, v) => { if (!node) return; const s = String(v ?? ""); if (node.textContent !== s) node.textContent = s; };

  const getCabinetUnitScale = r => Math.max(1, Math.round(Number((r && r.scale) || (cur() && cur().scale) || st.globalScale || 256) || 256));
  const cabinetPxToUi = (px, unit, r) => {
    const v = Math.max(1, Math.round(Number(px) || 0));
    if (normalizeCabinetUnit(unit) === "m") return mFmt(v / getCabinetUnitScale(r));
    return String(v);
  };
  const cabinetUiToPx = (inputValue, unit, fallbackPx, r) => {
    const fb = Math.max(1, Math.round(Number(fallbackPx) || 128));
    if (normalizeCabinetUnit(unit) === "m") {
      const s = getCabinetUnitScale(r);
      const fallbackM = fb / s;
      const m = Math.max(0.001, evalExpr(inputValue, fallbackM));
      return toPositiveInt(Math.round(m * s), fb);
    }
    return toPositiveInt(evalExpr(inputValue, fb), fb);
  };

  return {
    uiSetValue,
    uiSetChecked,
    uiSetDisabled,
    uiSetText,
    getCabinetUnitScale,
    cabinetPxToUi,
    cabinetUiToPx
  };
};

export const setupPropsInputBindingsFeature = (deps = {}) => {
  const {
    st,
    el,
    bindEvent,
    bindEvents,
    bindCommitInputs,
    bindCommitInput,
    applyProps,
    syncProps,
    applyToTargets,
    render,
    invalidateRectCache,
    cur,
    evalExpr,
    updateRectTextSizeLabel,
    scheduleFontReadyRender,
    bindSplitVariantHandlers,
    pxFromMetric,
    remapRectRigLoadsToBottomSeams,
    schedulePersist,
    listRects,
    isRectLocked,
    parseAreaM2PxInput,
    getAreaM2BadgeLabel,
    getAreaM2PresetValues,
    setAreaM2ExpressionSource,
    updateAreaM2Badge
  } = deps;

  let propsInputRaf = 0;
  const getAreaM2BadgeEl = () => el.propAreaM2Badge || (typeof document !== "undefined" ? document.getElementById("propAreaM2Badge") : null);
  const selectionKey = () => {
    const ids = st && st.selSet && st.selSet.size ? [...st.selSet].map(v => Math.max(0, Math.round(Number(v) || 0))).sort((a, b) => a - b) : [];
    return ids.length ? ids.join(",") : String(cur() && cur().id || "");
  };
  const rememberSelectionKey = node => {
    if (node && node.dataset) node.dataset.selectionKey = selectionKey();
  };
  const keyForEvent = e => (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.selectionKey) || selectionKey();
  const fieldForNode = node => {
    if (node === el.name) return "name";
    if (node === el.x) return "x";
    if (node === el.y) return "y";
    if (node === el.rot) return "rotation";
    if (node === el.wm) return "widthM";
    if (node === el.hm) return "heightM";
    if (node === el.a) return "colorA";
    if (node === el.shapeOpacity) return "shapeOpacity";
    if (node === el.cx) return "cellX";
    if (node === el.cy) return "cellY";
    if (node === el.dataFlow) return "dataFlow";
    if (node === el.dataFlowZ) return "dataFlowZ";
    if (node === el.numCells) return "numberCells";
    if (node === el.splitVariant) return "splitVariant";
    if (node === el.areaM2) return "areaM2Px";
    if (node === el.shapePointX) return "shapePointX";
    if (node === el.shapePointY) return "shapePointY";
    return "";
  };
  const fieldForEvent = e => fieldForNode(e && e.currentTarget);
  const applyPropsForKey = (key, opts = {}) => {
    if (key && key !== selectionKey()) return false;
    applyProps({ ...opts, selectionKey: key });
    return true;
  };
  const propInputs = [el.name, el.x, el.y, el.rot, el.wm, el.hm, el.shapePointX, el.shapePointY, el.a, el.b, el.shapeOpacity, el.cx, el.cy, el.areaM2, el.dataFlow, el.dataFlowZ, el.numCells, el.splitVariant, el.rectTextSize];
  bindEvents(propInputs, "focusin", e => rememberSelectionKey(e.currentTarget));
  const scheduleApplyPropsInput = e => {
    const key = keyForEvent(e);
    const field = fieldForEvent(e);
    if (propsInputRaf) return;
    propsInputRaf = requestAnimationFrame(() => {
      propsInputRaf = 0;
      applyPropsForKey(key, { list: false, persist: false, render: true, field });
    });
  };
  bindEvents([el.name, el.x, el.y, el.rot, el.shapePointX, el.shapePointY, el.shapeOpacity, el.cx, el.cy], "input", scheduleApplyPropsInput);
  bindEvents([el.cUnit], "change", () => syncProps());
  if (el.a) {
    const scheduleApplyColorInput = e => {
      const key = keyForEvent(e);
      const field = fieldForEvent(e);
      if (propsInputRaf) return;
      propsInputRaf = requestAnimationFrame(() => {
        propsInputRaf = 0;
        applyPropsForKey(key, { list: false, persist: false, render: true, applyColor: true, field });
      });
    };
    bindEvent(el.a, "input", scheduleApplyColorInput);
    bindEvent(el.a, "change", e => { if (applyPropsForKey(keyForEvent(e), { applyColor: true, field: fieldForEvent(e) })) syncProps(); });
  }

  let colorBInputRaf = 0;
  const scheduleColorBInput = () => {
    if (colorBInputRaf) return;
    colorBInputRaf = requestAnimationFrame(() => {
      colorBInputRaf = 0;
      render();
    });
  };
  bindEvent(el.b, "input", e => {
    if (keyForEvent(e) !== selectionKey()) return;
    const count = applyToTargets(r => {
      r.autoContrastB = false;
      r.colorB = el.b.value || r.colorB;
      invalidateRectCache(r, "appearance");
    });
    if (!count) return;
    if (el.btnAutoContrast) el.btnAutoContrast.textContent = "Авто дополнительный: выкл";
    scheduleColorBInput();
  });
  bindEvent(el.b, "change", e => {
    if (keyForEvent(e) !== selectionKey()) return;
    const count = applyToTargets(r => {
      r.autoContrastB = false;
      r.colorB = el.b.value || r.colorB;
      invalidateRectCache(r, "appearance");
    }, { listRects: true, persist: true, render: true });
    if (!count) return;
    if (el.btnAutoContrast) el.btnAutoContrast.textContent = "Авто дополнительный: выкл";
  });

  bindEvents([el.dataFlow, el.dataFlowZ, el.splitVariant], "change", e => applyPropsForKey(keyForEvent(e), { field: fieldForEvent(e) }));
  bindEvent(el.numCells, "change", e => {
    if (keyForEvent(e) !== selectionKey()) return;
    const checked = !!(el.numCells && el.numCells.checked);
    applyToTargets(r => {
      r.numberCells = checked;
    }, { listRects: true, persist: true, render: true });
  });

  let rectTextInputRaf = 0;
  const rectTextFontState = { timer: 0 };
  bindEvents([el.rectTextSize], "input", e => {
    if (keyForEvent(e) !== selectionKey()) return;
    const r = cur();
    if (!r) return;
    const count = applyToTargets(t => {
      t.textSize = Math.max(0, Math.min(128, Math.round(evalExpr(el.rectTextSize.value, t.textSize || 0))));
    }, { listRects: false, persist: false, render: false });
    if (!count) return;
    updateRectTextSizeLabel(r);
    if (!rectTextInputRaf) {
      rectTextInputRaf = requestAnimationFrame(() => {
        rectTextInputRaf = 0;
        render();
      });
    }
    scheduleFontReadyRender(rectTextFontState, 140);
  });
  bindSplitVariantHandlers();

  bindCommitInputs([el.name, el.x, el.y, el.rot, el.wm, el.hm, el.shapePointX, el.shapePointY, el.shapeOpacity, el.cx, el.cy], e => { if (applyPropsForKey(keyForEvent(e), { field: fieldForEvent(e) })) syncProps(); });

  let textSettingsRaf = 0;
  const textSettingsFontState = { timer: 0 };
  const readTextSettingsFromInputs = () => {
    st.textSize = Math.max(6, evalExpr(el.textSize.value, st.textSize || 12));
    st.fontFamily = (el.font.value || "Roboto, Segoe UI, Arial").trim() || "Roboto, Segoe UI, Arial";
    st.fontReady = false;
  };
  const applyTextSettings = () => {
    readTextSettingsFromInputs();
    render();
    scheduleFontReadyRender(textSettingsFontState, 0);
  };
  const applyTextSettingsInput = () => {
    readTextSettingsFromInputs();
    if (!textSettingsRaf) {
      textSettingsRaf = requestAnimationFrame(() => {
        textSettingsRaf = 0;
        render();
      });
    }
    scheduleFontReadyRender(textSettingsFontState, 140);
  };
  bindEvents([el.textSize, el.font], "input", applyTextSettingsInput);

  const applyGlobalScaleSettings = () => {
    const nextScale = Math.max(1, Math.round(evalExpr(el.scale && el.scale.value, st.globalScale || 256)));
    if (nextScale === Math.max(1, Math.round(Number(st.globalScale) || 256))) return;
    st.globalScale = nextScale;
    for (const rr of st.rects) {
      rr.scale = nextScale;
      pxFromMetric(rr);
      remapRectRigLoadsToBottomSeams(rr);
      invalidateRectCache(rr, "topology");
    }
    schedulePersist("project");
    syncProps();
    listRects();
    render();
  };
  if (el.scale) bindCommitInput(el.scale, () => { applyGlobalScaleSettings(); syncProps(); });

  const applyAreaM2Settings = key => {
    if (key && key !== selectionKey()) return;
    const r = cur();
    if (!r || isRectLocked(r)) return;
    const input = el.areaM2 && el.areaM2.value;
    const parsedForBadge = parseAreaM2PxInput(input, r.areaM2Px || 65536);
    const count = applyToTargets(t => {
      t.areaM2Px = parseAreaM2PxInput(input, t.areaM2Px || 65536);
      if (typeof setAreaM2ExpressionSource === "function") setAreaM2ExpressionSource(t, input);
      invalidateRectCache(t, "regions");
    }, { persist: true, render: true });
    if (!count) return;
    if (typeof updateAreaM2Badge === "function" && typeof getAreaM2BadgeLabel === "function") {
      updateAreaM2Badge(getAreaM2BadgeEl(), getAreaM2BadgeLabel(input, parsedForBadge, r._areaM2Expression, typeof getAreaM2PresetValues === "function" ? getAreaM2PresetValues() : []));
    }
  };
  if (el.areaM2) {
    bindEvent(el.areaM2, "input", e => {
      if (keyForEvent(e) !== selectionKey()) return;
      const r = cur();
      if (!r || typeof updateAreaM2Badge !== "function" || typeof getAreaM2BadgeLabel !== "function") return;
      const parsed = parseAreaM2PxInput(el.areaM2.value, r.areaM2Px || 65536);
      updateAreaM2Badge(getAreaM2BadgeEl(), getAreaM2BadgeLabel(el.areaM2.value, parsed, r._areaM2Expression, typeof getAreaM2PresetValues === "function" ? getAreaM2PresetValues() : []));
    });
  }
  if (el.areaM2) bindCommitInput(el.areaM2, e => { applyAreaM2Settings(keyForEvent(e)); syncProps(); });

  for (const btn of document.querySelectorAll("[data-area-m2-preset]")) {
    bindEvent(btn, "click", () => {
      if (!el.areaM2) return;
      el.areaM2.value = String(btn.getAttribute("data-area-m2-preset") || "");
      rememberSelectionKey(el.areaM2);
      applyAreaM2Settings(selectionKey());
      syncProps();
    });
  }
  bindCommitInput(el.textSize, () => { applyTextSettings(); syncProps(); });
  bindCommitInput(el.font, () => { applyTextSettings(); syncProps(); });
};
