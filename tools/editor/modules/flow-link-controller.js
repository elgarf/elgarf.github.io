export const setupFlowLinkController = (deps = {}) => {
  const {
    st,
    normalizeFlowLinks,
    flowAnchorKey,
    getRectRuntime,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    rectAABBMasked,
    AREA_LIMIT_EPS
  } = deps;
  if (st && typeof st.debugFlowLink === "undefined") st.debugFlowLink = false;

  const flowLinkCheckDebugState = new Map();

  const logCanLinkFlowAnchorsDebug = (a, b, ok, reason, extra = {}) => {
    if (!st || !st.debugFlowLink) return;
    try {
      const fromId = Math.max(1, Math.round(Number(a && a.rectId) || 0));
      const toId = Math.max(1, Math.round(Number(b && b.rectId) || 0));
      const key = `${fromId}>${toId}`;
      const payload = {
        ok: !!ok,
        reason: String(reason || ""),
        from: a ? { rectId: fromId, rid: Math.max(0, Math.round(Number(a.rid) || 0)), cid: Math.max(0, Math.round(Number(a.cid) || 0)), kind: String(a.kind || "") } : null,
        to: b ? { rectId: toId, rid: Math.max(0, Math.round(Number(b.rid) || 0)), cid: Math.max(0, Math.round(Number(b.cid) || 0)), kind: String(b.kind || "") } : null,
        ...extra
      };
      const sig = JSON.stringify(payload);
      const now = Date.now();
      const prev = flowLinkCheckDebugState.get(key);
      if (prev && prev.sig === sig && (now - prev.ts) < 320) return;
      flowLinkCheckDebugState.set(key, { sig, ts: now });
      console.info("[canLinkFlowAnchors]", payload);
    } catch (_e) { }
  };

  const pruneFlowLinks = () => {
    const links = normalizeFlowLinks(st.flowLinks);
    const valid = [];
    const anchorSet = new Set((Array.isArray(st.flowLinkAnchors) ? st.flowLinkAnchors : []).map(flowAnchorKey));
    for (const ln of links) {
      if (!anchorSet.has(flowAnchorKey(ln.from))) continue;
      if (!anchorSet.has(flowAnchorKey(ln.to))) continue;
      valid.push(ln);
    }
    st.flowLinks = valid;
  };

  const canLinkFlowAnchors = (a, b) => {
    if (!a || !b) { logCanLinkFlowAnchorsDebug(a, b, false, "missing_anchor"); return false; }
    if (a.rectId === b.rectId) { logCanLinkFlowAnchorsDebug(a, b, false, "same_rect"); return false; }
    if (a.kind !== "end" || b.kind !== "start") { logCanLinkFlowAnchorsDebug(a, b, false, "invalid_kinds"); return false; }
    const byId = new Map((Array.isArray(st.rects) ? st.rects : []).map(r => [Math.max(1, Math.round(Number(r && r.id) || 0)), r]));
    const ra = byId.get(Math.max(1, Math.round(Number(a.rectId) || 0)));
    const rb = byId.get(Math.max(1, Math.round(Number(b.rectId) || 0)));
    if (!ra || !rb) { logCanLinkFlowAnchorsDebug(a, b, false, "rect_not_found"); return false; }
    const linksRaw = normalizeFlowLinks(st.flowLinks);
    const groupsByRectId = new Map();
    const endpointLiveCache = new Map();
    const getRectGroups = rectId => {
      if (groupsByRectId.has(rectId)) return groupsByRectId.get(rectId);
      const rr = byId.get(rectId);
      if (!rr) { groupsByRectId.set(rectId, null); return null; }
      const rt = getRectRuntime(rr, { withGroups: true });
      const groups = rt.groups;
      const out = Array.isArray(groups) ? groups : [];
      groupsByRectId.set(rectId, out);
      return out;
    };
    const isEndpointLive = ep => {
      const key = flowAnchorKey(ep);
      if (endpointLiveCache.has(key)) return endpointLiveCache.get(key);
      const rectId = Math.max(1, Math.round(Number(ep && ep.rectId) || 0));
      const rid = Math.max(0, Math.round(Number(ep && ep.rid) || 0));
      const cid = Math.max(0, Math.round(Number(ep && ep.cid) || 0));
      const kind = String(ep && ep.kind || "").toLowerCase() === "end" ? "end" : "start";
      const groups = getRectGroups(rectId);
      const g = Array.isArray(groups) ? groups.find(it => Math.max(0, Math.round(Number(it && it.rid) || 0)) === rid) : null;
      const pts = Array.isArray(g && g.points) ? g.points : [];
      if (!pts.length) { endpointLiveCache.set(key, false); return false; }
      const p = kind === "end" ? pts[pts.length - 1] : pts[0];
      const ok = Math.max(0, Math.round(Number(p && p.cid) || 0)) === cid;
      endpointLiveCache.set(key, ok);
      return ok;
    };
    const links = linksRaw.filter(ln => isEndpointLive(ln && ln.from) && isEndpointLive(ln && ln.to));
    const fromRectId = Math.max(1, Math.round(Number(a.rectId) || 0));
    const toRectId = Math.max(1, Math.round(Number(b.rectId) || 0));
    const fromAnchorKey = flowAnchorKey(a);
    const toAnchorKey = flowAnchorKey(b);
    for (const ln of links) {
      const lkFrom = flowAnchorKey(ln && ln.from);
      const lkTo = flowAnchorKey(ln && ln.to);
      if (lkTo === toAnchorKey && lkFrom !== fromAnchorKey) {
        logCanLinkFlowAnchorsDebug(a, b, false, "start_already_linked", {
          existingFrom: ln && ln.from ? { rectId: ln.from.rectId, rid: ln.from.rid, cid: ln.from.cid, kind: ln.from.kind } : null,
          existingTo: ln && ln.to ? { rectId: ln.to.rectId, rid: ln.to.rid, cid: ln.to.cid, kind: ln.to.kind } : null
        });
        return false;
      }
      if (lkFrom === fromAnchorKey && lkTo !== toAnchorKey) {
        logCanLinkFlowAnchorsDebug(a, b, false, "end_already_linked", {
          existingFrom: ln && ln.from ? { rectId: ln.from.rectId, rid: ln.from.rid, cid: ln.from.cid, kind: ln.from.kind } : null,
          existingTo: ln && ln.to ? { rectId: ln.to.rectId, rid: ln.to.rid, cid: ln.to.cid, kind: ln.to.kind } : null
        });
        return false;
      }
    }
    const edgeSet = new Set();
    const outAdj = new Map();
    const undirAdj = new Map();
    const addDir = (u, v) => {
      const arr = outAdj.get(u) || [];
      arr.push(v);
      outAdj.set(u, arr);
    };
    const addUndir = (u, v) => {
      const ua = undirAdj.get(u) || [];
      ua.push(v);
      undirAdj.set(u, ua);
      const va = undirAdj.get(v) || [];
      va.push(u);
      undirAdj.set(v, va);
    };
    for (const ln of links) {
      const u = Math.max(1, Math.round(Number(ln && ln.from && ln.from.rectId) || 0));
      const v = Math.max(1, Math.round(Number(ln && ln.to && ln.to.rectId) || 0));
      if (!u || !v) continue;
      const k = `${u}>${v}`;
      if (edgeSet.has(k)) continue;
      edgeSet.add(k);
      addDir(u, v);
      addUndir(u, v);
    }
    if (!edgeSet.has(`${fromRectId}>${toRectId}`)) {
      addDir(fromRectId, toRectId);
      addUndir(fromRectId, toRectId);
    }
    const wouldMakeCycle = () => {
      if (fromRectId === toRectId) return true;
      const q = [toRectId];
      const seen = new Set([toRectId]);
      while (q.length) {
        const u = q.shift();
        if (u === fromRectId) return true;
        const next = outAdj.get(u) || [];
        for (const v of next) {
          if (seen.has(v)) continue;
          seen.add(v);
          q.push(v);
        }
      }
      return false;
    };
    const cycle = wouldMakeCycle();
    if (cycle) { logCanLinkFlowAnchorsDebug(a, b, false, "cycle_detected", { fromRectId, toRectId }); return false; }
    const regionNodeKey = (rectId, rid) => `${Math.max(1, Math.round(Number(rectId) || 0))}:${Math.max(0, Math.round(Number(rid) || 0))}`;
    const parseRegionNodeKey = key => {
      const p = String(key || "").split(":");
      return { rectId: Math.max(1, Math.round(Number(p[0]) || 0)), rid: Math.max(0, Math.round(Number(p[1]) || 0)) };
    };
    const endpointNodeKey = ep => regionNodeKey(ep && ep.rectId, ep && ep.rid);
    const nodeMetaMap = new Map();
    const rememberNodeMeta = ep => {
      if (!ep) return;
      const key = endpointNodeKey(ep);
      const rectId = Math.max(1, Math.round(Number(ep.rectId) || 0));
      const rid = Math.max(0, Math.round(Number(ep.rid) || 0));
      const cidRaw = Number(ep.cid);
      const cid = Number.isFinite(cidRaw) ? Math.max(0, Math.round(cidRaw)) : null;
      const prev = nodeMetaMap.get(key);
      if (!prev) {
        nodeMetaMap.set(key, { rectId, rid, cid });
        return;
      }
      if (prev.cid == null && cid != null) prev.cid = cid;
    };
    for (const ln of links) {
      rememberNodeMeta(ln && ln.from);
      rememberNodeMeta(ln && ln.to);
    }
    rememberNodeMeta(a);
    rememberNodeMeta(b);
    const regionAdj = new Map();
    const addRegionEdge = (k1, k2) => {
      if (!k1 || !k2 || k1 === k2) return;
      const a1 = regionAdj.get(k1) || [];
      a1.push(k2);
      regionAdj.set(k1, a1);
      const a2 = regionAdj.get(k2) || [];
      a2.push(k1);
      regionAdj.set(k2, a2);
    };
    for (const ln of links) addRegionEdge(endpointNodeKey(ln && ln.from), endpointNodeKey(ln && ln.to));
    const fromNode = endpointNodeKey(a);
    const toNode = endpointNodeKey(b);
    addRegionEdge(fromNode, toNode);
    const chainNodeSet = new Set([fromNode]);
    const queue = [fromNode];
    while (queue.length) {
      const curNode = queue.shift();
      const next = regionAdj.get(curNode) || [];
      for (const v of next) {
        if (chainNodeSet.has(v)) continue;
        chainNodeSet.add(v);
        queue.push(v);
      }
    }
    if (!chainNodeSet.has(toNode)) { logCanLinkFlowAnchorsDebug(a, b, false, "region_chain_disconnected", { fromNode, toNode }); return false; }
    const chainEdges = [];
    for (const ln of links) {
      const fk = endpointNodeKey(ln && ln.from);
      const tk = endpointNodeKey(ln && ln.to);
      if (!chainNodeSet.has(fk) || !chainNodeSet.has(tk)) continue;
      chainEdges.push({ from: fk, to: tk });
    }
    chainEdges.push({ from: fromNode, to: toNode, candidate: true });
    const rectRidMap = new Map();
    const chainIds = new Set();
    for (const nk of chainNodeSet) {
      const m = nodeMetaMap.get(nk) || parseRegionNodeKey(nk);
      const set = rectRidMap.get(m.rectId) || new Set();
      set.add(m.rid);
      rectRidMap.set(m.rectId, set);
      chainIds.add(m.rectId);
    }
    const regionBBoxCache = new Map();
    const getRegionBBoxLocalPx = (rr, rid) => {
      const rectId = Math.max(1, Math.round(Number(rr && rr.id) || 0));
      const rg = Math.max(0, Math.round(Number(rid) || 0));
      const key = `${rectId}:${rg}`;
      if (regionBBoxCache.has(key)) return regionBBoxCache.get(key);
      const cx = drawCellX(rr);
      const cy = drawCellY(rr);
      const rt = getRectRuntime(rr, { withGroups: true });
      const groups = rt.groups;
      const g = (Array.isArray(groups) ? groups : []).find(it => Math.max(0, Math.round(Number(it && it.rid) || 0)) === rg);
      if (!g || !Array.isArray(g.points) || !g.points.length) { regionBBoxCache.set(key, null); return null; }
      let minU = Infinity;
      let minV = Infinity;
      let maxU = -Infinity;
      let maxV = -Infinity;
      for (const p of g.points) {
        const u = +p.u || 0;
        const v = +p.v || 0;
        const bw = Math.max(1, Number(p && p.bw) || cx);
        const bh = Math.max(1, Number(p && p.bh) || cy);
        minU = Math.min(minU, u - bw / 2);
        maxU = Math.max(maxU, u + bw / 2);
        minV = Math.min(minV, v - bh / 2);
        maxV = Math.max(maxV, v + bh / 2);
      }
      if (!(Number.isFinite(minU) && Number.isFinite(minV) && Number.isFinite(maxU) && Number.isFinite(maxV) && maxU > minU && maxV > minV)) { regionBBoxCache.set(key, null); return null; }
      const out = { minU, minV, maxU, maxV, w: Math.max(1, maxU - minU), h: Math.max(1, maxV - minV) };
      regionBBoxCache.set(key, out);
      return out;
    };
    const compBBoxCache = new Map();
    const getCompBBoxLocalPx = (rr, cid) => {
      const rectId = Math.max(1, Math.round(Number(rr && rr.id) || 0));
      const compId = Math.max(0, Math.round(Number(cid) || 0));
      const key = `${rectId}:${compId}`;
      if (compBBoxCache.has(key)) return compBBoxCache.get(key);
      const cx = drawCellX(rr);
      const cy = drawCellY(rr);
      const topo = getCellTopologyCached(rr, cx, cy);
      const cols = Math.max(1, Math.round(Number(topo && topo.cols) || 1));
      const rows = Math.max(1, Math.round(Number(topo && topo.rows) || 1));
      let minU = Infinity;
      let minV = Infinity;
      let maxU = -Infinity;
      let maxV = -Infinity;
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const idx = y * cols + x;
          const c = Math.max(0, Math.round(Number(topo && Array.isArray(topo.comp) ? topo.comp[idx] : 0) || 0));
          if (c !== compId) continue;
          const u1 = x * cx;
          const v1 = y * cy;
          const u2 = Math.min(rr.width, (x + 1) * cx);
          const v2 = Math.min(rr.height, (y + 1) * cy);
          minU = Math.min(minU, u1);
          minV = Math.min(minV, v1);
          maxU = Math.max(maxU, u2);
          maxV = Math.max(maxV, v2);
        }
      }
      if (!(Number.isFinite(minU) && Number.isFinite(minV) && Number.isFinite(maxU) && Number.isFinite(maxV) && maxU > minU && maxV > minV)) { compBBoxCache.set(key, null); return null; }
      const out = { minU, minV, maxU, maxV, w: Math.max(1, maxU - minU), h: Math.max(1, maxV - minV) };
      compBBoxCache.set(key, out);
      return out;
    };
    const normalizedRects = [];
    const regionFallbackRects = [];
    for (const nk of chainNodeSet) {
      const nm = nodeMetaMap.get(nk) || parseRegionNodeKey(nk);
      const rr = byId.get(nm.rectId);
      if (!rr) continue;
      let bb = getRegionBBoxLocalPx(rr, nm.rid);
      let source = "region";
      if (!bb && nm.cid != null) {
        bb = getCompBBoxLocalPx(rr, nm.cid);
        source = "component";
      }
      if (!bb) {
        const rb = rectAABBMasked(rr);
        bb = {
          minU: 0, minV: 0,
          maxU: Math.max(1, rb.maxX - rb.minX),
          maxV: Math.max(1, rb.maxY - rb.minY),
          w: Math.max(1, rb.maxX - rb.minX),
          h: Math.max(1, rb.maxY - rb.minY)
        };
        source = "rect";
        regionFallbackRects.push({ rectId: nm.rectId, rid: nm.rid, node: nk, source });
      }
      const w = Math.max(1, bb.w);
      const h = Math.max(1, bb.h);
      const scalePx = Math.max(1, Number(st.globalScale) || Number(rr && rr.scale) || 256);
      const areaM2Px = Math.max(1, Number(rr && rr.areaM2Px) || 65536);
      const k = Math.sqrt(areaM2Px) / scalePx;
      normalizedRects.push({ id: nk, rectId: nm.rectId, rid: nm.rid, source, w: Math.max(1e-6, w * k), h: Math.max(1e-6, h * k) });
    }
    if (!normalizedRects.length) { logCanLinkFlowAnchorsDebug(a, b, false, "empty_chain_area", { chainIds: [...chainIds] }); return false; }
    const packRectsCompact = rects => {
      const src = Array.isArray(rects) ? rects : [];
      if (!src.length) return { area: 0, width: 0, height: 0 };
      if (src.length === 1) return { area: src[0].w * src[0].h, width: src[0].w, height: src[0].h };
      const sumArea = src.reduce((a0, r0) => a0 + Math.max(1e-6, r0.w * r0.h), 0);
      const sumW = src.reduce((a0, r0) => a0 + Math.max(r0.w, r0.h), 0);
      const maxSide = src.reduce((m0, r0) => Math.max(m0, r0.w, r0.h), 0);
      const candSet = new Set([maxSide, Math.sqrt(sumArea), sumW, sumW / 2, sumW / 3, sumW / 4]);
      for (const r0 of src) { candSet.add(r0.w); candSet.add(r0.h); }
      const widths = [...candSet].map(v => Math.max(maxSide, Number(v) || maxSide)).filter(v => Number.isFinite(v) && v > 0).sort((a0, b0) => a0 - b0);
      const sortedVariants = [
        src.slice().sort((a0, b0) => Math.max(b0.w, b0.h) - Math.max(a0.w, a0.h)),
        src.slice().sort((a0, b0) => (b0.w * b0.h) - (a0.w * a0.h)),
        src.slice().sort((a0, b0) => b0.w - a0.w)
      ];
      const placeShelf = (items, limitW, allowRotate) => {
        let x = 0;
        let y = 0;
        let rowH = 0;
        let maxX = 0;
        for (const it of items) {
          const vars = allowRotate ? [{ w: it.w, h: it.h }, { w: it.h, h: it.w }] : [{ w: it.w, h: it.h }];
          let choice = vars[0];
          let fitChoice = null;
          for (const v of vars) {
            if (x + v.w <= limitW + 1e-9) {
              const score = Math.max(rowH, v.h) * 1e6 + v.w;
              if (!fitChoice || score < fitChoice.score) fitChoice = { ...v, score };
            }
          }
          if (fitChoice) choice = fitChoice;
          else if (allowRotate && vars.length > 1 && vars[1].w < vars[0].w) choice = vars[1];
          if (x > 0 && x + choice.w > limitW + 1e-9) {
            y += rowH;
            x = 0;
            rowH = 0;
          }
          x += choice.w;
          rowH = Math.max(rowH, choice.h);
          maxX = Math.max(maxX, x);
        }
        const totalH = y + rowH;
        return { area: maxX * totalH, width: maxX, height: totalH };
      };
      let best = { area: Infinity, width: 0, height: 0 };
      for (const wLim of widths) {
        for (const items of sortedVariants) {
          const a0 = placeShelf(items, wLim, false);
          if (a0.area < best.area) best = a0;
          const b0 = placeShelf(items, wLim, true);
          if (b0.area < best.area) best = b0;
        }
      }
      return best.area < Infinity ? best : { area: sumArea, width: Math.sqrt(sumArea), height: Math.sqrt(sumArea) };
    };
    const packed = packRectsCompact(normalizedRects);
    const chainArea = Math.max(0, Number(packed && packed.area) || 0);
    const allowed = 655360 + AREA_LIMIT_EPS;
    const ok = chainArea <= allowed;
    logCanLinkFlowAnchorsDebug(a, b, ok, ok ? "ok" : "chain_area_limit", {
      chainIds: [...chainIds].sort((x, y) => x - y),
      chainNodeCount: chainNodeSet.size,
      chainNodes: [...chainNodeSet].sort(),
      chainEdges,
      chainRegionIds: [...rectRidMap.entries()].map(([rectId, set]) => ({ rectId, regions: [...set].sort((x, y) => x - y) })).sort((a0, b0) => a0.rectId - b0.rectId),
      regionFallbackRects,
      normalizedRects: normalizedRects.map(it => ({ id: it.id, rectId: it.rectId, rid: it.rid, source: it.source, w: Math.round(it.w * 1000) / 1000, h: Math.round(it.h * 1000) / 1000 })),
      chainArea: Math.round(chainArea * 1000) / 1000,
      packedW: Math.round((packed && packed.width || 0) * 1000) / 1000,
      packedH: Math.round((packed && packed.height || 0) * 1000) / 1000,
      chainMaxAllowed: 655360,
      allowed: Math.round(allowed * 1000) / 1000,
      linkCount: links.length,
      linkCountRaw: linksRaw.length,
      staleLinkCount: Math.max(0, linksRaw.length - links.length)
    });
    return ok;
  };

  const toggleFlowLinkBetween = (a, b) => {
    return mutateFlowLinkBetween(a, b, { toggle: true });
  };

  const addFlowLinkBetween = (a, b) => {
    return mutateFlowLinkBetween(a, b, { toggle: false });
  };

  const mutateFlowLinkBetween = (a, b, opts = {}) => {
    if (!canLinkFlowAnchors(a, b)) return false;
    const toggle = !!(opts && opts.toggle);
    const link = { from: { rectId: a.rectId, rid: a.rid, cid: a.cid, kind: "end" }, to: { rectId: b.rectId, rid: b.rid, cid: b.cid, kind: "start" } };
    const key = `${flowAnchorKey(link.from)}>${flowAnchorKey(link.to)}`;
    const set = normalizeFlowLinks(st.flowLinks);
    const idx = set.findIndex(it => `${flowAnchorKey(it.from)}>${flowAnchorKey(it.to)}` === key);
    if (idx >= 0) {
      if (!toggle) return false;
      set.splice(idx, 1);
    } else {
      set.push(link);
    }
    st.flowLinks = set;
    return true;
  };

  const distToSegment = (px, py, ax, ay, bx, by) => {
    const dx = bx - ax;
    const dy = by - ay;
    const ll = dx * dx + dy * dy;
    if (ll <= 1e-9) return Math.hypot(px - ax, py - ay);
    const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / ll));
    const cx = ax + dx * t;
    const cy = ay + dy * t;
    return Math.hypot(px - cx, py - cy);
  };

  const findFlowLinkAtPoint = (wx, wy) => {
    const segs = Array.isArray(st.flowLinkSegments) ? st.flowLinkSegments : [];
    const tol = Math.max(10, 16 / Math.max(0.2, st.zoom || 1));
    let best = null;
    let bestD = Infinity;
    for (const s of segs) {
      const d = distToSegment(wx, wy, s.a.x, s.a.y, s.b.x, s.b.y);
      if (d < bestD) { bestD = d; best = s; }
    }
    return (best && bestD <= tol) ? best : null;
  };

  const findFlowLinkAnchorAtPoint = (wx, wy, kind = "") => {
    const pts = Array.isArray(st.flowLinkAnchors) ? st.flowLinkAnchors : [];
    const tol = Math.max(6, 9 / Math.max(0.35, st.zoom || 1));
    const kindNorm = String(kind || "").toLowerCase();
    let best = null;
    let bestD = Infinity;
    for (const p of pts) {
      if (kindNorm && String(p && p.kind || "").toLowerCase() !== kindNorm) continue;
      const d = Math.hypot((+p.x || 0) - wx, (+p.y || 0) - wy);
      if (d < bestD) { bestD = d; best = p; }
    }
    return (best && bestD <= tol) ? best : null;
  };

  const updateFlowLinkDragTarget = (wx, wy) => {
    const drag = st.flowLinkDrag;
    if (!drag || !drag.from) return;
    drag.x = wx;
    drag.y = wy;
    const target = findFlowLinkAnchorAtPoint(wx, wy, "start");
    drag.target = target || null;
    if (!target) {
      drag.canLink = false;
      drag._lastCanLinkSig = "";
      drag._lastCanLink = false;
      return;
    }
    const sig = [
      flowAnchorKey(drag.from),
      flowAnchorKey(target),
      Array.isArray(st.flowLinks) ? st.flowLinks.length : 0,
      Array.isArray(st.flowLinkAnchors) ? st.flowLinkAnchors.length : 0,
      Array.isArray(st.rects) ? st.rects.length : 0
    ].join("|");
    if (sig === drag._lastCanLinkSig) {
      drag.canLink = !!drag._lastCanLink;
      return;
    }
    const can = !!canLinkFlowAnchors(drag.from, target);
    drag._lastCanLinkSig = sig;
    drag._lastCanLink = can;
    drag.canLink = can;
  };

  return {
    pruneFlowLinks,
    canLinkFlowAnchors,
    toggleFlowLinkBetween,
    addFlowLinkBetween,
    findFlowLinkAtPoint,
    findFlowLinkAnchorAtPoint,
    updateFlowLinkDragTarget
  };
};
