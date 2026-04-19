export const setupMirrorDuplicateFeature = (deps = {}) => {
  const {
    st,
    cur,
    drawCellX,
    drawCellY,
    parseLinkKey,
    mkLinkKey,
    getCellTopology,
    withNameSuffixBeforeGroup,
    getHiddenSet,
    makeCalcBudget,
    calcNow,
    planNumberRegionsUncached,
    SPLIT_VARIANT_MAX,
    normalizeFlowLocks,
    normalizeRigData,
    RIG_DEFAULT_LOAD_KG,
    autoContrast,
    insertCloneAboveSource,
    selRect,
    setMode,
    schedulePersist
  } = deps;

  const dupMirrorSel = () => {
    const r = cur(); if (!r) return; const cx = drawCellX(r), cy = drawCellY(r), cols = Math.max(1, Math.ceil(r.width / cx)), rows = Math.max(1, Math.ceil(r.height / cy)); const mapIndex = i => { const x = i % cols, y = Math.floor(i / cols); if (!(x >= 0 && x < cols && y >= 0 && y < rows)) return -1; const nx = (cols - 1) - x; return y * cols + nx; };
    const hiddenSrc = Array.isArray(r.hiddenCells) ? r.hiddenCells : [], hiddenSet = new Set();
    for (const k of hiddenSrc) { const p = String(k).split(","); if (p.length !== 2) continue; const ix = +p[0], iy = +p[1]; if (!(ix >= 0 && ix < cols && iy >= 0 && iy < rows)) continue; hiddenSet.add(`${(cols - 1) - ix},${iy}`); }
    const linkSrc = Array.isArray(r.cellLinks) ? r.cellLinks : [], linkSet = new Set();
    for (const k of linkSrc) { const p = parseLinkKey(k); if (!p) continue; const a2 = mapIndex(p.a), b2 = mapIndex(p.b); if (a2 < 0 || b2 < 0 || a2 === b2) continue; linkSet.add(mkLinkKey(a2, b2)); }
    const mirrorDir = d => { const s = String(d || "").toLowerCase(); if (s === "left") return "right"; if (s === "right") return "left"; return s; };
    const mirrorMode = m => { const s = String(m || ""); if (s === "h_bl_lr") return "h_br_rl"; if (s === "h_br_rl") return "h_bl_lr"; if (s === "h_tl_lr") return "h_tr_rl"; if (s === "h_tr_rl") return "h_tl_lr"; if (s === "v_lb_bu") return "v_rb_bu"; if (s === "v_rb_bu") return "v_lb_bu"; if (s === "v_lt_td") return "v_rt_td"; if (s === "v_rt_td") return "v_lt_td"; return s; };
    const topoOld = getCellTopology(r, cx, cy);
    const mirrorProbe = { ...r, cellLinks: [...linkSet], hiddenCells: [...hiddenSet] };
    const topoNew = getCellTopology(mirrorProbe, cx, cy);
    const cidMap = new Map();
    if (topoOld && topoNew && Array.isArray(topoOld.seed) && Array.isArray(topoNew.comp)) {
      for (let oldCid = 0; oldCid < topoOld.seed.length; oldCid++) {
        const seed = topoOld.seed[oldCid];
        if (!seed) continue;
        const oldIdx = Math.max(0, Math.min(cols - 1, Math.round(Number(seed.col) || 0))) + Math.max(0, Math.min(rows - 1, Math.round(Number(seed.row) || 0))) * cols;
        const newIdx = mapIndex(oldIdx);
        if (newIdx < 0 || newIdx >= topoNew.comp.length) continue;
        const newCid = Math.max(0, Math.round(Number(topoNew.comp[newIdx]) || 0));
        cidMap.set(oldCid, newCid);
      }
    }
    let mirroredSplitVariant = Math.max(0, Math.round(Number(r && r.splitVariant) || 0));
    let bestPlanRegs = [];
    const regionRidMap = new Map();
    try {
      const hsOld = getHiddenSet(r), oldBudget = makeCalcBudget(); oldBudget.deadline = calcNow() + 350;
      const oldPlan = planNumberRegionsUncached(r, cx, cy, topoOld, hsOld, oldBudget);
      const oldRegs = Array.isArray(oldPlan && oldPlan.regions) ? oldPlan.regions : [];
      if (oldRegs.length) {
        const mirroredTargets = oldRegs.map(z => ({ srcRid: Math.max(0, Math.round(Number(z && z.id) || 0)), c0: Math.max(0, cols - Math.max(0, Math.round(Number(z && z.c1) || 0))), c1: Math.max(0, cols - Math.max(0, Math.round(Number(z && z.c0) || 0))), r0: Math.max(0, Math.round(Number(z && z.r0) || 0)), r1: Math.max(0, Math.round(Number(z && z.r1) || 0)) }));
        const targetSig = mirroredTargets.map(z => `${z.c0},${z.c1},${z.r0},${z.r1}`).sort().join("|");
        const rectMatchScore = (cand, target) => {
          const cc0 = Math.max(0, Math.round(Number(cand && cand.c0) || 0)), cc1 = Math.max(cc0 + 1, Math.round(Number(cand && cand.c1) || 0)), cr0 = Math.max(0, Math.round(Number(cand && cand.r0) || 0)), cr1 = Math.max(cr0 + 1, Math.round(Number(cand && cand.r1) || 0));
          const tc0 = target.c0, tc1 = target.c1, tr0 = target.r0, tr1 = target.r1;
          const dEdges = Math.abs(cc0 - tc0) + Math.abs(cc1 - tc1) + Math.abs(cr0 - tr0) + Math.abs(cr1 - tr1);
          const cw = Math.max(1, cc1 - cc0), ch = Math.max(1, cr1 - cr0), tw = Math.max(1, tc1 - tc0), th = Math.max(1, tr1 - tr0);
          const dSize = Math.abs(cw - tw) + Math.abs(ch - th);
          return dEdges * 10 + dSize;
        };
        const scorePlan = regs => {
          const list = Array.isArray(regs) ? regs : [];
          if (!list.length) return 1e12;
          const sig = list.map(z => `${z.c0},${z.c1},${z.r0},${z.r1}`).sort().join("|");
          if (sig === targetSig) return -1e9;
          const used = new Set();
          let score = Math.abs(list.length - mirroredTargets.length) * 1e6;
          for (const t of mirroredTargets) {
            let best = 1e9, bestIdx = -1;
            for (let i = 0; i < list.length; i++) {
              if (used.has(i)) continue;
              const s = rectMatchScore(list[i], t);
              if (s < best) { best = s; bestIdx = i; }
            }
            if (bestIdx >= 0) { used.add(bestIdx); score += best; }
            else score += 1e5;
          }
          return score;
        };
        const baseProbe = { ...r, cellLinks: [...linkSet], hiddenCells: [...hiddenSet], splitVariant: 0 };
        let bestScore = 1e12, bestVariant = mirroredSplitVariant, maxVar = Math.max(1, Math.min(SPLIT_VARIANT_MAX, 25));
        for (let sv = 0; sv < maxVar; sv++) {
          baseProbe.splitVariant = sv;
          const budget = makeCalcBudget(); budget.deadline = calcNow() + 300;
          const plan = planNumberRegionsUncached(baseProbe, cx, cy, topoNew, getHiddenSet(baseProbe), budget);
          if (sv === 0) {
            const vc = Math.max(1, Math.round(Number(plan && plan.variantCount) || 1));
            maxVar = Math.max(1, Math.min(SPLIT_VARIANT_MAX, vc));
          }
          const s = scorePlan(plan && plan.regions);
          if (s < bestScore) { bestScore = s; bestVariant = sv; bestPlanRegs = Array.isArray(plan && plan.regions) ? plan.regions.map(it => ({ ...it })) : []; }
          if (bestScore <= -1e8) break;
        }
        mirroredSplitVariant = Math.max(0, Math.round(bestVariant || 0));
        if (bestPlanRegs.length) {
          const used = new Set();
          for (const t of mirroredTargets) {
            let best = 1e9, bestIdx = -1;
            for (let i = 0; i < bestPlanRegs.length; i++) {
              if (used.has(i)) continue;
              const s = rectMatchScore(bestPlanRegs[i], t);
              if (s < best) { best = s; bestIdx = i; }
            }
            if (bestIdx >= 0) {
              used.add(bestIdx);
              const dstRid = Math.max(0, Math.round(Number(bestPlanRegs[bestIdx] && bestPlanRegs[bestIdx].id) || bestIdx));
              regionRidMap.set(Math.max(0, Math.round(Number(t && t.srcRid) || 0)), dstRid);
            }
          }
        }
      }
    } catch (_e) { }
    const srcFlowLocks = normalizeFlowLocks(r && r.flowLocks), mirFlowLocks = {};
    for (const [rk, cfg] of Object.entries(srcFlowLocks || {})) {
      const srcRid = Math.max(0, Math.round(Number(rk) || 0));
      const dstRid = regionRidMap.has(srcRid) ? regionRidMap.get(srcRid) : srcRid;
      const locks = Array.isArray(cfg && cfg.locks) ? cfg.locks : [];
      const mappedLocks = [];
      for (const it of locks) {
        const idx = Math.max(0, Math.round(Number(it && it.index) || 0)), cidOld = Math.max(0, Math.round(Number(it && it.cid) || 0)), cidNew = (cidMap.has(cidOld) ? cidMap.get(cidOld) : cidOld);
        mappedLocks.push({ index: idx, cid: cidNew });
      }
      const startOld = (cfg && cfg.startCid != null) ? Math.max(0, Math.round(Number(cfg.startCid) || 0)) : null;
      const startNew = (startOld != null ? (cidMap.has(startOld) ? cidMap.get(startOld) : startOld) : null);
      mirFlowLocks[String(dstRid)] = { locks: mappedLocks, startCid: startNew, startDir: mirrorDir(cfg && cfg.startDir || ""), mode: mirrorMode(cfg && cfg.mode || ""), startPinned: !!(cfg && cfg.startPinned) };
    }
    const srcRig = normalizeRigData(r && r.rig), mirRig = { frames: [], loads: {}, suspends: [], suspendLinks: [] };
    for (const fk of srcRig.frames) {
      const p = String(fk || "").split(",");
      if (p.length !== 2) continue;
      const c0 = Math.max(1, Math.round(Number(p[0]) || 0)), row = Math.max(0, Math.round(Number(p[1]) || 0));
      const mc = Math.max(1, cols - c0);
      mirRig.frames.push(`${mc},${row}`);
    }
    for (const [lk, wk] of Object.entries(srcRig.loads || {})) {
      const p = String(lk || "").split(",");
      if (p.length !== 2) continue;
      const c0 = Math.max(1, Math.round(Number(p[0]) || 0)), row = Math.max(0, Math.round(Number(p[1]) || 0));
      const mc = Math.max(1, cols - c0);
      mirRig.loads[`${mc},${row}`] = Math.max(5, Math.round(Number(wk) || RIG_DEFAULT_LOAD_KG));
    }
    for (const col of srcRig.suspends || []) mirRig.suspends.push(Math.max(0, cols - 1 - Math.max(0, Math.round(Number(col) || 0))));
    for (const lk of srcRig.suspendLinks || []) {
      const p = String(lk || "").split("-");
      if (p.length !== 2) continue;
      const a = Math.max(0, cols - 1 - Math.max(0, Math.round(Number(p[0]) || 0)));
      const b = Math.max(0, cols - 1 - Math.max(0, Math.round(Number(p[1]) || 0)));
      const x = Math.min(a, b), y = Math.max(a, b);
      if (x === y) continue;
      mirRig.suspendLinks.push(`${x}-${y}`);
    }
    const c = { ...r, id: st.next++, name: withNameSuffixBeforeGroup(r.name, "mirror"), x: r.x + 20, y: r.y + 20, rotation: r.rotation || 0, colorB: r.autoContrastB ? autoContrast(r.colorA) : r.colorB, autoContrastB: r.autoContrastB !== false, splitVariant: mirroredSplitVariant, cellLinks: [...linkSet], hiddenCells: [...hiddenSet], flowLocks: mirFlowLocks, manualClusters: [], rig: normalizeRigData(mirRig) };
    insertCloneAboveSource(r.id, c); selRect(c.id); setMode("select"); schedulePersist("project");
  };

  return { dupMirrorSel };
};
