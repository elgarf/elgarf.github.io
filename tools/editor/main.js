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
st.controllerLayout = {
  active: false,
  controllerId: null,
  rectIds: [],
  groupsById: null,
  readOnly: false,
  nextTempId: 900000000
};
let controllerLayoutPrevMode = "select";
let controllerLayoutPrevView = null;
const isControllerLayoutModeActive = () => !!(st && st.controllerLayout && st.controllerLayout.active);
const getControllerLayoutRectIdSet = () => new Set(Array.isArray(st && st.controllerLayout && st.controllerLayout.rectIds) ? st.controllerLayout.rectIds : []);
const isControllerLayoutRect = rect => {
  if (!rect) return false;
  if (!isControllerLayoutModeActive()) return !(rect && rect._controllerLayoutTemp);
  if (rect && rect._controllerLayoutTemp !== true) return false;
  return getControllerLayoutRectIdSet().has(Math.max(1, Math.round(Number(rect.id) || 0)));
};
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
  clearControllerLayoutRuntimeState();
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
const isControllerDevice = rect => {
  if (!isDeviceRect(rect)) return false;
  return String(rect && rect.deviceType || "controller").toLowerCase() === "controller";
};
const getControllerLayoutLinksToScreens = controllerId => {
  const rectById = new Map((Array.isArray(st.rects) ? st.rects : []).map(r => [Math.max(1, Math.round(Number(r && r.id) || 0)), r]));
  const links = normalizeFlowLinks(st.flowLinks);
  const bestByRectId = new Map();
  for (const link of links) {
    const from = link && link.from;
    const to = link && link.to;
    const fromRectId = Math.max(1, Math.round(Number(from && from.rectId) || 0));
    const toRectId = Math.max(1, Math.round(Number(to && to.rectId) || 0));
    if (fromRectId !== controllerId) continue;
    if (String(from && from.kind || "").toLowerCase() !== "end") continue;
    const fromRect = rectById.get(fromRectId);
    const toRect = rectById.get(toRectId);
    if (!isControllerDevice(fromRect) || !toRect || isDeviceRect(toRect)) continue;
    const prev = bestByRectId.get(toRectId);
    const toKind = String(to && to.kind || "").toLowerCase() === "start" ? "start" : "end";
    if (!prev || (prev.kind !== "start" && toKind === "start")) {
      bestByRectId.set(toRectId, { rectId: toRectId, kind: toKind });
    }
  }
  return [...bestByRectId.values()].map(v => v.rectId);
};
const devicePortLabel = (r, cid) => {
  const labels = Array.isArray(r && r.deviceOutLabels) ? r.deviceOutLabels : [];
  const index = Math.max(1, Math.round(Number(cid) || 1)) - 1;
  const raw = String(labels[index] == null ? "" : labels[index]).trim();
  return raw || String(index + 1);
};
const getControllerLayoutRegionLinks = controllerId => {
  const links = normalizeFlowLinks(st.flowLinks);
  const byRegion = new Map();
  for (const link of links) {
    const from = link && link.from;
    const to = link && link.to;
    const fromRectId = Math.max(1, Math.round(Number(from && from.rectId) || 0));
    const toRectId = Math.max(1, Math.round(Number(to && to.rectId) || 0));
    const toRid = Math.max(0, Math.round(Number(to && to.rid) || 0));
    if (fromRectId !== controllerId) continue;
    if (String(from && from.kind || "").toLowerCase() !== "end") continue;
    const key = `${toRectId}:${toRid}`;
    const toKind = String(to && to.kind || "").toLowerCase() === "start" ? "start" : "end";
    const prev = byRegion.get(key);
    if (!prev || (prev.toKind !== "start" && toKind === "start")) {
      byRegion.set(key, {
        rectId: toRectId,
        rid: toRid,
        cid: Math.max(1, Math.round(Number(from && from.cid) || 1)),
        toKind
      });
    }
  }
  return [...byRegion.values()];
};
const makeRegionKey = (rectId, rid) => `${Math.max(1, Math.round(Number(rectId) || 0))}:${Math.max(0, Math.round(Number(rid) || 0))}`;
const parseRegionKey = key => {
  const parts = String(key || "").split(":");
  return {
    rectId: Math.max(1, Math.round(Number(parts[0]) || 0)),
    rid: Math.max(0, Math.round(Number(parts[1]) || 0))
  };
};
const buildRegionAdjacency = () => {
  const adj = new Map();
  const byRectId = new Map((Array.isArray(st.rects) ? st.rects : []).map(r => [Math.max(1, Math.round(Number(r && r.id) || 0)), r]));
  const addEdge = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a).add(b);
    adj.get(b).add(a);
  };
  for (const ln of normalizeFlowLinks(st.flowLinks)) {
    const from = ln && ln.from;
    const to = ln && ln.to;
    const fromRectId = Math.max(1, Math.round(Number(from && from.rectId) || 0));
    const toRectId = Math.max(1, Math.round(Number(to && to.rectId) || 0));
    const fromRect = byRectId.get(fromRectId);
    const toRect = byRectId.get(toRectId);
    if (!fromRect || !toRect || isDeviceRect(fromRect) || isDeviceRect(toRect)) continue;
    const a = makeRegionKey(fromRectId, from && from.rid);
    const b = makeRegionKey(toRectId, to && to.rid);
    if (a === b) continue;
    addEdge(a, b);
  }
  return adj;
};
const expandControllerLayoutRegionLinks = baseLinks => {
  const byRegion = new Map();
  for (const item of (Array.isArray(baseLinks) ? baseLinks : [])) {
    const key = makeRegionKey(item && item.rectId, item && item.rid);
    byRegion.set(key, {
      rectId: Math.max(1, Math.round(Number(item && item.rectId) || 0)),
      rid: Math.max(0, Math.round(Number(item && item.rid) || 0)),
      cid: Math.max(1, Math.round(Number(item && item.cid) || 1)),
      toKind: String(item && item.toKind || "end")
    });
  }
  const adj = buildRegionAdjacency();
  const q = [...byRegion.keys()];
  const seen = new Set(q);
  while (q.length) {
    const cur = q.shift();
    const seed = byRegion.get(cur);
    for (const nx of (adj.get(cur) || [])) {
      if (!seen.has(nx)) {
        const parsed = parseRegionKey(nx);
        byRegion.set(nx, {
          rectId: parsed.rectId,
          rid: parsed.rid,
          cid: seed ? seed.cid : 1,
          toKind: "end"
        });
        seen.add(nx);
        q.push(nx);
      }
    }
  }
  return [...byRegion.values()];
};
const buildLayoutTempRectLinkComponents = rects => {
  const list = Array.isArray(rects) ? rects : [];
  const byTempKey = new Map();
  for (const r of list) {
    if (!r || !r._controllerLayoutTemp) continue;
    const key = makeRegionKey(r._controllerSourceRectId, r._controllerSourceRid);
    byTempKey.set(key, Math.max(1, Math.round(Number(r.id) || 0)));
  }
  const ids = [...byTempKey.values()];
  const adj = new Map(ids.map(id => [id, new Set()]));
  const sourceAdj = buildRegionAdjacency();
  for (const [srcKey, srcTempId] of byTempKey.entries()) {
    for (const nx of (sourceAdj.get(srcKey) || [])) {
      const nxTempId = byTempKey.get(nx);
      if (!nxTempId || nxTempId === srcTempId) continue;
      adj.get(srcTempId).add(nxTempId);
      adj.get(nxTempId).add(srcTempId);
    }
  }
  const groupsById = new Map();
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) continue;
    const q = [id];
    const comp = [];
    seen.add(id);
    while (q.length) {
      const cur = q.shift();
      comp.push(cur);
      for (const nx of (adj.get(cur) || [])) {
        if (seen.has(nx)) continue;
        seen.add(nx);
        q.push(nx);
      }
    }
    const group = comp.slice().sort((a, b) => a - b);
    for (const x of group) groupsById.set(x, group);
  }
  return groupsById;
};
const getRegionLocalBounds = (rect, rid) => {
  const targetRid = Math.max(0, Math.round(Number(rid) || 0));
  const rt = getRectRuntime(rect, { withRegions: true });
  const regions = rt && rt.regions;
  const topo = rt && rt.topo;
  if (!regions || !topo || !Array.isArray(regions.cellToRegion)) return null;
  const cols = Math.max(1, Math.round(Number(topo.cols) || 1));
  const rows = Math.max(1, Math.round(Number(topo.rows) || 1));
  const cellX = drawCellX(rect);
  const cellY = drawCellY(rect);
  let minCol = Infinity;
  let minRow = Infinity;
  let maxCol = -Infinity;
  let maxRow = -Infinity;
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const idx = row * cols + col;
      const regionId = Math.max(0, Math.round(Number(regions.cellToRegion[idx]) || 0));
      if (regionId !== targetRid) continue;
      minCol = Math.min(minCol, col);
      minRow = Math.min(minRow, row);
      maxCol = Math.max(maxCol, col);
      maxRow = Math.max(maxRow, row);
    }
  }
  if (!Number.isFinite(minCol) || !Number.isFinite(minRow) || !Number.isFinite(maxCol) || !Number.isFinite(maxRow)) return null;
  const minX = minCol * cellX;
  const minY = minRow * cellY;
  const maxX = Math.min(rect.width, (maxCol + 1) * cellX);
  const maxY = Math.min(rect.height, (maxRow + 1) * cellY);
  if (!(maxX > minX && maxY > minY)) return null;
  return { minX, minY, maxX, maxY };
};
const getRegionWorldBoundsFromLocalNoRotation = (rect, localBounds) => {
  if (!rect || !localBounds) return null;
  const minX = Number(localBounds.minX);
  const minY = Number(localBounds.minY);
  const maxX = Number(localBounds.maxX);
  const maxY = Number(localBounds.maxY);
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  const baseX = Number(rect && rect.x) || 0;
  const baseY = Number(rect && rect.y) || 0;
  const wMinX = baseX + minX;
  const wMinY = baseY + minY;
  const wMaxX = baseX + maxX;
  const wMaxY = baseY + maxY;
  return {
    minX: wMinX,
    minY: wMinY,
    maxX: wMaxX,
    maxY: wMaxY,
    width: Math.max(1, wMaxX - wMinX),
    height: Math.max(1, wMaxY - wMinY),
    cx: (wMinX + wMaxX) / 2,
    cy: (wMinY + wMaxY) / 2
  };
};
const buildTempRegionGridFromSource = (srcRect, rid, localBounds) => {
  const rt = getRectRuntime(srcRect, { withRegions: true });
  const regions = rt && rt.regions;
  const topo = rt && rt.topo;
  if (!regions || !topo || !Array.isArray(regions.cellToRegion)) return null;
  const targetRid = Math.max(0, Math.round(Number(rid) || 0));
  const srcCols = Math.max(1, Math.round(Number(topo.cols) || 1));
  const srcRows = Math.max(1, Math.round(Number(topo.rows) || 1));
  const srcComp = Array.isArray(topo.comp) ? topo.comp : [];
  const srcCellX = drawCellX(srcRect);
  const srcCellY = drawCellY(srcRect);
  const minCol = Math.max(0, Math.floor((Number(localBounds && localBounds.minX) || 0) / srcCellX));
  const minRow = Math.max(0, Math.floor((Number(localBounds && localBounds.minY) || 0) / srcCellY));
  const maxCol = Math.min(srcCols - 1, Math.max(minCol, Math.ceil((Number(localBounds && localBounds.maxX) || 0) / srcCellX) - 1));
  const maxRow = Math.min(srcRows - 1, Math.max(minRow, Math.ceil((Number(localBounds && localBounds.maxY) || 0) / srcCellY) - 1));
  const cols = Math.max(1, maxCol - minCol + 1);
  const rows = Math.max(1, maxRow - minRow + 1);
  const srcHidden = getHiddenSet(srcRect);
  const hidden = new Set();
  const visibleCells = [];
  const toTempIdx = (c, r) => (r - minRow) * cols + (c - minCol);
  const toTempKey = (c, r) => maskCellKey(c - minCol, r - minRow);
  const isVisibleRegionCell = (c, r) => {
    const idx = r * srcCols + c;
    const regionId = Math.max(0, Math.round(Number(regions.cellToRegion[idx]) || 0));
    if (regionId !== targetRid) return false;
    if (srcHidden && srcHidden.has(maskCellKey(c, r))) return false;
    return true;
  };
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (!isVisibleRegionCell(c, r)) hidden.add(toTempKey(c, r));
      else {
        const srcIdx = r * srcCols + c;
        const srcCid = Math.max(0, Math.round(Number(srcComp[srcIdx]) || 0));
        visibleCells.push({ tr: r - minRow, tc: c - minCol, srcCid });
      }
    }
  }
  const links = new Set();
  const srcLinks = new Set(Array.isArray(srcRect && srcRect.cellLinks) ? srcRect.cellLinks.map(String) : []);
  const addTempLink = (c1, r1, c2, r2) => {
    const a = toTempIdx(c1, r1);
    const b = toTempIdx(c2, r2);
    if (a === b) return;
    links.add(a < b ? `${a}-${b}` : `${b}-${a}`);
  };
  for (let r = minRow; r <= maxRow; r++) {
    for (let c = minCol; c <= maxCol; c++) {
      if (!isVisibleRegionCell(c, r)) continue;
      if (c + 1 <= maxCol && isVisibleRegionCell(c + 1, r)) {
        const a = r * srcCols + c;
        const b = r * srcCols + (c + 1);
        const k = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (srcLinks.has(k)) addTempLink(c, r, c + 1, r);
      }
      if (r + 1 <= maxRow && isVisibleRegionCell(c, r + 1)) {
        const a = r * srcCols + c;
        const b = (r + 1) * srcCols + c;
        const k = a < b ? `${a}-${b}` : `${b}-${a}`;
        if (srcLinks.has(k)) addTempLink(c, r, c, r + 1);
      }
    }
  }
  return {
    cols,
    rows,
    srcCellX,
    srcCellY,
    minCol,
    minRow,
    srcCols,
    srcComp,
    visibleCells,
    hiddenCells: [...hidden],
    cellLinks: [...links]
  };
};
const remapFlowCfgCids = (cfg, cidMap) => {
  const mapCid = value => {
    const k = Math.max(0, Math.round(Number(value) || 0));
    return cidMap.has(k) ? cidMap.get(k) : k;
  };
  const src = (cfg && typeof cfg === "object") ? JSON.parse(JSON.stringify(cfg)) : {};
  if (src.startCid != null) src.startCid = mapCid(src.startCid);
  if (Array.isArray(src.locks)) {
    src.locks = src.locks.map(it => ({ ...it, cid: mapCid(it && it.cid) }));
  }
  if (Array.isArray(src.manualOrder)) {
    src.manualOrder = src.manualOrder.map(v => mapCid(v));
  }
  return src;
};
const componentCellSignatureMap = (comp, cols, visibleCells) => {
  const vis = Array.isArray(visibleCells) ? visibleCells : [];
  const byCid = new Map();
  for (const cell of vis) {
    const tr = Math.max(0, Math.round(Number(cell && cell.tr) || 0));
    const tc = Math.max(0, Math.round(Number(cell && cell.tc) || 0));
    const idx = tr * cols + tc;
    const cid = Math.max(0, Math.round(Number(comp && comp[idx]) || 0));
    const arr = byCid.get(cid) || [];
    arr.push(idx);
    byCid.set(cid, arr);
  }
  const out = new Map();
  for (const [cid, arr] of byCid.entries()) {
    arr.sort((a, b) => a - b);
    out.set(cid, arr.join(","));
  }
  return out;
};
const buildTempFlowGroupsFromSource = (srcRect, rid, grid, cellXTemp, cellYTemp, cidMap) => {
  const rt = getRectRuntime(srcRect, { withGroups: true });
  const groups = Array.isArray(rt && rt.groups) ? rt.groups : [];
  const srcRid = Math.max(0, Math.round(Number(rid) || 0));
  const srcGroup = groups.find(g => Math.max(0, Math.round(Number(g && g.rid) || 0)) === srcRid);
  if (!srcGroup || !Array.isArray(srcGroup.points) || !srcGroup.points.length) return null;
  const sx = cellXTemp / Math.max(1e-6, grid.srcCellX);
  const sy = cellYTemp / Math.max(1e-6, grid.srcCellY);
  const minX = grid.minCol * grid.srcCellX;
  const minY = grid.minRow * grid.srcCellY;
  const points = srcGroup.points.map((p, index) => {
    const u = Number(p && p.u) || 0;
    const v = Number(p && p.v) || 0;
    const cidSrc = Math.max(0, Math.round(Number(p && p.cid) || 0));
    const cid = cidMap && cidMap.has(cidSrc) ? cidMap.get(cidSrc) : cidSrc;
    return {
      index: Math.max(0, Math.round(Number(p && p.index) || index)),
      cid,
      u: (u - minX) * sx,
      v: (v - minY) * sy,
      bw: Math.max(1e-6, (Number(p && p.bw) || grid.srcCellX) * sx),
      bh: Math.max(1e-6, (Number(p && p.bh) || grid.srcCellY) * sy)
    };
  });
  return [{ ...srcGroup, rid: 0, points }];
};
const getScreenDensityPxPerM = rect => {
  const expr = String(rect && rect._areaM2Expression || "").trim();
  const match = expr.match(/(\d+(?:[.,]\d+)?)\s*[xх×]\s*(\d+(?:[.,]\d+)?)/i);
  if (match) {
    const a = Number(String(match[1]).replace(",", "."));
    const b = Number(String(match[2]).replace(",", "."));
    if (Number.isFinite(a) && Number.isFinite(b) && a > 0 && b > 0) {
      return { x: Math.max(1, a), y: Math.max(1, b) };
    }
  }
  const area = Math.max(1, Number(rect && rect.areaM2Px) || 65536);
  const d = Math.max(1, Math.sqrt(area));
  return { x: d, y: d };
};
const getRectIdInLayoutFromLink = endpoint => Math.max(1, Math.round(Number(endpoint && endpoint.rectId) || 0));
const compactControllerLayoutByLinks = (rectIds, opts = {}) => {
  const preserveGlobalPlacement = !!(opts && opts.preserveGlobalPlacement);
  const ids = new Set((Array.isArray(rectIds) ? rectIds : []).map(v => Math.max(1, Math.round(Number(v) || 0))));
  if (!ids.size) return;
  const byId = new Map((Array.isArray(st.rects) ? st.rects : []).map(r => [Math.max(1, Math.round(Number(r && r.id) || 0)), r]));
  const tempRects = [...ids].map(id => byId.get(id)).filter(r => r && r._controllerLayoutTemp);
  const tempSourceToId = new Map();
  for (const r of tempRects) {
    tempSourceToId.set(makeRegionKey(r._controllerSourceRectId, r._controllerSourceRid), Math.max(1, Math.round(Number(r.id) || 0)));
  }
  const links = (tempRects.length === ids.size)
    ? normalizeFlowLinks(st.flowLinks).flatMap(ln => {
      const from = ln && ln.from;
      const to = ln && ln.to;
      const a = tempSourceToId.get(makeRegionKey(from && from.rectId, from && from.rid));
      const b = tempSourceToId.get(makeRegionKey(to && to.rectId, to && to.rid));
      if (!a || !b || a === b) return [];
      return [{ from: { rectId: a }, to: { rectId: b } }];
    })
    : normalizeFlowLinks(st.flowLinks).filter(ln => {
      const a = getRectIdInLayoutFromLink(ln && ln.from);
      const b = getRectIdInLayoutFromLink(ln && ln.to);
      return ids.has(a) && ids.has(b) && a !== b;
    });
  const adj = new Map();
  for (const id of ids) adj.set(id, new Set());
  for (const ln of links) {
    const a = getRectIdInLayoutFromLink(ln && ln.from);
    const b = getRectIdInLayoutFromLink(ln && ln.to);
    if (!adj.has(a) || !adj.has(b)) continue;
    adj.get(a).add(b);
    adj.get(b).add(a);
  }
  const comps = [];
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) continue;
    const q = [id];
    const comp = [];
    seen.add(id);
    while (q.length) {
      const curId = q.shift();
      comp.push(curId);
      for (const nx of (adj.get(curId) || [])) {
        if (seen.has(nx)) continue;
        seen.add(nx);
        q.push(nx);
      }
    }
    comps.push(comp);
  }
  const packRectanglesMinArea = (items, maxExact = 10) => {
    const rects = (Array.isArray(items) ? items : [])
      .map(it => ({ ...it, w: Math.max(1, Math.round(Number(it && it.w) || 1)), h: Math.max(1, Math.round(Number(it && it.h) || 1)) }))
      .filter(it => it && it.id);
    if (!rects.length) return { placements: new Map(), w: 0, h: 0, area: 0 };
    if (rects.length === 1) {
      const one = rects[0];
      return { placements: new Map([[one.id, { x: 0, y: 0, w: one.w, h: one.h }]]), w: one.w, h: one.h, area: one.w * one.h };
    }
    const sorted = rects.slice().sort((a, b) => (b.w * b.h) - (a.w * a.h) || b.h - a.h || b.w - a.w);
    const totalArea = sorted.reduce((sum, it) => sum + it.w * it.h, 0);
    const exact = sorted.length <= maxExact;
    let best = { area: Infinity, w: Infinity, h: Infinity, placements: new Map() };
    const overlaps = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
    const evalCandidate = placed => {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const p of placed) {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x + p.w);
        maxY = Math.max(maxY, p.y + p.h);
      }
      const shiftX = -minX;
      const shiftY = -minY;
      const w = maxX - minX;
      const h = maxY - minY;
      const area = Math.max(1, w * h);
      if (area > best.area || (area === best.area && (w > best.w || (w === best.w && h >= best.h)))) return;
      const placements = new Map();
      for (const p of placed) placements.set(p.id, { x: p.x + shiftX, y: p.y + shiftY, w: p.w, h: p.h });
      best = { area, w, h, placements };
    };
    const dfs = (idx, placed, maxX, maxY) => {
      if (idx >= sorted.length) {
        evalCandidate(placed);
        return;
      }
      const it = sorted[idx];
      const candidates = [];
      if (!placed.length) {
        candidates.push({ x: 0, y: 0 });
      } else {
        candidates.push({ x: 0, y: maxY });
        candidates.push({ x: maxX, y: 0 });
        for (const p of placed) {
          candidates.push({ x: p.x + p.w, y: p.y });
          candidates.push({ x: p.x, y: p.y + p.h });
        }
      }
      const unique = new Map();
      for (const c of candidates) unique.set(`${c.x}:${c.y}`, c);
      const ranked = [...unique.values()].sort((a, b) => (a.y - b.y) || (a.x - b.x));
      for (const c of ranked) {
        const cand = { id: it.id, x: c.x, y: c.y, w: it.w, h: it.h };
        let bad = false;
        for (const p of placed) {
          if (overlaps(cand, p)) { bad = true; break; }
        }
        if (bad) continue;
        const nextMaxX = Math.max(maxX, cand.x + cand.w);
        const nextMaxY = Math.max(maxY, cand.y + cand.h);
        const lowerBoundArea = Math.max(totalArea, nextMaxX * nextMaxY);
        if (lowerBoundArea > best.area) continue;
        placed.push(cand);
        dfs(idx + 1, placed, nextMaxX, nextMaxY);
        placed.pop();
        if (!exact && best.area < Infinity && placed.length > 0 && lowerBoundArea >= best.area) break;
      }
    };
    dfs(0, [], 0, 0);
    if (best.area < Infinity) return best;
    const placements = new Map();
    let x = 0;
    let h = 0;
    for (const it of sorted) {
      placements.set(it.id, { x, y: 0, w: it.w, h: it.h });
      x += it.w;
      h = Math.max(h, it.h);
    }
    return { placements, w: x, h, area: Math.max(1, x * h) };
  };
  const compBoxes = comps.map(comp => {
    const items = [];
    let origMinX = Infinity;
    let origMinY = Infinity;
    let origMaxX = -Infinity;
    let origMaxY = -Infinity;
    for (const id of comp) {
      const r = byId.get(id);
      if (!r) continue;
      const bb = rectAABBMasked(r);
      origMinX = Math.min(origMinX, bb.minX);
      origMinY = Math.min(origMinY, bb.minY);
      origMaxX = Math.max(origMaxX, bb.maxX);
      origMaxY = Math.max(origMaxY, bb.maxY);
      items.push({ id, w: Math.max(1, Math.round(bb.maxX - bb.minX)), h: Math.max(1, Math.round(bb.maxY - bb.minY)) });
    }
    if (!items.length) return null;
    if (comp.length > 1) {
      const packed = packRectanglesMinArea(items, 10);
      const srcCx = (Number.isFinite(origMinX) && Number.isFinite(origMaxX)) ? ((origMinX + origMaxX) / 2) : 0;
      const srcCy = (Number.isFinite(origMinY) && Number.isFinite(origMaxY)) ? ((origMinY + origMaxY) / 2) : 0;
      const anchorX = srcCx - packed.w / 2;
      const anchorY = srcCy - packed.h / 2;
      for (const item of items) {
        const r = byId.get(item.id);
        const p = packed.placements.get(item.id);
        if (!r || !p) continue;
        r.x = Math.round(anchorX + p.x);
        r.y = Math.round(anchorY + p.y);
      }
      return { comp, minX: anchorX, minY: anchorY, maxX: anchorX + packed.w, maxY: anchorY + packed.h, w: packed.w, h: packed.h, area: Math.max(1, packed.area) };
    }
    const only = items[0];
    const r0 = byId.get(only.id);
    if (!r0) return null;
    const bb0 = rectAABBMasked(r0);
    return {
      comp,
      minX: bb0.minX,
      minY: bb0.minY,
      maxX: bb0.maxX,
      maxY: bb0.maxY,
      w: Math.max(1, bb0.maxX - bb0.minX),
      h: Math.max(1, bb0.maxY - bb0.minY),
      area: Math.max(1, (bb0.maxX - bb0.minX) * (bb0.maxY - bb0.minY))
    };
  }).filter(Boolean).sort((a, b) => b.area - a.area);
  if (!compBoxes.length) return;
  if (preserveGlobalPlacement) return;
  const totalArea = compBoxes.reduce((sum, box) => sum + box.area, 0);
  const rowLimit = Math.max(1, Math.sqrt(totalArea) * 1.2);
  const gap = Math.max(24, Math.round(Number(st.globalScale) || 256) * 0.08);
  let cursorX = 0;
  let cursorY = 0;
  let rowH = 0;
  for (const box of compBoxes) {
    if (cursorX > 0 && cursorX + box.w > rowLimit) {
      cursorX = 0;
      cursorY += rowH + gap;
      rowH = 0;
    }
    const dx = cursorX - box.minX;
    const dy = cursorY - box.minY;
    for (const id of box.comp) {
      const r = byId.get(id);
      if (!r) continue;
      r.x = Math.round((Number(r.x) || 0) + dx);
      r.y = Math.round((Number(r.y) || 0) + dy);
    }
    cursorX += box.w + gap;
    rowH = Math.max(rowH, box.h);
  }
};
const applyInitialLayoutByScaleGroups = tempRects => {
  const list = Array.isArray(tempRects) ? tempRects.filter(r => r && r._controllerLayoutTemp && !r._controllerHasSavedPosition) : [];
  if (!list.length) return;
  const groups = new Map();
  for (const r of list) {
    const key = String(r._controllerScaleGroupKey || `${Math.max(1, Number(r.scale) || 1)}`);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }
  const median = arr => {
    const xs = (Array.isArray(arr) ? arr : []).map(v => Number(v)).filter(v => Number.isFinite(v) && v > 0).sort((a, b) => a - b);
    if (!xs.length) return 1;
    const mid = Math.floor(xs.length / 2);
    return xs.length % 2 ? xs[mid] : (xs[mid - 1] + xs[mid]) / 2;
  };
  for (const rects of groups.values()) {
    if (!Array.isArray(rects) || !rects.length) continue;
    const rx = [];
    const ry = [];
    for (const r of rects) {
      const sx = Number(r._controllerSrcX);
      const sy = Number(r._controllerSrcY);
      const sw = Number(r._controllerSrcW);
      const sh = Number(r._controllerSrcH);
      if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
      if (Number.isFinite(sw) && sw > 0) rx.push((Number(r.width) || 1) / sw);
      if (Number.isFinite(sh) && sh > 0) ry.push((Number(r.height) || 1) / sh);
    }
    const kx = Math.max(1e-6, median(rx));
    const ky = Math.max(1e-6, median(ry));
    for (const r of rects) {
      const sx = Number(r._controllerSrcX);
      const sy = Number(r._controllerSrcY);
      if (!Number.isFinite(sx) || !Number.isFinite(sy)) continue;
      r.x = Math.round(sx * kx);
      r.y = Math.round(sy * ky);
    }
  }

  // Build region groups by zero-gap adjacency after initial scaling.
  const byId = new Map(list.map(r => [Math.max(1, Math.round(Number(r && r.id) || 0)), r]));
  const ids = [...byId.keys()];
  if (ids.length <= 1) return;
  const bboxOf = r => {
    const bb = rectAABBMasked(r);
    return {
      minX: Number(bb && bb.minX) || 0,
      minY: Number(bb && bb.minY) || 0,
      maxX: Number(bb && bb.maxX) || 0,
      maxY: Number(bb && bb.maxY) || 0
    };
  };
  const zeroGap = (a, b) => {
    const dx = Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX));
    const dy = Math.max(0, Math.max(a.minY - b.maxY, b.minY - a.maxY));
    return dx <= 0 && dy <= 0;
  };
  const bbs = new Map();
  for (const id of ids) bbs.set(id, bboxOf(byId.get(id)));
  const adj = new Map(ids.map(id => [id, new Set()]));
  for (let i = 0; i < ids.length; i++) {
    const a = ids[i];
    const bbA = bbs.get(a);
    for (let j = i + 1; j < ids.length; j++) {
      const b = ids[j];
      const bbB = bbs.get(b);
      if (!zeroGap(bbA, bbB)) continue;
      adj.get(a).add(b);
      adj.get(b).add(a);
    }
  }
  const comps = [];
  const seen = new Set();
  for (const id of ids) {
    if (seen.has(id)) continue;
    const q = [id];
    const comp = [];
    seen.add(id);
    while (q.length) {
      const cur = q.shift();
      comp.push(cur);
      for (const nx of (adj.get(cur) || [])) {
        if (seen.has(nx)) continue;
        seen.add(nx);
        q.push(nx);
      }
    }
    comps.push(comp);
  }
  if (comps.length <= 1) return;

  const groupBoxes = comps.map(comp => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const id of comp) {
      const bb = bbs.get(id);
      minX = Math.min(minX, bb.minX);
      minY = Math.min(minY, bb.minY);
      maxX = Math.max(maxX, bb.maxX);
      maxY = Math.max(maxY, bb.maxY);
    }
    return {
      ids: comp.slice(),
      minX,
      minY,
      maxX,
      maxY,
      w: Math.max(1, Math.round(maxX - minX)),
      h: Math.max(1, Math.round(maxY - minY))
    };
  }).sort((a, b) => (b.w * b.h) - (a.w * a.h));

  // Pack groups to minimize total area with preference for square footprint.
  const totalArea = groupBoxes.reduce((s, g) => s + (g.w * g.h), 0);
  const base = Math.max(1, Math.sqrt(totalArea));
  const candidates = [];
  for (const k of [0.85, 1.0, 1.15, 1.35, 1.6, 2.0]) candidates.push(Math.max(1, Math.round(base * k)));
  let best = null;
  const gap = 0;
  for (const rowLimit of candidates) {
    let x = 0;
    let y = 0;
    let rowH = 0;
    const placed = [];
    let maxX = 0;
    let maxY = 0;
    for (const g of groupBoxes) {
      if (x > 0 && x + g.w > rowLimit) {
        x = 0;
        y += rowH + gap;
        rowH = 0;
      }
      placed.push({ g, x, y });
      maxX = Math.max(maxX, x + g.w);
      maxY = Math.max(maxY, y + g.h);
      x += g.w + gap;
      rowH = Math.max(rowH, g.h);
    }
    const area = Math.max(1, maxX * maxY);
    const ratio = Math.max(maxX, maxY) / Math.max(1, Math.min(maxX, maxY));
    const score = area * (1 + (ratio - 1) * 0.35);
    if (!best || score < best.score) best = { score, placed, maxX, maxY };
  }
  if (!best) return;

  for (const slot of best.placed) {
    const g = slot.g;
    const dx = Math.round(slot.x - g.minX);
    const dy = Math.round(slot.y - g.minY);
    for (const id of g.ids) {
      const r = byId.get(id);
      if (!r) continue;
      r.x = Math.round((Number(r.x) || 0) + dx);
      r.y = Math.round((Number(r.y) || 0) + dy);
    }
  }
};
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
const setModeBase = setMode;
setMode = mode => {
  if (isControllerLayoutModeActive() && String(mode || "") !== "select") return setModeBase("select");
  return setModeBase(mode);
};
const activateToolOrSelectBase = activateToolOrSelect;
activateToolOrSelect = mode => {
  if (isControllerLayoutModeActive() && String(mode || "") !== "select") return setMode("select");
  return activateToolOrSelectBase(mode);
};
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
  refreshPropsListRender,
  canSelectRect: r => isControllerLayoutRect(r)
}));
const setSelectionBase = setSelection;
const expandSelectionWithControllerGroups = (ids, activeId = null) => {
  const inIds = Array.isArray(ids) ? ids : (ids == null ? [] : [ids]);
  if (!isControllerLayoutModeActive()) {
    const raw = inIds.map(v => Math.max(1, Math.round(Number(v) || 0))).filter(v => v > 0);
    return { ids: [...new Set(raw)], activeId: activeId == null ? null : Math.max(1, Math.round(Number(activeId) || 0)) };
  }
  const groupsById = st && st.controllerLayout && st.controllerLayout.groupsById;
  if (!(groupsById instanceof Map)) {
    const raw = inIds.map(v => Math.max(1, Math.round(Number(v) || 0))).filter(v => v > 0);
    return { ids: [...new Set(raw)], activeId: activeId == null ? null : Math.max(1, Math.round(Number(activeId) || 0)) };
  }
  const expanded = new Set();
  for (const rawId of inIds) {
    const id = Math.max(1, Math.round(Number(rawId) || 0));
    const group = groupsById.get(id);
    if (Array.isArray(group) && group.length) {
      for (const gid of group) expanded.add(Math.max(1, Math.round(Number(gid) || 0)));
    } else if (id > 0) {
      expanded.add(id);
    }
  }
  let nextActive = activeId == null ? null : Math.max(1, Math.round(Number(activeId) || 0));
  if (nextActive != null && groupsById.has(nextActive)) {
    const g = groupsById.get(nextActive);
    if (Array.isArray(g) && g.length) nextActive = Math.max(1, Math.round(Number(g[0]) || nextActive));
  }
  return { ids: [...expanded], activeId: nextActive };
};
setSelection = (ids, activeId = null) => {
  const expanded = expandSelectionWithControllerGroups(ids, activeId);
  return setSelectionBase(expanded.ids, expanded.activeId);
};
const selectOnlyBase = selectOnly;
selectOnly = id => {
  if (!isControllerLayoutModeActive()) return selectOnlyBase(id);
  return setSelection(id == null ? [] : [id], id);
};
const toggleSelectBase = toggleSelect;
toggleSelect = id => {
  if (!isControllerLayoutModeActive()) return toggleSelectBase(id);
  const target = Math.max(1, Math.round(Number(id) || 0));
  const groupsById = st && st.controllerLayout && st.controllerLayout.groupsById;
  const group = (groupsById instanceof Map && Array.isArray(groupsById.get(target))) ? groupsById.get(target) : [target];
  const hasAll = group.every(gid => st.selSet instanceof Set && st.selSet.has(gid));
  const next = new Set(st.selSet instanceof Set ? st.selSet : []);
  if (hasAll) {
    for (const gid of group) next.delete(gid);
  } else {
    for (const gid of group) next.add(gid);
  }
  const nextActive = hasAll ? ([...next][0] || null) : target;
  return setSelection([...next], nextActive);
};
const finishSelectionBoxBase = finishSelectionBox;
finishSelectionBox = () => {
  const changed = finishSelectionBoxBase();
  if (!changed || !isControllerLayoutModeActive()) return changed;
  if (!(st && st.selSet instanceof Set) || !st.selSet.size) return changed;
  const expanded = expandSelectionWithControllerGroups([...st.selSet], st.sel);
  const prevKey = [...st.selSet].sort((a, b) => a - b).join(",");
  const nextKey = expanded.ids.slice().sort((a, b) => a - b).join(",");
  if (prevKey !== nextKey) setSelectionBase(expanded.ids, expanded.activeId);
  return changed;
};
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
  rectListFilter: r => isControllerLayoutRect(r),
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
  isMultiSelectionBlocked: () => {
    if (!isControllerLayoutModeActive()) return false;
    const groupsById = st && st.controllerLayout && st.controllerLayout.groupsById;
    if (!(groupsById instanceof Map) || !(st.selSet instanceof Set) || !st.selSet.size) return false;
    const selIds = [...st.selSet].map(v => Math.max(1, Math.round(Number(v) || 0)));
    if (!selIds.length) return false;
    const group = groupsById.get(selIds[0]);
    if (!Array.isArray(group) || group.length <= 1) return false;
    const groupSet = new Set(group.map(v => Math.max(1, Math.round(Number(v) || 0))));
    if (groupSet.size !== selIds.length) return false;
    for (const id of selIds) {
      if (!groupSet.has(id)) return false;
    }
    return true;
  },
  getCompositeSelectionGroup: rect => {
    if (!isControllerLayoutModeActive() || !rect || !rect._controllerLayoutTemp) return "";
    const groupsById = st && st.controllerLayout && st.controllerLayout.groupsById;
    if (!(groupsById instanceof Map)) return "";
    const id = Math.max(1, Math.round(Number(rect.id) || 0));
    const group = groupsById.get(id);
    if (!Array.isArray(group) || group.length <= 1) return "";
    const key = group.slice().map(v => Math.max(1, Math.round(Number(v) || 0))).sort((a, b) => a - b).join(",");
    return key ? `layout-group:${key}` : "";
  },
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
  upsertManualCluster,
  canHitRect: r => isControllerLayoutRect(r)
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
const { drawInstallSummaryOverlay, hideInstallSummaryOverlay } = setupInstallSummaryOverlay({
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
  t: value => translateText(value),
  isOverlaySuppressed: () => isControllerLayoutModeActive()
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
  drawInterScreenFlowLinks: c => { if (!isControllerLayoutModeActive()) drawInterScreenFlowLinks(c); },
  drawFlowLinkCurveHandlesOverlay,
  drawMaskOverlay,
  drawCellEditOverlay,
  drawCabinetEditOverlay,
  drawContentBounds: (c, z) => { if (!isControllerLayoutModeActive()) drawContentBounds(c, z); },
  drawLayerButtons: (c, z) => { if (!isControllerLayoutModeActive()) drawLayerButtons(c, z); },
  drawMultiSelectionActions: (c, z) => multiSelectionActions.drawActions(c, z),
  drawInstallSummaryOverlay: c => {
    if (isControllerLayoutModeActive()) {
      if (typeof hideInstallSummaryOverlay === "function") hideInstallSummaryOverlay();
      return;
    }
    drawInstallSummaryOverlay(c);
  },
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
  zc,
  visibleRectFilter: r => isControllerLayoutRect(r),
  onAfterMainSceneDraw: (c, z) => drawControllerLayoutOverlay(c, z),
  onAfterOverlayDraw: (c, z) => drawControllerLayoutHeaderOverlay(c, z)
}));
const renderRuntimeBase = render;
const renderOverlayRuntimeBase = renderOverlay;
const renderNowRuntimeBase = renderNow;
render = (immediate = false) => {
  updateSelectionActionButtonsAvailability();
  renderRuntimeBase(immediate);
  if (isControllerLayoutModeActive()) {
    if (typeof hideInstallSummaryOverlay === "function") hideInstallSummaryOverlay();
  } else {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => drawInstallSummaryOverlay());
    else drawInstallSummaryOverlay();
  }
};
renderOverlay = (immediate = false) => {
  renderOverlayRuntimeBase(immediate);
};
renderNow = () => {
  renderNowRuntimeBase();
  if (isControllerLayoutModeActive()) {
    if (typeof hideInstallSummaryOverlay === "function") hideInstallSummaryOverlay();
  } else drawInstallSummaryOverlay();
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
  getEditableSelectedRects: () => getEditableSelectedRects(),
  canSnapRect: r => isControllerLayoutRect(r)
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
const fitRectsOnCanvas = rects => {
  const fitRects = (Array.isArray(rects) ? rects : []).filter(r => !isNoteExcludedFromContentBounds(r));
  if (!fitRects.length) { st.camX = 0; st.camY = 0; st.zoom = 1; render(); return } let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9; for (const r of fitRects) { const bb = rectAABBMasked(r); minX = Math.min(minX, bb.minX); minY = Math.min(minY, bb.minY); maxX = Math.max(maxX, bb.maxX); maxY = Math.max(maxY, bb.maxY) }
  const vm = getViewMetrics(), w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY), pad = 80; st.zoom = zc(Math.min((vm.viewWidth - pad) / w, (vm.viewHeight - pad) / h)); st.camX = (minX + maxX) / 2; st.camY = (minY + maxY) / 2; render()
};
function fit() {
  const fitRects = isControllerLayoutModeActive()
    ? (Array.isArray(st.rects) ? st.rects : []).filter(r => isControllerLayoutRect(r))
    : (Array.isArray(st.rects) ? st.rects : []);
  fitRectsOnCanvas(fitRects);
}
const updateControllerLayoutUiLock = () => {
  const active = isControllerLayoutModeActive();
  const readOnly = !!(active && st && st.controllerLayout && st.controllerLayout.readOnly);
  const toolButtons = [
    el.toolDraw, el.toolMaskAdd, el.toolCellEdit, el.toolFlowEdit, el.toolClusterEdit, el.toolRigEdit,
    el.mToolDraw, el.mToolMaskAdd, el.mToolCellEdit, el.mToolFlowEdit, el.mToolClusterEdit, el.mToolRigEdit
  ];
  for (const btn of toolButtons) {
    if (!btn) continue;
    btn.disabled = !!active;
    btn.classList.toggle("layout-mode-tool-locked", !!active);
    btn.setAttribute("aria-disabled", active ? "true" : "false");
  }
  if (el.side) el.side.classList.toggle("controller-layout-locked", !!active);
  if (el.side) el.side.classList.toggle("controller-layout-hidden", !!active);
  if (el.controllerLayoutBack) el.controllerLayoutBack.classList.toggle("d-none", !active);
  if (el.btnControllerLayoutReset) el.btnControllerLayoutReset.classList.toggle("d-none", !active || !!readOnly);
};
const persistControllerLayoutPositions = () => {
  if (!isControllerLayoutModeActive()) return false;
  const controllerId = Math.max(1, Math.round(Number(st && st.controllerLayout && st.controllerLayout.controllerId) || 0));
  if (!controllerId) return false;
  const controllerRect = getRectById(controllerId);
  if (!controllerRect) return false;
  const map = {};
  const ids = getControllerLayoutRectIdSet();
  for (const r of (Array.isArray(st.rects) ? st.rects : [])) {
    if (!r || !r._controllerLayoutTemp) continue;
    if (!ids.has(Math.max(1, Math.round(Number(r.id) || 0)))) continue;
    const srcRectId = Math.max(1, Math.round(Number(r._controllerSourceRectId) || 0));
    const srcRid = Math.max(0, Math.round(Number(r._controllerSourceRid) || 0));
    map[`${srcRectId}:${srcRid}`] = {
      x: Math.round(Number(r.x) || 0),
      y: Math.round(Number(r.y) || 0)
    };
  }
  controllerRect.controllerLayoutRegionPositions = map;
  return true;
};
function clearControllerLayoutRuntimeState() {
  const nextTempId = Math.max(1, Math.round(Number(st && st.controllerLayout && st.controllerLayout.nextTempId) || 900000000));
  const list = Array.isArray(st && st.rects) ? st.rects : [];
  if (list.some(r => r && r._controllerLayoutTemp)) {
    st.rects = list.filter(r => !r || !r._controllerLayoutTemp);
  }
  st.controllerLayout = { active: false, controllerId: null, rectIds: [], groupsById: null, readOnly: false, nextTempId };
}
const removeControllerLayoutTempRects = () => {
  const list = Array.isArray(st.rects) ? st.rects : [];
  st.rects = list.filter(r => !r || !r._controllerLayoutTemp);
};
const exitControllerLayoutMode = (opts = {}) => {
  if (!isControllerLayoutModeActive()) return;
  const wasReadOnly = !!(st && st.controllerLayout && st.controllerLayout.readOnly);
  const skipLayoutPersist = !!(opts && opts.skipLayoutPersist);
  const controllerId = Math.max(1, Math.round(Number(st && st.controllerLayout && st.controllerLayout.controllerId) || 0));
  const nextTempId = Math.max(1, Math.round(Number(st && st.controllerLayout && st.controllerLayout.nextTempId) || 900000000));
  const changed = (skipLayoutPersist || wasReadOnly) ? false : persistControllerLayoutPositions();
  removeControllerLayoutTempRects();
  st.controllerLayout = { active: false, controllerId: null, rectIds: [], groupsById: null, readOnly: false, nextTempId };
  if (wasReadOnly) setSelection([], null);
  else if (controllerId > 0 && getRectById(controllerId)) setSelection([controllerId], controllerId);
  else setSelection([], null);
  if (
    controllerLayoutPrevView
    && Number.isFinite(Number(controllerLayoutPrevView.camX))
    && Number.isFinite(Number(controllerLayoutPrevView.camY))
    && Number.isFinite(Number(controllerLayoutPrevView.zoom))
  ) {
    st.camX = Number(controllerLayoutPrevView.camX);
    st.camY = Number(controllerLayoutPrevView.camY);
    st.zoom = Number(controllerLayoutPrevView.zoom);
  }
  controllerLayoutPrevView = null;
  updateControllerLayoutUiLock();
  setMode(controllerLayoutPrevMode || "select");
  syncProps();
  listRects();
  if (changed) schedulePersist("project");
  render();
};
const enterControllerLayoutMode = (controllerRect, opts = {}) => {
  if (!controllerRect || !isControllerDevice(controllerRect)) return;
  const readOnly = !!(opts && opts.readOnly);
  const controllerId = Math.max(1, Math.round(Number(controllerRect.id) || 0));
  const links = expandControllerLayoutRegionLinks(getControllerLayoutRegionLinks(controllerId));
  if (!links.length) return;
  const byId = new Map((Array.isArray(st.rects) ? st.rects : []).map(r => [Math.max(1, Math.round(Number(r && r.id) || 0)), r]));
  const savedLayout = (controllerRect && controllerRect.controllerLayoutRegionPositions && typeof controllerRect.controllerLayoutRegionPositions === "object")
    ? controllerRect.controllerLayoutRegionPositions
    : {};
  removeControllerLayoutTempRects();
  const tempRects = [];
  let savedAppliedCount = 0;
  for (const item of links) {
    const srcRect = byId.get(item.rectId);
    if (!srcRect || isDeviceRect(srcRect)) continue;
    const local = getRegionLocalBounds(srcRect, item.rid);
    if (!local) continue;
    const grid = buildTempRegionGridFromSource(srcRect, item.rid, local);
    if (!grid) continue;
    const wb = getRegionWorldBoundsFromLocalNoRotation(srcRect, local);
    const x = Number(wb && wb.minX) || 0;
    const y = Number(wb && wb.minY) || 0;
    const srcRegionPxW = Math.max(1, Number(wb && wb.width) || (grid.cols * grid.srcCellX));
    const srcRegionPxH = Math.max(1, Number(wb && wb.height) || (grid.rows * grid.srcCellY));
    const rectScalePxPerM = Math.max(1, Number(srcRect && srcRect.scale) || 256);
    const layoutDensity = getScreenDensityPxPerM(srcRect);
    const srcCellMetersX = Math.max(1e-6, grid.srcCellX / rectScalePxPerM);
    const srcCellMetersY = Math.max(1e-6, grid.srcCellY / rectScalePxPerM);
    const densityX = Math.max(1, Number(layoutDensity && layoutDensity.x) || 1);
    const densityY = Math.max(1, Number(layoutDensity && layoutDensity.y) || 1);
    const cellXTemp = Math.max(1, Math.round(srcCellMetersX * densityX));
    const cellYTemp = Math.max(1, Math.round(srcCellMetersY * densityY));
    const w = Math.max(1, grid.cols * cellXTemp);
    const h = Math.max(1, grid.rows * cellYTemp);
    const scaleForTemp = Math.max(1, Math.round(Math.sqrt(densityX * densityY)));
    const srcFlowCfg = getFlowLocksRegion(srcRect, item.rid);
    const tempId = Math.max(1, Math.round(Number(st.controllerLayout.nextTempId) || 900000000));
    st.controllerLayout.nextTempId = tempId + 1;
    const saved = savedLayout[`${item.rectId}:${item.rid}`];
    const layoutX = Number(saved && saved.x);
    const layoutY = Number(saved && saved.y);
    const hasSavedXY = Number.isFinite(layoutX) && Number.isFinite(layoutY);
    if (hasSavedXY) savedAppliedCount++;
    const centerX = Number(wb && wb.cx) || (x + srcRegionPxW / 2);
    const centerY = Number(wb && wb.cy) || (y + srcRegionPxH / 2);
    const screenMeta = typeof parseScreenNameGroup === "function"
      ? parseScreenNameGroup(srcRect)
      : { name: String(srcRect && srcRect.name || ""), group: "" };
    const screenName = String(screenMeta && screenMeta.name || srcRect && srcRect.name || "").trim();
    const screenGroup = String(screenMeta && screenMeta.group || "").trim();
    const regionLabel = screenGroup ? `${screenName}@${screenGroup} · R${item.rid}` : `${screenName} · R${item.rid}`;
    const tempRect = {
      id: tempId,
      kind: "layoutRegion",
      name: `${String(srcRect.name || "Экран")} · R${item.rid}`,
      x: Number.isFinite(layoutX) ? Math.round(layoutX) : Math.round(centerX - w / 2),
      y: Number.isFinite(layoutY) ? Math.round(layoutY) : Math.round(centerY - h / 2),
      width: w,
      height: h,
      rotation: 0,
      colorA: String(srcRect.colorA || "#2fcaaf"),
      colorB: String(srcRect.colorB || "#1f3f7e"),
      scale: scaleForTemp,
      cellX: cellXTemp,
      cellY: cellYTemp,
      areaM2Px: Number(srcRect.areaM2Px) || 65536,
      dataFlow: String(srcRect && srcRect.dataFlow || "none"),
      dataFlowZ: !!(srcRect && srcRect.dataFlowZ),
      numberCells: !!(srcRect && srcRect.numberCells),
      splitVariant: Math.max(0, Math.round(Number(srcRect && srcRect.splitVariant) || 0)),
      hiddenCells: Array.isArray(grid.hiddenCells) ? grid.hiddenCells : [],
      cellLinks: Array.isArray(grid.cellLinks) ? grid.cellLinks : [],
      flowLocks: {},
      flowLockRidToSig: {},
      flowLockCidToSeed: {},
      _controllerLayoutTemp: true,
      _controllerHasSavedPosition: hasSavedXY,
      _controllerSrcX: x,
      _controllerSrcY: y,
      _controllerSrcCX: centerX,
      _controllerSrcCY: centerY,
      _controllerSrcW: srcRegionPxW,
      _controllerSrcH: srcRegionPxH,
      _controllerScaleGroupKey: `${Math.round(densityX)}x${Math.round(densityY)}`,
      _controllerSourceRectId: item.rectId,
      _controllerSourceRid: item.rid,
      _controllerOutCid: item.cid,
      _controllerPortLabel: devicePortLabel(controllerRect, item.cid),
      _controllerRegionLabel: regionLabel
    };
    const tempTopo = getCellTopology(tempRect, cellXTemp, cellYTemp);
    const tempComp = Array.isArray(tempTopo && tempTopo.comp) ? tempTopo.comp : [];
    const tempCols = Math.max(1, Math.round(Number(tempTopo && tempTopo.cols) || grid.cols));
    const vis = Array.isArray(grid.visibleCells) ? grid.visibleCells : [];
    const srcSig = componentCellSignatureMap(grid.srcComp, grid.cols, vis);
    const tempSig = componentCellSignatureMap(tempComp, tempCols, vis);
    const tempCidBySig = new Map();
    for (const [tempCid, sig] of tempSig.entries()) tempCidBySig.set(sig, tempCid);
    const finalCidMap = new Map();
    const mappedSrc = new Set();
    const mappedTemp = new Set();
    for (const [srcCid, sig] of srcSig.entries()) {
      if (!tempCidBySig.has(sig)) continue;
      const tempCid = tempCidBySig.get(sig);
      finalCidMap.set(srcCid, tempCid);
      mappedSrc.add(srcCid);
      mappedTemp.add(tempCid);
    }
    const srcStats = new Map();
    const tempStats = new Map();
    for (const cell of vis) {
      const tr = Math.max(0, Math.round(Number(cell && cell.tr) || 0));
      const tc = Math.max(0, Math.round(Number(cell && cell.tc) || 0));
      const srcCid = Math.max(0, Math.round(Number(cell && cell.srcCid) || 0));
      const tempIdx = tr * tempCols + tc;
      const tempCid = Math.max(0, Math.round(Number(tempComp[tempIdx]) || 0));
      const s = srcStats.get(srcCid) || { n: 0, sumR: 0, sumC: 0 };
      s.n++;
      s.sumR += tr;
      s.sumC += tc;
      srcStats.set(srcCid, s);
      const t = tempStats.get(tempCid) || { n: 0, sumR: 0, sumC: 0 };
      t.n++;
      t.sumR += tr;
      t.sumC += tc;
      tempStats.set(tempCid, t);
    }
    const pairs = [];
    for (const [srcCid, s] of srcStats.entries()) {
      const sr = s.sumR / Math.max(1, s.n);
      const sc = s.sumC / Math.max(1, s.n);
      for (const [tempCid, t] of tempStats.entries()) {
        const tr = t.sumR / Math.max(1, t.n);
        const tc = t.sumC / Math.max(1, t.n);
        const d2 = ((sr - tr) ** 2) + ((sc - tc) ** 2);
        pairs.push({ srcCid, tempCid, d2 });
      }
    }
    pairs.sort((a, b) => a.d2 - b.d2 || a.srcCid - b.srcCid || a.tempCid - b.tempCid);
    for (const p of pairs) {
      if (mappedSrc.has(p.srcCid) || mappedTemp.has(p.tempCid)) continue;
      mappedSrc.add(p.srcCid);
      mappedTemp.add(p.tempCid);
      finalCidMap.set(p.srcCid, p.tempCid);
    }
    const tempFlowLocks = { 0: remapFlowCfgCids(srcFlowCfg, finalCidMap) };
    tempRect.flowLocks = tempFlowLocks;
    const flowGroupsOverride = buildTempFlowGroupsFromSource(srcRect, item.rid, grid, cellXTemp, cellYTemp, finalCidMap);
    if (flowGroupsOverride) tempRect._controllerFlowGroupsOverride = flowGroupsOverride;
    tempRects.push(tempRect);
  }
  if (!tempRects.length) return;
  if (!(savedAppliedCount > 0 && savedAppliedCount === tempRects.length)) {
    applyInitialLayoutByScaleGroups(tempRects);
  }
  st.rects = [...tempRects, ...st.rects.filter(r => !r || !r._controllerLayoutTemp)];
  if (!(savedAppliedCount > 0 && savedAppliedCount === tempRects.length)) {
    compactControllerLayoutByLinks(tempRects.map(r => r.id), { preserveGlobalPlacement: true });
  }
  const layoutGroupsById = buildLayoutTempRectLinkComponents(tempRects);
  const rectIds = tempRects.map(r => r.id);
  controllerLayoutPrevMode = String(st.mode || "select");
  controllerLayoutPrevView = {
    camX: Number(st.camX) || 0,
    camY: Number(st.camY) || 0,
    zoom: Number(st.zoom) || 1
  };
  st.controllerLayout = { active: true, controllerId, rectIds, nextTempId: st.controllerLayout.nextTempId, groupsById: layoutGroupsById, readOnly };
  // Keep initial region placement close to the main canvas layout.
  setMode("select");
  if (readOnly) setSelection([], null);
  else setSelection(rectIds, rectIds[0]);
  updateControllerLayoutUiLock();
  fit();
  syncProps();
  listRects();
  schedulePersist("project");
  render();
};
function drawControllerLayoutOverlay(c, z) {
  if (!isControllerLayoutModeActive()) return;
  const rects = (Array.isArray(st.rects) ? st.rects : []).filter(r => isControllerLayoutRect(r));
  if (!rects.length) return;
  const getRegionMinCabinetSize = r => {
    if (!r) return null;
    const cx = Math.max(1, Math.round(Number(drawCellX(r)) || 1));
    const cy = Math.max(1, Math.round(Number(drawCellY(r)) || 1));
    const topo = getCellTopologyCached(r, cx, cy);
    if (!topo || !Array.isArray(topo.comp) || !topo.comp.length) return null;
    const cols = Math.max(1, Math.round(Number(topo.cols) || 1));
    const rows = Math.max(1, Math.round(Number(topo.rows) || 1));
    const hs = getHiddenSet(r);
    const colPref = [0];
    const rowPref = [0];
    for (let x = 0; x < cols; x++) colPref.push(colPref[x] + Math.min(cx, Math.max(0, (Number(r.width) || 0) - x * cx)));
    for (let y = 0; y < rows; y++) rowPref.push(rowPref[y] + Math.min(cy, Math.max(0, (Number(r.height) || 0) - y * cy)));
    const byCid = new Map();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (hs && hs.has(maskCellKey(x, y))) continue;
        const idx = y * cols + x;
        const cid = Math.max(0, Math.round(Number(topo.comp[idx]) || 0));
        const rec = byCid.get(cid) || { c0: x, c1: x + 1, r0: y, r1: y + 1, n: 0 };
        rec.c0 = Math.min(rec.c0, x);
        rec.c1 = Math.max(rec.c1, x + 1);
        rec.r0 = Math.min(rec.r0, y);
        rec.r1 = Math.max(rec.r1, y + 1);
        rec.n++;
        byCid.set(cid, rec);
      }
    }
    let minW = Infinity;
    let minH = Infinity;
    for (const rec of byCid.values()) {
      if (!(rec && rec.n > 0)) continue;
      const w = Math.max(1, (colPref[rec.c1] || 0) - (colPref[rec.c0] || 0));
      const h = Math.max(1, (rowPref[rec.r1] || 0) - (rowPref[rec.r0] || 0));
      minW = Math.min(minW, w);
      minH = Math.min(minH, h);
    }
    if (!Number.isFinite(minW) || !Number.isFinite(minH)) return null;
    return { minW: Math.max(1, minW), minH: Math.max(1, minH) };
  };
  const bb = getRectsBBox(rects);
  if (!bb) return;
  const rectBbById = new Map();
  const minCabById = new Map();
  const zSafe = Math.max(1e-6, Number(z) || 1);
  const ui = 1 / zSafe;
  const bbW = Math.max(1, Math.round(Number(bb.maxX - bb.minX) || 0));
  const bbH = Math.max(1, Math.round(Number(bb.maxY - bb.minY) || 0));
  const bbResText = `${bbW}×${bbH} px`;
  c.save();
  c.strokeStyle = "rgba(84, 194, 255, .95)";
  c.lineWidth = Math.max(1.25 * ui, 0.75 / Math.max(0.25, z || 1));
  c.setLineDash([6 * ui, 4 * ui]);
  c.strokeRect(bb.minX, bb.minY, Math.max(1, bb.maxX - bb.minX), Math.max(1, bb.maxY - bb.minY));
  c.setLineDash([]);
  c.font = "12px sans-serif";
  c.textAlign = "left";
  c.textBaseline = "bottom";
  const bbTextW = c.measureText(bbResText).width;
  const bbTextX = bb.minX + 6;
  const bbTextY = bb.minY - 6;
  c.fillStyle = "rgba(7, 10, 14, .75)";
  c.fillRect(bbTextX - 3, bbTextY - 16, bbTextW + 6, 16);
  c.fillStyle = "rgba(255,255,255,.95)";
  c.fillText(bbResText, bbTextX, bbTextY - 2);
  c.textAlign = "left";
  c.textBaseline = "top";
  for (const r of rects) {
    const rb = rectAABBMasked(r);
    const rid = Math.max(1, Math.round(Number(r && r.id) || 0));
    rectBbById.set(rid, rb);
    const minCab = getRegionMinCabinetSize(r);
    if (minCab) minCabById.set(rid, minCab);
    if (minCab) {
      const stepX = Math.max(1, Number(minCab.minW) || 1);
      const stepY = Math.max(1, Number(minCab.minH) || 1);
      if (stepX * Math.max(0.01, zSafe) >= 4 && stepY * Math.max(0.01, zSafe) >= 4) {
        c.save();
        c.strokeStyle = "rgba(84, 194, 255, .65)";
        c.lineWidth = Math.max(1.6 * ui, 1.05 / Math.max(0.25, z || 1));
        c.beginPath();
        for (let x = rb.minX + stepX; x < rb.maxX - 0.5; x += stepX) {
          c.moveTo(x, rb.minY);
          c.lineTo(x, rb.maxY);
        }
        for (let y = rb.minY + stepY; y < rb.maxY - 0.5; y += stepY) {
          c.moveTo(rb.minX, y);
          c.lineTo(rb.maxX, y);
        }
        c.stroke();
        c.restore();
      }
    }
    c.save();
    c.strokeStyle = "rgba(84, 194, 255, .95)";
    c.lineWidth = Math.max(1.9 * ui, 1.2 / Math.max(0.25, z || 1));
    c.strokeRect(rb.minX, rb.minY, Math.max(1, rb.maxX - rb.minX), Math.max(1, rb.maxY - rb.minY));
    c.restore();
    const dx = Math.round(rb.minX - bb.minX);
    const dy = Math.round(rb.minY - bb.minY);
    const coordsText = `${dx}, ${dy}`;
    const portText = String(r && r._controllerPortLabel || "");
    const regionText = String(r && r._controllerRegionLabel || "");
    const rw = Math.max(1, rb.maxX - rb.minX);
    const rh = Math.max(1, rb.maxY - rb.minY);
    const fs = Math.max(16, Math.min(32, Math.min(rw, rh) * 0.32));
    c.font = `${Math.round(fs * 100) / 100}px sans-serif`;
    const topText = `${coordsText} · ${portText}`;
    const topW = c.measureText(topText).width;
    const regionW = c.measureText(regionText).width;
    const boxW = Math.max(topW, regionW);
    const lineH = Math.max(24, fs * 1.15);
    const boxH = lineH * 2 + 8;
    const px = rb.minX + 6;
    const py = rb.minY + 6;
    c.fillStyle = "rgba(7, 10, 14, .75)";
    c.fillRect(px - 3, py - 2, boxW + 6, boxH);
    c.fillStyle = "rgba(255,255,255,.95)";
    c.fillText(topText, px, py);
    c.fillText(regionText, px, py + lineH);
  }
  // Draw grid in empty cells inside groups of adjacent regions with equal cabinet size.
  {
    const ids = [...rectBbById.keys()];
    const normStep = v => Math.max(1, Math.round(Number(v) || 1));
    const sameStep = (a, b) => a && b && normStep(a.minW) === normStep(b.minW) && normStep(a.minH) === normStep(b.minH);
    const touchOrOverlap = (a, b) => {
      const dx = Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX));
      const dy = Math.max(0, Math.max(a.minY - b.maxY, b.minY - a.maxY));
      return dx <= 0 && dy <= 0;
    };
    const adj = new Map(ids.map(id => [id, new Set()]));
    for (let i = 0; i < ids.length; i++) {
      const aId = ids[i];
      const aBb = rectBbById.get(aId);
      const aStep = minCabById.get(aId);
      if (!aBb || !aStep) continue;
      for (let j = i + 1; j < ids.length; j++) {
        const bId = ids[j];
        const bBb = rectBbById.get(bId);
        const bStep = minCabById.get(bId);
        if (!bBb || !bStep) continue;
        if (!sameStep(aStep, bStep)) continue;
        if (!touchOrOverlap(aBb, bBb)) continue;
        adj.get(aId).add(bId);
        adj.get(bId).add(aId);
      }
    }
    const seen = new Set();
    for (const id of ids) {
      if (seen.has(id)) continue;
      const step = minCabById.get(id);
      if (!step) continue;
      const q = [id];
      const comp = [];
      seen.add(id);
      while (q.length) {
        const cur = q.shift();
        comp.push(cur);
        for (const nx of (adj.get(cur) || [])) {
          if (seen.has(nx)) continue;
          seen.add(nx);
          q.push(nx);
        }
      }
      if (comp.length < 2) continue;
      let gMinX = Infinity;
      let gMinY = Infinity;
      let gMaxX = -Infinity;
      let gMaxY = -Infinity;
      const memberRects = [];
      for (const rid of comp) {
        const rb = rectBbById.get(rid);
        if (!rb) continue;
        memberRects.push(rb);
        gMinX = Math.min(gMinX, Number(rb.minX) || 0);
        gMinY = Math.min(gMinY, Number(rb.minY) || 0);
        gMaxX = Math.max(gMaxX, Number(rb.maxX) || 0);
        gMaxY = Math.max(gMaxY, Number(rb.maxY) || 0);
      }
      const stepX = normStep(step.minW);
      const stepY = normStep(step.minH);
      if (!memberRects.length) continue;
      if (!Number.isFinite(gMinX) || !Number.isFinite(gMinY) || !Number.isFinite(gMaxX) || !Number.isFinite(gMaxY)) continue;
      if (stepX * Math.max(0.01, zSafe) < 4 || stepY * Math.max(0.01, zSafe) < 4) continue;
      c.save();
      const holes = new Path2D();
      holes.rect(gMinX, gMinY, Math.max(1, gMaxX - gMinX), Math.max(1, gMaxY - gMinY));
      for (const rb of memberRects) holes.rect(rb.minX, rb.minY, Math.max(1, rb.maxX - rb.minX), Math.max(1, rb.maxY - rb.minY));
      try {
        c.clip(holes, "evenodd");
      } catch {
        c.restore();
        continue;
      }
      c.strokeStyle = "rgba(84, 194, 255, .55)";
      c.lineWidth = Math.max(1.3 * ui, 0.95 / Math.max(0.25, z || 1));
      c.beginPath();
      for (let x = gMinX + stepX; x < gMaxX - 0.5; x += stepX) {
        c.moveTo(x, gMinY);
        c.lineTo(x, gMaxY);
      }
      for (let y = gMinY + stepY; y < gMaxY - 0.5; y += stepY) {
        c.moveTo(gMinX, y);
        c.lineTo(gMaxX, y);
      }
      c.stroke();
      c.restore();
    }
  }
  c.restore();
}
function drawControllerLayoutHeaderOverlay(c, z) {
  if (!isControllerLayoutModeActive()) return;
  const controllerId = Math.max(1, Math.round(Number(st && st.controllerLayout && st.controllerLayout.controllerId) || 0));
  const controllerRect = getRectById(controllerId);
  const controllerName = String(controllerRect && controllerRect.name || `Контроллер ${controllerId}`).trim();
  const vm = getViewMetrics();
  const zSafe = Math.max(1e-6, Number(z) || 1);
  const uiFixed = 1 / zSafe;
  const topLeftWorld = s2w(0, 0);
  const topRightWorld = s2w(vm.viewWidth, 0);
  const headerX0 = Number(topLeftWorld && topLeftWorld.x) || 0;
  const headerY0 = Number(topLeftWorld && topLeftWorld.y) || 0;
  const headerW = Math.max(1, (Number(topRightWorld && topRightWorld.x) || 0) - headerX0);
  const headerH = 28 * uiFixed;
  const headerText = `Контроллер: ${controllerName}`;
  c.save();
  c.font = `${13 * uiFixed}px sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "rgba(7, 10, 14, .75)";
  c.fillRect(headerX0, headerY0, headerW, headerH);
  c.fillStyle = "rgba(255,255,255,.96)";
  c.fillText(headerText, headerX0 + headerW / 2, headerY0 + headerH / 2);
  c.restore();
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
    applyProps({ field: "flowLinkColorReset", list: false, persist: true, render: true });
    syncProps();
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
if (el.btnControllerLayoutEdit) {
  bindClick(el.btnControllerLayoutEdit, () => {
    const current = cur();
    if (!current || !isControllerDevice(current)) return;
    enterControllerLayoutMode(current);
  });
}
if (el.btnControllerLayoutReset) {
  bindClick(el.btnControllerLayoutReset, () => {
    const active = isControllerLayoutModeActive();
    const controllerId = active
      ? Math.max(1, Math.round(Number(st && st.controllerLayout && st.controllerLayout.controllerId) || 0))
      : Math.max(1, Math.round(Number(cur() && cur().id) || 0));
    const controllerRect = getRectById(controllerId);
    if (!controllerRect || !isControllerDevice(controllerRect)) return;
    controllerRect.controllerLayoutRegionPositions = {};
    schedulePersist("project");
    if (active) {
      exitControllerLayoutMode({ skipLayoutPersist: true });
      enterControllerLayoutMode(controllerRect);
      return;
    }
    syncProps();
    render();
  });
}
if (el.controllerLayoutBack) {
  bindClick(el.controllerLayoutBack, () => exitControllerLayoutMode());
}
const syncPropsBase = syncProps;
syncProps = () => {
  if (!isControllerLayoutModeActive()) {
    const hasTemp = (Array.isArray(st.rects) ? st.rects : []).some(r => r && r._controllerLayoutTemp);
    if (hasTemp) removeControllerLayoutTempRects();
  }
  if (isControllerLayoutModeActive()) {
    const ids = getControllerLayoutRectIdSet();
    if (!ids.size) {
      exitControllerLayoutMode();
      return;
    }
    if (String(st.mode || "") !== "select") setModeBase("select");
  }
  syncPropsBase();
  syncCabinetToolPanel();
  updateControllerLayoutUiLock();
  const current = cur();
  if (el.btnControllerLayoutEdit) {
    const canEditLayout = !!(current && isControllerDevice(current) && !isControllerLayoutModeActive());
    el.btnControllerLayoutEdit.disabled = !canEditLayout;
    el.btnControllerLayoutEdit.setAttribute("aria-disabled", canEditLayout ? "false" : "true");
  }
  if (el.btnControllerLayoutReset) {
    const canResetLayout = !!(
      (isControllerLayoutModeActive() && Math.max(1, Math.round(Number(st && st.controllerLayout && st.controllerLayout.controllerId) || 0)) > 0)
      || (current && isControllerDevice(current) && !isControllerLayoutModeActive())
    );
    el.btnControllerLayoutReset.disabled = !canResetLayout;
    el.btnControllerLayoutReset.setAttribute("aria-disabled", canResetLayout ? "false" : "true");
  }
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
  isControllerLayoutReadOnly: () => !!(isControllerLayoutModeActive() && st && st.controllerLayout && st.controllerLayout.readOnly),
  canEnterControllerLayoutReadOnly: rect => {
    if (isControllerLayoutModeActive()) return false;
    if (!(st && st.lockAll)) return false;
    if (!rect || !isControllerDevice(rect)) return false;
    const map = rect.controllerLayoutRegionPositions;
    if (!map || typeof map !== "object") return false;
    return Object.keys(map).length > 0;
  },
  enterControllerLayoutReadOnly: rect => enterControllerLayoutMode(rect, { readOnly: true }),
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
      enterControllerLayoutMode: (controllerRect, opts = {}) => enterControllerLayoutMode(controllerRect, opts),
      exitControllerLayoutMode: opts => exitControllerLayoutMode(opts),
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
    window.ledMaskGetProjectGuid = () => String(st && st.projectGuid || "");
    window.ledMaskGetProjectStoreApiUrl = () => String(PROJECT_STORE_API_URL || "./project_store.php");
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
const updateEditorPageTitle = () => {
  const lang = i18n && typeof i18n.getLanguage === "function" ? String(i18n.getLanguage() || "ru") : "ru";
  document.title = (lang === "en") ? "LED Mask Editor" : "Редактор масок LED экранов";
};
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
    updateEditorPageTitle();
  }
});
i18n.translateDom(document.body);
updateEditorPageTitle();


