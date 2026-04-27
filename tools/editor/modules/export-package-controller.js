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
    showMessageModal
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
  const writePackageFiles = createExportPackageWriter({
    st,
    setGlobalSaveLocationId,
    getGlobalSaveLocationId,
    saveStatus,
    saveBlobWithSystemDialog,
    projectFileBase
  });

  const showExportPackageMessage = text => showMessageModal(text, "Экспорт пакета");

  const exportPackage = async () => {
    if (!st.rects.length) { showExportPackageMessage("Нечего экспортировать"); return; }
    const [pngArt, pngFlow] = await Promise.all([renderExportPngBlob(false), renderExportPngBlob(true)]);
    if (!pngArt || !pngFlow) { showExportPackageMessage("Ошибка экспорта"); return; }
    const specBlob = new Blob([buildFlowSpecText()], { type: "text/markdown;charset=utf-8" });
    const projectBlob = new Blob([JSON.stringify(buildProject(), null, 2)], { type: "application/json;charset=utf-8" });
    await writePackageFiles({ pngArt, pngFlow, specBlob, projectBlob });
  };

  return {
    exportPackage
  };
};
