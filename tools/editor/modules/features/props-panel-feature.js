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
    updateAreaM2Badge
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

  const syncProps = () => {
    const r = cur(), locked = !!(r && isRectLocked(r)), on = !!r && !locked, multi = getSelectedRects().length > 1;
    [el.name, el.rectTextSize, el.x, el.y, el.rot, el.wm, el.hm, el.a, el.b, el.cx, el.cy, el.cUnit, el.dataFlow, el.dataFlowZ, el.numCells, el.splitVariant].forEach(v => uiSetDisabled(v, !on));
    if (el.multiEditBadge) {
      const show = multi && !!r;
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
      updateSplitVariantModeUi(null); updateModeBadges(null);
      uiSetValue(el.name, ""); uiSetValue(el.rectTextSize, "0"); updateRectTextSizeLabel(null);
      uiSetValue(el.x, ""); uiSetValue(el.y, ""); uiSetValue(el.wm, ""); uiSetValue(el.hm, "");
      uiSetValue(el.rot, "0"); uiSetValue(el.scale, String(Math.max(1, Math.round(Number(st.globalScale) || 256))));
      uiSetValue(el.a, "#2fcaaf"); uiSetValue(el.b, autoContrast("#2fcaaf"));
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
    metricFromPx(r); if (r.autoContrastB !== false) r.colorB = autoContrast(r.colorA);
    uiSetValue(el.name, r.name);
    uiSetValue(el.rectTextSize, String(Math.max(0, Math.min(128, Math.round(Number(r.textSize) || 0)))));
    updateRectTextSizeLabel(r);
    uiSetValue(el.x, r.x); uiSetValue(el.y, r.y); uiSetValue(el.rot, mFmt(r.rotation || 0));
    uiSetValue(el.wm, mFmt(r.widthM)); uiSetValue(el.hm, mFmt(r.heightM)); uiSetValue(el.scale, String(Math.max(1, Math.round(Number(st.globalScale) || 256))));
    uiSetValue(el.a, r.colorA); uiSetValue(el.b, r.colorB);
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
    const r = cur(); if (!r) return;
    const selected = getSelectedRects(), targetsRaw = selected.length > 1 ? selected : [r], targets = targetsRaw.filter(t => !isRectLocked(t));
    if (!targets.length) return;
    const multi = targets.length > 1;
    if (o.selectionKey && o.selectionKey !== selectionKey()) return;
    if (!multi) r.name = el.name.value || `Rect ${r.id}`;
    if (!multi) {
      r.x = Math.round(evalExpr(el.x.value, r.x));
      r.y = Math.round(evalExpr(el.y.value, r.y));
      r.rotation = evalExpr(el.rot.value, r.rotation || 0);
      r.widthM = Math.max(0.001, evalExpr(el.wm.value, r.widthM || 0.001));
      r.heightM = Math.max(0.001, evalExpr(el.hm.value, r.heightM || 0.001));
      r.areaM2Px = parseAreaM2PxInput(el.areaM2.value, r.areaM2Px || 65536);
      pxFromMetric(r);
    } else {
      const ids = [...st.selSet].sort((a, b) => a - b), idsKey = ids.join(",");
      if (!st.selMultiBase || st.selMultiBase.idsKey !== idsKey) refreshMultiSelectionBase();
      const base = st.selMultiBase && st.selMultiBase.idsKey === idsKey ? st.selMultiBase : null;
      const curBb = getRectsBBox(targets) || { minX: r.x, minY: r.y, width: Math.max(1, r.width), height: Math.max(1, r.height), maxX: r.x + r.width, maxY: r.y + r.height };
      const baseBb = (base && base.bbox) ? base.bbox : curBb;
      const scaleForBox = Math.max(1, Number(r.scale) || Number(st.globalScale) || 256);
      const curWm = curBb.width / scaleForBox, curHm = curBb.height / scaleForBox;
      const srcItems = (base && Array.isArray(base.items) && base.items.length) ? base.items.map(it => ({ ...it })) : targets.map(t => { const bb = rectAABB(t); return { id: t.id, x: t.x, y: t.y, rotation: Number(t.rotation) || 0, minX: bb.minX, maxX: bb.maxX, minY: bb.minY, maxY: bb.maxY, cx: (bb.minX + bb.maxX) / 2, cy: (bb.minY + bb.maxY) / 2 }; });
      const desiredW = Math.max(axisCompactSpan(srcItems, "x"), Math.round(Math.max(0.001, evalExpr(el.wm.value, curWm)) * scaleForBox));
      const desiredH = Math.max(axisCompactSpan(srcItems, "y"), Math.round(Math.max(0.001, evalExpr(el.hm.value, curHm)) * scaleForBox));
      const inputMinX = Math.round(evalExpr(el.x.value, curBb.minX));
      const inputMinY = Math.round(evalExpr(el.y.value, curBb.minY));
      const widthChanged = Math.abs(desiredW - curBb.width) > 0.5;
      const heightChanged = Math.abs(desiredH - curBb.height) > 0.5;
      const nextMinX = widthChanged ? Math.round((curBb.minX + curBb.maxX - desiredW) / 2) : inputMinX;
      const nextMinY = heightChanged ? Math.round((curBb.minY + curBb.maxY - desiredH) / 2) : inputMinY;
      const nameInputParts = parseNumberedBaseInput(el.name && el.name.value);
      const nextNameBase = nameInputParts.base || normalizeNumberedBaseInput(el.name && el.name.value);
      const storedStartNumber = el.name && el.name.dataset ? Math.max(1, Math.round(Number(el.name.dataset.multiStartNumber) || 0)) : 0;
      const startNumber = nameInputParts.startNumber || storedStartNumber || 1;
      const nextNameGroup = nameInputParts.group || null;
      if (nextNameBase) {
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
      const desiredRot = evalExpr(el.rot && el.rot.value, baseRot);
      const rotDelta = desiredRot - baseRot;
      const rotRad = rotDelta * Math.PI / 180;
      const rotCx = nextMinX + desiredW / 2;
      const rotCy = nextMinY + desiredH / 2;
      const itemById = new Map(srcItems.map(it => [it.id, it]));
      for (const t of targets) {
        const item = itemById.get(t.id);
        const nx = nextX.has(t.id) ? nextX.get(t.id) : t.x;
        const ny = nextY.has(t.id) ? nextY.get(t.id) : t.y;
        if (item) {
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
          if (nextX.has(t.id)) t.x = nx;
          if (nextY.has(t.id)) t.y = ny;
        }
      }
    }
    for (const t of targets) {
      const prev = { cellX: t.cellX, cellY: t.cellY, colorA: t.colorA, colorB: t.colorB, dataFlow: t.dataFlow, dataFlowZ: !!t.dataFlowZ, areaM2Px: t.areaM2Px, splitVariant: t.splitVariant };
      if (applyColor) {
        t.colorA = el.a.value || "#2fcaaf";
        if (t.autoContrastB !== false) t.colorB = autoContrast(t.colorA); else t.colorB = el.b.value || t.colorB;
      }
      t.cellX = cabinetUiToPx(el.cx && el.cx.value, el.cUnit && el.cUnit.value, t.cellX || 128, t);
      t.cellY = cabinetUiToPx(el.cy && el.cy.value, el.cUnit && el.cUnit.value, t.cellY || 128, t);
      t.dataFlowZ = !!el.dataFlowZ.checked;
      t.numberCells = !!el.numCells.checked;
      t.areaM2Px = parseAreaM2PxInput(el.areaM2.value, t.areaM2Px || 65536);
      const selectedMode = normalizeDataFlow(el.dataFlow.value), rid = (st.mode === "flowEdit" && Number.isFinite(Number(st.flowRegionRid))) ? Math.max(0, Math.round(Number(st.flowRegionRid) || 0)) : null;
      if (rid != null && t.id === r.id) {
        const cfg = getFlowRegionConfig(t, rid), curMode = normalizeDataFlow(cfg && cfg.mode || "none");
        if (curMode !== selectedMode) setFlowRegionMode(t, rid, selectedMode);
      } else t.dataFlow = selectedMode;
      const maxSplit = Math.max(0, Math.round(evalExpr(el.splitVariant.max, Math.max(0, SPLIT_VARIANT_MAX - 1))));
      const prevSplit = Math.max(0, Math.round(Number(t.splitVariant) || 0));
      t.splitVariant = Math.max(0, Math.min(maxSplit, Math.round(evalExpr(el.splitVariant.value, t.splitVariant || 0))));
      if (t.splitVariant !== prevSplit) { try { delete t._splitVariantCount; } catch (_e) { t._splitVariantCount = NaN; } }
      const topoChanged = (prev.cellX !== t.cellX || prev.cellY !== t.cellY);
      if (topoChanged) {
        if (prev.cellX !== t.cellX || prev.cellY !== t.cellY) remapRectRigLoadsToBottomSeams(t);
        invalidateRectCache(t, "topology");
      } else {
        if (prev.colorA !== t.colorA || prev.colorB !== t.colorB) invalidateRectCache(t, "appearance");
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
