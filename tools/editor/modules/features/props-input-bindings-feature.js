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
    persistProjectAndRender
  } = deps;

  let propsInputRaf = 0;
  const scheduleApplyPropsInput = () => {
    if (propsInputRaf) return;
    propsInputRaf = requestAnimationFrame(() => {
      propsInputRaf = 0;
      applyProps({ list: false, persist: false, render: true });
    });
  };
  bindEvents([el.name, el.x, el.y, el.rot, el.cx, el.cy], "input", scheduleApplyPropsInput);
  bindEvents([el.cUnit], "change", () => syncProps());
  if (el.a) {
    const scheduleApplyColorInput = () => {
      if (propsInputRaf) return;
      propsInputRaf = requestAnimationFrame(() => {
        propsInputRaf = 0;
        applyProps({ list: false, persist: false, render: true, applyColor: true });
      });
    };
    bindEvent(el.a, "input", scheduleApplyColorInput);
    bindEvent(el.a, "change", () => { applyProps({ applyColor: true }); syncProps(); });
  }

  let colorBInputRaf = 0;
  const scheduleColorBInput = () => {
    if (colorBInputRaf) return;
    colorBInputRaf = requestAnimationFrame(() => {
      colorBInputRaf = 0;
      render();
    });
  };
  bindEvent(el.b, "input", () => {
    const count = applyToTargets(r => {
      r.autoContrastB = false;
      r.colorB = el.b.value || r.colorB;
      invalidateRectCache(r, "appearance");
    });
    if (!count) return;
    if (el.btnAutoContrast) el.btnAutoContrast.textContent = "Авто дополнительный: выкл";
    scheduleColorBInput();
  });
  bindEvent(el.b, "change", () => {
    const count = applyToTargets(r => {
      r.autoContrastB = false;
      r.colorB = el.b.value || r.colorB;
      invalidateRectCache(r, "appearance");
    }, { listRects: true, persist: true, render: true });
    if (!count) return;
    if (el.btnAutoContrast) el.btnAutoContrast.textContent = "Авто дополнительный: выкл";
  });

  bindEvents([el.dataFlow, el.dataFlowZ, el.numCells, el.splitVariant], "change", applyProps);

  let rectTextInputRaf = 0;
  const rectTextFontState = { timer: 0 };
  bindEvents([el.rectTextSize], "input", () => {
    const r = cur();
    if (!r) return;
    r.textSize = Math.max(0, Math.min(128, Math.round(evalExpr(el.rectTextSize.value, r.textSize || 0))));
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

  bindCommitInputs([el.x, el.y, el.rot, el.wm, el.hm, el.cx, el.cy], () => { applyProps(); syncProps(); });

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

  const applyAreaM2Settings = () => {
    const r = cur();
    if (!r || isRectLocked(r)) return;
    r.areaM2Px = parseAreaM2PxInput(el.areaM2.value, r.areaM2Px || 65536);
    invalidateRectCache(r, "regions");
    persistProjectAndRender();
  };
  if (el.areaM2) bindCommitInput(el.areaM2, () => { applyAreaM2Settings(); syncProps(); });

  for (const btn of document.querySelectorAll("[data-area-m2-preset]")) {
    bindEvent(btn, "click", () => {
      if (!el.areaM2) return;
      el.areaM2.value = String(btn.getAttribute("data-area-m2-preset") || "");
      applyAreaM2Settings();
      syncProps();
    });
  }
  bindCommitInput(el.textSize, () => { applyTextSettings(); syncProps(); });
  bindCommitInput(el.font, () => { applyTextSettings(); syncProps(); });
};
