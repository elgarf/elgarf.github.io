export function setupFlowAnchorPointsController(deps = {}) {
  const {
    st,
    rectUVToWorld,
    maskCellKey,
    getFlowRegionConfig,
    getFlowStartRoutingRegion,
    FLOW_DIR_SET
  } = deps;

  const getSplitFlowMarkerOffset = longSide => {
    const ls = Math.max(8, Number(longSide) || 0);
    return Math.max(6, Math.min(36, ls * 0.25));
  };

  const getSplitFlowMarkerWorldPositions = (r, pts) => {
    const list = Array.isArray(pts) ? pts : [];
    if (!r || list.length < 1) return null;
    const s = list[0], e = list[list.length - 1];
    const su = +s.u || 0, sv = +s.v || 0, eu = +e.u || 0, ev = +e.v || 0;
    const scid = Math.max(0, Math.round(Number(s && s.cid) || 0));
    const ecid = Math.max(0, Math.round(Number(e && e.cid) || 0));
    if (scid !== ecid) return null;
    if (Math.hypot(su - eu, sv - ev) > 1e-6) return null;
    const bw = Math.max(8, Number((s && s.bw) || (e && e.bw) || 0));
    const bh = Math.max(8, Number((s && s.bh) || (e && e.bh) || 0));
    if (!(bw > 0 && bh > 0)) return null;
    const singleCabRegion = (Math.max(1, Math.round(Number(s && s.spanCols) || 1)) === 1)
      && (Math.max(1, Math.round(Number(s && s.spanRows) || 1)) === 1);
    let su2 = su, sv2 = sv, eu2 = eu, ev2 = ev;
    if (bw >= bh) {
      const off = getSplitFlowMarkerOffset(bw, singleCabRegion);
      su2 = su - off;
      eu2 = eu + off;
    } else {
      const off = getSplitFlowMarkerOffset(bh, singleCabRegion);
      sv2 = sv - off;
      ev2 = ev + off;
    }
    const sw = rectUVToWorld(r, su2, sv2);
    const ew = rectUVToWorld(r, eu2, ev2);
    return { start: { x: sw.x, y: sw.y }, end: { x: ew.x, y: ew.y } };
  };

  const collectFlowLinkAnchors = (r, groups) => {
    if (!r || !Array.isArray(groups)) return;
    const seen = new Set();
    for (const g of groups) {
      const rid = Math.max(0, Math.round(Number(g && g.rid) || 0));
      const pts = Array.isArray(g && g.points) ? g.points : [];
      const regionCfg = typeof getFlowRegionConfig === "function" ? getFlowRegionConfig(r, rid) : null;
      const manualOrder = Array.isArray(regionCfg && regionCfg.manualOrder) ? regionCfg.manualOrder : [];
      if (!pts.length) continue;
      const split = getSplitFlowMarkerWorldPositions(r, pts);
      const s0 = pts[0];
      const su = +s0.u || 0;
      const sv = +s0.v || 0;
      const scid = Math.max(0, Math.round(Number(s0 && s0.cid) || 0));
      const sw0 = rectUVToWorld(r, su, sv);
      const sw = split && split.start ? split.start : sw0;
      const sk = `${rid}:${scid}:start`;
      if (!seen.has(sk)) {
        seen.add(sk);
        st.flowLinkAnchors.push({ rectId: r.id, rid, cid: scid, kind: "start", x: sw.x, y: sw.y });
      }
      if (regionCfg && regionCfg.manual && manualOrder.length < 2) continue;
      const e0 = pts[pts.length - 1];
      const eu = +e0.u || 0;
      const ev = +e0.v || 0;
      const ecid = Math.max(0, Math.round(Number(e0 && e0.cid) || 0));
      const ew0 = rectUVToWorld(r, eu, ev);
      const ew = split && split.end ? split.end : ew0;
      const ek = `${rid}:${ecid}:end`;
      if (!seen.has(ek)) {
        seen.add(ek);
        st.flowLinkAnchors.push({ rectId: r.id, rid, cid: ecid, kind: "end", x: ew.x, y: ew.y });
      }
    }
  };

  const collectFlowEditPoints = (r, groups, opts = null) => {
    if (!r || !Array.isArray(groups)) return;
    const manualPickMode = !!(opts && opts.manualPickMode);
    for (const g of groups) {
      const rid = Math.max(0, Math.round(Number(g && g.rid) || 0));
      const pts = Array.isArray(g && g.points) ? g.points : [];
      const regionCfg = typeof getFlowRegionConfig === "function" ? getFlowRegionConfig(r, rid) : null;
      const manualOrder = Array.isArray(regionCfg && regionCfg.manualOrder) ? regionCfg.manualOrder.map(v => Math.max(0, Math.round(Number(v) || 0))) : [];
      const manualIndexByCid = new Map(manualOrder.map((cid, index) => [cid, index]));
      if (pts.length) {
        const p0 = pts[0];
        const singleCabRegion = (pts.length === 1)
          && (Math.max(1, Math.round(Number(p0 && p0.spanCols) || 1)) === 1)
          && (Math.max(1, Math.round(Number(p0 && p0.spanRows) || 1)) === 1);
        if (singleCabRegion && !manualPickMode) continue;
      }
      const split = getSplitFlowMarkerWorldPositions(r, pts);
      if (pts.length && !manualPickMode) {
        const s0 = pts[0];
        const su = +s0.u || 0;
        const sv = +s0.v || 0;
        const scid = Math.max(0, Math.round(Number(s0 && s0.cid) || 0));
        const sw0 = rectUVToWorld(r, su, sv);
        const sw = split && split.start ? split.start : sw0;
        st.flowStartHandles.push({
          rectId: r.id,
          rid,
          cid: scid,
          u: su,
          v: sv,
          x: sw.x,
          y: sw.y,
          zFallback: !!(g && g.zFallback)
        });
        const cfg = getFlowStartRoutingRegion(r, rid);
        const dir = String(cfg && cfg.startDir || "").toLowerCase();
        const dirDefs = [
          { dir: "left", du: -28, dv: 0, label: "◀" },
          { dir: "right", du: 28, dv: 0, label: "▶" },
          { dir: "up", du: 0, dv: -28, label: "▲" },
          { dir: "down", du: 0, dv: 28, label: "▼" }
        ];
        for (const d of dirDefs) {
          const wp = rectUVToWorld(r, su + d.du, sv + d.dv);
          st.flowDirButtons.push({
            rectId: r.id,
            rid,
            cid: scid,
            dir: d.dir,
            label: d.label,
            u: su + d.du,
            v: sv + d.dv,
            x: wp.x,
            y: wp.y,
            active: (FLOW_DIR_SET.has(dir) && dir === d.dir)
          });
        }
      }
      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];
        const u = +p.u || 0;
        const v = +p.v || 0;
        const cid = Math.max(0, Math.round(Number(p && p.cid) || 0));
        const wp0 = rectUVToWorld(r, u, v);
        const wp = manualPickMode ? wp0 : ((split && i === 0 && split.start)
          ? split.start
          : ((split && i === pts.length - 1 && split.end) ? split.end : wp0));
        const manualIndex = manualIndexByCid.has(cid) ? manualIndexByCid.get(cid) : -1;
        st.flowEditPoints.push({ rectId: r.id, rid, index: i, cid, u, v, x: wp.x, y: wp.y, manualIndex, manualActive: manualIndex >= 0, manualMode: manualPickMode });
        if (manualPickMode && manualIndex === 0) {
          st.flowStartHandles.push({
            rectId: r.id,
            rid,
            cid,
            u,
            v,
            x: wp.x,
            y: wp.y,
            zFallback: !!(g && g.zFallback),
            manualMode: true,
            label: String((g && g.label) || "")
          });
          const resetWp = rectUVToWorld(r, u + 24, v - 24);
          st.flowResetButtons.push({
            rectId: r.id,
            rid,
            cid,
            u: u + 24,
            v: v - 24,
            x: resetWp.x,
            y: resetWp.y
          });
        }
      }
    }
  };

  const collectFlowManualPickPoints = (r, cx, cy, topo, hs, regions) => {
    if (!r || !topo || !regions || !Array.isArray(regions.cellToRegion)) return;
    const cols = Math.max(1, Math.round(Number(topo.cols) || 1));
    const rows = Math.max(1, Math.round(Number(topo.rows) || 1));
    const comp = Array.isArray(topo.comp) ? topo.comp : [];
    const manualRegionsActive = Array.isArray(r.manualClusters) && r.manualClusters.length > 0;
    const stat = new Map();
    const ridOfCell = (ix, iy) => {
      const idx = iy * cols + ix;
      const rid = Number(regions.cellToRegion[idx]);
      return Number.isFinite(rid) && rid >= 0 ? Math.max(0, Math.round(rid || 0)) : -1;
    };
    for (let iy = 0; iy < rows; iy++) {
      for (let ix = 0; ix < cols; ix++) {
        if (hs && typeof maskCellKey === "function" && hs.has(maskCellKey(ix, iy))) continue;
        const rid = ridOfCell(ix, iy);
        if (rid < 0) continue;
        const idx = iy * cols + ix;
        const cid = Math.max(0, Math.round(Number(comp[idx]) || 0));
        const cw = Math.min(cx, r.width - ix * cx);
        const ch = Math.min(cy, r.height - iy * cy);
        const u = ix * cx + cw / 2;
        const v = iy * cy + ch / 2;
        const key = manualRegionsActive ? `${rid}|${cid}` : `0|${cid}`;
        let s = stat.get(key);
        if (!s) {
          s = { cid, rid: manualRegionsActive ? rid : 0, sumU: 0, sumV: 0, count: 0, ridCounts: {} };
          stat.set(key, s);
        }
        s.sumU += u;
        s.sumV += v;
        s.count++;
        if (!manualRegionsActive) s.ridCounts[String(rid)] = (s.ridCounts[String(rid)] | 0) + 1;
      }
    }
    const existing = new Set((Array.isArray(st.flowEditPoints) ? st.flowEditPoints : []).map(p => `${p.rid}|${p.cid}`));
    for (const s of stat.values()) {
      if (!s || !(s.count > 0)) continue;
      let rid = Math.max(0, Math.round(Number(s.rid) || 0));
      if (!manualRegionsActive) {
        let best = -1;
        for (const [rk, rv] of Object.entries(s.ridCounts || {})) {
          const count = rv | 0;
          const id = Math.max(0, Math.round(Number(rk) || 0));
          if (count > best) { best = count; rid = id; }
        }
      }
      const cid = Math.max(0, Math.round(Number(s.cid) || 0));
      const key = `${rid}|${cid}`;
      if (existing.has(key)) continue;
      const cfg = typeof getFlowRegionConfig === "function" ? getFlowRegionConfig(r, rid) : null;
      const manualOrder = Array.isArray(cfg && cfg.manualOrder) ? cfg.manualOrder.map(v => Math.max(0, Math.round(Number(v) || 0))) : [];
      const manualIndex = manualOrder.indexOf(cid);
      const u = s.sumU / s.count;
      const v = s.sumV / s.count;
      const wp = rectUVToWorld(r, u, v);
      st.flowEditPoints.push({
        rectId: r.id,
        rid,
        index: 100000 + st.flowEditPoints.length,
        cid,
        u,
        v,
        x: wp.x,
        y: wp.y,
        manualIndex,
        manualActive: manualIndex >= 0,
        manualMode: true
      });
      existing.add(key);
    }
  };

  return {
    getSplitFlowMarkerOffset,
    getSplitFlowMarkerWorldPositions,
    collectFlowLinkAnchors,
    collectFlowEditPoints,
    collectFlowManualPickPoints
  };
}
