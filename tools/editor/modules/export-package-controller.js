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
      const specText = await Promise.resolve(buildFlowSpecText());
      const specBlob = new Blob([String(specText || "")], { type: "text/markdown;charset=utf-8" });
      const projectBlob = new Blob([JSON.stringify(buildProject(), null, 2)], { type: "application/json;charset=utf-8" });
      await packageWriter.writePackageFiles(
        { pngArt, pngFlow, pngRig, pngFlowOnly, specBlob, projectBlob },
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
