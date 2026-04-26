export const setupInstallSummaryOverlay = (deps = {}) => {
  const {
    st,
    cv,
    wrap,
    normalizeViewMode,
    drawCellX,
    drawCellY,
    getCellTopologyCached,
    getHiddenSet,
    buildVisibleCabinetSummary,
    fontFamilyCss,
    mFmt,
    isNoteRect,
    parseScreenNameGroup
  } = deps;

  const groupLine = item => `${item.name} - ${mFmt(item.areaM2)} м²`;
  const isDesktop = () => !(window.matchMedia && window.matchMedia("(max-width:900px)").matches);
  const isInstallView = () => normalizeViewMode(st && st.viewMode) === "install";
  let overlayEl = null;
  let changeBound = false;
  let changeHandler = null;

  const ensureOverlayEl = () => {
    if (overlayEl && overlayEl.isConnected) return overlayEl;
    if (!wrap || typeof document === "undefined") return null;
    overlayEl = document.createElement("div");
    overlayEl.className = "install-summary-overlay";
    overlayEl.setAttribute("aria-hidden", "true");
    wrap.appendChild(overlayEl);
    return overlayEl;
  };

  const hideOverlay = () => {
    const node = ensureOverlayEl();
    if (node) node.hidden = true;
  };

  const collectSummary = () => {
    const byGroup = new Map();
    let totalAreaM2 = 0;
    for (const r of Array.isArray(st && st.rects) ? st.rects : []) {
      if (!r || (typeof isNoteRect === "function" && isNoteRect(r))) continue;
      const cx = drawCellX(r);
      const cy = drawCellY(r);
      const topo = getCellTopologyCached(r, cx, cy);
      const summary = buildVisibleCabinetSummary(r, cx, cy, topo, getHiddenSet(r));
      const areaM2 = Math.max(0, Number(summary && summary.areaM2) || 0);
      totalAreaM2 += areaM2;
      const meta = typeof parseScreenNameGroup === "function" ? parseScreenNameGroup(r) : { group: "Общая" };
      const groupName = String((meta && meta.group) || "Общая").trim() || "Общая";
      const prev = byGroup.get(groupName) || { name: groupName, areaM2: 0 };
      prev.areaM2 += areaM2;
      byGroup.set(groupName, prev);
    }
    const groups = [...byGroup.values()].sort((a, b) => b.areaM2 - a.areaM2 || a.name.localeCompare(b.name, "ru"));
    return { groups, totalAreaM2 };
  };

  const drawInstallSummaryOverlay = () => {
    bindViewportChange();
    const node = ensureOverlayEl();
    if (!node) return;
    if (!isInstallView() || !isDesktop()) {
      hideOverlay();
      return;
    }
    const summary = collectSummary();
    if (!summary.totalAreaM2 && !summary.groups.length) {
      hideOverlay();
      return;
    }

    const lines = ["Объём"];
    for (const group of summary.groups) lines.push(groupLine(group));
    lines.push(`Итого: ${mFmt(summary.totalAreaM2)} м²`);
    node.hidden = false;
    node.style.fontFamily = fontFamilyCss(st.fontFamily);
    node.textContent = "";
    lines.forEach((line, index) => {
      const row = document.createElement("div");
      row.className = index === 0 ? "install-summary-title" : "install-summary-row";
      row.textContent = line;
      node.appendChild(row);
    });
  };

  const bindViewportChange = () => {
    if (changeBound || typeof window === "undefined") return;
    changeBound = true;
    changeHandler = () => {
      if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => drawInstallSummaryOverlay());
      else drawInstallSummaryOverlay();
    };
    const mq = window.matchMedia ? window.matchMedia("(max-width:900px)") : null;
    if (mq && typeof mq.addEventListener === "function") mq.addEventListener("change", changeHandler);
    else if (mq && typeof mq.addListener === "function") mq.addListener(changeHandler);
    window.addEventListener("resize", changeHandler, { passive: true });
  };

  return {
    drawInstallSummaryOverlay
  };
};
