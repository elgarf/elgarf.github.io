import { createProjectCodec } from "./modules/project-codec.js";
import { createEditorDomRefs, createInitialEditorState } from "./modules/app-shell.js";
import { setupI18n, translateText } from "./modules/i18n.js";
import { createToolFsm, createModePredicates } from "./modules/tool-fsm.js";
import { createRectPropSchema } from "./modules/props-schema.js";
import { touchProgressState, setCacheWithPrune } from "./modules/cache-utils.js";
import { autoContrast, hexRgb, hslToRgb, pickByContrast, rgbHex, rgbToHsl, contrastRatio, shadeHex, randomColor, rectTextTheme, bwTextForRgb } from "./modules/utils/color-utils.js";
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
import {
  normalizeSaveLocationId, normalizeHiddenCells, normalizeManualClusters, normalizeRigData,
  normalizeDataFlow, normalizeDataFlowZ, normalizeFlowLocks, normalizeFlowLockRidToSigMap,
  normalizeFlowLockCidToSeedMap, normalizeFlowLinks, normalizeThemeMode, normalizeViewMode,
  normalizeCabinetUnit
} from "./modules/project-normalizers.js";
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
const safeDefine = (obj, key, value, enumerable = false) => {
  try {
    Object.defineProperty(obj, key, { value, writable: true, configurable: true, enumerable: !!enumerable });
  } catch (_e) {
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
    fontFamilyCss: value => fontFamilyCss(value),
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
    return normalizeSaveLocationId(lsGet(SAVE_LOCATION_ID_KEY, "") || "");
  } catch (_e) {
    return "ledmask-default";
  }
};
const setGlobalSaveLocationId = id => {
  const norm = normalizeSaveLocationId(id);
  lsSet(SAVE_LOCATION_ID_KEY, norm);
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
  try { delete r._flowLockRidToSig; } catch (_e) { r._flowLockRidToSig = {}; }
  try { delete r._flowLockSigToCfg; } catch (_e) { r._flowLockSigToCfg = {}; }
  try { delete r._flowLockCidToSeed; } catch (_e) { r._flowLockCidToSeed = {}; }
};
let cellFromWorldPoint = (_r, _wx, _wy, _skipHidden = true) => null;
const {
  isMaskMode,
  isCellEditMode,
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
  getFlowRegionConfig: (r, rid) => getFlowRegionConfig(r, rid),
  getFlowStartRoutingRegion,
  FLOW_DIR_SET
});
const {
  flowAnchorKey,
  findFlowAnchorByEndpoint,
  pruneFlowLinks,
  canLinkFlowAnchors,
  toggleFlowLinkBetween,
  addFlowLinkBetween,
  findFlowLinkAtPoint,
  findFlowLinkAnchorAtPoint,
  updateFlowLinkDragTarget
} = setupFlowLinkFeature({
  st,
  normalizeFlowLinks,
  getRectRuntime: (r, opts) => getRectRuntime(r, opts),
  drawCellX: r => drawCellX(r),
  drawCellY: r => drawCellY(r),
  getCellTopologyCached: (r, cx, cy) => getCellTopologyCached(r, cx, cy),
  rectAABBMasked: r => rectAABBMasked(r),
  AREA_LIMIT_EPS,
  getFlowDrawRenderEpoch: () => flowDrawRenderEpoch,
  getSplitFlowMarkerWorldPositions: (r, pts) => getSplitFlowMarkerWorldPositions(r, pts),
  rectUVToWorld: (r, u, v) => rectUVToWorld(r, u, v)
});
const { drawInterScreenFlowLinks } = setupInterScreenLinksRender({
  st,
  isCellEditMode: () => isCellEditMode(),
  isRigEditMode: () => isRigEditMode(),
  normalizeViewMode,
  normalizeFlowLinks,
  flowAnchorKey,
  findFlowAnchorByEndpoint: ep => findFlowAnchorByEndpoint(ep)
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
  fontFamilyCss: value => fontFamilyCss(value),
  t: value => translateText(value)
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
  fontFamilyCss: value => fontFamilyCss(value),
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
  t: value => translateText(value)
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
try { if (typeof window !== "undefined") window.ledMaskCalcMetrics = calcMetrics; } catch (_e) { }
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
  t: value => translateText(value)
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
({
  updateSpecViewUi,
  refreshAutoSpec: refreshSpecAuto
} = setupSpecViewController({
  st,
  el,
  wrap,
  normalizeViewMode,
  commitProjectChange: opts => commitProjectChange(opts),
  getAutoSpecText: () => buildFlowSpecTextForView(),
  getLanguage: () => i18n ? i18n.getLanguage() : "",
  t: value => translateText(value)
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
  onViewModeUiUpdated: () => updateSpecViewUi(),
  refreshToolButtons: () => setMode(st.mode),
  commitProjectChange: opts => commitProjectChange(opts),
  setMode: m => setMode(m),
  cancelActiveDrag: () => cancelActiveDrag(),
  isInstallOnlyToolMode,
  lsSet,
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
const setViewMode = viewThemeLockController.setViewMode;
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
let buildProject = () => ({ version: 1, projectName: "Новый проект", saveLocationId: "", camera: { x: 0, y: 0, zoom: 1 }, settings: { textSize: 32, fontFamily: "Roboto", scale: 256, viewMode: "art", specCustomText: "", specCustomSections: {}, lockAll: false, installLayers: { text: true, flow: true, rig: true }, snap: { grid: false, objects: true, centers: true, gaps: true } }, nextId: 1, flowLinks: [], rectangles: [] });
let cloneProjectData = data => cloneJson(data, () => buildProject());
let makeEmptyProjectData = (name = translateText("Новый проект")) => ({ version: 1, projectName: name, saveLocationId: genSaveLocationId(name), camera: { x: 0, y: 0, zoom: 1 }, settings: { textSize: 32, fontFamily: "Roboto", scale: 256, viewMode: "art", specCustomText: "", specCustomSections: {}, lockAll: false, installLayers: { text: true, flow: true, rig: true }, snap: { grid: false, objects: true, centers: true, gaps: true } }, nextId: 1, flowLinks: [], rectangles: [] });
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
  t: value => translateText(value)
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
  lsSet,
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
};
const ensureFontReady = async () => {
  if (st.fontReady) return;
  if (!document.fonts || !document.fonts.ready) { st.fontReady = true; return; }
  const localMax = st.rects.reduce((m, r) => Math.max(m, Math.max(0, Number(r && r.textSize) || 0)), 0);
  const size = Math.max(6, st.textSize || 12, localMax);
  const family = fontFamilyCss(st.fontFamily);
  try { await document.fonts.load(`${size}px ${family}`); } catch (_e) { }
  try { await document.fonts.ready; } catch (_e) { }
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
({
  metricFromPx,
  pxFromMetric,
  parseProjectRect,
  mk,
  mkNote
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
  syncProps,
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
  lsGet,
  TABS_SAVE_KEY,
  AUTO_SAVE_KEY,
  setGlobalSaveLocationId,
  getGlobalSaveLocationId,
  genSaveLocationId,
  zc,
  normalizeViewMode,
  evalExpr
}));
const isNoteRect = r => String((r && r.kind) || "").toLowerCase() === "note";
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
  syncProps,
  syncPropsSmart: () => syncPropsSmart(),
  updateModeBadges,
  updateClusterEditCursor,
  render: () => render(),
  isSelected,
  toggleRectLockById,
  persistProjectAndRender
}));
const multiSelectionActions = setupMultiSelectionActionsController({
  st,
  getSelectedRects: () => getSelectedRects(),
  rectAABB,
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
const { drawRectBase } = setupDrawRectBaseController({
  st,
  isNoteRect: r => isNoteRect(r),
  drawNoteRect: (c, r, sel, z) => drawNoteRect(c, r, sel, z),
  drawCellX: r => drawCellX(r),
  drawCellY: r => drawCellY(r),
  getHiddenSet: r => getHiddenSet(r),
  rads,
  rectCenter,
  normalizeViewMode,
  getCellTopologyCached: (r, cx, cy) => getCellTopologyCached(r, cx, cy),
  getMaskRenderDataCached: (r, cx, cy, hs, topo) => getMaskRenderDataCached(r, cx, cy, hs, topo),
  isMaskMode: () => isMaskMode(),
  isCellEditMode: () => isCellEditMode(),
  isClusterEditMode: () => isClusterEditMode(),
  isRigEditMode: () => isRigEditMode(),
  normalizeDataFlow,
  planNumberRegions: (r, cx, cy, topo, hs, useCache) => planNumberRegions(r, cx, cy, topo, hs, useCache),
  updateSplitVariantControl: r => updateSplitVariantControl(r),
  getDataFlowGroups: (r, cx, cy, topo, hs, regions, opts) => getDataFlowGroups(r, cx, cy, topo, hs, regions, opts),
  collectFlowLinkAnchors: (r, groups) => collectFlowLinkAnchors(r, groups),
  collectFlowEditPoints: (r, groups, opts) => collectFlowEditPoints(r, groups, opts),
  collectFlowManualPickPoints: (r, cx, cy, topo, hs, regions) => collectFlowManualPickPoints(r, cx, cy, topo, hs, regions),
  getRectFillLayerCached: (r, cx, cy, topo, maskRender, lowDetail, z) => getRectFillLayerCached(r, cx, cy, topo, maskRender, lowDetail, z),
  getRectDecorLayerCached: (r, maskRender, z) => getRectDecorLayerCached(r, maskRender, z),
  getRectComponentRenderDataCached: (r, cx, cy, topo) => getRectComponentRenderDataCached(r, cx, cy, topo),
  rectTextTheme: r => rectTextTheme(r),
  fontFamilyCss,
  toLetters,
  mFmt,
  pctFmt,
  fillPercent,
  getRectTextSizePx: r => getRectTextSizePx(r),
  buildVisibleCabinetSummary: (r, cx, cy, topo, hs) => buildVisibleCabinetSummary(r, cx, cy, topo, hs),
  listSignature,
  getRectTextLayoutCached: (r, key, compute) => getRectTextLayoutCached(r, key, compute),
  hiddenCellBoxes: (r, cx, cy, hs) => hiddenCellBoxes(r, cx, cy, hs),
  computeFreeRects: (r, cx, cy, hs) => computeFreeRects(r, cx, cy, hs),
  chooseTextLayout,
  t: value => translateText(value),
  REGION_ZONE_COLORS,
  getVisibleBoundarySegmentsCached: (r, cx, cy, hs) => getVisibleBoundarySegmentsCached(r, cx, cy, hs),
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
  drawCellX: r => drawCellX(r),
  drawCellY: r => drawCellY(r),
  getCellTopologyCached: (r, cx, cy) => getCellTopologyCached(r, cx, cy),
  getHiddenSet: r => getHiddenSet(r),
  maskCellKey,
  normalizeRigData,
  getRectRigData: r => getRectRigData(r),
  setRectRigData: r => setRectRigData(r),
  worldToRectUV: (r, wx, wy) => worldToRectUV(r, wx, wy),
  RIG_DEFAULT_LOAD_KG
}));
const { drawRigOnRect, drawRigOutsideOverlay } = setupRigRenderController({
  st,
  getRectRigData: r => getRectRigData(r),
  buildRigLayout: (r, cx, cy, topo, hs, z) => buildRigLayout(r, cx, cy, topo, hs, z),
  resolveRigFrameSeam: (layout, cellY, key) => resolveRigFrameSeam(layout, cellY, key),
  drawLoadIcon: (c, x, y, size, opts) => drawLoadIcon(c, x, y, size, opts),
  fontFamilyCss: value => fontFamilyCss(value),
  isRigEditMode: () => isRigEditMode(),
  rectUVToWorld: (r, u, v) => rectUVToWorld(r, u, v),
  RIG_DEFAULT_LOAD_KG
});
const { drawMaskOverlay, drawCellEditOverlay, drawContentBounds, drawLayerButtons, hitLayerButton, setLayerButtonHover, clearLayerButtonHover } = setupViewportOverlays({
  st,
  isMaskMode: () => isMaskMode(),
  isCellEditMode: () => isCellEditMode(),
  cur: () => cur(),
  getMaskNodeAxes: r => getMaskNodeAxes(r),
  rectUVToWorld: (r, u, v) => rectUVToWorld(r, u, v),
  drawCellX: r => drawCellX(r),
  drawCellY: r => drawCellY(r),
  getCellTopologyCached: (r, cx, cy) => getCellTopologyCached(r, cx, cy),
  buildVisibleCabinetSummary: (r, cx, cy, topo, hs) => buildVisibleCabinetSummary(r, cx, cy, topo, hs),
  getHiddenSet: r => getHiddenSet(r),
  fontFamilyCss,
  rectAABBMasked: r => rectAABBMasked(r),
  listSignature,
  t: value => translateText(value)
});
const { drawInstallSummaryOverlay } = setupInstallSummaryOverlay({
  st,
  cv,
  wrap,
  normalizeViewMode,
  drawCellX: r => drawCellX(r),
  drawCellY: r => drawCellY(r),
  getCellTopologyCached: (r, cx, cy) => getCellTopologyCached(r, cx, cy),
  getHiddenSet: r => getHiddenSet(r),
  buildVisibleCabinetSummary: (r, cx, cy, topo, hs) => buildVisibleCabinetSummary(r, cx, cy, topo, hs),
  fontFamilyCss,
  mFmt,
  isNoteRect: r => isNoteRect(r),
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
  drawMaskOverlay,
  drawCellEditOverlay,
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
  updateFlowLinkDragTarget,
  findFlowEditPoint,
  setSelection,
  syncPropsSmart: () => syncPropsSmart(),
  getRigHitAtPoint,
  applyRigActionAtPoint,
  resetRigHoverTransient,
  commitUiUpdate
}));
let delSel = () => { };
let dupSel = () => { };
let insertCloneAboveSource = (_sourceId, _clone) => { };
let cloneRectForClipboard = _src => _src;
let cloneRectForDuplicate = _src => _src;
let resetProjectCore = () => { };
let newProject = () => { };
({
  resetProjectCore,
  newProject
} = setupProjectLifecycleController({
  st,
  el,
  setSelection: (ids, lead) => setSelection(ids, lead),
  resetTransientState: full => resetTransientState(full),
  setMode: mode => setMode(mode),
  refreshPanels: () => refreshPanels(),
  syncActiveTabSnapshot: () => syncActiveTabSnapshot(),
  renderProjectTabs: () => renderProjectTabs(),
  commitUiUpdate: opts => commitUiUpdate(opts),
  updateViewModeUi: () => updateViewModeUi(),
  setGlobalSaveLocationId: id => setGlobalSaveLocationId(id),
  getGlobalSaveLocationId: () => getGlobalSaveLocationId(),
  genSaveLocationId: name => genSaveLocationId(name),
  t: value => translateText(value)
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
  setSelection: (ids, lead) => setSelection(ids, lead),
  resetTransientState: full => resetTransientState(full),
  refreshPanels: () => refreshPanels(),
  updateClusterEditCursor: () => updateClusterEditCursor(),
  commitUiUpdate: opts => commitUiUpdate(opts),
  normSelSet: () => normSelSet(),
  getSelectedRects: () => getSelectedRects(),
  cur: () => cur(),
  normalizeFlowLocks,
  normalizeManualClusters,
  normalizeRigData,
  autoContrast,
  withNameSuffixBeforeGroup,
  syncProps: () => syncProps(),
  listRects: () => listRects(),
  setMode: mode => setMode(mode),
  schedulePersist: kind => schedulePersist(kind)
}));
const { dupMirrorSel } = setupMirrorDuplicateFeature({
  st,
  cur: () => cur(),
  drawCellX,
  drawCellY,
  parseLinkKey,
  mkLinkKey,
  getCellTopology,
  withNameSuffixBeforeGroup,
  getHiddenSet: rect => getHiddenSet(rect),
  makeCalcBudget: () => makeCalcBudget(),
  calcNow: () => calcNow(),
  planNumberRegionsUncached,
  SPLIT_VARIANT_MAX,
  normalizeFlowLocks,
  normalizeRigData,
  RIG_DEFAULT_LOAD_KG,
  autoContrast,
  insertCloneAboveSource: (sourceId, clone) => insertCloneAboveSource(sourceId, clone),
  selRect: id => selRect(id),
  setMode: mode => setMode(mode),
  schedulePersist: kind => schedulePersist(kind)
});
function fit() {
  if (!st.rects.length) { st.camX = 0; st.camY = 0; st.zoom = 1; render(); return } let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9; for (const r of st.rects) { const bb = rectAABBMasked(r); minX = Math.min(minX, bb.minX); minY = Math.min(minY, bb.minY); maxX = Math.max(maxX, bb.maxX); maxY = Math.max(maxY, bb.maxY) }
  const vm = getViewMetrics(), w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY), pad = 80; st.zoom = zc(Math.min((vm.viewWidth - pad) / w, (vm.viewHeight - pad) / h)); st.camX = (minX + maxX) / 2; st.camY = (minY + maxY) / 2; render()
}
const updateRectTextSizeLabel = r => {
  if (!el.rectTextSizeLabel) return;
  const lv = Math.max(0, Math.min(128, Math.round(Number(r && r.textSize) || 0)));
  if (lv > 0) {
    el.rectTextSizeLabel.textContent = `${lv}px`;
    el.rectTextSizeLabel.title = `Локальный размер: ${lv}px`;
    el.rectTextSizeLabel.setAttribute("aria-label", `Локальный размер: ${lv}px`);
  } else {
    const gv = Math.round(st.textSize || 12);
    el.rectTextSizeLabel.innerHTML = '<i class="fa-solid fa-globe"></i>';
    el.rectTextSizeLabel.title = `Глобальный размер: ${gv}px`;
    el.rectTextSizeLabel.setAttribute("aria-label", `Глобальный размер: ${gv}px`);
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
  bindEvent: (...args) => bindEvent(...args),
  render: () => render(),
  getCurrentRect: () => cur()
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
  cur: () => cur(),
  normalizeCabinetUnit,
  mFmt,
  toPositiveInt,
  evalExpr
});
let applyProps = (_opts) => { };
({
  syncProps,
  applyProps
} = setupPropsPanelFeature({
  st,
  el,
  cur: () => cur(),
  isRectLocked: r => isRectLocked(r),
  isNoteRect: r => isNoteRect(r),
  getSelectedRects: () => getSelectedRects(),
  uiSetDisabled,
  uiSetValue,
  uiSetChecked,
  uiSetText,
  updateThemeUi: () => updateThemeUi(),
  updateViewModeUi: () => updateViewModeUi(),
  updateLockAllUi: () => updateLockAllUi(),
  mFmt,
  updateSplitVariantModeUi: arg => updateSplitVariantModeUi(arg),
  updateModeBadges: r => updateModeBadges(r),
  updateRectTextSizeLabel: r => updateRectTextSizeLabel(r),
  autoContrast,
  SPLIT_VARIANT_MAX,
  normalizeCabinetUnit,
  metricFromPx: rect => metricFromPx(rect),
  normalizeDataFlow,
  getFlowRegionConfig: (r, rid) => getFlowRegionConfig(r, rid),
  resolveFlowModeFromStartAndDir,
  getFlowModeRegion: (r, rid, fallback) => getFlowModeRegion(r, rid, fallback),
  updateSplitVariantControl: r => updateSplitVariantControl(r),
  cabinetPxToUi,
  getRectsBBox: rects => getRectsBBox(rects),
  evalExpr,
  parseAreaM2PxInput,
  pxFromMetric: rect => pxFromMetric(rect),
  refreshMultiSelectionBase: () => refreshMultiSelectionBase(),
  rectAABB,
  cabinetUiToPx,
  setFlowRegionMode: (r, rid, mode) => setFlowRegionMode(r, rid, mode),
  remapRectRigLoadsToBottomSeams: r => remapRectRigLoadsToBottomSeams(r),
  invalidateRectCache: (r, kind) => invalidateRectCache(r, kind),
  listRects: () => listRects(),
  schedulePersist: kind => schedulePersist(kind),
  render: () => render(),
  createRectPropSchema,
  getAreaM2BadgeLabel,
  getAreaM2PresetValues: () => getAreaM2PresetValues(document),
  updateAreaM2Badge,
  updateSplitVariantLabel: r => updateSplitVariantLabel(r)
}));
const { scheduleSyncProps, syncPropsSmart } = setupPropertiesSyncController({
  st,
  syncProps: () => syncProps(),
  requestFrame: cb => requestAnimationFrame(cb),
  cancelFrame: id => cancelAnimationFrame(id),
  setDelay: (cb, ms) => setTimeout(cb, ms),
  clearDelay: id => clearTimeout(id)
});
const inputWiringServices = {
  cv, st, el, render, renderOverlay, hit, s2w, zc, getViewMetrics,
  getRectById, worldToRectUV,
  isNoteMode, isMaskMode, isCellEditMode, isClusterEditMode, isRigEditMode,
  cur, isRectLocked, addMaskPoint, toggleCellLinkAtPoint,
  beginClusterHandleDragAtPoint, handleClusterEditAtPoint,
  handleRigPointerDown, handleRigPointerMove, handleRigPointerLeave, handleFlowEditPointerDown,
  selRect, isSelected, beginRectDrag, beginSelectionBox,
  setSelection, syncPropsSmart, snapMaskNode, getCellLinkCandidateAtPoint, getRigHitAtPoint,
  updateClusterHandleDragAtPoint, updateClusterEditCursor,
  findClusterHandle, findActiveClusterBorder, findClusterStartMarker, cellFromWorldPoint,
  updateFlowLinkDragTarget, resetFlowHoverTransient,
  findFlowLinkAtPoint, findFlowStartHandle, findFlowDirectionButton, findFlowResetButton, findFlowEditPoint,
  moveRectDrag, updateSelectionBox, finishSelectionBox,
  endClusterHandleDrag, addFlowLinkBetween, setFlowStart, setFlowLock, updateManualFlowPoint, dragManualFlowPoint,
  mkNote, mk, isNoteRect, openNoteEditor, setMode, refreshPanels, schedulePersist,
  resetCellTransient, resetClusterHoverTransient, resetRigHoverTransient,
  resetFlowRegionOverrides, syncProps,
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
  getSelectedRects: () => getSelectedRects(),
  cur: () => cur(),
  isRectLocked: r => isRectLocked(r),
  syncProps: () => syncProps(),
  listRects: () => listRects(),
  schedulePersist: kind => schedulePersist(kind),
  render: () => render()
}));
const bindCommitInput = (node, onCommit) => {
  if (!node || !onCommit) return;
  node.addEventListener("change", onCommit);
  node.addEventListener("keydown", e => { if (e.key === "Enter") onCommit(e); });
};
setupPropsInputBindingsFeature({
  st,
  el,
  bindEvent: (...args) => bindEvent(...args),
  bindEvents: (...args) => bindEvents(...args),
  bindCommitInputs: (...args) => bindCommitInputs(...args),
  bindCommitInput: (...args) => bindCommitInput(...args),
  applyProps: opts => applyProps(opts),
  syncProps: () => syncProps(),
  applyToTargets: (visitor, opts) => applyToTargets(visitor, opts),
  render: () => render(),
  invalidateRectCache: (r, kind) => invalidateRectCache(r, kind),
  cur: () => cur(),
  evalExpr,
  updateRectTextSizeLabel: r => updateRectTextSizeLabel(r),
  scheduleFontReadyRender: (state, delay) => scheduleFontReadyRender(state, delay),
  bindSplitVariantHandlers: () => bindSplitVariantHandlers(),
  pxFromMetric: r => pxFromMetric(r),
  remapRectRigLoadsToBottomSeams: r => remapRectRigLoadsToBottomSeams(r),
  schedulePersist: kind => schedulePersist(kind),
  listRects: () => listRects(),
  isRectLocked: r => isRectLocked(r),
  parseAreaM2PxInput: (input, fallback) => parseAreaM2PxInput(input, fallback),
  getAreaM2BadgeLabel,
  getAreaM2PresetValues: () => getAreaM2PresetValues(document),
  setAreaM2ExpressionSource,
  updateAreaM2Badge,
  persistProjectAndRender: () => persistProjectAndRender()
});
const {
  bindProxyClick,
  updateMobileDock,
  openHelpModal,
  closeHelpModal,
  showMessageModal,
  buildFlowSpecText
} = setupUiTailFeature({
  toolbarDeps: {
    el,
    st,
    bindClick: (...args) => bindClick(...args),
    bindEvent: (...args) => bindEvent(...args),
    setViewMode: (mode, persist) => setViewMode(mode, persist),
    isInstallViewMode: () => isInstallViewMode(),
    activateToolOrSelect: mode => activateToolOrSelect(mode),
    setMode: mode => setMode(mode),
    setLockAll: (next, persist) => setLockAll(next, persist),
    newProject: () => newProject(),
    dupSel: () => dupSel(),
    dupMirrorSel: () => dupMirrorSel(),
    delSel: () => delSel(),
    getViewMetrics: () => getViewMetrics(),
    zoomAt: (x, y, next) => zoomAt(x, y, next),
    render: () => render(),
    fit: () => fit(),
    getActionTargets: () => getActionTargets(),
    applyToTargets: (fn, opts) => applyToTargets(fn, opts),
    autoContrast,
    invalidateRectCache: (r, kind) => invalidateRectCache(r, kind),
    randomColor: () => randomColor(),
    undoHistory: () => undoHistory(),
    redoHistory: () => redoHistory(),
    commitProjectChange: opts => commitProjectChange(opts),
    setupToolbarActionsController
  },
  mobileDeps: {
    windowRef: window,
    el,
    bindEvent: (...args) => bindEvent(...args),
    st,
    normalizeViewMode,
    t: value => translateText(value)
  },
  modalDeps: {
    windowRef: window,
    getById: id => $(id),
    el,
    focusAndSelect,
    lsSet,
    HELP_SEEN_KEY,
    setupProjectLinkModalController
  },
  resetDeps: {
    el,
    st,
    bindClick: (...args) => bindClick(...args),
    applyToTargetsAndRender: (visitor, opts, after) => applyToTargetsAndRender(visitor, opts, after),
    hiddenCache,
    invalidateRectCache: (r, kind) => invalidateRectCache(r, kind),
    clearFlowLockMemory: r => clearFlowLockMemory(r),
    getRectCalcCache: r => getRectCalcCache(r),
    clearRectRegionsAndFlow: r => clearRectRegionsAndFlow(r)
  },
  convertDeps: {
    el,
    st,
    bindClick: (...args) => bindClick(...args),
    cur: () => cur(),
    isRectLocked: r => isRectLocked(r),
    isNoteRect: r => isNoteRect(r),
    drawCellX,
    drawCellY,
    getCellTopologyCached: (r, cx, cy) => getCellTopologyCached(r, cx, cy),
    getHiddenSet: r => getHiddenSet(r),
    planNumberRegions: (r, cx, cy, topo, hs, useCache) => planNumberRegions(r, cx, cy, topo, hs, useCache),
    maskCellKey,
    mk: (x, y, w, h) => mk(x, y, w, h),
    withNameSuffixBeforeGroup,
    autoContrast,
    hiddenCache,
    metricFromPx: r => metricFromPx(r),
    setSelection: (ids, activeId) => setSelection(ids, activeId),
    resetTransientState: full => resetTransientState(full),
    syncProps: () => syncProps(),
    listRects: () => listRects(),
    render: () => render(),
    schedulePersist: kind => schedulePersist(kind)
  },
  postSetupDeps: {
    windowRef: window,
    documentRef: document,
    navigatorRef: navigator,
    locationRef: location,
    promptFn: prompt,
    st,
    el,
    bindClick: (...args) => bindClick(...args),
    bindEvent: (...args) => bindEvent(...args),
    bindWindowEvent: (...args) => bindWindowEvent(...args),
    eventClosest: (...args) => eventClosest(...args),
    lsGet,
    lsSet,
    INSTALL_HINT_KEY,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    extractProjectFromPngBytes,
    PNG_PROJECT_META_KEY,
    loadProjectIntoActiveState: (...args) => loadProjectIntoActiveState(...args),
    syncActiveTabSnapshot: () => syncActiveTabSnapshot(),
    renderProjectTabs: () => renderProjectTabs(),
    schedulePersist: kind => schedulePersist(kind),
    encodeProjectToQueryValue,
    buildPortableProject: () => buildPortableProject(),
    saveProjectToServer,
    getProjectName: () => st.projectName,
    PROJECT_QUERY_PARAM,
    PROJECT_ID_PARAM,
    buildProject: () => buildProject(),
    projectFileBase: () => projectFileBase(),
    getSaveLocationId: () => st.saveLocationId,
    setupInstallBannerController,
    setupProjectActionsFeature,
    setupSpecExportFeature,
    specExportDeps: {
      st,
      el,
      bindClick: (...args) => bindClick(...args),
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
      ensureFontReady: () => ensureFontReady(),
      rectAABBMasked,
      drawRect: (...args) => drawRect(...args),
      drawInterScreenFlowLinks: (...args) => drawInterScreenFlowLinks(...args),
      getRectCalcCache,
      embedProjectIntoPngBlob,
      buildProject: () => buildProject(),
      PNG_PROJECT_META_KEY,
      projectFileBase: () => projectFileBase(),
      setGlobalSaveLocationId,
      getGlobalSaveLocationId,
      saveStatus,
      schedulePersist: kind => schedulePersist(kind),
      persistNow: () => persistNow(),
      showMessageModal: (...args) => showMessageModal(...args),
      t: value => translateText(value)
    }
  }
});
if (typeof buildFlowSpecText === "function") buildFlowSpecTextForView = () => buildFlowSpecText();
updateSpecViewUi(true);
const appBootstrapDeps = {
  st,
  el,
  themeMedia,
  overflowHiddenButtons,
  bindEvent,
  bindClick,
  bindWindowEvent,
  bindProxyClick,
  lsGet,
  lsSet,
  HELP_SEEN_KEY,
  openHelpModal,
  closeHelpModal,
  syncActiveTabSnapshot,
  renderProjectTabs,
  syncProps,
  schedulePersist,
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
  render,
  undoHistory,
  redoHistory,
  setMode,
  isMaskMode,
  applyMaskPath,
  delSel,
  dupSel,
  cur,
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
  refreshPanels,
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
  t: value => translateText(value)
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
