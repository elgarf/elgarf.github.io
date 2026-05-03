import { DATA_FLOW_MODES, FLOW_DIR_SET, RIG_DEFAULT_LOAD_KG } from "./constants.js";

const normalizeNumericKeyedMap = (raw, normalizeValue) => {
  const src = (raw && typeof raw === "object") ? raw : {};
  const out = {};
  for (const [k, v] of Object.entries(src)) {
    const key = String(Math.max(0, Math.round(Number(k) || 0)));
    const val = normalizeValue(v);
    if (val == null) continue;
    out[key] = val;
  }
  return out;
};

export const normalizeSaveLocationId = v => {
  const raw = String(v || "").trim();
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 64);
  return clean || "ledmask-default";
};

export const normalizeHiddenCells = v => {
  if (!Array.isArray(v)) return [];
  const out = [];
  const seen = new Set();
  for (const it of v) {
    const s = String(it || "").trim();
    if (!/^\d+,\d+$/.test(s)) continue;
    if (seen.has(s)) continue;
    seen.add(s);
    out.push(s);
  }
  return out;
};

export const normalizeManualClusters = raw => {
  if (!Array.isArray(raw)) return [];
  const out = [];
  const seen = new Set();
  for (const it of raw) {
    if (!it || typeof it !== "object") continue;
    const sx = Math.max(0, Math.round(Number(it.sx) || 0));
    const sy = Math.max(0, Math.round(Number(it.sy) || 0));
    const c0 = Math.max(0, Math.round(Number(it.c0) || 0));
    const c1 = Math.max(c0 + 1, Math.round(Number(it.c1) || 0));
    const r0 = Math.max(0, Math.round(Number(it.r0) || 0));
    const r1 = Math.max(r0 + 1, Math.round(Number(it.r1) || 0));
    const id = Math.max(1, Math.round(Number(it.id) || 0) || out.length + 1);
    const key = `${id}|${sx}|${sy}|${c0}|${c1}|${r0}|${r1}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ id, sx, sy, c0, c1, r0, r1 });
  }
  return out;
};

export const normalizeCabinetStyles = raw => {
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
};

export const normalizeRigData = raw => {
  const out = { frames: [], loads: {}, suspends: [], suspendLinks: [] };
  const src = (raw && typeof raw === "object") ? raw : {};
  const frameSeen = new Set();
  for (const it of Array.isArray(src.frames) ? src.frames : []) {
    const p = String(it || "").split(",");
    if (p.length !== 2) continue;
    const c = Math.max(1, Math.round(Number(p[0]) || 0));
    const row = Math.max(0, Math.round(Number(p[1]) || 0));
    const k = `${c},${row}`;
    if (frameSeen.has(k)) continue;
    frameSeen.add(k);
    out.frames.push(k);
  }
  out.frames.sort((a, b) => {
    const pa = a.split(",").map(Number);
    const pb = b.split(",").map(Number);
    return pa[1] - pb[1] || pa[0] - pb[0];
  });

  const loadEntries = src.loads && typeof src.loads === "object" ? Object.entries(src.loads) : [];
  for (const [key, val] of loadEntries) {
    const p = String(key || "").split(",");
    if (p.length !== 2) continue;
    const c = Math.max(1, Math.round(Number(p[0]) || 0));
    const row = Math.max(0, Math.round(Number(p[1]) || 0));
    const kg = Math.max(0, Math.round(Number(val) || 0));
    if (!kg) continue;
    out.loads[`${c},${row}`] = Math.max(5, Math.round(kg / 5) * 5);
  }

  const suspSeen = new Set();
  for (const it of Array.isArray(src.suspends) ? src.suspends : []) {
    const c = Math.max(0, Math.round(Number(it) || 0));
    if (suspSeen.has(c)) continue;
    suspSeen.add(c);
    out.suspends.push(c);
  }
  out.suspends.sort((a, b) => a - b);

  const linkSeen = new Set();
  for (const it of Array.isArray(src.suspendLinks) ? src.suspendLinks : []) {
    const p = String(it || "").split("-");
    if (p.length !== 2) continue;
    let a = Math.max(0, Math.round(Number(p[0]) || 0));
    let b = Math.max(0, Math.round(Number(p[1]) || 0));
    if (a === b) continue;
    if (a > b) { const t = a; a = b; b = t; }
    if (Math.abs(a - b) !== 1) continue;
    const k = `${a}-${b}`;
    if (linkSeen.has(k)) continue;
    linkSeen.add(k);
    out.suspendLinks.push(k);
  }
  out.suspendLinks.sort((a, b) => {
    const pa = a.split("-").map(Number);
    const pb = b.split("-").map(Number);
    return pa[0] - pb[0] || pa[1] - pb[1];
  });

  // Backward compatibility: keep default only when old data omitted loads explicitly.
  if (!Object.keys(out.loads).length && src.defaultLoadKg != null) {
    const kg = Math.max(5, Math.round(Math.max(0, Number(src.defaultLoadKg) || 0) / 5) * 5) || RIG_DEFAULT_LOAD_KG;
    out.defaultLoadKg = kg;
  }
  return out;
};

export const normalizeDataFlow = v => {
  const s = String(v || "");
  if (s === "snake" || s === "zsnake" || s === "d_tl_br" || s === "d_tr_bl" || s === "d_bl_tr" || s === "d_br_tl") return "h_bl_lr";
  return DATA_FLOW_MODES.has(s) ? s : "none";
};

export const normalizeDataFlowZ = (flow, z) => String(flow || "") === "zsnake" || !!z;

export const normalizeFlowLocks = raw => {
  if (!raw || typeof raw !== "object") return {};
  const out = {};
  for (const [rk, val] of Object.entries(raw)) {
    const rid = Math.max(0, Math.round(Number(rk) || 0));
    let locksSrc = [];
    let startCid = null;
    let startDir = "";
    let mode = "";
    let startPinned = false;
    let manual = false;
    let manualOrderSrc = [];
    if (Array.isArray(val)) {
      locksSrc = val;
    } else if (val && typeof val === "object") {
      locksSrc = Array.isArray(val.locks) ? val.locks : [];
      manual = !!val.manual;
      manualOrderSrc = Array.isArray(val.manualOrder) ? val.manualOrder : [];
      if (val.startCid !== null && val.startCid !== undefined && String(val.startCid) !== "") {
        const parsedStartCid = Number(val.startCid);
        if (Number.isFinite(parsedStartCid)) startCid = Math.max(0, Math.round(parsedStartCid || 0));
      }
      const d = String(val.startDir || "").toLowerCase();
      if (FLOW_DIR_SET.has(d)) startDir = d;
      startPinned = !!val.startPinned;
      const m = String(val.mode || "");
      if (DATA_FLOW_MODES.has(m) && m !== "none") mode = m;
    }
    const manualOrder = [];
    const seenManual = new Set();
    for (const rawCid of manualOrderSrc) {
      const cid = Math.max(0, Math.round(Number(rawCid) || 0));
      if (seenManual.has(cid)) continue;
      seenManual.add(cid);
      manualOrder.push(cid);
    }
    const norm = [];
    const seen = new Set();
    for (const it of locksSrc) {
      const index = Math.max(0, Math.round(Number(it && it.index) || 0));
      const cid = Math.max(0, Math.round(Number(it && it.cid) || 0));
      const key = `${index}:${cid}`;
      if (seen.has(key)) continue;
      seen.add(key);
      norm.push({ index, cid });
    }
    norm.sort((a, b) => a.index - b.index);
    if (!norm.length && startCid == null && !startDir && !mode && !manual && !manualOrder.length) continue;
    if (startCid != null && startPinned !== true && FLOW_DIR_SET.has(startDir)) startPinned = true;
    out[String(rid)] = { locks: norm, startCid, startDir, mode, startPinned: !!startPinned, manual: !!manual, manualOrder };
  }
  return out;
};

export const normalizeFlowLockRidToSigMap = raw => {
  return normalizeNumericKeyedMap(raw, v => {
    const sig = String(v || "").trim();
    return sig || null;
  });
};

export const normalizeFlowLockCidToSeedMap = raw => {
  return normalizeNumericKeyedMap(raw, v => {
    const s = String(v || "").trim();
    return /^\d+,\d+$/.test(s) ? s : null;
  });
};

export const normalizeFlowLinks = raw => {
  const out = [];
  const seen = new Set();
  const list = Array.isArray(raw) ? raw : [];
  const clamp = (v, lo, hi, fb) => {
    const n = Number(v);
    if (!Number.isFinite(n)) return fb;
    return Math.max(lo, Math.min(hi, n));
  };
  const normColorMode = v => String(v || "").toLowerCase() === "custom" ? "custom" : "auto";
  const normLineType = v => String(v || "").toLowerCase() === "dashed" ? "dashed" : "solid";
  const normHex = v => {
    const s = String(v || "").trim();
    return /^#[0-9a-f]{6}$/i.test(s) ? s.toLowerCase() : null;
  };
  const normControlOffsets = (arr, count) => {
    const need = Math.max(0, Math.round(Number(count) || 2) - 2);
    const src = Array.isArray(arr) ? arr : [];
    const outArr = [];
    for (let i = 0; i < need; i++) {
      const it = src[i] && typeof src[i] === "object" ? src[i] : null;
      const x = Number(it && it.x);
      const y = Number(it && it.y);
      outArr.push({ x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 });
    }
    return outArr;
  };
  const normBendOffsets = (arr, count) => {
    const need = Math.max(1, Math.round(Number(count) || 2) - 1);
    const src = Array.isArray(arr) ? arr : [];
    const outArr = [];
    for (let i = 0; i < need; i++) {
      const it = src[i] && typeof src[i] === "object" ? src[i] : null;
      const x = Number(it && it.x);
      const y = Number(it && it.y);
      outArr.push({ x: Number.isFinite(x) ? x : 0, y: Number.isFinite(y) ? y : 0 });
    }
    return outArr;
  };
  const normSegmentBezierRel = (arr, count) => {
    const need = Math.max(1, Math.round(Number(count) || 2) - 1);
    const src = Array.isArray(arr) ? arr : [];
    const outArr = [];
    for (let i = 0; i < need; i++) {
      const it = src[i] && typeof src[i] === "object" ? src[i] : null;
      const c1 = it && it.c1 && typeof it.c1 === "object" ? it.c1 : null;
      const c2 = it && it.c2 && typeof it.c2 === "object" ? it.c2 : null;
      const c1x = Number(c1 && c1.x);
      const c1y = Number(c1 && c1.y);
      const c2x = Number(c2 && c2.x);
      const c2y = Number(c2 && c2.y);
      outArr.push({
        c1: { x: Number.isFinite(c1x) ? c1x : 0, y: Number.isFinite(c1y) ? c1y : 0 },
        c2: { x: Number.isFinite(c2x) ? c2x : 0, y: Number.isFinite(c2y) ? c2y : 0 }
      });
    }
    return outArr;
  };
  const mkEnd = e => ({
    rectId: Math.max(1, Math.round(Number(e && e.rectId) || 0)),
    rid: Math.max(0, Math.round(Number(e && e.rid) || 0)),
    cid: Math.max(0, Math.round(Number(e && e.cid) || 0)),
    kind: String(e && e.kind || "").toLowerCase() === "end" ? "end" : "start"
  });
  const mkManualBezier = v => {
    if (!v || typeof v !== "object") return null;
    const c1 = v.c1 && typeof v.c1 === "object" ? v.c1 : null;
    const c2 = v.c2 && typeof v.c2 === "object" ? v.c2 : null;
    const x1 = Number(c1 && c1.x);
    const y1 = Number(c1 && c1.y);
    const x2 = Number(c2 && c2.x);
    const y2 = Number(c2 && c2.y);
    if (!(Number.isFinite(x1) && Number.isFinite(y1) && Number.isFinite(x2) && Number.isFinite(y2))) return null;
    return { c1: { x: x1, y: y1 }, c2: { x: x2, y: y2 } };
  };
  const mkManualBezierRel = v => {
    if (!v || typeof v !== "object") return null;
    const c1 = v.c1 && typeof v.c1 === "object" ? v.c1 : null;
    const c2 = v.c2 && typeof v.c2 === "object" ? v.c2 : null;
    const x1 = Number(c1 && c1.x);
    const y1 = Number(c1 && c1.y);
    const x2 = Number(c2 && c2.x);
    const y2 = Number(c2 && c2.y);
    if (!(Number.isFinite(x1) && Number.isFinite(y1) && Number.isFinite(x2) && Number.isFinite(y2))) return null;
    return { c1: { x: x1, y: y1 }, c2: { x: x2, y: y2 } };
  };
  for (const it of list) {
    if (!it || typeof it !== "object") continue;
    const from = it.from && typeof it.from === "object" ? it.from : null;
    const to = it.to && typeof it.to === "object" ? it.to : null;
    if (!from || !to) continue;
    const a = mkEnd(from);
    const b = mkEnd(to);
    if (!a.rectId || !b.rectId) continue;
    if (a.rectId === b.rectId) continue;
    if (a.kind !== "end" || b.kind !== "start") continue;
    const key = `${a.rectId}:${a.rid}:${a.cid}:${a.kind}>${b.rectId}:${b.rid}:${b.cid}:${b.kind}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const manualBezier = mkManualBezier(it.manualBezier);
    const manualBezierRel = mkManualBezierRel(it.manualBezierRel);
    const controlPointCount = Math.round(clamp(it.controlPointCount, 2, 4, 2));
    const controlOffsets = normControlOffsets(it.controlOffsets, controlPointCount);
    const hasBendOffsets = Array.isArray(it.bendOffsets);
    const bendOffsets = hasBendOffsets ? normBendOffsets(it.bendOffsets, controlPointCount) : null;
    const hasSegmentBezierRel = Array.isArray(it.segmentBezierRel);
    const segmentBezierRel = hasSegmentBezierRel ? normSegmentBezierRel(it.segmentBezierRel, controlPointCount) : null;
    const colorMode = normColorMode(it.colorMode);
    const lineType = normLineType(it.lineType);
    const color = normHex(it.color);
    const width = clamp(it.width, 0.5, 20, 2.2);
    const rec = { from: a, to: b };
    if (manualBezier) rec.manualBezier = manualBezier;
    if (manualBezierRel) rec.manualBezierRel = manualBezierRel;
    rec.controlPointCount = controlPointCount;
    rec.controlOffsets = controlOffsets;
    if (bendOffsets) rec.bendOffsets = bendOffsets;
    if (segmentBezierRel) rec.segmentBezierRel = segmentBezierRel;
    rec.colorMode = colorMode;
    rec.lineType = lineType;
    if (color) rec.color = color;
    rec.width = width;
    out.push(rec);
  }
  return out;
};

export const normalizeThemeMode = v => ({ light: 1, dark: 1, auto: 1 }[v] ? v : "auto");
export const normalizeViewMode = v => {
  const mode = String(v || "");
  if (mode === "install") return "install";
  if (mode === "spec") return "spec";
  return "art";
};
export const normalizeCabinetUnit = v => (v === "m" ? "m" : "px");
