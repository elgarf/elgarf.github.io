import {
  applyShapePointProps,
  syncShapePointPanel
} from "./props-shape-point-controller.js";
import {
  scaleShapePointsForRectResize,
  shapeOpacityFromTransparencyInput,
  shapeTransparencyPercent
} from "./props-shape-style-controller.js";
import {
  changeApplyInputNodes,
  commitApplyInputNodes,
  fieldForPropNode,
  liveApplyInputNodes,
  setMainPropsDisabled,
  setPanelHidden,
  syncDynamicPanelVisibility,
  trackedPropInputNodes
} from "./props-panel-ui-schema.js";
import { noteTextColorForBackground } from "../utils/color-utils.js";
import { autoFlowLinkColor, normalizeDeviceOrientation, normalizeDeviceType, normalizePortCount } from "../utils/device-utils.js";
import { flowLinkKeyOf } from "../utils/flow-link-key-utils.js";
import { getFlowLinks, getFlowLinksCopy } from "../utils/flow-links-state.js";
import { getPrimarySelectedFlowLinkKey, getSelectedFlowLinkKeys } from "../utils/flow-link-selection-state.js";
import { getSelectedFlowLinks as getSelectedFlowLinksByState } from "../utils/selected-flow-links.js";
import { isDeviceRectKind, isNoteHiddenInArtView } from "../utils/rect-kind-utils.js";
import {
  buildDefaultOrthogonalPoints,
  hasFlowLinkCustomColor,
  normalizeFlowLinkColor,
  normalizeFlowLinkCommutationName,
  normalizeFlowLinkControlPointCount,
  normalizeFlowLinkIsCommutation,
  normalizeFlowLinkLineType,
  normalizeFlowLinkWidth
} from "./flow-link-props-utils.js";
import {
  multiNumberedBase,
  multiNumberedStart,
  normalizeNumberedBaseInput,
  numberedNameFor,
  parseNumberedBaseInput
} from "./name-edit-utils.js";

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
    isNoteRect,
    rectUVToWorld,
    worldToRectUV,
    findFlowAnchorByEndpoint,
    normalizeShapeBounds
  } = deps;

  const rectPropSchema = createRectPropSchema({
    evalExpr,
    parseAreaM2PxInput,
    cabinetUiToPx,
    normalizeDataFlow
  });
  const isDeviceRect = rect => isDeviceRectKind(rect);
  const dropSelectionForHiddenArtNote = rect => {
    if (!isNoteHiddenInArtView(rect, st && st.viewMode)) return;
    const id = Math.max(1, Math.round(Number(rect.id) || 0));
    if (st.selSet instanceof Set) st.selSet.delete(id);
    if (st.sel != null && Math.max(1, Math.round(Number(st.sel) || 0)) === id) st.sel = st.selSet instanceof Set ? ([...st.selSet][0] || null) : null;
  };
  const rectById = id => (Array.isArray(st && st.rects) ? st.rects : []).find(r => Math.max(1, Math.round(Number(r && r.id) || 0)) === Math.max(1, Math.round(Number(id) || 0))) || null;
  const parsePortLabels = (value, count) => {
    const n = normalizePortCount(count, 4);
    const src = String(value == null ? "" : value).split(",").map(s => s.trim()).filter(Boolean);
    const out = [];
    for (let i = 0; i < n; i++) out.push(src[i] || String(i + 1));
    return out;
  };
  const getSelectedDevicePort = rect => {
    const sel = st && st.devicePortSelection;
    if (!rect || !sel) return null;
    const rectId = Math.max(1, Math.round(Number(rect.id) || 0));
    const selRectId = Math.max(1, Math.round(Number(sel.rectId) || 0));
    if (rectId !== selRectId) return null;
    const kind = String(sel.kind || "").toLowerCase() === "end" ? "end" : "start";
    const cid = Math.max(1, Math.round(Number(sel.cid) || 1));
    return { rectId, kind, cid };
  };
  const selectedFlowLink = () => {
    const key = getPrimarySelectedFlowLinkKey(st);
    if (!key) return null;
    const list = getFlowLinks(st);
    return list.find(it => flowLinkKeyOf(it) === key) || null;
  };
  const selectedFlowLinks = () => {
    const list = getFlowLinks(st);
    const out = getSelectedFlowLinksByState(st, list);
    if (!out.length) {
      const one = selectedFlowLink();
      if (one) out.push(one);
    }
    return out;
  };
  const hasSelectedFlowLink = () => {
    const keys = getSelectedFlowLinkKeys(st);
    const key = getPrimarySelectedFlowLinkKey(st);
    if (!key && !keys.length) return false;
    if (selectedFlowLinks().length) return true;
    const segs = Array.isArray(st && st.flowLinkSegments) ? st.flowLinkSegments : [];
    if (segs.some(s => String(s && s.key || "") === key)) return true;
    return true;
  };
  const selectionKey = () => {
    const ids = getSelectedRects().map(r => Math.max(0, Math.round(Number(r && r.id) || 0))).sort((a, b) => a - b);
    return ids.length ? ids.join(",") : String(cur() && cur().id || "");
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
  const syncSelectedShapePointPanel = rect => syncShapePointPanel({
    st,
    el,
    rect,
    isShapeRect,
    isRectLocked,
    uiSetDisabled,
    uiSetValue,
    uiSetChecked,
    rectUVToWorld
  });
  const syncFlowLinkSelectionUi = (selLink, options = {}) => {
    const forceSync = !!options.forceSync;
    const showCurveField = !!hasSelectedFlowLink();
    setPanelHidden(el.flowLinkCurveField, !showCurveField);
    if (!showCurveField && !forceSync) return;
    uiSetValue(el.propFlowLinkCurveMode, "manual");
    const count = normalizeFlowLinkControlPointCount(selLink && selLink.controlPointCount);
    const orthogonal = !!(selLink && Array.isArray(selLink.orthogonalPoints) && selLink.orthogonalPoints.length);
    const hasCustomColor = hasFlowLinkCustomColor(selLink);
    const color = hasCustomColor
      ? normalizeFlowLinkColor(selLink && selLink.color)
      : normalizeFlowLinkColor(autoFlowLinkColor(selLink, rectById, isDeviceRect));
    const width = normalizeFlowLinkWidth(selLink && selLink.width);
    const lineType = normalizeFlowLinkLineType(selLink && selLink.lineType);
    const isCommutation = normalizeFlowLinkIsCommutation(selLink && selLink.isCommutation);
    const commutationName = normalizeFlowLinkCommutationName(selLink && selLink.commutationName);
    const collectCommutationNames = () => {
      const out = [];
      const seen = new Set();
      for (const ln of getFlowLinks(st)) {
        if (!normalizeFlowLinkIsCommutation(ln && ln.isCommutation)) continue;
        const nm = normalizeFlowLinkCommutationName(ln && ln.commutationName);
        if (!nm || seen.has(nm)) continue;
        seen.add(nm);
        out.push(nm);
      }
      out.sort((a, b) => String(a).localeCompare(String(b), "ru", { numeric: true }));
      return out;
    };
    const syncCommutationOptions = () => {
      const menu = el.propFlowLinkCommutationDropdownMenu;
      if (!menu) return;
      const names = collectCommutationNames();
      menu.innerHTML = "";
      if (!names.length) {
        const empty = document.createElement("li");
        const emptyBtn = document.createElement("button");
        emptyBtn.type = "button";
        emptyBtn.className = "dropdown-item disabled";
        emptyBtn.textContent = "Нет сохранённых наименований";
        empty.appendChild(emptyBtn);
        menu.appendChild(empty);
        return;
      }
      for (const name of names) {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "dropdown-item";
        btn.textContent = String(name || "");
        btn.addEventListener("click", () => {
          if (el.propFlowLinkCommutationName) {
            el.propFlowLinkCommutationName.value = String(name || "");
            el.propFlowLinkCommutationName.dispatchEvent(new Event("input", { bubbles: true }));
            el.propFlowLinkCommutationName.dispatchEvent(new Event("change", { bubbles: true }));
          }
        });
        li.appendChild(btn);
        menu.appendChild(li);
      }
    };
    uiSetValue(el.propFlowLinkControlCount, String(count));
    uiSetChecked(el.propFlowLinkOrthogonal, orthogonal);
    uiSetDisabled(el.propFlowLinkControlCount, orthogonal);
    uiSetValue(el.propFlowLinkColor, color);
    uiSetValue(el.propFlowLinkWidth, String(Math.round(width * 10) / 10));
    uiSetValue(el.propFlowLinkLineType, lineType);
    uiSetChecked(el.propFlowLinkIsCommutation, isCommutation);
    uiSetValue(el.propFlowLinkCommutationName, commutationName || "");
    uiSetDisabled(el.propFlowLinkCommutationName, !isCommutation);
    uiSetDisabled(el.propFlowLinkCommutationDropdownBtn, !isCommutation);
    syncCommutationOptions();
    if (el.propFlowLinkColor) uiSetDisabled(el.propFlowLinkColor, false);
    if (el.btnFlowLinkColorReset) uiSetDisabled(el.btnFlowLinkColorReset, !hasCustomColor);
    if (showCurveField) {
      const hasManual = !!(selLink && ((selLink.manualBezierRel && selLink.manualBezierRel.c1 && selLink.manualBezierRel.c2) || (selLink.manualBezier && selLink.manualBezier.c1 && selLink.manualBezier.c2)));
      uiSetDisabled(el.btnFlowLinkCurveReset, !hasManual);
      uiSetDisabled(el.propFlowLinkCurveMode, true);
    }
  };
  const syncProps = () => {
    const r = cur(), locked = !!(r && isRectLocked(r)), on = !!r && !locked, multi = getSelectedRects().length > 1;
    syncDynamicPanelVisibility({ el, rect: r, multi, isShapeRect, isNoteRect, hasFlowLinkSelection: hasSelectedFlowLink() });
    setMainPropsDisabled({ el, disabled: !on, uiSetDisabled });
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
    if (el.btnAutoRouteDeviceOutLinks) uiSetDisabled(el.btnAutoRouteDeviceOutLinks, !on || !isDeviceRect(r));
    if (el.btnImproveDeviceOutLinks) uiSetDisabled(el.btnImproveDeviceOutLinks, !on || !isDeviceRect(r));
    if (el.btnConvertRegionsToScreens) uiSetDisabled(el.btnConvertRegionsToScreens, !on || (typeof deps.isNoteRect === "function" && deps.isNoteRect(r)));
    if (el.btnAutoContrast) uiSetDisabled(el.btnAutoContrast, !on);
    uiSetValue(el.project, st.projectName);
    uiSetValue(el.projectNamePanel, st.projectName);
    uiSetValue(el.projectGuidPanel, String(st.projectGuid || ""));
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
      syncSelectedShapePointPanel(null);
      updateSplitVariantModeUi(null); updateModeBadges(null);
      uiSetValue(el.name, ""); uiSetValue(el.rectTextSize, "0"); updateRectTextSizeLabel(null);
      uiSetValue(el.x, ""); uiSetValue(el.y, ""); uiSetValue(el.wm, ""); uiSetValue(el.hm, "");
      uiSetValue(el.rot, "0"); uiSetValue(el.scale, String(Math.max(1, Math.round(Number(st.globalScale) || 256))));
      uiSetValue(el.a, "#2fcaaf"); uiSetValue(el.b, autoContrast("#2fcaaf"));
      uiSetValue(el.shapeOpacity, "28");
      uiSetChecked(el.propNoteArtRender, true);
      uiSetValue(el.dataFlow, "none"); uiSetChecked(el.dataFlowZ, false); uiSetChecked(el.numCells, false);
      if (el.splitVariant) {
        const maxv = String(Math.max(0, SPLIT_VARIANT_MAX - 1));
        if (el.splitVariant.max !== maxv) el.splitVariant.max = maxv;
      }
      uiSetValue(el.splitVariant, "0");
      uiSetValue(el.propDeviceType, "controller");
      uiSetValue(el.propDeviceOrientation, "horizontal");
      uiSetValue(el.propDeviceInCount, "4");
      uiSetValue(el.propDeviceOutCount, "4");
      uiSetValue(el.propDevicePortLabel, "");
      const selLink0 = selectedFlowLink();
      syncFlowLinkSelectionUi(selLink0, { forceSync: true });
      setPanelHidden(el.devicePortLabelField, true);
      if (el.splitVariantDec) uiSetDisabled(el.splitVariantDec, true);
      if (el.splitVariantInc) uiSetDisabled(el.splitVariantInc, true);
      if (typeof deps.updateSplitVariantLabel === "function") deps.updateSplitVariantLabel(null);
      if (el.btnAutoContrast) uiSetText(el.btnAutoContrast, "Авто дополнительный: вкл");
      uiSetValue(el.cUnit, normalizeCabinetUnit("m"));
      uiSetValue(el.cx, "128"); uiSetValue(el.cy, "128");
      return;
    }
    syncSelectedShapePointPanel(r);
    metricFromPx(r);
    if (typeof isNoteRect === "function" && isNoteRect(r)) r.colorB = noteTextColorForBackground(r.colorA);
    else if (r.autoContrastB !== false) r.colorB = autoContrast(r.colorA);
    uiSetValue(el.name, r.name);
    uiSetValue(el.rectTextSize, String(Math.max(0, Math.min(128, Math.round(Number(r.textSize) || 0)))));
    updateRectTextSizeLabel(r);
    uiSetValue(el.x, r.x); uiSetValue(el.y, r.y); uiSetValue(el.rot, mFmt(r.rotation || 0));
    uiSetValue(el.wm, mFmt(r.widthM)); uiSetValue(el.hm, mFmt(r.heightM)); uiSetValue(el.scale, String(Math.max(1, Math.round(Number(st.globalScale) || 256))));
    uiSetValue(el.a, r.colorA); uiSetValue(el.b, r.colorB);
    if (isDeviceRect(r)) {
      const inCount = normalizePortCount(r.deviceInCount, 4);
      const outCount = normalizePortCount(r.deviceOutCount, 4);
      uiSetValue(el.propDeviceType, normalizeDeviceType(r.deviceType));
      uiSetValue(el.propDeviceOrientation, normalizeDeviceOrientation(r.deviceOrientation));
      uiSetValue(el.propDeviceInCount, String(inCount));
      uiSetValue(el.propDeviceOutCount, String(outCount));
      const selectedPort = getSelectedDevicePort(r);
      if (selectedPort) {
        const arr = selectedPort.kind === "end" ? (Array.isArray(r.deviceOutLabels) ? r.deviceOutLabels : []) : (Array.isArray(r.deviceInLabels) ? r.deviceInLabels : []);
        const idx = Math.max(0, selectedPort.cid - 1);
        uiSetValue(el.propDevicePortLabel, String(arr[idx] == null || arr[idx] === "" ? selectedPort.cid : arr[idx]));
        setPanelHidden(el.devicePortLabelField, false);
      } else {
        uiSetValue(el.propDevicePortLabel, "");
        setPanelHidden(el.devicePortLabelField, true);
      }
    }
    const selLink = selectedFlowLink();
    syncFlowLinkSelectionUi(selLink);
    uiSetValue(el.shapeOpacity, mFmt(shapeTransparencyPercent(r)));
    uiSetChecked(el.propNoteArtRender, r && r.noteIncludeInArtRender !== false);
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
    const flowLinkField = field.startsWith("flowLink");
    const selectedLinks = selectedFlowLinks();
    if (flowLinkField && selectedLinks.length) {
      const selectedKeySet = new Set(selectedLinks.map(ln => flowLinkKeyOf(ln)));
      const list = getFlowLinksCopy(st);
      let changedFlowLinks = false;
      for (let idx = 0; idx < list.length; idx++) {
        const curLink = list[idx];
        if (!selectedKeySet.has(flowLinkKeyOf(curLink))) continue;
        const next = { ...curLink };
        if (shouldApply("flowLinkControlPointCount")) {
          const n = normalizeFlowLinkControlPointCount(el.propFlowLinkControlCount && el.propFlowLinkControlCount.value);
          const prev = Math.max(2, Math.round(Number(next.controlPointCount) || 2));
          const oldOffsets = Array.isArray(next.controlOffsets) ? next.controlOffsets : [];
          const newOffsets = [];
          const handles = (Array.isArray(st && st.flowLinkCurveHandles) ? st.flowLinkCurveHandles : []).filter(h => String(h && h.key || "") === key);
          const hC1 = handles.find(h => String(h && h.handle || "") === "c1");
          const hC2 = handles.find(h => String(h && h.handle || "") === "c2");
          const anyHandle = handles[0] || null;
          const start = anyHandle && anyHandle.fallback && anyHandle.fallback.start ? anyHandle.fallback.start : null;
          const end = anyHandle && anyHandle.fallback && anyHandle.fallback.end ? anyHandle.fallback.end : null;
          const canSample = !!(start && end && Number.isFinite(Number(start.x)) && Number.isFinite(Number(start.y)) && Number.isFinite(Number(end.x)) && Number.isFinite(Number(end.y)));
          const lerp = (a, b, t) => ({ x: (Number(a.x) || 0) + ((Number(b.x) || 0) - (Number(a.x) || 0)) * t, y: (Number(a.y) || 0) + ((Number(b.y) || 0) - (Number(a.y) || 0)) * t });
          const sampleBezier = (p0, p1, p2, p3, t) => {
            const u = 1 - t;
            const tt = t * t;
            const uu = u * u;
            const uuu = uu * u;
            const ttt = tt * t;
            return {
              x: uuu * p0.x + 3 * uu * t * p1.x + 3 * u * tt * p2.x + ttt * p3.x,
              y: uuu * p0.y + 3 * uu * t * p1.y + 3 * u * tt * p2.y + ttt * p3.y
            };
          };
          const buildPoints = (count, offsetsArr, s, e) => {
            const pts = [{ x: Number(s.x) || 0, y: Number(s.y) || 0 }];
            for (let i = 1; i < count - 1; i++) {
              const t = i / (count - 1);
              const b = lerp(s, e, t);
              const o = offsetsArr[i - 1] || { x: 0, y: 0 };
              pts.push({ x: b.x + (Number(o.x) || 0), y: b.y + (Number(o.y) || 0) });
            }
            pts.push({ x: Number(e.x) || 0, y: Number(e.y) || 0 });
            return pts;
          };
          const sampleOldCurve = t => {
            if (!canSample) return null;
            if (prev <= 2) {
              const c1 = hC1 && Number.isFinite(Number(hC1.x)) && Number.isFinite(Number(hC1.y))
                ? { x: Number(hC1.x), y: Number(hC1.y) }
                : (next && next.manualBezierRel && next.manualBezierRel.c1
                  ? { x: (Number(start.x) || 0) + (Number(next.manualBezierRel.c1.x) || 0), y: (Number(start.y) || 0) + (Number(next.manualBezierRel.c1.y) || 0) }
                  : (next && next.manualBezier && next.manualBezier.c1 ? { x: Number(next.manualBezier.c1.x) || 0, y: Number(next.manualBezier.c1.y) || 0 } : null));
              const c2 = hC2 && Number.isFinite(Number(hC2.x)) && Number.isFinite(Number(hC2.y))
                ? { x: Number(hC2.x), y: Number(hC2.y) }
                : (next && next.manualBezierRel && next.manualBezierRel.c2
                  ? { x: (Number(end.x) || 0) + (Number(next.manualBezierRel.c2.x) || 0), y: (Number(end.y) || 0) + (Number(next.manualBezierRel.c2.y) || 0) }
                  : (next && next.manualBezier && next.manualBezier.c2 ? { x: Number(next.manualBezier.c2.x) || 0, y: Number(next.manualBezier.c2.y) || 0 } : null));
              const p1 = c1 || lerp(start, end, 0.33);
              const p2 = c2 || lerp(start, end, 0.66);
              return sampleBezier(start, p1, p2, end, t);
            }
            const pts = buildPoints(prev, oldOffsets, start, end);
            const segRel = Array.isArray(next && next.segmentBezierRel) ? next.segmentBezierRel : [];
            const segCount = Math.max(1, pts.length - 1);
            const segs = [];
            for (let i = 0; i < segCount; i++) {
              const p0 = pts[i];
              const p3 = pts[i + 1];
              const rel = segRel[i] && typeof segRel[i] === "object" ? segRel[i] : null;
              const c1 = rel && rel.c1 ? { x: p0.x + (Number(rel.c1.x) || 0), y: p0.y + (Number(rel.c1.y) || 0) } : lerp(p0, p3, 0.33);
              const c2 = rel && rel.c2 ? { x: p3.x + (Number(rel.c2.x) || 0), y: p3.y + (Number(rel.c2.y) || 0) } : lerp(p0, p3, 0.66);
              segs.push({ p0, c1, c2, p3 });
            }
            const segT = t * segCount;
            const segIdx = Math.max(0, Math.min(segCount - 1, Math.floor(segT)));
            const lt = Math.max(0, Math.min(1, segT - segIdx));
            const sg = segs[segIdx];
            return sampleBezier(sg.p0, sg.c1, sg.c2, sg.p3, lt);
          };
          for (let i = 0; i < Math.max(0, n - 2); i++) {
            const t = (i + 1) / (n - 1);
            const sampled = sampleOldCurve(t);
            if (sampled && canSample) {
              const base = lerp(start, end, t);
              newOffsets.push({ x: sampled.x - base.x, y: sampled.y - base.y });
            } else {
              const src = oldOffsets[Math.min(i, Math.max(0, oldOffsets.length - 1))] || { x: 0, y: 0 };
              newOffsets.push({ x: Number(src.x) || 0, y: Number(src.y) || 0 });
            }
          }
          next.controlPointCount = n;
          next.controlOffsets = newOffsets;
          if (prev !== n) {
            try { delete next.manualBezier; } catch { next.manualBezier = null; }
            try { delete next.manualBezierRel; } catch { next.manualBezierRel = null; }
            try { delete next.segmentBezierRel; } catch { next.segmentBezierRel = null; }
            try { delete next.bendOffsets; } catch { next.bendOffsets = null; }
            try { delete next.orthogonalPoints; } catch { next.orthogonalPoints = null; }
          }
        }
        if (shouldApply("flowLinkOrthogonal")) {
          const orthogonal = !!(el.propFlowLinkOrthogonal && el.propFlowLinkOrthogonal.checked);
          if (orthogonal) {
            const existing = Array.isArray(next.orthogonalPoints)
              ? next.orthogonalPoints
                .map(p => ({ x: Number(p && p.x) || 0, y: Number(p && p.y) || 0 }))
                .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
              : [];
            const routePoints = existing.length ? existing : buildDefaultOrthogonalPoints(next, findFlowAnchorByEndpoint);
            if (routePoints.length) {
              next.orthogonalPoints = routePoints;
              next.controlPointCount = 2;
              next.controlOffsets = [];
              try { delete next.manualBezier; } catch { next.manualBezier = null; }
              try { delete next.manualBezierRel; } catch { next.manualBezierRel = null; }
              try { delete next.segmentBezierRel; } catch { next.segmentBezierRel = null; }
              try { delete next.bendOffsets; } catch { next.bendOffsets = null; }
            }
          } else {
            try { delete next.orthogonalPoints; } catch { next.orthogonalPoints = null; }
          }
        }
        if (shouldApply("flowLinkColor")) {
          next.color = normalizeFlowLinkColor(el.propFlowLinkColor && el.propFlowLinkColor.value);
          try { delete next.colorMode; } catch { next.colorMode = null; }
          if (el.btnFlowLinkColorReset) uiSetDisabled(el.btnFlowLinkColorReset, false);
        }
        if (shouldApply("flowLinkWidth")) next.width = normalizeFlowLinkWidth(el.propFlowLinkWidth && el.propFlowLinkWidth.value);
        if (shouldApply("flowLinkLineType")) next.lineType = normalizeFlowLinkLineType(el.propFlowLinkLineType && el.propFlowLinkLineType.value);
        if (shouldApply("flowLinkIsCommutation")) {
          const checked = normalizeFlowLinkIsCommutation(el.propFlowLinkIsCommutation && el.propFlowLinkIsCommutation.checked);
          next.isCommutation = checked;
          if (checked) {
            const value = normalizeFlowLinkCommutationName(el.propFlowLinkCommutationName && el.propFlowLinkCommutationName.value);
            next.commutationName = value;
          } else {
            try { delete next.commutationName; } catch { next.commutationName = ""; }
          }
          uiSetDisabled(el.propFlowLinkCommutationName, !checked);
          uiSetDisabled(el.propFlowLinkCommutationDropdownBtn, !checked);
          if (!checked) uiSetValue(el.propFlowLinkCommutationName, "");
        }
        if (shouldApply("flowLinkCommutationName")) {
          const checked = normalizeFlowLinkIsCommutation(el.propFlowLinkIsCommutation && el.propFlowLinkIsCommutation.checked);
          if (checked) {
            const value = normalizeFlowLinkCommutationName(el.propFlowLinkCommutationName && el.propFlowLinkCommutationName.value);
            next.commutationName = value;
            uiSetValue(el.propFlowLinkCommutationName, next.commutationName);
          }
        }
        list[idx] = next;
        changedFlowLinks = true;
      }
      if (changedFlowLinks) {
        st.flowLinks = list;
        if (needPersist) schedulePersist("project");
        if (needRender) render();
      }
      return;
    }
    const r = cur(); if (!r) return;
    const selected = getSelectedRects(), targetsRaw = selected.length > 1 ? selected : [r], targets = targetsRaw.filter(t => !isRectLocked(t));
    if (!targets.length) return;
    const multi = targets.length > 1;
    if (o.selectionKey && o.selectionKey !== selectionKey()) return;
    if (!multi) applyShapePointProps({
      st,
      el,
      rect: r,
      shouldApply,
      isShapeRect,
      evalExpr,
      rectUVToWorld,
      worldToRectUV,
      normalizeShapeBounds
    });
    if (!multi && shouldApply("name")) r.name = el.name.value || `Rect ${r.id}`;
    if (!multi) {
      let metricChanged = false;
      if (shouldApply("x")) r.x = Math.round(evalExpr(el.x.value, r.x));
      if (shouldApply("y")) r.y = Math.round(evalExpr(el.y.value, r.y));
      if (shouldApply("rotation")) r.rotation = evalExpr(el.rot.value, r.rotation || 0);
      if (shouldApply("widthM")) { r.widthM = Math.max(0.001, evalExpr(el.wm.value, r.widthM || 0.001)); metricChanged = true; }
      if (shouldApply("heightM")) { r.heightM = Math.max(0.001, evalExpr(el.hm.value, r.heightM || 0.001)); metricChanged = true; }
      if (shouldApply("areaM2Px")) r.areaM2Px = parseAreaM2PxInput(el.areaM2.value, r.areaM2Px || 65536);
      if (shouldApply("shapeOpacity") && typeof isShapeRect === "function" && isShapeRect(r)) {
        r.shapeOpacity = shapeOpacityFromTransparencyInput({ inputValue: el.shapeOpacity && el.shapeOpacity.value, fallbackRect: r, evalExpr });
      }
      if (shouldApply("noteIncludeInArtRender") && typeof isNoteRect === "function" && isNoteRect(r)) {
        r.noteIncludeInArtRender = !(el.propNoteArtRender && el.propNoteArtRender.checked === false);
        dropSelectionForHiddenArtNote(r);
      }
      if (isDeviceRect(r)) {
        if (shouldApply("deviceType")) r.deviceType = normalizeDeviceType(el.propDeviceType && el.propDeviceType.value || "controller");
        if (shouldApply("deviceOrientation")) r.deviceOrientation = normalizeDeviceOrientation(el.propDeviceOrientation && el.propDeviceOrientation.value || "horizontal");
        if (shouldApply("deviceInCount")) r.deviceInCount = normalizePortCount(el.propDeviceInCount && el.propDeviceInCount.value, r.deviceInCount || 4);
        if (shouldApply("deviceOutCount")) r.deviceOutCount = normalizePortCount(el.propDeviceOutCount && el.propDeviceOutCount.value, r.deviceOutCount || 4);
        r.deviceInLabels = parsePortLabels((Array.isArray(r.deviceInLabels) ? r.deviceInLabels : []).join(","), r.deviceInCount || 4);
        r.deviceOutLabels = parsePortLabels((Array.isArray(r.deviceOutLabels) ? r.deviceOutLabels : []).join(","), r.deviceOutCount || 4);
        if (shouldApply("devicePortLabel")) {
          const selectedPort = getSelectedDevicePort(r);
          if (selectedPort) {
            const value = String(el.propDevicePortLabel && el.propDevicePortLabel.value || "").trim();
            if (selectedPort.kind === "end") {
              r.deviceOutLabels = parsePortLabels((Array.isArray(r.deviceOutLabels) ? r.deviceOutLabels : []).join(","), r.deviceOutCount || 4);
              r.deviceOutLabels[Math.max(0, selectedPort.cid - 1)] = value || String(selectedPort.cid);
            } else {
              r.deviceInLabels = parsePortLabels((Array.isArray(r.deviceInLabels) ? r.deviceInLabels : []).join(","), r.deviceInCount || 4);
              r.deviceInLabels[Math.max(0, selectedPort.cid - 1)] = value || String(selectedPort.cid);
            }
          }
        }
      }
      if (metricChanged) {
        const oldW = Math.max(1, Number(r.width) || 1);
        const oldH = Math.max(1, Number(r.height) || 1);
        pxFromMetric(r);
        if (typeof isShapeRect === "function" && isShapeRect(r)) {
          scaleShapePointsForRectResize({ rect: r, oldWidth: oldW, oldHeight: oldH, normalizeShapeBounds });
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
      const prev = {
        cellX: t.cellX,
        cellY: t.cellY,
        colorA: t.colorA,
        colorB: t.colorB,
        shapeOpacity: t.shapeOpacity,
        noteIncludeInArtRender: t.noteIncludeInArtRender !== false,
        dataFlow: t.dataFlow,
        dataFlowZ: !!t.dataFlowZ,
        areaM2Px: t.areaM2Px,
        splitVariant: t.splitVariant,
        deviceType: t.deviceType,
        deviceOrientation: t.deviceOrientation
      };
      if (applyColor || shouldApply("colorA")) {
        t.colorA = el.a.value || "#2fcaaf";
        if ((typeof isNoteRect === "function" && isNoteRect(t)) || t.autoContrastB !== false) {
          t.autoContrastB = true;
          t.colorB = (typeof isNoteRect === "function" && isNoteRect(t)) ? noteTextColorForBackground(t.colorA) : autoContrast(t.colorA);
        } else {
          t.colorB = el.b.value || t.colorB;
        }
      }
      if (shouldApply("shapeOpacity") && typeof isShapeRect === "function" && isShapeRect(t)) {
        t.shapeOpacity = shapeOpacityFromTransparencyInput({ inputValue: el.shapeOpacity && el.shapeOpacity.value, fallbackRect: t, evalExpr });
      }
      if (shouldApply("noteIncludeInArtRender") && typeof isNoteRect === "function" && isNoteRect(t)) {
        t.noteIncludeInArtRender = !(el.propNoteArtRender && el.propNoteArtRender.checked === false);
        dropSelectionForHiddenArtNote(t);
      }
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
      if (t.splitVariant !== prevSplit) { try { delete t._splitVariantCount; } catch { t._splitVariantCount = NaN; } }
      const topoChanged = (prev.cellX !== t.cellX || prev.cellY !== t.cellY);
      if (topoChanged) {
        if (prev.cellX !== t.cellX || prev.cellY !== t.cellY) remapRectRigLoadsToBottomSeams(t);
        invalidateRectCache(t, "topology");
      } else {
        if (
          prev.colorA !== t.colorA
          || prev.colorB !== t.colorB
          || prev.shapeOpacity !== t.shapeOpacity
          || prev.noteIncludeInArtRender !== (t.noteIncludeInArtRender !== false)
          || prev.deviceType !== t.deviceType
          || prev.deviceOrientation !== t.deviceOrientation
        ) invalidateRectCache(t, "appearance");
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
    catch { rect._areaM2Expression = expression; }
  } else {
    try { delete rect._areaM2Expression; } catch { rect._areaM2Expression = ""; }
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
        try { cancelFrame(syncPropsRaf); } catch { /* noop */ }
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
  const fieldForEvent = e => fieldForPropNode(el, e && e.currentTarget);
  const applyPropsForKey = (key, opts = {}) => {
    if (key && key !== selectionKey()) return false;
    applyProps({ ...opts, selectionKey: key });
    return true;
  };
  bindEvents(trackedPropInputNodes(el), "focusin", e => rememberSelectionKey(e.currentTarget));
  const scheduleApplyPropsInput = e => {
    const key = keyForEvent(e);
    const field = fieldForEvent(e);
    if (propsInputRaf) return;
    propsInputRaf = requestAnimationFrame(() => {
      propsInputRaf = 0;
      applyPropsForKey(key, { list: false, persist: field === "flowLinkColor", render: true, field });
    });
  };
  bindEvents(liveApplyInputNodes(el), "input", scheduleApplyPropsInput);
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
      if (typeof isNoteRect === "function" && isNoteRect(r)) return;
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
      if (typeof isNoteRect === "function" && isNoteRect(r)) return;
      r.autoContrastB = false;
      r.colorB = el.b.value || r.colorB;
      invalidateRectCache(r, "appearance");
    }, { listRects: true, persist: true, render: true });
    if (!count) return;
    if (el.btnAutoContrast) el.btnAutoContrast.textContent = "Авто дополнительный: выкл";
  });

  bindEvents(changeApplyInputNodes(el), "change", e => { if (applyPropsForKey(keyForEvent(e), { field: fieldForEvent(e) })) syncProps(); });
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

  bindCommitInputs(commitApplyInputNodes(el), e => { if (applyPropsForKey(keyForEvent(e), { field: fieldForEvent(e) })) syncProps(); });

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


