export const buildVisibleComponentStats = (r, cx, cy, topo, hs, maskCellKey) => {
  if (!r || !topo || typeof maskCellKey !== "function") return null;
  const cols = Math.max(1, Math.round(Number(topo && topo.cols) || 1));
  const rows = Math.max(1, Math.round(Number(topo && topo.rows) || 1));
  const comp = Array.isArray(topo && topo.comp) ? topo.comp : [];
  if (!comp.length) {
    return {
      cols,
      rows,
      colPref: [0],
      rowPref: [0],
      visibleAreaPx: 0,
      compStats: new Map()
    };
  }

  const colPref = [0];
  const rowPref = [0];
  for (let x = 0; x < cols; x++) colPref.push(colPref[x] + Math.min(cx, Math.max(0, r.width - x * cx)));
  for (let y = 0; y < rows; y++) rowPref.push(rowPref[y] + Math.min(cy, Math.max(0, r.height - y * cy)));

  const compStats = new Map();
  let visibleAreaPx = 0;
  for (let iy = 0; iy < rows; iy++) {
    for (let ix = 0; ix < cols; ix++) {
      if (hs && hs.has(maskCellKey(ix, iy))) continue;
      const idx = iy * cols + ix;
      const cid = Math.max(0, Math.round(Number(comp[idx]) || 0));
      const cw = Math.min(cx, Math.max(0, r.width - ix * cx));
      const ch = Math.min(cy, Math.max(0, r.height - iy * cy));
      if (!(cw > 0 && ch > 0)) continue;
      visibleAreaPx += cw * ch;
      let it = compStats.get(cid);
      if (!it) {
        it = { c0: ix, c1: ix + 1, r0: iy, r1: iy + 1, cells: 1 };
        compStats.set(cid, it);
      } else {
        if (ix < it.c0) it.c0 = ix;
        if (ix + 1 > it.c1) it.c1 = ix + 1;
        if (iy < it.r0) it.r0 = iy;
        if (iy + 1 > it.r1) it.r1 = iy + 1;
        it.cells += 1;
      }
    }
  }

  return {
    cols,
    rows,
    colPref,
    rowPref,
    visibleAreaPx,
    compStats
  };
};
