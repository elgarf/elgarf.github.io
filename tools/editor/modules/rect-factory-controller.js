export const setupRectFactoryController = (deps = {}) => {
  const {
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
    parseAreaM2PxInput,
    toPositiveInt,
    toRoundedInt,
    evalExpr,
    clampInt,
    randomColor
  } = deps;

  const metricFromPx = r => {
    r.scale = Math.max(1, Math.round(+r.scale || 256));
    r.width = Math.max(1, Math.round(+r.width || 1));
    r.height = Math.max(1, Math.round(+r.height || 1));
    r.widthM = Math.max(0.001, mRound(r.width / r.scale));
    r.heightM = Math.max(0.001, mRound(r.height / r.scale));
  };

  const pxFromMetric = r => {
    r.scale = Math.max(1, Math.round(+r.scale || 256));
    r.widthM = Math.max(0.001, +r.widthM || 0.001);
    r.heightM = Math.max(0.001, +r.heightM || 0.001);
    r.width = Math.max(1, Math.round(r.widthM * r.scale));
    r.height = Math.max(1, Math.round(r.heightM * r.scale));
  };

  const cabinetSizeMetersForNewRect = scale => {
    const fallback = { x: 0.5, y: 0.5 };
    const rects = Array.isArray(st && st.rects) ? st.rects : [];
    let minX = Infinity;
    let minY = Infinity;
    for (const r of rects) {
      if (!r || ["note", "shape", "device"].includes(String(r.kind || "").toLowerCase())) continue;
      const s = Math.max(1, Math.round(Number(r.scale) || Number(scale) || 256));
      const cx = Number(r.cellX);
      const cy = Number(r.cellY);
      if (cx > 0) minX = Math.min(minX, cx / s);
      if (cy > 0) minY = Math.min(minY, cy / s);
    }
    return {
      x: Number.isFinite(minX) && minX > 0 ? minX : fallback.x,
      y: Number.isFinite(minY) && minY > 0 ? minY : fallback.y
    };
  };
  const normalizeShapeOpacity = value => {
    const n = Number(value);
    if (!Number.isFinite(n)) return 0.72;
    return Math.max(0, Math.min(1, n));
  };
  const normalizeShapePoint = p => {
    const x = Math.round(Number(p && p.x) || 0);
    const y = Math.round(Number(p && p.y) || 0);
    const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
    const out = { x, y };
    if (String(p && p.type || "") === "bezier") {
      out.type = "bezier";
      out.inX = Math.round(num(p && p.inX, -48));
      out.inY = Math.round(num(p && p.inY, 0));
      out.outX = Math.round(num(p && p.outX, 48));
      out.outY = Math.round(num(p && p.outY, 0));
    }
    return out;
  };
  const normalizeDeviceType = value => {
    const v = String(value || "").toLowerCase();
    if (v === "pc" || v === "mixer" || v === "camera") return v;
    return "controller";
  };
  const normalizeDeviceOrientation = value => String(value || "").toLowerCase() === "vertical" ? "vertical" : "horizontal";
  const normalizePortCount = (value, fallback = 4) => Math.max(1, Math.min(64, Math.round(Number(value) || fallback)));
  const normalizePortLabels = (value, count) => {
    const n = normalizePortCount(count, 4);
    const src = Array.isArray(value) ? value : [];
    const out = [];
    for (let i = 0; i < n; i++) {
      const label = String(src[i] == null ? "" : src[i]).trim();
      out.push(label || String(i + 1));
    }
    return out;
  };

  const parseProjectRect = (r, i, legacyAreaM2) => {
    const colorA = String(r.colorA || "#2fcaaf");
    const autoB = r.autoContrastB !== false;
    const manualB = String(r.colorB || autoContrast(colorA));
    const rawFlow = String((r && r.dataFlow) || "none");
    const maxSplit = Math.max(0, SPLIT_VARIANT_MAX - 1);

    const it = {
      id: toPositiveInt(r.id, i + 1),
      name: String(r.name || `Rect ${i + 1}`),
      x: toRoundedInt(r.x, 0),
      y: toRoundedInt(r.y, 0),
      rotation: evalExpr(r.rotation, 0),
      width: toPositiveInt(r.width, 1),
      height: toPositiveInt(r.height, 1),
      scale: toPositiveInt(r.scale, Math.max(1, Math.round(Number(st.globalScale) || 256))),
      widthM: Math.max(0.001, +r.widthM || 0),
      heightM: Math.max(0.001, +r.heightM || 0),
      areaM2Px: parseAreaM2PxInput(r.areaM2Px, legacyAreaM2),
      textSize: clampInt(evalExpr(r.textSize, 0), 0, 128, 0),
      colorA,
      autoContrastB: autoB,
      colorB: autoB ? autoContrast(colorA) : manualB,
      cellX: toPositiveInt(r.cellX, 128),
      cellY: toPositiveInt(r.cellY, 128),
      dataFlow: normalizeDataFlow(rawFlow),
      dataFlowZ: normalizeDataFlowZ(rawFlow, r && r.dataFlowZ),
      numberCells: !!r.numberCells,
      splitVariant: clampInt(evalExpr(r.splitVariant, 0), 0, maxSplit, 0),
      cellLinks: Array.isArray(r.cellLinks) ? r.cellLinks.map(String) : [],
      hiddenCells: normalizeHiddenCells(r.hiddenCells),
      flowLocks: normalizeFlowLocks(r.flowLocks),
      flowLockRidToSig: normalizeFlowLockRidToSigMap(r && r.flowLockRidToSig),
      flowLockCidToSeed: normalizeFlowLockCidToSeedMap(r && r.flowLockCidToSeed),
      manualClusters: normalizeManualClusters(r && r.manualClusters),
      cabinetStyles: normalizeCabinetStyles(r && r.cabinetStyles),
      rig: normalizeRigData(r && r.rig),
      locked: !!(r && r.locked),
      kind: String((r && r.kind) || ""),
      noteText: String((r && r.noteText) || ""),
      shapeOpacity: normalizeShapeOpacity(r && Object.prototype.hasOwnProperty.call(r, "shapeOpacity") ? r.shapeOpacity : 0.72),
      shapePoints: Array.isArray(r && r.shapePoints)
        ? r.shapePoints
          .map(normalizeShapePoint)
          .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y))
          .slice(0, 512)
        : [],
      deviceType: normalizeDeviceType(r && r.deviceType),
      deviceOrientation: normalizeDeviceOrientation(r && r.deviceOrientation),
      deviceInCount: normalizePortCount(r && r.deviceInCount, 4),
      deviceOutCount: normalizePortCount(r && r.deviceOutCount, 4),
      deviceInLabels: [],
      deviceOutLabels: []
    };
    it.deviceInLabels = normalizePortLabels(r && r.deviceInLabels, it.deviceInCount);
    it.deviceOutLabels = normalizePortLabels(r && r.deviceOutLabels, it.deviceOutCount);

    safeDefine(it, "_flowLockRidToSig", { ...it.flowLockRidToSig }, false);
    safeDefine(it, "_flowLockCidToSeed", { ...it.flowLockCidToSeed }, false);
    if (!(+r.widthM > 0 && +r.heightM > 0)) metricFromPx(it);
    else pxFromMetric(it);
    restorePersistedRectCache(it, r && r.projectCache);
    return it;
  };

  const mk = (x, y, w, h) => {
    const id = st.next++;
    const colorA = randomColor();
    const scale = Math.max(1, Math.round(Number(st.globalScale) || 256));
    const cabinetM = cabinetSizeMetersForNewRect(scale);
    const r = {
      id,
      name: `Rect ${id}`,
      x: Math.round(x),
      y: Math.round(y),
      rotation: 0,
      width: Math.max(1, Math.round(w)),
      height: Math.max(1, Math.round(h)),
      scale,
      widthM: 1,
      heightM: 1,
      areaM2Px: 65536,
      textSize: 0,
      colorA,
      autoContrastB: true,
      colorB: autoContrast(colorA),
      cellX: Math.max(1, Math.round(cabinetM.x * scale)),
      cellY: Math.max(1, Math.round(cabinetM.y * scale)),
      dataFlow: "none",
      dataFlowZ: false,
      numberCells: false,
      splitVariant: 0,
      cellLinks: [],
      hiddenCells: [],
      flowLocks: {},
      flowLockRidToSig: {},
      flowLockCidToSeed: {},
      manualClusters: [],
      cabinetStyles: {},
      rig: normalizeRigData(null),
      locked: false,
      kind: "",
      noteText: "",
      shapeOpacity: 0.72,
      shapePoints: [],
      deviceType: "controller",
      deviceOrientation: "horizontal",
      deviceInCount: 4,
      deviceOutCount: 4,
      deviceInLabels: ["1", "2", "3", "4"],
      deviceOutLabels: ["1", "2", "3", "4"]
    };
    metricFromPx(r);
    return r;
  };

  const mkNote = (x, y, w, h) => {
    const r = mk(x, y, w, h);
    r.kind = "note";
    r.name = `Примечание ${r.id}`;
    r.noteText = "";
    r.rotation = 0;
    r.colorA = "#fff7c2";
    r.autoContrastB = false;
    r.colorB = "#1f2937";
    return r;
  };

  const mkShape = points => {
    const pts = (Array.isArray(points) ? points : [])
      .map(p => ({ x: Math.round(Number(p && p.x) || 0), y: Math.round(Number(p && p.y) || 0) }))
      .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
    if (pts.length < 3) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of pts) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
    const r = mk(minX, minY, Math.max(1, maxX - minX), Math.max(1, maxY - minY));
    r.kind = "shape";
    r.name = `Контур ${r.id}`;
    r.shapePoints = pts.map(p => ({ x: p.x - minX, y: p.y - minY }));
    r.rotation = 0;
    r.colorA = randomColor();
    r.autoContrastB = false;
    r.colorB = r.colorA;
    r.shapeOpacity = 0.72;
    return r;
  };

  const mkDevice = (x, y, w, h) => {
    const r = mk(x, y, w, h);
    r.kind = "device";
    r.name = `Устройство ${r.id}`;
    r.rotation = 0;
    r.colorA = "#2fcaaf";
    r.autoContrastB = false;
    r.colorB = "#0f172a";
    r.deviceType = "controller";
    r.deviceOrientation = "horizontal";
    r.deviceInCount = 4;
    r.deviceOutCount = 4;
    r.deviceInLabels = ["1", "2", "3", "4"];
    r.deviceOutLabels = ["1", "2", "3", "4"];
    return r;
  };

  return {
    metricFromPx,
    pxFromMetric,
    parseProjectRect,
    mk,
    mkNote,
    mkShape,
    mkDevice
  };
};
