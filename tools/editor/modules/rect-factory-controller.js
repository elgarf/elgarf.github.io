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
      if (!r || String(r.kind || "").toLowerCase() === "note") continue;
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
      rig: normalizeRigData(r && r.rig),
      locked: !!(r && r.locked),
      kind: String((r && r.kind) || ""),
      noteText: String((r && r.noteText) || "")
    };

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
      rig: normalizeRigData(null),
      locked: false,
      kind: "",
      noteText: ""
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

  return {
    metricFromPx,
    pxFromMetric,
    parseProjectRect,
    mk,
    mkNote
  };
};
