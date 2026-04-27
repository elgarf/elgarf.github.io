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
    parseScreenNameGroup,
    t = value => value
  } = deps;

  const cabinetAreaKey = item => `${mFmt(Math.max(0, Number(item && item.w) || 0))}x${mFmt(Math.max(0, Number(item && item.h) || 0))}`;
  const cabinetAreaLabel = item => `${item.size}: ${mFmt(item.areaM2)} ${t("м²")}`;
  const groupLineRest = item => `: ${mFmt(item.areaM2)} ${t("м²")}`;
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
      const prev = byGroup.get(groupName) || { name: groupName, areaM2: 0, cabinetAreaBySize: new Map() };
      prev.areaM2 += areaM2;
      for (const item of Array.isArray(summary && summary.groupItems) ? summary.groupItems : []) {
        const w = Math.max(0, Number(item && item.w) || 0);
        const h = Math.max(0, Number(item && item.h) || 0);
        const count = Math.max(0, Math.round(Number(item && item.count) || 0));
        if (!(w > 0 && h > 0 && count > 0)) continue;
        const key = cabinetAreaKey(item);
        const rec = prev.cabinetAreaBySize.get(key) || { size: key, w, h, areaM2: 0 };
        rec.areaM2 += w * h * count;
        prev.cabinetAreaBySize.set(key, rec);
      }
      byGroup.set(groupName, prev);
    }
    const groups = [...byGroup.values()].map(group => {
      group.cabinetAreaItems = [...group.cabinetAreaBySize.values()].sort((a, b) => (b.w * b.h) - (a.w * a.h) || b.w - a.w || b.h - a.h);
      delete group.cabinetAreaBySize;
      return group;
    }).sort((a, b) => String(a.name).localeCompare(String(b.name), "ru"));
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

    const rows = [{ title: true, text: t("Площадь экранов") }];
    for (const group of summary.groups) rows.push({ group });
    rows.push({ text: `${t("Итого")}: ${mFmt(summary.totalAreaM2)} ${t("м²")}` });
    node.hidden = false;
    node.style.fontFamily = fontFamilyCss(st.fontFamily);
    node.textContent = "";
    rows.forEach(rowData => {
      const row = document.createElement("div");
      row.className = rowData.title ? "install-summary-title" : "install-summary-row";
      if (rowData.group) {
        const name = document.createElement("span");
        name.className = "install-summary-group-name";
        name.textContent = t(rowData.group.name);
        row.appendChild(name);
        row.appendChild(document.createTextNode(groupLineRest(rowData.group)));
        for (const item of Array.isArray(rowData.group.cabinetAreaItems) ? rowData.group.cabinetAreaItems : []) {
          const cabinetRow = document.createElement("div");
          cabinetRow.className = "install-summary-cabinet-row";
          cabinetRow.textContent = cabinetAreaLabel(item);
          row.appendChild(cabinetRow);
        }
      } else {
        row.textContent = rowData.text;
      }
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
