export const setupPropsUiUtils = (deps = {}) => {
  const {
    st,
    cur,
    normalizeCabinetUnit,
    mFmt,
    toPositiveInt,
    evalExpr
  } = deps;

  const uiSetValue = (node, v) => { if (!node) return; const s = String(v ?? ""); if (node.value !== s) node.value = s; };
  const uiSetChecked = (node, v) => { if (!node) return; const n = !!v; if (node.checked !== n) node.checked = n; };
  const uiSetDisabled = (node, v) => { if (!node) return; const n = !!v; if (node.disabled !== n) node.disabled = n; };
  const uiSetText = (node, v) => { if (!node) return; const s = String(v ?? ""); if (node.textContent !== s) node.textContent = s; };

  const getCabinetUnitScale = r => Math.max(1, Math.round(Number((r && r.scale) || (cur() && cur().scale) || st.globalScale || 256) || 256));
  const cabinetPxToUi = (px, unit, r) => {
    const v = Math.max(1, Math.round(Number(px) || 0));
    if (normalizeCabinetUnit(unit) === "m") return mFmt(v / getCabinetUnitScale(r));
    return String(v);
  };
  const cabinetUiToPx = (inputValue, unit, fallbackPx, r) => {
    const fb = Math.max(1, Math.round(Number(fallbackPx) || 128));
    if (normalizeCabinetUnit(unit) === "m") {
      const s = getCabinetUnitScale(r);
      const fallbackM = fb / s;
      const m = Math.max(0.001, evalExpr(inputValue, fallbackM));
      return toPositiveInt(Math.round(m * s), fb);
    }
    return toPositiveInt(evalExpr(inputValue, fb), fb);
  };

  return {
    uiSetValue,
    uiSetChecked,
    uiSetDisabled,
    uiSetText,
    getCabinetUnitScale,
    cabinetPxToUi,
    cabinetUiToPx
  };
};
