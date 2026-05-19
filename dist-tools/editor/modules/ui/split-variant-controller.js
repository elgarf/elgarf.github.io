/* build:1779222473 */
export const setupSplitVariantController = (deps = {}) => {
  const { el, SPLIT_VARIANT_MAX, evalExpr, bindEvent, render, getCurrentRect } = deps;

  const updateSplitVariantLabel = r => {
    if (!el || !el.splitVariantLabel) return;
    const v = Math.max(0, Math.min(Math.max(0, SPLIT_VARIANT_MAX - 1), Math.round(Number(r && r.splitVariant) || 0)));
    el.splitVariantLabel.textContent = String(v);
    el.splitVariantLabel.title = `Номер разбиения: ${v}`;
  };

  const updateSplitVariantModeUi = r => {
    const manual = !!(r && Array.isArray(r.manualClusters) && r.manualClusters.length > 0);
    if (el && el.splitVariantControl) el.splitVariantControl.classList.toggle("d-none", manual);
    if (el && el.splitVariantManualBadge) el.splitVariantManualBadge.classList.toggle("d-none", !manual);
  };

  const updateSplitVariantControl = r => {
    updateSplitVariantModeUi(r);
    if (!el || !el.splitVariant) return;
    const rawCnt = Number(r && r._splitVariantCount);
    const hasCnt = Number.isFinite(rawCnt) && rawCnt > 0;
    const cnt = hasCnt ? Math.max(1, Math.round(rawCnt)) : SPLIT_VARIANT_MAX;
    const maxv = Math.max(0, Math.min(Math.max(0, SPLIT_VARIANT_MAX - 1), cnt - 1));
    el.splitVariant.max = String(maxv);
    const cur = Math.max(0, Math.min(maxv, Math.round(Number(r && r.splitVariant) || 0)));
    el.splitVariant.value = String(cur);
    if (r && hasCnt) r.splitVariant = cur;
    if (el.splitVariantDec) el.splitVariantDec.disabled = !r || cur <= 0;
    if (el.splitVariantInc) el.splitVariantInc.disabled = !r || cur >= maxv;
    updateSplitVariantLabel(r);
  };

  const bindSplitVariantHandlers = () => {
    let splitVariantInputTimer = 0;
    bindEvent(el && el.splitVariant, "input", () => {
      const r = typeof getCurrentRect === "function" ? getCurrentRect() : null;
      if (!r || !el || !el.splitVariant) return;
      const maxSplit = Math.max(0, Math.round(evalExpr(el.splitVariant.max, Math.max(0, SPLIT_VARIANT_MAX - 1))));
      r.splitVariant = Math.max(0, Math.min(maxSplit, Math.round(evalExpr(el.splitVariant.value, r.splitVariant || 0))));
      updateSplitVariantLabel(r);
      if (splitVariantInputTimer) clearTimeout(splitVariantInputTimer);
      splitVariantInputTimer = setTimeout(() => {
        splitVariantInputTimer = 0;
        render();
      }, 180);
    });
    bindEvent(el && el.splitVariant, "change", () => {
      if (splitVariantInputTimer) {
        clearTimeout(splitVariantInputTimer);
        splitVariantInputTimer = 0;
      }
    });
    bindEvent(el && el.splitVariant, "keydown", e => e.preventDefault());
    bindEvent(el && el.splitVariant, "wheel", e => e.preventDefault(), { passive: false });
    const stepSplitVariant = delta => {
      const r = typeof getCurrentRect === "function" ? getCurrentRect() : null;
      if (!r || !el || !el.splitVariant) return;
      const maxSplit = Math.max(0, Math.round(evalExpr(el.splitVariant.max, Math.max(0, SPLIT_VARIANT_MAX - 1))));
      const curV = Math.max(0, Math.min(maxSplit, Math.round(evalExpr(el.splitVariant.value, r.splitVariant || 0))));
      const nextV = Math.max(0, Math.min(maxSplit, curV + Math.max(-1, Math.min(1, Math.round(Number(delta) || 0)))));
      if (nextV === curV) return;
      el.splitVariant.value = String(nextV);
      el.splitVariant.dispatchEvent(new Event("input", { bubbles: true }));
      el.splitVariant.dispatchEvent(new Event("change", { bubbles: true }));
    };
    bindEvent(el && el.splitVariantDec, "click", () => stepSplitVariant(-1));
    bindEvent(el && el.splitVariantInc, "click", () => stepSplitVariant(1));
  };

  return {
    updateSplitVariantLabel,
    updateSplitVariantModeUi,
    updateSplitVariantControl,
    bindSplitVariantHandlers
  };
};
