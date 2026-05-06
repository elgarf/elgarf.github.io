export const setupInstallSummaryOverlay = (deps = {}) => {
  const {
    st,
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
    listSignature = value => Array.isArray(value) ? value.join(",") : "",
    t = value => value
  } = deps;

  const cabinetAreaKey = item => `${mFmt(Math.max(0, Number(item && item.w) || 0))}x${mFmt(Math.max(0, Number(item && item.h) || 0))}`;
  const groupLineRest = item => `: ${mFmt(item.areaM2)} ${t("м²")}`;
  const CABINET_ICON_MAX_PX = 13;
  const isDesktop = () => !(window.matchMedia && window.matchMedia("(max-width:900px)").matches);
  const isInstallView = () => normalizeViewMode(st && st.viewMode) === "install";
  let overlayEl = null;
  let changeBound = false;
  let changeHandler = null;
  let summaryCacheKey = "";
  let summaryCache = null;

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
    let maxCabinetSide = 0;
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
        maxCabinetSide = Math.max(maxCabinetSide, w, h);
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
    return { groups, totalAreaM2, maxCabinetSide };
  };

  const summaryKey = () => {
    const lang = typeof document !== "undefined" ? String(document.documentElement.getAttribute("lang") || "") : "";
    const rectKey = (Array.isArray(st && st.rects) ? st.rects : []).map(r => {
      if (!r || (typeof isNoteRect === "function" && isNoteRect(r))) return "";
      return [
        r.id || 0,
        r.name || "",
        r.width || 0,
        r.height || 0,
        r.scale || 0,
        drawCellX(r),
        drawCellY(r),
        listSignature(r.hiddenCells),
        listSignature(r.cellLinks)
      ].join(":");
    }).join("|");
    return [lang, st && st.fontFamily || "", rectKey].join("||");
  };

  const appendCabinetIcon = (row, item, maxCabinetSide) => {
    const maxSide = Math.max(0, Number(maxCabinetSide) || 0);
    const w = Math.max(0, Number(item && item.w) || 0);
    const h = Math.max(0, Number(item && item.h) || 0);
    if (!(maxSide > 0 && w > 0 && h > 0)) return;
    const icon = document.createElement("span");
    icon.className = "install-summary-cabinet-icon";
    icon.style.width = `${Math.max(2, (w / maxSide) * CABINET_ICON_MAX_PX)}px`;
    icon.style.height = `${Math.max(2, (h / maxSide) * CABINET_ICON_MAX_PX)}px`;
    row.appendChild(icon);
  };

  const drawInstallSummaryOverlay = () => {
    bindViewportChange();
    const node = ensureOverlayEl();
    if (!node) return;
    if (!isInstallView() || !isDesktop()) {
      hideOverlay();
      return;
    }
    const key = summaryKey();
    const summary = (summaryCacheKey === key && summaryCache) ? summaryCache : collectSummary();
    if (summaryCacheKey !== key || !summaryCache) {
      summaryCacheKey = key;
      summaryCache = summary;
    }
    if (!summary.totalAreaM2 && !summary.groups.length) {
      hideOverlay();
      return;
    }

    const rows = [{ title: true, text: t("Площадь экранов") }];
    for (const group of summary.groups) rows.push({ group });
    rows.push({ total: true, label: `${t("Итого")}:`, area: `${mFmt(summary.totalAreaM2)} ${t("м²")}` });
    const domKey = key + "||" + rows.map(row => row.title ? row.text : row.total ? `${row.label}${row.area}` : `${row.group && row.group.name}:${row.group && row.group.areaM2}:${(row.group && row.group.cabinetAreaItems || []).map(it => `${it.size}:${it.areaM2}`).join(",")}`).join("|");
    if (!node.hidden && node.dataset.summaryKey === domKey) return;
    node.hidden = false;
    node.dataset.summaryKey = domKey;
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
          appendCabinetIcon(cabinetRow, item, summary.maxCabinetSide);
          const size = document.createElement("span");
          size.className = "install-summary-cabinet-size";
          size.textContent = `${item.size}:`;
          const area = document.createElement("span");
          area.className = "install-summary-cabinet-area";
          area.textContent = `${mFmt(item.areaM2)} ${t("м²")}`;
          cabinetRow.appendChild(size);
          cabinetRow.appendChild(area);
          row.appendChild(cabinetRow);
        }
      } else if (rowData.total) {
        row.classList.add("install-summary-total-row");
        const label = document.createElement("span");
        label.textContent = rowData.label;
        const area = document.createElement("span");
        area.className = "install-summary-total-area";
        area.textContent = rowData.area;
        row.appendChild(label);
        row.appendChild(area);
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
