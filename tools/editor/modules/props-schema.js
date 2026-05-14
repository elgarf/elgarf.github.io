export const createRectPropSchema = (deps = {}) => {
  const evalExpr = deps.evalExpr || ((v, fb) => (Number(v) || fb));
  const parseAreaM2PxInput = deps.parseAreaM2PxInput || ((v, fb) => (Number(v) || fb));
  const cabinetUiToPx = deps.cabinetUiToPx || ((v, _unit, fb) => (Number(v) || fb));
  const normalizeDataFlow = deps.normalizeDataFlow || (v => String(v || "none"));
  const parseAreaDims = value => {
    const s = String(value ?? "").trim();
    const m = s.match(/^\s*(\d+(?:[.,]\d+)?)\s*[xх×*]\s*(\d+(?:[.,]\d+)?)\s*$/i);
    if (!m) return null;
    const w = Number(String(m[1]).replace(",", "."));
    const h = Number(String(m[2]).replace(",", "."));
    if (!(w > 0 && h > 0)) return null;
    return { w, h };
  };

  return Object.freeze([
    {
      id: "name",
      sync: ({ el, rect }) => { if (el.name) el.name.value = String(rect && rect.name || ""); },
      apply: ({ el, rect, multi }) => { if (!multi && el.name) rect.name = el.name.value || `Rect ${rect.id}`; }
    },
    {
      id: "x",
      sync: ({ el, rect }) => { if (el.x) el.x.value = String(Math.round(Number(rect && rect.x) || 0)); },
      apply: ({ el, rect, multi }) => { if (!multi && el.x) rect.x = Math.round(evalExpr(el.x.value, rect.x)); }
    },
    {
      id: "y",
      sync: ({ el, rect }) => { if (el.y) el.y.value = String(Math.round(Number(rect && rect.y) || 0)); },
      apply: ({ el, rect, multi }) => { if (!multi && el.y) rect.y = Math.round(evalExpr(el.y.value, rect.y)); }
    },
    {
      id: "rotation",
      sync: ({ el, rect }) => { if (el.rot) el.rot.value = String(Number(rect && rect.rotation) || 0); },
      apply: ({ el, rect, multi }) => { if (!multi && el.rot) rect.rotation = evalExpr(el.rot.value, rect.rotation || 0); }
    },
    {
      id: "widthM",
      sync: ({ el, rect, mFmt }) => { if (el.wm) el.wm.value = mFmt(rect && rect.widthM || 1); },
      apply: ({ el, rect, multi }) => { if (!multi && el.wm) rect.widthM = Math.max(0.001, evalExpr(el.wm.value, rect.widthM || 0.001)); }
    },
    {
      id: "heightM",
      sync: ({ el, rect, mFmt }) => { if (el.hm) el.hm.value = mFmt(rect && rect.heightM || 1); },
      apply: ({ el, rect, multi }) => { if (!multi && el.hm) rect.heightM = Math.max(0.001, evalExpr(el.hm.value, rect.heightM || 0.001)); }
    },
    {
      id: "areaM2Px",
      sync: ({ el, rect, mFmt }) => {
        const expr = String(rect && rect._areaM2Expression || "").trim();
        const dims = parseAreaDims(expr);
        if (el.areaM2Width) el.areaM2Width.value = dims ? mFmt(dims.w) : mFmt(Math.sqrt(Math.max(1, Number(rect && rect.areaM2Px) || 65536)));
        if (el.areaM2Height) el.areaM2Height.value = dims ? mFmt(dims.h) : mFmt(Math.sqrt(Math.max(1, Number(rect && rect.areaM2Px) || 65536)));
        if (el.areaM2) el.areaM2.value = `${el.areaM2Width && el.areaM2Width.value || "256"}×${el.areaM2Height && el.areaM2Height.value || "256"}`;
      },
      apply: ({ el, rect }) => {
        if (el.areaM2Width && el.areaM2Height) {
          rect.areaM2Px = parseAreaM2PxInput(`${el.areaM2Width.value}×${el.areaM2Height.value}`, rect.areaM2Px || 65536);
          if (el.areaM2) el.areaM2.value = `${el.areaM2Width.value}×${el.areaM2Height.value}`;
          return;
        }
        if (el.areaM2) rect.areaM2Px = parseAreaM2PxInput(el.areaM2.value, rect.areaM2Px || 65536);
      }
    },
    {
      id: "dataFlow",
      sync: ({ el, rect }) => { if (el.dataFlow) el.dataFlow.value = normalizeDataFlow(rect && rect.dataFlow || "none"); },
      apply: ({ el, rect }) => { if (el.dataFlow) rect.dataFlow = normalizeDataFlow(el.dataFlow.value); }
    },
    {
      id: "dataFlowZ",
      sync: ({ el, rect }) => { if (el.dataFlowZ) el.dataFlowZ.checked = !!(rect && rect.dataFlowZ); },
      apply: ({ el, rect }) => { if (el.dataFlowZ) rect.dataFlowZ = !!el.dataFlowZ.checked; }
    },
    {
      id: "numberCells",
      sync: ({ el, rect }) => { if (el.numCells) el.numCells.checked = !!(rect && rect.numberCells); },
      apply: ({ el, rect }) => { if (el.numCells) rect.numberCells = !!el.numCells.checked; }
    },
    {
      id: "cellX",
      sync: ({ el, rect, cabinetPxToUi, unit }) => { if (el.cx) el.cx.value = cabinetPxToUi(rect && rect.cellX, unit, rect); },
      apply: ({ el, rect, unit }) => { if (el.cx) rect.cellX = cabinetUiToPx(el.cx.value, unit, rect.cellX || 128, rect); }
    },
    {
      id: "cellY",
      sync: ({ el, rect, cabinetPxToUi, unit }) => { if (el.cy) el.cy.value = cabinetPxToUi(rect && rect.cellY, unit, rect); },
      apply: ({ el, rect, unit }) => { if (el.cy) rect.cellY = cabinetUiToPx(el.cy.value, unit, rect.cellY || 128, rect); }
    }
  ]);
};
