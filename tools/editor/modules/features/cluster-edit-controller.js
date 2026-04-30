import { drawCanvasUiButton } from "../render/canvas-ui.js";

export function setupClusterEditController(deps = {}) {
  const {
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
    fontFamilyCss,
    toLetters
  } = deps;

  const collectClusterHandles = (r, clusters, cx, cy) => {
    st.clusterHandles = [];
    if (!r || !Array.isArray(clusters) || !clusters.length) return;
    const canExpandDir = (z, dir) => {
      const cand = { ...z };
      if (dir === "left") cand.c0--;
      else if (dir === "right") cand.c1++;
      else if (dir === "up") cand.r0--;
      else if (dir === "down") cand.r1++;
      else return false;
      return clusterCanPlace(r, cand, z.id);
    };
    const canShrinkDir = (z, dir) => !!findShrinkCandidate(r, z, dir);
    for (const z of clusters) {
      const c0 = Math.max(0, Math.round(Number(z && z.c0) || 0));
      const c1 = Math.max(c0 + 1, Math.round(Number(z && z.c1) || 0));
      const r0 = Math.max(0, Math.round(Number(z && z.r0) || 0));
      const r1 = Math.max(r0 + 1, Math.round(Number(z && z.r1) || 0));
      const u0 = c0 * cx;
      const u1 = Math.min(r.width, c1 * cx);
      const v0 = r0 * cy;
      const v1 = Math.min(r.height, r1 * cy);
      const uc = (u0 + u1) / 2;
      const vc = (v0 + v1) / 2;
      const outOff = 18;
      const inOff = 12;
      const pts = [
        { action: "expand", dir: "left", label: "◀", u: u0 - outOff, v: vc },
        { action: "expand", dir: "right", label: "▶", u: u1 + outOff, v: vc },
        { action: "expand", dir: "up", label: "▲", u: uc, v: v0 - outOff },
        { action: "expand", dir: "down", label: "▼", u: uc, v: v1 + outOff },
        { action: "shrink", dir: "left", label: "▶", u: u0 + inOff, v: vc },
        { action: "shrink", dir: "right", label: "◀", u: u1 - inOff, v: vc },
        { action: "shrink", dir: "up", label: "▼", u: uc, v: v0 + inOff },
        { action: "shrink", dir: "down", label: "▲", u: uc, v: v1 - inOff }
      ];
      for (const p of pts) {
        if (p.action === "expand" && !canExpandDir(z, p.dir)) continue;
        if (p.action === "shrink" && !canShrinkDir(z, p.dir)) continue;
        const wp = rectUVToWorld(r, p.u, p.v);
        st.clusterHandles.push({
          id: Math.max(1, Math.round(Number(z.id) || 1)),
          action: p.action,
          dir: p.dir,
          label: p.label,
          u: p.u,
          v: p.v,
          x: wp.x,
          y: wp.y
        });
      }
    }
  };

  const findClusterHandle = (wx, wy) => {
    const pts = Array.isArray(st.clusterHandles) ? st.clusterHandles : [];
    const maxDist = Math.max(10, 18 / Math.max(0.2, st.zoom || 1));
    let best = null;
    let bestD = Infinity;
    for (const p of pts) {
      const d = Math.hypot((+p.x || 0) - wx, (+p.y || 0) - wy);
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    if (best && bestD <= maxDist) return best;
    return null;
  };

  const findClusterStartMarker = (r, wx, wy) => {
    if (!r) return null;
    const clusters = getManualClusters(r);
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const maxDist = Math.max(10, 20 / Math.max(0.2, st.zoom || 1));
    let best = null;
    let bestD = Infinity;
    for (const z of clusters) {
      const sx = Math.max(0, Math.round(Number(z && z.sx) || 0));
      const sy = Math.max(0, Math.round(Number(z && z.sy) || 0));
      const su = sx * cx + Math.min(cx, Math.max(1, r.width - sx * cx)) / 2;
      const sv = sy * cy + Math.min(cy, Math.max(1, r.height - sy * cy)) / 2;
      const wp = rectUVToWorld(r, su, sv);
      const d = Math.hypot((+wp.x || 0) - wx, (+wp.y || 0) - wy);
      if (d < bestD) {
        bestD = d;
        best = { id: Math.max(1, Math.round(Number(z.id) || 1)), x: wp.x, y: wp.y };
      }
    }
    if (best && bestD <= maxDist) return best;
    return null;
  };

  const findActiveClusterBorder = (r, wx, wy) => {
    if (!r) return null;
    const aid = Math.max(1, Math.round(Number(st.clusterActiveId) || 0));
    if (!aid) return null;
    const z = findManualClusterById(r, aid);
    if (!z) return null;
    const cx = drawCellX(r);
    const cy = drawCellY(r);
    const tol = Math.max(8, 14 / Math.max(0.2, st.zoom || 1));
    const p = worldToRectUV(r, wx, wy);
    const u0 = z.c0 * cx, u1 = z.c1 * cx, v0 = z.r0 * cy, v1 = z.r1 * cy;
    const inV = (p.v >= v0 - tol && p.v <= v1 + tol);
    const inU = (p.u >= u0 - tol && p.u <= u1 + tol);
    const cand = [];
    if (inV) cand.push({ dir: "left", d: Math.abs(p.u - u0), id: aid });
    if (inV) cand.push({ dir: "right", d: Math.abs(p.u - u1), id: aid });
    if (inU) cand.push({ dir: "up", d: Math.abs(p.v - v0), id: aid });
    if (inU) cand.push({ dir: "down", d: Math.abs(p.v - v1), id: aid });
    cand.sort((a, b) => a.d - b.d);
    if (cand.length && cand[0].d <= tol) return cand[0];
    return null;
  };

  const updateClusterEditCursor = () => {
    if (!cv) return;
    if (!isClusterEditMode()) {
      cv.style.cursor = "";
      return;
    }
    const h = st.clusterHandleHover;
    if (h) {
      const dir = String(h.dir || "");
      cv.style.cursor = (dir === "left" || dir === "right") ? "ew-resize" : "ns-resize";
      return;
    }
    const b = st.clusterBorderHover;
    if (b) {
      const dir = String(b.dir || "");
      cv.style.cursor = (dir === "left" || dir === "right") ? "ew-resize" : "ns-resize";
      return;
    }
    if (st.clusterStartHover) {
      cv.style.cursor = "pointer";
      return;
    }
    cv.style.cursor = "";
  };

  const drawClusterEditOverlay = (c, r, w, h, cx, cy) => {
    if (!isClusterEditMode()) return;
    const clusters = getManualClusters(r);
    const aid = Number(st.clusterActiveId);
    c.save();
    if (st.clusterCellHover && Math.round(Number(st.clusterCellHover.rectId) || 0) === Math.round(Number(r.id) || 0)) {
      const hc = Math.max(0, Math.round(Number(st.clusterCellHover.col) || 0));
      const hr = Math.max(0, Math.round(Number(st.clusterCellHover.row) || 0));
      const hx = -w / 2 + hc * cx;
      const hy = -h / 2 + hr * cy;
      const hw = Math.min(cx, Math.max(1, r.width - hc * cx));
      const hh = Math.min(cy, Math.max(1, r.height - hr * cy));
      c.fillStyle = "rgba(255,255,255,.16)";
      c.strokeStyle = "rgba(255,255,255,.65)";
      c.lineWidth = 1.2;
      c.fillRect(hx, hy, hw, hh);
      c.strokeRect(hx, hy, hw, hh);
    }
    if (!clusters.length) {
      st.clusterHandles = [];
      c.restore();
      return;
    }
    for (const z of clusters) {
      const x = -w / 2 + z.c0 * cx;
      const y = -h / 2 + z.r0 * cy;
      const ww = Math.max(1, (z.c1 - z.c0) * cx);
      const hh = Math.max(1, (z.r1 - z.r0) * cy);
      const isActive = (Number.isFinite(aid) && Math.round(aid) === Math.round(Number(z.id) || 0));
      c.strokeStyle = isActive ? "rgba(255,193,7,.98)" : "rgba(13,202,240,.9)";
      c.fillStyle = isActive ? "rgba(255,193,7,.13)" : "rgba(13,202,240,.08)";
      c.lineWidth = isActive ? 2.2 : 1.4;
      c.fillRect(x, y, ww, hh);
      c.strokeRect(x, y, ww, hh);
      const sx = Math.max(0, Math.round(Number(z.sx) || 0));
      const sy = Math.max(0, Math.round(Number(z.sy) || 0));
      const su = sx * cx + Math.min(cx, Math.max(1, r.width - sx * cx)) / 2;
      const sv = sy * cy + Math.min(cy, Math.max(1, r.height - sy * cy)) / 2;
      const spx = -w / 2 + su;
      const spy = -h / 2 + sv;
      const regionLabelSize = 50.4;
      const regionLabelHalf = regionLabelSize / 2;
      c.fillStyle = "#fff";
      c.strokeStyle = isActive ? "rgba(255,153,0,.98)" : "rgba(0,0,0,.78)";
      c.lineWidth = isActive ? 2.4 : 2;
      c.fillRect(spx - regionLabelHalf, spy - regionLabelHalf, regionLabelSize, regionLabelSize);
      c.strokeRect(spx - regionLabelHalf, spy - regionLabelHalf, regionLabelSize, regionLabelSize);
      c.fillStyle = "#000";
      c.font = `700 30px ${fontFamilyCss(st.fontFamily)}`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText(String(toLetters(Math.max(0, Math.round(Number(z.id) || 1) - 1))), spx, spy + 0.6);
    }
    const activeClusters = clusters.filter(z => Math.round(Number(z.id) || 0) === Math.round(Number(st.clusterActiveId) || 0));
    if (activeClusters.length) {
      collectClusterHandles(r, activeClusters, cx, cy);
      for (const hnd of st.clusterHandles) {
        const x = -w / 2 + (+hnd.u || 0);
        const y = -h / 2 + (+hnd.v || 0);
        const hover = !!(
          st.clusterHandleHover
          && Math.round(Number(st.clusterHandleHover.id) || 0) === Math.round(Number(hnd.id) || 0)
          && st.clusterHandleHover.dir === hnd.dir
          && String(st.clusterHandleHover.action || "expand") === String(hnd.action || "expand")
        );
        const isShrink = String(hnd.action || "expand") === "shrink";
        drawCanvasUiButton(c, { x: x - 8, y: y - 8, size: 16, z: 1, active: hover, hover, danger: hover && isShrink, success: hover && !isShrink, icon: "" });
        c.fillStyle = "#fff";
        c.font = `700 9px ${fontFamilyCss(st.fontFamily)}`;
        c.textAlign = "center";
        c.textBaseline = "middle";
        c.fillText(String(hnd.label || ""), x, y + 0.2);
      }
    } else {
      st.clusterHandles = [];
    }
    c.restore();
  };

  return {
    collectClusterHandles,
    findClusterHandle,
    findClusterStartMarker,
    findActiveClusterBorder,
    updateClusterEditCursor,
    drawClusterEditOverlay
  };
}
