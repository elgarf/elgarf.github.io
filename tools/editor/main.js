import { createProjectCodec } from "./modules/project-codec.js";
import { createEditorDomRefs, createInitialEditorState } from "./modules/app-shell.js";
import { setupI18n, translateText } from "./modules/i18n.js";
import { createToolFsm, createModePredicates } from "./modules/tool-fsm.js";
import { createRectPropSchema } from "./modules/props-schema.js";
import { touchProgressState, setCacheWithPrune } from "./modules/cache-utils.js";
import { autoContrast, hexRgb, hslToRgb, pickByContrast, rgbHex, rgbToHsl, contrastRatio, shadeHex, randomColor, rectTextTheme, bwTextForRgb } from "./modules/utils/color-utils.js";
import { isDeviceRectKind, isNoteExcludedFromContentBounds, isNoteRectKind, isScreenRectKind, isShapeRectKind } from "./modules/utils/rect-kind-utils.js";
import { distToSegment, overlapArea, rads, rectAABB, rectCenter, rectUVToWorld, worldToRectUV, maskCellKey, pointInPoly, getOriginFromRects, createCellFromWorldPoint, hiddenCellBoxes, computeFreeRects, createMaskNodeAxesGetter } from "./modules/utils/geometry.js";
import { toInt, toPosInt, toTrimmed, evalExpr, toRoundedInt, clampInt, toPositiveInt, parseAreaM2PxInput } from "./modules/utils/number-utils.js";
import { fontFamilyCss, escXml } from "./modules/utils/text-utils.js";
import { withNameSuffixBeforeGroup, parseScreenNameGroup } from "./modules/utils/name-group.js";
import { lsGet, lsSet, cloneJson, jsonEquals } from "./modules/utils/storage-json.js";
import { syncModeToggleButton, syncLockButtons } from "./modules/ui/toggles.js";
import { createEventBinders } from "./modules/ui/event-binders.js";
import { setupSplitVariantController } from "./modules/ui/split-variant-controller.js";
import { setupInstallBannerController } from "./modules/ui/install-banner-controller.js";
import { setupProjectLinkModalController } from "./modules/ui/project-link-modal-controller.js";
import { setupNoteEditorController } from "./modules/ui/note-editor-controller.js";
import { setupToolbarController } from "./modules/ui/toolbar-controller.js";
import { setupToolbarActionsController } from "./modules/ui/toolbar-actions-controller.js";
import { setupViewThemeLockController } from "./modules/ui/view-theme-lock-controller.js";
import { setupSpecViewController } from "./modules/ui/spec-view-controller.js";
import { setupToolModeController } from "./modules/ui/tool-mode-controller.js";
import { setupMultiSelectionActionsController } from "./modules/ui/multi-selection-actions-controller.js";
import { setupDragSnapController } from "./modules/ui/drag-snap-controller.js";
import { setupTransientStateController } from "./modules/ui/transient-state-controller.js";
import { setupSelectionController } from "./modules/ui/selection-controller.js";
import { setupSelectionLockController } from "./modules/ui/selection-lock-controller.js";
import { setupProjectActionsFeature } from "./modules/features/project-actions-feature.js";
import { setupProjectIoController } from "./modules/project-io-controller.js";
import { setupRectFactoryController } from "./modules/rect-factory-controller.js";
import { setupProjectSessionController } from "./modules/project/session-controller.js";
import { setupProjectLifecycleController } from "./modules/project/project-lifecycle-controller.js";
import { setupProjectSerializationController } from "./modules/project/project-serialization-controller.js";
import { setupProjectStateController } from "./modules/project-state-controller.js";
import { setupChangeOpsController } from "./modules/state/change-ops.js";
import { setupHistoryController } from "./modules/history-controller.js";
import { setupManualClustersController } from "./modules/manual-clusters-controller.js";
import { setupRigCore } from "./modules/rig-core.js";
import { setupRigInteractionController } from "./modules/rig/interaction.js";
import { setupRigRenderController } from "./modules/rig/render.js";
import { setupFlowLinkFeature } from "./modules/features/flow-link-feature.js";
import * as FlowDrawHelpers from "./modules/flow/draw-helpers.js";
import { setupInterScreenLinksRender } from "./modules/flow/inter-screen-links-render.js";
import { setupFlowEditHitTestController } from "./modules/flow/flow-edit-hit-test-controller.js";
import { setupFlowEditOverlayRender } from "./modules/flow/flow-edit-overlay-render.js";
import { setupFlowRegionRebuilder } from "./modules/flow/flow-region-rebuilder.js";
import { setupVisibleRectGeometry } from "./modules/geometry/visible-rects.js";
import { setupNoteRender } from "./modules/render/note-render.js";
import { setupShapeRender } from "./modules/render/shape-render.js";
import { setupDrawRectStagesController } from "./modules/render/draw-rect-stages.js";
import { setupDrawRectBaseController } from "./modules/render/draw-rect-base.js";
import { setupCellLinkUtilsController } from "./modules/render/cell-link-utils.js";
import { setupTextLayoutController } from "./modules/render/text-layout-controller.js";
import { setupCabinetSummaryUtils } from "./modules/render/cabinet-summary-utils.js";
import { setupRectLayerCacheController } from "./modules/render/rect-layer-cache-controller.js";
import { setupRenderRuntimeFeature } from "./modules/features/render-runtime-feature.js";
import { setupViewportMetricsController } from "./modules/render/viewport-metrics.js";
import { setupViewportOverlays } from "./modules/render/viewport-overlays.js";
import { setupInstallSummaryOverlay } from "./modules/render/install-summary-overlay.js";
import { setupInputController } from "./modules/input-controller.js";
import { setupAppBootstrapFeature } from "./modules/features/app-bootstrap-feature.js";
import { setupSelectionUiFeature } from "./modules/features/selection-ui-feature.js";
import { setupSelectionActionsFeature } from "./modules/features/selection-actions-feature.js";
import { setupMirrorDuplicateFeature } from "./modules/features/mirror-duplicate-feature.js";
import {
  setupPropsPanelFeature,
  setupPropsInputBindingsFeature,
  setupPropertiesSyncController,
  setupPropsUiUtils,
  getAreaM2BadgeLabel,
  getAreaM2PresetValues,
  setAreaM2ExpressionSource,
  updateAreaM2Badge
} from "./modules/features/props-panel-feature.js";
import { setupTargetActionsFeature } from "./modules/features/target-actions-feature.js";
import { setupUiTailFeature } from "./modules/features/ui-tail-feature.js";
import { setupClusterEditController } from "./modules/features/cluster-edit-controller.js";
import { setupEditingToolsCore, setupEditingToolsInput } from "./modules/features/editing-tools-controller.js";
import { buildCalcWorkerScript } from "./modules/calc/worker-script.js";
import { setupCalcWorkerOrchestrator } from "./modules/calc/worker-orchestrator.js";
import { setupRegionsFlowController } from "./modules/calc/regions-flow-controller.js";
import { setupFlowPathUtils } from "./modules/calc/flow-path-utils.js";
import { setupTopologyUtils } from "./modules/calc/topology-utils.js";
import { setupRectCacheCore } from "./modules/calc/rect-cache-core.js";
import { setupFlowLockSyncController } from "./modules/calc/flow-lock-sync-controller.js";
import { setupRectCachePersistenceController } from "./modules/calc/rect-cache-persistence-controller.js";
import { setupFlowRegionConfigController } from "./modules/calc/flow-region-config-controller.js";
import { setupFlowRoutingController } from "./modules/calc/flow-routing-controller.js";
import { setupFlowGroupsController } from "./modules/calc/flow-groups-controller.js";
import { setupRegionsPlannerController } from "./modules/calc/regions-planner-controller.js";
import { setupFlowAnchorPointsController } from "./modules/flow/flow-anchor-points-controller.js";
import {
  rectAABBMaskedKey as buildRectAABBMaskedKey,
  topoCalcKey as buildTopoCalcKey,
  regionCalcKey as buildRegionCalcKey,
  flowCalcKey as buildFlowCalcKey
} from "./modules/calc/cache-keys.js";
import * as ProjectNormalizers from "./modules/project-normalizers.js";
import { setupSpecExportFeature } from "./modules/features/spec-export-feature.js";
import { embedProjectIntoPngBlob, extractProjectFromPngBytes } from "./modules/png-project-meta.js";
import {
  FLOW_DRAW_BATCH_THRESHOLD, FLOW_DRAW_BATCH_STEP, FLOW_POINT_INDEX_CELL,
  INSTALL_HINT_KEY, HELP_SEEN_KEY, SAVE_LOCATION_ID_KEY,
  RIG_DEFAULT_LOAD_KG, LOAD_ICON_VIEWBOX, LOAD_ICON_PATH_D,
  DATA_FLOW_MODES, FLOW_SEARCH_NODE_LIMIT_STRICT, FLOW_SEARCH_NODE_LIMIT_RELAXED, FLOW_REFINE_MAX_POINTS, FLOW_OPTIMIZE_MAX_POINTS, FLOW_DIR_SET,
  PROJECT_CACHE_VERSION,
  SPLIT_VARIANT_MAX, AREA_LIMIT_EPS, REGION_ZONE_COLORS, CALC_TIMEOUT_MS, FLOW_WORKER_TIMEOUT_MS, REGION_WORKER_TIMEOUT_MS, CALC_WORKER_BOOT_URL,
  AUTO_SAVE_KEY, TABS_SAVE_KEY, THEME_MODE_KEY, PERSIST_DEBOUNCE_MS,
  PROJECT_QUERY_PARAM, PROJECT_ID_PARAM, PROJECT_QUERY_VERSION, PROJECT_STORE_API_URL,
  PNG_PROJECT_META_KEY
} from "./modules/constants.js";
const VIEWER_MODE = (() => {
  try {
    const p = new URLSearchParams(location.search || "");
    const byParam = p.get("viewer") === "1";
    const path = String((location && location.pathname) || "").toLowerCase();
    const byPath = path.endsWith("/ledmaskviewer.html") || path.endsWith("ledmaskviewer.html");
    return byParam || byPath;
  } catch {
    return false;
  }
})();
const lsGetSafe = (key, fallback = null) => {
  if (VIEWER_MODE) return fallback;
  return lsGet(key, fallback);
};
const lsSetSafe = (key, value) => {
  if (VIEWER_MODE) return;
  lsSet(key, value);
};
const {
  normalizeSaveLocationId,
  normalizeHiddenCells,
  normalizeManualClusters,
  normalizeRigData,
  normalizeDataFlow,
  normalizeDataFlowZ,
  normalizeFlowLocks,
  normalizeFlowLockRidToSigMap,
  normalizeFlowLockCidToSeedMap,
  normalizeFlowLinks,
  normalizeThemeMode,
  normalizeViewMode,
  normalizeCabinetUnit
} = ProjectNormalizers;
const normalizeCabinetStyles = typeof ProjectNormalizers.normalizeCabinetStyles === "function"
  ? ProjectNormalizers.normalizeCabinetStyles
  : (raw => {
      const src = (raw && typeof raw === "object") ? raw : {};
      const out = {};
      for (const [k, v] of Object.entries(src)) {
        const cid = String(Math.max(0, Math.round(Number(k) || 0)));
        const style = (v && typeof v === "object") ? v : {};
        const diagRaw = String(style.diag || "auto");
        const colorRaw = String(style.color || "auto");
        const diag = ["auto", "right", "left", "rightSwap", "leftSwap"].includes(diagRaw) ? diagRaw : "auto";
        const color = ["auto", "a", "b"].includes(colorRaw) ? colorRaw : "auto";
        if (diag === "auto" && color === "auto") continue;
        out[cid] = { diag, color };
      }
      return out;
    });
