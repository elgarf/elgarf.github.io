export const setupPropsInputBindingsFeature = (deps = {}) => {
  const {
    st,
    el,
    bindEvent,
    bindEvents,
    bindCommitInputs,
    bindCommitInput,
    applyProps,
    syncProps,
    applyToTargets,
    render,
    invalidateRectCache,
    cur,
    evalExpr,
    updateRectTextSizeLabel,
    scheduleFontReadyRender,
    bindSplitVariantHandlers,
    pxFromMetric,
    remapRectRigLoadsToBottomSeams,
    schedulePersist,
    listRects,
    isRectLocked,
    parseAreaM2PxInput,
    getAreaM2BadgeLabel,
    getAreaM2PresetValues,
    setAreaM2ExpressionSource,
    updateAreaM2Badge
  } = deps;

  let propsInputRaf = 0;
  const getAreaM2BadgeEl = () => el.propAreaM2Badge || (typeof document !== "undefined" ? document.getElementById("propAreaM2Badge") : null);
  const selectionKey = () => {
    const ids = st && st.selSet && st.selSet.size ? [...st.selSet].map(v => Math.max(0, Math.round(Number(v) || 0))).sort((a, b) => a - b) : [];
    return ids.length ? ids.join(",") : String(cur() && cur().id || "");
  };
  const rememberSelectionKey = node => {
    if (node && node.dataset) node.dataset.selectionKey = selectionKey();
  };
  const keyForEvent = e => (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.selectionKey) || selectionKey();
  const applyPropsForKey = (key, opts = {}) => {
    if (key && key !== selectionKey()) return false;
    applyProps({ ...opts, selectionKey: key });
    return true;
  };
  const propInputs = [el.name, el.x, el.y, el.rot, el.wm, el.hm, el.a, el.b, el.cx, el.cy, el.areaM2, el.dataFlow, el.dataFlowZ, el.numCells, el.splitVariant, el.rectTextSize];
  bindEvents(propInputs, "focusin", e => rememberSelectionKey(e.currentTarget));
  const scheduleApplyPropsInput = e => {
    const key = keyForEvent(e);
    if (propsInputRaf) return;
    propsInputRaf = requestAnimationFrame(() => {
      propsInputRaf = 0;
      applyPropsForKey(key, { list: false, persist: false, render: true });
    });
  };
  bindEvents([el.name, el.x, el.y, el.rot, el.cx, el.cy], "input", scheduleApplyPropsInput);
  bindEvents([el.cUnit], "change", () => syncProps());
  if (el.a) {
    const scheduleApplyColorInput = e => {
      const key = keyForEvent(e);
      if (propsInputRaf) return;
      propsInputRaf = requestAnimationFrame(() => {
        propsInputRaf = 0;
        applyPropsForKey(key, { list: false, persist: false, render: true, applyColor: true });
      });
    };
    bindEvent(el.a, "input", scheduleApplyColorInput);
    bindEvent(el.a, "change", e => { if (applyPropsForKey(keyForEvent(e), { applyColor: true })) syncProps(); });
  }

  let colorBInputRaf = 0;
  const scheduleColorBInput = () => {
    if (colorBInputRaf) return;
    colorBInputRaf = requestAnimationFrame(() => {
      colorBInputRaf = 0;
      render();
    });
  };
  bindEvent(el.b, "input", e => {
    if (keyForEvent(e) !== selectionKey()) return;
    const count = applyToTargets(r => {
      r.autoContrastB = false;
      r.colorB = el.b.value || r.colorB;
      invalidateRectCache(r, "appearance");
    });
    if (!count) return;
    if (el.btnAutoContrast) el.btnAutoContrast.textContent = "Авто дополнительный: выкл";
    scheduleColorBInput();
  });
  bindEvent(el.b, "change", e => {
    if (keyForEvent(e) !== selectionKey()) return;
    const count = applyToTargets(r => {
      r.autoContrastB = false;
      r.colorB = el.b.value || r.colorB;
      invalidateRectCache(r, "appearance");
    }, { listRects: true, persist: true, render: true });
    if (!count) return;
    if (el.btnAutoContrast) el.btnAutoContrast.textContent = "Авто дополнительный: выкл";
  });

  bindEvents([el.dataFlow, el.dataFlowZ, el.splitVariant], "change", e => applyPropsForKey(keyForEvent(e)));
  bindEvent(el.numCells, "change", e => {
    if (keyForEvent(e) !== selectionKey()) return;
    const checked = !!(el.numCells && el.numCells.checked);
    applyToTargets(r => {
      r.numberCells = checked;
    }, { listRects: true, persist: true, render: true });
  });

  let rectTextInputRaf = 0;
  const rectTextFontState = { timer: 0 };
  bindEvents([el.rectTextSize], "input", e => {
    if (keyForEvent(e) !== selectionKey()) return;
    const r = cur();
    if (!r) return;
    const count = applyToTargets(t => {
      t.textSize = Math.max(0, Math.min(128, Math.round(evalExpr(el.rectTextSize.value, t.textSize || 0))));
    }, { listRects: false, persist: false, render: false });
    if (!count) return;
    updateRectTextSizeLabel(r);
    if (!rectTextInputRaf) {
      rectTextInputRaf = requestAnimationFrame(() => {
        rectTextInputRaf = 0;
        render();
      });
    }
    scheduleFontReadyRender(rectTextFontState, 140);
  });
  bindSplitVariantHandlers();

  bindCommitInputs([el.name, el.x, el.y, el.rot, el.wm, el.hm, el.cx, el.cy], e => { if (applyPropsForKey(keyForEvent(e))) syncProps(); });

  let textSettingsRaf = 0;
  const textSettingsFontState = { timer: 0 };
  const readTextSettingsFromInputs = () => {
    st.textSize = Math.max(6, evalExpr(el.textSize.value, st.textSize || 12));
    st.fontFamily = (el.font.value || "Roboto, Segoe UI, Arial").trim() || "Roboto, Segoe UI, Arial";
    st.fontReady = false;
  };
  const applyTextSettings = () => {
    readTextSettingsFromInputs();
    render();
    scheduleFontReadyRender(textSettingsFontState, 0);
  };
  const applyTextSettingsInput = () => {
    readTextSettingsFromInputs();
    if (!textSettingsRaf) {
      textSettingsRaf = requestAnimationFrame(() => {
        textSettingsRaf = 0;
        render();
      });
    }
    scheduleFontReadyRender(textSettingsFontState, 140);
  };
  bindEvents([el.textSize, el.font], "input", applyTextSettingsInput);

  const applyGlobalScaleSettings = () => {
    const nextScale = Math.max(1, Math.round(evalExpr(el.scale && el.scale.value, st.globalScale || 256)));
    if (nextScale === Math.max(1, Math.round(Number(st.globalScale) || 256))) return;
    st.globalScale = nextScale;
    for (const rr of st.rects) {
      rr.scale = nextScale;
      pxFromMetric(rr);
      remapRectRigLoadsToBottomSeams(rr);
      invalidateRectCache(rr, "topology");
    }
    schedulePersist("project");
    syncProps();
    listRects();
    render();
  };
  if (el.scale) bindCommitInput(el.scale, () => { applyGlobalScaleSettings(); syncProps(); });

  const applyAreaM2Settings = key => {
    if (key && key !== selectionKey()) return;
    const r = cur();
    if (!r || isRectLocked(r)) return;
    const input = el.areaM2 && el.areaM2.value;
    const parsedForBadge = parseAreaM2PxInput(input, r.areaM2Px || 65536);
    const count = applyToTargets(t => {
      t.areaM2Px = parseAreaM2PxInput(input, t.areaM2Px || 65536);
      if (typeof setAreaM2ExpressionSource === "function") setAreaM2ExpressionSource(t, input);
      invalidateRectCache(t, "regions");
    }, { persist: true, render: true });
    if (!count) return;
    if (typeof updateAreaM2Badge === "function" && typeof getAreaM2BadgeLabel === "function") {
      updateAreaM2Badge(getAreaM2BadgeEl(), getAreaM2BadgeLabel(input, parsedForBadge, r._areaM2Expression, typeof getAreaM2PresetValues === "function" ? getAreaM2PresetValues() : []));
    }
  };
  if (el.areaM2) {
    bindEvent(el.areaM2, "input", e => {
      if (keyForEvent(e) !== selectionKey()) return;
      const r = cur();
      if (!r || typeof updateAreaM2Badge !== "function" || typeof getAreaM2BadgeLabel !== "function") return;
      const parsed = parseAreaM2PxInput(el.areaM2.value, r.areaM2Px || 65536);
      updateAreaM2Badge(getAreaM2BadgeEl(), getAreaM2BadgeLabel(el.areaM2.value, parsed, r._areaM2Expression, typeof getAreaM2PresetValues === "function" ? getAreaM2PresetValues() : []));
    });
  }
  if (el.areaM2) bindCommitInput(el.areaM2, e => { applyAreaM2Settings(keyForEvent(e)); syncProps(); });

  for (const btn of document.querySelectorAll("[data-area-m2-preset]")) {
    bindEvent(btn, "click", () => {
      if (!el.areaM2) return;
      el.areaM2.value = String(btn.getAttribute("data-area-m2-preset") || "");
      rememberSelectionKey(el.areaM2);
      applyAreaM2Settings(selectionKey());
      syncProps();
    });
  }
  bindCommitInput(el.textSize, () => { applyTextSettings(); syncProps(); });
  bindCommitInput(el.font, () => { applyTextSettings(); syncProps(); });
};
