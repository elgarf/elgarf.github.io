import { createRenderExportPngBlob } from "./export/render-export-png.js";
import { createExportPackageWriter } from "./export/package-writer.js";

export const setupExportPackageController = (deps = {}) => {
  const {
    st,
    ensureFontReady,
    rectAABBMasked,
    getRectRigData,
    normalizeDataFlow,
    drawRect,
    drawInterScreenFlowLinks,
    getRectCalcCache,
    embedProjectIntoPngBlob,
    buildProject,
    PNG_PROJECT_META_KEY,
    projectFileBase,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    saveStatus,
    saveBlobWithSystemDialog,
    buildFlowSpecText,
    ensureExportCaches,
    enterControllerLayoutMode,
    exitControllerLayoutMode,
    showMessageModal,
    t = value => value
  } = deps;

  const renderExportPngBlob = createRenderExportPngBlob({
    st,
    ensureFontReady,
    rectAABBMasked,
    getRectRigData,
    normalizeDataFlow,
    drawRect,
    drawInterScreenFlowLinks,
    getRectCalcCache,
    embedProjectIntoPngBlob,
    buildProject,
    PNG_PROJECT_META_KEY
  });
  const packageWriter = createExportPackageWriter({
    st,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    saveStatus,
    saveBlobWithSystemDialog,
    projectFileBase,
    t
  });

  const showExportPackageMessage = text => showMessageModal(text, t("Экспорт пакета"));
  const nextFrame = () => new Promise(resolve => {
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(() => resolve());
    else setTimeout(resolve, 0);
  });
  const canvasToBlob = (canvas, type = "image/png", quality) => new Promise(resolve => canvas.toBlob(resolve, type, quality));
  const setPackageExportBusy = active => {
    if (typeof document === "undefined") return;
    const id = "packageExportBusyOverlay";
    let node = document.getElementById(id);
    if (active) {
      if (!node) {
        node = document.createElement("div");
        node.id = id;
        node.className = "package-export-busy-overlay";
        node.setAttribute("role", "status");
        node.setAttribute("aria-live", "polite");
        node.innerHTML = `<div class="package-export-busy-box"><div class="package-export-busy-spinner" aria-hidden="true"></div><div>${t("Экспорт пакета...")}</div></div>`;
        document.body.appendChild(node);
      }
      return;
    }
    if (node && node.parentNode) node.parentNode.removeChild(node);
  };
  const sanitizeFilePart = value => String(value || "")
    .replace(/[\\/:*?"<>|]+/g, "_")
    .replace(/\s+/g, " ")
    .trim();
  const hasSavedControllerLayout = rect => {
    if (!rect || String(rect && rect.deviceType || "").toLowerCase() !== "controller") return false;
    const map = rect.controllerLayoutRegionPositions;
    return !!(map && typeof map === "object" && Object.keys(map).length > 0);
  };
  const buildUniqueControllerLayoutFileName = (projectName, controllerName, usedNames) => {
    const baseProject = sanitizeFilePart(projectName) || "project";
    const baseController = sanitizeFilePart(controllerName) || "controller";
    const base = `${baseProject} - ${baseController}`;
    let candidate = `${base}.png`;
    if (!usedNames.has(candidate.toLowerCase())) {
      usedNames.add(candidate.toLowerCase());
      return candidate;
    }
    let n = 1;
    while (n < 10000) {
      candidate = `${base}_${n}.png`;
      if (!usedNames.has(candidate.toLowerCase())) {
        usedNames.add(candidate.toLowerCase());
        return candidate;
      }
      n++;
    }
    return `${base}_${Date.now()}.png`;
  };
  const renderControllerLayoutPngFiles = async () => {
    if (typeof enterControllerLayoutMode !== "function" || typeof exitControllerLayoutMode !== "function") return [];
    const controllers = (Array.isArray(st.rects) ? st.rects : []).filter(hasSavedControllerLayout);
    if (!controllers.length) return [];
    const out = [];
    const usedNames = new Set();
    const projectName = String(projectFileBase ? projectFileBase() : (st.projectName || "project"));
    const renderControllerLayoutBlob = async tempRects => {
      const list = (Array.isArray(tempRects) ? tempRects : []).filter(Boolean);
      if (!list.length) return null;
      await ensureFontReady();
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const r of list) {
        const bb = rectAABBMasked(r);
        minX = Math.min(minX, Number(bb.minX) || 0);
        minY = Math.min(minY, Number(bb.minY) || 0);
        maxX = Math.max(maxX, Number(bb.maxX) || 0);
        maxY = Math.max(maxY, Number(bb.maxY) || 0);
      }
      if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) return null;
      const w = Math.max(1, Math.ceil(maxX - minX));
      const h = Math.max(1, Math.ceil(maxY - minY));
      const out = document.createElement("canvas");
      out.width = w;
      out.height = h;
      const c = out.getContext("2d");
      const shifted = list.map(r => ({ ...r, x: (Number(r.x) || 0) - minX, y: (Number(r.y) || 0) - minY }));
      for (let i = shifted.length - 1; i >= 0; i--) {
        const srcRect = list[i];
        const r = shifted[i];
        const cache = getRectCalcCache(srcRect);
        const regions = (cache && cache.regions && !cache.regions.pending) ? cache.regions.value : null;
        const includeFlow = normalizeDataFlow(srcRect && srcRect.dataFlow) !== "none";
        const drawOpts = {
          noCachedRegions: true,
          includeFlow,
          disableLod: true,
          ignoreInstallLayerToggles: true,
          skipRegionCalc: true,
          skipFlowCalc: true,
          regionsOverride: regions,
          flowGroupsOverride: Array.isArray(srcRect && srcRect._controllerFlowGroupsOverride) ? srcRect._controllerFlowGroupsOverride : undefined,
          viewModeOverride: "install",
          installTextMode: "skip",
          suppressRigOverlay: true,
          suppressContoursOverlay: false
        };
        drawRect(c, r, false, 1, { x: 0, y: 0 }, drawOpts);
      }
      const bb = { minX: 0, minY: 0, maxX: w, maxY: h };
      c.save();
      c.strokeStyle = "rgba(84, 194, 255, .95)";
      c.lineWidth = 1.25;
      c.setLineDash([6, 4]);
      c.strokeRect(bb.minX, bb.minY, Math.max(1, bb.maxX - bb.minX), Math.max(1, bb.maxY - bb.minY));
      c.setLineDash([]);
      c.font = "12px sans-serif";
      c.textAlign = "left";
      c.textBaseline = "top";
      for (const r of shifted) {
        const rb = rectAABBMasked(r);
        const dx = Math.round((Number(rb.minX) || 0) - bb.minX);
        const dy = Math.round((Number(rb.minY) || 0) - bb.minY);
        const coordsText = `${dx}, ${dy}`;
        const portText = String(r && r._controllerPortLabel || "");
        const regionText = String(r && r._controllerRegionLabel || "");
        const topText = `${coordsText} · ${portText}`;
        const topW = c.measureText(topText).width;
        const regionW = c.measureText(regionText).width;
        const boxW = Math.max(topW, regionW);
        const px = (Number(rb.minX) || 0) + 6;
        const py = (Number(rb.minY) || 0) + 6;
        c.fillStyle = "rgba(7, 10, 14, .75)";
        c.fillRect(px - 3, py - 2, boxW + 6, 32);
        c.fillStyle = "rgba(255,255,255,.95)";
        c.fillText(topText, px, py);
        c.fillText(regionText, px, py + 14);
      }
      c.restore();
      return await canvasToBlob(out, "image/png");
    };
    for (const controller of controllers) {
      const prevRects = st.rects;
      let entered = false;
      try {
        enterControllerLayoutMode(controller, { readOnly: true });
        entered = true;
        const tempRects = (Array.isArray(st.rects) ? st.rects : []).filter(r => r && r._controllerLayoutTemp);
        if (!tempRects.length) continue;
        const blob = await renderControllerLayoutBlob(tempRects);
        if (!blob) continue;
        const fileName = buildUniqueControllerLayoutFileName(projectName, String(controller && controller.name || "controller"), usedNames);
        out.push({ name: fileName, blob });
      } finally {
        st.rects = prevRects;
        if (entered) exitControllerLayoutMode({ skipLayoutPersist: true });
      }
    }
    return out;
  };

  const exportPackage = async () => {
    if (!st.rects.length) { showExportPackageMessage(t("Нечего экспортировать")); return; }
    const packageDirectory = packageWriter.requestPackageDirectory
      ? await packageWriter.requestPackageDirectory()
      : null;
    if (packageDirectory && packageDirectory.aborted) return;
    setPackageExportBusy(true);
    await nextFrame();
    try {
      if (typeof ensureExportCaches === "function") await ensureExportCaches();
      const [pngArt, pngFlow, pngRig, pngFlowOnly] = await Promise.all([
        renderExportPngBlob(false),
        renderExportPngBlob(true),
        renderExportPngBlob({ rigOnly: true }),
        renderExportPngBlob({ flowOnly: true })
      ]);
      if (!pngArt || !pngFlow || !pngRig || !pngFlowOnly) { showExportPackageMessage(t("Ошибка экспорта")); return; }
      const extraPngFiles = await renderControllerLayoutPngFiles();
      const specText = await Promise.resolve(buildFlowSpecText());
      const specBlob = new Blob([String(specText || "")], { type: "text/markdown;charset=utf-8" });
      const projectBlob = new Blob([JSON.stringify(buildProject(), null, 2)], { type: "application/json;charset=utf-8" });
      await packageWriter.writePackageFiles(
        { pngArt, pngFlow, pngRig, pngFlowOnly, specBlob, projectBlob, extraPngFiles },
        { dirHandle: packageDirectory && packageDirectory.dirHandle }
      );
    } finally {
      setPackageExportBusy(false);
    }
  };

  return {
    exportPackage
  };
};