const { cv, ctx, overlayCanvas, overlayCtx, wrap, el, desktopToolButtons, mobileToolButtons } = createEditorDomRefs(document);
let ensureMobileDock = () => { };
let hideToolbarOverflowPopup = () => { };
let hideThemePopup = () => { };
let showThemePopup = (_anchorEl = null) => { };
let syncThemePopupLabels = () => { };
let showToolbarOverflowPopup = () => { };
let applyBootstrapClasses = () => { };
let updateToolbarOverflow = () => { };
let overflowHiddenButtons = [];
const st = createInitialEditorState();
let i18n = null;
const tr = value => translateText(value);
const ff = value => fontFamilyCss(value);
const safeDefine = (obj, key, value, enumerable = false) => {
  try {
    Object.defineProperty(obj, key, { value, writable: true, configurable: true, enumerable: !!enumerable });
  } catch {
    obj[key] = value;
  }
  return value;
};
const getRectById = id => {
  const target = Math.round(Number(id) || 0);
  return st.rects.find(it => Math.round(Number(it && it.id) || 0) === target) || null;
};
const isWorkerBootMessage = data => {
  const kind = String(data && data.kind || "");
  return kind === "booted" || kind === "boot-error";
};
const buildWorkerMessage = (kind, reqId, payload) => ({ kind, reqId, payload });
const collectSetValues = value => [...(value && typeof value.forEach === "function" ? value : new Set())];
let flowDrawRenderEpoch = 0;
let resetFlowPointIndexCache = () => { };
let flowDrawKeyForGroups = _groups => "flow-empty";
let drawDataFlowOnRect = (_c, _groups, _w, _h, _z, _opts) => { };
if (FlowDrawHelpers && typeof FlowDrawHelpers.setupFlowDrawController === "function") {
  ({
    flowDrawKeyForGroups,
    drawDataFlowOnRect
  } = FlowDrawHelpers.setupFlowDrawController({
    st,
    FLOW_DRAW_BATCH_THRESHOLD,
    FLOW_DRAW_BATCH_STEP,
    touchProgressState,
    setCacheWithPrune,
    fontFamilyCss: ff,
    getFlowDrawRenderEpoch: () => flowDrawRenderEpoch,
    requestRenderNow: () => render()
  }));
}
const clampTextSize = v => Math.max(6, Math.min(128, Math.round(v)));
const getRectTextSizePx = r => { const lv = Number(r && r.textSize); return Number.isFinite(lv) && lv > 0 ? clampTextSize(lv) : clampTextSize(st.textSize || 12); };
const genSaveLocationId = (seed = "project") => {
  const slug = String(seed || "project")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return normalizeSaveLocationId(`proj-${slug || "project"}`);
};
const getGlobalSaveLocationId = () => {
  try {
    return normalizeSaveLocationId(lsGetSafe(SAVE_LOCATION_ID_KEY, "") || "");
  } catch {
    return "ledmask-default";
  }
};
const setGlobalSaveLocationId = id => {
  const norm = normalizeSaveLocationId(id);
  lsSetSafe(SAVE_LOCATION_ID_KEY, norm);
  return norm;
};
const projectFileBase = () => {
  const raw = st.projectName || "project";
  const base = String(raw).trim() || "project";
  const sanitized = base.replace(/[\\/:*?"<>|]+/g, "_").replace(/\s+/g, " ").trim();
  return sanitized || "project";
};
const viewportMetricsController = setupViewportMetricsController({
  windowRef: window,
  documentRef: document,
  canvas: cv,
  getSidePanel: () => document.getElementById("sidePanel"),
  getCamX: () => st.camX,
  getCamY: () => st.camY,
  getZoom: () => st.zoom
});
const getRightPanelOcclusionPx = viewportMetricsController.getRightPanelOcclusionPx;
const getViewMetrics = viewportMetricsController.getViewMetrics;
const w2s = viewportMetricsController.w2s;
const s2w = viewportMetricsController.s2w;
const noteEditorController = setupNoteEditorController({
  wrap,
  getRectById,
  isNoteRect: r => String((r && r.kind) || "").toLowerCase() === "note",
  invalidateRectCache: (r, kind) => invalidateRectCache(r, kind),
  render: () => render(),
  schedulePersist: kind => schedulePersist(kind),
  rectAABB,
  w2s,
  focusAndSelect: ta => {
    if (!ta) return;
    ta.focus();
    ta.select();
  },
  getZoom: () => st.zoom
});
const ensureNoteEditorEl = noteEditorController.ensureNoteEditorEl;
const closeNoteEditor = noteEditorController.closeNoteEditor;
const openNoteEditor = noteEditorController.openNoteEditor;
const updateNoteEditorOverlay = noteEditorController.updateNoteEditorOverlay;
const zc = viewportMetricsController.zc;
const getOrigin = () => getOriginFromRects(st.rects);
const hiddenCache = new WeakMap();
const getHiddenSet = r => { if (!r) return new Set(); const rec = hiddenCache.get(r); if (!rec || rec.src !== r.hiddenCells) { const next = { src: r.hiddenCells, set: new Set(Array.isArray(r.hiddenCells) ? r.hiddenCells : []) }; hiddenCache.set(r, next); return next.set } return rec.set };
const setHiddenSet = r => { const src = [...getHiddenSet(r)]; r.hiddenCells = src; hiddenCache.set(r, { src: r.hiddenCells, set: new Set(src) }); invalidateRectCache(r, "topology"); };
let getManualClusters = (_r) => [];
let manualClustersSignature = (_r) => "";
let clearRectRegionsAndFlow = (_r) => { };
let findManualClusterById = (_r, _id) => null;
let findManualClusterAtCell = (_r, _col, _row) => null;
let normalizeClusterByMergedComponents = (_r, _cand) => null;
let clusterCanPlace = (_r, _cand, _ignoreId = null) => false;
let upsertManualCluster = (_r, _cluster) => false;
let removeManualCluster = (_r, _id) => false;
let nextManualClusterId = (_r) => 1;
let expandManualCluster = (_r, _id, _dir) => false;
let findShrinkCandidate = (_r, _z, _dir) => null;
let shrinkManualCluster = (_r, _id, _dir) => false;
let rigHasSuspend = (_rig, _col) => false;
let rigHasLink = (_rig, _a, _b) => false;
let getRectRigData = (_r) => normalizeRigData(null);
let setRectRigData = (_r) => { };
let drawLoadIcon = (_c, _x, _y, _size, _opts = {}) => { };
let buildRigLayout = (_r, _cx, _cy, _topo, _hs, _z) => ({ seams: new Map(), bottomLoads: new Map(), anchors: new Map(), ui: 1, loadSizePx: 14, scalePx: 256 });
let remapRectRigLoadsToBottomSeams = (_r) => false;
let resolveRigFrameSeam = (_layout, _cellY, _key) => null;
let sanitizeRectRigFramesToBounds = (_r) => false;
let getRigHitAtPoint = (_r, _wx, _wy, _z) => null;
let applyRigActionAtPoint = (_r, _wx, _wy) => false;
let handleRigPointerDown = (_p) => false;
let handleRigPointerMove = (_p) => false;
let handleRigPointerLeave = () => false;
({
  getManualClusters,
  manualClustersSignature,
  clearRectRegionsAndFlow,
  findManualClusterById,
  findManualClusterAtCell,
  normalizeClusterByMergedComponents,
  clusterCanPlace,
  upsertManualCluster,
  removeManualCluster,
  nextManualClusterId,
  expandManualCluster,
  findShrinkCandidate,
  shrinkManualCluster
} = setupManualClustersController({
  st,
  normalizeManualClusters,
  invalidateRectCache: (r, reason) => invalidateRectCache(r, reason),
  drawCellX: r => drawCellX(r),
  drawCellY: r => drawCellY(r),
  getCellTopologyCached: (r, cx, cy) => getCellTopologyCached(r, cx, cy),
  AREA_LIMIT_EPS
}));
({
  rigHasSuspend,
  rigHasLink,
  getRectRigData,
  setRectRigData,
  drawLoadIcon
} = setupRigCore({
  normalizeRigData,
  sanitizeRectRigFramesToBounds: r => sanitizeRectRigFramesToBounds(r),
  invalidateRectCache: (r, reason) => invalidateRectCache(r, reason),
  LOAD_ICON_VIEWBOX,
  LOAD_ICON_PATH_D
}));
const clearFlowLockMemory = r => {
  if (!r || typeof r !== "object") return;
  try { delete r._flowLockRidToSig; } catch { r._flowLockRidToSig = {}; }
  try { delete r._flowLockSigToCfg; } catch { r._flowLockSigToCfg = {}; }
  try { delete r._flowLockCidToSeed; } catch { r._flowLockCidToSeed = {}; }
};
let cellFromWorldPoint = (_r, _wx, _wy, _skipHidden = true) => null;
const {
  isMaskMode,
  isCellEditMode,
  isCabinetEditMode,
  isClusterEditMode,
  isRigEditMode,
  isNoteMode
} = createModePredicates(st);
const arrSignatureCache = new WeakMap();
const listSignature = v => {
  if (!Array.isArray(v) || !v.length) return "";
  const rec = arrSignatureCache.get(v);
  if (rec && rec.len === v.length && rec.first === v[0] && rec.last === v[v.length - 1]) return rec.sig;
  const sig = v.join(";");
  arrSignatureCache.set(v, { len: v.length, first: v[0], last: v[v.length - 1], sig });
  return sig;
};
const drawCellX = r => Math.max(32, Math.max(1, Math.round(r.cellX || 128)));
const drawCellY = r => Math.max(32, Math.max(1, Math.round(r.cellY || 128)));
cellFromWorldPoint = createCellFromWorldPoint({
  drawCellX: r => drawCellX(r),
  drawCellY: r => drawCellY(r),
  getHiddenSet,
  worldToRectUV
});
const getMaskNodeAxes = createMaskNodeAxesGetter(r => drawCellX(r), r => drawCellY(r));
const rectAABBMaskedKey = r => buildRectAABBMaskedKey(r, drawCellX, drawCellY, listSignature);
let getRectCalcCache = (_r) => ({});
let invalidateRectCache = (_r, _reason) => { };
let getCellTopologyCached = (_r, _cx, _cy) => null;
let planNumberRegions = (_r, _cx, _cy, _topo, _hs, _useCache = true) => buildSingleRegionPlan(_r, _cx, _cy, _topo, _hs);
let getDataFlowGroups = (_r, _cx, _cy, _topo, _hs, _regions) => [];
const {
  computeRectAABBMasked,
  rectAABBMasked,
  rectIntersectsSelectionBoxVisible
} = setupVisibleRectGeometry({
  drawCellX,
  drawCellY,
  getHiddenSet,
  getRectCalcCache: r => getRectCalcCache(r),
  buildRectAABBMaskedKey: r => rectAABBMaskedKey(r),
  rectAABB,
  rectUVToWorld,
  maskCellKey
});
const parseLinkKey = k => { const p = String(k || "").split("-"); if (p.length !== 2) return null; const a = +p[0], b = +p[1]; if (!(a >= 0 && b >= 0 && a !== b)) return null; return a < b ? { a, b } : { a: b, b: a } };
const mkLinkKey = (a, b) => a < b ? `${a}-${b}` : `${b}-${a}`;
const {
  getCellTopology,
  topoCalcKey,
  buildSingleRegionPlan
} = setupTopologyUtils({
  parseLinkKey,
  mkLinkKey,
  buildTopoCalcKey,
  listSignature,
  maskCellKey
});
const {
  sortNums,
  buildSnakeOrder,
  buildZOrder,
  flowBoxGap,
  ptX,
  ptY,
  segIntersects,
  wouldSelfCross,
  flowCandidateOrder,
  flowSearchOrder,
  flowDist,
  flowPathLength,
  pathSelfCrosses,
  flowCrossCount,
  flowPathCost,
  optimizeFlowPathShortest,
  refineFlowOrder
} = setupFlowPathUtils({
  FLOW_REFINE_MAX_POINTS,
  FLOW_SEARCH_NODE_LIMIT_STRICT,
  FLOW_SEARCH_NODE_LIMIT_RELAXED
});
({
  getRectCalcCache,
  invalidateRectCache,
  getCellTopologyCached
} = setupRectCacheCore({
  makeNonEnumerableCalcCache: (...args) => makeNonEnumerableCalcCache(...args),
  topoCalcKey,
  getCellTopology
}));
const getRectRuntime = (r, opts = null) => {
  const o = (opts && typeof opts === "object") ? opts : {};
  const cx = drawCellX(r);
  const cy = drawCellY(r);
  const topo = getCellTopologyCached(r, cx, cy);
  const hs = getHiddenSet(r);
  const out = { cx, cy, topo, hs, regions: null, groups: null };
  if (o.withRegions || o.withGroups) out.regions = planNumberRegions(r, cx, cy, topo, hs, true);
  if (o.withGroups) out.groups = getDataFlowGroups(r, cx, cy, topo, hs, out.regions);
  return out;
};
const {
  getRectComponentRenderDataCached,
  getMaskRenderDataCached,
  getVisibleBoundarySegmentsCached,
  getRectFillLayerCached,
  getRectDecorLayerCached,
  getRectFlowPassiveLayerCached
} = setupRectLayerCacheController({
  getRectCalcCache,
  topoCalcKey,
  listSignature,
  maskCellKey,
  getVisibleBoundarySegmentsLocal: (...args) => getVisibleBoundarySegmentsLocal(...args),
  hexRgb,
  shadeHex,
  flowDrawKeyForGroups,
  drawDataFlowOnRect: (...args) => drawDataFlowOnRect(...args)
});
const regionCalcKey = (r, cx, cy, topo) => buildRegionCalcKey(r, cx, cy, topo, {
  listSignature,
  manualClustersSignature
});
const flowCalcKey = (r, cx, cy, topo, regions) => buildFlowCalcKey(r, cx, cy, topo, regions, {
  normalizeDataFlow,
  flowLocksSignature
});
const flowLocksSignature = r => {
  const locks = normalizeFlowLocks(r && r.flowLocks), parts = [];
  for (const key of Object.keys(locks).sort((a, b) => (+a) - (+b))) {
    const cfg = locks[key] || {}, arr = Array.isArray(cfg.locks) ? cfg.locks : [];
    const manualOrder = Array.isArray(cfg.manualOrder) ? cfg.manualOrder : [];
    const startPart = ((cfg.startPinned && cfg.startCid != null) || cfg.startDir) ? `@${cfg.startPinned && cfg.startCid != null ? cfg.startCid : ""}:${cfg.startDir || ""}:${cfg.startPinned ? "1" : "0"}` : "";
    const modePart = (cfg.mode && cfg.mode !== "none") ? `#${cfg.mode}` : "";
    const manualPart = cfg.manual ? `!${manualOrder.join(",")}` : "";
    if (!arr.length && !startPart && !modePart && !manualPart) continue;
    parts.push(`${key}:${arr.map(it => `${it.index}-${it.cid}`).join(",")}${startPart}${modePart}${manualPart}`);
  }
  return parts.join("|");
};
const {
  cloneFlowRegionConfig,
  buildFlowLockSignatureSnapshot,
  syncFlowLocksWithRegions
} = setupFlowLockSyncController({
  normalizeFlowLocks,
  FLOW_DIR_SET,
  DATA_FLOW_MODES,
  getRectRuntime: (...args) => getRectRuntime(...args)
});
const makeNonEnumerableCalcCache = (r, value) => {
  safeDefine(r, "_calcCache", value, false);
};
const {
  buildPersistedRectCache,
  restorePersistedRectCache
} = setupRectCachePersistenceController({
  PROJECT_CACHE_VERSION,
  getRectCalcCache: r => getRectCalcCache(r),
  toLetters: (...args) => toLetters(...args)
});
const {
  getFlowRegionConfig,
  rememberFlowRegionConfig,
  getFlowLocksRegion,
  getFlowStartRoutingRegion,
  getFlowModeRegion,
  setFlowLock,
  setFlowStart,
  setFlowDirection,
  setFlowRegionMode,
  resetFlowRegionOverrides,
  setManualFlowOrder,
  updateManualFlowPoint,
  dragManualFlowPoint
} = setupFlowRegionConfigController({
  normalizeFlowLocks,
  normalizeDataFlow,
  FLOW_DIR_SET,
  getRectCalcCache: r => getRectCalcCache(r),
  cloneFlowRegionConfig
});
const {
  resolveFlowModeFromStartAndDir,
  applyFlowStartRouting,
  applyFlowLocksToOrdered
} = setupFlowRoutingController({
  FLOW_DIR_SET,
  normalizeDataFlow,
  flowDist,
  wouldSelfCross,
  pathSelfCrosses,
  flowPathLength,
  checkCalcTimeout: budget => checkCalcTimeout(budget)
});
const {
  getDataFlowGroupsUncached
} = setupFlowGroupsController({
  normalizeDataFlow,
  maskCellKey,
  buildZOrder,
  buildSnakeOrder,
  getFlowRegionConfig,
  getFlowStartRoutingRegion,
  resolveFlowModeFromStartAndDir,
  getFlowModeRegion,
  getFlowLocksRegion,
  FLOW_DIR_SET,
  pathSelfCrosses,
  refineFlowOrder,
  FLOW_OPTIMIZE_MAX_POINTS,
  optimizeFlowPathShortest,
  flowPathCost,
  applyFlowStartRouting,
  applyFlowLocksToOrdered,
  FLOW_SEARCH_NODE_LIMIT_STRICT,
  flowSearchOrder,
  toLetters: (...args) => toLetters(...args),
  REGION_ZONE_COLORS,
  checkCalcTimeout: budget => checkCalcTimeout(budget)
});
const {
  getSplitFlowMarkerWorldPositions,
  collectFlowLinkAnchors,
  collectFlowEditPoints,
  collectFlowManualPickPoints
} = setupFlowAnchorPointsController({
  st,
  rectUVToWorld,
  maskCellKey,
  getFlowRegionConfig,
  getFlowStartRoutingRegion,
  FLOW_DIR_SET
});
const {
  flowAnchorKey,
  flowLinkKeyOf,
  findFlowAnchorByEndpoint,
  pruneFlowLinks,
  canLinkFlowAnchors,
  toggleFlowLinkBetween,
  addFlowLinkBetween,
  findFlowLinkAtPoint,
  findFlowLinkAnchorAtPoint,
  findFlowCurveHandleAtPoint,
  setFlowLinkManualBezierPoint,
  moveFlowLinkOrthogonalSegment,
  deleteFlowLinkOrthogonalSegment,
  clearFlowLinkManualBezier,
  updateFlowLinkDragTarget
} = setupFlowLinkFeature({
  st,
  normalizeFlowLinks,
  getRectRuntime,
  drawCellX,
  drawCellY,
  getCellTopologyCached,
  rectAABBMasked,
  AREA_LIMIT_EPS,
  getFlowDrawRenderEpoch: () => flowDrawRenderEpoch,
  getSplitFlowMarkerWorldPositions,
  rectUVToWorld
});
const { drawInterScreenFlowLinks, drawFlowLinkCurveHandlesOverlay } = setupInterScreenLinksRender({
  st,
  isCellEditMode: () => isCellEditMode(),
  isRigEditMode: () => isRigEditMode(),
  normalizeViewMode,
  normalizeFlowLinks,
  flowAnchorKey,
  flowLinkKeyOf,
  findFlowAnchorByEndpoint
});
let findFlowStartHandle = (_wx, _wy, _rid = null) => null;
let findFlowDirectionButton = (_wx, _wy, _rid = null) => null;
let findFlowResetButton = (_wx, _wy, _rid = null) => null;
let findFlowEditPoint = (_wx, _wy, _rid = null, _minIndex = 0) => null;
({
  findFlowStartHandle,
  findFlowDirectionButton,
  findFlowResetButton,
  findFlowEditPoint,
  resetFlowPointIndexCache
} = setupFlowEditHitTestController({
  st,
  FLOW_POINT_INDEX_CELL
}));
const { drawFlowEditOverlay } = setupFlowEditOverlayRender({
  st,
  fontFamilyCss: ff,
  t: tr
});
const {
  collectClusterHandles,
  findClusterHandle,
  findClusterStartMarker,
  findActiveClusterBorder,
  updateClusterEditCursor,
  drawClusterEditOverlay
} = setupClusterEditController({
  st,
  cv,
  clusterCanPlace,
  findShrinkCandidate,
  rectUVToWorld,
  getManualClusters,
  drawCellX,
  drawCellY,
  worldToRectUV,
  findManualClusterById,
  isClusterEditMode,
  fontFamilyCss: ff,
  toLetters: value => toLetters(value)
});

const {
  getCellLinkCandidateAtPoint,
  getComponentBoundarySegments,
  getVisibleBoundarySegmentsLocal
} = setupCellLinkUtilsController({
  mkLinkKey,
  rectUVToWorld,
  getCellTopology,
  getCellTopologyCached,
  drawCellX,
  drawCellY,
  getZoom: () => st.zoom,
  maskCellKey
});
const {
  chooseTextLayout,
  getRectTextLayoutCached
} = setupTextLayoutController({
  overlapArea,
  getRectCalcCache
});
const mRound = v => Math.round(v * 10000) / 10000;
const mFmt = v => { const n = mRound(v); return Number.isInteger(n) ? `${n.toFixed(0)}` : `${n}` };
const {
  fillPercent,
  buildVisibleCabinetSummary
} = setupCabinetSummaryUtils({
  maskCellKey,
  mFmt,
  topoCalcKey,
  listSignature,
  getRectCalcCache: r => getRectCalcCache(r),
  t: tr
});
const pctFmt = v => { const n = Number.isFinite(+v) ? +v : 0; const t = Math.trunc(n * 100) / 100; return t.toFixed(2) };
const calcNow = () => ((typeof performance !== "undefined" && performance && typeof performance.now === "function") ? performance.now() : Date.now());
const calcMetrics = { regions: { calls: 0, totalMs: 0, maxMs: 0, lastMs: 0, slow: 0, timeouts: 0 }, flow: { calls: 0, totalMs: 0, maxMs: 0, lastMs: 0, slow: 0, timeouts: 0 } };
const makeCalcBudget = () => ({ deadline: calcNow() + CALC_TIMEOUT_MS, probes: 0, timedOut: false });
const checkCalcTimeout = budget => {
  if (!budget) return false;
  budget.probes = (budget.probes | 0) + 1;
  if ((budget.probes & 63) !== 0) return false;
  if (calcNow() > budget.deadline) { budget.timedOut = true; return true; }
  return false;
};
const markCalcMetric = (kind, ms, timedOut) => {
  const dst = calcMetrics && calcMetrics[kind];
  if (!dst) return;
  const dur = Math.max(0, Number(ms) || 0);
  dst.calls++;
  dst.totalMs += dur;
  dst.lastMs = dur;
  if (dur > dst.maxMs) dst.maxMs = dur;
  if (dur > CALC_TIMEOUT_MS) dst.slow++;
  if (timedOut) dst.timeouts++;
};
try { if (typeof window !== "undefined") window.ledMaskCalcMetrics = calcMetrics; } catch { /* noop */ }
const toLetters = i => { let n = Math.max(0, Math.floor(i)) + 1, s = ""; while (n > 0) { n--; s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) } return s };
const {
  splitIndicesBySize,
  planNumberRegionsUncached
} = setupRegionsPlannerController({
  calcNow,
  CALC_TIMEOUT_MS,
  checkCalcTimeout: budget => checkCalcTimeout(budget),
  buildSingleRegionPlan: (r, cx, cy, topo, hs) => buildSingleRegionPlan(r, cx, cy, topo, hs),
  safeDefine,
  maskCellKey,
  AREA_LIMIT_EPS,
  SPLIT_VARIANT_MAX,
  normalizeDataFlow,
  buildZOrder,
  buildSnakeOrder,
  getFlowRegionConfig,
  getFlowStartRoutingRegion,
  resolveFlowModeFromStartAndDir,
  getFlowModeRegion,
  getFlowLocksRegion,
  FLOW_DIR_SET,
  pathSelfCrosses,
  refineFlowOrder,
  FLOW_OPTIMIZE_MAX_POINTS,
  optimizeFlowPathShortest,
  flowPathCost,
  applyFlowStartRouting,
  applyFlowLocksToOrdered,
  FLOW_SEARCH_NODE_LIMIT_STRICT,
  flowSearchOrder,
  toLetters: (...args) => toLetters(...args),
  REGION_ZONE_COLORS
});
const calcWorkerScript = buildCalcWorkerScript({
  constants: {
    FLOW_WORKER_TIMEOUT_MS,
    REGION_WORKER_TIMEOUT_MS,
    CALC_TIMEOUT_MS: 30000,
    FLOW_SEARCH_NODE_LIMIT_STRICT,
    FLOW_SEARCH_NODE_LIMIT_RELAXED,
    FLOW_REFINE_MAX_POINTS,
    FLOW_OPTIMIZE_MAX_POINTS,
    SPLIT_VARIANT_MAX,
    AREA_LIMIT_EPS,
    REGION_ZONE_COLORS,
    DATA_FLOW_MODES,
    FLOW_DIR_SET
  },
  fns: {
    calcNow, makeCalcBudget, checkCalcTimeout, maskCellKey, toLetters, splitIndicesBySize,
    normalizeDataFlow, sortNums, buildSnakeOrder, buildZOrder, flowDist, flowBoxGap, ptX, ptY,
    segIntersects, wouldSelfCross, flowCandidateOrder, flowSearchOrder, flowPathLength,
    pathSelfCrosses, flowCrossCount, flowPathCost, optimizeFlowPathShortest, refineFlowOrder,
    buildSingleRegionPlan, normalizeFlowLocks, getFlowRegionConfig, getFlowLocksRegion,
    getFlowStartRoutingRegion, getFlowModeRegion, resolveFlowModeFromStartAndDir,
    applyFlowStartRouting, applyFlowLocksToOrdered, getDataFlowGroupsUncached,
    planNumberRegionsUncached
  }
});
let resetCalcWorkers = () => { };
let scheduleRegionCalcWorker = (_r, _key, _cx, _cy, _topo, _hs) => { };
let scheduleFlowCalcWorker = (_r, _key, _cx, _cy, _topo, _hs, _regions) => { };
let applySplitVariantLimitFromRegions = (_r, _regions) => { };
let flowGroupsStats = (_groups) => ({ flowCount: 0, totalFlowLen: 0 });
let logFlowCalcSummary = (_rectId, _key, _groups, _extra) => { };
({
  resetCalcWorkers,
  scheduleRegionCalcWorker,
  scheduleFlowCalcWorker
} = setupCalcWorkerOrchestrator({
  safeDefine,
  render: () => render(),
  getRectById: id => getRectById(id),
  getRectCalcCache: r => getRectCalcCache(r),
  makeCalcBudget: () => makeCalcBudget(),
  calcNow,
  markCalcMetric: (kind, ms, timedOut) => markCalcMetric(kind, ms, timedOut),
  logFlowCalcSummary: (rectId, key, groups, extra) => logFlowCalcSummary(rectId, key, groups, extra),
  buildSingleRegionPlan: (rr, cx, cy, topo, hs) => buildSingleRegionPlan(rr, cx, cy, topo, hs),
  syncFlowLocksWithRegions: (rr, value, topo) => syncFlowLocksWithRegions(rr, value, topo),
  applySplitVariantLimitFromRegions: (rr, value) => applySplitVariantLimitFromRegions(rr, value),
  collectSetValues,
  normalizeManualClusters,
  normalizeFlowLocks,
  toLetters,
  buildWorkerMessage,
  isWorkerBootMessage,
  planNumberRegionsUncached: (rr, cx, cy, topo, hs, budget) => planNumberRegionsUncached(rr, cx, cy, topo, hs, budget),
  getDataFlowGroupsUncached: (rr, cx, cy, topo, hs, regions, budget) => getDataFlowGroupsUncached(rr, cx, cy, topo, hs, regions, budget),
  CALC_WORKER_BOOT_URL,
  REGION_WORKER_TIMEOUT_MS,
  FLOW_WORKER_TIMEOUT_MS,
  calcWorkerScript
}));
({
  planNumberRegions,
  getDataFlowGroups,
  applySplitVariantLimitFromRegions,
  flowGroupsStats,
  logFlowCalcSummary
} = setupRegionsFlowController({
  st,
  safeDefine,
  getRectCalcCache: r => getRectCalcCache(r),
  regionCalcKey: (r, cx, cy, topo) => regionCalcKey(r, cx, cy, topo),
  flowCalcKey: (r, cx, cy, topo, regions) => flowCalcKey(r, cx, cy, topo, regions),
  syncFlowLocksWithRegions: (r, value, topo) => syncFlowLocksWithRegions(r, value, topo),
  buildSingleRegionPlan: (r, cx, cy, topo, hs) => buildSingleRegionPlan(r, cx, cy, topo, hs),
  scheduleRegionCalcWorker: (r, key, cx, cy, topo, hs) => scheduleRegionCalcWorker(r, key, cx, cy, topo, hs),
  scheduleFlowCalcWorker: (r, key, cx, cy, topo, hs, regions) => scheduleFlowCalcWorker(r, key, cx, cy, topo, hs, regions),
  planNumberRegionsUncached: (r, cx, cy, topo, hs, budget) => planNumberRegionsUncached(r, cx, cy, topo, hs, budget),
  getDataFlowGroupsUncached: (r, cx, cy, topo, hs, regions, budget) => getDataFlowGroupsUncached(r, cx, cy, topo, hs, regions, budget),
  makeCalcBudget: () => makeCalcBudget(),
  calcNow,
  markCalcMetric: (kind, ms, timedOut) => markCalcMetric(kind, ms, timedOut),
  FLOW_WORKER_TIMEOUT_MS,
  REGION_WORKER_TIMEOUT_MS,
  SPLIT_VARIANT_MAX,
  updateSplitVariantControl: r => updateSplitVariantControl(r),
  flowDist
}));
let persistNow = () => { };
let schedulePersist = (_kind = "project") => { };
let setSaveIndicator = (_text, _tone = "secondary") => { };
let saveStatus = {
  saving: () => { },
  saved: (_text) => { },
  error: (_text) => { },
  idle: (_text) => { }
};
const hideStartupLoader = () => {
  if (typeof window.ledMaskHideStartupLoader === "function") {
    window.ledMaskHideStartupLoader();
    return;
  }
  const node = document.getElementById("appLoadingScreen");
  if (!node) return;
  node.classList.add("is-hidden");
  window.setTimeout(() => { if (node.parentNode) node.parentNode.removeChild(node); }, 220);
};
let getActiveTab = () => st.tabs.find(t => t.id === st.activeTabId) || null;
let syncActiveTabSnapshot = () => { };
let renderProjectTabs = () => { };
let buildTabsBundle = () => ({ version: 1, nextTabId: 2, activeTabId: 1, tabs: [] });
let openProjectTab = (_tabId) => { };
let createProjectTab = (_data) => { };
let closeProjectTab = (_tabId) => { };
let initHistoryCurrent = () => { };
let historyCommitIfChanged = () => { };
let undoHistory = () => { };
let redoHistory = () => { };
let resetHistoryUi = () => { };
let applyProjectData = (_d, _opts) => { };
let restoreAutoSave = () => false;
let resetMaskTransient = () => { };
let resetCellTransient = () => { };
let resetFlowHoverTransient = () => { };
let resetClusterHoverTransient = () => { };
let resetRigHoverTransient = () => { };
let resetSelectionTransient = () => { };
let cancelActiveDrag = () => false;
let resetTransientState = (_full = false) => { };
let getRectsBBox = (_rects) => null;
let normSelSet = () => { };
let refreshMultiSelectionBase = () => { };
let setSelection = (_ids, _activeId = null) => { };
let selBoxBounds = (_box) => null;
let boxSize = (_box) => ({ w: 0, h: 0 });
let rectIntersectsBox = (_bb, _b) => false;
let beginSelectionBox = (_p, _append = false, _touch = false) => { };
let updateSelectionBox = (_p) => { };
let finishSelectionBox = () => false;
let isSelected = (_id) => false;
let getSelectedRects = () => [];
let selectOnly = (_id) => { };
let toggleSelect = (_id) => { };
let selRect = (_id, _opts) => { };
let cur = () => null;
let syncProps = () => { };
let listRects = () => { };
const {
  bindClick,
  bindEvent,
  bindWindowEvent,
  bindEvents,
  eventClosest,
  bindCommitInputs,
  focusAndSelect
} = createEventBinders({
  bindCommitInput: (...args) => bindCommitInput(...args)
});
const toolbarController = setupToolbarController({
  documentRef: document,
  windowRef: window,
  el,
  st,
  bindEvent,
  mobileToolButtons,
  applyThemeMode: (mode, persist) => applyThemeMode(mode, persist),
  t: tr
});
ensureMobileDock = toolbarController.ensureMobileDock;
hideToolbarOverflowPopup = toolbarController.hideToolbarOverflowPopup;
hideThemePopup = toolbarController.hideThemePopup;
const showThemePopupBase = toolbarController.showThemePopup;
syncThemePopupLabels = typeof toolbarController.syncThemePopupLabels === "function" ? toolbarController.syncThemePopupLabels : () => { };
const showToolbarOverflowPopupBase = toolbarController.showToolbarOverflowPopup;
showThemePopup = (...args) => {
  if (typeof showThemePopupBase === "function") showThemePopupBase(...args);
  if (i18n && el.themePopup) i18n.translateDom(el.themePopup);
};
showToolbarOverflowPopup = (...args) => {
  if (typeof showToolbarOverflowPopupBase === "function") showToolbarOverflowPopupBase(...args);
  if (i18n && el.overflowPopup) i18n.translateDom(el.overflowPopup);
};
applyBootstrapClasses = toolbarController.applyBootstrapClasses;
updateToolbarOverflow = toolbarController.updateToolbarOverflow;
overflowHiddenButtons = toolbarController.overflowHiddenButtons;
ensureMobileDock();
applyBootstrapClasses();
const scheduleFontReadyRender = (state, delay = 140) => {
  if (!state || typeof state !== "object") return;
  if (state.timer) clearTimeout(state.timer);
  state.timer = setTimeout(() => ensureFontReady().then(() => render()).catch(() => { }), Math.max(0, Math.round(Number(delay) || 0)));
};
let refreshPropsListRender = () => { };
let persistProjectAndRender = () => { };
let refreshPanels = () => { };
let commitProjectChange = (_opts = {}) => { };
let commitUiUpdate = (_opts = {}) => { };
let buildFlowSpecTextForView = () => "";
let updateSpecViewUi = (_force = false) => { };
let refreshSpecAuto = (_force = false) => { };
let flushSpecCustomEditors = () => { };
({
  updateSpecViewUi,
  refreshAutoSpec: refreshSpecAuto,
  flushCustomEditorsToState: flushSpecCustomEditors
} = setupSpecViewController({
  st,
  el,
  wrap,
  normalizeViewMode,
  commitProjectChange: opts => commitProjectChange(opts),
  getAutoSpecText: () => buildFlowSpecTextForView(),
  getLanguage: () => i18n ? i18n.getLanguage() : "",
  t: tr
}));
const isInstallViewMode = () => normalizeViewMode(st.viewMode) === "install";
const isInstallOnlyToolMode = m => m === "flowEdit" || m === "clusterEdit" || m === "rigEdit";
const toolFsm = createToolFsm({
  isInstallOnlyToolMode,
  isInstallViewMode,
  defaultMode: "select"
});
const updateInstallToolAvailability = () => {
  const allow = isInstallViewMode();
  for (const b of [el.toolFlowEdit, el.toolClusterEdit, el.toolRigEdit, el.mToolFlowEdit, el.mToolClusterEdit, el.mToolRigEdit]) {
    if (!b) continue;
    b.disabled = !allow;
    b.setAttribute("aria-disabled", allow ? "false" : "true");
  }
};
const setButtonsEnabled = (buttons, enabled) => {
  const allow = !!enabled;
  for (const b of buttons) {
    if (!b) continue;
    b.disabled = !allow;
    b.setAttribute("aria-disabled", allow ? "false" : "true");
  }
};
const isCopyableRect = r => !!r && (
  isScreenRectKind(r)
  || isShapeRect(r)
  || isNoteRect(r)
  || isDeviceRect(r)
);
const getSelectionIdsSnapshot = () => {
  const ids = new Set();
  if (st && st.selSet && typeof st.selSet.forEach === "function") st.selSet.forEach(id => ids.add(id));
  if (st && st.sel != null) ids.add(st.sel);
  return [...ids];
};
const hasSelectedFlowLink = () => {
  const key = String(st && st.flowLinkSelectedKey || "");
  if (!key) return false;
  const list = Array.isArray(st && st.flowLinks) ? st.flowLinks : [];
  return list.some(link => flowLinkKeyOf(link) === key);
};
const updateSelectionActionButtonsAvailability = () => {
  const selectedIds = getSelectionIdsSnapshot();
  const selectedRects = selectedIds.map(id => getRectById(id)).filter(Boolean);
  const canCopy = selectedRects.some(r => isCopyableRect(r));
  const canDeleteRects = selectedRects.some(r => isCopyableRect(r) && !isRectLocked(r));
  const canDelete = canDeleteRects || hasSelectedFlowLink();
  setButtonsEnabled([el.btnCopy, el.btnCopyMirror, el.mCopy, el.mCopyMirror], canCopy);
  setButtonsEnabled([el.btnDelete, el.mDelete], canDelete);
};
const viewThemeLockController = setupViewThemeLockController({
  windowRef: window,
  documentRef: document,
  st,
  el,
  normalizeThemeMode,
  normalizeViewMode,
  syncModeToggleButton,
  syncLockButtons,
  updateInstallToolAvailability,
  onViewModeUiUpdated: updateSpecViewUi,
  refreshToolButtons: () => setMode(st.mode),
  commitProjectChange: opts => commitProjectChange(opts),
  setMode: m => setMode(m),
  cancelActiveDrag: () => cancelActiveDrag(),
  isInstallOnlyToolMode,
  lsSet: lsSetSafe,
  THEME_MODE_KEY,
  listRects: () => listRects(),
  render: () => render()
});
const themeMedia = viewThemeLockController.themeMedia;
const resolveThemeMode = viewThemeLockController.resolveThemeMode;
const updateViewModeUi = (...args) => {
  viewThemeLockController.updateViewModeUi(...args);
  updateSpecViewUi();
};
const updateLockAllUi = viewThemeLockController.updateLockAllUi;
const setLockAll = viewThemeLockController.setLockAll;
const setViewMode = (mode, persist = true) => viewThemeLockController.setViewMode(
  VIEWER_MODE
    ? (normalizeViewMode(mode) === "spec" ? "spec" : "install")
    : mode,
  persist
);
const updateThemeUi = viewThemeLockController.updateThemeUi;
const applyThemeMode = viewThemeLockController.applyThemeMode;
const serializeRectForProject = r => {
  const out = { ...r };
  delete out._calcCache;
  const snap = buildFlowLockSignatureSnapshot(r);
  out.flowLockRidToSig = normalizeFlowLockRidToSigMap(snap && snap.ridToSig);
  out.flowLockCidToSeed = normalizeFlowLockCidToSeedMap(snap && snap.cidToSeed);
  safeDefine(r, "_flowLockRidToSig", { ...out.flowLockRidToSig }, false);
  safeDefine(r, "_flowLockCidToSeed", { ...out.flowLockCidToSeed }, false);
  const pc = buildPersistedRectCache(r);
  if (pc) out.projectCache = pc; else delete out.projectCache;
  return out;
};
let buildProject = () => ({ version: 1, projectName: "Новый проект", saveLocationId: "", camera: { x: 0, y: 0, zoom: 1 }, settings: { textSize: 32, fontFamily: "Roboto", scale: 256, viewMode: "art", specCustomText: "", specCustomSections: {}, lockAll: false, installLayers: { contours: true, text: true, flow: true, devices: true, rig: true }, snap: { grid: false, objects: true, centers: true, gaps: true } }, nextId: 1, flowLinks: [], rectangles: [] });
let cloneProjectData = data => cloneJson(data, () => buildProject());
let makeEmptyProjectData = (name = translateText("Новый проект")) => ({ version: 1, projectName: name, saveLocationId: genSaveLocationId(name), camera: { x: 0, y: 0, zoom: 1 }, settings: { textSize: 32, fontFamily: "Roboto", scale: 256, viewMode: "art", specCustomText: "", specCustomSections: {}, lockAll: false, installLayers: { contours: true, text: true, flow: true, devices: true, rig: true }, snap: { grid: false, objects: true, centers: true, gaps: true } }, nextId: 1, flowLinks: [], rectangles: [] });
let buildPortableProjectBase = (_strip) => _strip(buildProject());
let buildPortableProject = () => buildPortableProjectBase(stripProjectCaches);
({
  buildProject,
  cloneProjectData,
  makeEmptyProjectData,
  buildPortableProject: buildPortableProjectBase
} = setupProjectSerializationController({
  st,
  normalizeViewMode,
  normalizeFlowLinks,
  serializeRectForProject: r => serializeRectForProject(r),
  genSaveLocationId: name => genSaveLocationId(name),
  cloneJson: (data, fallbackFactory) => cloneJson(data, fallbackFactory),
  t: tr
}));
const projectCodec = createProjectCodec({
  PROJECT_QUERY_VERSION,
  buildProject: () => buildProject(),
  cloneProjectData: data => cloneProjectData(data),
  autoContrast,
  normalizeFlowLocks,
  normalizeFlowLockRidToSigMap,
  normalizeFlowLockCidToSeedMap,
  normalizeRigData
});
const stripProjectCaches = data => projectCodec.stripProjectCaches(data || buildProject());
const compactProjectForQuery = data => projectCodec.compactProjectForQuery(data || buildProject());
buildPortableProject = () => buildPortableProjectBase(stripProjectCaches);
const encodeProjectToQueryValue = async data => await projectCodec.encodeProjectToQueryValue(data || buildProject());
const decodeProjectFromQueryValue = async raw => await projectCodec.decodeProjectFromQueryValue(raw);
const {
  saveProjectToServer,
  getProjectDataFromQueryParam,
  clearProjectQueryParamFromUrl
} = setupProjectIoController({
  PROJECT_STORE_API_URL,
  PROJECT_ID_PARAM,
  PROJECT_QUERY_PARAM,
  toTrimmed,
  toPosInt,
  decodeProjectFromQueryValue
});
({
  getActiveTab,
  syncActiveTabSnapshot,
  renderProjectTabs,
  buildTabsBundle,
  openProjectTab,
  createProjectTab,
  closeProjectTab,
  setSaveIndicator,
  saveStatus,
  persistNow,
  schedulePersist
} = setupProjectSessionController({
  st,
  el,
  wrap,
  bindEvent,
  eventClosest,
  render: () => render(),
  cloneProjectData: data => cloneProjectData(data),
  makeEmptyProjectData: name => makeEmptyProjectData(name),
  buildProject: () => buildProject(),
  loadProjectIntoActiveState: data => loadProjectIntoActiveState(data),
  onTabActivated: () => {
    if (typeof syncProps === "function") syncProps();
    if (typeof listRects === "function") listRects();
  },
  cancelActiveDrag: () => cancelActiveDrag(),
  schedulePersistRef: fn => { schedulePersist = fn; },
  lsSet: lsSetSafe,
  TABS_SAVE_KEY,
  AUTO_SAVE_KEY,
  PERSIST_DEBOUNCE_MS,
  historyCommitIfChanged: () => historyCommitIfChanged()
}));
({
  refreshPropsListRender,
  persistProjectAndRender,
  refreshPanels,
  commitProjectChange,
  commitUiUpdate
} = setupChangeOpsController({
  syncProps: () => syncProps(),
  syncPropsSmart: () => syncPropsSmart(),
  listRects: () => listRects(),
  render: () => render(),
  schedulePersist: kind => schedulePersist(kind)
}));
const loadProjectIntoActiveState = data => {
  applyProjectData(data || makeEmptyProjectData("Новый проект"), { syncTabSnapshot: false, renderTabs: false });
  if (VIEWER_MODE) {
    setViewMode("install", false);
    setLockAll(true, false);
    setMode("select");
    st.selSet = new Set();
    st.sel = null;
    syncProps();
    render();
  }
};
const ensureFontReady = async () => {
  if (st.fontReady) return;
  if (!document.fonts || !document.fonts.ready) { st.fontReady = true; return; }
  const localMax = st.rects.reduce((m, r) => Math.max(m, Math.max(0, Number(r && r.textSize) || 0)), 0);
  const size = Math.max(6, st.textSize || 12, localMax);
  const family = fontFamilyCss(st.fontFamily);
  try { await document.fonts.load(`${size}px ${family}`); } catch { /* noop */ }
  try { await document.fonts.ready; } catch { /* noop */ }
  st.fontReady = true;
};
({
  resetMaskTransient,
  resetCellTransient,
  resetFlowHoverTransient,
  resetClusterHoverTransient,
  resetRigHoverTransient,
  resetSelectionTransient,
  cancelActiveDrag,
  resetTransientState
} = setupTransientStateController({ st }));
let metricFromPx = (_r) => { };
let pxFromMetric = (_r) => { };
let parseProjectRect = (_r, _i, _legacy) => null;
let mk = (_x, _y, _w, _h) => ({});
let mkNote = (_x, _y, _w, _h) => ({});
let mkShape = (_points) => null;
let mkDevice = (_x, _y, _w, _h) => ({});
({
  metricFromPx,
  pxFromMetric,
  parseProjectRect,
  mk,
  mkNote,
  mkShape,
  mkDevice
} = setupRectFactoryController({
  st,
  mRound,
  autoContrast,
  normalizeRigData,
  normalizeDataFlow,
  normalizeDataFlowZ,
  normalizeHiddenCells,
  normalizeFlowLocks,
  normalizeFlowLockRidToSigMap,
  normalizeFlowLockCidToSeedMap,
  normalizeManualClusters,
  normalizeCabinetStyles,
  safeDefine,
  restorePersistedRectCache,
  SPLIT_VARIANT_MAX,
  parseAreaM2PxInput: (input, fallback) => parseAreaM2PxInput(input, fallback),
  toPositiveInt: (v, fallback) => toPositiveInt(v, fallback),
  toRoundedInt: (v, fallback) => toRoundedInt(v, fallback),
  evalExpr: (input, fallback) => evalExpr(input, fallback),
  clampInt: (v, min, max, fallback) => clampInt(v, min, max, fallback),
  randomColor: () => randomColor()
}));
({
  applyProjectData,
  restoreAutoSave
} = setupProjectStateController({
  st,
  resetCalcWorkers,
  parseAreaM2PxInput,
  parseProjectRect,
  pxFromMetric,
  normalizeFlowLinks,
  remapRectRigLoadsToBottomSeams,
  resetTransientState,
  updateViewModeUi,
  updateLockAllUi,
  setSelection,
  syncProps: () => syncProps(),
  listRects,
  selRect,
  syncActiveTabSnapshot,
  renderProjectTabs,
  resetHistoryUi,
  render: () => render(),
  cloneProjectData,
  makeEmptyProjectData,
  getActiveTab,
  loadProjectIntoActiveState,
  lsGet: lsGetSafe,
  TABS_SAVE_KEY,
  AUTO_SAVE_KEY,
  setGlobalSaveLocationId,
  getGlobalSaveLocationId,
  genSaveLocationId,
  zc,
  normalizeViewMode,
  evalExpr
}));
const isNoteRect = r => isNoteRectKind(r);
let isShapeRect = r => isShapeRectKind(r);
const isDeviceRect = r => isDeviceRectKind(r);
const hasRect = id => st.rects.some(v => v.id === id);
let setMode = (_m) => { };
let activateToolOrSelect = (_mode) => { };
let updateModeBadges = (_r) => { };
let isRectLocked = (_r) => false;
let getEditableSelectedRects = () => [];
let toggleRectLockById = (_id) => false;
({
  setMode,
  activateToolOrSelect,
  updateModeBadges
} = setupToolModeController({
  st,
  el,
  wrap,
  toolFsm,
  closeNoteEditor,
  resetFlowHoverTransient,
  resetClusterHoverTransient,
  resetRigHoverTransient,
  resetMaskTransient,
  resetCellTransient,
  cancelActiveDrag: () => cancelActiveDrag(),
  isMaskMode,
  isCellEditMode,
  isCabinetEditMode,
  isRigEditMode,
  updateToolbarOverflow,
  updateClusterEditCursor,
  render: () => render()
}));
({
  getRectsBBox,
  normSelSet,
  refreshMultiSelectionBase,
  setSelection,
  selBoxBounds,
  boxSize,
  rectIntersectsBox,
  beginSelectionBox,
  updateSelectionBox,
  finishSelectionBox,
  isSelected,
  getSelectedRects,
  selectOnly,
  toggleSelect
} = setupSelectionController({
  st,
  getRectById,
  isRectLocked,
  isShapeRect: r => isShapeRect(r),
  rectAABB,
  rectAABBMasked,
  rectIntersectsSelectionBoxVisible,
  refreshPropsListRender
}));
({
  isRectLocked,
  getEditableSelectedRects,
  toggleRectLockById
} = setupSelectionLockController({
  st,
  getRectById,
  getSelectedRects,
  normSelSet,
  resetMaskTransient,
  resetCellTransient,
  syncProps: () => syncProps(),
  listRects: () => listRects(),
  schedulePersist: kind => schedulePersist(kind),
  render: () => render()
}));
const rectHasManualRegions = r => !!(r && Array.isArray(r.manualClusters) && r.manualClusters.length > 0);
const rectHasManualFlow = r => {
  const locks = normalizeFlowLocks(r && r.flowLocks);
  for (const cfg of Object.values(locks || {})) {
    if (!cfg || typeof cfg !== "object") continue;
    if (Array.isArray(cfg.locks) && cfg.locks.length) return true;
    if (cfg.startPinned || cfg.startCid != null || String(cfg.startDir || "").trim() || String(cfg.mode || "").trim()) return true;
  }
  return false;
};
({
  initHistoryCurrent,
  historyCommitIfChanged,
  undoHistory,
  redoHistory,
  resetHistoryUi
} = setupHistoryController({
  st,
  el,
  cloneJson,
  buildProject,
  jsonEquals,
  applyProjectData,
  schedulePersist,
  historyCap: 80
}));
({
  selRect,
  cur,
  listRects
} = setupSelectionUiFeature({
  st,
  el,
  bindEvent,
  eventClosest,
  getRectById,
  isRectLocked,
  hasRect,
  normSelSet,
  refreshMultiSelectionBase,
  toggleSelect,
  selectOnly,
  resetSelectionTransient,
  findManualClusterById,
  isNoteRect,
  closeNoteEditor,
  syncProps: () => syncProps(),
  syncPropsSmart: () => syncPropsSmart(),
  updateModeBadges,
  updateClusterEditCursor,
  render: () => render(),
  isSelected,
  toggleRectLockById,
  persistProjectAndRender,
  t: value => translateText(value)
}));
const multiSelectionActions = setupMultiSelectionActionsController({
  st,
  getSelectedRects: () => getSelectedRects(),
  rectAABB: r => rectAABBMasked(r),
  refreshMultiSelectionBase: () => refreshMultiSelectionBase(),
  refreshPanels: () => refreshPanels(),
  schedulePersist: kind => schedulePersist(kind),
  render: () => render(),
  mFmt,
  drawCellX: r => drawCellX(r),
  drawCellY: r => drawCellY(r),
  getCellTopologyCached: (r, cx, cy) => getCellTopologyCached(r, cx, cy),
  getHiddenSet: r => getHiddenSet(r),
  buildVisibleCabinetSummary: (r, cx, cy, topo, hs) => buildVisibleCabinetSummary(r, cx, cy, topo, hs),
  t: value => translateText(value)
});
let hit = (_x, _y) => null;
let snapMaskNode = (_r, _wx, _wy) => null;
let addMaskPoint = (_wx, _wy) => { };
let applyMaskPath = () => { };
let toggleCellLinkAtPoint = (_r, _wx, _wy) => false;
let beginCellKnifeDragAtPoint = (_r, _wx, _wy) => null;
let updateCellKnifeDragAtPoint = (_r, _drag, _wx, _wy) => false;
let beginClusterHandleDragAtPoint = (_wx, _wy) => false;
let updateClusterHandleDragAtPoint = (_wx, _wy) => false;
let endClusterHandleDrag = () => false;
let handleClusterEditAtPoint = (_wx, _wy) => false;
({
  hit,
  snapMaskNode,
  addMaskPoint,
  applyMaskPath,
  toggleCellLinkAtPoint,
  beginCellKnifeDragAtPoint,
  updateCellKnifeDragAtPoint,
  beginClusterHandleDragAtPoint,
  updateClusterHandleDragAtPoint,
  endClusterHandleDrag,
  handleClusterEditAtPoint
} = setupEditingToolsCore({
  st,
  getRectById,
  isRectLocked,
  worldToRectUV,
  rectAABBMasked,
  rectUVToWorld,
  getMaskNodeAxes,
  drawCellX,
  drawCellY,
  getHiddenSet,
  pointInPoly,
  maskCellKey,
  setHiddenSet,
  resetMaskTransient,
  persistProjectAndRender,
  render: () => render(),
  getCellLinkCandidateAtPoint,
  getCellTopologyCached: (r, cx, cy) => getCellTopologyCached(r, cx, cy),
  getCellTopology: (r, cx, cy) => getCellTopology(r, cx, cy),
  selRect,
  cur,
  findActiveClusterBorder,
  updateClusterEditCursor,
  shrinkManualCluster,
  expandManualCluster,
  findClusterStartMarker,
  removeManualCluster,
  findClusterHandle,
  schedulePersist,
  cellFromWorldPoint,
  isShapeRect: r => isShapeRect(r),
  pointInShape: (r, wx, wy) => pointInShape(r, wx, wy),
  shapePointHit: (r, wx, wy, z) => shapePointHit(r, wx, wy, z),
  findManualClusterAtCell,
  nextManualClusterId,
  clusterCanPlace,
  upsertManualCluster
}));
let snap = (_x, _y, _id, _w, _h, _off) => ({ x: Math.round(Number(_x) || 0), y: Math.round(Number(_y) || 0), gx: null, gy: null, dg: null });
const { drawNoteRect } = setupNoteRender({
  st,
  rads,
  rectCenter,
  getRectTextSizePx: r => getRectTextSizePx(r),
  fontFamilyCss,
  t: value => translateText(value)
});
let normalizeShapeBounds = (_r) => false;
let pointInShape = (_r, _wx, _wy) => false;
let shapePointHit = (_r, _wx, _wy, _z) => -1;
let shapePointHits = (_r, _wx, _wy, _z) => [];
let shapeEditHits = (_r, _wx, _wy, _z) => [];
let shapeControlHit = (_r, _wx, _wy, _z) => null;
let shapeSegmentHit = (_r, _wx, _wy, _z) => -1;
let drawShapeRect = () => { };
({
  isShapeRect,
  normalizeShapeBounds,
  pointInShape,
  shapePointHit,
  shapePointHits,
  shapeEditHits,
  shapeControlHit,
  shapeSegmentHit,
  drawShapeRect
} = setupShapeRender({
  st,
  rectUVToWorld: (r, u, v) => rectUVToWorld(r, u, v),
  worldToRectUV: (r, wx, wy) => worldToRectUV(r, wx, wy),
  pointInPoly,
  distToSegment
}));
const { drawRectBase } = setupDrawRectBaseController({
  st,
  isNoteRect,
  drawNoteRect,
  isShapeRect,
  drawShapeRect,
  drawCellX,
  drawCellY,
  getHiddenSet,
  rads,
  rectCenter,
  rectUVToWorld,
  normalizeViewMode,
  getCellTopologyCached,
  getMaskRenderDataCached,
  isMaskMode: () => isMaskMode(),
  isCellEditMode: () => isCellEditMode(),
  isClusterEditMode: () => isClusterEditMode(),
  isRigEditMode: () => isRigEditMode(),
  normalizeDataFlow,
  planNumberRegions,
  updateSplitVariantControl: r => updateSplitVariantControl(r),
  getDataFlowGroups,
  collectFlowLinkAnchors,
  collectFlowEditPoints,
  collectFlowManualPickPoints,
  getRectFillLayerCached,
  getRectDecorLayerCached,
  getRectComponentRenderDataCached,
  rectTextTheme,
  fontFamilyCss,
  toLetters,
  mFmt,
  pctFmt,
  fillPercent,
  getRectTextSizePx,
  buildVisibleCabinetSummary,
  listSignature,
  getRectTextLayoutCached,
  hiddenCellBoxes,
  computeFreeRects,
  chooseTextLayout,
  t: value => translateText(value),
  REGION_ZONE_COLORS,
  getVisibleBoundarySegmentsCached,
  drawRectOverlays: ctx => drawRectOverlays(ctx),
  drawRectInteractions: ctx => drawRectInteractions(ctx),
  drawRigOutsideOverlay: (c, r, cx, cy, topo, hs, z, sel) => drawRigOutsideOverlay(c, r, cx, cy, topo, hs, z, sel)
});

const { drawRectOverlays, drawRectInteractions } = setupDrawRectStagesController({
  st,
  isClusterEditMode: () => isClusterEditMode(),
  fontFamilyCss: value => fontFamilyCss(value),
  getDrawRigOnRect: () => drawRigOnRect,
  getRectFlowPassiveLayerCached: () => getRectFlowPassiveLayerCached,
  getDrawDataFlowOnRect: () => drawDataFlowOnRect,
  getDrawFlowEditOverlay: () => drawFlowEditOverlay,
  getDrawClusterEditOverlay: () => drawClusterEditOverlay
});
function drawRect(c, r, sel, z, origin, opts) {
  drawRectBase(c, r, sel, z, origin, opts);
}
({
  buildRigLayout,
  remapRectRigLoadsToBottomSeams,
  resolveRigFrameSeam,
  sanitizeRectRigFramesToBounds,
  getRigHitAtPoint,
  applyRigActionAtPoint
} = setupRigInteractionController({
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
}));
const { drawRigOnRect, drawRigOutsideOverlay } = setupRigRenderController({
  st,
  getRectRigData,
  buildRigLayout,
  resolveRigFrameSeam,
  drawLoadIcon,
  fontFamilyCss: value => fontFamilyCss(value),
  isRigEditMode: () => isRigEditMode(),
  rectUVToWorld,
  RIG_DEFAULT_LOAD_KG
});
const { drawMaskOverlay, drawCellEditOverlay, drawCabinetEditOverlay, drawContentBounds, drawLayerButtons, hitLayerButton, setLayerButtonHover, clearLayerButtonHover } = setupViewportOverlays({
  st,
  isMaskMode: () => isMaskMode(),
  isCellEditMode: () => isCellEditMode(),
  isCabinetEditMode: () => isCabinetEditMode(),
  cur,
  getMaskNodeAxes: r => getMaskNodeAxes(r),
  rectUVToWorld,
  drawCellX,
  drawCellY,
  getCellTopologyCached,
  buildVisibleCabinetSummary,
  getHiddenSet,
  fontFamilyCss,
  rectAABBMasked,
  listSignature,
  t: value => translateText(value)
});
const { drawInstallSummaryOverlay } = setupInstallSummaryOverlay({
  st,
  cv,
  wrap,
  normalizeViewMode,
  drawCellX,
  drawCellY,
  getCellTopologyCached,
  getHiddenSet,
  buildVisibleCabinetSummary,
  fontFamilyCss,
  mFmt,
  isNoteRect: r => isNoteRect(r) || isShapeRect(r) || isDeviceRect(r),
  parseScreenNameGroup,
  listSignature,
  t: value => translateText(value)
});
let render = (_immediate = false) => { };
let renderOverlay = (_immediate = false) => { };
let renderOverlayNow = () => { };
let renderNow = () => { };
let updateAppViewportHeight = () => { };
let scheduleCanvasResize = () => { };
let resize = () => { };
let zoomAt = (_sx, _sy, _nz) => { };
let lastSpecAutoRefreshAt = 0;
({
  render,
  renderOverlay,
  renderOverlayNow,
  renderNow,
  updateAppViewportHeight,
  resize,
  scheduleCanvasResize,
  zoomAt
} = setupRenderRuntimeFeature({
  ctx,
  overlayCtx,
  st,
  cv,
  overlayCanvas,
  wrap,
  getViewMetrics,
  s2w,
  w2s,
  rectAABB: rectAABBMasked,
  getOrigin,
  isSelected,
  drawRect,
  drawInterScreenFlowLinks,
  drawFlowLinkCurveHandlesOverlay,
  drawMaskOverlay,
  drawCellEditOverlay,
  drawCabinetEditOverlay,
  drawContentBounds,
  drawLayerButtons,
  drawMultiSelectionActions: (c, z) => multiSelectionActions.drawActions(c, z),
  drawInstallSummaryOverlay,
  updateNoteEditorOverlay,
  selBoxBounds,
  resetClusterHoverTransient,
  isClusterEditMode,
  fontFamilyCss,
  el,
  onBeforeRenderFrame: () => {
    flowDrawRenderEpoch++;
    resetFlowPointIndexCache();
    if (normalizeViewMode(st.viewMode) === "spec") {
      const now = Date.now();
      if (now - lastSpecAutoRefreshAt >= 180) {
        lastSpecAutoRefreshAt = now;
        refreshSpecAuto(false);
      }
    }
  },
  bindWindowEvent,
  bindEvent,
  zc
}));
const renderRuntimeBase = render;
const renderOverlayRuntimeBase = renderOverlay;
const renderNowRuntimeBase = renderNow;
render = (immediate = false) => {
  updateSelectionActionButtonsAvailability();
  renderRuntimeBase(immediate);
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => drawInstallSummaryOverlay());
  else drawInstallSummaryOverlay();
};
renderOverlay = (immediate = false) => {
  renderOverlayRuntimeBase(immediate);
};
renderNow = () => {
  renderNowRuntimeBase();
  drawInstallSummaryOverlay();
};
let beginRectDrag = (_target, _p) => { };
let snapGroup = (_nx, _ny, _drag, _off) => ({ x: Math.round(Number(_nx) || 0), y: Math.round(Number(_ny) || 0), gx: null, gy: null, dg: null });
let moveRectDrag = (_p, _disableSnap) => { };
({
  snap,
  beginRectDrag,
  snapGroup,
  moveRectDrag
} = setupDragSnapController({
  st,
  getRectById: id => getRectById(id),
  rectAABBMasked: r => rectAABBMasked(r),
  isRectLocked: r => isRectLocked(r),
  normSelSet: () => normSelSet(),
  isSelected: id => isSelected(id),
  selectOnly: id => selectOnly(id),
  getEditableSelectedRects: () => getEditableSelectedRects()
}));
let handleFlowEditPointerDown = (_p) => false;
let handleCabinetEditPointerDown = (_p) => false;
let handleCabinetEditPointerMove = (_p) => false;
const {
  buildRebuiltFlowPreview,
  rebuildAndPatchFlowRegion
} = setupFlowRegionRebuilder({
  st,
  cur: () => cur(),
  isRectLocked: r => isRectLocked(r),
  normalizeFlowLocks,
  setFlowStart,
  setFlowLock,
  drawCellX,
  drawCellY,
  getCellTopologyCached: (r, cx, cy) => getCellTopologyCached(r, cx, cy),
  getHiddenSet: r => getHiddenSet(r),
  planNumberRegionsUncached: (r, cx, cy, topo, hs, budget) => planNumberRegionsUncached(r, cx, cy, topo, hs, budget),
  getDataFlowGroupsUncached: (r, cx, cy, topo, hs, regions, budget, opts) => getDataFlowGroupsUncached(r, cx, cy, topo, hs, regions, budget, opts),
  makeCalcBudget: () => makeCalcBudget(),
  calcNow: () => calcNow(),
  getRectCalcCache: r => getRectCalcCache(r)
});
({
  handleFlowEditPointerDown,
  handleRigPointerDown,
  handleRigPointerMove,
  handleRigPointerLeave
} = setupEditingToolsInput({
  st,
  hit,
  cur,
  render: () => render(),
  selRect,
  syncProps,
  schedulePersist,
  isRectLocked,
  normalizeFlowLinks,
  flowLinkKeyOf,
  flowAnchorKey,
  findFlowLinkAtPoint,
  findFlowStartHandle,
  findFlowDirectionButton,
  findFlowResetButton,
  setFlowDirection,
  updateManualFlowPoint,
  dragManualFlowPoint,
  resetFlowRegionOverrides,
  rebuildAndPatchFlowRegion,
  findFlowLinkAnchorAtPoint,
  findFlowCurveHandleAtPoint,
  setFlowLinkManualBezierPoint, moveFlowLinkOrthogonalSegment, deleteFlowLinkOrthogonalSegment,
  clearFlowLinkManualBezier,
  updateFlowLinkDragTarget,
  findFlowEditPoint,
  setSelection,
  syncPropsSmart: () => syncPropsSmart(),
  getRigHitAtPoint,
  applyRigActionAtPoint,
  resetRigHoverTransient,
  commitUiUpdate
}));
const getCabinetCellAtPoint = (r, wx, wy) => {
  if (!r) return null;
  const cell = cellFromWorldPoint(r, wx, wy, true);
  if (!cell) return null;
  const cx = drawCellX(r), cy = drawCellY(r), topo = getCellTopologyCached(r, cx, cy);
  if (!topo) return null;
  const idx = cell.row * topo.cols + cell.col;
  const cid = Number(topo.comp && topo.comp[idx]);
  if (!Number.isFinite(cid)) return null;
  return { rectId: r.id, cid: cid | 0, col: cell.col, row: cell.row };
};
const isCabinetSelectableRect = r => isScreenRectKind(r);
const normalizeCabinetStyleValue = style => {
  const src = (style && typeof style === "object") ? style : {};
  const diagRaw = String(src.diag || "auto");
  const colorRaw = String(src.color || "auto");
  const diag = ["auto", "right", "left", "rightSwap", "leftSwap"].includes(diagRaw) ? diagRaw : "auto";
  const color = ["auto", "a", "b"].includes(colorRaw) ? colorRaw : "auto";
  return { diag, color };
};
handleCabinetEditPointerDown = p => {
  const h = hit(p.x, p.y);
  if (!isCabinetSelectableRect(h)) {
    selRect(null);
    st.cabinetCellSelection = null;
    syncPropsSmart();
    render();
    return true;
  }
  if (h.id !== st.sel) selRect(h.id);
  if (isRectLocked(h)) { render(); return true; }
  const pick = getCabinetCellAtPoint(h, p.x, p.y);
  st.cabinetCellSelection = pick;
  syncPropsSmart();
  render();
  return true;
};
handleCabinetEditPointerMove = p => {
  const h = hit(p.x, p.y);
  st.cabinetCellHover = (isCabinetSelectableRect(h) && !isRectLocked(h)) ? getCabinetCellAtPoint(h, p.x, p.y) : null;
  render();
  return true;
};
let delSel = () => { };
let dupSel = () => { };
let insertCloneAboveSource = (_sourceId, _clone) => { };
let cloneRectForClipboard = _src => _src;
let cloneRectForDuplicate = _src => _src;
let resetProjectCore = () => { };
let newProject = () => { };
const editorCtx = {
  state: st,
  ui: {
    bindClick,
    bindEvent,
    bindWindowEvent,
    t: translateText
  },
  actions: {
    render,
    schedulePersist,
    syncProps: () => syncProps(),
    listRects,
    cur,
    getViewMetrics,
    getActionTargets: () => getActionTargets(),
    setSelection,
    setMode,
    refreshPanels
  }
};
({
  resetProjectCore,
  newProject
} = setupProjectLifecycleController({
  st,
  el,
  setSelection: editorCtx.actions.setSelection,
  resetTransientState: full => resetTransientState(full),
  setMode: editorCtx.actions.setMode,
  refreshPanels: editorCtx.actions.refreshPanels,
  syncActiveTabSnapshot,
  renderProjectTabs,
  commitUiUpdate: opts => commitUiUpdate(opts),
  updateViewModeUi,
  setGlobalSaveLocationId: id => setGlobalSaveLocationId(id),
  getGlobalSaveLocationId: () => getGlobalSaveLocationId(),
  genSaveLocationId: name => genSaveLocationId(name),
  t: editorCtx.ui.t
}));
({
  insertCloneAboveSource,
  cloneRectForClipboard,
  cloneRectForDuplicate,
  delSel,
  dupSel
} = setupSelectionActionsFeature({
  st,
  isRectLocked: r => isRectLocked(r),
  setSelection: editorCtx.actions.setSelection,
  resetTransientState: full => resetTransientState(full),
  refreshPanels: editorCtx.actions.refreshPanels,
  updateClusterEditCursor,
  commitUiUpdate: opts => commitUiUpdate(opts),
  normSelSet,
  getSelectedRects,
  cur: editorCtx.actions.cur,
  normalizeFlowLocks,
  normalizeManualClusters,
  normalizeRigData,
  autoContrast,
  withNameSuffixBeforeGroup,
  syncProps: editorCtx.actions.syncProps,
  listRects: editorCtx.actions.listRects,
  setMode: editorCtx.actions.setMode,
  schedulePersist: editorCtx.actions.schedulePersist
}));
const { dupMirrorSel } = setupMirrorDuplicateFeature({
  st,
  cur: editorCtx.actions.cur,
  getSelectedRects,
  drawCellX,
  drawCellY,
  parseLinkKey,
  mkLinkKey,
  getCellTopology,
  withNameSuffixBeforeGroup,
  getHiddenSet: rect => getHiddenSet(rect),
  makeCalcBudget,
  calcNow,
  planNumberRegionsUncached,
  SPLIT_VARIANT_MAX,
  normalizeFlowLocks,
  normalizeRigData,
  RIG_DEFAULT_LOAD_KG,
  autoContrast,
  insertCloneAboveSource,
  setSelection: editorCtx.actions.setSelection,
  selRect: id => selRect(id),
  setMode: editorCtx.actions.setMode,
  schedulePersist: editorCtx.actions.schedulePersist
});
function fit() {
  const fitRects = (Array.isArray(st.rects) ? st.rects : []).filter(r => !isNoteExcludedFromContentBounds(r));
  if (!fitRects.length) { st.camX = 0; st.camY = 0; st.zoom = 1; render(); return } let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9; for (const r of fitRects) { const bb = rectAABBMasked(r); minX = Math.min(minX, bb.minX); minY = Math.min(minY, bb.minY); maxX = Math.max(maxX, bb.maxX); maxY = Math.max(maxY, bb.maxY) }
  const vm = getViewMetrics(), w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY), pad = 80; st.zoom = zc(Math.min((vm.viewWidth - pad) / w, (vm.viewHeight - pad) / h)); st.camX = (minX + maxX) / 2; st.camY = (minY + maxY) / 2; render()
}
const updateRectTextSizeLabel = r => {
  if (!el.rectTextSizeLabel) return;
  const lv = Math.max(0, Math.min(128, Math.round(Number(r && r.textSize) || 0)));
  if (lv > 0) {
    el.rectTextSizeLabel.textContent = `${lv}px`;
    el.rectTextSizeLabel.title = `${translateText("Локальный размер")}: ${lv}px`;
    el.rectTextSizeLabel.setAttribute("aria-label", `${translateText("Локальный размер")}: ${lv}px`);
  } else {
    const gv = Math.round(st.textSize || 12);
    el.rectTextSizeLabel.innerHTML = '<i class="fa-solid fa-globe"></i>';
    el.rectTextSizeLabel.title = `${translateText("Глобальный размер")}: ${gv}px`;
    el.rectTextSizeLabel.setAttribute("aria-label", `${translateText("Глобальный размер")}: ${gv}px`);
  }
};
const {
  updateSplitVariantLabel,
  updateSplitVariantModeUi,
  updateSplitVariantControl,
  bindSplitVariantHandlers
} = setupSplitVariantController({
  el,
  SPLIT_VARIANT_MAX,
  evalExpr,
  bindEvent: editorCtx.ui.bindEvent,
  render: editorCtx.actions.render,
  getCurrentRect: editorCtx.actions.cur
});
const {
  uiSetValue,
  uiSetChecked,
  uiSetDisabled,
  uiSetText,
  cabinetPxToUi,
  cabinetUiToPx
} = setupPropsUiUtils({
  st,
  cur: editorCtx.actions.cur,
  normalizeCabinetUnit,
  mFmt,
  toPositiveInt,
  evalExpr
});
const propsUiShared = { uiSetDisabled, uiSetValue, uiSetChecked, uiSetText };
const propsRenderShared = {
  cur: editorCtx.actions.cur,
  listRects: editorCtx.actions.listRects,
  schedulePersist: editorCtx.actions.schedulePersist,
  render: editorCtx.actions.render
};
let applyProps = (_opts) => { };
({
  syncProps,
  applyProps
} = setupPropsPanelFeature({
  st,
  el,
  ...propsRenderShared,
  isRectLocked: r => isRectLocked(r),
  isNoteRect: r => isNoteRect(r),
  isShapeRect: r => isShapeRect(r),
  rectUVToWorld,
  worldToRectUV,
  findFlowAnchorByEndpoint,
  normalizeShapeBounds: r => normalizeShapeBounds(r),
  shapePointHit,
  getSelectedRects,
  ...propsUiShared,
  updateThemeUi,
  updateViewModeUi,
  updateLockAllUi,
  mFmt,
  updateSplitVariantModeUi: arg => updateSplitVariantModeUi(arg),
  updateModeBadges: r => updateModeBadges(r),
  updateRectTextSizeLabel: r => updateRectTextSizeLabel(r),
  autoContrast,
  SPLIT_VARIANT_MAX,
  normalizeCabinetUnit,
  metricFromPx: rect => metricFromPx(rect),
  normalizeDataFlow,
  getFlowRegionConfig,
  resolveFlowModeFromStartAndDir,
  getFlowModeRegion,
  updateSplitVariantControl: r => updateSplitVariantControl(r),
  cabinetPxToUi,
  getRectsBBox: rects => getRectsBBox(rects),
  evalExpr,
  parseAreaM2PxInput,
  pxFromMetric: rect => pxFromMetric(rect),
  refreshMultiSelectionBase,
  rectAABB,
  cabinetUiToPx,
  setFlowRegionMode,
  remapRectRigLoadsToBottomSeams: r => remapRectRigLoadsToBottomSeams(r),
  invalidateRectCache,
  createRectPropSchema,
  getAreaM2BadgeLabel,
  getAreaM2PresetValues: () => getAreaM2PresetValues(document),
  updateAreaM2Badge,
  updateSplitVariantLabel
}));
const { scheduleSyncProps, syncPropsSmart } = setupPropertiesSyncController({
  st,
  syncProps: editorCtx.actions.syncProps,
  requestFrame: cb => requestAnimationFrame(cb),
  cancelFrame: id => cancelAnimationFrame(id),
  setDelay: (cb, ms) => setTimeout(cb, ms),
  clearDelay: id => clearTimeout(id)
});
const getCabinetSelectionRect = () => {
  const sel = st.cabinetCellSelection;
  if (!sel || !Number.isFinite(Number(sel.rectId))) return null;
  const r = getRectById(sel.rectId) || null;
  return isCabinetSelectableRect(r) ? r : null;
};
const syncCabinetToolPanel = () => {
  if (!el.cabinetToolPanel) return;
  const rec = st.cabinetCellSelection;
  const hasSelection = !!(rec && Number.isFinite(Number(rec.rectId)) && Number.isFinite(Number(rec.cid)));
  const panelVisible = st.mode === "cabinetEdit" && hasSelection;
  el.cabinetToolPanel.classList.toggle("d-none", !panelVisible);
  if (!panelVisible) return;
  const r = getCabinetSelectionRect();
  if (!rec || !r) {
    if (el.cabinetSelectionLabel) el.cabinetSelectionLabel.textContent = translateText("Кабинет не выбран");
    if (el.propCabinetDiag) el.propCabinetDiag.value = "auto";
    if (el.propCabinetColor) el.propCabinetColor.value = "auto";
    if (el.btnCabinetStyleReset) el.btnCabinetStyleReset.disabled = true;
    return;
  }
  const styles = (r.cabinetStyles && typeof r.cabinetStyles === "object") ? r.cabinetStyles : {};
  const style = normalizeCabinetStyleValue(styles[String(rec.cid)]);
  if (el.cabinetSelectionLabel) el.cabinetSelectionLabel.textContent = `${translateText("Кабинет")}: #${rec.cid + 1}`;
  if (el.propCabinetDiag) el.propCabinetDiag.value = style.diag;
  if (el.propCabinetColor) el.propCabinetColor.value = style.color;
  if (el.btnCabinetStyleReset) el.btnCabinetStyleReset.disabled = !(style.diag !== "auto" || style.color !== "auto");
};
const updateSelectedCabinetStyle = () => {
  const rec = st.cabinetCellSelection;
  const r = getCabinetSelectionRect();
  if (!rec || !r) return;
  const diag = el.propCabinetDiag ? String(el.propCabinetDiag.value || "auto") : "auto";
  const color = el.propCabinetColor ? String(el.propCabinetColor.value || "auto") : "auto";
  const next = normalizeCabinetStyleValue({ diag, color });
  const key = String(rec.cid);
  const map = { ...((r.cabinetStyles && typeof r.cabinetStyles === "object") ? r.cabinetStyles : {}) };
  if (next.diag === "auto" && next.color === "auto") delete map[key];
  else map[key] = next;
  r.cabinetStyles = normalizeCabinetStyles(map);
  invalidateRectCache(r, "appearance");
  schedulePersist("project");
  syncCabinetToolPanel();
  render();
};
if (el.propCabinetDiag) bindEvent(el.propCabinetDiag, "change", updateSelectedCabinetStyle);
if (el.propCabinetColor) bindEvent(el.propCabinetColor, "change", updateSelectedCabinetStyle);
if (el.btnCabinetStyleReset) {
  bindClick(el.btnCabinetStyleReset, () => {
    if (el.propCabinetDiag) el.propCabinetDiag.value = "auto";
    if (el.propCabinetColor) el.propCabinetColor.value = "auto";
    updateSelectedCabinetStyle();
  });
}
const getSelectedFlowLinkByKey = () => {
  const key = String(st.flowLinkSelectedKey || "");
  if (!key) return null;
  const list = Array.isArray(st.flowLinks) ? st.flowLinks : [];
  return list.find(it => flowLinkKeyOf(it) === key) || null;
};
const ensureSelectedFlowLinkManual = () => {
  const key = String(st.flowLinkSelectedKey || "");
  if (!key) return false;
  const ln = getSelectedFlowLinkByKey();
  if (!ln) return false;
  if ((ln.manualBezierRel && ln.manualBezierRel.c1 && ln.manualBezierRel.c2) || (ln.manualBezier && ln.manualBezier.c1 && ln.manualBezier.c2)) return false;
  const handles = (Array.isArray(st.flowLinkCurveHandles) ? st.flowLinkCurveHandles : []).filter(h => String(h && h.key || "") === key);
  const c1 = handles.find(h => String(h && h.handle || "") === "c1");
  const c2 = handles.find(h => String(h && h.handle || "") === "c2");
  if (!c1 || !c2) return false;
  const fallback = c1.fallback || c2.fallback || null;
  const ok1 = setFlowLinkManualBezierPoint(key, "c1", c1.x, c1.y, fallback);
  const ok2 = setFlowLinkManualBezierPoint(key, "c2", c2.x, c2.y, fallback);
  return !!(ok1 || ok2);
};
if (el.propFlowLinkCurveMode) {
  bindEvent(el.propFlowLinkCurveMode, "change", () => {
    const changed = !!ensureSelectedFlowLinkManual();
    if (changed) schedulePersist("project");
    syncProps();
    render();
  });
}
if (el.btnFlowLinkColorReset) {
  bindClick(el.btnFlowLinkColorReset, () => {
    const key = String(st.flowLinkSelectedKey || "");
    if (!key) return;
    const list = Array.isArray(st.flowLinks) ? st.flowLinks.slice() : [];
    const idx = list.findIndex(it => flowLinkKeyOf(it) === key);
    if (idx < 0) return;
    list[idx] = { ...list[idx] };
    try { delete list[idx].color; } catch { list[idx].color = null; }
    try { delete list[idx].colorMode; } catch { list[idx].colorMode = null; }
    st.flowLinks = list;
    schedulePersist("project");
    syncProps();
    render();
  });
}
const routeSelectedDeviceOutLinksOrthogonal = () => {
  const current = cur();
  const selectedDevices = (typeof getSelectedRects === "function" ? getSelectedRects() : [])
    .filter(r => isDeviceRect(r));
  const routeDevices = selectedDevices.length
    ? selectedDevices
    : (isDeviceRect(current) ? [current] : []);
  if (!routeDevices.length) return false;
  const links = normalizeFlowLinks(st.flowLinks);

  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const rectByIdLocal = id => getRectById(Math.max(1, Math.round(Number(id) || 0))) || null;
  const boxOf = r => {
    const bb = rectAABBMasked(r);
    return {
      minX: num(bb.minX),
      minY: num(bb.minY),
      maxX: num(bb.maxX),
      maxY: num(bb.maxY),
      cx: (num(bb.minX) + num(bb.maxX)) / 2,
      cy: (num(bb.minY) + num(bb.maxY)) / 2
    };
  };
  const expandBox = (bb, pad) => ({
    minX: bb.minX - pad,
    minY: bb.minY - pad,
    maxX: bb.maxX + pad,
    maxY: bb.maxY + pad
  });
  const boxIntersectsSegment = (bb, a, b) => {
    const ax = num(a.x), ay = num(a.y), bx = num(b.x), by = num(b.y);
    if (Math.abs(ay - by) < 0.5) {
      const x1 = Math.min(ax, bx), x2 = Math.max(ax, bx);
      return ay >= bb.minY && ay <= bb.maxY && x2 > bb.minX && x1 < bb.maxX;
    }
    if (Math.abs(ax - bx) < 0.5) {
      const y1 = Math.min(ay, by), y2 = Math.max(ay, by);
      return ax >= bb.minX && ax <= bb.maxX && y2 > bb.minY && y1 < bb.maxY;
    }
    return true;
  };
  const boxSegmentInsideLength = (bb, a, b) => {
    const ax = num(a.x), ay = num(a.y), bx = num(b.x), by = num(b.y);
    if (Math.abs(ay - by) < 0.5) {
      if (ay < bb.minY || ay > bb.maxY) return 0;
      const x1 = Math.max(Math.min(ax, bx), bb.minX);
      const x2 = Math.min(Math.max(ax, bx), bb.maxX);
      return Math.max(0, x2 - x1);
    }
    if (Math.abs(ax - bx) < 0.5) {
      if (ax < bb.minX || ax > bb.maxX) return 0;
      const y1 = Math.max(Math.min(ay, by), bb.minY);
      const y2 = Math.min(Math.max(ay, by), bb.maxY);
      return Math.max(0, y2 - y1);
    }
    return 1000000;
  };
  const segLen = (a, b) => Math.abs(num(a.x) - num(b.x)) + Math.abs(num(a.y) - num(b.y));
  const samePt = (a, b) => Math.hypot(num(a.x) - num(b.x), num(a.y) - num(b.y)) < 0.5;
  const cleanPoints = pts => {
    const out = [];
    for (const p of pts) {
      const q = { x: Math.round(num(p.x)), y: Math.round(num(p.y)) };
      const prev = out[out.length - 1];
      if (prev && samePt(prev, q)) continue;
      out.push(q);
    }
    for (let i = out.length - 2; i > 0; i--) {
      const a = out[i - 1], b = out[i], c = out[i + 1];
      if ((Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5)
        || (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5)) out.splice(i, 1);
    }
    return out;
  };
  const pointKey = p => `${Math.round(num(p.x))}:${Math.round(num(p.y))}`;
  const segmentOverlapPenalty = (a, b, used) => {
    let penalty = 0;
    const ax = num(a.x), ay = num(a.y), bx = num(b.x), by = num(b.y);
    for (const s of used) {
      if (Math.abs(ay - by) < 0.5 && Math.abs(s.a.y - s.b.y) < 0.5 && Math.abs(ay - s.a.y) < 3) {
        const x1 = Math.min(ax, bx), x2 = Math.max(ax, bx);
        const sx1 = Math.min(s.a.x, s.b.x), sx2 = Math.max(s.a.x, s.b.x);
        if (Math.min(x2, sx2) - Math.max(x1, sx1) > 1) penalty += 40000;
      } else if (Math.abs(ax - bx) < 0.5 && Math.abs(s.a.x - s.b.x) < 0.5 && Math.abs(ax - s.a.x) < 3) {
        const y1 = Math.min(ay, by), y2 = Math.max(ay, by);
        const sy1 = Math.min(s.a.y, s.b.y), sy2 = Math.max(s.a.y, s.b.y);
        if (Math.min(y2, sy2) - Math.max(y1, sy1) > 1) penalty += 40000;
      }
    }
    return penalty;
  };
  const rectBoxes = (Array.isArray(st.rects) ? st.rects : [])
    .filter(r => r && String((r && r.kind) || "").toLowerCase() !== "note")
    .map(r => ({ id: Math.max(1, Math.round(Number(r.id) || 0)), bb: expandBox(boxOf(r), 12) }));
  const allBounds = rectBoxes.reduce((acc, it) => ({
    minX: Math.min(acc.minX, it.bb.minX),
    minY: Math.min(acc.minY, it.bb.minY),
    maxX: Math.max(acc.maxX, it.bb.maxX),
    maxY: Math.max(acc.maxY, it.bb.maxY)
  }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const usedSegments = [];
  const usedPoints = new Set();
  const gap = 36;
  const lane = 18;
  const entryFanGap = 16;
  const sideExit = (side, p, bb, laneOffset = 0) => {
    if (side === "right") return { x: bb.maxX + gap + laneOffset, y: p.y };
    if (side === "left") return { x: bb.minX - gap - laneOffset, y: p.y };
    if (side === "down") return { x: p.x, y: bb.maxY + gap + laneOffset };
    return { x: p.x, y: bb.minY - gap - laneOffset };
  };
  const sideDistance = (side, p, bb) => {
    if (side === "right") return Math.abs(bb.maxX - p.x);
    if (side === "left") return Math.abs(p.x - bb.minX);
    if (side === "down") return Math.abs(bb.maxY - p.y);
    return Math.abs(p.y - bb.minY);
  };
  const sideCrossingCost = (side, p, bb) => {
    const exit = sideExit(side, p, bb, 0);
    return boxSegmentInsideLength(bb, p, exit);
  };
  const approachSidesFor = (a, b, bb) => {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const primary = Math.abs(dx) >= Math.abs(dy)
      ? (dx >= 0 ? "left" : "right")
      : (dy >= 0 ? "up" : "down");
    const order = [primary, "left", "right", "up", "down"]
      .sort((sa, sb) => sideCrossingCost(sa, b, bb) - sideCrossingCost(sb, b, bb));
    return [...new Set(order)];
  };
  const buildRouteCandidates = (start, end, srcBb, dstBb, routeIndex) => {
    const sourceSides = ["right", "left", "down", "up"]
      .sort((sa, sb) => (sideCrossingCost(sa, start, srcBb) - sideCrossingCost(sb, start, srcBb))
        || (sideDistance(sa, start, srcBb) - sideDistance(sb, start, srcBb))
        + ((sa === (end.x >= start.x ? "right" : "left") ? -8 : 0) - (sb === (end.x >= start.x ? "right" : "left") ? -8 : 0)));
    const candidates = [];
    for (const sSide of sourceSides) {
      const laneOffset = routeIndex * lane;
      const sOut = sideExit(sSide, start, srcBb, laneOffset);
      for (const eSide of approachSidesFor(sOut, end, dstBb)) {
        const eOut = sideExit(eSide, end, dstBb, laneOffset);
        candidates.push([sOut, { x: eOut.x, y: sOut.y }, eOut]);
        candidates.push([sOut, { x: sOut.x, y: eOut.y }, eOut]);
        const outerOffset = gap + (routeIndex + 1) * lane;
        const leftLane = Math.min(allBounds.minX, srcBb.minX, dstBb.minX) - outerOffset;
        const rightLane = Math.max(allBounds.maxX, srcBb.maxX, dstBb.maxX) + outerOffset;
        const topLane = Math.min(allBounds.minY, srcBb.minY, dstBb.minY) - outerOffset;
        const bottomLane = Math.max(allBounds.maxY, srcBb.maxY, dstBb.maxY) + outerOffset;
        const wideLeftLane = leftLane - gap - lane * 2;
        const wideRightLane = rightLane + gap + lane * 2;
        const wideTopLane = topLane - gap - lane * 2;
        const wideBottomLane = bottomLane + gap + lane * 2;
        const midX = (sOut.x + eOut.x) / 2 + ((routeIndex % 2) ? lane : -lane);
        const midY = (sOut.y + eOut.y) / 2 + ((routeIndex % 2) ? -lane : lane);
        for (const x of [midX, leftLane, rightLane, wideLeftLane, wideRightLane]) candidates.push([sOut, { x, y: sOut.y }, { x, y: eOut.y }, eOut]);
        for (const y of [midY, topLane, bottomLane, wideTopLane, wideBottomLane]) candidates.push([sOut, { x: sOut.x, y }, { x: eOut.x, y }, eOut]);
      }
    }
    return candidates.map(cleanPoints);
  };
  const scoreRoute = (points, start, end, sourceId, targetId) => {
    const full = cleanPoints([start, ...points, end]);
    let score = full.reduce((sum, p, i) => i ? sum + segLen(full[i - 1], p) : 0, 0) + Math.max(0, full.length - 4) * 80;
    for (let i = 0; i < full.length - 1; i++) {
      const a = full[i], b = full[i + 1];
      if (Math.abs(a.x - b.x) >= 0.5 && Math.abs(a.y - b.y) >= 0.5) score += 1000000;
      score += segmentOverlapPenalty(a, b, usedSegments);
      for (const blocker of rectBoxes) {
        if (blocker.id === sourceId && i === 0) {
          score += boxSegmentInsideLength(blocker.bb, a, b) * 1200;
          continue;
        }
        if (blocker.id === targetId && i === full.length - 2) {
          score += boxSegmentInsideLength(blocker.bb, a, b) * 1200;
          continue;
        }
        if (blocker.id === sourceId || blocker.id === targetId) {
          if (boxIntersectsSegment(blocker.bb, a, b)) score += 5000000;
          continue;
        }
        if (boxIntersectsSegment(blocker.bb, a, b)) score += 10000000 + boxSegmentInsideLength(blocker.bb, a, b) * 2500;
      }
    }
    for (let i = 1; i < full.length - 1; i++) if (usedPoints.has(pointKey(full[i]))) score += 20000;
    return score;
  };
  const finalSegmentInfo = (item, points = item.routePoints) => {
    const full = cleanPoints([item.start, ...points, item.end]);
    if (full.length < 2) return null;
    const prev = full[full.length - 2];
    const end = full[full.length - 1];
    const vertical = Math.abs(num(prev.x) - num(end.x)) < 0.5;
    const horizontal = Math.abs(num(prev.y) - num(end.y)) < 0.5;
    if (!vertical && !horizontal) return null;
    return { prev, end, orientation: vertical ? "v" : "h" };
  };
  const intervalsOverlap = (a1, a2, b1, b2) => Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2)) > 1;
  const finalSegmentsConflict = (a, b) => {
    const ai = finalSegmentInfo(a);
    const bi = finalSegmentInfo(b);
    if (!ai || !bi || ai.orientation !== bi.orientation) return false;
    if (pointKey(ai.end) === pointKey(bi.end)) return true;
    if (ai.orientation === "v") {
      return Math.abs(num(ai.prev.x) - num(bi.prev.x)) < 3
        && intervalsOverlap(num(ai.prev.y), num(ai.end.y), num(bi.prev.y), num(bi.end.y));
    }
    return Math.abs(num(ai.prev.y) - num(bi.prev.y)) < 3
      && intervalsOverlap(num(ai.prev.x), num(ai.end.x), num(bi.prev.x), num(bi.end.x));
  };
  const offsetEntrySlot = (slotIndex, slotCount) => {
    if (slotCount <= 1) return 0;
    const span = entryFanGap * slotCount;
    return -span / 2 + span * (slotIndex / (slotCount - 1));
  };
  const offsetFinalEntrySegment = (item, slotIndex, slotCount) => {
    const info = finalSegmentInfo(item);
    if (!info) return item.routePoints;
    const delta = offsetEntrySlot(slotIndex, slotCount);
    if (Math.abs(delta) < 0.5) return item.routePoints;
    const base = cleanPoints([item.start, ...item.routePoints, item.end]);
    if (base.length < 2) return item.routePoints;
    const prev = info.prev;
    const end = info.end;
    const prefix = base.slice(0, -2);
    const next = info.orientation === "v"
      ? [...prefix, { x: prev.x + delta, y: prev.y }, { x: prev.x + delta, y: end.y }]
      : [...prefix, { x: prev.x, y: prev.y + delta }, { x: end.x, y: prev.y + delta }];
    const full = cleanPoints([...next, end]);
    return cleanPoints(full.slice(1, -1));
  };

  let changed = false;
  const plannedRoutes = [];
  for (const device of routeDevices) {
    const deviceId = Math.max(1, Math.round(Number(device && device.id) || 0));
    const sourceBox = boxOf(device);
    const targetLinks = links
      .map((ln, index) => ({ ln, index }))
      .filter(it => Math.max(1, Math.round(Number(it.ln && it.ln.from && it.ln.from.rectId) || 0)) === deviceId
        && String(it.ln && it.ln.from && it.ln.from.kind || "").toLowerCase() === "end")
      .sort((a, b) => (Math.max(0, Math.round(Number(a.ln.from.cid) || 0)) - Math.max(0, Math.round(Number(b.ln.from.cid) || 0))) || a.index - b.index);
    for (let i = 0; i < targetLinks.length; i++) {
      const { ln, index } = targetLinks[i];
      const start = findFlowAnchorByEndpoint(ln.from);
      const end = findFlowAnchorByEndpoint(ln.to);
      const targetRect = rectByIdLocal(ln && ln.to && ln.to.rectId);
      if (!start || !end || !targetRect) continue;
      const targetBox = boxOf(targetRect);
      const candidates = buildRouteCandidates(start, end, sourceBox, targetBox, plannedRoutes.length);
      let best = null;
      for (const cand of candidates) {
        const score = scoreRoute(cand, start, end, deviceId, Math.max(1, Math.round(Number(targetRect.id) || 0)));
        if (!best || score < best.score) best = { points: cand, score };
      }
      if (!best) continue;
      const routePoints = cleanPoints(best.points);
      const full = cleanPoints([start, ...routePoints, end]);
      for (let j = 0; j < full.length - 1; j++) usedSegments.push({ a: full[j], b: full[j + 1] });
      for (const p of routePoints) usedPoints.add(pointKey(p));
      plannedRoutes.push({ ln, index, start, end, routePoints });
    }
  }
  const entryGroups = [];
  for (const item of plannedRoutes) {
    let group = null;
    for (const candidateGroup of entryGroups) {
      if (candidateGroup.some(other => finalSegmentsConflict(item, other))) {
        group = candidateGroup;
        break;
      }
    }
    if (group) group.push(item);
    else entryGroups.push([item]);
  }
  for (const group of entryGroups) {
    if (group.length < 2) continue;
    group.sort((a, b) => a.index - b.index);
    for (let i = 0; i < group.length; i++) group[i].routePoints = offsetFinalEntrySegment(group[i], i, group.length);
  }
  for (const item of plannedRoutes) {
    const { ln, index, routePoints } = item;
    links[index] = { ...ln, orthogonalPoints: routePoints, controlPointCount: 2, controlOffsets: [] };
    try { delete links[index].manualBezier; } catch { links[index].manualBezier = null; }
    try { delete links[index].manualBezierRel; } catch { links[index].manualBezierRel = null; }
    try { delete links[index].segmentBezierRel; } catch { links[index].segmentBezierRel = null; }
    try { delete links[index].bendOffsets; } catch { links[index].bendOffsets = null; }
    changed = true;
  }
  if (!changed) return false;
  st.flowLinks = links;
  schedulePersist("project");
  syncProps();
  render();
  return true;
};
const improveSelectedDeviceOutLinks = () => {
  const current = cur();
  const selectedDevices = (typeof getSelectedRects === "function" ? getSelectedRects() : [])
    .filter(r => isDeviceRect(r));
  const routeDevices = selectedDevices.length
    ? selectedDevices
    : (isDeviceRect(current) ? [current] : []);
  if (!routeDevices.length) return false;
  const deviceIds = new Set(routeDevices.map(r => Math.max(1, Math.round(Number(r && r.id) || 0))).filter(Boolean));
  const num = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const samePt = (a, b) => Math.hypot(num(a.x) - num(b.x), num(a.y) - num(b.y)) < 0.5;
  const cleanPoints = pts => {
    const out = [];
    for (const p of (Array.isArray(pts) ? pts : [])) {
      const q = { x: Math.round(num(p && p.x)), y: Math.round(num(p && p.y)) };
      const prev = out[out.length - 1];
      if (prev && samePt(prev, q)) continue;
      out.push(q);
    }
    for (let i = out.length - 2; i > 0; i--) {
      const a = out[i - 1], b = out[i], c = out[i + 1];
      if ((Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5)
        || (Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5)) out.splice(i, 1);
    }
    return out;
  };
  const routeOrthogonalPointsLocal = pts => {
    const src = cleanPoints(pts);
    if (src.length < 2) return src;
    const out = [];
    for (let i = 0; i < src.length - 1; i++) {
      const a = src[i], b = src[i + 1];
      out.push(a);
      if (Math.abs(a.x - b.x) >= 0.5 && Math.abs(a.y - b.y) >= 0.5) out.push({ x: b.x, y: a.y });
    }
    out.push(src[src.length - 1]);
    return cleanPoints(out);
  };
  const normalizeEndpoint = ep => ({
    rectId: Math.max(1, Math.round(Number(ep && ep.rectId) || 0)),
    rid: Math.max(0, Math.round(Number(ep && ep.rid) || 0)),
    cid: Math.max(0, Math.round(Number(ep && ep.cid) || 0)),
    kind: String(ep && ep.kind || "").toLowerCase() === "end" ? "end" : "start"
  });
  const endpointKey = ep => {
    const e = normalizeEndpoint(ep);
    return `${e.rectId}:${e.rid}:${e.cid}:${e.kind}`;
  };
  const linkKey = ln => `${endpointKey(ln && ln.from)}>${endpointKey(ln && ln.to)}`;
  const intervalOverlap = (a1, a2, b1, b2) => Math.min(Math.max(a1, a2), Math.max(b1, b2)) - Math.max(Math.min(a1, a2), Math.min(b1, b2));
  const routeScale = Math.max(1, Number(routeDevices[0] && routeDevices[0].scale) || Number(st.globalScale) || 256);
  const nearDistance = routeScale * 0.5;
  const minOverlap = 24;
  const links = normalizeFlowLinks(st.flowLinks);
  const targets = [];
  for (let index = 0; index < links.length; index++) {
    const ln = links[index];
    const from = normalizeEndpoint(ln && ln.from);
    if (from.kind !== "end" || !deviceIds.has(from.rectId)) continue;
    if (!Array.isArray(ln && ln.orthogonalPoints) || !ln.orthogonalPoints.length) continue;
    const start = findFlowAnchorByEndpoint(ln.from);
    const end = findFlowAnchorByEndpoint(ln.to);
    if (!start || !end) continue;
    const points = routeOrthogonalPointsLocal([start, ...ln.orthogonalPoints, end]);
    if (points.length < 3) continue;
    targets.push({ index, key: linkKey(ln), ln, points, start, end });
  }
  if (targets.length < 2) return false;
  const makeSegmentRecords = () => {
    const records = [];
    for (let linkIndex = 0; linkIndex < targets.length; linkIndex++) {
      const points = targets[linkIndex].points;
      for (let segIndex = 0; segIndex < points.length - 1; segIndex++) {
        if (segIndex === 0 || segIndex === points.length - 2) continue;
        const a = points[segIndex], b = points[segIndex + 1];
        const vertical = Math.abs(num(a.x) - num(b.x)) < 0.5;
        const horizontal = Math.abs(num(a.y) - num(b.y)) < 0.5;
        if (!vertical && !horizontal) continue;
        const len = Math.abs(num(a.x) - num(b.x)) + Math.abs(num(a.y) - num(b.y));
        if (len < 24) continue;
        records.push({
          linkIndex,
          segIndex,
          orientation: vertical ? "v" : "h",
          coord: vertical ? num(a.x) : num(a.y),
          from: vertical ? Math.min(num(a.y), num(b.y)) : Math.min(num(a.x), num(b.x)),
          to: vertical ? Math.max(num(a.y), num(b.y)) : Math.max(num(a.x), num(b.x))
        });
      }
    }
    return records;
  };
  const segmentRelated = (a, b) => a.orientation === b.orientation
    && Math.abs(a.coord - b.coord) <= nearDistance
    && intervalOverlap(a.from, a.to, b.from, b.to) >= minOverlap;
  const setSegmentCoord = (target, segIndex, orientation, coord) => {
    const pts = target.points.slice();
    const lastIndex = pts.length - 1;
    if (segIndex < 0 || segIndex >= lastIndex) return false;
    const rounded = Math.round(coord);
    if (orientation === "v") {
      const insertedStart = segIndex === 0;
      if (insertedStart) pts.splice(1, 0, { x: rounded, y: pts[0].y });
      const insertedEnd = segIndex + 1 === lastIndex;
      if (insertedEnd) pts.splice(pts.length - 1, 0, { x: rounded, y: pts[pts.length - 1].y });
      const i0 = insertedStart ? 1 : segIndex;
      const i1 = insertedEnd ? pts.length - 2 : segIndex + 1 + (insertedStart ? 1 : 0);
      pts[i0] = { x: rounded, y: pts[i0].y };
      pts[i1] = { x: rounded, y: pts[i1].y };
    } else {
      const insertedStart = segIndex === 0;
      if (insertedStart) pts.splice(1, 0, { x: pts[0].x, y: rounded });
      const insertedEnd = segIndex + 1 === lastIndex;
      if (insertedEnd) pts.splice(pts.length - 1, 0, { x: pts[pts.length - 1].x, y: rounded });
      const i0 = insertedStart ? 1 : segIndex;
      const i1 = insertedEnd ? pts.length - 2 : segIndex + 1 + (insertedStart ? 1 : 0);
      pts[i0] = { x: pts[i0].x, y: rounded };
      pts[i1] = { x: pts[i1].x, y: rounded };
    }
    const next = routeOrthogonalPointsLocal(pts);
    if (next.length < 2) return false;
    target.points = next;
    return true;
  };
  let changed = false;
  for (let pass = 0; pass < 3; pass++) {
    const records = makeSegmentRecords();
    const used = new Set();
    const layouts = [];
    for (let i = 0; i < records.length; i++) {
      if (used.has(i)) continue;
      const group = [i];
      used.add(i);
      for (let expanded = true; expanded;) {
        expanded = false;
        for (let j = 0; j < records.length; j++) {
          if (used.has(j)) continue;
          if (group.some(k => segmentRelated(records[k], records[j]))) {
            group.push(j);
            used.add(j);
            expanded = true;
          }
        }
      }
      if (group.length < 2) continue;
      const items = group.map(k => records[k])
        .sort((a, b) => a.from - b.from || (b.to - b.from) - (a.to - a.from) || a.coord - b.coord || a.linkIndex - b.linkIndex || a.segIndex - b.segIndex);
      const minCoord = items.reduce((min, it) => Math.min(min, it.coord), Infinity);
      const maxCoord = items.reduce((max, it) => Math.max(max, it.coord), -Infinity);
      if (!Number.isFinite(minCoord) || !Number.isFinite(maxCoord) || Math.abs(maxCoord - minCoord) < 0.5) continue;
      const lanes = [];
      const intervalConflict = (a, b) => intervalOverlap(a.from, a.to, b.from, b.to) >= minOverlap;
      for (const rec of items) {
        let lane = null;
        for (const candidate of lanes) {
          if (!candidate.some(other => intervalConflict(rec, other))) {
            lane = candidate;
            break;
          }
        }
        if (lane) lane.push(rec);
        else lanes.push([rec]);
      }
      if (lanes.length < 2) continue;
      lanes.sort((a, b) => {
        const ac = a.reduce((sum, it) => sum + it.coord, 0) / a.length;
        const bc = b.reduce((sum, it) => sum + it.coord, 0) / b.length;
        return ac - bc;
      });
      const laneGap = (maxCoord - minCoord) / Math.max(1, lanes.length - 1);
      if (laneGap < 0.5) continue;
      layouts.push({
        lanes,
        center: (minCoord + maxCoord) / 2,
        laneGap
      });
    }
    const commonLaneGap = layouts.reduce((min, it) => Math.min(min, it.laneGap), Infinity);
    if (!Number.isFinite(commonLaneGap) || commonLaneGap < 0.5) continue;
    for (const layout of layouts) {
      const startCoord = layout.center - commonLaneGap * (layout.lanes.length - 1) / 2;
      for (let laneIndex = 0; laneIndex < layout.lanes.length; laneIndex++) {
        const nextCoord = startCoord + commonLaneGap * laneIndex;
        for (const rec of layout.lanes[laneIndex]) {
          if (Math.abs(rec.coord - nextCoord) < 0.5) continue;
          if (setSegmentCoord(targets[rec.linkIndex], rec.segIndex, rec.orientation, nextCoord)) changed = true;
        }
      }
    }
  }
  if (!changed) return false;
  for (const target of targets) {
    const idx = target.index;
    const full = cleanPoints(target.points);
    links[idx] = { ...links[idx], orthogonalPoints: full.slice(1, -1), controlPointCount: 2, controlOffsets: [] };
  }
  st.flowLinks = links;
  schedulePersist("project");
  syncProps();
  render();
  return true;
};
if (el.btnAutoRouteDeviceOutLinks) {
  bindClick(el.btnAutoRouteDeviceOutLinks, () => routeSelectedDeviceOutLinksOrthogonal());
}
if (el.btnImproveDeviceOutLinks) {
  bindClick(el.btnImproveDeviceOutLinks, () => improveSelectedDeviceOutLinks());
}
const syncPropsBase = syncProps;
syncProps = () => {
  syncPropsBase();
  syncCabinetToolPanel();
};
const inputWiringServices = {
  cv, st, el, render, renderOverlay, hit, s2w, zc, getViewMetrics,
  getRectById, worldToRectUV, rectUVToWorld,
  isNoteMode, isMaskMode, isCellEditMode, isCabinetEditMode, isClusterEditMode, isRigEditMode,
  cur, isRectLocked, addMaskPoint, toggleCellLinkAtPoint, beginCellKnifeDragAtPoint, updateCellKnifeDragAtPoint,
  beginClusterHandleDragAtPoint, handleClusterEditAtPoint,
  handleRigPointerDown, handleRigPointerMove, handleRigPointerLeave, handleFlowEditPointerDown, handleCabinetEditPointerDown, handleCabinetEditPointerMove,
  selRect, isSelected, beginRectDrag, beginSelectionBox,
  setSelection, syncPropsSmart, snapMaskNode, getCellLinkCandidateAtPoint, getRigHitAtPoint,
  updateClusterHandleDragAtPoint, updateClusterEditCursor,
  findClusterHandle, findActiveClusterBorder, findClusterStartMarker, cellFromWorldPoint,
  drawCellX, drawCellY,
  updateFlowLinkDragTarget, resetFlowHoverTransient,
  findFlowLinkAtPoint, findFlowStartHandle, findFlowDirectionButton, findFlowResetButton, findFlowEditPoint,
  setFlowLinkManualBezierPoint, moveFlowLinkOrthogonalSegment, deleteFlowLinkOrthogonalSegment,
  moveRectDrag, updateSelectionBox, finishSelectionBox,
  endClusterHandleDrag, addFlowLinkBetween, setFlowStart, setFlowLock, updateManualFlowPoint, dragManualFlowPoint,
  mkNote, mk, mkShape, mkDevice, isNoteRect, isShapeRect, openNoteEditor, setMode, refreshPanels, schedulePersist,
  shapePointHit: (r, wx, wy, z) => shapePointHit(r, wx, wy, z),
  shapePointHits: (r, wx, wy, z) => shapePointHits(r, wx, wy, z),
  shapeEditHits: (r, wx, wy, z) => shapeEditHits(r, wx, wy, z),
  shapeControlHit: (r, wx, wy, z) => shapeControlHit(r, wx, wy, z),
  shapeSegmentHit: (r, wx, wy, z) => shapeSegmentHit(r, wx, wy, z),
  normalizeShapeBounds: r => normalizeShapeBounds(r),
  resetCellTransient, resetClusterHoverTransient, resetRigHoverTransient,
  resetFlowRegionOverrides, syncProps,
  refreshMultiSelectionBase,
  buildRebuiltFlowPreview,
  rebuildAndPatchFlowRegion,
  hitLayerButton: (x, y) => hitLayerButton(x, y, st.zoom),
  setLayerButtonHover: (x, y) => setLayerButtonHover(x, y, st.zoom),
  clearLayerButtonHover: () => clearLayerButtonHover(),
  hitMultiSelectionAction: (x, y) => multiSelectionActions.hitAction(x, y, st.zoom),
  hitMultiSelectionResizeHandle: (x, y) => multiSelectionActions.hitResizeHandle(x, y, st.zoom),
  setMultiSelectionActionHover: (x, y) => multiSelectionActions.setHover(x, y, st.zoom),
  clearMultiSelectionActionHover: () => multiSelectionActions.clearHover(),
  applyMultiSelectionAction: id => multiSelectionActions.applyAction(id),
  beginMultiSelectionResize: (handle, p) => multiSelectionActions.beginResize(handle, p),
  updateMultiSelectionResize: (p, opts) => multiSelectionActions.updateResize(p, opts),
  endMultiSelectionResize: () => multiSelectionActions.endResize(),
  bindEvent, bindWindowEvent, zoomAt
};
setupInputController({ ...inputWiringServices });
let getActionTargets = () => [];
let applyToTargets = (_visitor, _opts = {}) => 0;
let applyToTargetsAndRender = (_visitor, _opts = {}, _after = null) => 0;
({
  getActionTargets,
  applyToTargets,
  applyToTargetsAndRender
} = setupTargetActionsFeature({
  getSelectedRects,
  cur: editorCtx.actions.cur,
  isRectLocked: r => isRectLocked(r),
  syncProps: editorCtx.actions.syncProps,
  listRects: editorCtx.actions.listRects,
  schedulePersist: editorCtx.actions.schedulePersist,
  render: editorCtx.actions.render
}));
const bindCommitInput = (node, onCommit) => {
  if (!node || !onCommit) return;
  node.addEventListener("change", onCommit);
  node.addEventListener("keydown", e => { if (e.key === "Enter") onCommit(e); });
};
setupPropsInputBindingsFeature({
  st,
  el,
  bindEvent: editorCtx.ui.bindEvent,
  bindEvents,
  bindCommitInputs,
  bindCommitInput,
  applyProps: opts => applyProps(opts),
  syncProps: editorCtx.actions.syncProps,
  applyToTargets,
  ...propsRenderShared,
  invalidateRectCache,
  evalExpr,
  updateRectTextSizeLabel,
  scheduleFontReadyRender,
  bindSplitVariantHandlers,
  pxFromMetric: r => pxFromMetric(r),
  remapRectRigLoadsToBottomSeams: r => remapRectRigLoadsToBottomSeams(r),
  isRectLocked: r => isRectLocked(r),
  parseAreaM2PxInput,
  getAreaM2BadgeLabel,
  getAreaM2PresetValues: () => getAreaM2PresetValues(document),
  setAreaM2ExpressionSource,
  updateAreaM2Badge,
  persistProjectAndRender
});
const {
  bindProxyClick,
  updateMobileDock,
  openHelpModal,
  closeHelpModal,
  showMessageModal,
  buildFlowSpecText
} = (() => {
  const uiTailShared = {
    bindClick: editorCtx.ui.bindClick,
    bindEvent: editorCtx.ui.bindEvent,
    t: editorCtx.ui.t
  };
  const uiTailRenderShared = {
    syncProps: editorCtx.actions.syncProps,
    listRects: editorCtx.actions.listRects,
    render: editorCtx.actions.render,
    schedulePersist: editorCtx.actions.schedulePersist
  };
  return setupUiTailFeature({
  toolbarDeps: {
    el,
    st,
    bindClick: uiTailShared.bindClick,
    bindEvent: uiTailShared.bindEvent,
    setViewMode,
    isInstallViewMode,
    activateToolOrSelect: mode => activateToolOrSelect(mode),
    setMode,
    setLockAll,
    newProject,
    dupSel,
    dupMirrorSel,
    delSel,
    getViewMetrics: editorCtx.actions.getViewMetrics,
    zoomAt,
    render: editorCtx.actions.render,
    fit,
    getActionTargets: editorCtx.actions.getActionTargets,
    applyToTargets,
    autoContrast,
    invalidateRectCache,
    randomColor,
    undoHistory,
    redoHistory,
    commitProjectChange,
    setupToolbarActionsController
  },
  mobileDeps: {
    windowRef: window,
    el,
    bindEvent: uiTailShared.bindEvent,
    st,
    normalizeViewMode,
    t: uiTailShared.t
  },
  modalDeps: {
    windowRef: window,
    getById: id => document.getElementById(id),
    el,
    focusAndSelect,
    lsSet: lsSetSafe,
    HELP_SEEN_KEY,
    setupProjectLinkModalController,
    t: uiTailShared.t
  },
  resetDeps: {
    el,
    st,
    bindClick: uiTailShared.bindClick,
    applyToTargetsAndRender,
    hiddenCache,
    invalidateRectCache,
    clearFlowLockMemory: r => clearFlowLockMemory(r),
    getRectCalcCache: r => getRectCalcCache(r),
    clearRectRegionsAndFlow: r => clearRectRegionsAndFlow(r)
  },
  convertDeps: {
    el,
    st,
    bindClick: uiTailShared.bindClick,
    cur: editorCtx.actions.cur,
    isRectLocked: r => isRectLocked(r),
    isNoteRect: r => isNoteRect(r) || isShapeRect(r) || isDeviceRect(r),
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    getHiddenSet: r => getHiddenSet(r),
    planNumberRegions,
    maskCellKey,
    mk,
    withNameSuffixBeforeGroup,
    autoContrast,
    hiddenCache,
    metricFromPx: r => metricFromPx(r),
    setSelection,
    resetTransientState: full => resetTransientState(full),
    ...uiTailRenderShared,
    t: uiTailShared.t
  },
  postSetupDeps: {
    windowRef: window,
    documentRef: document,
    navigatorRef: navigator,
    locationRef: location,
    promptFn: prompt,
    st,
    el,
    bindClick: uiTailShared.bindClick,
    bindEvent: uiTailShared.bindEvent,
    bindWindowEvent: editorCtx.ui.bindWindowEvent,
    eventClosest,
    lsGet: lsGetSafe,
    lsSet: lsSetSafe,
    INSTALL_HINT_KEY,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    extractProjectFromPngBytes,
    PNG_PROJECT_META_KEY,
    loadProjectIntoActiveState,
    syncActiveTabSnapshot,
    renderProjectTabs,
    ...uiTailRenderShared,
    refreshPanels,
    encodeProjectToQueryValue,
    buildPortableProject,
    saveProjectToServer,
    getProjectName: () => st.projectName,
    getProjectGuid: () => String(st.projectGuid || ""),
    PROJECT_QUERY_PARAM,
    PROJECT_ID_PARAM,
    buildProject,
    projectFileBase,
    getSaveLocationId: () => st.saveLocationId,
    t: uiTailShared.t,
    setupInstallBannerController,
    setupProjectActionsFeature,
    setupSpecExportFeature,
    specExportDeps: {
      st,
      el,
      bindClick: uiTailShared.bindClick,
      isNoteRect: r => isNoteRect(r) || isShapeRect(r) || isDeviceRect(r),
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
      buildPortableProject,
      encodeProjectToQueryValue,
      saveProjectToServer,
      getProjectName: () => st.projectName,
      getProjectGuid: () => String(st.projectGuid || ""),
      PROJECT_QUERY_PARAM,
      PROJECT_ID_PARAM,
      onViewerUrlUpdated: () => refreshSpecAuto(true),
      PNG_PROJECT_META_KEY,
      projectFileBase,
      setGlobalSaveLocationId,
      getGlobalSaveLocationId,
      saveStatus,
      schedulePersist: uiTailRenderShared.schedulePersist,
      persistNow,
      flushSpecCustomEditors,
      showMessageModal: (...args) => showMessageModal(...args),
      t: uiTailShared.t
    }
  }
  });
})();
if (typeof buildFlowSpecText === "function") buildFlowSpecTextForView = () => buildFlowSpecText();
try {
  if (typeof window !== "undefined") {
    window.ledMaskBuildFlatSpecText = () => {
      if (typeof buildFlowSpecText !== "function") return "";
      return buildFlowSpecText({
        includeManual: true,
        cachedOnly: true,
        viewerUrl: VIEWER_MODE ? " " : undefined
      });
    };
  }
} catch { /* noop */ }
updateSpecViewUi(true);
const appBootstrapDeps = {
  st,
  el,
  themeMedia,
  overflowHiddenButtons,
  bindEvent: editorCtx.ui.bindEvent,
  bindClick: editorCtx.ui.bindClick,
  bindWindowEvent: editorCtx.ui.bindWindowEvent,
  bindProxyClick,
  lsGet: lsGetSafe,
  lsSet: lsSetSafe,
  HELP_SEEN_KEY,
  openHelpModal,
  closeHelpModal,
  syncActiveTabSnapshot,
  renderProjectTabs,
  syncProps: editorCtx.actions.syncProps,
  schedulePersist: editorCtx.actions.schedulePersist,
  createProjectTab,
  makeEmptyProjectData,
  applyThemeMode,
  hideThemePopup,
  showThemePopup,
  hideToolbarOverflowPopup,
  showToolbarOverflowPopup,
  updateMobileDock,
  updateToolbarOverflow,
  persistNow,
  scheduleCanvasResize,
  render: editorCtx.actions.render,
  undoHistory,
  redoHistory,
  setMode: editorCtx.actions.setMode,
  isMaskMode,
  applyMaskPath,
  delSel,
  dupSel,
  cur: editorCtx.actions.cur,
  cloneRectForClipboard,
  cloneRectForDuplicate,
  insertCloneAboveSource,
  selRect,
  getEditableSelectedRects,
  commitUiUpdate,
  normalizeThemeMode,
  THEME_MODE_KEY,
  setGlobalSaveLocationId,
  getGlobalSaveLocationId,
  updateAppViewportHeight,
  saveStatus,
  getProjectDataFromQueryParam,
  showMessageModal,
  restoreAutoSave,
  mk,
  autoContrast,
  resize,
  refreshPanels: editorCtx.actions.refreshPanels,
  fit,
  cloneProjectData,
  buildProject,
  loadProjectIntoActiveState,
  clearProjectQueryParamFromUrl,
  initHistoryCurrent,
  ensureFontReady,
  hideStartupLoader,
  PROJECT_QUERY_VERSION,
  PROJECT_QUERY_PARAM,
  encodeProjectToQueryValue,
  decodeProjectFromQueryValue,
  buildPortableProject,
  t: editorCtx.ui.t
};
setupAppBootstrapFeature(appBootstrapDeps);
i18n = setupI18n({
  documentRef: document,
  navigatorRef: navigator,
  languageToggle: el.languageToggle,
  onLanguageChange: () => {
    if (typeof syncThemePopupLabels === "function") syncThemePopupLabels();
    updateSpecViewUi(true);
    render(true);
    updateToolbarOverflow();
    if (i18n) i18n.translateDom(document.body);
  }
});
i18n.translateDom(document.body);


